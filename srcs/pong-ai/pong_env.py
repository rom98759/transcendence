import gymnasium as gym
from gymnasium import spaces
import requests
import urllib3
import numpy as np
import os

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class PongEnv(gym.Env):
    
    metadata = {"render_modes": [], "render_fps": 60}

    def __init__(self, base_url=None, render_mode=None, verify_ssl=None):
        super().__init__()
        # Allow overriding the game service URL via env var for flexibility
        if base_url is None:
            base_url = os.getenv("GAME_SERVICE_URL", "http://localhost:8080/api/game")

        # SSL verification: default False for localhost (self-signed), True otherwise
        if verify_ssl is None:
            verify_ssl = os.getenv("GAME_SERVICE_VERIFY_SSL", "").lower() in ("1", "true", "yes")
            # Auto-disable for localhost/127.0.0.1 unless explicitly set
            if "localhost" in base_url or "127.0.0.1" in base_url:
                verify_ssl = False

        self.base_url = base_url
        self.verify_ssl = verify_ssl
        self.render_mode = render_mode
        self.window = None
        self.clock = None
        
        self.width = 800
        self.height = 600
        
        # Observation space: [ball_x, ball_y, left_paddle_y, right_paddle_y]
        self.observation_space = spaces.Box(
            low=np.array([0, 0, 0, 0], dtype=np.float32),
            high=np.array([self.width, self.height, self.height, self.height], dtype=np.float32),
            dtype=np.float32
        )
        
        # Action space: 0 = stop, 1 = up, 2 = down
        self.action_space = spaces.Discrete(3)
        
        # Use a persistent HTTP session to reuse TCP connections
        self._http = requests.Session()
        self._http.verify = self.verify_ssl  # Apply SSL setting to session
       # self._http.headers.update({"Content-Type": "application/json"})  # Ensure JSON content type
        self.session_id = self._create_session()
        print(f"[PongEnv] Session created: {self.session_id} (SSL verify={self.verify_ssl})")
        
        self.reset()
    
    def _create_session(self):
        try:
            resp = self._http.post(f"{self.base_url}/create-session", timeout=5)
            resp.raise_for_status()
            session_id = resp.json()["sessionId"]
            print(f"[PongEnv] Created session at {self.base_url}: {session_id}")
            return session_id
        except requests.exceptions.RequestException as e:
            print(f"[PongEnv] Error creating session: {e}")
            raise
    
    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        
        try:
            resp = self._http.post(
                f"{self.base_url}/rl/reset",
                json={"sessionId": self.session_id},
                timeout=5
            )
            resp.raise_for_status()
            data = resp.json()
            # Handle both {state: ...} and {status: 'success', state: ...} formats
            if "state" not in data:
                print(f"[PongEnv] Reset response missing 'state': {data}")
                raise KeyError(f"Expected 'state' in response, got: {list(data.keys())}")
            obs = self._convert_state(data["state"])
            return obs, {}
        except requests.exceptions.RequestException as e:
            print(f"[PongEnv] Error resetting game: {e}")
            raise
    
    def step(self, action):
        action_map = {0: "stop", 1: "up", 2: "down"}
        
        try:
            resp = self._http.post(
                f"{self.base_url}/rl/step",
                json={
                    "sessionId": self.session_id,
                    "action": action_map[action],
                    "paddle": "right"
                },
                timeout=5
            )
            resp.raise_for_status()
            
            data = resp.json()
            obs = self._convert_state(data["state"])
            reward = data.get("reward", 0)
            done = data.get("done", False)
            
            return obs, reward, done, False, {}
        except requests.exceptions.RequestException as e:
            print(f"[PongEnv] Error in step: {e}")
            raise
    
    def _convert_state(self, backend_state):
        try:
            ball = backend_state["ball"]
            paddles = backend_state["paddles"]
            
            left_paddle_y = paddles["left"]["y"] + paddles["left"]["height"] / 2
            right_paddle_y = paddles["right"]["y"] + paddles["right"]["height"] / 2
            
            return np.array([
                ball["x"],
                ball["y"],
                left_paddle_y,
                right_paddle_y
            ], dtype=np.float32)
        except (KeyError, TypeError) as e:
            print(f"[PongEnv] Error converting state: {e}")
            print(f"[PongEnv] State: {backend_state}")
            raise
    
    def render(self):
        pass
    
    def close(self):
        if self.window is not None:
            import pygame
            pygame.quit()
            self.window = None