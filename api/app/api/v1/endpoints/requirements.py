from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.requirement import Requirement
from app.models.profile import AgenticProfile
from app.models.user_config import UserConfig
from app.schemas.requirement import (
    RequirementChatMessage, RequirementChatResponse,
    ConfirmRequirementRequest, RequirementOut, RequirementListResponse,
)
from app.agents.requirement_agent import process_requirement_message, confirm_requirement
from app.services.matching_service import match_requirement_to_suppliers
from app.api.v1.endpoints.config import get_or_create_config
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/requirements", tags=["Requirements"])


@router.post("/chat", response_model=RequirementChatResponse)
async def requirement_chat(
    request: RequirementChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == current_user.id)
    )
    buyer_profile = profile_result.scalar_one_or_none()
    if not buyer_profile:
        raise HTTPException(status_code=400, detail="Complete onboarding first")

    # Load buyer config for agent context
    buyer_cfg = await get_or_create_config(current_user.id, db)

    requirement = None
    if request.requirement_id:
        req_result = await db.execute(
            select(Requirement).where(
                Requirement.id == request.requirement_id,
                Requirement.buyer_id == current_user.id,
            )
        )
        requirement = req_result.scalar_one_or_none()
        if not requirement:
            raise HTTPException(status_code=404, detail="Requirement not found")
        if requirement.enrichment_status == "confirmed":
            raise HTTPException(status_code=400, detail="Requirement already confirmed")

    if not requirement:
        requirement = Requirement(
            buyer_id=current_user.id,
            raw_prompt=request.message,
            product="",
            quantity=0,
            enrichment_status="capturing",
            enrichment_conversation=[],
        )
        db.add(requirement)
        await db.flush()

    conversation_history = requirement.enrichment_conversation or []
    result = await process_requirement_message(
        conversation_history=conversation_history,
        new_message=request.message,
        current_requirement=requirement.structured_json,
        profile_md=buyer_cfg.profile_md or "",
        buyer_settings_md=buyer_cfg.buyer_settings_md or "",
    )

    requirement.enrichment_conversation = result["updated_history"]

    if result["is_complete"] and result["requirement_data"]:
        req_data = result["requirement_data"]
        requirement.product = req_data.get("product", "")
        requirement.quantity = req_data.get("quantity", 0)
        requirement.quantity_unit = req_data.get("quantity_unit")
        requirement.budget_min = req_data.get("budget_min")
        requirement.budget_max = req_data.get("budget_max")
        requirement.budget_unit = req_data.get("budget_unit", "INR")
        requirement.specifications = req_data.get("specifications")
        requirement.delivery_location = req_data.get("delivery_location")
        requirement.delivery_days = req_data.get("delivery_days")
        requirement.order_type = req_data.get("order_type")
        requirement.packaging = req_data.get("packaging")
        requirement.structured_json = req_data
        requirement.enrichment_status = "enriched"

    await db.flush()

    return RequirementChatResponse(
        requirement_id=requirement.id,
        ai_response=result["ai_response"],
        is_complete=result["is_complete"],
        enrichment_status=requirement.enrichment_status,
        requirement_summary=requirement.structured_json if result["is_complete"] else None,
    )


@router.post("/confirm")
async def confirm_requirement_endpoint(
    request: ConfirmRequirementRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req_result = await db.execute(
        select(Requirement).where(
            Requirement.id == request.requirement_id,
            Requirement.buyer_id == current_user.id,
        )
    )
    requirement = req_result.scalar_one_or_none()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    if requirement.enrichment_status not in ("enriched", "capturing"):
        raise HTTPException(status_code=400, detail=f"Cannot confirm — status: {requirement.enrichment_status}")

    requirement.enrichment_status = "matching"
    requirement.confirmed_at = datetime.utcnow()
    await db.commit()  # CRITICAL: Commit BEFORE background task starts

    background_tasks.add_task(_run_matching, requirement.id)

    return {
        "success": True,
        "requirement_id": requirement.id,
        "message": "Matching suppliers and initiating seller agents. Check leads shortly.",
        "status": "matching",
    }


@router.get("/", response_model=RequirementListResponse)
async def list_requirements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    result = await db.execute(
        select(Requirement)
        .where(Requirement.buyer_id == current_user.id, Requirement.is_active == True)
        .order_by(desc(Requirement.created_at))
        .offset(skip).limit(limit)
    )
    requirements = result.scalars().all()
    return RequirementListResponse(requirements=requirements, total=len(requirements))


@router.get("/{requirement_id}", response_model=RequirementOut)
async def get_requirement(
    requirement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id,
            Requirement.buyer_id == current_user.id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return req


async def _run_matching(requirement_id: int):
    """Background: match requirement → create leads → initiate seller agent conversations."""
    from app.db.base import AsyncSessionLocal
    import asyncio

    # Extract lead IDs within the database session scope
    lead_ids = []

    async with AsyncSessionLocal() as db:
        try:
            req_result = await db.execute(
                select(Requirement).where(Requirement.id == requirement_id)
            )
            requirement = req_result.scalar_one_or_none()
            if not requirement:
                logger.warning(f"[MATCH] Requirement #{requirement_id} not found")
                return

            logger.info(f"[MATCH] Starting matching for requirement #{requirement_id}")
            leads = await match_requirement_to_suppliers(requirement, db)

            # Extract lead IDs BEFORE committing (while objects are still attached to session)
            lead_ids = [lead.id for lead in leads]

            await db.commit()
            logger.info(f"[MATCH] Requirement #{requirement_id}: {len(lead_ids)} leads created — initiating seller agents")

        except Exception as e:
            logger.error(f"[MATCH] Error for requirement #{requirement_id}: {e}")
            import traceback; traceback.print_exc()
            return

    # Initiate conversations OUTSIDE the database session (leads are already committed)
    if len(lead_ids) == 0:
        logger.warning(f"[MATCH] Requirement #{requirement_id}: no matching suppliers found")
        return

    for lead_id in lead_ids:
        try:
            logger.info(f"[MATCH] Initiating conversation for lead #{lead_id}")
            await _initiate_seller_conversation(lead_id)
            # Small delay between starting conversations
            await asyncio.sleep(1)
        except Exception as conv_err:
            logger.error(f"[MATCH] Failed to initiate conversation for lead #{lead_id}: {conv_err}")
            import traceback; traceback.print_exc()


async def _initiate_seller_conversation(lead_id: int):
    """
    Seller AI initiates first — reads full profile + seller settings.
    Then buyer AI responds. Unlimited rounds until deal confirmed.
    """
    from app.db.base import AsyncSessionLocal
    from app.models.lead import Lead
    from app.models.conversation import Conversation, Message
    from app.agents.supplier_agent import generate_supplier_opener, get_default_agent_config
    from app.agents.buyer_agent import buyer_agent_respond
    from app.agents.config_agent import build_agent_system_prompt

    logger.info(f"[CONV] Starting conversation initiation for lead #{lead_id}")

    async with AsyncSessionLocal() as db:
        try:
            lead_result = await db.execute(select(Lead).where(Lead.id == lead_id))
            lead = lead_result.scalar_one_or_none()
            if not lead:
                logger.warning(f"[CONV] Lead #{lead_id}: not found in database")
                return

            logger.info(f"[CONV] Lead #{lead_id}: Found lead (buyer={lead.buyer_id}, supplier={lead.supplier_id}, status={lead.status})")

            req_result = await db.execute(
                select(Requirement).where(Requirement.id == lead.requirement_id)
            )
            requirement = req_result.scalar_one_or_none()

            supplier_profile_result = await db.execute(
                select(AgenticProfile).where(AgenticProfile.user_id == lead.supplier_id)
            )
            supplier_profile = supplier_profile_result.scalar_one_or_none()

            if not requirement or not supplier_profile:
                logger.warning(f"[CONV] Lead #{lead_id}: missing req or supplier profile")
                return

            # Load FULL seller config — profile + seller settings
            seller_cfg_result = await db.execute(
                select(UserConfig).where(UserConfig.user_id == lead.supplier_id)
            )
            seller_cfg = seller_cfg_result.scalar_one_or_none()
            seller_profile_md      = seller_cfg.profile_md if seller_cfg else ""
            seller_settings_md     = seller_cfg.seller_settings_md if seller_cfg else ""

            # Load buyer config for buyer agent
            buyer_cfg_result = await db.execute(
                select(UserConfig).where(UserConfig.user_id == lead.buyer_id)
            )
            buyer_cfg = buyer_cfg_result.scalar_one_or_none()
            buyer_profile_md   = buyer_cfg.profile_md if buyer_cfg else ""
            buyer_settings_md  = buyer_cfg.buyer_settings_md if buyer_cfg else ""

            req_dict = {
                "product":           requirement.product,
                "quantity":          requirement.quantity,
                "quantity_unit":     requirement.quantity_unit,
                "budget_max":        requirement.budget_max,
                "specifications":    requirement.specifications or {},
                "delivery_location": requirement.delivery_location,
                "delivery_days":     requirement.delivery_days,
            }

            supplier_profile_dict = {
                "trade_name":         supplier_profile.trade_name or "Supplier",
                "product_categories": supplier_profile.product_categories or [],
                "pricing_bands":      supplier_profile.pricing_bands or {},
                "serviceable_locations": supplier_profile.serviceable_locations or [],
                "state":              supplier_profile.state,
                "city":               supplier_profile.city,
                "certifications":     supplier_profile.certifications or [],
            }

            agent_config = supplier_profile.agent_config or get_default_agent_config()

            # STEP 1: SELLER AI initiates — reads full profile + settings
            logger.info(f"[CONV] Lead #{lead_id}: Calling supplier AI to generate opening message...")
            seller_opener = await generate_supplier_opener(
                requirement=req_dict,
                supplier_profile=supplier_profile_dict,
                agent_config=agent_config,
                profile_md=seller_profile_md,
                seller_settings_md=seller_settings_md,
            )
            seller_msg_text = seller_opener.get("message", "")
            final_offer = seller_opener.get("final_offer")
            logger.info(f"[CONV] Lead #{lead_id}: Supplier AI generated message ({len(seller_msg_text)} chars), final_offer={'yes' if final_offer else 'no'}")

            # Clean the seller message — remove tags before storing for display
            clean_seller_msg = seller_msg_text
            for tag in ["<FINAL_OFFER", "<OFFER ", "<NEEDS_SUPPLIER_INPUT"]:
                if tag in clean_seller_msg:
                    clean_seller_msg = clean_seller_msg[:clean_seller_msg.index(tag)].strip()
            if not clean_seller_msg:
                clean_seller_msg = "Let me put together an offer for you based on your requirements."

            # Create conversation
            conversation = Conversation(
                lead_id=lead.id,
                buyer_id=lead.buyer_id,
                supplier_id=lead.supplier_id,
                mode="ai_negotiating",
                ai_context=[{"role": "ai_supplier", "content": clean_seller_msg}],
            )
            db.add(conversation)
            await db.flush()

            if final_offer:
                # AI has enough info — go straight to seller approval (buyer sees nothing yet)
                # Save a supplier-only message (not visible to buyer until approved)
                db.add(Message(
                    conversation_id=conversation.id,
                    role="ai_supplier",
                    message_type="text",
                    content=clean_seller_msg,
                    is_visible_to_buyer=False,
                    is_visible_to_supplier=True,
                ))

                offer_message = final_offer.get("message") or clean_seller_msg
                lead.status = "pending_supplier_approval"
                lead.ai_paused_for_supplier = True
                lead.pending_offer_message = offer_message
                lead.negotiation_round = 0
                lead.max_negotiation_rounds = 999
                if final_offer.get("price_per_unit"):
                    lead.current_offer_price = final_offer["price_per_unit"]
                if final_offer.get("lead_time_days"):
                    lead.current_lead_time = final_offer["lead_time_days"]

                await db.commit()
                logger.info(f"[CONV] Lead #{lead_id}: AI built offer immediately — waiting for seller approval ✓")
                return  # No autonomous loop needed — seller decides next

            else:
                # AI needs more info — save discovery message and start buyer-supplier conversation
                db.add(Message(
                    conversation_id=conversation.id,
                    role="ai_supplier",
                    message_type="text",
                    content=clean_seller_msg,
                ))

                await db.flush()

                # STEP 2: BUYER AI responds to the discovery question
                logger.info(f"[CONV] Lead #{lead_id}: Calling buyer AI to respond to seller's question...")
                buyer_response = await buyer_agent_respond(
                    conversation_history=[{"role": "ai_supplier", "content": clean_seller_msg}],
                    supplier_message=clean_seller_msg,
                    requirement=req_dict,
                    negotiation_round=1,
                    max_rounds=999,
                    profile_md=buyer_profile_md,
                    buyer_settings_md=buyer_settings_md,
                )
                buyer_msg_text = buyer_response.get("message", "")
                logger.info(f"[CONV] Lead #{lead_id}: Buyer AI generated response ({len(buyer_msg_text)} chars)")

                db.add(Message(
                    conversation_id=conversation.id,
                    role="ai_buyer",
                    message_type="text",
                    content=buyer_msg_text,
                ))

                # Update AI context
                conversation.ai_context = [
                    {"role": "ai_supplier", "content": clean_seller_msg},
                    {"role": "ai_buyer",    "content": buyer_msg_text},
                ]

                lead.status = "negotiating"
                lead.negotiation_round = 1
                lead.max_negotiation_rounds = 999

                await db.commit()
                logger.info(f"[CONV] Lead #{lead_id}: seller opened, buyer responded ✓")

        except Exception as e:
            logger.error(f"[CONV] Lead #{lead_id}: error — {e}")
            import traceback; traceback.print_exc()
            return

    # After initial conversation setup, start autonomous negotiation loop
    # This must be outside the db session context to avoid conflicts
    from app.api.v1.endpoints.conversations import _run_autonomous_negotiation_round
    import asyncio

    try:
        logger.info(f"[CONV] Lead #{lead_id}: Starting autonomous negotiation loop")
        await _run_autonomous_negotiation_round(lead_id)
        logger.info(f"[CONV] Lead #{lead_id}: Autonomous negotiation completed")
    except Exception as e:
        logger.error(f"[CONV] Lead #{lead_id}: Autonomous loop error — {e}")
        import traceback; traceback.print_exc()