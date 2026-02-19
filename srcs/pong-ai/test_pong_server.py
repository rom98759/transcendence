"""
Unit tests for pong_server.py

Run with: pytest test_pong_server.py -v
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient


class TestAIService:
    """Tests for AIService class"""
    
    def test_not_ready_without_model_file(self):
        """AIService should not be ready if model file doesn't exist"""
        from pong_server import AIService
        
        service = AIService(model_path="nonexistent/path/to/model")
        
        assert not service.is_ready()
        assert service.load_error is not None
        assert "not found" in service.load_error
    
    def test_not_ready_with_corrupted_model(self, tmp_path):
        """AIService should not be ready if model file is corrupted"""
        from pong_server import AIService
        
        # Create a fake .zip file that isn't a valid model
        fake_model = tmp_path / "fake_model.zip"
        fake_model.write_text("not a real model")
        
        service = AIService(model_path=str(tmp_path / "fake_model"))
        
        assert not service.is_ready()
        assert service.load_error is not None
    
    @patch('pong_server.PPO')
    @patch('os.path.exists')
    def test_loads_model_successfully(self, mock_exists, mock_ppo):
        """AIService should load model when file exists"""
        from pong_server import AIService
        
        mock_exists.return_value = True
        mock_model = Mock()
        mock_ppo.load.return_value = mock_model
        
        service = AIService(model_path="models/test_model")
        
        assert service.model == mock_model
        assert service.is_ready()
        assert service.load_error is None
        mock_ppo.load.assert_called_once_with("models/test_model")
    
    @patch('pong_server.PPO')
    @patch('os.path.exists')
    def test_load_error_stored_on_exception(self, mock_exists, mock_ppo):
        """AIService should store error message when load fails"""
        from pong_server import AIService
        
        mock_exists.return_value = True
        mock_ppo.load.side_effect = Exception("test load error")
        
        service = AIService(model_path="models/test_model")
        
        assert not service.is_ready()
        assert "test load error" in service.load_error


class TestHealthEndpoints:
    """Tests for /health endpoints"""
    
    @pytest.fixture
    def ready_client(self):
        """Create test client with ready AIService"""
        import pong_server
        
        mock_service = Mock()
        mock_service.is_ready.return_value = True
        mock_service.load_error = None
        pong_server.ai_service = mock_service
        
        yield TestClient(pong_server.app)
    
    @pytest.fixture
    def not_ready_client(self):
        """Create test client with not ready AIService"""
        import pong_server
        
        mock_service = Mock()
        mock_service.is_ready.return_value = False
        mock_service.load_error = "Model not found"
        pong_server.ai_service = mock_service
        
        yield TestClient(pong_server.app)
    
    def test_health_get_returns_200_when_ready(self, ready_client):
        """GET /health should return 200 when model loaded"""
        response = ready_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["model_loaded"] is True
    
    def test_health_get_returns_503_when_not_ready(self, not_ready_client):
        """GET /health should return 503 when model not loaded"""
        response = not_ready_client.get("/health")
        
        assert response.status_code == 503
    
    def test_health_head_returns_200_when_ready(self, ready_client):
        """HEAD /health should return 200 when model loaded"""
        response = ready_client.head("/health")
        
        assert response.status_code == 200
    
    def test_health_head_returns_503_when_not_ready(self, not_ready_client):
        """HEAD /health should return 503 when model not loaded"""
        response = not_ready_client.head("/health")
        
        assert response.status_code == 503
    
    def test_health_returns_503_when_service_none(self):
        """GET /health should return 503 when ai_service is None"""
        import pong_server
        
        pong_server.ai_service = None
        client = TestClient(pong_server.app)
        
        response = client.get("/health")
        
        assert response.status_code == 503


class TestJoinGameEndpoint:
    """Tests for /join-game endpoint"""
    
    @pytest.fixture
    def ready_client(self):
        """Create test client with ready AIService"""
        import pong_server
        
        mock_service = Mock()
        mock_service.is_ready.return_value = True
        mock_service.load_error = None
        pong_server.ai_service = mock_service
        pong_server.active_ai_players = {}
        
        yield TestClient(pong_server.app)
    
    def test_join_game_returns_400_without_session_id(self, ready_client):
        """POST /join-game should return 400 when sessionId missing"""
        response = ready_client.post("/join-game", json={})
        
        assert response.status_code == 400
        assert "sessionId" in response.json()["detail"]
    
    def test_join_game_returns_503_when_not_ready(self):
        """POST /join-game should return 503 when model not loaded"""
        import pong_server
        
        mock_service = Mock()
        mock_service.is_ready.return_value = False
        mock_service.load_error = "Model not found"
        pong_server.ai_service = mock_service
        
        client = TestClient(pong_server.app)
        response = client.post("/join-game", json={"sessionId": "test-123"})
        
        assert response.status_code == 503
    
    @patch('pong_server.AIPlayer')
    def test_join_game_success(self, mock_ai_player_class, ready_client):
        """POST /join-game should create AI player and return success"""
        import pong_server
        
        mock_ai_player = Mock()
        mock_ai_player.play = AsyncMock()
        mock_ai_player_class.return_value = mock_ai_player
        
        response = ready_client.post("/join-game", json={"sessionId": "game-123"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["session_id"] == "game-123"
        assert data["paddle"] == "right"
    
    @patch('pong_server.AIPlayer')
    def test_join_game_already_playing(self, mock_ai_player_class, ready_client):
        """POST /join-game should return already_playing if session exists"""
        import pong_server
        
        # Pre-add a player for this session
        pong_server.active_ai_players["existing-session"] = Mock()
        
        response = ready_client.post("/join-game", json={"sessionId": "existing-session"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "already_playing"


class TestActiveGamesEndpoint:
    """Tests for /active-games endpoint"""
    
    def test_active_games_empty(self):
        """GET /active-games should return empty list when no games"""
        import pong_server
        
        pong_server.active_ai_players = {}
        client = TestClient(pong_server.app)
        
        response = client.get("/active-games")
        
        assert response.status_code == 200
        data = response.json()
        assert data["active_sessions"] == []
        assert data["count"] == 0
    
    def test_active_games_with_sessions(self):
        """GET /active-games should return active session IDs"""
        import pong_server
        
        pong_server.active_ai_players = {
            "session-1": Mock(),
            "session-2": Mock()
        }
        client = TestClient(pong_server.app)
        
        response = client.get("/active-games")
        
        assert response.status_code == 200
        data = response.json()
        assert set(data["active_sessions"]) == {"session-1", "session-2"}
        assert data["count"] == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
