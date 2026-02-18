from typing import Any, Literal

from pydantic import BaseModel


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
    content: dict[str, Any]
