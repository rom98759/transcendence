FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    gymnasium==0.29.1 \
    'stable-baselines3[extra]==2.2.1' \
    'torch>=2.0.0' \
    'requests>=2.31.0' \
    'httpx>=0.25.0' \
    'tensorboard>=2.15.0' \
    'numpy>=1.24.0' \
    'pygame>=2.5.0' \
    'fastapi>=0.108.0' \
    'uvicorn[standard]>=0.25.0' \
    'websockets>=12.0' \
    'python-multipart>=0.0.6' \
    'pydantic>=2.5.0' \
    'python-dotenv>=1.0.0'

COPY pong_env.py .
COPY pong_server.py .
COPY ai_player.py .
COPY train_ppo.py .

RUN mkdir -p /app/models/pong_moderate

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3006/health || exit 1

CMD ["uvicorn", "pong_server:app", "--host", "0.0.0.0", "--port", "3006", "--log-level", "info"]
