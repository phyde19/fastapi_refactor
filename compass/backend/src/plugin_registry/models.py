"""
Plugin Registry Models

Single source of truth for all plugin-related data structures in the backend.
Every router and service should use these models.
"""

import json
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class PluginRecord(BaseModel):
    """
    Canonical representation of a plugin in the Compass backend.

    Direct mapping from a row in the `plugin_registry` table.
    Admin-editable values are first-class columns (no admin JSON blob).
    """

    # Identity
    plugin_id: str
    plugin_name: str
    workspace_id: str
    workspace_name: str

    # Display and UX
    description: str = ""
    workspace_description: str = ""
    position: int = 1
    enabled: bool = True

    # Admin-editable content
    instructions: str = ""

    # Plugin-defined behavior (JSON strings in registry)
    conversation_seed: Optional[str] = None
    user_inputs: Optional[str] = None

    # Routing
    service_key: Optional[str] = None
    service_type: Optional[str] = None  # internal | external
    plugin_type: Optional[str] = None

    # Audit
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def get_user_inputs(self) -> list[dict[str, Any]]:
        """Parse user_inputs JSON string into a list of input definitions."""
        if not self.user_inputs:
            return []
        try:
            parsed = json.loads(self.user_inputs)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            return []

    def get_conversation_seed(self) -> list[dict[str, str]]:
        """Parse conversation_seed JSON string into a list of seed messages."""
        if not self.conversation_seed:
            return []
        try:
            parsed = json.loads(self.conversation_seed)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def is_implemented(self) -> bool:
        return bool(self.service_key)

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "PluginRecord":
        """
        Build PluginRecord from Databricks row or local JSON payload.

        Also supports legacy `admin_config` payload by flattening it.
        """
        row = dict(payload)

        admin_config = row.get("admin_config")
        if isinstance(admin_config, str):
            try:
                admin_config = json.loads(admin_config)
            except json.JSONDecodeError:
                admin_config = {}
        if isinstance(admin_config, dict):
            row.setdefault("plugin_name", admin_config.get("plugin_name"))
            row.setdefault("description", admin_config.get("plugin_description"))
            row.setdefault("instructions", admin_config.get("instructions"))

        row["plugin_id"] = str(row.get("plugin_id", "")).strip()
        row["plugin_name"] = str(row.get("plugin_name") or row["plugin_id"]).strip()
        row["workspace_id"] = str(row.get("workspace_id", "")).strip()
        row["workspace_name"] = str(row.get("workspace_name") or row["workspace_id"]).strip()

        row["description"] = str(row.get("description") or "")
        row["workspace_description"] = str(row.get("workspace_description") or "")
        row["instructions"] = str(row.get("instructions") or "")
        row["position"] = int(row.get("position") or 1)
        row["enabled"] = bool(row.get("enabled", True))

        for field in ("conversation_seed", "user_inputs"):
            value = row.get(field)
            if isinstance(value, (list, dict)):
                row[field] = json.dumps(value, ensure_ascii=False)
            elif value is None:
                row[field] = None
            else:
                row[field] = str(value)

        for ts_field in ("created_at", "updated_at"):
            ts_value = row.get(ts_field)
            if ts_value is None or isinstance(ts_value, datetime):
                continue
            ts_text = str(ts_value)
            if ts_text.endswith("Z"):
                ts_text = ts_text.replace("Z", "+00:00")
            try:
                row[ts_field] = datetime.fromisoformat(ts_text)
            except ValueError:
                row[ts_field] = None

        return cls(**row)


class PluginUpdate(BaseModel):
    """Partial update payload for admin-editable fields."""

    plugin_name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    updated_by: Optional[str] = None

    def has_changes(self) -> bool:
        return any(v is not None for v in (self.plugin_name, self.description, self.instructions))


class WorkspaceGroup(BaseModel):
    """Plugins grouped by workspace for API responses."""

    workspace_id: str
    workspace_name: str
    workspace_description: str
    plugins: list[PluginRecord]


class PluginMenuEntry(BaseModel):
    """Lightweight plugin data for menu rendering."""

    id: str
    name: str
    description: str
    plugin_type: Optional[str] = None
    user_inputs: list[dict[str, Any]] = Field(default_factory=list)
    conversation_seed: list[dict[str, str]] = Field(default_factory=list)
    has_service: bool = False

    @classmethod
    def from_record(cls, record: PluginRecord) -> "PluginMenuEntry":
        return cls(
            id=record.plugin_id,
            name=record.plugin_name,
            description=record.description,
            plugin_type=record.plugin_type,
            user_inputs=record.get_user_inputs(),
            conversation_seed=record.get_conversation_seed(),
            has_service=record.is_implemented,
        )


class WorkspaceMenuGroup(BaseModel):
    """Workspace with lightweight plugin menu entries."""

    id: str
    name: str
    description: str
    plugins: list[PluginMenuEntry]
