"""
Plugin Registry access layer with source switching.

Supported sources:
  - databricks: Databricks source of truth with Redis read cache
  - local:      plugins.local.json only (DEV)
  - overlay:    Databricks + local overlay (local wins by ws/plugin key)
"""

from __future__ import annotations

import json
import logging
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import redis

from config.settings import settings
from plugin_registry.models import PluginRecord, PluginUpdate, WorkspaceGroup

logger = logging.getLogger("compass.plugin_registry")


CACHE_READY_KEY = "plugins_config_ready"
INDEX_KEY = "plugins:index"


class PluginRegistry:
    """Centralized plugin read/write access with environment-aware source selection."""

    def __init__(
        self,
        redis_host: str = settings.redis_host,
        redis_port: int = settings.redis_port,
        redis_db: int = settings.redis_plugin_cache_db,
        databricks_url: str = settings.databricks_workspace_url,
        databricks_http_path: str = settings.databricks_http_path,
        databricks_token: str = settings.databricks_token,
        table_name: str = settings.databricks_plugins_table,
        source: str = settings.plugin_registry_source,
        local_file: str = settings.plugin_registry_local_file,
    ):
        self._source = source
        self._local_file = local_file

        self._redis: redis.Redis | None = None
        if self._source in {"databricks", "overlay"}:
            self._redis = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                decode_responses=True,
            )

        self._db_url = databricks_url
        self._db_http_path = databricks_http_path
        self._db_token = databricks_token
        self._table = table_name

        # Local source cache (read-through by file mtime)
        self._local_cache: list[PluginRecord] = []
        self._local_cache_index: dict[tuple[str, str], PluginRecord] = {}
        self._local_cache_mtime: float | None = None

    @property
    def source(self) -> str:
        return self._source

    # ======================================================================
    # PUBLIC READS
    # ======================================================================

    def get_all(self) -> list[PluginRecord]:
        if self._source == "local":
            return self._sorted_plugins(self._load_local_plugins())
        if self._source == "overlay":
            return self._sorted_plugins(self._merge_overlay_plugins())
        return self._sorted_plugins(self._get_all_from_databricks_cache())

    def get_one(self, workspace_id: str, plugin_id: str) -> Optional[PluginRecord]:
        if self._source == "local":
            return self._get_local_one(workspace_id, plugin_id)

        if self._source == "overlay":
            local_hit = self._get_local_one(workspace_id, plugin_id)
            if local_hit:
                return local_hit
            return self._get_one_from_databricks_cache(workspace_id, plugin_id)

        return self._get_one_from_databricks_cache(workspace_id, plugin_id)

    def get_grouped(
        self,
        workspace_filter: Optional[set[str]] = None,
        enabled_only: bool = False,
    ) -> list[WorkspaceGroup]:
        plugins = self.get_all()
        groups: OrderedDict[str, WorkspaceGroup] = OrderedDict()

        for plugin in plugins:
            if workspace_filter is not None and plugin.workspace_id not in workspace_filter:
                continue
            if enabled_only and not plugin.enabled:
                continue

            if plugin.workspace_id not in groups:
                groups[plugin.workspace_id] = WorkspaceGroup(
                    workspace_id=plugin.workspace_id,
                    workspace_name=plugin.workspace_name,
                    workspace_description=plugin.workspace_description,
                    plugins=[],
                )
            groups[plugin.workspace_id].plugins.append(plugin)

        return list(groups.values())

    # ======================================================================
    # PUBLIC WRITES
    # ======================================================================

    def update(
        self,
        workspace_id: str,
        plugin_id: str,
        update: PluginUpdate,
    ) -> PluginRecord:
        """
        Update admin-editable plugin columns in Databricks.

        local source:
          - read-only (no writes)
        overlay source:
          - Databricks records are writable
          - local overlay records are read-only in API context
        """
        if self._source == "local":
            raise RuntimeError("Plugin updates are disabled when PLUGIN_REGISTRY_SOURCE=local.")

        if self._source == "overlay":
            local_hit = self._get_local_one(workspace_id, plugin_id)
            if local_hit is not None:
                raise RuntimeError(
                    "Cannot update local overlay plugin through API. "
                    "Edit PLUGIN_REGISTRY_LOCAL_FILE instead."
                )

        existing = self._get_one_from_databricks_cache(workspace_id, plugin_id)
        if not existing:
            raise LookupError(f"Plugin {workspace_id}/{plugin_id} not found")

        now = datetime.now(timezone.utc).isoformat()
        updated_by = update.updated_by or "system"

        set_clauses = ["updated_by = ?", "updated_at = ?"]
        params: list[Any] = [updated_by, now]

        if update.plugin_name is not None:
            set_clauses.append("plugin_name = ?")
            params.append(update.plugin_name)

        if update.description is not None:
            set_clauses.append("description = ?")
            params.append(update.description)

        if update.instructions is not None:
            set_clauses.append("instructions = ?")
            params.append(update.instructions)

        params.extend([workspace_id, plugin_id])

        query = f"""
            UPDATE {self._table}
            SET {', '.join(set_clauses)}
            WHERE workspace_id = ? AND plugin_id = ?
        """

        self._execute(query, params)
        logger.info("Updated plugin %s/%s by %s", workspace_id, plugin_id, updated_by)

        updated_record = self._read_one_from_db(workspace_id, plugin_id)
        self._cache_one(updated_record)
        return updated_record

    # ======================================================================
    # PUBLIC CACHE CONTROL
    # ======================================================================

    def invalidate_cache(self) -> None:
        if self._source == "local":
            self._local_cache_mtime = None
            logger.info("Local plugin registry cache invalidated")
            return

        if self._redis is None:
            return

        self._redis.delete(CACHE_READY_KEY)
        logger.info("Databricks plugin registry cache invalidated")

    def warm_cache(self) -> int:
        if self._source == "local":
            return len(self._load_local_plugins())
        return self._hydrate_cache()

    # ======================================================================
    # PRIVATE — Source composition
    # ======================================================================

    def _merge_overlay_plugins(self) -> list[PluginRecord]:
        databricks_plugins = self._get_all_from_databricks_cache()
        merged: dict[tuple[str, str], PluginRecord] = {
            (p.workspace_id, p.plugin_id): p for p in databricks_plugins
        }

        for local_plugin in self._load_local_plugins():
            merged[(local_plugin.workspace_id, local_plugin.plugin_id)] = local_plugin

        return list(merged.values())

    @staticmethod
    def _sorted_plugins(plugins: list[PluginRecord]) -> list[PluginRecord]:
        plugins.sort(key=lambda p: (p.workspace_id, p.position, p.plugin_id))
        return plugins

    # ======================================================================
    # PRIVATE — Local file source
    # ======================================================================

    def _get_local_one(self, workspace_id: str, plugin_id: str) -> Optional[PluginRecord]:
        self._load_local_plugins()
        return self._local_cache_index.get((workspace_id, plugin_id))

    def _load_local_plugins(self) -> list[PluginRecord]:
        local_path = self._resolve_local_path(self._local_file)
        exists = local_path.exists()

        if not exists and self._source == "local":
            raise RuntimeError(
                f"PLUGIN_REGISTRY_LOCAL_FILE does not exist: {local_path}. "
                "Create it or switch PLUGIN_REGISTRY_SOURCE."
            )

        if not exists:
            # overlay with no local file is valid; behaves like databricks-only
            self._local_cache = []
            self._local_cache_index = {}
            self._local_cache_mtime = None
            return []

        mtime = local_path.stat().st_mtime
        if self._local_cache_mtime is not None and mtime == self._local_cache_mtime:
            return list(self._local_cache)

        try:
            raw_data = json.loads(local_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Invalid JSON in local plugin registry file: {local_path}") from exc

        plugins_payload = raw_data.get("plugins", [])
        if not isinstance(plugins_payload, list):
            raise RuntimeError(
                f"Invalid local plugin registry format in {local_path}: expected 'plugins' list."
            )

        plugins: list[PluginRecord] = []
        for idx, payload in enumerate(plugins_payload):
            if not isinstance(payload, dict):
                raise RuntimeError(
                    f"Invalid plugin at index {idx} in {local_path}: expected object."
                )
            plugins.append(PluginRecord.from_payload(payload))

        self._local_cache = plugins
        self._local_cache_index = {(p.workspace_id, p.plugin_id): p for p in plugins}
        self._local_cache_mtime = mtime

        logger.info("Loaded %d plugins from local registry file %s", len(plugins), local_path)
        return list(self._local_cache)

    @staticmethod
    def _resolve_local_path(raw_path: str) -> Path:
        path = Path(raw_path).expanduser()
        return path if path.is_absolute() else (Path.cwd() / path)

    # ======================================================================
    # PRIVATE — Databricks + Redis source
    # ======================================================================

    def _get_all_from_databricks_cache(self) -> list[PluginRecord]:
        self._ensure_cache()
        if self._redis is None:
            return []

        keys = sorted(self._redis.smembers(INDEX_KEY))
        plugins: list[PluginRecord] = []
        for key in keys:
            raw = self._redis.get(key)
            if raw:
                plugins.append(PluginRecord.model_validate_json(raw))
        return plugins

    def _get_one_from_databricks_cache(
        self, workspace_id: str, plugin_id: str
    ) -> Optional[PluginRecord]:
        self._ensure_cache()
        if self._redis is None:
            return None

        raw = self._redis.get(self._cache_key(workspace_id, plugin_id))
        if raw:
            return PluginRecord.model_validate_json(raw)
        return None

    def _ensure_cache(self) -> None:
        if self._redis is None:
            return
        if self._redis.exists(CACHE_READY_KEY):
            return
        self._hydrate_cache()

    def _hydrate_cache(self) -> int:
        if self._redis is None:
            return 0

        plugins = self._read_all_from_db()
        self._redis.delete(INDEX_KEY)
        for plugin in plugins:
            self._cache_one(plugin)
        self._redis.set(CACHE_READY_KEY, datetime.now(timezone.utc).isoformat())
        logger.info("Plugin registry cache hydrated: %d plugins", len(plugins))
        return len(plugins)

    def _cache_one(self, plugin: PluginRecord) -> None:
        if self._redis is None:
            return
        key = self._cache_key(plugin.workspace_id, plugin.plugin_id)
        self._redis.set(key, plugin.model_dump_json())
        self._redis.sadd(INDEX_KEY, key)

    @staticmethod
    def _cache_key(workspace_id: str, plugin_id: str) -> str:
        return f"plugin:{workspace_id}:{plugin_id}"

    # ======================================================================
    # PRIVATE — Databricks access
    # ======================================================================

    def _connect(self):
        if not all([self._db_url, self._db_http_path, self._db_token]):
            raise RuntimeError(
                "Databricks credentials not fully configured. "
                "Set databricks_workspace_url, databricks_http_path, databricks_token."
            )

        try:
            from databricks import sql as databricks_sql
        except Exception as exc:  # pragma: no cover - import environment dependent
            raise RuntimeError(
                "databricks-sql-connector is not installed but databricks mode is active."
            ) from exc

        return databricks_sql.connect(
            server_hostname=self._db_url,
            http_path=self._db_http_path,
            access_token=self._db_token,
        )

    def _execute(self, query: str, params: list[Any] | None = None) -> None:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params or [])

    def _fetch_rows(self, query: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params or [])
            rows = cursor.fetchall()
            columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]

    def _read_all_from_db(self) -> list[PluginRecord]:
        rows = self._fetch_rows(f"SELECT * FROM {self._table}")
        return [PluginRecord.from_payload(row) for row in rows]

    def _read_one_from_db(self, workspace_id: str, plugin_id: str) -> PluginRecord:
        rows = self._fetch_rows(
            f"SELECT * FROM {self._table} WHERE workspace_id = ? AND plugin_id = ?",
            [workspace_id, plugin_id],
        )
        if not rows:
            raise LookupError(
                f"Plugin {workspace_id}/{plugin_id} not found in Databricks table {self._table}"
            )
        return PluginRecord.from_payload(rows[0])


plugin_registry = PluginRegistry()
