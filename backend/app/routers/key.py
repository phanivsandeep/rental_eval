from fastapi import APIRouter, Response, Request, HTTPException
from pydantic import BaseModel
from app.middleware.auth import encrypt_api_key
from app.config import get_settings

router = APIRouter()


class KeyRequest(BaseModel):
    api_key: str


@router.post("/key")
def save_key(body: KeyRequest, response: Response):
    if not body.api_key.startswith("sk-ant-"):
        raise HTTPException(status_code=400, detail="Invalid Anthropic API key format.")
    encrypted = encrypt_api_key(body.api_key)
    cfg = get_settings()
    response.set_cookie(
        key="encrypted_api_key",
        value=encrypted,
        httponly=True,
        secure=cfg.is_production,
        samesite="strict",
        max_age=60 * 60 * 24 * 30,
    )
    return {"success": True}


@router.delete("/key")
def delete_key(response: Response):
    response.delete_cookie("encrypted_api_key")
    return {"success": True}


@router.get("/key/status")
def key_status(request: Request):
    has_key = "encrypted_api_key" in request.cookies
    return {"has_key": has_key}
