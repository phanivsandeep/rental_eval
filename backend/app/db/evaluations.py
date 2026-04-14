from __future__ import annotations
from typing import Any
from app.db.supabase import get_supabase


def create_evaluation(user_id: str, address: str, zip_code: str) -> dict[str, Any]:
    db = get_supabase()
    result = db.table("evaluations").insert({
        "user_id": user_id,
        "address": address,
        "zip_code": zip_code,
        "status": "pending",
        "report": {},
    }).execute()
    return result.data[0]


def update_evaluation_status(evaluation_id: str, status: str) -> None:
    get_supabase().table("evaluations").update({"status": status}).eq("id", evaluation_id).execute()


def save_report(evaluation_id: str, report: dict[str, Any], trace_id: str | None = None) -> None:
    payload: dict[str, Any] = {"status": "complete", "report": report}
    if trace_id:
        payload["trace_id"] = trace_id
    get_supabase().table("evaluations").update(payload).eq("id", evaluation_id).execute()


def list_evaluations(user_id: str) -> list[dict[str, Any]]:
    db = get_supabase()
    result = (
        db.table("evaluations")
        .select("id, address, zip_code, status, created_at, report->overall_score")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def get_evaluation(evaluation_id: str, user_id: str) -> dict[str, Any] | None:
    db = get_supabase()
    result = (
        db.table("evaluations")
        .select("*")
        .eq("id", evaluation_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data


def delete_evaluation(evaluation_id: str, user_id: str) -> bool:
    db = get_supabase()
    result = (
        db.table("evaluations")
        .delete()
        .eq("id", evaluation_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(result.data)
