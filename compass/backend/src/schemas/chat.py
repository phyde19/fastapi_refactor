from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class UserInputValue(BaseModel):
    name: str
    value: Any


class ChatCompletionRequest(BaseModel):
    workspace: Optional[str] = None
    plugin: Optional[str] = None
    conversation: list[ChatMessage]
    user_inputs: list[UserInputValue] = Field(default_factory=list)
