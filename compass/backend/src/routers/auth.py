from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status
import redis

from config.settings import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# Session DB (DB 0) for role lookups used by plugin routes.
session_db = redis.Redis(
    host=settings.redis_host,
    port=settings.redis_port,
    db=settings.redis_session_db,
    decode_responses=True,
)


def get_current_user(
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
) -> dict[str, str]:
    """
    Minimal auth dependency for scaffold/dev runs.

    - If X-User-Email header is supplied, use it.
    - In DEV without header, fall back to a default local user.
    - In STAGING/PROD without header, reject.
    """
    if x_user_email and x_user_email.strip():
        return {"user_email": x_user_email.strip()}

    if settings.is_dev:
        return {"user_email": settings.default_dev_user_email}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing authenticated user.",
    )
