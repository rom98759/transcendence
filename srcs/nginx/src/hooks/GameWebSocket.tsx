import { useEffect, useRef, useState, useCallback } from 'react';
export const useGameWebSocket = () => {
  const websocketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const baseRetryDelay = 1000; // 1 second

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const stopPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const startPingInterval = useCallback(() => {
    stopPingInterval();

    pingIntervalRef.current = setInterval(() => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 10000);
  }, [stopPingInterval]);

  const closeWebSocket = useCallback(() => {
    stopPingInterval();

    if (websocketRef.current) {
      websocketRef.current.close(1000, 'Client closed');
      websocketRef.current = null;
    }

    setConnected(false);
  }, [stopPingInterval]);

  const openWebSocket = useCallback(
    (sessionId: string, onMessage: (msg: any) => void): Promise<WebSocket> => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        return Promise.resolve(websocketRef.current);
      }

      // Close existing socket if any
      closeWebSocket();

      return new Promise((resolve, reject) => {
        let settled = false;

        const wsUrl = `${window.location.origin.replace(/^http/, 'ws')}/api/game/ws/${sessionId}`;

        const ws = new WebSocket(wsUrl);
        websocketRef.current = ws;

        const connectionTimeout = setTimeout(() => {
          if (!settled && ws.readyState !== WebSocket.OPEN) {
            // Don't reject if socket is already closing/closed (e.g. intentional cleanup)
            if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
              settled = true;
              return;
            }
            ws.close();
            settled = true;
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);

        ws.onopen = () => {
          if (settled) return;
          settled = true;

          clearTimeout(connectionTimeout);
          setConnected(true);
          setError(null);
          startPingInterval();
          resolve(ws);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            onMessage(message);
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        };

        ws.onerror = () => {
          if (!settled) {
            settled = true;
            reject(new Error('WebSocket error'));
          }

          setConnected(false);
          setError('WebSocket error');
        };

        ws.onclose = (e) => {
          clearTimeout(connectionTimeout);
          stopPingInterval();
          setConnected(false);
        };
      });
    },
    [closeWebSocket, startPingInterval, stopPingInterval],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeWebSocket();
    };
  }, [closeWebSocket]);

  // ── Retry logic with exponential backoff ──
  const openWebSocketWithRetry = useCallback(
    (sessionId: string, onMessage: (msg: any) => void): Promise<WebSocket> => {
      retryCountRef.current = 0;

      const tryConnect = async (attemptNumber: number): Promise<WebSocket> => {
        try {
          const ws = await openWebSocket(sessionId, onMessage);
          retryCountRef.current = 0;
          setIsRetrying(false);
          return ws;
        } catch (err) {
          retryCountRef.current = attemptNumber;

          if (attemptNumber >= maxRetries) {
            setIsRetrying(false);
            throw new Error(
              `Failed to connect after ${maxRetries} attempts: ${err instanceof Error ? err.message : 'Unknown error'}`,
            );
          }

          setIsRetrying(true);
          const delay = baseRetryDelay * Math.pow(2, attemptNumber - 1); // exponential backoff
          console.warn(`[WS Retry] Attempt ${attemptNumber} failed, retrying in ${delay}ms...`);

          await new Promise((resolve) => setTimeout(resolve, delay));
          return tryConnect(attemptNumber + 1);
        }
      };

      return tryConnect(1);
    },
    [openWebSocket],
  );

  return {
    connected,
    error,
    isRetrying,
    retryCount: retryCountRef.current,
    openWebSocket,
    openWebSocketWithRetry,
    closeWebSocket,
  };
};
