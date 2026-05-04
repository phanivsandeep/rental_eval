"""
DB helpers for MCP evaluation storage.

Only address + result are stored — no user identity of any kind.
"""
from __future__ import annotations
import re
from typing import Any

from app.db.supabase import get_supabase


def save_mcp_evaluation(address: str, result: dict[str, Any]) -> dict[str, Any]:
    zip_match = re.search(r"\b(\d{5})\b", address)
    zip_code = zip_match.group(1) if zip_match else None
    row = (
        get_supabase()
        .table("mcp_evaluations")
        .insert({"address": address, "zip_code": zip_code, "result": result})
        .execute()
    )
    return row.data[0]


def get_past_mcp_evaluations(address: str, limit: int = 3) -> list[dict[str, Any]]:
    """Return recent stored results for the same address (fuzzy match)."""
    rows = (
        get_supabase()
        .table("mcp_evaluations")
        .select("id, address, result, created_at")
        .ilike("address", f"%{address}%")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return rows.data or []
