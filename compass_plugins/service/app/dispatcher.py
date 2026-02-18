from __future__ import annotations

from typing import AsyncGenerator

from app.contracts import BaseFrame, ErrorFrame, PluginServiceRequest
from app.plugins.base import PluginHandler
from app.plugins.compass_assistant import CompassAssistantHandler
from app.plugins.document_search_assistant import DocumentSearchAssistantHandler


class UnknownPluginHandler(PluginHandler):
    @property
    def plugin_ids(self) -> set[str]:
        return set()

    async def stream(self, request: PluginServiceRequest) -> AsyncGenerator[BaseFrame, None]:
        yield ErrorFrame(
            content={
                "code": "UNKNOWN_PLUGIN",
                "message": f"Plugin '{request.plugin_id}' is not registered in this service.",
                "retryable": False,
            }
        )


class PluginDispatcher:
    def __init__(self) -> None:
        handlers: list[PluginHandler] = [
            CompassAssistantHandler(),
            DocumentSearchAssistantHandler(),
        ]
        mapping: dict[str, PluginHandler] = {}
        for handler in handlers:
            for plugin_id in handler.plugin_ids:
                mapping[plugin_id] = handler
        self._handlers = mapping
        self._unknown = UnknownPluginHandler()

    def resolve(self, plugin_id: str) -> PluginHandler:
        return self._handlers.get(plugin_id, self._unknown)


dispatcher = PluginDispatcher()
