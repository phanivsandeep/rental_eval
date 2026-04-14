"""
Entry point for the Rental Evaluator backend.

Dev:  uv run main.py
      -- or --
      uv run uvicorn app.main:app --reload

Prod (Render / Docker):
      uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    reload = os.environ.get("ENVIRONMENT", "development") == "development"

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
        log_level="info",
    )
