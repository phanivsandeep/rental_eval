from typing import Any
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from app.middleware.auth import get_session_id
from app.db import users as users_db

router = APIRouter()


class ProfileRequest(BaseModel):
    profile: dict[str, Any]


@router.get("/profile")
def get_profile(session_id: str = Depends(get_session_id)):
    profile = users_db.get_profile(session_id)
    return {"profile": profile}


@router.post("/profile")
def save_profile(body: ProfileRequest, session_id: str = Depends(get_session_id)):
    updated = users_db.upsert_profile(session_id, body.profile)
    return {"success": True, "profile": updated}
