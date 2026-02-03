import asyncio
import json
import numpy as np
from stable_baselines3 import PPO
import websockets
from typing import Optional


class AIPlayer:
    def __init__(self, model_path: str, game_service_url: str = "ws://game-service:3003"):

        self.model = PPO.load(model_path)
        self.game_service_url = game_service_url
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.playing = False
        self.paddle = "right"
        
    async def connect(self, session_id: str):

        uri = f"{self.game_service_url}/{session_id}"
        print(f"AI connecting to: {uri}", flush=True)
        
        try:
            self.websocket = await websockets.connect(uri)
            print(f"AI connected to session {session_id}", flush=True)
            return True
        except Exception as e:
            print(f"AI connection failed: {e}", flush=True)
            import traceback
            traceback.print_exc()
            return False
    
    async def disconnect(self):
        if self.websocket:
            await self.websocket.close()
            self.websocket = None
            print("AI disconnected")
    
    def _extract_observation(self, game_state: dict) -> np.ndarray:
       
        try:
            ball = game_state["ball"]
            paddles = game_state["paddles"]
            
            # Center of paddles
            left_paddle_y = paddles["left"]["y"] + paddles["left"]["height"] / 2
            right_paddle_y = paddles["right"]["y"] + paddles["right"]["height"] / 2
            
            # 6 observations: ball position, ball velocity, paddle positions
            return np.array([
                ball["x"],
                ball["y"],
                ball.get("vx", 0),  # Ball velocity x
                ball.get("vy", 0),  # Ball velocity y
                left_paddle_y,
                right_paddle_y
            ], dtype=np.float32)
        except (KeyError, TypeError) as e:
            print(f"Error extracting observation: {e}", flush=True)
            print(f"Game state: {game_state}", flush=True)
            # Default values for 6 observations
            return np.array([400, 300, 0, 0, 300, 300], dtype=np.float32)
    
    def _get_action(self, observation: np.ndarray) -> str:

        action, _ = self.model.predict(observation, deterministic=True)
        action_map = {0: "stop", 1: "up", 2: "down"}
        return action_map[int(action)]
    
    def _is_connected(self) -> bool:

        return self.websocket is not None and self.websocket.state.name == "OPEN"

    async def send_paddle_action(self, direction: str):

        if self._is_connected():
            message = {
                "type": "paddle",
                "paddle": self.paddle,
                "direction": direction
            }
            print(f"Sending paddle action: {direction}", flush=True)
            await self.websocket.send(json.dumps(message))
    
    async def play(self, session_id: str):
        print(f"AI play() called for session: {session_id}", flush=True)
        
        if not await self.connect(session_id):
            print(f"AI failed to connect, exiting play()", flush=True)
            return
        
        self.playing = True
        current_action = "stop"
        start_sent = False  # Track if we've already sent start command
        
        try:
            # Send initial ping
            await self.websocket.send(json.dumps({"type": "ping"}))
            
            print("AI player started, waiting for game state...", flush=True)
            
            while self.playing and self._is_connected():
                try:
                    # Wait for message from server with timeout
                    message_str = await asyncio.wait_for(
                        self.websocket.recv(),
                        timeout=5.0
                    )
                    message = json.loads(message_str)
                    
                    if message.get("type") == "state":
                        # Game state update
                        game_state = message.get("data", {})
                        status = game_state.get("status")
                        print(f"Received state: status={status}", flush=True)
                        
                        if status == "waiting":
                            # Game is waiting to start - send start command (only once)
                            if not start_sent:
                                print("🎮 Game waiting, sending start command...", flush=True)
                                await self.websocket.send(json.dumps({"type": "start"}))
                                start_sent = True
                        
                        elif status == "playing":
                            # Extract observation and get action
                            obs = self._extract_observation(game_state)
                            new_action = self._get_action(obs)
                            
                            # Only send if action changed
                            if new_action != current_action:
                                await self.send_paddle_action(new_action)
                                current_action = new_action
                        
                        elif status == "finished":
                            scores = game_state.get("scores", {})
                            print(f"Game finished! Score: {scores.get('left', 0)} - {scores.get('right', 0)}", flush=True)
                            self.playing = False
                    
                    elif message.get("type") == "gameOver":
                        print("Game over", flush=True)
                        self.playing = False
                    
                    elif message.get("type") == "connected":
                        print(f"Received connected message", flush=True)
                    
                    elif message.get("type") == "pong":
                        print(f"Received pong", flush=True)
                    
                    elif message.get("type") == "error":
                        print(f"Error: {message.get('message')}", flush=True)
                        self.playing = False
                    
                    else:
                        print(f"Received unknown message type: {message.get('type')}", flush=True)
                
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    print("Timeout, sending ping...", flush=True)
                    if self._is_connected():
                        await self.websocket.send(json.dumps({"type": "ping"}))
                
                except Exception as e:
                    print(f"Error in game loop: {e}", flush=True)
                    import traceback
                    traceback.print_exc()
                    break
        
        finally:
            await self.disconnect()
            print("AI player stopped")
    
    def stop(self):
        self.playing = False


async def join_game_as_ai(session_id: str, model_path: str = "models/pong_moderate/pong_moderate_final"):

    player = AIPlayer(model_path)
    await player.play(session_id)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python3 ai_player.py <session_id> [model_path]")
        sys.exit(1)
    
    session_id = sys.argv[1]
    model_path = sys.argv[2] if len(sys.argv) > 2 else "models/pong_moderate/pong_moderate_final"
    
    print(f"Starting AI player for session: {session_id}")
    asyncio.run(join_game_as_ai(session_id, model_path))
