from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, onboarding, requirements, conversations,
    leads, dashboard, config, requirement_chat, expiry, admin, profile, preprocessing,
    reviews
)
from app.api.v1.endpoints import cards

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(onboarding.router)
router.include_router(requirements.router)
router.include_router(leads.router)
router.include_router(conversations.router)
router.include_router(dashboard.router)
router.include_router(config.router)
router.include_router(profile.router)
router.include_router(requirement_chat.router)
router.include_router(expiry.router)
router.include_router(preprocessing.router)
router.include_router(cards.router)
router.include_router(reviews.router)

router.include_router(admin.router)
