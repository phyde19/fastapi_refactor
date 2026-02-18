from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class UserInputValue(BaseModel):
    name: str
    value: Any


class PluginServiceRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    request_id: str
    plugin_id: str
    workspace_id: str
    conversation_id: str
    user_email: str
    roles: list[str]
    conversation: list[ConversationMessage]
    user_inputs: list[UserInputValue]
    instructions: str
    conversation_seed: list[ConversationMessage]
    user_inputs_schema: list[dict[str, Any]]


class BaseFrame(BaseModel):
    def serialize(self) -> str:
        return f"{self.model_dump_json()}\n"


class LLMFrame(BaseFrame):
    type: Literal["llm"] = "llm"
    content: str


class CitationFrame(BaseFrame):
    type: Literal["citation"] = "citation"
    content: dict[str, Any]


class ErrorFrame(BaseFrame):
    type: Literal["error"] = "error"
    content: dict[str, Any] = Field(default_factory=dict)
