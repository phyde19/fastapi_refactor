from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    plugin_service_name: str = "compass-plugins"
    plugin_service_port: int = 5002

    # Azure OpenAI
    azure_openai_api_key: str = ""
    azure_openai_api_version: str = "2024-06-01"
    azure_openai_endpoint: str = ""
    azure_openai_model: str = "gpt-4o-mini"

    # Databricks vector search
    databricks_host: str = ""
    databricks_token: str = ""
    databricks_vector_search_endpoint: str = ""
    databricks_vector_search_index: str = ""
    vector_search_top_k: int = 3

    allow_mock_llm: bool = True

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent.parent.parent / ".env",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("vector_search_top_k")
    @classmethod
    def validate_top_k(cls, value: int) -> int:
        return max(1, min(value, 20))

    @property
    def has_azure_llm(self) -> bool:
        return bool(self.azure_openai_api_key and self.azure_openai_endpoint)

    @property
    def has_vector_search(self) -> bool:
        return bool(
            self.databricks_host
            and self.databricks_token
            and self.databricks_vector_search_endpoint
            and self.databricks_vector_search_index
        )


settings = Settings()
