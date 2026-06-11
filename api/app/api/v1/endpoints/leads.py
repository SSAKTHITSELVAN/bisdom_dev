from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.schemas.conversation import LeadOut, ActionNeededOut

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("/", response_model=list[LeadOut])
async def list_leads(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    """List all leads where current user is buyer or supplier."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Lead)
        .options(selectinload(Lead.requirement))  # Eager load requirement
        .where(or_(Lead.buyer_id == current_user.id, Lead.supplier_id == current_user.id))
        .order_by(desc(Lead.created_at))
        .offset(skip).limit(limit)
    )
    leads = result.scalars().all()
    return leads


@router.get("/as-buyer", response_model=list[LeadOut])
async def list_leads_as_buyer(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List leads where current user is the buyer."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Lead)
        .options(
            selectinload(Lead.requirement),  # Eager load requirement
            selectinload(Lead.supplier).selectinload(User.profile)  # Eager load supplier profile
        )
        .where(Lead.buyer_id == current_user.id)
        .order_by(desc(Lead.updated_at))
    )
    leads = result.scalars().all()

    # Add supplier_info to each lead
    for lead in leads:
        if lead.supplier and lead.supplier.profile:
            profile = lead.supplier.profile
            lead.supplier_info = {
                "supplier_id": lead.supplier_id,
                "trade_name": profile.trade_name,
                "city": profile.city,
                "state": profile.state
            }

    return leads


@router.get("/as-supplier", response_model=list[LeadOut])
async def list_leads_as_supplier(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List leads where current user is the supplier."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Lead)
        .options(
            selectinload(Lead.requirement),  # Eager load requirement
            selectinload(Lead.supplier).selectinload(User.profile)  # Eager load supplier profile
        )
        .where(Lead.supplier_id == current_user.id)
        .order_by(desc(Lead.updated_at))
    )
    leads = result.scalars().all()

    # Add supplier_info to each lead
    for lead in leads:
        if lead.supplier and lead.supplier.profile:
            profile = lead.supplier.profile
            lead.supplier_info = {
                "supplier_id": lead.supplier_id,
                "trade_name": profile.trade_name,
                "city": profile.city,
                "state": profile.state
            }

    return leads


@router.get("/actions-needed", response_model=list[ActionNeededOut])
async def get_actions_needed(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all leads where the current user needs to take action."""
    from sqlalchemy.orm import selectinload

    actions = []

    # As supplier: leads awaiting my confirmation (buyer_shortlisted)
    supplier_pending = await db.execute(
        select(Lead)
        .options(selectinload(Lead.requirement), selectinload(Lead.buyer).selectinload(User.profile))
        .where(
            Lead.supplier_id == current_user.id,
            Lead.status == "buyer_shortlisted",
        )
        .order_by(desc(Lead.updated_at))
    )
    for lead in supplier_pending.scalars().all():
        buyer_name = None
        if lead.buyer and lead.buyer.profile:
            buyer_name = lead.buyer.profile.trade_name
        actions.append(ActionNeededOut(
            lead_id=lead.id,
            requirement_id=lead.requirement_id,
            counterpart_name=buyer_name,
            product=lead.requirement.product if lead.requirement else None,
            action_type="supplier_confirm",
            status=lead.status,
            current_offer_price=lead.current_offer_price,
            fit_score=lead.fit_score,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
        ))

    # As buyer: leads where AI paused for my decision
    buyer_decide = await db.execute(
        select(Lead)
        .options(selectinload(Lead.requirement), selectinload(Lead.supplier).selectinload(User.profile))
        .where(
            Lead.buyer_id == current_user.id,
            Lead.ai_paused_for_buyer == True,
        )
        .order_by(desc(Lead.updated_at))
    )
    for lead in buyer_decide.scalars().all():
        supplier_name = None
        if lead.supplier and lead.supplier.profile:
            supplier_name = lead.supplier.profile.trade_name
        actions.append(ActionNeededOut(
            lead_id=lead.id,
            requirement_id=lead.requirement_id,
            counterpart_name=supplier_name,
            product=lead.requirement.product if lead.requirement else None,
            action_type="buyer_decide",
            status=lead.status,
            current_offer_price=lead.current_offer_price,
            fit_score=lead.fit_score,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
        ))

    # As supplier: leads where AI paused for my input
    supplier_input = await db.execute(
        select(Lead)
        .options(selectinload(Lead.requirement), selectinload(Lead.buyer).selectinload(User.profile))
        .where(
            Lead.supplier_id == current_user.id,
            Lead.ai_paused_for_supplier == True,
            Lead.status != "buyer_shortlisted",  # already handled above
        )
        .order_by(desc(Lead.updated_at))
    )
    for lead in supplier_input.scalars().all():
        buyer_name = None
        if lead.buyer and lead.buyer.profile:
            buyer_name = lead.buyer.profile.trade_name
        actions.append(ActionNeededOut(
            lead_id=lead.id,
            requirement_id=lead.requirement_id,
            counterpart_name=buyer_name,
            product=lead.requirement.product if lead.requirement else None,
            action_type="response_needed",
            status=lead.status,
            current_offer_price=lead.current_offer_price,
            fit_score=lead.fit_score,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
        ))

    return actions


@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Lead)
        .options(
            selectinload(Lead.requirement),  # Eager load requirement
            selectinload(Lead.supplier).selectinload(User.profile)  # Eager load supplier profile
        )
        .where(
            Lead.id == lead_id,
            or_(Lead.buyer_id == current_user.id, Lead.supplier_id == current_user.id),
        )
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Add supplier_info to the lead
    if lead.supplier and lead.supplier.profile:
        profile = lead.supplier.profile
        lead.supplier_info = {
            "supplier_id": lead.supplier_id,
            "trade_name": profile.trade_name,
            "city": profile.city,
            "state": profile.state
        }

    return lead


@router.get("/{lead_id}/counterpart-profile")
async def get_counterpart_profile(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get basic profile of the counterpart (buyer sees supplier, supplier sees buyer)."""
    result = await db.execute(
        select(Lead).where(
            Lead.id == lead_id,
            or_(Lead.buyer_id == current_user.id, Lead.supplier_id == current_user.id),
        )
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    counterpart_id = lead.supplier_id if current_user.id == lead.buyer_id else lead.buyer_id

    profile_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == counterpart_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Return limited profile info (privacy — don't expose everything before deal)
    is_deal_closed = lead.status == "deal_closed"
    return {
        "user_id": counterpart_id,
        "trade_name": profile.trade_name,
        "business_type": profile.business_type,
        "legal_name": profile.legal_name if is_deal_closed else None,
        "gstin": profile.gstin if is_deal_closed else None,
        "state": profile.state,
        "city": profile.city if is_deal_closed else None,
        "pincode": profile.pincode if is_deal_closed else None,
        "address": profile.address if is_deal_closed else None,
        "reliability_score": profile.reliability_score,
        "product_categories": profile.product_categories,
        "certifications": profile.certifications,
        "capabilities": profile.capabilities,
        "pricing_bands": profile.pricing_bands,
        "payment_terms": profile.payment_terms,
        "serviceable_locations": profile.serviceable_locations,
        "nature_of_business": profile.nature_of_business,
        "business_summary": profile.profile_summary,
        "registration_date": profile.registration_date,
        "contact_revealed": is_deal_closed,
    }
