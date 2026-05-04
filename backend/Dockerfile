FROM python:3.11-slim

WORKDIR /app

# Install deps via pip — avoids uv lockfile platform issues on Render
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY app/ ./app/
COPY main.py mcp_server.py ./

EXPOSE 8000

CMD ["python", "main.py"]
