# Pong AI Service

RL-trained AI opponent for Pong game using PPO algorithm.

## Quick Start

1. Train model:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python train_ppo.py --mode train --timesteps 50000
   ```

2. Run server:

   ```bash
   python pong_server.py
   ```

3. Test:
   ```bash
   curl http://localhost:3006/health
   ```

## Files

- `pong_env.py` - Gymnasium environment
- `train_ppo.py` - Training script
- `pong_server.py` - FastAPI server
- `Dockerfile` - Docker image

## API

- GET `/health` - Health check
- POST `/session/create?session_id=xxx` - Create game
- WS `/ws/game/{session_id}` - Game WebSocket

## Training Levels

- 30k steps = Easy (~15 min)
- 50k steps = Medium (~30 min)
- 100k steps = Hard (~1 hour)
