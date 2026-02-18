"""
Plugin Registry Auth Helpers

Single source of truth for role -> workspace mapping logic.
"""

from __future__ import annotations

import logging
from typing import Optional

from config.settings import settings

logger = logging.getLogger("compass.plugin_registry.auth")


# Roles that bypass workspace filtering entirely
SUPERADMIN_ROLES: set[str] = {
    "SuperAdmins",
    "SuperAdmins.Test",
}

# User-facing endpoints: both User and Admin roles grant workspace access
USER_ROLE_MAP: dict[str, str] = {
    # Admin roles
    "dscoe.Admin": "dscoe",
    "DscoeAdmin": "dscoe",
    "bluecard-its.Admin": "bluecard_its",
    "BluecardItsAdmin": "bluecard_its",
    # User roles
    "dscoe.User": "dscoe",
    "DscoeUser": "dscoe",
    "bluecard-its.User": "bluecard_its",
    "BluecardItsUser": "bluecard_its",
}

# Admin-facing endpoints: only Admin roles grant config access
ADMIN_ROLE_MAP: dict[str, str] = {
    "dscoe.Admin": "dscoe",
    "DscoeAdmin": "dscoe",
    "bluecard-its.Admin": "bluecard_its",
    "BluecardItsAdmin": "bluecard_its",
}


def get_user_roles(session_db, user_email: str) -> list[str]:
    """
    Read role data from Redis session store.
    """
    roles: list[str] = []
    try:
        raw = session_db.hget(user_email, "roles") or ""
        roles = [role.strip() for role in raw.split(",") if role.strip()]
    except Exception:  # pragma: no cover - depends on runtime Redis availability
        logger.exception("Role lookup failed for user=%s", user_email)

    if roles:
        return roles

    return []


def allowed_workspaces(
    roles: list[str],
    role_map: dict[str, str] = USER_ROLE_MAP,
    include_general: bool = True,
) -> Optional[set[str]]:
    """
    Determine which workspace IDs a user can access based on roles.

    Returns:
    - None: unrestricted access (role checks disabled or superadmin)
    - set[str]: specific workspace access
    - empty set: no access
    """
    if not settings.enforce_role_checks:
        return None

    if SUPERADMIN_ROLES.intersection(roles):
        return None

    workspaces = {role_map[r] for r in roles if r in role_map}

    if include_general:
        workspaces.add("general")

    return workspaces if workspaces else set()
