import logging
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

REQUIRED_FOR_EVAL = [
    "tavily_api_key",
    "google_maps_api_key",
    "openweather_api_key",
    "walkscore_api_key",
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

    def warn_missing(self) -> None:
        """Log warnings for missing keys at startup — never raises."""
        for key in REQUIRED_FOR_EVAL:
            if not getattr(self, key):
                logger.warning(
                    "Missing env var: %s — related agent tools will return 'unavailable'.",
                    key.upper(),
                )
        if not self.cookie_secret:
            logger.warning("COOKIE_SECRET not set — API key encryption will fail at runtime.")
        if not self.supabase_url or not self.supabase_service_key:
            logger.warning("Supabase credentials missing — DB operations will fail.")


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.warn_missing()
    return s
