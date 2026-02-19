FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --force-reinstall --upgrade "numpy<2" && \
    pip install --force-reinstall torch stable-baselines3

COPY pong_env.py .
COPY pong_server.py .
COPY ai_player.py .

RUN mkdir -p /app/models/best_model

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3006/health || exit 1

CMD ["uvicorn", "pong_server:app", "--host", "0.0.0.0", "--port", "3006", "--log-level", "info"]
