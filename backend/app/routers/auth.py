from datetime import datetime, timedelta, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import httpx

from app.database import get_db
from app import models, schemas
from app.config import settings
from app.security import (
    hash_password, verify_password, create_access_token,
    generate_opaque_token, hash_token,
)
from app.deps import get_current_user
from app.services import email_service
from app.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("preproom.auth")


def _utcnow():
    return datetime.now(timezone.utc)


async def _issue_token_pair(user: models.User, db: AsyncSession) -> schemas.Token:
    access_token = create_access_token(subject=user.id)

    raw_refresh = generate_opaque_token()
    db.add(models.RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw_refresh),
        expires_at=_utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    await db.commit()

    return schemas.Token(
        access_token=access_token,
        refresh_token=raw_refresh,
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/signup", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_SIGNUP)
async def signup(request: Request, payload: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == payload.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    verification_token = generate_opaque_token()
    user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        verification_token_hash=hash_token(verification_token),
        verification_token_expires=_utcnow() + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    email_service.send_verification_email(user.email, user.full_name, verification_token)

    return await _issue_token_pair(user, db)


@router.post("/login", response_model=schemas.Token)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # form_data.username carries the email - this shape is what lets Swagger's
    # "Authorize" button and OAuth2PasswordBearer work out of the box.
    result = await db.execute(select(models.User).where(models.User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    return await _issue_token_pair(user, db)


@router.post("/google", response_model=schemas.Token)
async def google_login(payload: schemas.GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on this server")

    # google-auth's verify call does a blocking network fetch of Google's
    # public certs (cached internally, but still blocking) - keep it off
    # the event loop.
    try:
        idinfo = await run_in_threadpool(
            google_id_token.verify_oauth2_token,
            payload.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google sign-in token")

    google_id = idinfo["sub"]
    email = idinfo.get("email")
    full_name = idinfo.get("name") or (email.split("@")[0] if email else "PrepRoom User")
    picture = idinfo.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email address")

    # Look up by google_id first (returning user), then by email (an
    # existing password account signing in with Google for the first time -
    # link the accounts rather than erroring or creating a duplicate).
    result = await db.execute(select(models.User).where(models.User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user is None:
        result = await db.execute(select(models.User).where(models.User.email == email))
        user = result.scalar_one_or_none()

    if user is None:
        user = models.User(
            full_name=full_name,
            email=email,
            hashed_password=None,
            google_id=google_id,
            profile_picture_url=picture,
            is_verified=True,  # Google has already verified this email address
        )
        db.add(user)
    else:
        user.google_id = user.google_id or google_id
        user.profile_picture_url = picture or user.profile_picture_url
        user.is_verified = True

    await db.commit()
    await db.refresh(user)

    return await _issue_token_pair(user, db)


@router.post("/github", response_model=schemas.Token)
async def github_login(payload: schemas.GithubAuthRequest, db: AsyncSession = Depends(get_db)):
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="GitHub sign-in is not configured on this server")

    redirect_uri = settings.GITHUB_REDIRECT_URI or f"{settings.FRONTEND_ORIGIN}/auth/github/callback"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": payload.code,
                    "redirect_uri": redirect_uri,
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(
                    status_code=401,
                    detail=token_data.get("error_description", "Invalid GitHub authorization code"),
                )

            headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
            user_response = await client.get("https://api.github.com/user", headers=headers)
            user_response.raise_for_status()
            profile = user_response.json()

            email = profile.get("email")
            if not email:
                # GitHub only returns a primary email here if the user made it
                # public - otherwise it's a separate, scope-gated endpoint.
                emails_response = await client.get("https://api.github.com/user/emails", headers=headers)
                if emails_response.status_code == 200:
                    primary = next(
                        (e for e in emails_response.json() if e.get("primary") and e.get("verified")), None
                    )
                    email = primary["email"] if primary else None
        except httpx.HTTPError:
            logger.exception("GitHub OAuth request failed")
            raise HTTPException(status_code=502, detail="Could not reach GitHub. Please try again.")

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Your GitHub account has no verified public email. Add one at github.com/settings/emails, or sign up with email/password instead.",
        )

    github_id = str(profile["id"])
    full_name = profile.get("name") or profile.get("login") or "PrepRoom User"
    picture = profile.get("avatar_url")

    result = await db.execute(select(models.User).where(models.User.github_id == github_id))
    user = result.scalar_one_or_none()

    if user is None:
        result = await db.execute(select(models.User).where(models.User.email == email))
        user = result.scalar_one_or_none()

    if user is None:
        user = models.User(
            full_name=full_name,
            email=email,
            hashed_password=None,
            github_id=github_id,
            profile_picture_url=picture,
            is_verified=True,  # GitHub only returns verified emails
        )
        db.add(user)
    else:
        user.github_id = user.github_id or github_id
        user.profile_picture_url = picture or user.profile_picture_url
        user.is_verified = True

    await db.commit()
    await db.refresh(user)

    return await _issue_token_pair(user, db)


@router.post("/refresh", response_model=schemas.AccessTokenOut)
async def refresh_access_token(payload: schemas.RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_token(payload.refresh_token)
    result = await db.execute(
        select(models.RefreshToken).where(models.RefreshToken.token_hash == token_hash)
    )
    stored = result.scalar_one_or_none()

    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    if stored is None or stored.revoked:
        raise invalid
    if stored.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
        raise invalid

    user = await db.get(models.User, stored.user_id)
    if user is None:
        raise invalid

    return schemas.AccessTokenOut(access_token=create_access_token(subject=user.id))


@router.post("/logout", response_model=schemas.MessageOut)
async def logout(payload: schemas.RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_token(payload.refresh_token)
    result = await db.execute(
        select(models.RefreshToken).where(models.RefreshToken.token_hash == token_hash)
    )
    stored = result.scalar_one_or_none()
    if stored is not None:
        stored.revoked = True
        await db.commit()
    return schemas.MessageOut(message="Logged out")


@router.get("/me", response_model=schemas.UserOut)
async def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=schemas.UserOut)
async def update_profile(
    payload: schemas.UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    current_user.full_name = payload.full_name
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/change-password", response_model=schemas.MessageOut)
async def change_password(
    payload: schemas.ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=400,
            detail="This account signed up with Google/GitHub and has no password to change.",
        )
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return schemas.MessageOut(message="Password changed successfully")


# ---------- Email verification ----------

@router.post("/verify-email", response_model=schemas.MessageOut)
async def verify_email(payload: schemas.VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_token(payload.token)
    result = await db.execute(
        select(models.User).where(models.User.verification_token_hash == token_hash)
    )
    user = result.scalar_one_or_none()

    invalid = HTTPException(status_code=400, detail="Invalid or expired verification link")
    if user is None or user.verification_token_expires is None:
        raise invalid
    if user.verification_token_expires.replace(tzinfo=timezone.utc) < _utcnow():
        raise invalid

    user.is_verified = True
    user.verification_token_hash = None
    user.verification_token_expires = None
    await db.commit()

    return schemas.MessageOut(message="Email verified successfully")


@router.post("/resend-verification", response_model=schemas.MessageOut)
async def resend_verification(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.is_verified:
        return schemas.MessageOut(message="Your email is already verified")

    token = generate_opaque_token()
    current_user.verification_token_hash = hash_token(token)
    current_user.verification_token_expires = _utcnow() + timedelta(
        hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
    )
    await db.commit()

    email_service.send_verification_email(current_user.email, current_user.full_name, token)
    return schemas.MessageOut(message="Verification email sent")


# ---------- Password reset ----------

@router.post("/forgot-password", response_model=schemas.MessageOut)
@limiter.limit(settings.RATE_LIMIT_PASSWORD_RESET)
async def forgot_password(request: Request, payload: schemas.ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == payload.email))
    user = result.scalar_one_or_none()

    # Always return the same message whether or not the account exists,
    # so this endpoint can't be used to enumerate registered emails.
    generic_response = schemas.MessageOut(
        message="If an account with that email exists, a reset link has been sent."
    )
    if user is None:
        return generic_response

    token = generate_opaque_token()
    user.reset_token_hash = hash_token(token)
    user.reset_token_expires = _utcnow() + timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
    await db.commit()

    email_service.send_password_reset_email(user.email, user.full_name, token)
    return generic_response


@router.post("/reset-password", response_model=schemas.MessageOut)
async def reset_password(payload: schemas.ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_token(payload.token)
    result = await db.execute(select(models.User).where(models.User.reset_token_hash == token_hash))
    user = result.scalar_one_or_none()

    invalid = HTTPException(status_code=400, detail="Invalid or expired reset link")
    if user is None or user.reset_token_expires is None:
        raise invalid
    if user.reset_token_expires.replace(tzinfo=timezone.utc) < _utcnow():
        raise invalid

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token_hash = None
    user.reset_token_expires = None
    await db.commit()

    return schemas.MessageOut(message="Password reset successfully. You can now sign in.")
