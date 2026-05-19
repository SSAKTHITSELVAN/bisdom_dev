"""
Admin endpoint — overview of all posts, buyers, sellers, matches.
Time-based password authentication: Current time in HHMM format (e.g., 1430 for 14:30).
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc
from app.db.base import get_db
from app.models.user import User
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.models.lead import Lead
from app.models.conversation import Conversation, Message
from app.models.deal import Deal
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


ADMIN_PASSWORD = "elon.1"  # Static admin password
SESSION_EXPIRY_HOURS = 24  # 1 day session

# Store admin sessions: {token: expiry_time}
admin_sessions = {}


def verify_admin_password(password: str) -> bool:
    """Verify static admin password"""
    return password == ADMIN_PASSWORD


def create_admin_token(password: str) -> str:
    """Create admin session token with 24-hour expiry"""
    import hashlib
    import time

    # Create token from password + timestamp
    token_string = f"{password}_{time.time()}"
    token = hashlib.sha256(token_string.encode()).hexdigest()[:32]

    # Store with expiry time
    expiry = datetime.now() + timedelta(hours=SESSION_EXPIRY_HOURS)
    admin_sessions[token] = expiry

    return token


def verify_admin_token(token: str) -> bool:
    """Verify admin token and check if not expired"""
    if token not in admin_sessions:
        return False

    expiry = admin_sessions[token]
    if datetime.now() > expiry:
        # Token expired, remove it
        del admin_sessions[token]
        return False

    return True


def get_admin_token(authorization: str = Header(None)) -> str:
    """Extract and verify admin token from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Admin authorization required")

    # Expect format: "Bearer <token>"
    token = authorization.replace("Bearer ", "").strip()

    if not verify_admin_token(token):
        raise HTTPException(status_code=403, detail="Invalid or expired admin token")

    return token


@router.post("/login")
async def admin_login(password: str):
    """
    Admin login with static password.
    Password: elon.1
    Session valid for 24 hours.
    """
    if not verify_admin_password(password):
        raise HTTPException(status_code=403, detail="Invalid admin password")

    # Create session token
    token = create_admin_token(password)

    return {
        "success": True,
        "message": "Admin access granted",
        "token": token,
        "expiresIn": SESSION_EXPIRY_HOURS * 3600,  # seconds
    }


@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """
    Get dashboard statistics.
    Note: In peer-to-peer model, users can be both buyers AND suppliers,
    so counts will overlap.
    """

    # Total users (registered accounts)
    users_result = await db.execute(select(func.count(User.id)))
    total_users = users_result.scalar() or 0

    # Users with complete profiles
    profiles_result = await db.execute(
        select(func.count(AgenticProfile.id)).where(
            AgenticProfile.profile_build_status == "complete"
        )
    )
    total_profiles = profiles_result.scalar() or 0

    # Users who have posted requirements (acted as buyers)
    users_with_reqs = await db.execute(
        select(func.count(func.distinct(Requirement.buyer_id)))
    )
    users_posted_requirements = users_with_reqs.scalar() or 0

    # Users who have received leads (acted as suppliers)
    users_with_leads = await db.execute(
        select(func.count(func.distinct(Lead.supplier_id)))
    )
    users_received_leads = users_with_leads.scalar() or 0

    # Total requirements
    req_result = await db.execute(select(func.count(Requirement.id)))
    total_requirements = req_result.scalar() or 0

    # Active requirements
    active_req_result = await db.execute(
        select(func.count(Requirement.id)).where(Requirement.is_active == True)
    )
    active_requirements = active_req_result.scalar() or 0

    # Total leads (potential matches)
    leads_result = await db.execute(select(func.count(Lead.id)))
    total_leads = leads_result.scalar() or 0

    # Active negotiations
    negotiating_leads = await db.execute(
        select(func.count(Lead.id)).where(Lead.status == "negotiating")
    )
    active_negotiations = negotiating_leads.scalar() or 0

    # Completed deals
    completed_deals = await db.execute(
        select(func.count(Lead.id)).where(Lead.status == "deal_confirmed")
    )
    total_deals = completed_deals.scalar() or 0

    # Recent requirements (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_req = await db.execute(
        select(func.count(Requirement.id)).where(Requirement.created_at >= week_ago)
    )
    recent_requirements = recent_req.scalar() or 0

    return {
        "total_users": total_users,
        "users_with_profiles": total_profiles,
        "users_posted_requirements": users_posted_requirements,
        "users_received_leads": users_received_leads,
        "total_requirements": total_requirements,
        "active_requirements": active_requirements,
        "total_leads": total_leads,
        "active_negotiations": active_negotiations,
        "total_deals": total_deals,
        "recent_requirements": recent_requirements,
    }


@router.get("/growth-data")
async def get_growth_data(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """
    Get time-series data for user growth and requirement posting over time.
    Returns daily counts for the last 30 days.
    """
    from sqlalchemy import func, cast, Date

    # Get date 30 days ago
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    # User growth over time (cumulative)
    users_result = await db.execute(
        select(
            cast(User.created_at, Date).label('date'),
            func.count(User.id).label('count')
        )
        .where(User.created_at >= thirty_days_ago)
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
    )
    user_daily_counts = users_result.all()

    # Requirement posting over time (daily counts)
    reqs_result = await db.execute(
        select(
            cast(Requirement.created_at, Date).label('date'),
            func.count(Requirement.id).label('count')
        )
        .where(Requirement.created_at >= thirty_days_ago)
        .group_by(cast(Requirement.created_at, Date))
        .order_by(cast(Requirement.created_at, Date))
    )
    req_daily_counts = reqs_result.all()

    # Build daily data structure with all 30 days (fill gaps with 0)
    users_by_date = {row.date.isoformat(): row.count for row in user_daily_counts}
    reqs_by_date = {row.date.isoformat(): row.count for row in req_daily_counts}

    # Generate all dates for last 30 days
    dates = []
    user_counts = []
    req_counts = []
    cumulative_users = 0

    for i in range(30):
        date = (datetime.utcnow() - timedelta(days=29-i)).date()
        date_str = date.isoformat()

        # User growth (cumulative)
        daily_users = users_by_date.get(date_str, 0)
        cumulative_users += daily_users

        # Requirement posting (daily)
        daily_reqs = reqs_by_date.get(date_str, 0)

        dates.append(date_str)
        user_counts.append(cumulative_users)
        req_counts.append(daily_reqs)

    return {
        "dates": dates,
        "user_growth": user_counts,
        "requirements_posted": req_counts,
    }


@router.get("/overview")
async def admin_overview(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """Full system overview — users, posts, matches, deals."""

    # Users
    users_result = await db.execute(select(User))
    users = users_result.scalars().all()

    # Profiles
    profiles_result = await db.execute(select(AgenticProfile))
    profiles = profiles_result.scalars().all()

    # Requirements
    reqs_result = await db.execute(select(Requirement).order_by(Requirement.created_at.desc()))
    reqs = reqs_result.scalars().all()

    # Leads
    leads_result = await db.execute(select(Lead).order_by(Lead.created_at.desc()))
    leads = leads_result.scalars().all()

    # Deals
    deals_result = await db.execute(select(Deal).order_by(Deal.confirmed_at.desc()))
    deals = deals_result.scalars().all()

    # Build profile map
    profile_map = {p.user_id: p for p in profiles}

    return {
        "summary": {
            "total_users": len(users),
            "total_profiles": len(profiles),
            "buyers": sum(1 for p in profiles if p.is_buyer),
            "suppliers": sum(1 for p in profiles if p.is_supplier),
            "total_requirements": len(reqs),
            "active_requirements": sum(1 for r in reqs if r.is_active and r.enrichment_status not in ("closed",)),
            "confirmed_requirements": sum(1 for r in reqs if r.enrichment_status in ("matched", "confirmed", "matching")),
            "total_leads": len(leads),
            "active_leads": sum(1 for l in leads if l.status in ("agent_initiated", "negotiating", "renegotiating")),
            "deals_closed": sum(1 for l in leads if l.status == "deal_closed"),
            "total_deals": len(deals),
        },

        "users": [
            {
                "id": u.id,
                "phone": u.phone,
                "is_onboarded": u.is_onboarded,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "profile": {
                    "trade_name": profile_map[u.id].trade_name if u.id in profile_map else None,
                    "is_buyer": profile_map[u.id].is_buyer if u.id in profile_map else None,
                    "is_supplier": profile_map[u.id].is_supplier if u.id in profile_map else None,
                    "profile_build_status": profile_map[u.id].profile_build_status if u.id in profile_map else None,
                    "gstin": profile_map[u.id].gstin if u.id in profile_map else None,
                    "state": profile_map[u.id].state if u.id in profile_map else None,
                    "product_categories": profile_map[u.id].product_categories if u.id in profile_map else None,
                } if u.id in profile_map else None,
            }
            for u in users
        ],

        "requirements": [
            {
                "id": r.id,
                "buyer_id": r.buyer_id,
                "buyer_name": profile_map.get(r.buyer_id, {}).trade_name if r.buyer_id in profile_map else f"User #{r.buyer_id}",
                "product": r.product,
                "quantity": r.quantity,
                "quantity_unit": r.quantity_unit,
                "budget_max": r.budget_max,
                "delivery_location": r.delivery_location,
                "enrichment_status": r.enrichment_status,
                "matched_supplier_count": r.matched_supplier_count,
                "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "confirmed_at": r.confirmed_at.isoformat() if r.confirmed_at else None,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            }
            for r in reqs
        ],

        "leads": [
            {
                "id": l.id,
                "requirement_id": l.requirement_id,
                "buyer_id": l.buyer_id,
                "supplier_id": l.supplier_id,
                "buyer_name": profile_map.get(l.buyer_id, AgenticProfile()).trade_name if l.buyer_id in profile_map else f"User #{l.buyer_id}",
                "supplier_name": profile_map.get(l.supplier_id, AgenticProfile()).trade_name if l.supplier_id in profile_map else f"User #{l.supplier_id}",
                "fit_score": l.fit_score,
                "status": l.status,
                "current_offer_price": l.current_offer_price,
                "negotiation_round": l.negotiation_round,
                "ai_paused_for_buyer": l.ai_paused_for_buyer,
                "ai_paused_for_supplier": l.ai_paused_for_supplier,
                "created_at": l.created_at.isoformat() if l.created_at else None,
                "match_reasons": l.match_reasons,
            }
            for l in leads
        ],

        "deals": [
            {
                "id": d.id,
                "lead_id": d.lead_id,
                "buyer_name": profile_map.get(d.buyer_id, AgenticProfile()).trade_name if d.buyer_id in profile_map else f"User #{d.buyer_id}",
                "supplier_name": profile_map.get(d.supplier_id, AgenticProfile()).trade_name if d.supplier_id in profile_map else f"User #{d.supplier_id}",
                "product": d.product,
                "quantity": d.quantity,
                "final_price_per_unit": d.final_price_per_unit,
                "total_value": d.total_value,
                "status": d.status,
                "confirmed_at": d.confirmed_at.isoformat() if d.confirmed_at else None,
            }
            for d in deals
        ],

        "matching_debug": {
            "profiles_with_is_supplier_true": sum(1 for p in profiles if p.is_supplier),
            "profiles_with_status_complete": sum(1 for p in profiles if p.profile_build_status == "complete"),
            "profiles_eligible_for_matching": sum(1 for p in profiles if p.is_supplier and p.profile_build_status == "complete"),
            "warning": "If 0 eligible profiles → no leads will ever be created. Fix: set is_supplier=True and profile_build_status=complete" if sum(1 for p in profiles if p.is_supplier and p.profile_build_status == "complete") == 0 else "OK",
        }
    }


@router.post("/fix-profiles")
async def fix_profiles(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """
    Dev utility — marks all onboarded profiles as both buyer+supplier
    and sets profile_build_status=complete so matching works.
    USE ONLY IN DEVELOPMENT.
    """
    result = await db.execute(select(AgenticProfile))
    profiles = result.scalars().all()

    fixed = []
    for p in profiles:
        changed = False
        if not p.is_supplier:
            p.is_supplier = True
            changed = True
        if p.profile_build_status != "complete":
            p.profile_build_status = "complete"
            changed = True
        if changed:
            fixed.append(p.user_id)

    await db.flush()
    return {
        "fixed": fixed,
        "message": f"Set is_supplier=True and profile_build_status=complete for {len(fixed)} profiles"
    }


@router.get("/conversations/{lead_id}")
async def get_lead_conversation(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """See full conversation for any lead."""
    conv_result = await db.execute(
        select(Conversation).where(Conversation.lead_id == lead_id)
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        return {"error": "No conversation found", "lead_id": lead_id}

    msg_result = await db.execute(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    return {
        "lead_id": lead_id,
        "conversation_id": conv.id,
        "mode": conv.mode,
        "message_count": len(messages),
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    }


@router.post("/rematch/{requirement_id}")
async def rematch_requirement(
    requirement_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """
    Manually re-run matching for a requirement.
    Use this for requirements that were never matched or need rematching.
    Returns debug info about why matches were or weren't created.
    """
    from app.models.requirement import Requirement
    from app.services.matching_service import match_requirement_to_suppliers
    from app.models.user_config import UserConfig

    try:
        req_result = await db.execute(
            select(Requirement).where(Requirement.id == requirement_id)
        )
        req = req_result.scalar_one_or_none()
        if not req:
            return {"error": f"Requirement #{requirement_id} not found"}

        # Get candidate profiles BEFORE matching to debug
        candidate_profiles_result = await db.execute(
            select(AgenticProfile).where(
                AgenticProfile.user_id != req.buyer_id,
            )
        )
        candidate_profiles = candidate_profiles_result.scalars().all()

        # Check profile_md for each candidate
        debug_info = []
        for profile in candidate_profiles[:5]:  # Check first 5
            config_result = await db.execute(
                select(UserConfig).where(UserConfig.user_id == profile.user_id)
            )
            user_config = config_result.scalar_one_or_none()
            profile_md_length = len(user_config.profile_md) if user_config and user_config.profile_md else 0
            debug_info.append({
                "user_id": profile.user_id,
                "trade_name": profile.trade_name,
                "profile_md_length": profile_md_length,
                "categories": profile.product_categories,
                "location": f"{profile.city}, {profile.state}" if profile.city else None
            })

        # Run matching
        logger.info(f"[ADMIN] Manually triggering match for requirement #{requirement_id}")
        leads = await match_requirement_to_suppliers(req, db)
        await db.commit()

        # Try to initiate agent conversations (optional - won't fail if this errors)
        initiated = []
        try:
            from app.api.v1.endpoints.requirements import _initiate_agent_conversation
            for lead in leads:
                try:
                    await _initiate_agent_conversation(lead.id)
                    initiated.append(lead.id)
                except Exception as e:
                    logger.warning(f"[ADMIN] Could not initiate conversation for lead {lead.id}: {e}")
        except Exception as e:
            logger.warning(f"[ADMIN] Agent initiation not available: {e}")

        return {
            "success": True,
            "requirement_id": requirement_id,
            "product": req.product,
            "buyer_id": req.buyer_id,
            "delivery_location": req.delivery_location,
            "candidates_found": len(candidate_profiles),
            "leads_created": len(leads),
            "conversations_initiated": len(initiated),
            "lead_ids": [l.id for l in leads],
            "debug_sample_profiles": debug_info,
        }
    except Exception as e:
        logger.error(f"[ADMIN] Error in rematch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Rematch failed: {str(e)}")


@router.post("/recalculate-scores")
async def recalculate_all_scores(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """
    Recalculate match scores for ALL existing leads using new TF-IDF algorithm.
    This updates old leads (with 0% scores) to use the new matching algorithm.
    """
    from app.services.text_matching import calculate_enhanced_match_score
    from app.models.requirement import Requirement
    from app.models.user_config import UserConfig

    # Get all leads
    leads_result = await db.execute(select(Lead))
    leads = leads_result.scalars().all()

    updated_count = 0
    errors = []

    for lead in leads:
        try:
            # Get requirement
            req_result = await db.execute(
                select(Requirement).where(Requirement.id == lead.requirement_id)
            )
            requirement = req_result.scalar_one_or_none()
            if not requirement:
                continue

            # Get supplier profile
            profile_result = await db.execute(
                select(AgenticProfile).where(AgenticProfile.user_id == lead.supplier_id)
            )
            profile = profile_result.scalar_one_or_none()
            if not profile:
                continue

            # Get supplier's profile markdown
            config_result = await db.execute(
                select(UserConfig).where(UserConfig.user_id == lead.supplier_id)
            )
            user_config = config_result.scalar_one_or_none()
            profile_md = user_config.profile_md if user_config else ""

            # Build location
            location = None
            if profile.city and profile.state:
                location = f"{profile.city}, {profile.state}"
            elif profile.state:
                location = profile.state
            elif profile.city:
                location = profile.city

            # Build requirement dict
            req_dict = {
                "product": requirement.product,
                "quantity": requirement.quantity,
                "quantity_unit": requirement.quantity_unit,
                "specifications": requirement.specifications or {},
                "delivery_location": requirement.delivery_location,
                "budget_max": requirement.budget_max,
            }

            # Recalculate score with TF-IDF
            new_score, new_reasons = calculate_enhanced_match_score(
                requirement=req_dict,
                profile_md=profile_md,
                location=location,
                categories=profile.product_categories,
                pricing_available=bool(profile.pricing_bands)
            )

            # Update lead
            lead.fit_score = new_score
            lead.match_reasons = new_reasons
            updated_count += 1

        except Exception as e:
            errors.append(f"Lead {lead.id}: {str(e)}")
            logger.error(f"Error recalculating score for lead {lead.id}: {e}")

    await db.commit()

    return {
        "success": True,
        "total_leads": len(leads),
        "updated": updated_count,
        "errors": errors[:10],  # Show first 10 errors if any
        "message": f"Recalculated scores for {updated_count} leads using TF-IDF algorithm"
    }


@router.get("/profiles")
async def list_profiles(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """See all profiles with their matching eligibility."""
    result = await db.execute(select(AgenticProfile))
    profiles = result.scalars().all()

    return [
        {
            "user_id": p.user_id,
            "trade_name": p.trade_name,
            "gstin": p.gstin,
            "is_buyer": p.is_buyer,
            "is_supplier": p.is_supplier,
            "profile_build_status": p.profile_build_status,
            "product_categories": p.product_categories,
            "state": p.state,
            "city": p.city,
            "reliability_score": p.reliability_score,
        }
        for p in profiles
    ]


@router.get("/requirements")
async def list_all_requirements(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
):
    """List all requirements with buyer info"""

    query = select(Requirement, User).join(User, Requirement.buyer_id == User.id)

    if status:
        query = query.where(Requirement.enrichment_status == status)

    query = query.order_by(desc(Requirement.created_at)).offset(skip).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    output = []
    for req, buyer in rows:
        # Get lead count
        leads_count_result = await db.execute(
            select(func.count(Lead.id)).where(Lead.requirement_id == req.id)
        )
        leads_count = leads_count_result.scalar() or 0

        output.append({
            "id": req.id,
            "product": req.product,
            "quantity": req.quantity,
            "quantity_unit": req.quantity_unit,
            "budget_max": req.budget_max,
            "budget_unit": req.budget_unit,
            "delivery_location": req.delivery_location,
            "enrichment_status": req.enrichment_status,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "confirmed_at": req.confirmed_at.isoformat() if req.confirmed_at else None,
            "buyer_phone": buyer.phone if buyer else None,
            "buyer_id": req.buyer_id,
            "leads_count": leads_count,
            "specifications": req.specifications,
        })

    return {"requirements": output, "total": len(output)}


@router.get("/requirements/{requirement_id}/matches")
async def get_requirement_matches(
    requirement_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """
    Get all potential matches for a requirement.
    Shows ALL suppliers with calculated scores, not just those above threshold.
    This allows admin to verify matching algorithm and see why suppliers were/weren't matched.
    """
    from app.services.text_matching import calculate_enhanced_match_score
    from app.models.user_config import UserConfig

    try:
        # Get requirement
        req_result = await db.execute(
            select(Requirement).where(Requirement.id == requirement_id)
        )
        requirement = req_result.scalar_one_or_none()
        if not requirement:
            raise HTTPException(status_code=404, detail="Requirement not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching requirement {requirement_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # Build requirement dict
    req_dict = {
        "product": requirement.product,
        "quantity": requirement.quantity,
        "quantity_unit": requirement.quantity_unit,
        "specifications": requirement.specifications or {},
        "delivery_location": requirement.delivery_location,
        "budget_max": requirement.budget_max,
    }

    # Get ALL profiles (except the buyer)
    profiles_result = await db.execute(
        select(AgenticProfile).where(
            AgenticProfile.user_id != requirement.buyer_id
        )
    )
    all_profiles = profiles_result.scalars().all()

    # Get existing leads to merge with calculated scores
    existing_leads_result = await db.execute(
        select(Lead).where(Lead.requirement_id == requirement_id)
    )
    existing_leads = {lead.supplier_id: lead for lead in existing_leads_result.scalars().all()}

    # Calculate scores for ALL suppliers
    matches = []
    for profile in all_profiles:
        # Get user info
        user_result = await db.execute(
            select(User).where(User.id == profile.user_id)
        )
        user = user_result.scalar_one_or_none()

        # Get profile_md
        config_result = await db.execute(
            select(UserConfig).where(UserConfig.user_id == profile.user_id)
        )
        user_config = config_result.scalar_one_or_none()
        profile_md = user_config.profile_md if user_config else ""

        # Build location
        location = None
        if profile.city and profile.state:
            location = f"{profile.city}, {profile.state}"
        elif profile.state:
            location = profile.state
        elif profile.city:
            location = profile.city

        # Calculate fit score (fresh calculation for admin verification)
        fit_score, match_reasons = calculate_enhanced_match_score(
            requirement=req_dict,
            profile_md=profile_md,
            location=location,
            categories=profile.product_categories,
            pricing_available=bool(profile.pricing_bands)
        )

        # Check if there's an existing lead (for status info)
        lead = existing_leads.get(profile.user_id)

        matches.append({
            "lead_id": lead.id if lead else None,
            "supplier_id": profile.user_id,
            "supplier_name": profile.trade_name or "Unknown",
            "supplier_phone": user.phone if user else None,
            "fit_score": fit_score,
            "match_reasons": match_reasons,
            "status": lead.status if lead else "not_matched",
            "negotiation_round": lead.negotiation_round if lead else 0,
            "current_offer_price": lead.current_offer_price if lead else None,
            "current_lead_time": lead.current_lead_time if lead else None,
            "location": location,
            "product_categories": profile.product_categories if profile.product_categories else [],
            "reliability_score": profile.reliability_score,
            "created_at": lead.created_at.isoformat() if lead and lead.created_at else None,
            "has_lead": lead is not None,
        })

    # Sort by fit_score descending
    matches.sort(key=lambda x: x["fit_score"], reverse=True)

    return {
        "requirement": {
            "id": requirement.id,
            "product": requirement.product,
            "quantity": requirement.quantity,
            "quantity_unit": requirement.quantity_unit,
            "budget_max": requirement.budget_max,
            "delivery_location": requirement.delivery_location,
        },
        "matches": matches,
        "total_matches": len(matches),
        "matches_above_threshold": len([m for m in matches if m["fit_score"] >= 20]),
    }


@router.get("/users")
async def list_all_users(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,  # "buyer" or "supplier"
):
    """List all users with their profiles"""

    query = select(User).order_by(desc(User.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    output = []
    for user in users:
        # Get profile
        profile_result = await db.execute(
            select(AgenticProfile).where(AgenticProfile.user_id == user.id)
        )
        profile = profile_result.scalar_one_or_none()

        # Filter by role if specified
        if role == "buyer" and (not profile or not profile.is_buyer):
            continue
        if role == "supplier" and (not profile or not profile.is_supplier):
            continue

        # Get requirements count (if buyer)
        req_count = 0
        if profile and profile.is_buyer:
            req_count_result = await db.execute(
                select(func.count(Requirement.id)).where(Requirement.buyer_id == user.id)
            )
            req_count = req_count_result.scalar() or 0

        # Get leads count (if supplier)
        leads_count = 0
        if profile and profile.is_supplier:
            leads_count_result = await db.execute(
                select(func.count(Lead.id)).where(Lead.supplier_id == user.id)
            )
            leads_count = leads_count_result.scalar() or 0

        output.append({
            "id": user.id,
            "phone_number": user.phone,
            "is_verified": user.is_verified,
            "onboarding_complete": user.is_onboarded,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "profile": {
                "trade_name": profile.trade_name if profile else None,
                "gstin": profile.gstin if profile else None,
                "is_buyer": profile.is_buyer if profile else False,
                "is_supplier": profile.is_supplier if profile else False,
                "city": profile.city if profile else None,
                "state": profile.state if profile else None,
                "reliability_score": profile.reliability_score if profile else 0,
                "profile_build_status": profile.profile_build_status if profile else None,
            } if profile else None,
            "requirements_count": req_count,
            "leads_count": leads_count,
        })

    return {"users": output, "total": len(output)}


@router.get("/map-data")
async def get_map_data(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_token),
):
    """
    Get all user locations for map visualization.
    Note: All users can be both buyers AND sellers, so we show everyone.
    """

    profiles_result = await db.execute(
        select(AgenticProfile).where(
            AgenticProfile.city.isnot(None),
            AgenticProfile.state.isnot(None)
        )
    )
    profiles = profiles_result.scalars().all()

    locations = []
    for profile in profiles:
        # Get user info
        user_result = await db.execute(
            select(User).where(User.id == profile.user_id)
        )
        user = user_result.scalar_one_or_none()

        # Get leads count
        leads_count_result = await db.execute(
            select(func.count(Lead.id)).where(Lead.supplier_id == profile.user_id)
        )
        leads_count = leads_count_result.scalar() or 0

        locations.append({
            "id": profile.id,
            "supplier_name": profile.trade_name,
            "city": profile.city,
            "state": profile.state,
            "location_text": f"{profile.city}, {profile.state}",
            "product_categories": profile.product_categories or [],
            "reliability_score": profile.reliability_score,
            "leads_count": leads_count,
            "phone": user.phone if user else None,
        })

    return {"locations": locations, "total": len(locations)}
