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


REQUIREMENT_ANALYST_SYSTEM = """You are Bisdom's Requirement Assistant helping a buyer compare suppliers.

RULES:
- Always refer to suppliers by their COMPANY NAME, never "Lead #123"
- Be concise — short paragraphs, no unnecessary filler
- Use ₹ for prices
- Give clear recommendations with reasons
- Keep it practical and actionable"""


async def build_requirement_context(req: Requirement, leads: list, db: AsyncSession) -> str:
    """Build a context string describing the requirement and all leads with supplier names."""
    from app.models.profile import AgenticProfile

    # Load supplier profiles to get trade names
    supplier_ids = [lead.supplier_id for lead in leads]
    profiles = {}
    if supplier_ids:
        profile_result = await db.execute(
            select(AgenticProfile).where(AgenticProfile.user_id.in_(supplier_ids))
        )
        for p in profile_result.scalars().all():
            profiles[p.user_id] = p.trade_name or f"Supplier #{p.user_id}"

    ctx = [
        f"REQUIREMENT: {req.product}",
        f"Quantity: {req.quantity} {req.quantity_unit or 'units'}",
        f"Budget: ₹{req.budget_max} max",
        f"Delivery: {req.delivery_location or 'Not specified'} in {req.delivery_days or '?'} days",
        "",
        f"MATCHED SUPPLIERS ({len(leads)}):",
    ]
    for i, lead in enumerate(leads, 1):
        name = profiles.get(lead.supplier_id, f"Supplier #{lead.supplier_id}")
        ctx.append(
            f"  {i}. {name} | Status: {lead.status} | "
            f"Price: {'₹'+str(lead.current_offer_price)+'/unit' if lead.current_offer_price else 'Pending'} | "
            f"Lead time: {lead.current_lead_time or '?'} days | "
            f"Fit: {lead.fit_score or 0:.0f}%"
        )
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
        max_tokens=600,
        temperature=0.6,
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
