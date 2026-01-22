#!/bin/bash
# Запуск тестирования агента внутри Docker network

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create and activate virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "[Setup] Creating Python virtual environment..."
  python3 -m venv venv
fi

# Использовать имя сервиса внутри Docker network
source venv/bin/activate

# Install requirements if not already installed
pip install -q -r requirements.txt

# Запустить тест подключения
python3 -c "
from pong_env import PongEnv
import sys

print('[Agent] Connecting to game-service through Docker network...')
try:
    env = PongEnv('http://game-service:3003')
    print('[Agent] ✓ Connected successfully!')
    obs, info = env.reset()
    print(f'[Agent] ✓ Reset successful! Obs shape: {obs.shape}')
    
    # Тест одного шага
    obs, reward, done, truncated, info = env.step(0)
    print(f'[Agent] ✓ Step successful! Reward: {reward}, Done: {done}')
    
    print('[Agent] ✓ All tests passed!')
except Exception as e:
    print(f'[Agent] ✗ Error: {e}')
    sys.exit(1)
"
