from typing import Any, Literal

from pydantic import BaseModel


class PluginServiceRequest(BaseModel):
    """
    Contract between Compass Hub and plugin service.

    Contract version v1 is the first stable external plugin contract.
    """

    contract_version: Literal["v1"] = "v1"
    request_id: str
    plugin_id: str
    workspace_id: str
    conversation_id: str
    user_email: str
    roles: list[str]
    conversation: list[dict[str, str]]
    user_inputs: list[dict[str, Any]]
    instructions: str
    conversation_seed: list[dict[str, str]]
    user_inputs_schema: list[dict[str, Any]]
