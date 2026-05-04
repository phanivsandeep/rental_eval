FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# copy-mode avoids hard-link errors inside Docker layer filesystem
# compile-bytecode speeds up cold starts
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

# Install deps only first — keeps this layer cached when only source changes
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy source
COPY app/ ./app/
COPY main.py mcp_server.py ./

EXPOSE 8000

# uv run activates the venv and makes app/ importable from WORKDIR
CMD ["uv", "run", "python", "main.py"]
