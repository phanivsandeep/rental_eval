from __future__ import annotations
import asyncio
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.middleware.auth import get_session_id, get_api_key
from app.middleware.ratelimit import limiter, evaluate_limit
from app.db import users as users_db
from app.db import evaluations as eval_db
from app.agents.orchestrator import run_evaluation

logger = logging.getLogger(__name__)
router = APIRouter()


class EvaluateRequest(BaseModel):
    address: str


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def _stream(
    address: str,
    api_key: str,
    session_id: str,
) -> AsyncGenerator[str, None]:
    # Resolve user
    user = users_db.get_or_create_user(session_id)
    user_id: str = user["id"]
    profile: dict = user.get("profile", {})

    # Extract zip from address (simple heuristic; agents will geocode fully)
    import re
    zip_match = re.search(r"\b(\d{5})\b", address)
    zip_code = zip_match.group(1) if zip_match else "00000"

    # Create DB record
    evaluation = eval_db.create_evaluation(user_id, address, zip_code)
    evaluation_id: str = evaluation["id"]
    eval_db.update_evaluation_status(evaluation_id, "running")

    yield _sse("started", {"evaluation_id": evaluation_id, "address": address})

    try:
        async for event_type, payload in run_evaluation(
            address=address,
            zip_code=zip_code,
            profile=profile,
            api_key=api_key,
            evaluation_id=evaluation_id,
        ):
            yield _sse(event_type, payload)

            if event_type == "complete":
                eval_db.save_report(
                    evaluation_id,
                    payload["report"],
                    trace_id=payload.get("trace_id"),
                )

    except Exception as e:
        logger.exception("Evaluation failed for %s", evaluation_id)
        eval_db.update_evaluation_status(evaluation_id, "failed")
        yield _sse("error", {"message": str(e)})


@router.post("/evaluate")
@limiter.limit(evaluate_limit())
async def evaluate(
    request: Request,
    body: EvaluateRequest,
    session_id: str = Depends(get_session_id),
    api_key: str = Depends(get_api_key),
):
    return StreamingResponse(
        _stream(body.address, api_key, session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
