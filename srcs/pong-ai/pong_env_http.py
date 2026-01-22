import numpy as np
import gymnasium as gym
from gymnasium import spaces
import requests


class PongEnv(gym.Env):
    
    metadata = {"render_modes": [], "render_fps": 60}
    
    def __init__(self, base_url="http://localhost:3003/game", render_mode=None):
        super().__init__()
        
        self.base_url = base_url
        self.render_mode = render_mode
        self.window = None
        self.clock = None
        
        # Размеры игрового поля
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
        
        # Создаём новую сессию игры на бэкенде
        self.session_id = self._create_session()
        
        # Инициализация состояния
        self.reset()
    
    def _create_session(self):
        """Создать новую сессию игры на бэкенде"""
        try:
            resp = requests.post(f"{self.base_url}/create-session", timeout=5)
            resp.raise_for_status()
            return resp.json()["sessionId"]
        except requests.exceptions.RequestException as e:
            print(f"Ошибка при создании сессии: {e}")
            raise
    
    def reset(self, seed=None, options=None):
        """Сбросить игру в начальное состояние"""
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
            print(f"Ошибка при сбросе игры: {e}")
            raise
    
    def step(self, action):
        """Выполнить один шаг: отправить действие в бэкенд, получить результат"""
        # Маппинг действий: 0 = стоп, 1 = вверх, 2 = вниз
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
            print(f"Ошибка при выполнении шага: {e}")
            raise
    
    def _convert_state(self, backend_state):
        """Преобразовать состояние бэкенда в numpy массив для наблюдения"""
        try:
            ball = backend_state["ball"]
            paddles = backend_state["paddles"]
            
            # Возвращаем: [ball_x, ball_y, left_paddle_center_y, right_paddle_center_y]
            left_paddle_y = paddles["left"]["y"] + paddles["left"]["height"] / 2
            right_paddle_y = paddles["right"]["y"] + paddles["right"]["height"] / 2
            
            return np.array([
                ball["x"],
                ball["y"],
                left_paddle_y,
                right_paddle_y
            ], dtype=np.float32)
        except (KeyError, TypeError) as e:
            print(f"Ошибка при преобразовании состояния: {e}")
            print(f"State: {backend_state}")
            raise
    
    def render(self):
        """Визуализация (в текущей версии не реализована)"""
        pass
    
    def close(self):
        """Закрыть окружение"""
        if self.window is not None:
            import pygame
            pygame.quit()
            self.window = None
