from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.email import send_email
from app.core.rate_limit import rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    hash_password,
    hash_token,
    verify_password,
    verify_token_hash,
)
from app.db.session import get_db
from app.models.user import PasswordResetToken, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_settings = get_settings()
_auth_rate_limit = rate_limit(
    "auth", _settings.auth_rate_limit_attempts, _settings.auth_rate_limit_window_seconds
)


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(_auth_rate_limit)])
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )
    return TokenResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id, user.role.value),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        data = decode_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        ) from exc
    if data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user = db.get(User, int(data["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id, user.role.value),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> None:
    # Stateless JWT: client discards tokens. Present for API-contract completeness.
    return None


@router.post(
    "/forgot-password",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(_auth_rate_limit)],
)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> None:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None:
        raw_token = generate_reset_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_token(raw_token),
                expires_at=datetime.now(UTC) + timedelta(hours=1),
            )
        )
        db.commit()

        reset_link = f"{_settings.frontend_base_url}/reset-password?token={raw_token}"
        send_email(
            to=user.email,
            subject="Reset your Buildwise password",
            body=(
                f"Hi {user.name},\n\n"
                "We received a request to reset your Buildwise password. "
                "This link expires in 1 hour:\n\n"
                f"{reset_link}\n\n"
                "If you didn't request this, you can ignore this email."
            ),
        )


@router.post(
    "/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(_auth_rate_limit)],
)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> None:
    candidates = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.used_at.is_(None))
        .order_by(PasswordResetToken.id.desc())
        .all()
    )
    now = datetime.now(UTC)
    for candidate in candidates:
        if candidate.expires_at < now:
            continue
        if verify_token_hash(payload.token, candidate.token_hash):
            user = db.get(User, candidate.user_id)
            if user is None:
                break
            user.password_hash = hash_password(payload.new_password)
            candidate.used_at = now
            db.commit()
            return

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
