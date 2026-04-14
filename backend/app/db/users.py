from __future__ import annotations
from typing import Any
from app.db.supabase import get_supabase


def get_or_create_user(session_id: str) -> dict[str, Any]:
    """Return the user row, creating one if it doesn't exist."""
    db = get_supabase()
    result = db.table("users").select("*").eq("session_id", session_id).maybe_single().execute()
    if result.data:
        return result.data
    created = db.table("users").insert({"session_id": session_id, "profile": {}}).execute()
    return created.data[0]


def get_profile(session_id: str) -> dict[str, Any]:
    db = get_supabase()
    result = db.table("users").select("profile").eq("session_id", session_id).maybe_single().execute()
    return result.data["profile"] if result.data else {}


def upsert_profile(session_id: str, profile: dict[str, Any]) -> dict[str, Any]:
    db = get_supabase()
    # Ensure user exists
    user = get_or_create_user(session_id)
    db.table("users").update({"profile": profile}).eq("id", user["id"]).execute()
    return profile
