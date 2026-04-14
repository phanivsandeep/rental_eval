FROM python:3.11-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies (no dev deps, no project itself yet)
RUN uv sync --frozen --no-dev --no-install-project

# Copy source
COPY app/ ./app/
COPY main.py ./

# Install project
RUN uv sync --frozen --no-dev

EXPOSE 8000

CMD ["uv", "run", "python", "main.py"]
