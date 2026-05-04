import logging
import sys
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

REQUIRED_FOR_EVAL = [
    "tavily_api_key",
    "google_maps_api_key",
    "openweather_api_key",
    "walkscore_api_key",
]

REQUIRED_FOR_STARTUP = [
    "cookie_secret",
    "supabase_url",
    "supabase_service_key",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Security
    cookie_secret: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""

    # External APIs
    yelp_api_key: str = ""
    google_maps_api_key: str = ""
    spotcrime_api_key: str = ""   # on hold — not required
    openweather_api_key: str = ""
    epa_api_key: str = ""
    walkscore_api_key: str = ""
    tavily_api_key: str = ""

    # LangSmith
    langsmith_api_key: str = ""
    langsmith_project: str = "rental-evaluator"
    langsmith_tracing: bool = True

    # App
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"
    rate_limit_per_hour: int = 10
    cache_ttl_hours: int = 24

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    def validate_startup(self) -> None:
        """Hard-fail on missing critical env vars. Call once at startup."""
        missing = [k for k in REQUIRED_FOR_STARTUP if not getattr(self, k)]
        if missing:
            for k in missing:
                logger.critical("MISSING required env var: %s", k.upper())
            sys.exit(
                f"Aborting startup — set these env vars first: "
                f"{', '.join(k.upper() for k in missing)}"
            )

    def warn_missing(self) -> None:
        """Log warnings for optional API keys that degrade features when absent."""
        for key in REQUIRED_FOR_EVAL:
            if not getattr(self, key):
                logger.warning(
                    "Missing env var: %s — related agent tools will return 'unavailable'.",
                    key.upper(),
                )


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.warn_missing()
    return s
