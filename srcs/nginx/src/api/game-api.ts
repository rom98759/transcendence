import { useState, useCallback } from 'react';
import { useGameWebSocket } from '../hooks/GameWebSocket';
import api from './api-client';

interface GameSessionData {
  status: string;
  message: string | null;
  sessionId: string;
  wsUrl: string;
}

export const useLocalSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { openWebSocket } = useGameWebSocket();

  const createLocalSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/game/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameMode: 'local' }),
        credentials: 'include',
      });

      const data: GameSessionData = await response.json();

      if (response.ok && data.sessionId) {
        setSessionId(data.sessionId);
        console.log('Created game session:', data.sessionId);
        console.log('game session result:', data);
        return data.sessionId;
      } else {
        throw new Error(data.message || 'Failed to create game session');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to game service';
      console.error('Connection error:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, openWebSocket]);

  return {
    sessionId,
    isLoading,
    error,
    createLocalSession,
  };
};

export async function createAiSession(): Promise<{ sessionId: string; wsUrl: string }> {
  const res = await api.post('/game/create-session', { gameMode: 'ai' });
  return res.data;
}

export async function joinAiToSession(sessionId: string): Promise<void> {
  await api.post('/pong-ai/join-game', { sessionId });
}
