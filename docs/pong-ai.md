# Pong AI Service

RL-trained AI opponent for Pong game using PPO (Proximal Policy Optimization) algorithm with Stable Baselines3.

## Architecture

The AI service provides a trained neural network agent that plays Pong against human players. It connects to the game service via WebSocket and makes real-time paddle movement decisions.

## Quick Start

### With Docker (Recommended)

```bash
# From project root
make up
# Or specifically
docker compose up pong-ai
```

### Local Development

```bash
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install gymnasium==0.29.1 \
    'stable-baselines3[extra]==2.2.1' \
    'torch>=2.0.0' \
    'fastapi>=0.108.0' \
    'uvicorn[standard]>=0.25.0' \
    'websockets>=12.0' \
    'numpy>=1.24.0'

# Run server
python pong_server.py
```

### Test

```bash
curl http://localhost:3006/health
```

## Files

| File             | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `pong_env.py`    | Gymnasium environment simulating Pong physics               |
| `ai_player.py`   | AI player class that connects to game service via WebSocket |
| `pong_server.py` | FastAPI server exposing AI endpoints                        |
| `Dockerfile`     | Production Docker image                                     |
| `models/`        | Pre-trained PPO model checkpoints                           |

## API Endpoints

| Method   | Endpoint                         | Description                         |
| -------- | -------------------------------- | ----------------------------------- |
| `GET`    | `/health`                        | Health check (returns model status) |
| `POST`   | `/join-game`                     | AI joins an existing game session   |
| `POST`   | `/session/create?session_id=xxx` | Create standalone AI game session   |
| `GET`    | `/sessions`                      | List active game sessions           |
| `DELETE` | `/session/{session_id}`          | Delete a game session               |
| `WS`     | `/ws/game/{session_id}`          | WebSocket for real-time game state  |

### Join Game Request

```json
POST /join-game
{
  "sessionId": "game-session-uuid"
}
```

### WebSocket Messages

**Client → Server:**

```json
{ "type": "move", "action": 1 }  // 0=stop, 1=up, 2=down
{ "type": "reset" }
{ "type": "ping" }
```

**Server → Client:**

```json
{ "type": "state", "data": { "ball_x": ..., "ai_paddle_y": ... } }
{ "type": "game_over", "winner": "AI", "score_ai": 5, "score_player": 3 }
```

## Pre-trained Models

Located in `models/` directory:

| Model            | Difficulty   | Training Steps |
| ---------------- | ------------ | -------------- |
| `pong_moderate/` | Medium       | ~50k steps     |
| `pong_strong/`   | Hard         | ~100k+ steps   |
| `pong_v2/`       | Experimental | Variable       |

## Environment Variables

| Variable     | Default      | Description           |
| ------------ | ------------ | --------------------- |
| `MODEL_PATH` | `best_model` | Path to trained model |
| `PORT`       | `3006`       | Server port           |

## Integration with Game Service

The AI connects to the game service WebSocket at `ws://game-service:3003/{session_id}` and:

1. Receives game state updates (ball position, paddle positions)
2. Extracts observations for the neural network
3. Predicts optimal paddle action (up/down/stop)
4. Sends paddle movement commands back to game service

## Health Check

```bash
# Docker health check runs every 30s
curl http://localhost:3006/health
# Response: {"status": "healthy", "model_loaded": true}
```
