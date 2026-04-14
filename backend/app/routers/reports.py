from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_session_id
from app.db import users as users_db
from app.db import evaluations as eval_db

router = APIRouter()


def _get_user_id(session_id: str) -> str:
    user = users_db.get_or_create_user(session_id)
    return user["id"]


@router.get("/reports")
def list_reports(session_id: str = Depends(get_session_id)):
    user_id = _get_user_id(session_id)
    rows = eval_db.list_evaluations(user_id)
    reports = [
        {
            "id": r["id"],
            "address": r["address"],
            "overall_score": r.get("overall_score"),
            "status": r["status"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]
    return {"reports": reports}


@router.get("/reports/{evaluation_id}")
def get_report(evaluation_id: str, session_id: str = Depends(get_session_id)):
    user_id = _get_user_id(session_id)
    row = eval_db.get_evaluation(evaluation_id, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Report not found.")
    return {
        "id": row["id"],
        "address": row["address"],
        "report": row["report"],
        "status": row["status"],
        "created_at": row["created_at"],
    }


@router.delete("/reports/{evaluation_id}")
def delete_report(evaluation_id: str, session_id: str = Depends(get_session_id)):
    user_id = _get_user_id(session_id)
    deleted = eval_db.delete_evaluation(evaluation_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Report not found.")
    return {"success": True}
