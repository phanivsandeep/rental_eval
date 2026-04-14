from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Any
from app.db.supabase import get_supabase
from app.config import get_settings


def get_cached(zip_code: str) -> dict[str, Any] | None:
    db = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    result = (
        db.table("neighborhood_cache")
        .select("data")
        .eq("zip_code", zip_code)
        .gt("expires_at", now)
        .maybe_single()
        .execute()
    )
    return result.data["data"] if result.data else None


def set_cached(zip_code: str, data: dict[str, Any]) -> None:
    ttl = get_settings().cache_ttl_hours
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=ttl)).isoformat()
    db = get_supabase()
    db.table("neighborhood_cache").upsert({
        "zip_code": zip_code,
        "data": data,
        "expires_at": expires_at,
    }).execute()
