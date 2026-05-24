"""
Profile management endpoints — UI-friendly structured editing.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.user_config import UserConfig
from app.agents.profile_converter import json_to_markdown
from app.agents.profile_converter_v2 import json_to_markdown_v2, convert_old_to_new_format
from app.services.product_preprocessing import preprocess_supplier_products

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["Profile"])


class ProductSpec(BaseModel):
    fabric: Optional[Dict[str, Any]] = {}
    gsm: Optional[Dict[str, Any]] = {}
    fit: Optional[str] = ""
    neck_type: Optional[str] = ""
    sleeve_type: Optional[str] = ""
    colors: Optional[List[str]] = []
    sizes: Optional[List[str]] = []
    printing_methods: Optional[List[str]] = []


class ProductPricing(BaseModel):
    price_per_unit: Optional[float] = None
    currency: Optional[str] = "INR"
    price_bucket: Optional[str] = ""
    moq: Optional[int] = None


class Product(BaseModel):
    name: str
    category: Optional[str] = ""
    target_gender: Optional[str] = ""
    url: Optional[str] = ""
    description: Optional[str] = ""
    specifications: Optional[ProductSpec] = ProductSpec()
    pricing: Optional[ProductPricing] = ProductPricing()
    use_cases: Optional[List[str]] = []


class UpdateProfileRequest(BaseModel):
    company: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None
    about: Optional[str] = None
    product_categories: Optional[List[str]] = None
    products: Optional[List[Product]] = None
    capabilities: Optional[Dict[str, bool]] = None
    serviceable_locations: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    payment_terms: Optional[List[str]] = None


class AddProductRequest(BaseModel):
    product: Product


class UpdateProductRequest(BaseModel):
    index: int
    product: Product


class DeleteProductRequest(BaseModel):
    index: int


@router.get("/")
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's profile JSON for editing."""
    result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()

    if not config:
        return {"profile": {}, "markdown": ""}

    return {
        "profile": config.profile_json or {},
        "markdown": config.profile_md or "",
    }


@router.post("/update")
async def update_profile(
    request: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update profile fields.
    Automatically regenerates markdown for AI agents.
    """
    result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="Profile not found. Complete onboarding first.")

    # Get current profile JSON
    profile_json = config.profile_json or {}

    # Update only provided fields
    if request.company is not None:
        profile_json["company"] = {**profile_json.get("company", {}), **request.company}
    if request.location is not None:
        profile_json["location"] = {**profile_json.get("location", {}), **request.location}
    if request.about is not None:
        profile_json["about"] = request.about
    if request.product_categories is not None:
        profile_json["product_categories"] = request.product_categories
    if request.products is not None:
        profile_json["products"] = [p.dict() for p in request.products]
    if request.capabilities is not None:
        profile_json["capabilities"] = {**profile_json.get("capabilities", {}), **request.capabilities}
    if request.serviceable_locations is not None:
        profile_json["serviceable_locations"] = request.serviceable_locations
    if request.certifications is not None:
        profile_json["certifications"] = request.certifications
    if request.payment_terms is not None:
        profile_json["payment_terms"] = request.payment_terms

    # Regenerate markdown cache - use v2 if it has supplier/catalogue structure
    if "supplier" in profile_json or "catalogue" in profile_json:
        profile_md = json_to_markdown_v2(profile_json)
    else:
        profile_md = json_to_markdown(profile_json)

    # Save both
    config.profile_json = profile_json
    config.profile_md = profile_md
    await db.commit()

    logger.info(f"[PROFILE] User #{current_user.id}: profile updated")

    # AUTO-REPROCESS PRODUCTS for efficient matching
    # This runs in background - updates supplier_products table with new embeddings
    try:
        products_count = await preprocess_supplier_products(
            user_id=current_user.id,
            db=db,
            force_refresh=True  # Always refresh to keep in sync
        )
        await db.commit()
        logger.info(f"[PROFILE] Auto-preprocessed {products_count} products for user #{current_user.id}")
    except Exception as e:
        logger.error(f"[PROFILE] Auto-preprocessing failed for user #{current_user.id}: {e}")
        # Don't fail the profile update if preprocessing fails

    return {
        "success": True,
        "profile": profile_json,
        "markdown": profile_md,
    }


@router.post("/products/add")
async def add_product(
    request: AddProductRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new product to the profile."""
    result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile_json = config.profile_json or {}
    products = profile_json.get("products", [])
    products.append(request.product.dict())
    profile_json["products"] = products

    # Regenerate markdown
    config.profile_json = profile_json
    config.profile_md = json_to_markdown(profile_json)
    await db.commit()

    logger.info(f"[PROFILE] User #{current_user.id}: added product '{request.product.name}'")

    # AUTO-REPROCESS PRODUCTS for efficient matching
    try:
        products_count = await preprocess_supplier_products(
            user_id=current_user.id,
            db=db,
            force_refresh=True
        )
        await db.commit()
        logger.info(f"[PROFILE] Auto-preprocessed {products_count} products after adding product")
    except Exception as e:
        logger.error(f"[PROFILE] Auto-preprocessing failed: {e}")

    return {
        "success": True,
        "product_index": len(products) - 1,
        "profile": profile_json,
    }


@router.post("/products/update")
async def update_product(
    request: UpdateProductRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing product."""
    result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile_json = config.profile_json or {}
    products = profile_json.get("products", [])

    if request.index < 0 or request.index >= len(products):
        raise HTTPException(status_code=400, detail="Invalid product index")

    products[request.index] = request.product.dict()
    profile_json["products"] = products

    # Regenerate markdown
    config.profile_json = profile_json
    config.profile_md = json_to_markdown(profile_json)
    await db.commit()

    logger.info(f"[PROFILE] User #{current_user.id}: updated product #{request.index}")

    # AUTO-REPROCESS PRODUCTS for efficient matching
    try:
        products_count = await preprocess_supplier_products(
            user_id=current_user.id,
            db=db,
            force_refresh=True
        )
        await db.commit()
        logger.info(f"[PROFILE] Auto-preprocessed {products_count} products after updating product")
    except Exception as e:
        logger.error(f"[PROFILE] Auto-preprocessing failed: {e}")

    return {
        "success": True,
        "profile": profile_json,
    }


@router.post("/products/delete")
async def delete_product(
    request: DeleteProductRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a product from the profile."""
    result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile_json = config.profile_json or {}
    products = profile_json.get("products", [])

    if request.index < 0 or request.index >= len(products):
        raise HTTPException(status_code=400, detail="Invalid product index")

    deleted_name = products[request.index].get("name", "")
    del products[request.index]
    profile_json["products"] = products

    # Regenerate markdown
    config.profile_json = profile_json
    config.profile_md = json_to_markdown(profile_json)
    await db.commit()

    logger.info(f"[PROFILE] User #{current_user.id}: deleted product '{deleted_name}'")

    # AUTO-REPROCESS PRODUCTS for efficient matching
    try:
        products_count = await preprocess_supplier_products(
            user_id=current_user.id,
            db=db,
            force_refresh=True
        )
        await db.commit()
        logger.info(f"[PROFILE] Auto-preprocessed {products_count} products after deleting product")
    except Exception as e:
        logger.error(f"[PROFILE] Auto-preprocessing failed: {e}")

    return {
        "success": True,
        "profile": profile_json,
    }
