from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from config.settings import settings

logger = logging.getLogger("compass.service_resolver")


class ServiceResolverError(ValueError):
    """Raised when a service_key cannot be resolved to a URL."""


def _normalize_service_key(value: str) -> str:
    # Keep canonical key shape across env vars + files + registry values.
    return value.strip().lower().replace("-", "_")


def _resolve_path(raw_path: str) -> Path:
    path = Path(raw_path).expanduser()
    return path if path.is_absolute() else (Path.cwd() / path)


class ServiceResolver:
    """
    Resolves service_key -> service_url.

    Precedence:
    1) SERVICE_URL_* env vars
    2) PLUGIN_SERVICES_LOCAL_FILE (DEV only)
    3) unresolved (raises)
    """

    def __init__(self) -> None:
        self._map: dict[str, str] = {}
        self.reload()

    def reload(self) -> None:
        self._map = {}

        # DEV can load local file mapping first.
        if settings.is_dev:
            self._load_dev_file()

        # Env vars always win.
        self._load_env_overrides()

    def resolve(self, service_key: str) -> str:
        normalized = _normalize_service_key(service_key)
        url = self._map.get(normalized)
        if not url:
            raise ServiceResolverError(
                f"No URL configured for service_key='{service_key}' "
                f"(COMPASS_ENV={settings.compass_env})."
            )
        return url

    def is_configured(self, service_key: str | None) -> bool:
        if not service_key:
            return False
        return _normalize_service_key(service_key) in self._map

    def mapping(self) -> dict[str, str]:
        return dict(self._map)

    def _load_dev_file(self) -> None:
        services_path = _resolve_path(settings.plugin_services_local_file)
        if not services_path.exists():
            logger.warning(
                "No local services file found at '%s'. "
                "Only SERVICE_URL_* env vars will be used.",
                services_path,
            )
            return

        try:
            data = json.loads(services_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"Invalid JSON in PLUGIN_SERVICES_LOCAL_FILE: {services_path}"
            ) from exc

        services = data.get("services", [])
        if not isinstance(services, list):
            raise RuntimeError(
                f"Invalid services config in {services_path}: expected 'services' list."
            )

        for item in services:
            if not isinstance(item, dict):
                continue
            raw_key = str(item.get("service_key", "")).strip()
            raw_url = str(item.get("service_url", "")).strip()
            if not raw_key or not raw_url:
                continue
            self._map[_normalize_service_key(raw_key)] = raw_url

    def _load_env_overrides(self) -> None:
        prefix = "SERVICE_URL_"
        for env_name, env_value in os.environ.items():
            if not env_name.startswith(prefix):
                continue
            if not env_value.strip():
                continue
            # SERVICE_URL_COMPASS_PLUGINS -> compass_plugins
            key = _normalize_service_key(env_name[len(prefix):])
            self._map[key] = env_value.strip()


resolver = ServiceResolver()
