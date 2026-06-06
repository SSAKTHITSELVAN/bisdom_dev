from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.models.conversation import Conversation, Message
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.schemas.conversation import (
    ConversationOut, SendMessageRequest, SendMessageResponse,
    ToggleChatRequest, BuyerDecisionRequest, SupplierEscalationResponse,
    SupplierConfirmRequest, SupplierOfferApprovalRequest,
    MessageOut, SuggestResponseRequest, SuggestResponseOut,
)
from app.agents.buyer_agent import buyer_agent_respond, generate_buyer_suggestion
from app.agents.supplier_agent import supplier_agent_respond, get_default_agent_config, generate_supplier_suggestion
from app.models.user_config import UserConfig
from app.api.v1.endpoints.config import get_or_create_config
from datetime import datetime

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("/pending-actions")
async def get_pending_actions_early(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    All leads where the current user must act — polled by ActionsWidget.
    Covers: buyer decision needed, offer ready, supplier escalation, confirm, declined by supplier.
    """
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Lead)
        .options(selectinload(Lead.requirement))
        .where(or_(Lead.buyer_id == current_user.id, Lead.supplier_id == current_user.id))
    )
    all_leads = result.scalars().all()

    pending = []
    for lead in all_leads:
        is_buyer = lead.buyer_id == current_user.id
        is_supplier = lead.supplier_id == current_user.id
        product = lead.requirement.product if lead.requirement else f"Lead #{lead.id}"
        action_needed = None

        if is_buyer:
            if lead.status == "offer_ready":
                action_needed = "buyer_decision"
            elif lead.status == "declined":
                action_needed = "supplier_declined"
        if is_supplier:
            if lead.status == "pending_supplier_approval":
                action_needed = "supplier_approve_offer"
            elif lead.status == "awaiting_supplier_confirm":
                action_needed = "supplier_confirm"
            elif lead.ai_paused_for_supplier and lead.status not in ("awaiting_supplier_confirm", "pending_supplier_approval"):
                action_needed = "supplier_respond"

        if action_needed:
            item = {
                "lead_id": lead.id,
                "requirement_id": lead.requirement_id,
                "action": action_needed,
                "status": lead.status,
                "product": product,
                "current_offer_price": lead.current_offer_price,
                "negotiation_round": lead.negotiation_round,
                "buyer_id": lead.buyer_id,
                "supplier_id": lead.supplier_id,
            }
            if action_needed == "supplier_approve_offer":
                item["pending_offer_message"] = lead.pending_offer_message
            pending.append(item)

    return {"pending": pending, "count": len(pending)}


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full conversation history for a lead."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Verify user is participant
    if current_user.id not in (conversation.buyer_id, conversation.supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Fetch messages
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    # Filter messages by visibility
    is_buyer = current_user.id == conversation.buyer_id
    visible_messages = [
        m for m in messages
        if (is_buyer and m.is_visible_to_buyer) or (not is_buyer and m.is_visible_to_supplier)
    ]

    # Get lead for chat toggle status
    lead_result = await db.execute(select(Lead).where(Lead.id == conversation.lead_id))
    lead = lead_result.scalar_one_or_none()

    return ConversationOut(
        id=conversation.id,
        lead_id=conversation.lead_id,
        mode=conversation.mode,
        buyer_chat_enabled=lead.buyer_chat_enabled if lead else False,
        supplier_chat_enabled=lead.supplier_chat_enabled if lead else False,
        messages=[MessageOut(
            id=m.id, role=m.role, message_type=m.message_type,
            content=m.content, structured_data=m.structured_data,
            created_at=m.created_at
        ) for m in visible_messages],
        created_at=conversation.created_at,
    )


@router.get("/lead/{lead_id}", response_model=ConversationOut)
async def get_conversation_by_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get conversation by lead ID.
    If conversation doesn't exist and lead is ready, trigger initiation in background.
    """
    import logging
    logger = logging.getLogger(__name__)

    result = await db.execute(
        select(Conversation).where(Conversation.lead_id == lead_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        # Check lead status
        lead_result = await db.execute(select(Lead).where(Lead.id == lead_id))
        lead = lead_result.scalar_one_or_none()

        if lead and lead.status in ('new', 'agent_initiated'):
            # Conversation should exist but doesn't - try to initiate
            logger.warning(f"[CONV] Lead #{lead_id}: No conversation found but status is {lead.status}. Triggering initiation.")

            # Try to trigger conversation initiation in background
            try:
                from app.api.v1.endpoints.requirements import _initiate_seller_conversation
                import asyncio

                # Trigger in background
                loop = asyncio.get_event_loop()
                loop.create_task(_initiate_seller_conversation(lead_id))

                logger.info(f"[CONV] Lead #{lead_id}: Conversation initiation triggered")
            except Exception as e:
                logger.error(f"[CONV] Lead #{lead_id}: Failed to trigger initiation — {e}")

        raise HTTPException(status_code=404, detail="Conversation not started yet")

    return await get_conversation(conversation.id, db, current_user)


@router.post("/send", response_model=SendMessageResponse)
async def send_message(
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a human message in a conversation.
    AI responds automatically unless AI is paused for the other party.
    """
    result = await db.execute(
        select(Conversation).where(Conversation.id == request.conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    is_buyer = current_user.id == conversation.buyer_id
    is_supplier = current_user.id == conversation.supplier_id

    if not is_buyer and not is_supplier:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get lead
    lead_result = await db.execute(select(Lead).where(Lead.id == conversation.lead_id))
    lead = lead_result.scalar_one_or_none()

    # After deal closed, always allow human chat (for delivery coordination)
    if lead.status == "deal_closed":
        pass  # always allow
    elif is_buyer and not lead.buyer_chat_enabled:
        raise HTTPException(
            status_code=403,
            detail="AI is negotiating on your behalf. Enable 'Live' mode to chat manually."
        )
    elif is_supplier and not lead.supplier_chat_enabled:
        raise HTTPException(
            status_code=403,
            detail="AI is negotiating on your behalf. Enable 'Live' mode to chat manually."
        )

    # Determine role
    role = "human_buyer" if is_buyer else "human_supplier"

    # Save human message
    human_msg = Message(
        conversation_id=conversation.id,
        role=role,
        message_type="text",
        content=request.content,
    )
    db.add(human_msg)
    await db.flush()

    # AI responds on the other side if AI is still active
    ai_response_msg = None

    # AI only responds if deal NOT closed and mode is ai_negotiating/hybrid
    if lead.status != "deal_closed":
        if is_buyer and conversation.mode in ("ai_negotiating", "hybrid"):
            ai_response_msg = await _trigger_supplier_ai_response(
                conversation, lead, request.content, db
            )
        elif is_supplier and conversation.mode in ("ai_negotiating", "hybrid"):
            ai_response_msg = await _trigger_buyer_ai_response(
                conversation, lead, request.content, db
            )

    await db.flush()

    human_msg_out = MessageOut(
        id=human_msg.id, role=human_msg.role, message_type=human_msg.message_type,
        content=human_msg.content, structured_data=human_msg.structured_data,
        created_at=human_msg.created_at,
    )

    ai_msg_out = None
    if ai_response_msg:
        ai_msg_out = MessageOut(
            id=ai_response_msg.id, role=ai_response_msg.role,
            message_type=ai_response_msg.message_type, content=ai_response_msg.content,
            structured_data=ai_response_msg.structured_data,
            created_at=ai_response_msg.created_at,
        )

    return SendMessageResponse(message=human_msg_out, ai_response=ai_msg_out)


@router.post("/toggle-chat")
async def toggle_human_chat(
    request: ToggleChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Enable or disable human chat for buyer or supplier on a specific lead.
    When human enables chat, AI on the other side should respond if needed.
    """
    import logging
    logger = logging.getLogger(__name__)

    lead_result = await db.execute(select(Lead).where(Lead.id == request.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    is_buyer = current_user.id == lead.buyer_id
    is_supplier = current_user.id == lead.supplier_id

    if not is_buyer and not is_supplier:
        raise HTTPException(status_code=403, detail="Access denied")

    # Track if this is enabling (not disabling) chat
    was_enabled = (lead.buyer_chat_enabled if is_buyer else lead.supplier_chat_enabled)
    is_enabling = request.enabled and not was_enabled

    if is_buyer:
        lead.buyer_chat_enabled = request.enabled
    else:
        lead.supplier_chat_enabled = request.enabled

    # Update conversation mode
    conv_result = await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))
    conversation = conv_result.scalar_one_or_none()

    if conversation:
        if lead.buyer_chat_enabled or lead.supplier_chat_enabled:
            conversation.mode = "hybrid"
        else:
            conversation.mode = "ai_negotiating"

        # If human just enabled chat and there are messages, check if AI needs to respond
        if is_enabling and conversation.ai_context and len(conversation.ai_context) > 0:
            last_msg = conversation.ai_context[-1]
            last_role = last_msg.get("role", "")

            # If last message was from the human who just enabled chat, trigger AI response
            if (is_buyer and last_role in ("human_buyer", "ai_buyer")) or \
               (is_supplier and last_role in ("human_supplier", "ai_supplier")):
                logger.info(f"[TOGGLE] Lead #{lead.id}: Human enabled chat, triggering AI response on other side")

                # Trigger AI response on the other side
                if is_buyer and not lead.supplier_chat_enabled:
                    # Buyer enabled chat, trigger supplier AI to respond
                    await _trigger_supplier_ai_response(conversation, lead, last_msg.get("content", ""), db)
                elif is_supplier and not lead.buyer_chat_enabled:
                    # Supplier enabled chat, trigger buyer AI to respond
                    await _trigger_buyer_ai_response(conversation, lead, last_msg.get("content", ""), db)

    await db.commit()

    return {
        "success": True,
        "lead_id": lead.id,
        "buyer_chat_enabled": lead.buyer_chat_enabled,
        "supplier_chat_enabled": lead.supplier_chat_enabled,
        "mode": conversation.mode if conversation else "ai_negotiating",
    }


@router.post("/buyer-decision")
async def handle_buyer_decision(
    request: BuyerDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Handle buyer's decision on a lead: accept / renegotiate / manual_chat / decline."""
    lead_result = await db.execute(select(Lead).where(Lead.id == request.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead or lead.buyer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lead not found")

    action = request.action.lower()

    if action == "accept":
        # Buyer accepts — supplier already approved the offer, so deal closes directly
        lead.status = "deal_closed"
        lead.deal_closed_at = datetime.utcnow()
        lead.ai_paused_for_buyer = False
        lead.ai_paused_for_supplier = False
        lead.buyer_chat_enabled = True
        lead.supplier_chat_enabled = True

        conv_result = await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))
        conv = conv_result.scalar_one_or_none()
        if conv:
            conv.mode = "manual"

        await _create_deal(lead, db)
        await _post_system_message(
            lead.id,
            "🎉 Deal confirmed by both parties! You can now chat directly about delivery, packaging, and payment.",
            db
        )

        # Close all other leads for the same requirement
        other_leads_result = await db.execute(
            select(Lead).where(
                Lead.requirement_id == lead.requirement_id,
                Lead.id != lead.id,
                Lead.status.notin_(["deal_closed", "not_selected", "declined"])
            )
        )
        other_leads = other_leads_result.scalars().all()
        for other_lead in other_leads:
            other_lead.status = "not_selected"
            other_lead.ai_paused_for_buyer = False
            other_lead.ai_paused_for_supplier = False
            await _post_system_message(
                other_lead.id,
                "This requirement has been fulfilled — the buyer closed a deal with another supplier.",
                db
            )

        await db.commit()
        return {"success": True, "status": "deal_closed", "message": "Deal closed!"}

    elif action == "renegotiate":
        if not request.renegotiate_target:
            raise HTTPException(status_code=400, detail="Provide renegotiate_target")
        lead.status = "renegotiating"
        lead.ai_paused_for_buyer = False
        # Post buyer's renegotiation instruction as a message
        await _post_system_message(
            lead.id,
            f"Buyer wants to renegotiate: {request.renegotiate_target}",
            db,
        )
        return {"success": True, "status": "renegotiating"}

    elif action == "manual_chat":
        lead.buyer_chat_enabled = True
        conv_result = await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))
        conv = conv_result.scalar_one_or_none()
        if conv:
            conv.mode = "hybrid"
        return {"success": True, "status": "manual_chat_enabled"}

    elif action == "decline":
        lead.status = "not_selected"
        await _post_system_message(lead.id, "Buyer has declined this offer.", db)
        return {"success": True, "status": "not_selected"}

    raise HTTPException(status_code=400, detail=f"Unknown action: {action}")


@router.post("/supplier-escalation")
async def handle_supplier_escalation(
    request: SupplierEscalationResponse,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supplier responds to an AI escalation (price below floor, high value, etc.)."""
    lead_result = await db.execute(select(Lead).where(Lead.id == request.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead or lead.supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.ai_paused_for_supplier = False
    action = request.action.lower()

    if action == "accept":
        lead.status = "offer_ready"
        msg = f"Supplier approved this offer. Submitting final offer to buyer."
    elif action == "counter":
        price = request.counter_price
        lead.current_offer_price = price
        msg = f"Supplier countered at ₹{price}/unit. Agent resuming negotiation."
    elif action == "hold":
        msg = "Supplier is holding firm at current price. Agent notified."
    elif action == "decline":
        lead.status = "declined"
        msg = "Supplier has declined this requirement."
    else:
        raise HTTPException(status_code=400, detail="Unknown action")

    await _post_system_message(lead.id, msg, db)
    await db.flush()

    return {"success": True, "action": action, "lead_id": lead.id}


@router.post("/supplier-confirm")
async def handle_supplier_confirm(
    request: SupplierConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supplier confirms or rejects the buyer's deal acceptance."""
    lead_id = request.lead_id
    action = request.action.lower()  # confirm | reject

    lead_result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead or lead.supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.status != "awaiting_supplier_confirm":
        raise HTTPException(status_code=400, detail="Lead is not awaiting supplier confirmation")

    if action == "confirm":
        lead.status = "deal_closed"
        lead.deal_closed_at = datetime.utcnow()
        lead.ai_paused_for_supplier = False
        lead.buyer_chat_enabled = True
        lead.supplier_chat_enabled = True
        conv_result = await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))
        conv = conv_result.scalar_one_or_none()
        if conv:
            conv.mode = "manual"
        await _create_deal(lead, db)
        await _post_system_message(
            lead.id,
            "🎉 Deal confirmed by both parties! You can now chat directly about delivery, packaging, and payment.",
            db
        )

        # Close all other leads for the same requirement
        other_leads_result = await db.execute(
            select(Lead).where(
                Lead.requirement_id == lead.requirement_id,
                Lead.id != lead.id,
                Lead.status.notin_(["deal_closed", "not_selected", "declined"])
            )
        )
        other_leads = other_leads_result.scalars().all()
        for other_lead in other_leads:
            other_lead.status = "not_selected"
            other_lead.ai_paused_for_buyer = False
            other_lead.ai_paused_for_supplier = False
            await _post_system_message(
                other_lead.id,
                "This requirement has been fulfilled — the buyer closed a deal with another supplier.",
                db
            )

        await db.commit()
        return {"success": True, "status": "deal_closed"}

    elif action == "reject":
        lead.status = "declined"
        lead.ai_paused_for_supplier = False
        await _post_system_message(
            lead.id,
            "❌ Supplier declined the deal. Buyer can explore other suppliers.",
            db
        )
        await db.commit()
        return {"success": True, "status": "declined"}

    raise HTTPException(status_code=400, detail=f"Unknown action: {action}")


@router.post("/supplier-offer-approval")
async def handle_supplier_offer_approval(
    request: SupplierOfferApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supplier approves, edits, or declines the AI-built final offer before it goes to buyer."""
    lead_result = await db.execute(select(Lead).where(Lead.id == request.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead or lead.supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.status != "pending_supplier_approval":
        raise HTTPException(status_code=400, detail="Lead is not pending supplier approval")

    action = request.action.lower()

    if action in ("approve", "edit_approve"):
        offer_message = request.edited_message if action == "edit_approve" and request.edited_message else lead.pending_offer_message

        conv_result = await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))
        conv = conv_result.scalar_one_or_none()
        if conv:
            msg = Message(
                conversation_id=conv.id,
                role="ai_supplier",
                message_type="text",
                content=offer_message,
            )
            db.add(msg)

        lead.status = "offer_ready"
        lead.ai_paused_for_supplier = False
        lead.ai_paused_for_buyer = True
        lead.pending_offer_message = None

        await _post_system_message(
            lead.id,
            "📋 Supplier approved this offer. Waiting for buyer's decision.",
            db
        )
        await db.commit()
        return {"success": True, "status": "offer_ready"}

    elif action == "decline":
        lead.status = "negotiating"
        lead.ai_paused_for_supplier = False
        lead.pending_offer_message = None

        await _post_system_message(
            lead.id,
            "Supplier wants to continue negotiating.",
            db
        )
        await db.commit()

        import asyncio
        asyncio.create_task(_run_autonomous_negotiation_round(lead.id))

        return {"success": True, "status": "negotiating"}

    raise HTTPException(status_code=400, detail=f"Unknown action: {action}")


@router.post("/suggest-response", response_model=SuggestResponseOut)
async def suggest_response(
    request: SuggestResponseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate an AI-suggested next message for the human user.
    For a seller: suggests the best response to the buyer's last message.
    For a buyer: suggests the best response to the seller's last message.
    Does NOT send the message — just returns a suggestion the user can edit/send.
    """
    lead_result = await db.execute(select(Lead).where(Lead.id == request.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    is_buyer = current_user.id == lead.buyer_id
    is_supplier = current_user.id == lead.supplier_id
    if not is_buyer and not is_supplier:
        raise HTTPException(status_code=403, detail="Access denied")

    conv_result = await db.execute(
        select(Conversation).where(Conversation.lead_id == lead.id)
    )
    conversation = conv_result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not started")

    history = conversation.ai_context or []
    user_cfg = await get_or_create_config(current_user.id, db)

    if is_supplier:
        supplier_profile_result = await db.execute(
            select(AgenticProfile).where(AgenticProfile.user_id == lead.supplier_id)
        )
        supplier_profile = supplier_profile_result.scalar_one_or_none()

        last_buyer_msg = ""
        for msg in reversed(history):
            if msg.get("role") in ("ai_buyer", "human_buyer", "user"):
                last_buyer_msg = msg.get("content", "")
                break

        suggestion = await generate_supplier_suggestion(
            conversation_history=history,
            buyer_message=last_buyer_msg,
            supplier_profile={
                "trade_name": supplier_profile.trade_name if supplier_profile else "My Company",
                "product_categories": supplier_profile.product_categories if supplier_profile else [],
            },
            negotiation_round=lead.negotiation_round,
            profile_md=user_cfg.profile_md or "",
            seller_settings_md=user_cfg.seller_settings_md or "",
        )
        return SuggestResponseOut(
            suggested_message=suggestion,
            context="Suggested response as seller to the buyer's last message",
        )

    else:
        req_result = await db.execute(
            select(Requirement).where(Requirement.id == lead.requirement_id)
        )
        requirement = req_result.scalar_one_or_none()
        req_dict = {
            "product": requirement.product if requirement else "",
            "quantity": requirement.quantity if requirement else 0,
            "budget_max": requirement.budget_max if requirement else 0,
            "delivery_days": requirement.delivery_days if requirement else "",
            "delivery_location": requirement.delivery_location if requirement else "",
            "specifications": requirement.specifications if requirement else {},
        }

        last_supplier_msg = ""
        for msg in reversed(history):
            if msg.get("role") in ("ai_supplier", "human_supplier", "assistant"):
                last_supplier_msg = msg.get("content", "")
                break

        suggestion = await generate_buyer_suggestion(
            conversation_history=history,
            supplier_message=last_supplier_msg,
            requirement=req_dict,
            negotiation_round=lead.negotiation_round,
            profile_md=user_cfg.profile_md or "",
            buyer_settings_md=user_cfg.buyer_settings_md or "",
        )
        return SuggestResponseOut(
            suggested_message=suggestion,
            context="Suggested response as buyer to the seller's last message",
        )


# ──────────────────────────── Internal helpers ────────────────────────────

async def _trigger_supplier_ai_response(
    conversation: Conversation,
    lead: Lead,
    buyer_message: str,
    db: AsyncSession,
) -> Message | None:
    """Generate and save supplier's AI response to buyer's message."""
    supplier_profile_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == lead.supplier_id)
    )
    supplier_profile = supplier_profile_result.scalar_one_or_none()
    if not supplier_profile:
        return None

    history = conversation.ai_context or []
    agent_config = supplier_profile.agent_config or get_default_agent_config()

    # Load supplier's config for agent context
    supplier_cfg = await get_or_create_config(lead.supplier_id, db)

    response = await supplier_agent_respond(
        conversation_history=history,
        buyer_message=buyer_message,
        supplier_profile={"trade_name": supplier_profile.trade_name,
                          "product_categories": supplier_profile.product_categories},
        agent_config=agent_config,
        negotiation_round=lead.negotiation_round,
        max_rounds=lead.max_negotiation_rounds,
        profile_md=supplier_cfg.profile_md or "",
        seller_settings_md=supplier_cfg.seller_settings_md or "",
    )

    msg = Message(
        conversation_id=conversation.id,
        role="ai_supplier",
        message_type="text",
        content=response["message"],
        structured_data={"offer": response.get("extracted_offer")},
    )
    db.add(msg)

    # Update lead
    if response.get("extracted_offer"):
        lead.current_offer_price = response["extracted_offer"].get("price_per_unit")
        lead.current_lead_time = response["extracted_offer"].get("lead_time_days")

    # Final offer built by supplier AI → pause for human seller to approve/edit/decline
    final_offer = response.get("final_offer")
    if final_offer:
        offer_message = final_offer.get("message") or response["message"]
        lead.status = "pending_supplier_approval"
        lead.ai_paused_for_supplier = True
        lead.pending_offer_message = offer_message
        if final_offer.get("price_per_unit"):
            lead.current_offer_price = final_offer["price_per_unit"]
        if final_offer.get("lead_time_days"):
            lead.current_lead_time = final_offer["lead_time_days"]
    elif response.get("needs_supplier_input"):
        lead.ai_paused_for_supplier = True

    lead.negotiation_round += 1

    # Update AI context — use consistent role names for the agent loop
    updated_context = history + [
        {"role": "ai_buyer", "content": buyer_message},
        {"role": "ai_supplier", "content": response["message"]},
    ]
    conversation.ai_context = updated_context

    return msg


async def _trigger_buyer_ai_response(
    conversation: Conversation,
    lead: Lead,
    supplier_message: str,
    db: AsyncSession,
) -> Message | None:
    """Generate and save buyer's AI response to supplier's message."""
    req_result = await db.execute(
        select(Requirement).where(Requirement.id == lead.requirement_id)
    )
    requirement = req_result.scalar_one_or_none()
    if not requirement:
        return None

    req_dict = {
        "product": requirement.product,
        "quantity": requirement.quantity,
        "budget_max": requirement.budget_max,
        "delivery_days": requirement.delivery_days,
        "delivery_location": requirement.delivery_location,
    }

    history = conversation.ai_context or []

    # Load buyer's config for agent context
    buyer_cfg = await get_or_create_config(lead.buyer_id, db)

    response = await buyer_agent_respond(
        conversation_history=history,
        supplier_message=supplier_message,
        requirement=req_dict,
        negotiation_round=lead.negotiation_round,
        max_rounds=lead.max_negotiation_rounds,
        profile_md=buyer_cfg.profile_md or "",
        buyer_settings_md=buyer_cfg.buyer_settings_md or "",
    )

    msg = Message(
        conversation_id=conversation.id,
        role="ai_buyer",
        message_type="text",
        content=response["message"],
        structured_data={"offer": response.get("extracted_offer")},
    )
    db.add(msg)

    if response.get("needs_buyer_input"):
        lead.ai_paused_for_buyer = True
    lead.negotiation_round += 1

    # Update AI context — use consistent role names for the agent loop
    updated_context = history + [
        {"role": "ai_supplier", "content": supplier_message},
        {"role": "ai_buyer", "content": response["message"]},
    ]
    conversation.ai_context = updated_context

    return msg




async def _run_autonomous_negotiation_round(lead_id: int):
    """
    Autonomous negotiation loop — runs as a single long-lived coroutine.
    Alternates: Supplier responds → Buyer responds → repeat until:
    - Deal accepted (buyer signals acceptance)
    - Buyer walks away
    - Escalation needed (buyer or supplier)
    - Max safety limit (20 rounds)
    """
    from app.db.base import AsyncSessionLocal
    from app.models.lead import Lead
    import asyncio
    import logging
    logger = logging.getLogger(__name__)

    MAX_ROUNDS = 20  # safety limit to prevent infinite loops

    for round_num in range(MAX_ROUNDS):
        # Small delay between rounds to avoid hammering the LLM
        if round_num > 0:
            await asyncio.sleep(2)

        async with AsyncSessionLocal() as db:
            try:
                lead_result = await db.execute(select(Lead).where(Lead.id == lead_id))
                lead = lead_result.scalar_one_or_none()
                if not lead:
                    logger.info(f"[AUTO] Lead #{lead_id}: not found, stopping")
                    return
                if lead.status in ("deal_closed", "declined", "not_selected"):
                    logger.info(f"[AUTO] Lead #{lead_id}: status={lead.status}, stopping")
                    return
                if lead.ai_paused_for_buyer or lead.ai_paused_for_supplier:
                    logger.info(f"[AUTO] Lead #{lead_id}: paused for human, stopping")
                    return

                conv_result = await db.execute(
                    select(Conversation).where(Conversation.lead_id == lead_id)
                )
                conversation = conv_result.scalar_one_or_none()
                if not conversation or conversation.mode not in ("ai_negotiating", "hybrid"):
                    logger.info(f"[AUTO] Lead #{lead_id}: mode={conversation.mode if conversation else 'none'}, stopping")
                    return

                history = conversation.ai_context or []
                if not history:
                    logger.info(f"[AUTO] Lead #{lead_id}: no history, stopping")
                    return

                last_msg = history[-1]
                last_role = last_msg.get("role", "")
                last_content = last_msg.get("content", "")

                logger.info(f"[AUTO] Lead #{lead_id} round {lead.negotiation_round}: last_role={last_role}")

                if last_role in ("ai_buyer", "user"):
                    # Buyer just spoke → supplier AI responds
                    supplier_msg = await _trigger_supplier_ai_response(
                        conversation, lead, last_content, db
                    )
                    await db.commit()

                    if not supplier_msg:
                        logger.warning(f"[AUTO] Lead #{lead_id}: supplier response failed, stopping")
                        return
                    if lead.status == "pending_supplier_approval":
                        logger.info(f"[AUTO] Lead #{lead_id}: supplier AI built final offer, waiting for human seller approval")
                        return
                    if lead.ai_paused_for_supplier:
                        logger.info(f"[AUTO] Lead #{lead_id}: supplier escalated, stopping")
                        return
                    if lead.status == "deal_closed":
                        logger.info(f"[AUTO] Lead #{lead_id}: deal closed by supplier, stopping")
                        return
                    # Continue — buyer will respond next iteration

                elif last_role in ("ai_supplier", "assistant"):
                    # Supplier just spoke → buyer AI responds
                    buyer_msg = await _trigger_buyer_ai_response(
                        conversation, lead, last_content, db
                    )
                    await db.commit()

                    if not buyer_msg:
                        logger.warning(f"[AUTO] Lead #{lead_id}: buyer response failed, stopping")
                        return
                    if lead.ai_paused_for_buyer:
                        logger.info(f"[AUTO] Lead #{lead_id}: buyer escalated, stopping")
                        return

                    # Check if buyer is walking away
                    buyer_content = buyer_msg.content or ""
                    from app.agents.buyer_agent import _detect_walkaway
                    if _detect_walkaway(buyer_content):
                        lead.status = "declined"
                        await db.commit()
                        logger.info(f"[AUTO] Lead #{lead_id}: buyer walked away, stopping")
                        return


                    if lead.status == "deal_closed":
                        logger.info(f"[AUTO] Lead #{lead_id}: status=deal_closed, stopping")
                        return

                    # Continue — supplier will respond next iteration

                else:
                    logger.warning(f"[AUTO] Lead #{lead_id}: unknown last_role={last_role}, stopping")
                    return

            except Exception as e:
                logger.error(f"[AUTO] Lead #{lead_id} round error: {e}")
                import traceback; traceback.print_exc()
                return

    logger.info(f"[AUTO] Lead #{lead_id}: hit max rounds ({MAX_ROUNDS}), stopping")

async def _post_system_message(lead_id: int, content: str, db: AsyncSession):
    """Post a system notification message to the conversation."""
    conv_result = await db.execute(select(Conversation).where(Conversation.lead_id == lead_id))
    conversation = conv_result.scalar_one_or_none()
    if not conversation:
        return
    msg = Message(
        conversation_id=conversation.id,
        role="system",
        message_type="system_event",
        content=content,
    )
    db.add(msg)


async def _create_deal(lead: Lead, db: AsyncSession):
    """Create a Deal record when buyer accepts."""
    from app.models.deal import Deal
    req_result = await db.execute(
        select(Requirement).where(Requirement.id == lead.requirement_id)
    )
    req = req_result.scalar_one_or_none()
    if not req:
        return

    total = (lead.current_offer_price or 0) * req.quantity
    deal = Deal(
        lead_id=lead.id,
        buyer_id=lead.buyer_id,
        supplier_id=lead.supplier_id,
        product=req.product,
        quantity=req.quantity,
        quantity_unit=req.quantity_unit,
        final_price_per_unit=lead.current_offer_price or 0,
        total_value=total,
        lead_time_days=lead.current_lead_time,
        delivery_location=req.delivery_location,
        status="confirmed",
        buyer_savings=max(0, (req.budget_max - (lead.current_offer_price or 0)) * req.quantity),
    )
    db.add(deal)