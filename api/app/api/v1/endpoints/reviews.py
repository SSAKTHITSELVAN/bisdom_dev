"""Reviews & Ratings endpoints — post-deal feedback."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.deal import Deal
from app.models.lead import Lead
from app.models.review import Review
from app.models.profile import AgenticProfile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reviews", tags=["Reviews"])


class SubmitReviewRequest(BaseModel):
    deal_id: int
    rating: int = Field(ge=1, le=5)
    review_text: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    rating: int
    review_text: Optional[str]
    product: Optional[str]
    deal_value: Optional[float]
    reviewer_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/submit")
async def submit_review(
    request: SubmitReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a rating and review after deal closure."""
    # Get the deal
    deal_result = await db.execute(
        select(Deal).where(Deal.id == request.deal_id)
    )
    deal = deal_result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Verify user is part of this deal
    if current_user.id not in (deal.buyer_id, deal.supplier_id):
        raise HTTPException(status_code=403, detail="Not part of this deal")

    # Determine who is being reviewed
    reviewed_user_id = deal.supplier_id if current_user.id == deal.buyer_id else deal.buyer_id

    # Check if already reviewed
    existing = await db.execute(
        select(Review).where(
            Review.deal_id == request.deal_id,
            Review.reviewer_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already reviewed this deal")

    # Create review
    review = Review(
        deal_id=request.deal_id,
        reviewer_id=current_user.id,
        reviewed_user_id=reviewed_user_id,
        rating=request.rating,
        review_text=request.review_text,
        product=deal.product,
        deal_value=deal.total_value,
    )
    db.add(review)

    # Update deal rating fields
    if current_user.id == deal.buyer_id:
        deal.buyer_rating = request.rating
        deal.buyer_rated_at = datetime.utcnow()
    else:
        deal.supplier_rating = request.rating
        deal.supplier_rated_at = datetime.utcnow()

    # Update reviewed user's reliability score (average of all ratings received)
    all_ratings = await db.execute(
        select(func.avg(Review.rating)).where(
            Review.reviewed_user_id == reviewed_user_id
        )
    )
    avg_rating = all_ratings.scalar()
    if avg_rating:
        # Scale 1-5 star rating to 0-100 reliability score
        new_score = int((avg_rating / 5.0) * 100)
        profile_result = await db.execute(
            select(AgenticProfile).where(AgenticProfile.user_id == reviewed_user_id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            profile.reliability_score = new_score

    await db.commit()
    logger.info(f"[REVIEW] User #{current_user.id} reviewed user #{reviewed_user_id} for deal #{deal.id}: {request.rating}/5")

    return {"success": True, "message": "Review submitted"}


@router.get("/deal/{deal_id}")
async def get_deal_review_status(
    deal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if current user has reviewed this deal."""
    existing = await db.execute(
        select(Review).where(
            Review.deal_id == deal_id,
            Review.reviewer_id == current_user.id,
        )
    )
    review = existing.scalar_one_or_none()
    return {
        "has_reviewed": review is not None,
        "rating": review.rating if review else None,
        "review_text": review.review_text if review else None,
    }


@router.get("/user/{user_id}")
async def get_user_reviews(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all reviews for a user (public — visible to anyone in a deal with them)."""
    # Get reviews with reviewer info
    result = await db.execute(
        select(Review).where(
            Review.reviewed_user_id == user_id
        ).order_by(Review.created_at.desc())
    )
    reviews = result.scalars().all()

    # Get reviewer names
    review_list = []
    for r in reviews:
        reviewer_profile = await db.execute(
            select(AgenticProfile).where(AgenticProfile.user_id == r.reviewer_id)
        )
        profile = reviewer_profile.scalar_one_or_none()
        review_list.append({
            "id": r.id,
            "rating": r.rating,
            "review_text": r.review_text,
            "product": r.product,
            "deal_value": r.deal_value,
            "reviewer_name": profile.trade_name if profile else "Anonymous",
            "created_at": r.created_at.isoformat(),
        })

    # Compute average
    avg_rating = sum(r["rating"] for r in review_list) / len(review_list) if review_list else 0

    return {
        "reviews": review_list,
        "total_reviews": len(review_list),
        "average_rating": round(avg_rating, 1),
    }


@router.get("/for-lead/{lead_id}")
async def get_review_context_for_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get deal_id and review status for a lead (used by frontend after deal_closed)."""
    # Get the lead
    lead_result = await db.execute(
        select(Lead).where(
            Lead.id == lead_id,
            or_(Lead.buyer_id == current_user.id, Lead.supplier_id == current_user.id),
        )
    )
    lead = lead_result.scalar_one_or_none()
    if not lead or lead.status != "deal_closed":
        return {"deal_id": None, "has_reviewed": False}

    # Get the deal
    deal_result = await db.execute(
        select(Deal).where(Deal.lead_id == lead_id)
    )
    deal = deal_result.scalar_one_or_none()
    if not deal:
        return {"deal_id": None, "has_reviewed": False}

    # Check existing review
    existing = await db.execute(
        select(Review).where(
            Review.deal_id == deal.id,
            Review.reviewer_id == current_user.id,
        )
    )
    review = existing.scalar_one_or_none()

    return {
        "deal_id": deal.id,
        "has_reviewed": review is not None,
        "my_rating": review.rating if review else None,
    }
