"""
Cards API — supplier offer card flow (stub, implementation pending).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/cards", tags=["Cards"])


@router.get("/actions-needed")
async def get_actions_needed(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Placeholder — returns empty list until cards flow is implemented."""
    return []
