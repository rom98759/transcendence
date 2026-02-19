from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Optional
import os
import asyncio
from stable_baselines3 import PPO
from ai_player import AIPlayer


app = FastAPI(
    title="Pong AI Service",
    description="RL-agent for Pong via WebSocket",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AIService:
    """Manages AI model loading and readiness checks."""
    
    def __init__(self, model_path: str = "models/best_model"):
        self.model_path = model_path
        self.model: Optional[PPO] = None
        self.load_error: Optional[str] = None
        self.load_model()
    
    def load_model(self):
        model_file = f"{self.model_path}.zip"
        if not os.path.exists(model_file):
            self.load_error = f"AI model not found: {model_file}"
            print(f"❌ {self.load_error}")
            return
        try:
            self.model = PPO.load(self.model_path)
            print(f"✅ Model loaded: {self.model_path}")
        except Exception as e:
            self.load_error = f"Failed to load AI model: {e}"
            print(f"❌ {self.load_error}")
    
    def is_ready(self) -> bool:
        return self.model is not None


ai_service: Optional[AIService] = None
active_ai_players: Dict[str, AIPlayer] = {}


@app.on_event("startup")
async def startup_event():
    global ai_service
    ai_service = AIService()
    print("✅ Pong AI Service started")


@app.post("/join-game")
async def join_game(request: Request):
    """AI joins a game session via WebSocket to game-service."""
    
    if ai_service is None or not ai_service.is_ready():
        raise HTTPException(
            status_code=503, 
            detail=ai_service.load_error if ai_service else "Service not initialized"
        )
    
    body = await request.json()
    session_id = body.get("sessionId")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="sessionId is required")
    
    print(f"🎮 AI join request for session: {session_id}")
    
    # Check if AI is already in this game
    if session_id in active_ai_players:
        print(f"AI already playing in session: {session_id}")
        return {
            "status": "already_playing",
            "session_id": session_id,
            "message": "AI is already in this game"
        }
    
    # Create AI player
    model_path = "models/best_model"
    ai_player = AIPlayer(model_path)
    active_ai_players[session_id] = ai_player
    
    print(f"AI player created for session: {session_id}")
    
    # Start AI player in background with error handling
    async def play_with_error_handling():
        try:
            await ai_player.play(session_id)
        except Exception as e:
            print(f"AI play error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # Cleanup when done
            active_ai_players.pop(session_id, None)
    
    asyncio.create_task(play_with_error_handling())
    
    print(f"AI player task started for session: {session_id}")
    
    return {
        "status": "success",
        "session_id": session_id,
        "message": "AI player joined the game",
        "paddle": "right"
    }

@app.head("/health")
async def health_head():
    if ai_service is None or not ai_service.is_ready():
        raise HTTPException(status_code=503, detail="AI model not loaded")
    return {}

@app.get("/health") 
async def health_get():
    if ai_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if not ai_service.is_ready():
        raise HTTPException(
            status_code=503, 
            detail=ai_service.load_error or "AI model not loaded"
        )
    
    return {
        "status": "healthy",
        "model_loaded": True
    }


@app.get("/active-games")
async def list_active_games():
    """List currently active AI game sessions."""
    return {
        "active_sessions": list(active_ai_players.keys()),
        "count": len(active_ai_players)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "pong_server:app",
        host="0.0.0.0",
        port=3006,
        reload=True,
        log_level="info"
    )

