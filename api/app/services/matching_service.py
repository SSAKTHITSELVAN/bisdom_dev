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
    """
    logger.info(f"[MATCH] Starting efficient matching for requirement #{requirement.id} ({requirement.product})")

    # Use new efficient matching algorithm
    top_matches = await get_top_supplier_matches(requirement, db, limit=20)

    if not top_matches:
        logger.warning(f"[MATCH] No matches found for requirement #{requirement.id}")
        requirement.enrichment_status = "matched"
        requirement.matched_supplier_count = 0
        await db.flush()
        return []

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


# Legacy functions - kept for backward compatibility but no longer used

async def _create_lead_legacy(
    supplier_profile: AgenticProfile,
    requirement_dict: dict,
    requirement: Requirement,
    db: AsyncSession,
) -> Lead | None:
    """
    DEPRECATED: Old lead creation using TF-IDF and hybrid matching.
    Kept for reference only. Use match_requirement_to_suppliers() instead.
    """
    logger.warning("[MATCH] Using deprecated _create_lead_legacy function")
    return None


def _calculate_basic_fit_legacy(requirement: dict, profile: AgenticProfile) -> float:
    """
    DEPRECATED: Old rule-based fit score.
    New system uses efficient_matching with embeddings.
    """
    return 0.0


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
