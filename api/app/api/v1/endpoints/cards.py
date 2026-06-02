from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.core.limiter import limiter
from app.models.user import User
from app.models.lead import Lead
from app.models.requirement import Requirement
from app.models.profile import AgenticProfile
from app.models.conversation import Conversation, Message
from app.models.card_qa import SupplierCardQA
from app.schemas.conversation import (
    LeadOut, CardQAOut, AskQuestionRequest, AnswerQuestionRequest,
    SelectSupplierRequest, CloseDealRequest,
)
from app.agents.card_agent import generate_card, answer_qa
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cards", tags=["Cards"])


async def _get_lead_for_supplier(lead_id: int, user: User, db: AsyncSession) -> Lead:
    result = await db.execute(
        select(Lead).options(
            selectinload(Lead.requirement),
            selectinload(Lead.supplier),
            selectinload(Lead.buyer),
        ).where(Lead.id == lead_id, Lead.supplier_id == user.id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


async def _get_lead_for_buyer(lead_id: int, user: User, db: AsyncSession) -> Lead:
    result = await db.execute(
        select(Lead).options(
            selectinload(Lead.requirement),
            selectinload(Lead.supplier),
            selectinload(Lead.buyer),
        ).where(Lead.id == lead_id, Lead.buyer_id == user.id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


async def _do_generate_card(lead_id: int, supplier_id: int):
    """Background task: run AI card generation and save to DB."""
    from app.db.base import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Lead).options(
                    selectinload(Lead.requirement),
                    selectinload(Lead.supplier),
                ).where(Lead.id == lead_id)
            )
            lead = result.scalar_one_or_none()
            if not lead or lead.card_status != "generating":
                return

            # Get supplier profile
            profile_result = await db.execute(
                select(AgenticProfile).where(AgenticProfile.user_id == supplier_id)
            )
            profile = profile_result.scalar_one_or_none()
            supplier_profile = {}
            if profile:
                supplier_profile = {
                    "trade_name": profile.trade_name,
                    "business_type": profile.business_type,
                    "city": profile.city,
                    "state": profile.state,
                    "profile_summary": profile.profile_summary,
                    "certifications": profile.certifications,
                    "product_categories": profile.product_categories,
                    "reliability_score": profile.reliability_score,
                }

            req = lead.requirement
            requirement_data = {
                "product": req.product,
                "quantity": req.quantity,
                "quantity_unit": req.quantity_unit,
                "budget_max": req.budget_max,
                "budget_unit": req.budget_unit,
                "specifications": req.specifications,
                "delivery_location": req.delivery_location,
                "delivery_days": req.delivery_days,
                "order_type": req.order_type,
            }

            card = await generate_card(
                requirement=requirement_data,
                supplier_profile=supplier_profile,
                match_reasons=lead.match_reasons or [],
            )

            lead.supplier_card = card
            lead.card_status = "draft"
            lead.updated_at = datetime.utcnow()
            await db.commit()
            logger.info(f"Card generated for lead {lead_id}")
        except Exception as e:
            logger.error(f"Card generation failed for lead {lead_id}: {e}")
            try:
                result = await db.execute(select(Lead).where(Lead.id == lead_id))
                lead = result.scalar_one_or_none()
                if lead:
                    lead.card_status = "pending"
                    await db.commit()
            except Exception:
                pass


@router.post("/leads/{lead_id}/generate-card")
@limiter.limit("5/minute")
async def generate_card_endpoint(
    request: Request,
    lead_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supplier triggers AI card generation for their lead."""
    lead = await _get_lead_for_supplier(lead_id, current_user, db)
    if lead.card_status not in ("pending", "draft"):
        raise HTTPException(status_code=400, detail=f"Cannot generate card — current status: {lead.card_status}")

    lead.card_status = "generating"
    lead.updated_at = datetime.utcnow()
    await db.commit()

    background_tasks.add_task(_do_generate_card, lead_id, current_user.id)
    return {"status": "generating", "lead_id": lead_id}


@router.get("/leads/{lead_id}/card")
async def get_card(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current card for a lead (supplier or buyer can view)."""
    result = await db.execute(
        select(Lead).where(
            Lead.id == lead_id,
            or_(Lead.supplier_id == current_user.id, Lead.buyer_id == current_user.id),
        )
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {
        "lead_id": lead.id,
        "card_status": lead.card_status,
        "supplier_card": lead.supplier_card,
        "card_submitted_at": lead.card_submitted_at,
        "card_selected_at": lead.card_selected_at,
    }


@router.post("/leads/{lead_id}/qa", response_model=CardQAOut)
@limiter.limit("20/minute")
async def ask_question(
    request: Request,
    lead_id: int,
    body: AskQuestionRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Buyer asks a question about a supplier's card. AI auto-answers."""
    result = await db.execute(
        select(Lead).options(selectinload(Lead.requirement)).where(
            Lead.id == lead_id,
            or_(Lead.supplier_id == current_user.id, Lead.buyer_id == current_user.id),
        )
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.card_status not in ("draft", "qa", "submitted"):
        raise HTTPException(status_code=400, detail="Card not available for Q&A yet")

    qa = SupplierCardQA(
        lead_id=lead_id,
        question=body.question,
        asked_by=current_user.id,
        status="open",
    )
    db.add(qa)
    if lead.card_status == "draft":
        lead.card_status = "qa"
    lead.updated_at = datetime.utcnow()
    await db.flush()
    await db.commit()
    await db.refresh(qa)

    # Auto-answer in background
    background_tasks.add_task(_auto_answer_qa, qa.id, lead_id)
    return qa


async def _auto_answer_qa(qa_id: int, lead_id: int):
    from app.db.base import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            qa_result = await db.execute(select(SupplierCardQA).where(SupplierCardQA.id == qa_id))
            qa = qa_result.scalar_one_or_none()
            if not qa:
                return

            lead_result = await db.execute(
                select(Lead).options(selectinload(Lead.requirement), selectinload(Lead.supplier)).where(Lead.id == lead_id)
            )
            lead = lead_result.scalar_one_or_none()
            if not lead or not lead.supplier_card:
                return

            profile_result = await db.execute(
                select(AgenticProfile).where(AgenticProfile.user_id == lead.supplier_id)
            )
            profile = profile_result.scalar_one_or_none()
            supplier_profile = {}
            if profile:
                supplier_profile = {
                    "trade_name": profile.trade_name,
                    "profile_summary": profile.profile_summary,
                    "certifications": profile.certifications,
                    "city": profile.city,
                    "state": profile.state,
                }

            req = lead.requirement
            requirement_data = {
                "product": req.product,
                "quantity": req.quantity,
                "quantity_unit": req.quantity_unit,
                "budget_max": req.budget_max,
                "specifications": req.specifications,
                "delivery_location": req.delivery_location,
            }

            answer = await answer_qa(
                question=qa.question,
                requirement=requirement_data,
                supplier_card=lead.supplier_card,
                supplier_profile=supplier_profile,
            )

            qa.answer = answer
            qa.answered_by_ai = True
            qa.status = "answered"
            qa.answered_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            logger.error(f"Auto-answer failed for QA {qa_id}: {e}")


@router.post("/leads/{lead_id}/qa/{qa_id}/answer", response_model=CardQAOut)
async def answer_question_manually(
    lead_id: int,
    qa_id: int,
    body: AnswerQuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supplier manually answers a Q&A question."""
    lead = await _get_lead_for_supplier(lead_id, current_user, db)
    qa_result = await db.execute(
        select(SupplierCardQA).where(SupplierCardQA.id == qa_id, SupplierCardQA.lead_id == lead_id)
    )
    qa = qa_result.scalar_one_or_none()
    if not qa:
        raise HTTPException(status_code=404, detail="Question not found")

    qa.answer = body.answer
    qa.answered_by = current_user.id
    qa.answered_by_ai = False
    qa.status = "answered"
    qa.answered_at = datetime.utcnow()
    await db.commit()
    await db.refresh(qa)
    return qa


@router.get("/leads/{lead_id}/qa", response_model=list[CardQAOut])
async def list_qa(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all Q&A for a lead."""
    result = await db.execute(
        select(Lead).where(
            Lead.id == lead_id,
            or_(Lead.supplier_id == current_user.id, Lead.buyer_id == current_user.id),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Lead not found")

    qa_result = await db.execute(
        select(SupplierCardQA).where(SupplierCardQA.lead_id == lead_id).order_by(SupplierCardQA.created_at)
    )
    return qa_result.scalars().all()


@router.post("/leads/{lead_id}/submit-card")
@limiter.limit("10/minute")
async def submit_card(
    request: Request,
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supplier submits their card as a formal offer."""
    lead = await _get_lead_for_supplier(lead_id, current_user, db)
    if lead.card_status not in ("draft", "qa"):
        raise HTTPException(status_code=400, detail=f"Cannot submit card — status: {lead.card_status}")
    if not lead.supplier_card:
        raise HTTPException(status_code=400, detail="Card must be generated before submitting")

    lead.card_status = "submitted"
    lead.card_submitted_at = datetime.utcnow()
    lead.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "submitted", "lead_id": lead_id, "submitted_at": lead.card_submitted_at}


@router.get("/requirements/{req_id}/cards")
async def get_submitted_cards(
    req_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Buyer views all submitted cards for a requirement."""
    req_result = await db.execute(
        select(Requirement).where(Requirement.id == req_id, Requirement.buyer_id == current_user.id)
    )
    if not req_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Requirement not found")

    leads_result = await db.execute(
        select(Lead).options(
            selectinload(Lead.supplier).selectinload(User.profile)
        ).where(
            Lead.requirement_id == req_id,
            Lead.buyer_id == current_user.id,
            Lead.card_status.in_(["submitted", "selected", "rejected"]),
        ).order_by(Lead.fit_score.desc())
    )
    leads = leads_result.scalars().all()

    cards = []
    for lead in leads:
        supplier_info = None
        if lead.supplier and lead.supplier.profile:
            p = lead.supplier.profile
            supplier_info = {
                "supplier_id": lead.supplier_id,
                "trade_name": p.trade_name,
                "city": p.city,
                "state": p.state,
                "reliability_score": p.reliability_score,
            }
        cards.append({
            "lead_id": lead.id,
            "fit_score": lead.fit_score,
            "card_status": lead.card_status,
            "supplier_card": lead.supplier_card,
            "card_submitted_at": lead.card_submitted_at,
            "supplier_info": supplier_info,
            "match_reasons": lead.match_reasons,
        })

    return cards


@router.post("/requirements/{req_id}/select")
@limiter.limit("10/minute")
async def select_supplier(
    request: Request,
    req_id: int,
    body: SelectSupplierRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Buyer selects a supplier card — rejects all others, opens deal chat."""
    req_result = await db.execute(
        select(Requirement).where(Requirement.id == req_id, Requirement.buyer_id == current_user.id)
    )
    req = req_result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Verify selected lead belongs to this requirement
    selected_result = await db.execute(
        select(Lead).where(
            Lead.id == body.lead_id,
            Lead.requirement_id == req_id,
            Lead.buyer_id == current_user.id,
            Lead.card_status == "submitted",
        )
    )
    selected_lead = selected_result.scalar_one_or_none()
    if not selected_lead:
        raise HTTPException(status_code=404, detail="Lead not found or card not submitted")

    # Reject all other submitted cards for this requirement
    all_leads_result = await db.execute(
        select(Lead).where(
            Lead.requirement_id == req_id,
            Lead.buyer_id == current_user.id,
            Lead.card_status == "submitted",
            Lead.id != body.lead_id,
        )
    )
    for lead in all_leads_result.scalars().all():
        lead.card_status = "rejected"
        lead.status = "not_selected"
        lead.updated_at = datetime.utcnow()

    # Select the chosen lead
    selected_lead.card_status = "selected"
    selected_lead.card_selected_at = datetime.utcnow()
    selected_lead.status = "deal_open"
    selected_lead.updated_at = datetime.utcnow()

    # Create deal conversation
    existing_conv = await db.execute(
        select(Conversation).where(Conversation.lead_id == body.lead_id)
    )
    conv = existing_conv.scalar_one_or_none()
    if not conv:
        conv = Conversation(
            lead_id=body.lead_id,
            buyer_id=current_user.id,
            supplier_id=selected_lead.supplier_id,
            mode="deal_chat",
        )
        db.add(conv)
        await db.flush()

        # System message
        system_msg = Message(
            conversation_id=conv.id,
            role="system",
            message_type="system_event",
            content=f"Supplier selected! Deal chat opened for {req.product}. Discuss final terms and close the deal.",
            structured_data=None,
        )
        db.add(system_msg)

    await db.commit()
    await db.refresh(conv)
    return {
        "status": "selected",
        "lead_id": body.lead_id,
        "conversation_id": conv.id,
        "selected_at": selected_lead.card_selected_at,
    }


@router.post("/deal/close")
@limiter.limit("10/minute")
async def close_deal(
    request: Request,
    body: CloseDealRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Buyer closes deal — finalizes the lead."""
    lead_result = await db.execute(
        select(Lead).where(
            Lead.id == body.lead_id,
            Lead.buyer_id == current_user.id,
            Lead.status == "deal_open",
        )
    )
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found or deal not open")

    lead.status = "deal_closed"
    lead.deal_closed_at = datetime.utcnow()
    lead.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "deal_closed", "lead_id": body.lead_id, "closed_at": lead.deal_closed_at}


@router.get("/actions-needed")
async def get_actions_needed(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cards-specific actions for the current user."""
    actions = []

    # Supplier: leads with pending card generation
    supplier_pending = await db.execute(
        select(Lead).options(selectinload(Lead.requirement)).where(
            Lead.supplier_id == current_user.id,
            Lead.card_status == "pending",
        )
    )
    for lead in supplier_pending.scalars().all():
        actions.append({
            "lead_id": lead.id,
            "requirement_id": lead.requirement_id,
            "action_type": "generate_card",
            "card_status": lead.card_status,
            "product": lead.requirement.product if lead.requirement else None,
            "fit_score": lead.fit_score,
            "updated_at": lead.updated_at,
        })

    # Supplier: draft cards ready to submit
    supplier_draft = await db.execute(
        select(Lead).options(selectinload(Lead.requirement)).where(
            Lead.supplier_id == current_user.id,
            Lead.card_status.in_(["draft", "qa"]),
        )
    )
    for lead in supplier_draft.scalars().all():
        actions.append({
            "lead_id": lead.id,
            "requirement_id": lead.requirement_id,
            "action_type": "submit_card",
            "card_status": lead.card_status,
            "product": lead.requirement.product if lead.requirement else None,
            "fit_score": lead.fit_score,
            "updated_at": lead.updated_at,
        })

    # Buyer: requirements with submitted cards awaiting selection
    buyer_cards = await db.execute(
        select(Lead).options(selectinload(Lead.requirement)).where(
            Lead.buyer_id == current_user.id,
            Lead.card_status == "submitted",
        )
    )
    req_ids_seen = set()
    for lead in buyer_cards.scalars().all():
        if lead.requirement_id not in req_ids_seen:
            req_ids_seen.add(lead.requirement_id)
            actions.append({
                "lead_id": lead.id,
                "requirement_id": lead.requirement_id,
                "action_type": "review_cards",
                "card_status": lead.card_status,
                "product": lead.requirement.product if lead.requirement else None,
                "fit_score": lead.fit_score,
                "updated_at": lead.updated_at,
            })

    return actions
