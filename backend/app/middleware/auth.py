from __future__ import annotations
from fastapi import Request, HTTPException
from cryptography.fernet import Fernet, InvalidToken
from app.config import get_settings


def get_session_id(request: Request) -> str:
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="No session. Call POST /session first.")
    return session_id


def get_api_key(request: Request) -> str:
    encrypted = request.cookies.get("encrypted_api_key")
    if not encrypted:
        raise HTTPException(status_code=401, detail="No API key set. Call POST /key first.")
    try:
        f = Fernet(get_settings().cookie_secret.encode())
        return f.decrypt(encrypted.encode()).decode()
    except (InvalidToken, Exception) as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired API key cookie: {e}")


def encrypt_api_key(raw_key: str) -> str:
    f = Fernet(get_settings().cookie_secret.encode())
    return f.encrypt(raw_key.encode()).decode()
