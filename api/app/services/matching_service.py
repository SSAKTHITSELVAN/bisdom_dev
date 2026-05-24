"""
Matching Service — matches confirmed buyer requirements against supplier profiles.
Creates Lead records for each match, then initiates agent conversations.
Uses EFFICIENT matching algorithm with embeddings and hard filtering (70x-140x faster).
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.models.lead import Lead
from app.models.user_config import UserConfig
from app.services.efficient_matching import get_top_supplier_matches
import asyncio
import logging

logger = logging.getLogger(__name__)

MINIMUM_FIT_SCORE = 15.0  # Reduced threshold as requested (was 20.0)


async def match_requirement_to_suppliers(
    requirement: Requirement,
    db: AsyncSession,
) -> List[Lead]:
    """
    Find all supplier profiles that match this requirement using efficient matching.
    Creates Lead records for all matches above threshold (15%).

    NEW: Uses efficient_matching algorithm with:
    - Hard SQL filtering (product type, material, budget, MOQ)
    - Semantic embeddings (MiniLM)
    - Weighted scoring (semantic 35%, material 25%, gsm 15%, price 10%, size 10%, cert 5%)

    FALLBACK: If no preprocessed products exist, falls back to old matching.
    """
    logger.info(f"[MATCH] Starting efficient matching for requirement #{requirement.id} ({requirement.product})")

    # Check if supplier_products table has data
    from app.models.supplier_product import SupplierProduct
    from sqlalchemy import func

    count_result = await db.execute(select(func.count(SupplierProduct.id)))
    product_count = count_result.scalar()

    if product_count == 0:
        logger.warning(f"[MATCH] No preprocessed products found, falling back to old matching algorithm")
        # Fall back to old matching using profile_md
        return await _match_using_legacy_algorithm(requirement, db)

    # Use new efficient matching algorithm
    top_matches = await get_top_supplier_matches(requirement, db, limit=20)

    if not top_matches:
        logger.warning(f"[MATCH] No matches found with new algorithm for requirement #{requirement.id}")
        logger.info(f"[MATCH] Trying fallback to legacy matching...")
        return await _match_using_legacy_algorithm(requirement, db)

    logger.info(f"[MATCH] Found {len(top_matches)} supplier matches above {MINIMUM_FIT_SCORE}% threshold")

    # Create Lead records for each match
    leads_created = []

    for match in top_matches:
        try:
            # Check if lead already exists
            existing = await db.execute(
                select(Lead).where(
                    Lead.requirement_id == requirement.id,
                    Lead.supplier_id == match["supplier_id"],
                )
            )
            if existing.scalar_one_or_none():
                logger.info(f"[MATCH] Lead already exists for supplier #{match['supplier_id']}")
                continue

            # Create lead
            lead = Lead(
                requirement_id=requirement.id,
                buyer_id=requirement.buyer_id,
                supplier_id=match["supplier_id"],
                fit_score=match["match_score"],
                match_reasons=match["match_reasons"],
                status="new",
            )
            db.add(lead)
            await db.flush()

            leads_created.append(lead)

            logger.info(f"[MATCH] Created lead #{lead.id} → supplier #{match['supplier_id']} "
                       f"(product: {match['product_name']}) fit={match['match_score']:.1f}%")

        except Exception as e:
            logger.error(f"[MATCH] Error creating lead for supplier #{match['supplier_id']}: {e}")
            continue

    requirement.matched_supplier_count = len(leads_created)
    requirement.enrichment_status = "matched"
    await db.flush()

    logger.info(f"[MATCH] Requirement #{requirement.id}: {len(leads_created)} leads created")
    return leads_created


# Fallback to legacy matching if no preprocessed products

async def _match_using_legacy_algorithm(requirement: Requirement, db: AsyncSession) -> List[Lead]:
    """
    Fallback matching using old TF-IDF and hybrid algorithm.
    Used when supplier_products table is empty or new algorithm finds no matches.
    """
    from app.services.text_matching import calculate_text_similarity, build_requirement_text, build_profile_text
    from app.services.hybrid_matching import calculate_hybrid_match_score

    logger.info("[MATCH-LEGACY] Using legacy TF-IDF matching algorithm")

    # Fetch ALL profiles except the buyer
    result = await db.execute(
        select(AgenticProfile).where(
            AgenticProfile.user_id != requirement.buyer_id,
        )
    )
    supplier_profiles = result.scalars().all()

    logger.info(f"[MATCH-LEGACY] Found {len(supplier_profiles)} potential suppliers")

    if not supplier_profiles:
        requirement.enrichment_status = "matched"
        requirement.matched_supplier_count = 0
        await db.flush()
        return []

    req_dict = _requirement_to_dict(requirement)
    leads_created = []

    for profile in supplier_profiles:
        try:
            # Get supplier's profile markdown
            config_result = await db.execute(
                select(UserConfig).where(UserConfig.user_id == profile.user_id)
            )
            user_config = config_result.scalar_one_or_none()
            profile_md = user_config.profile_md if user_config else ""

            if not profile_md:
                continue

            # Build location string
            location = None
            if profile.city and profile.state:
                location = f"{profile.city}, {profile.state}"
            elif profile.state:
                location = profile.state
            elif profile.city:
                location = profile.city

            # Calculate fit score using hybrid algorithm
            req_text = build_requirement_text(req_dict)
            profile_text = build_profile_text(profile_md, location, profile.product_categories)
            tfidf_score = calculate_text_similarity(req_text, profile_text, use_tfidf=True)

            fit_score, match_reasons = calculate_hybrid_match_score(
                requirement=req_dict,
                profile_json=user_config.profile_json if user_config else {},
                location=location,
                tfidf_score=tfidf_score
            )

            # Skip if score too low
            if fit_score < MINIMUM_FIT_SCORE:
                continue

            # Check if lead already exists
            existing = await db.execute(
                select(Lead).where(
                    Lead.requirement_id == requirement.id,
                    Lead.supplier_id == profile.user_id,
                )
            )
            if existing.scalar_one_or_none():
                continue

            # Create lead
            lead = Lead(
                requirement_id=requirement.id,
                buyer_id=requirement.buyer_id,
                supplier_id=profile.user_id,
                fit_score=fit_score,
                match_reasons=match_reasons,
                status="new",
            )
            db.add(lead)
            await db.flush()

            leads_created.append(lead)

            logger.info(f"[MATCH-LEGACY] Created lead #{lead.id} → supplier #{profile.user_id} "
                       f"({profile.trade_name}) fit={fit_score:.1f}%")

        except Exception as e:
            logger.error(f"[MATCH-LEGACY] Error creating lead for supplier #{profile.user_id}: {e}")
            continue

    requirement.matched_supplier_count = len(leads_created)
    requirement.enrichment_status = "matched"
    await db.flush()

    logger.info(f"[MATCH-LEGACY] Requirement #{requirement.id}: {len(leads_created)} leads created")
    return leads_created


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
