from typing import AsyncGenerator

from app.contracts import BaseFrame, ErrorFrame, LLMFrame, PluginServiceRequest
from app.plugins.base import PluginHandler
from app.services.llm import llm_service


class CompassAssistantHandler(PluginHandler):
    @property
    def plugin_ids(self) -> set[str]:
        return {"compass_assistant"}

    async def stream(self, request: PluginServiceRequest) -> AsyncGenerator[BaseFrame, None]:
        messages = [msg.model_dump() for msg in request.conversation]

        # Keep conversation_seed separate at contract level, but use it as an
        # optional context prepend for plugin behavior.
        if request.conversation_seed:
            seed_messages = [msg.model_dump() for msg in request.conversation_seed]
            messages = seed_messages + messages

        try:
            async for chunk in llm_service.stream_chat(messages, instructions=request.instructions):
                yield LLMFrame(content=chunk)
        except Exception as exc:
            yield ErrorFrame(
                content={
                    "code": "PLUGIN_EXECUTION_ERROR",
                    "message": "Compass assistant failed to complete the request.",
                    "retryable": False,
                    "details": {"error": str(exc)},
                }
            )
