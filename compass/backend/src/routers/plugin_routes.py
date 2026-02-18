"""
Plugin Routes — all plugin-related HTTP endpoints in one file.

Logical groups:
  1) /plugins         - user-facing plugin catalog
  2) /plugins-config  - admin plugin CRUD
  3) /chats           - chat completion proxy to external plugin services
"""

import json
from typing import Any, Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from config.service_resolver import ServiceResolverError, resolver
from config.settings import settings
from db.memory import conversation_store
from plugin_registry.auth import (
    ADMIN_ROLE_MAP,
    USER_ROLE_MAP,
    allowed_workspaces,
    get_user_roles,
)
from plugin_registry.models import (
    PluginMenuEntry,
    PluginRecord,
    PluginUpdate,
    WorkspaceGroup,
    WorkspaceMenuGroup,
)
from plugin_registry.registry import plugin_registry
from routers.auth import get_current_user, session_db
from schemas.chat import ChatCompletionRequest, ChatMessage, UserInputValue
from schemas.frames import ErrorFrame
from schemas.plugin_service import PluginServiceRequest


def _get_roles(user: dict[str, str]) -> list[str]:
    """Extract roles for the authenticated user from the session store."""
    return get_user_roles(session_db, user["user_email"])


def _require_workspace_access(
    roles: list[str],
    workspace_id: str,
    role_map: dict[str, str] = ADMIN_ROLE_MAP,
    include_general: bool = False,
) -> None:
    """Raise 403 if the user does not have access to this workspace."""
    allowed = allowed_workspaces(roles, role_map, include_general=include_general)
    if allowed is not None and workspace_id not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not authorized for workspace '{workspace_id}'",
        )


def _is_plugin_routable(plugin: PluginRecord) -> bool:
    """True when plugin has a configured service key -> URL mapping."""
    return bool(plugin.service_key and resolver.is_configured(plugin.service_key))


# ============================================================================
# 1) PLUGIN MENU ROUTER (/plugins)
# ============================================================================

plugin_menu_router = APIRouter(
    prefix="/plugins",
    tags=["plugins"],
)


@plugin_menu_router.get(
    "/",
    response_model=list[WorkspaceMenuGroup],
    summary="Plugin catalog for workspace/plugin menu",
)
async def get_plugin_catalog(
    user: dict[str, str] = Depends(get_current_user),
    include_unroutable: bool = False,
) -> list[WorkspaceMenuGroup]:
    """
    Returns enabled plugins grouped by workspace, filtered by user roles.
    By default, unroutable plugins are hidden.
    """
    roles = _get_roles(user)
    allowed = allowed_workspaces(roles, USER_ROLE_MAP, include_general=True)

    if allowed == set():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view any workspaces",
        )

    groups = plugin_registry.get_grouped(workspace_filter=allowed, enabled_only=True)
    menu_groups: list[WorkspaceMenuGroup] = []

    for group in groups:
        entries: list[PluginMenuEntry] = []
        for plugin in group.plugins:
            routable = _is_plugin_routable(plugin)
            if not include_unroutable and not routable:
                continue
            entry = PluginMenuEntry.from_record(plugin)
            entry.has_service = routable
            entries.append(entry)

        if entries:
            menu_groups.append(
                WorkspaceMenuGroup(
                    id=group.workspace_id,
                    name=group.workspace_name,
                    description=group.workspace_description,
                    plugins=entries,
                )
            )

    return menu_groups


# ============================================================================
# 2) PLUGIN CONFIG ROUTER (/plugins-config)
# ============================================================================

plugin_config_router = APIRouter(
    prefix="/plugins-config",
    tags=["plugins-config"],
)


@plugin_config_router.get(
    "/",
    response_model=list[WorkspaceGroup],
    summary="Admin: list all plugins grouped by workspace",
)
async def list_all_plugins(
    user: dict[str, str] = Depends(get_current_user),
) -> list[WorkspaceGroup]:
    roles = _get_roles(user)
    allowed = allowed_workspaces(roles, ADMIN_ROLE_MAP, include_general=False)

    if allowed == set():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to administer any workspaces",
        )

    return plugin_registry.get_grouped(workspace_filter=allowed)


@plugin_config_router.get(
    "/{workspace_id}/{plugin_id}",
    response_model=PluginRecord,
    summary="Admin: get full plugin config",
)
async def get_plugin_config(
    workspace_id: str,
    plugin_id: str,
    user: dict[str, str] = Depends(get_current_user),
) -> PluginRecord:
    roles = _get_roles(user)
    _require_workspace_access(roles, workspace_id, ADMIN_ROLE_MAP)

    plugin = plugin_registry.get_one(workspace_id, plugin_id)
    if not plugin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plugin '{plugin_id}' not found in workspace '{workspace_id}'",
        )
    return plugin


@plugin_config_router.put(
    "/{workspace_id}/{plugin_id}/config",
    response_model=PluginRecord,
    summary="Admin: update plugin name, description, instructions",
)
async def update_plugin_config(
    workspace_id: str,
    plugin_id: str,
    update: PluginUpdate,
    user: dict[str, str] = Depends(get_current_user),
) -> PluginRecord:
    if not update.has_changes():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one of: plugin_name, description, instructions",
        )

    roles = _get_roles(user)
    _require_workspace_access(roles, workspace_id, ADMIN_ROLE_MAP)

    plugin = plugin_registry.get_one(workspace_id, plugin_id)
    if not plugin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plugin '{plugin_id}' not found in workspace '{workspace_id}'",
        )

    update.updated_by = user["user_email"]
    return plugin_registry.update(workspace_id, plugin_id, update)


@plugin_config_router.post(
    "/invalidate-cache",
    summary="Admin: force plugin registry cache refresh",
)
async def invalidate_cache(user: dict[str, str] = Depends(get_current_user)) -> dict[str, str]:
    _ = user
    plugin_registry.invalidate_cache()
    return {"status": "cache invalidated"}


# ============================================================================
# 3) CHAT ROUTER (/chats)
# ============================================================================

chat_router = APIRouter(
    prefix="/chats",
    tags=["chats"],
)


@chat_router.post(
    "/new/stream",
    summary="Create a new conversation and stream plugin response",
)
async def new_chat_completion(
    request: ChatCompletionRequest,
    user: dict[str, str] = Depends(get_current_user),
):
    if not request.conversation:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="conversation is required")

    roles = _get_roles(user)
    user_email = user["user_email"]
    plugin, service_url = _resolve_plugin(request.workspace, request.plugin)

    conversation = conversation_store.create_conversation(
        title=request.conversation[0].content[:80] or "New Chat"
    )

    return StreamingResponse(
        _proxy_plugin_stream(
            plugin=plugin,
            service_url=service_url,
            conversation_id=conversation.id,
            conversation=request.conversation,
            user_inputs=request.user_inputs,
            user_email=user_email,
            roles=roles,
        ),
        media_type="application/x-ndjson",
        headers={"X-Conversation-Id": conversation.id},
    )


@chat_router.post(
    "/{conversation_id}/stream",
    summary="Continue an existing conversation and stream plugin response",
)
async def existing_chat_completion(
    conversation_id: str,
    request: ChatCompletionRequest,
    user: dict[str, str] = Depends(get_current_user),
):
    if not request.conversation:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="conversation is required")
    if conversation_store.get_conversation(conversation_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation not found: {conversation_id}",
        )

    roles = _get_roles(user)
    user_email = user["user_email"]
    plugin, service_url = _resolve_plugin(request.workspace, request.plugin)

    return StreamingResponse(
        _proxy_plugin_stream(
            plugin=plugin,
            service_url=service_url,
            conversation_id=conversation_id,
            conversation=request.conversation,
            user_inputs=request.user_inputs,
            user_email=user_email,
            roles=roles,
        ),
        media_type="application/x-ndjson",
        headers={"X-Conversation-Id": conversation_id},
    )


@chat_router.get("/{conversation_id}", summary="Debug: get in-memory conversation snapshot")
async def get_conversation_snapshot(conversation_id: str) -> dict[str, Any]:
    try:
        return conversation_store.snapshot(conversation_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


def _resolve_plugin(
    workspace_id: Optional[str],
    plugin_id: Optional[str],
) -> tuple[PluginRecord, str]:
    if not workspace_id or not plugin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="workspace and plugin are required",
        )

    plugin = plugin_registry.get_one(workspace_id, plugin_id)
    if not plugin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plugin '{plugin_id}' not found in workspace '{workspace_id}'",
        )

    if not plugin.service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Plugin '{plugin_id}' does not have a service_key configured",
        )

    try:
        service_url = resolver.resolve(plugin.service_key)
    except ServiceResolverError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Plugin service is not configured for key '{plugin.service_key}'",
        ) from exc

    return plugin, service_url


def _normalize_plugin_error_content(content: Any) -> dict[str, Any]:
    if isinstance(content, dict):
        normalized = dict(content)
        normalized.setdefault("code", "PLUGIN_ERROR")
        normalized.setdefault("message", "Plugin service reported an error.")
        normalized.setdefault("retryable", False)
        return normalized

    return {
        "code": "PLUGIN_ERROR",
        "message": str(content) if content is not None else "Plugin service reported an error.",
        "retryable": False,
    }


async def _proxy_plugin_stream(
    plugin: PluginRecord,
    service_url: str,
    conversation_id: str,
    conversation: list[ChatMessage],
    user_inputs: list[UserInputValue],
    user_email: str,
    roles: list[str],
):
    """
    Stream proxy flow:
      1) Build PluginServiceRequest
      2) Persist user message
      3) Stream plugin NDJSON frames to frontend
      4) Persist assistant message (including partial output on failures)
    """
    request_id = str(uuid4())
    conv_messages = [msg.model_dump() for msg in conversation]
    user_input_values = [inp.model_dump() for inp in user_inputs]
    user_message = conv_messages[-1] if conv_messages else {"role": "user", "content": ""}

    plugin_request = PluginServiceRequest(
        request_id=request_id,
        plugin_id=plugin.plugin_id,
        workspace_id=plugin.workspace_id,
        conversation_id=conversation_id,
        user_email=user_email,
        roles=roles,
        conversation=conv_messages,
        user_inputs=user_input_values,
        instructions=plugin.instructions,
        conversation_seed=plugin.get_conversation_seed(),
        user_inputs_schema=plugin.get_user_inputs(),
    )

    # Persist user message immediately so failures still keep user history.
    conversation_store.append_message(
        conversation_id=conversation_id,
        role="user",
        content=user_message.get("content", ""),
        position=max(len(conv_messages) - 1, 0),
    )

    assistant_content = ""
    citations: list[dict] = []
    terminal_error: dict | None = None

    timeout = httpx.Timeout(timeout=None, connect=settings.plugin_stream_connect_timeout_seconds)
    plugin_endpoint = f"{service_url.rstrip('/')}/plugin/response"

    try:
        async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
            async with client.stream(
                "POST",
                plugin_endpoint,
                json=plugin_request.model_dump(),
            ) as response:
                if response.status_code >= 400:
                    body = await response.aread()
                    terminal_error = {
                        "code": "UPSTREAM_HTTP_ERROR",
                        "message": "Plugin service returned a non-success status.",
                        "retryable": response.status_code >= 500,
                        "details": {
                            "status_code": response.status_code,
                            "response_body": body.decode("utf-8", errors="replace"),
                        },
                    }
                    yield ErrorFrame(content=terminal_error).serialize()
                    return

                async for line in response.aiter_lines():
                    if not line:
                        continue

                    try:
                        frame = json.loads(line)
                    except json.JSONDecodeError:
                        terminal_error = {
                            "code": "MALFORMED_UPSTREAM_FRAME",
                            "message": "Plugin service returned malformed stream data.",
                            "retryable": False,
                            "details": {"line": line},
                        }
                        yield ErrorFrame(content=terminal_error).serialize()
                        break

                    frame_type = frame.get("type")
                    if frame_type == "llm":
                        assistant_content += str(frame.get("content", ""))
                        yield line + "\n"
                    elif frame_type == "citation":
                        citations.append(frame.get("content", {}))
                        yield line + "\n"
                    elif frame_type == "error":
                        terminal_error = _normalize_plugin_error_content(frame.get("content"))
                        # Preserve plugin-provided error frame for frontend UX control.
                        normalized_line = ErrorFrame(content=terminal_error).serialize()
                        yield normalized_line
                        break
                    else:
                        pass
    except httpx.ConnectError:
        terminal_error = {
            "code": "UPSTREAM_CONNECTION_ERROR",
            "message": "Could not connect to plugin service.",
            "retryable": True,
            "details": {"service_url": service_url},
        }
        yield ErrorFrame(content=terminal_error).serialize()
    except httpx.ReadError:
        terminal_error = {
            "code": "UPSTREAM_READ_ERROR",
            "message": "Lost connection while reading plugin stream.",
            "retryable": True,
            "details": {"service_url": service_url},
        }
        yield ErrorFrame(content=terminal_error).serialize()
    except httpx.TimeoutException:
        terminal_error = {
            "code": "UPSTREAM_TIMEOUT",
            "message": "Plugin service request timed out.",
            "retryable": True,
            "details": {"service_url": service_url},
        }
        yield ErrorFrame(content=terminal_error).serialize()
    except Exception as exc:  # pragma: no cover - defensive fallback
        terminal_error = {
            "code": "HUB_PROXY_ERROR",
            "message": "Compass Hub failed while proxying plugin response.",
            "retryable": False,
            "details": {"error": str(exc)},
        }
        yield ErrorFrame(content=terminal_error).serialize()
    finally:
        stored_content = assistant_content.strip()
        if not stored_content and terminal_error:
            stored_content = terminal_error.get("message", "Plugin service error.")

        if stored_content or citations or terminal_error:
            conversation_store.append_message(
                conversation_id=conversation_id,
                role="assistant",
                content=stored_content,
                citations=citations,
                error_payload=terminal_error,
                position=len(conv_messages),
            )
