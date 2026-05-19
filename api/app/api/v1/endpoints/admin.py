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


def verify_admin_password(password: str) -> bool:
    """
    Verify time-based admin password. Format: HHMM (e.g., 1430 for 14:30)
    Accepts password from current time and up to 30 minutes in the past for session persistence.
    """
    now = datetime.now()

    # Check current time and previous 30 minutes
    for minutes_ago in range(31):  # 0 to 30 minutes
        check_time = now - timedelta(minutes=minutes_ago)
        time_password = check_time.strftime("%H%M")
        if password == time_password:
            return True

    return False


def get_admin_password(authorization: str = Header(None)) -> str:
    """Extract and verify admin password from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Admin authorization required")

    # Expect format: "Bearer 1430" or just "1430"
    password = authorization.replace("Bearer ", "").strip()

    if not verify_admin_password(password):
        raise HTTPException(status_code=403, detail="Invalid admin password")

    return password


@router.post("/login")
async def admin_login(password: str):
    """Verify admin password (time-based)"""
    if not verify_admin_password(password):
        raise HTTPException(status_code=403, detail="Invalid admin password")

    return {
        "success": True,
        "message": "Admin access granted",
        "token": password,  # Return password as token for subsequent requests
    }


@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_password),
):
    """Get dashboard statistics"""

    # Total users
    users_result = await db.execute(select(func.count(User.id)))
    total_users = users_result.scalar() or 0

    # Total requirements
    req_result = await db.execute(select(func.count(Requirement.id)))
    total_requirements = req_result.scalar() or 0

    # Active requirements
    active_req_result = await db.execute(
        select(func.count(Requirement.id)).where(Requirement.is_active == True)
    )
    active_requirements = active_req_result.scalar() or 0

    # Total leads
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

    # Total suppliers
    suppliers_result = await db.execute(
        select(func.count(AgenticProfile.id)).where(AgenticProfile.is_supplier == True)
    )
    total_suppliers = suppliers_result.scalar() or 0

    # Total buyers
    buyers_result = await db.execute(
        select(func.count(AgenticProfile.id)).where(AgenticProfile.is_buyer == True)
    )
    total_buyers = buyers_result.scalar() or 0

    # Recent requirements (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_req = await db.execute(
        select(func.count(Requirement.id)).where(Requirement.created_at >= week_ago)
    )
    recent_requirements = recent_req.scalar() or 0

    return {
        "total_users": total_users,
        "total_requirements": total_requirements,
        "active_requirements": active_requirements,
        "total_leads": total_leads,
        "active_negotiations": active_negotiations,
        "total_deals": total_deals,
        "total_suppliers": total_suppliers,
        "total_buyers": total_buyers,
        "recent_requirements": recent_requirements,
    }


@router.get("/overview")
async def admin_overview(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_password),
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
    _: str = Depends(get_admin_password),
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
    _: str = Depends(get_admin_password),
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
    _: str = Depends(get_admin_password),
):
    """
    Manually re-run matching + initiate agent conversations for a requirement.
    Use this for requirements that got stuck in 'matching' status.
    """
    from app.models.requirement import Requirement
    from app.services.matching_service import match_requirement_to_suppliers

    req_result = await db.execute(
        select(Requirement).where(Requirement.id == requirement_id)
    )
    req = req_result.scalar_one_or_none()
    if not req:
        return {"error": f"Requirement #{requirement_id} not found"}

    # Run matching
    leads = await match_requirement_to_suppliers(req, db)
    await db.commit()

    # Initiate agent conversations for new leads
    from app.api.v1.endpoints.requirements import _initiate_agent_conversation
    initiated = []
    for lead in leads:
        try:
            await _initiate_agent_conversation(lead.id)
            initiated.append(lead.id)
        except Exception as e:
            pass

    return {
        "requirement_id": requirement_id,
        "product": req.product,
        "leads_created": len(leads),
        "conversations_initiated": len(initiated),
        "lead_ids": [l.id for l in leads],
    }


@router.get("/profiles")
async def list_profiles(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_password),
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
    _: str = Depends(get_admin_password),
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
    _: str = Depends(get_admin_password),
):
    """Get all matching profiles with scores for a requirement"""

    # Get requirement
    req_result = await db.execute(
        select(Requirement).where(Requirement.id == requirement_id)
    )
    requirement = req_result.scalar_one_or_none()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Get all leads for this requirement
    leads_result = await db.execute(
        select(Lead)
        .where(Lead.requirement_id == requirement_id)
        .order_by(desc(Lead.match_score))
    )
    leads = leads_result.scalars().all()

    # Build matches list with profile info
    matches = []
    for lead in leads:
        # Get supplier profile
        profile_result = await db.execute(
            select(AgenticProfile).where(AgenticProfile.user_id == lead.supplier_id)
        )
        profile = profile_result.scalar_one_or_none()

        # Get user info
        user_result = await db.execute(
            select(User).where(User.id == lead.supplier_id)
        )
        user = user_result.scalar_one_or_none()

        # Get conversation status
        conv_result = await db.execute(
            select(Conversation).where(Conversation.lead_id == lead.id)
        )
        conversation = conv_result.scalar_one_or_none()

        matches.append({
            "lead_id": lead.id,
            "supplier_id": lead.supplier_id,
            "supplier_name": profile.trade_name if profile else "Unknown",
            "supplier_phone": user.phone if user else None,
            "match_score": lead.match_score,
            "status": lead.status,
            "negotiation_round": lead.negotiation_round,
            "current_offer_price": lead.current_offer_price,
            "current_lead_time": lead.current_lead_time,
            "location": f"{profile.city}, {profile.state}" if profile and profile.city else None,
            "product_categories": profile.product_categories if profile else [],
            "reliability_score": profile.reliability_score if profile else 0,
            "conversation_mode": conversation.mode if conversation else None,
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
        })

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
    }


@router.get("/users")
async def list_all_users(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_admin_password),
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
    _: str = Depends(get_admin_password),
):
    """Get supplier locations for map visualization"""

    profiles_result = await db.execute(
        select(AgenticProfile).where(
            AgenticProfile.is_supplier == True,
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
