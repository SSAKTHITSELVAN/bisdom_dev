"""
Rematch Service - Recalculates match scores when supplier profiles are updated.
Runs in background to avoid blocking profile update requests.

Uses HYBRID matching algorithm for better accuracy.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.models.lead import Lead
from app.models.user_config import UserConfig
from app.services.text_matching import calculate_enhanced_match_score, calculate_text_similarity, build_requirement_text, build_profile_text
from app.services.hybrid_matching import calculate_hybrid_match_score
import logging

logger = logging.getLogger(__name__)

MINIMUM_FIT_SCORE = 20.0  # Same threshold as matching_service


def _requirement_to_dict(req: Requirement) -> dict:
    """Convert Requirement model to dict for scoring."""
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


async def rematch_all_requirements_for_supplier(
    supplier_id: int,
    db: AsyncSession
) -> dict:
    """
    Recalculate match scores for all open requirements when a supplier updates their profile.

    This ensures that:
    - Existing leads get updated scores based on new profile data
    - New leads are created if the supplier now matches requirements they didn't before
    - Leads are removed if scores drop below threshold

    Args:
        supplier_id: User ID of the supplier who updated their profile
        db: Database session

    Returns:
        dict: Summary of rematching results
    """
    try:
        logger.info(f"[REMATCH] Starting rematch for supplier #{supplier_id}")

        # Get supplier profile and config
        supplier_profile = await db.get(AgenticProfile, supplier_id)
        if not supplier_profile:
            logger.warning(f"[REMATCH] Supplier #{supplier_id} has no profile")
            return {"error": "Supplier profile not found"}

        config_result = await db.execute(
            select(UserConfig).where(UserConfig.user_id == supplier_id)
        )
        user_config = config_result.scalar_one_or_none()
        profile_md = user_config.profile_md if user_config and user_config.profile_md else ""

        # Build location string
        location = None
        if supplier_profile.city and supplier_profile.state:
            location = f"{supplier_profile.city}, {supplier_profile.state}"
        elif supplier_profile.state:
            location = supplier_profile.state
        elif supplier_profile.city:
            location = supplier_profile.city

        # Get all open requirements (matched status means suppliers were found)
        result = await db.execute(
            select(Requirement).where(
                Requirement.enrichment_status.in_(["matched", "matching"]),
                Requirement.buyer_id != supplier_id  # Don't match own requirements
            )
        )
        requirements = result.scalars().all()

        if not requirements:
            logger.info(f"[REMATCH] No open requirements found")
            return {"message": "No open requirements to rematch", "requirements_checked": 0}

        logger.info(f"[REMATCH] Found {len(requirements)} open requirements to check")

        # Track changes
        stats = {
            "requirements_checked": len(requirements),
            "leads_updated": 0,
            "leads_created": 0,
            "leads_deleted": 0,
            "scores_improved": 0,
            "scores_decreased": 0,
        }

        for req in requirements:
            try:
                # Check if lead already exists
                lead_result = await db.execute(
                    select(Lead).where(
                        Lead.requirement_id == req.id,
                        Lead.supplier_id == supplier_id
                    )
                )
                existing_lead = lead_result.scalar_one_or_none()

                # Calculate new score with HYBRID algorithm
                req_dict = _requirement_to_dict(req)

                # First get TF-IDF score (for hybrid algorithm)
                req_text = build_requirement_text(req_dict)
                profile_text = build_profile_text(profile_md, location, supplier_profile.product_categories)
                tfidf_score = calculate_text_similarity(req_text, profile_text, use_tfidf=True)

                # Then use hybrid algorithm (combines product matching, keywords, price/MOQ, TF-IDF)
                fit_score, match_reasons = calculate_hybrid_match_score(
                    requirement=req_dict,
                    profile_json=user_config.profile_json if user_config else {},
                    location=location,
                    tfidf_score=tfidf_score
                )

                logger.info(f"[REMATCH] Req #{req.id}: calculated score = {fit_score:.1f}%")

                # Decision logic based on score
                if fit_score >= MINIMUM_FIT_SCORE:
                    if existing_lead:
                        # UPDATE existing lead with new score
                        old_score = existing_lead.fit_score
                        existing_lead.fit_score = fit_score
                        existing_lead.match_reasons = match_reasons

                        stats["leads_updated"] += 1
                        if fit_score > old_score:
                            stats["scores_improved"] += 1
                        elif fit_score < old_score:
                            stats["scores_decreased"] += 1

                        logger.info(f"[REMATCH] Updated lead #{existing_lead.id}: "
                                   f"{old_score:.0f}% → {fit_score:.0f}%")
                    else:
                        # CREATE new lead (supplier now matches this requirement)
                        new_lead = Lead(
                            requirement_id=req.id,
                            buyer_id=req.buyer_id,
                            supplier_id=supplier_id,
                            fit_score=fit_score,
                            match_reasons=match_reasons,
                            status="new"
                        )
                        db.add(new_lead)
                        stats["leads_created"] += 1

                        logger.info(f"[REMATCH] Created new lead for req #{req.id}: "
                                   f"score={fit_score:.0f}%")

                        # Optionally trigger AI conversation for new lead
                        # (Commented out to avoid overwhelming buyers with new conversations)
                        # await _maybe_initiate_conversation(new_lead.id)

                else:
                    # Score below threshold
                    if existing_lead and existing_lead.status == "new":
                        # DELETE lead if it was new (not yet in negotiation)
                        # Don't delete if already in conversation
                        old_score = existing_lead.fit_score
                        await db.delete(existing_lead)
                        stats["leads_deleted"] += 1

                        logger.info(f"[REMATCH] Deleted lead #{existing_lead.id}: "
                                   f"score dropped {old_score:.0f}% → {fit_score:.0f}%")
                    elif existing_lead:
                        # Just update score but keep lead (might be in active negotiation)
                        old_score = existing_lead.fit_score
                        existing_lead.fit_score = fit_score
                        existing_lead.match_reasons = match_reasons
                        stats["leads_updated"] += 1
                        stats["scores_decreased"] += 1

                        logger.warning(f"[REMATCH] Lead #{existing_lead.id} score below threshold "
                                     f"but keeping (status={existing_lead.status}): "
                                     f"{old_score:.0f}% → {fit_score:.0f}%")

            except Exception as e:
                logger.error(f"[REMATCH] Error processing requirement #{req.id}: {e}")
                import traceback
                traceback.print_exc()
                continue

        # Commit all changes
        await db.commit()

        logger.info(f"[REMATCH] Completed for supplier #{supplier_id}: "
                   f"{stats['leads_updated']} updated, "
                   f"{stats['leads_created']} created, "
                   f"{stats['leads_deleted']} deleted")

        return stats

    except Exception as e:
        logger.error(f"[REMATCH] Fatal error for supplier #{supplier_id}: {e}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        return {"error": str(e)}


async def rematch_single_requirement(
    requirement_id: int,
    db: AsyncSession
) -> dict:
    """
    Recalculate match scores for a single requirement against all suppliers.
    Useful for admin manual rematching.

    Args:
        requirement_id: ID of requirement to rematch
        db: Database session

    Returns:
        dict: Summary of rematching results
    """
    try:
        # Import here to avoid circular dependency
        from app.services.matching_service import match_requirement_to_suppliers

        logger.info(f"[REMATCH] Starting rematch for requirement #{requirement_id}")

        req_result = await db.execute(
            select(Requirement).where(Requirement.id == requirement_id)
        )
        requirement = req_result.scalar_one_or_none()

        if not requirement:
            logger.error(f"[REMATCH] Requirement #{requirement_id} not found")
            return {"error": "Requirement not found"}

        # Run full matching (this creates/updates leads)
        leads = await match_requirement_to_suppliers(requirement, db)
        await db.commit()

        logger.info(f"[REMATCH] Completed for requirement #{requirement_id}: "
                   f"{len(leads)} leads created/updated")

        return {
            "requirement_id": requirement_id,
            "leads_processed": len(leads),
            "message": "Rematching completed successfully"
        }

    except Exception as e:
        logger.error(f"[REMATCH] Error for requirement #{requirement_id}: {e}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        return {"error": str(e)}
