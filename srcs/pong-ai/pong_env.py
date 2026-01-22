import gymnasium as gym
from gymnasium import spaces
import requests
import numpy as np


class PongEnv(gym.Env):
    
    metadata = {"render_modes": [], "render_fps": 60}

    #when post invite-pong-ai is triggered

    def __init__(self, base_url="http://game-service:3003", render_mode=None):
        super().__init__()
        
        self.base_url = base_url
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
        
        self.session_id = self._create_session()
        print(f"[PongEnv] Session created: {self.session_id}")
        
        self.reset()
    
    def _create_session(self):
        try:
            resp = requests.post(f"{self.base_url}/create-session", timeout=5)
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
            resp = requests.post(
                f"{self.base_url}/rl/reset",
                json={"sessionId": self.session_id},
                timeout=5
            )
            resp.raise_for_status()
            obs = self._convert_state(resp.json()["state"])
            return obs, {}
        except requests.exceptions.RequestException as e:
            print(f"[PongEnv] Error resetting game: {e}")
            raise
    
    def step(self, action):
        action_map = {0: "stop", 1: "up", 2: "down"}
        
        try:
            resp = requests.post(
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