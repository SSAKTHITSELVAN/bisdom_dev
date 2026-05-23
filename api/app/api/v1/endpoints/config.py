"""User config endpoint — profile_json, profile_md, buyer_settings_md, seller_settings_md."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, Any
import logging
from app.db.base import get_db, AsyncSessionLocal
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.user_config import UserConfig
from app.models.profile import AgenticProfile
from app.agents.config_agent import DEFAULT_BUYER_SETTINGS, DEFAULT_SELLER_SETTINGS
from app.agents.profile_converter import json_to_markdown

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/config", tags=["User Config"])


class ConfigResponse(BaseModel):
    profile: Optional[dict] = None  # New: JSON format for UI
    profile_md: str  # Auto-generated from profile_json
    buyer_settings_md: str
    seller_settings_md: str


class UpdateConfigRequest(BaseModel):
    profile: Optional[dict] = None  # New: Accept JSON profile
    profile_md: Optional[str] = None  # Legacy: Direct markdown (deprecated)
    buyer_settings_md: Optional[str] = None
    seller_settings_md: Optional[str] = None


async def get_or_create_config(user_id: int, db: AsyncSession) -> UserConfig:
    result = await db.execute(select(UserConfig).where(UserConfig.user_id == user_id))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = UserConfig(
            user_id=user_id,
            profile_md="",
            buyer_settings_md=DEFAULT_BUYER_SETTINGS,
            seller_settings_md=DEFAULT_SELLER_SETTINGS,
        )
        db.add(cfg)
        await db.flush()
    return cfg


@router.get("/", response_model=ConfigResponse)
async def get_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg = await get_or_create_config(current_user.id, db)

    # Return profile_json if available, otherwise fall back to empty structure
    profile_json = cfg.profile_json if cfg.profile_json else {}

    # Auto-generate markdown from JSON
    profile_md = json_to_markdown(profile_json) if profile_json else (cfg.profile_md or "")

    return ConfigResponse(
        profile=profile_json,
        profile_md=profile_md,
        buyer_settings_md=cfg.buyer_settings_md or DEFAULT_BUYER_SETTINGS,
        seller_settings_md=cfg.seller_settings_md or DEFAULT_SELLER_SETTINGS,
    )


@router.put("/", response_model=ConfigResponse)
async def update_config(
    request: UpdateConfigRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg = await get_or_create_config(current_user.id, db)

    # Track if profile was updated (to trigger rematching)
    profile_updated = False

    # Update profile_json if provided (NEW)
    if request.profile is not None:
        logger.info(f"[CONFIG] User #{current_user.id}: updating profile_json")
        cfg.profile_json = request.profile
        # Auto-generate markdown from JSON
        cfg.profile_md = json_to_markdown(request.profile)
        profile_updated = True
        logger.info(f"[CONFIG] User #{current_user.id}: profile_json saved with {len(request.profile.get('product_categories', []))} categories")

    # Legacy: direct markdown update (DEPRECATED)
    elif request.profile_md is not None:
        logger.warning(f"[CONFIG] User #{current_user.id}: using deprecated profile_md update")
        cfg.profile_md = request.profile_md
        profile_updated = True

    if request.buyer_settings_md is not None:
        cfg.buyer_settings_md = request.buyer_settings_md
    if request.seller_settings_md is not None:
        cfg.seller_settings_md = request.seller_settings_md

    await db.flush()
    await db.commit()
    logger.info(f"[CONFIG] User #{current_user.id}: config committed to database")

    # ✅ TRIGGER AUTOMATIC REMATCHING if profile was updated
    if profile_updated:
        # Check if user is a supplier (has AgenticProfile)
        profile_result = await db.execute(
            select(AgenticProfile).where(AgenticProfile.user_id == current_user.id)
        )
        supplier_profile = profile_result.scalar_one_or_none()

        if supplier_profile:
            # Queue background rematching task
            background_tasks.add_task(
                _background_rematch_supplier,
                supplier_id=current_user.id
            )
            logger.info(f"[CONFIG] User #{current_user.id}: queued background rematching task")
        else:
            logger.info(f"[CONFIG] User #{current_user.id}: no supplier profile, skipping rematch")

    # Return updated data
    profile_json = cfg.profile_json if cfg.profile_json else {}
    profile_md = json_to_markdown(profile_json) if profile_json else cfg.profile_md

    return ConfigResponse(
        profile=profile_json,
        profile_md=profile_md,
        buyer_settings_md=cfg.buyer_settings_md or "",
        seller_settings_md=cfg.seller_settings_md or "",
    )


async def _background_rematch_supplier(supplier_id: int):
    """
    Background task to rematch all requirements when a supplier updates their profile.
    Uses a new database session to avoid conflicts with the request session.
    """
    from app.services.rematch_service import rematch_all_requirements_for_supplier

    logger.info(f"[REMATCH-BG] Starting background rematch for supplier #{supplier_id}")

    try:
        async with AsyncSessionLocal() as db:
            result = await rematch_all_requirements_for_supplier(supplier_id, db)

            if "error" in result:
                logger.error(f"[REMATCH-BG] Failed for supplier #{supplier_id}: {result['error']}")
            else:
                logger.info(f"[REMATCH-BG] Completed for supplier #{supplier_id}: "
                           f"{result.get('leads_updated', 0)} updated, "
                           f"{result.get('leads_created', 0)} created, "
                           f"{result.get('leads_deleted', 0)} deleted")

    except Exception as e:
        logger.error(f"[REMATCH-BG] Exception for supplier #{supplier_id}: {e}")
        import traceback
        traceback.print_exc()
