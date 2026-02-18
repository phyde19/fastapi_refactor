from __future__ import annotations

import json
from dataclasses import dataclass, field
from threading import Lock
from typing import Optional
from uuid import uuid4


@dataclass
class MessageRecord:
    role: str
    content: str
    position: int
    citations_json: str = "[]"
    error_json: str | None = None


@dataclass
class ConversationRecord:
    id: str
    title: str
    messages: list[MessageRecord] = field(default_factory=list)


class ConversationStore:
    """
    In-memory persistence for scaffold execution.

    Real Compass integration should replace this with DB entity adapters.
    """

    def __init__(self) -> None:
        self._lock = Lock()
        self._conversations: dict[str, ConversationRecord] = {}

    def create_conversation(self, title: str) -> ConversationRecord:
        with self._lock:
            conv = ConversationRecord(id=str(uuid4()), title=title)
            self._conversations[conv.id] = conv
            return conv

    def get_conversation(self, conversation_id: str) -> Optional[ConversationRecord]:
        with self._lock:
            return self._conversations.get(conversation_id)

    def append_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        position: int,
        citations: list[dict] | None = None,
        error_payload: dict | None = None,
    ) -> MessageRecord:
        with self._lock:
            conv = self._conversations.get(conversation_id)
            if conv is None:
                raise LookupError(f"Conversation not found: {conversation_id}")

            message = MessageRecord(
                role=role,
                content=content,
                position=position,
                citations_json=json.dumps(citations or []),
                error_json=json.dumps(error_payload) if error_payload else None,
            )
            conv.messages.append(message)
            return message

    def snapshot(self, conversation_id: str) -> dict:
        with self._lock:
            conv = self._conversations.get(conversation_id)
            if conv is None:
                raise LookupError(f"Conversation not found: {conversation_id}")

            return {
                "id": conv.id,
                "title": conv.title,
                "messages": [
                    {
                        "role": m.role,
                        "content": m.content,
                        "position": m.position,
                        "citations_json": m.citations_json,
                        "error_json": m.error_json,
                    }
                    for m in sorted(conv.messages, key=lambda row: row.position)
                ],
            }


conversation_store = ConversationStore()
