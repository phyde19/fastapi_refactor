from __future__ import annotations

import base64
import json
from typing import Any

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


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Malformed JWT token")

    payload_segment = parts[1]
    padding = "=" * (-len(payload_segment) % 4)
    decoded_payload = base64.urlsafe_b64decode(payload_segment + padding)
    payload = json.loads(decoded_payload.decode("utf-8"))

    if not isinstance(payload, dict):
        raise ValueError("JWT payload is not an object")
    return payload


def _extract_user_email(claims: dict[str, Any]) -> str:
    value = claims.get("preferred_username")
    if isinstance(value, str) and value.strip():
        return value.strip()
    raise ValueError("JWT payload does not include preferred_username")


def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict[str, str]:
    """
    Extract authenticated user identity from bearer token claims.

    Identity source is the auth token only.
    """
    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    scheme, _, raw_token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not raw_token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must use Bearer token format.",
        )

    token = raw_token.strip()
    try:
        claims = _decode_jwt_payload(token)
        user_email = _extract_user_email(claims)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token for user identity.",
        ) from exc

    return {"user_email": user_email}

