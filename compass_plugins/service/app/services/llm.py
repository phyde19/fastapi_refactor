from typing import AsyncGenerator

from app.config.settings import settings


def _build_prompt(conversation: list[dict[str, str]], instructions: str) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    if instructions.strip():
        messages.append({"role": "system", "content": instructions.strip()})
    messages.extend(conversation)
    return messages


async def _stream_mock_response(user_prompt: str) -> AsyncGenerator[str, None]:
    text = (
        "Mock response from compass_plugins service. "
        f"Received prompt: {user_prompt[:300]}"
    )
    for token in text.split(" "):
        yield token + " "


class LLMService:
    """LLM streaming abstraction with Azure primary and mock fallback."""

    def __init__(self) -> None:
        self._client = None
        if settings.has_azure_llm:
            try:
                from openai import AsyncAzureOpenAI
            except Exception:  # pragma: no cover
                self._client = None
            else:
                self._client = AsyncAzureOpenAI(
                    api_key=settings.azure_openai_api_key,
                    api_version=settings.azure_openai_api_version,
                    azure_endpoint=settings.azure_openai_endpoint,
                )

    async def stream_chat(
        self,
        conversation: list[dict[str, str]],
        instructions: str = "",
    ) -> AsyncGenerator[str, None]:
        messages = _build_prompt(conversation, instructions)

        if self._client is not None:
            stream = await self._client.chat.completions.create(
                model=settings.azure_openai_model,
                messages=messages,  # type: ignore[arg-type]
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                text = chunk.choices[0].delta.content
                if text:
                    yield text
            return

        if settings.allow_mock_llm:
            user_prompt = conversation[-1]["content"] if conversation else "hello"
            async for chunk in _stream_mock_response(user_prompt):
                yield chunk
            return

        raise RuntimeError("No LLM provider configured and ALLOW_MOCK_LLM=false.")


llm_service = LLMService()
