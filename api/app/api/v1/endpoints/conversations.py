"""
Conversations — legacy stub kept for backward compatibility.
All new card flow logic is in cards.py.
Deal chat send/receive is also in cards.py (/api/v1/cards/conversations/...).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.models.conversation import Conversation, Message
from app.schemas.conversation import ConversationOut, MessageOut

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("/lead/{lead_id}", response_model=ConversationOut)
async def get_conversation_by_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get conversation by lead ID."""
    result = await db.execute(
        select(Conversation).where(Conversation.lead_id == lead_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not started yet")

    if current_user.id not in (conversation.buyer_id, conversation.supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    return ConversationOut(
        id=conversation.id,
        lead_id=conversation.lead_id,
        mode=conversation.mode,
        messages=[MessageOut(
            id=m.id, role=m.role, message_type=m.message_type,
            content=m.content, structured_data=m.structured_data,
            created_at=m.created_at,
        ) for m in messages],
        created_at=conversation.created_at,
    )
