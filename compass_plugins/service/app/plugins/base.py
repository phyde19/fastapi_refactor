from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncGenerator

from app.contracts import BaseFrame, PluginServiceRequest


class PluginHandler(ABC):
    """Base plugin handler interface."""

    @property
    @abstractmethod
    def plugin_ids(self) -> set[str]:
        raise NotImplementedError

    @abstractmethod
    async def stream(self, request: PluginServiceRequest) -> AsyncGenerator[BaseFrame, None]:
        raise NotImplementedError
