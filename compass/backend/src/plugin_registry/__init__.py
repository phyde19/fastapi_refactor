"""Plugin registry access layer."""

from plugin_registry.models import PluginRecord, PluginUpdate, WorkspaceGroup
from plugin_registry.registry import PluginRegistry, plugin_registry

__all__ = [
    "PluginRecord",
    "PluginUpdate",
    "WorkspaceGroup",
    "PluginRegistry",
    "plugin_registry",
]
