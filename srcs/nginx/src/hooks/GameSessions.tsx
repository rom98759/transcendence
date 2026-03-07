import { useState, useEffect, useCallback } from 'react';

export interface GameSession {
  sessionId: string;
  createdAt?: string;
  playerCount?: number;
  sessionName?: string;
  status?: 'waiting' | 'playing' | 'finished';
  // Add other fields your backend returns
}

export interface UseGameSessionsReturn {
  sessionsList: GameSession[];
  isLoadingSessions: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useGameSessions = (autoFetch = true): UseGameSessionsReturn => {
  const [sessionsList, setSessionsList] = useState<GameSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    setError(null);

    try {
      const response = await fetch('/api/game/sessions', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract the sessions array from the response
      if (data.sessions && Array.isArray(data.sessions)) {
        setSessionsList(data.sessions); // ✅ Get the array from data.sessions
      } else {
        console.error('No sessions array in response:', data);
        setSessionsList([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sessions';
      console.error('Error fetching sessions:', err);
      setError(errorMessage);
      setSessionsList([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchSessions();
    }
  }, [autoFetch, fetchSessions]);

  return {
    sessionsList,
    isLoadingSessions,
    error,
    refetch: fetchSessions,
  };
};
