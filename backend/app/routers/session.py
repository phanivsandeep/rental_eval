import uuid
from fastapi import APIRouter, Response, Request
from app.config import get_settings

router = APIRouter()


@router.post("/session")
def create_session(request: Request, response: Response):
    # Reuse existing session cookie if present
    existing = request.cookies.get("session_id")
    if existing:
        return {"session_id": existing}

    session_id = str(uuid.uuid4())
    cfg = get_settings()
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=cfg.is_production,
        samesite="strict",
        max_age=60 * 60 * 24 * 30,  # 30 days
    )
    return {"session_id": session_id}
