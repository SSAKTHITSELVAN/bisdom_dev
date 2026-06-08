"""General AI chat per requirement — buyer queries summaries, top sellers, etc."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.requirement import Requirement
from app.models.requirement_chat import RequirementChat
from app.models.lead import Lead
from app.agents.bedrock_client import call_qwen3
import json

router = APIRouter(prefix="/req-chat", tags=["Requirement Chat"])


class ReqChatMessage(BaseModel):
    requirement_id: int
    message: str


class ReqChatResponse(BaseModel):
    requirement_id: int
    reply: str
    messages: list


REQUIREMENT_ANALYST_SYSTEM = """You are the buyer's personal negotiation advisor on Bisdom (B2B textile marketplace).

You have FULL visibility into all supplier negotiations — their chat messages, prices, terms, and behavior patterns.

YOUR JOB:
- Help the buyer make the best purchasing decision
- Compare suppliers on price, reliability, delivery speed, and negotiation behavior
- Spot red flags (inconsistent pricing, vague terms, avoiding questions)
- Recommend which supplier to accept and WHY
- Calculate savings vs budget

STYLE:
- Be direct and opinionated — you're their advisor, not a neutral bot
- Use ₹ for prices, keep numbers clear
- Use supplier COMPANY NAMES, never IDs
- Short paragraphs, bullet points when comparing
- If you don't have enough data yet, say so honestly"""


async def build_requirement_context(req: Requirement, leads: list, db: AsyncSession) -> str:
    """Build rich context including supplier names and recent negotiation messages."""
    from app.models.profile import AgenticProfile
    from app.models.conversation import Conversation, Message

    supplier_ids = [lead.supplier_id for lead in leads]
    profiles = {}
    if supplier_ids:
        profile_result = await db.execute(
            select(AgenticProfile).where(AgenticProfile.user_id.in_(supplier_ids))
        )
        for p in profile_result.scalars().all():
            profiles[p.user_id] = {
                "name": p.trade_name or f"Supplier #{p.user_id}",
                "city": p.city,
                "state": p.state,
                "categories": p.product_categories,
                "reliability": p.reliability_score,
            }

    ctx = [
        f"REQUIREMENT: {req.product}",
        f"Quantity: {req.quantity} {req.quantity_unit or 'units'}",
        f"Budget: ₹{req.budget_max}/unit max" if req.budget_max else "Budget: Flexible",
        f"Delivery: {req.delivery_location or 'Not specified'}, within {req.delivery_days or '?'} days",
        f"Specs: {json.dumps(req.specifications)}" if req.specifications else "",
        "",
        f"═══ SUPPLIERS ({len(leads)}) ═══",
    ]

    for i, lead in enumerate(leads, 1):
        p = profiles.get(lead.supplier_id, {"name": f"Supplier #{lead.supplier_id}"})
        name = p["name"]
        location = f"{p.get('city', '')}, {p.get('state', '')}".strip(', ')

        status_label = {
            "negotiating": "AI negotiating",
            "agent_initiated": "Just started",
            "renegotiating": "Renegotiating",
            "pending_supplier_approval": "Supplier reviewing offer",
            "offer_ready": "OFFER READY — buyer must decide",
            "awaiting_supplier_confirm": "Buyer accepted, awaiting supplier confirm",
            "deal_closed": "DEAL CLOSED ✓",
            "declined": "Declined",
            "not_selected": "Not selected",
        }.get(lead.status, lead.status)

        ctx.append(f"\n┌─ {i}. {name} {'(' + location + ')' if location else ''}")
        ctx.append(f"│  Status: {status_label}")
        ctx.append(f"│  Price: {'₹' + str(int(lead.current_offer_price)) + '/unit' if lead.current_offer_price else 'Not quoted yet'}")
        ctx.append(f"│  Lead time: {lead.current_lead_time or '?'} days | Fit score: {lead.fit_score or 0:.0f}%")
        ctx.append(f"│  Round: {lead.negotiation_round}")

        if lead.ai_paused_for_buyer:
            ctx.append(f"│  ⚠️ WAITING FOR YOUR DECISION")

        # Include last few conversation messages for this lead
        conv_result = await db.execute(
            select(Conversation).where(Conversation.lead_id == lead.id)
        )
        conv = conv_result.scalar_one_or_none()
        if conv and conv.ai_context:
            recent = conv.ai_context[-6:]  # last 6 messages
            if recent:
                ctx.append(f"│  Recent chat:")
                for msg in recent:
                    role = msg.get("role", "?")
                    content = msg.get("content", "")[:150]
                    role_label = "Buyer AI" if "buyer" in role else "Supplier AI" if "supplier" in role else role
                    ctx.append(f"│    [{role_label}]: {content}")

        ctx.append(f"└─")

    # Summary stats
    prices = [l.current_offer_price for l in leads if l.current_offer_price]
    ctx.append(f"\n═══ SUMMARY ═══")
    ctx.append(f"Total suppliers: {len(leads)}")
    ctx.append(f"With price quotes: {len(prices)}")
    if prices:
        ctx.append(f"Best price: ₹{min(prices)}/unit")
        ctx.append(f"Avg price: ₹{sum(prices)/len(prices):.0f}/unit")
        if req.budget_max:
            savings = req.budget_max - min(prices)
            ctx.append(f"Best savings vs budget: ₹{savings}/unit ({savings/req.budget_max*100:.0f}% below budget)" if savings > 0 else f"Best price exceeds budget by ₹{-savings}/unit")

    return "\n".join(ctx)


@router.post("/", response_model=ReqChatResponse)
async def requirement_chat(
    request: ReqChatMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify requirement belongs to user
    req_result = await db.execute(
        select(Requirement).where(
            Requirement.id == request.requirement_id,
            Requirement.buyer_id == current_user.id,
        )
    )
    req = req_result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Get all leads for this requirement
    leads_result = await db.execute(
        select(Lead).where(Lead.requirement_id == request.requirement_id)
    )
    leads = leads_result.scalars().all()

    # Get or create chat record
    chat_result = await db.execute(
        select(RequirementChat).where(
            RequirementChat.requirement_id == request.requirement_id
        )
    )
    req_chat = chat_result.scalar_one_or_none()
    if not req_chat:
        req_chat = RequirementChat(
            requirement_id=request.requirement_id,
            buyer_id=current_user.id,
            messages=[],
        )
        db.add(req_chat)
        await db.flush()

    # Build context
    context = await build_requirement_context(req, leads, db)

    # Build messages for LLM
    history = req_chat.messages or []
    messages = []

    # Add context as first user message if no history
    if not history:
        messages.append({
            "role": "user",
            "content": f"Here is my current requirement data:\n\n{context}\n\nI'm ready to ask questions."
        })
        messages.append({
            "role": "assistant",
            "content": f"I have your requirement details loaded. You have {len(leads)} matched sellers. What would you like to know?"
        })

    # Add history
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current question with fresh context
    user_msg = f"[Current data snapshot]\n{context}\n\n[My question]\n{request.message}"
    messages.append({"role": "user", "content": user_msg})

    # Call AI
    reply = await call_qwen3(
        messages,
        system_prompt=REQUIREMENT_ANALYST_SYSTEM,
        max_tokens=800,
        temperature=0.5,
    )

    # Save to history (store clean version without context injection)
    updated_history = history + [
        {"role": "user", "content": request.message},
        {"role": "assistant", "content": reply},
    ]
    req_chat.messages = updated_history
    await db.flush()

    return ReqChatResponse(
        requirement_id=request.requirement_id,
        reply=reply,
        messages=updated_history[-20:],  # return last 20 messages
    )


@router.get("/{requirement_id}", response_model=ReqChatResponse)
async def get_requirement_chat(
    requirement_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id,
            Requirement.buyer_id == current_user.id,
        )
    )
    if not req_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Requirement not found")

    chat_result = await db.execute(
        select(RequirementChat).where(RequirementChat.requirement_id == requirement_id)
    )
    req_chat = chat_result.scalar_one_or_none()
    messages = req_chat.messages if req_chat else []

    return ReqChatResponse(
        requirement_id=requirement_id,
        reply="",
        messages=messages,
    )
