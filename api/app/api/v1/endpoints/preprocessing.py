"""
Preprocessing Endpoints - Trigger product catalog preprocessing for suppliers
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.profile import AgenticProfile
from app.models.supplier_product import SupplierProduct
from app.services.product_preprocessing import preprocess_supplier_products
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/preprocessing", tags=["Preprocessing"])


@router.post("/preprocess-my-products")
async def preprocess_my_products(
    background_tasks: BackgroundTasks,
    force_refresh: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Preprocess current user's products for efficient matching.
    Extracts products from profile_json and generates embeddings.

    Args:
        force_refresh: If True, delete existing products and reprocess
    """
    logger.info(f"[PREPROCESS API] User #{current_user.id} requested preprocessing (force={force_refresh})")

    # Check if user has profile
    profile_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=400, detail="No profile found. Complete onboarding first.")

    # Run preprocessing in background
    background_tasks.add_task(_run_preprocessing, current_user.id, force_refresh)

    return {
        "success": True,
        "message": "Product preprocessing started in background",
        "user_id": current_user.id,
        "force_refresh": force_refresh,
    }


@router.get("/my-products")
async def get_my_preprocessed_products(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
):
    """Get current user's preprocessed products."""
    result = await db.execute(
        select(SupplierProduct)
        .where(SupplierProduct.supplier_id == current_user.id)
        .limit(limit)
    )
    products = result.scalars().all()

    return {
        "total": len(products),
        "products": [
            {
                "id": p.id,
                "product_name": p.product_name,
                "product_type": p.product_type,
                "material": p.material,
                "gsm": p.gsm,
                "price_min": float(p.price_min) if p.price_min else None,
                "price_max": float(p.price_max) if p.price_max else None,
                "moq": p.moq,
                "has_embedding": p.embedding is not None,
            }
            for p in products
        ],
    }


@router.post("/admin/preprocess-all")
async def preprocess_all_suppliers(
    background_tasks: BackgroundTasks,
    force_refresh: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin endpoint: Preprocess all suppliers' products.

    WARNING: This can take several minutes for large catalogs.
    """
    # TODO: Add admin authentication check
    logger.info(f"[PREPROCESS API] Admin user #{current_user.id} requested full preprocessing")

    # Get all profiles
    result = await db.execute(select(AgenticProfile))
    profiles = result.scalars().all()

    supplier_count = len(profiles)

    # Queue preprocessing for all suppliers
    for profile in profiles:
        background_tasks.add_task(_run_preprocessing, profile.user_id, force_refresh)

    return {
        "success": True,
        "message": f"Preprocessing queued for {supplier_count} suppliers",
        "supplier_count": supplier_count,
        "force_refresh": force_refresh,
    }


async def _run_preprocessing(user_id: int, force_refresh: bool):
    """Background task to run preprocessing."""
    from app.db.base import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            logger.info(f"[PREPROCESS BG] Starting preprocessing for user #{user_id}")

            count = await preprocess_supplier_products(user_id, db, force_refresh)

            await db.commit()

            logger.info(f"[PREPROCESS BG] Successfully preprocessed {count} products for user #{user_id}")

        except Exception as e:
            logger.error(f"[PREPROCESS BG] Error preprocessing user #{user_id}: {e}")
            await db.rollback()
            import traceback
            traceback.print_exc()
