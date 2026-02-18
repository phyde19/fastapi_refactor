from typing import Any

from app.config.settings import settings


def _safe_preview(text: str, limit: int = 180) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def _extract_rows(raw_result: Any) -> list[dict[str, Any]]:
    """
    Convert Vector Search result shape into a uniform list of dict rows.

    The Databricks SDK can return slightly different result shapes depending on
    endpoint/index settings, so this helper is defensive.
    """
    if isinstance(raw_result, list):
        return [row for row in raw_result if isinstance(row, dict)]

    if not isinstance(raw_result, dict):
        return []

    if isinstance(raw_result.get("result"), dict):
        result = raw_result["result"]
        if isinstance(result.get("data_array"), list):
            columns = result.get("manifest", {}).get("columns", [])
            column_names = [col.get("name") for col in columns if isinstance(col, dict)]
            rows: list[dict[str, Any]] = []
            for values in result["data_array"]:
                if isinstance(values, list) and column_names:
                    rows.append(dict(zip(column_names, values)))
            return rows

    if isinstance(raw_result.get("data_array"), list):
        rows = []
        for row in raw_result["data_array"]:
            if isinstance(row, dict):
                rows.append(row)
        return rows

    return []


class VectorSearchService:
    """Databricks Vector Search adapter used by search-oriented plugins."""

    def __init__(self) -> None:
        self._client = None
        if settings.has_vector_search:
            try:
                from databricks.vector_search.client import VectorSearchClient
            except Exception:  # pragma: no cover
                self._client = None
            else:
                self._client = VectorSearchClient(
                    workspace_url=settings.databricks_host,
                    personal_access_token=settings.databricks_token,
                )

    @property
    def is_configured(self) -> bool:
        return self._client is not None and settings.has_vector_search

    def search(self, query: str, plugin_id: str) -> list[dict[str, Any]]:
        if not self.is_configured:
            return []

        try:
            index = self._client.get_index(
                endpoint_name=settings.databricks_vector_search_endpoint,
                index_name=settings.databricks_vector_search_index,
            )

            # API signature differs by SDK versions; use keyword style that is
            # compatible with current releases and fail gracefully if mismatched.
            raw = index.similarity_search(
                query_text=query,
                num_results=settings.vector_search_top_k,
                filters={"plugin_id": plugin_id},
            )
            rows = _extract_rows(raw)
        except Exception:
            return []

        citations: list[dict[str, Any]] = []
        for i, row in enumerate(rows):
            chunk_text = str(row.get("chunk_text") or row.get("text") or "")
            source = str(row.get("source") or row.get("document_name") or "Databricks source")
            similarity_raw = row.get("score") or row.get("similarity")
            similarity = float(similarity_raw) if isinstance(similarity_raw, (int, float)) else None
            citations.append(
                {
                    "index": i,
                    "source": source,
                    "chunk_text": chunk_text,
                    "preview": _safe_preview(chunk_text),
                    "similarity": similarity,
                }
            )

        return citations


vector_search_service = VectorSearchService()
