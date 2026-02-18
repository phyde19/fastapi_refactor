from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


CompassEnv = Literal["DEV", "STAGING", "PROD"]
PluginRegistrySource = Literal["local", "databricks", "overlay"]


class Settings(BaseSettings):
    """Runtime settings for the refactored Compass Hub."""

    api_name: str = "Compass API (Refactor)"
    enforce_role_checks: bool = True

    # Primary environment switch
    compass_env: CompassEnv = "DEV"

    # DEV-only plugin registry source switch
    plugin_registry_source: PluginRegistrySource = "databricks"
    plugin_services_local_file: str = "./services.local.json"
    plugin_registry_local_file: str = "./plugins.local.json"

    # Redis (sessions on DB0, plugin cache on DB1)
    redis_host: str = "127.0.0.1"
    redis_port: int = 6379
    redis_session_db: int = 0
    redis_plugin_cache_db: int = 1

    # Databricks
    databricks_workspace_url: str = ""
    databricks_http_path: str = ""
    databricks_token: str = ""
    databricks_plugins_table: str = "devctzndsa.compass.plugin_registry"

    # Proxy behavior
    plugin_stream_connect_timeout_seconds: float = 10.0

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent.parent / ".env",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def is_dev(self) -> bool:
        return self.compass_env == "DEV"

    @field_validator("compass_env", mode="before")
    @classmethod
    def normalize_compass_env(cls, value: str) -> str:
        return str(value).strip().upper()

    @field_validator("plugin_registry_source", mode="before")
    @classmethod
    def normalize_registry_source(cls, value: str) -> str:
        return str(value).strip().lower()

    @model_validator(mode="after")
    def validate_environment_contract(self) -> "Settings":
        """
        Enforce the agreed contract:
        - COMPASS_ENV is DEV/STAGING/PROD
        - PLUGIN_REGISTRY_SOURCE is only meaningful in DEV
        - STAGING/PROD always use databricks registry source
        """
        if not self.is_dev and self.plugin_registry_source != "databricks":
            raise ValueError(
                "PLUGIN_REGISTRY_SOURCE must be 'databricks' when COMPASS_ENV is STAGING or PROD."
            )

        if self.is_dev and self.plugin_registry_source in {"local", "overlay"}:
            if not self.plugin_registry_local_file.strip():
                raise ValueError(
                    "PLUGIN_REGISTRY_LOCAL_FILE is required when "
                    "PLUGIN_REGISTRY_SOURCE is 'local' or 'overlay'."
                )

        if self.is_dev and not self.plugin_services_local_file.strip():
            raise ValueError("PLUGIN_SERVICES_LOCAL_FILE is required when COMPASS_ENV is DEV.")

        return self


settings = Settings()
