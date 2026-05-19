"""
Matching Service — matches confirmed buyer requirements against supplier profiles.
Creates Lead records for each match, then initiates agent conversations.
Uses TF-IDF text similarity for better matching.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.models.lead import Lead
from app.models.user_config import UserConfig
from app.services.text_matching import calculate_enhanced_match_score
import asyncio
import logging

logger = logging.getLogger(__name__)

MINIMUM_FIT_SCORE = 20.0  # Adjusted threshold for TF-IDF matching (allows more matches)


async def match_requirement_to_suppliers(
    requirement: Requirement,
    db: AsyncSession,
) -> List[Lead]:
    """
    Find all supplier profiles that match this requirement.
    Creates Lead records for all matches above threshold.
    """
    # Fetch ALL profiles except the buyer — no filter on is_supplier or status
    result = await db.execute(
        select(AgenticProfile).where(
            AgenticProfile.user_id != requirement.buyer_id,
        )
    )
    supplier_profiles = result.scalars().all()

    logger.info(f"[MATCH] Requirement #{requirement.id} ({requirement.product}): "
                f"found {len(supplier_profiles)} potential suppliers")

    if not supplier_profiles:
        logger.warning(f"[MATCH] No other profiles in DB — only 1 user registered")
        requirement.enrichment_status = "matched"
        requirement.matched_supplier_count = 0
        await db.flush()
        return []

    req_dict = _requirement_to_dict(requirement)
    leads_created = []

    for profile in supplier_profiles:
        lead = await _create_lead(profile, req_dict, requirement, db)
        if lead:
            leads_created.append(lead)
            logger.info(f"[MATCH] Created lead #{lead.id} → supplier user #{profile.user_id} "
                        f"({profile.trade_name}) fit={lead.fit_score:.0f}%")

    requirement.matched_supplier_count = len(leads_created)
    requirement.enrichment_status = "matched"
    await db.flush()

    logger.info(f"[MATCH] Requirement #{requirement.id}: {len(leads_created)} leads created")
    return leads_created


async def _create_lead(
    supplier_profile: AgenticProfile,
    requirement_dict: dict,
    requirement: Requirement,
    db: AsyncSession,
) -> Lead | None:
    try:
        # Get supplier's profile markdown from UserConfig
        profile_md = ""
        config_result = await db.execute(
            select(UserConfig).where(UserConfig.user_id == supplier_profile.user_id)
        )
        user_config = config_result.scalar_one_or_none()
        if user_config and user_config.profile_md:
            profile_md = user_config.profile_md

        # Build location string
        location = None
        if supplier_profile.city and supplier_profile.state:
            location = f"{supplier_profile.city}, {supplier_profile.state}"
        elif supplier_profile.state:
            location = supplier_profile.state
        elif supplier_profile.city:
            location = supplier_profile.city

        # Calculate enhanced fit score using TF-IDF
        fit_score, match_reasons = calculate_enhanced_match_score(
            requirement=requirement_dict,
            profile_md=profile_md,
            location=location,
            categories=supplier_profile.product_categories,
            pricing_available=bool(supplier_profile.pricing_bands)
        )

        # Skip if score too low
        if fit_score < MINIMUM_FIT_SCORE:
            logger.info(f"[MATCH] Skipping supplier #{supplier_profile.user_id}: "
                       f"score {fit_score:.0f}% below threshold {MINIMUM_FIT_SCORE}%")
            return None

        # Check if lead already exists
        existing = await db.execute(
            select(Lead).where(
                Lead.requirement_id == requirement.id,
                Lead.supplier_id == supplier_profile.user_id,
            )
        )
        if existing.scalar_one_or_none():
            logger.info(f"[MATCH] Lead already exists for supplier #{supplier_profile.user_id}")
            return None

        lead = Lead(
            requirement_id=requirement.id,
            buyer_id=requirement.buyer_id,
            supplier_id=supplier_profile.user_id,
            fit_score=fit_score,
            match_reasons=match_reasons,
            status="new",
        )
        db.add(lead)
        await db.flush()
        return lead

    except Exception as e:
        logger.error(f"[MATCH] Error creating lead for supplier #{supplier_profile.user_id}: {e}")
        return None


def _calculate_basic_fit(requirement: dict, profile: AgenticProfile) -> float:
    """
    Fast rule-based fit score — no AI call needed.
    NOTE: All users can be BOTH buyers AND sellers simultaneously.
    """
    score = 50.0  # base — any registered user could potentially supply

    # Product category match (most important)
    cats = profile.product_categories or []
    product = (requirement.get("product") or "").lower()
    product_words = [w for w in product.split() if len(w) > 2]  # shorter words too

    if cats:
        for cat in cats:
            cat_lower = cat.lower()
            # Check if any word from product appears in category
            for word in product_words:
                if word in cat_lower:
                    score += 25  # Increased from 20
                    break
            if score > 50:  # Already got product match
                break

    # Location match
    location = (requirement.get("delivery_location") or "").lower()
    state = (profile.state or "").lower()
    city  = (profile.city or "").lower()

    # More lenient location matching
    if location and (state or city):
        if state and state in location:
            score += 15
        elif city and city in location:
            score += 15
        elif state and location in state:  # Reverse check
            score += 10
        elif city and location in city:  # Reverse check
            score += 10

    # Has pricing info (shows they're serious about selling)
    if profile.pricing_bands:
        score += 5

    # Has product categories (shows they have a catalog)
    if cats and len(cats) > 0:
        score += 5

    # Has location info (complete profile)
    if profile.state or profile.city:
        score += 5

    return min(score, 100.0)


def _requirement_to_dict(req: Requirement) -> dict:
    return {
        "product": req.product,
        "quantity": req.quantity,
        "quantity_unit": req.quantity_unit,
        "budget_min": req.budget_min,
        "budget_max": req.budget_max,
        "budget_unit": req.budget_unit,
        "specifications": req.specifications or {},
        "delivery_location": req.delivery_location,
        "delivery_days": req.delivery_days,
        "order_type": req.order_type,
    }


def _profile_to_dict(profile: AgenticProfile) -> dict:
    return {
        "trade_name": profile.trade_name,
        "product_categories": profile.product_categories or [],
        "capabilities": profile.capabilities or {},
        "pricing_bands": profile.pricing_bands or {},
        "serviceable_locations": profile.serviceable_locations or [],
        "state": profile.state,
        "city": profile.city,
        "reliability_score": profile.reliability_score,
    }
