import { NavBar } from '../components/molecules/NavBar';
import Background from '../components/atoms/Background';
import Arena from '../components/organisms/Arena';
import GameStatusBar from '../components/organisms/GameStatusBar';
import GameControl from '../components/organisms/GameControl';
import { useGameState } from '../hooks/GameState';
import { useGameWebSocket } from '../hooks/GameWebSocket';
import { useEffect, useState, useRef } from 'react';
import { useKeyboardControls } from '../hooks/input.tsx';
import { useGameSessions, UseGameSessionsReturn } from '../hooks/GameSessions';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import api from '../api/api-client';
export interface Paddle {
  y: number;
  height: number;
  width: number;
  speed: number;
  moving: 'up' | 'down' | 'stop';
}

export interface Paddles {
  left: Paddle;
  right: Paddle;
}

export interface Scores {
  left: number;
  right: number;
}

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

export interface GameState {
  ball: {
    x: number;
    y: number;
    radius: number;
  };
  paddles: {
    left: {
      y: number;
      height: number;
    };
    right: {
      y: number;
      height: number;
    };
  };
  scores: Scores;
  status: GameStatus;
  cosmicBackground: number[][] | null;
}

const colors = {
  start: '#00ff9f',
  end: '#0088ff',
};

interface ServerMessage {
  type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong';
  sessionId?: string;
  data?: GameState;
  gameOverData?: {
    scores: Scores;
    winner: 'left' | 'right';
    winnerUserId: number | null;
    status: GameStatus;
  };
  message?: string;
}

interface GamePageProps {
  sessionId: string | null;
  gameMode: 'local' | 'remote' | 'tournament';
}

// export const GamePage = ({ sessionId: routeSessionId }: { sessionId: string | null }) => {
export const GamePage = ({ sessionId, gameMode }: GamePageProps) => {
  const { openWebSocket, closeWebSocket } = useGameWebSocket();
  const { gameStateRef, updateGameState } = useGameState();
  const [currentSessionId, setSessionId] = useState<string | null>(sessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [gameOver, setGameOver] = useState<{
    winner: 'left' | 'right';
    winnerUserId: number | null;
    scores: Scores;
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null); // Use ref instead of state
  const { tournamentId } = useParams<{ tournamentId?: string }>();
  const navigate = useNavigate();

  useKeyboardControls({
    wsRef,
    gameMode,
    enabled: !!currentSessionId, // Only enable when connected
  });

  const createLocalSession = async () => {
    setIsLoading(true);
    console.log('Fetching sessions from backend...');
    // Build request body conditionally
    const requestBody: Record<string, unknown> = {
      gameMode: gameMode,
    };

    // For tournament mode, pass the numeric tournamentId
    if (tournamentId) {
      requestBody.tournamentId = Number(tournamentId);
    }

    interface CreateSessionResponse {
      status: 'success' | 'failure';
      message: string;
      sessionId?: string;
      wsUrl?: string;
    }
    try {
      const res = await api.post<CreateSessionResponse>('/game/create-session', requestBody);
      const data = res.data;
      if (data.status === 'success' && data.sessionId) {
        console.log('Session created:', data.sessionId);
        setSessionId(data.sessionId);
      } else {
        console.error('Session creation failed:', data.message);
      }
    } catch (err) {
      console.error('Error creating session:', err);
    }
    setIsLoading(false);
  };

  const onStartGame = () => {
    if (!wsRef.current) {
      console.error('WebSocket not connected');
      return;
    }

    console.log('📤 Sending start message');
    wsRef.current.send(JSON.stringify({ type: 'start' }));
  };

  const onExitGame = async () => {
    if (!currentSessionId) {
      console.log('no Session');
      navigate('/home');
      return;
    }
    try {
      const res = await fetch(`/api/game/del/${currentSessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.message) {
        console.log(data.message);
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
    setGameOver(null);
    setSessionId(null);
    closeWebSocket();
    navigate('/home');
  };

  useEffect(() => {
    if ((gameMode === 'local' || gameMode === 'tournament') && !currentSessionId) {
      createLocalSession();
      console.log(`Auto-creating ${gameMode} session...`);
    }
  }, [gameMode, currentSessionId]); // Only run when gameMode changes (on mount)

  useEffect(() => {
    if (!currentSessionId) return;
    const connectWebSocket = async () => {
      try {
        const ws = await openWebSocket(currentSessionId, (message: ServerMessage) => {
          if (message.type === 'state' && message.data) {
            updateGameState(message.data);
          } else if (message.type === 'gameOver') {
            // Update final game state
            if (message.data) {
              updateGameState(message.data);
            }
            // Store game over data
            if (message.gameOverData) {
              setGameOver({
                winner: message.gameOverData.winner,
                winnerUserId: message.gameOverData.winnerUserId,
                scores: message.gameOverData.scores,
              });
            } else if (message.data) {
              // Fallback if gameOverData is missing
              const scores = message.data.scores;
              setGameOver({
                winner: scores.left > scores.right ? 'left' : 'right',
                winnerUserId: null,
                scores,
              });
            }
          }
        });

        wsRef.current = ws; // Store WebSocket in ref
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    // Cleanup on unmount or sessionId change
    return () => {
      closeWebSocket();
      wsRef.current = null;
    };
  }, [currentSessionId, openWebSocket, updateGameState, closeWebSocket]);

  const handleSelectSession = (selectedSessionId: string) => {
    console.log('Selected session:', selectedSessionId);
    setSessionId(selectedSessionId);
    // navigate('game/remote');
  };
  const sessions = useGameSessions() as UseGameSessionsReturn;

  return (
    <div className={`w-full h-full relative`}>
      <Background
        grainIntensity={4}
        baseFrequency={0.28}
        colorStart={colors.start}
        colorEnd={colors.end}
      >
        <NavBar />
        <div className="flex flex-row flex-1 overflow-hidden">
          {' '}
          {/* Added flex-1 and overflow-hidden */}
          <div className="flex flex-col flex-[1] overflow-y-auto p-4">
            {' '}
            {/* Added overflow and padding */}
            <GameControl
              onCreateLocalGame={createLocalSession}
              onStartGame={onStartGame}
              onExitGame={onExitGame}
              gameMode={gameMode}
              loading={isLoading}
            />
            {gameMode === 'remote' ? (
              <GameStatusBar sessionsData={sessions} onSelectSession={handleSelectSession} />
            ) : (
              <GameStatusBar sessionsData={null} />
            )}
          </div>
          <div className="flex-[3] flex justify-center p-4">
            {' '}
            {/* Added flex centering */}
            <Arena gameStateRef={gameStateRef} />
          </div>
        </div>
      </Background>
    </div>
  );
};
