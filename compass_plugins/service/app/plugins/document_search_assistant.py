from __future__ import annotations

from typing import AsyncGenerator

from app.contracts import BaseFrame, CitationFrame, ErrorFrame, LLMFrame, PluginServiceRequest
from app.plugins.base import PluginHandler
from app.services.llm import llm_service
from app.services.vector_search import vector_search_service


def _include_citations(request: PluginServiceRequest) -> bool:
    for item in request.user_inputs:
        if item.name == "include_citations":
            return bool(item.value)
    return True


def _build_context_block(citations: list[dict]) -> str:
    if not citations:
        return ""

    lines = ["Relevant context snippets:"]
    for row in citations:
        lines.append(f"- [{row.get('index', 0)}] {row.get('chunk_text', '')}")
    return "\n".join(lines)


class DocumentSearchAssistantHandler(PluginHandler):
    @property
    def plugin_ids(self) -> set[str]:
        return {"dscoe_search_assistant", "document_search_assistant"}

    async def stream(self, request: PluginServiceRequest) -> AsyncGenerator[BaseFrame, None]:
        include_citations = _include_citations(request)
        messages = [msg.model_dump() for msg in request.conversation]

        if request.conversation_seed:
            seed_messages = [msg.model_dump() for msg in request.conversation_seed]
            messages = seed_messages + messages

        user_prompt = messages[-1]["content"] if messages else ""
        citations = vector_search_service.search(query=user_prompt, plugin_id=request.plugin_id)

        # Inject retrieved context as a system message for better grounding.
        context_block = _build_context_block(citations)
        if context_block:
            messages = [{"role": "system", "content": context_block}] + messages

        try:
            async for chunk in llm_service.stream_chat(messages, instructions=request.instructions):
                yield LLMFrame(content=chunk)

            if include_citations:
                for citation in citations:
                    yield CitationFrame(content=citation)
        except Exception as exc:
            yield ErrorFrame(
                content={
                    "code": "PLUGIN_EXECUTION_ERROR",
                    "message": "Document search assistant failed to complete the request.",
                    "retryable": False,
                    "details": {"error": str(exc)},
                }
            )
