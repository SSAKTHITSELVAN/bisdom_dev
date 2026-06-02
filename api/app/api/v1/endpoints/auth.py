from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.user import User
from app.schemas.auth import SendOTPRequest, VerifyOTPRequest, AuthResponse
from app.services.otp_service import generate_otp, get_otp_expiry, verify_otp
from app.core.security import create_access_token
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/send-otp")
@limiter.limit("5/minute")
async def send_otp(request: Request, body: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    """Send OTP to phone number. Creates user if not exists."""
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()

    if not user:
        user = User(phone=body.phone)
        db.add(user)

    otp = generate_otp(body.phone)
    user.otp_code = otp
    user.otp_expires_at = get_otp_expiry()
    await db.commit()
    await db.refresh(user)

    return {
        "success": True,
        "message": f"OTP sent to {body.phone}",
        "debug_otp": otp,  # Remove in production
    }


@router.post("/verify-otp", response_model=AuthResponse)
@limiter.limit("5/minute")
async def verify_otp_endpoint(request: Request, body: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP and return JWT token."""
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()

    if not user or not user.otp_code or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP not sent. Request OTP first.")

    is_new_user = not user.is_verified

    if not verify_otp(user.otp_code, body.otp, user.otp_expires_at):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user.is_verified = True
    user.otp_code = None
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "phone": user.phone})

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        is_new_user=is_new_user,
        is_onboarded=user.is_onboarded,
        user_id=user.id,
    )
