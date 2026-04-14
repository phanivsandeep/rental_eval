import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.middleware.ratelimit import limiter
from app.routers import session, key, profile, evaluate, reports

logging.basicConfig(level=logging.INFO)

# LangSmith tracing
cfg = get_settings()
if cfg.langsmith_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true" if cfg.langsmith_tracing else "false"
    os.environ["LANGCHAIN_API_KEY"] = cfg.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = cfg.langsmith_project


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield  # startup / shutdown hooks go here if needed


app = FastAPI(
    title="Rental Evaluator API",
    version="0.1.0",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[cfg.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(session.router)
app.include_router(key.router)
app.include_router(profile.router)
app.include_router(evaluate.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.exception_handler(Exception)
async def generic_handler(request: Request, exc: Exception):
    logging.exception("Unhandled error on %s", request.url)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
