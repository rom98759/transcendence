import { useEffect } from 'react';

interface UseKeyboardControlsProps {
  wsRef: React.RefObject<WebSocket | null>;
  gameMode: string;
  enabled?: boolean; // Optional: to enable/disable controls
}

export const useKeyboardControls = ({
  wsRef,
  gameMode,
  enabled = true,
}: UseKeyboardControlsProps) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!wsRef.current) return;

      if (gameMode === 'local') {
        // local: W/S → left paddle, ArrowUp/Down → right paddle
        switch (event.key) {
          case 'w':
          case 'W':
            wsRef.current.send(JSON.stringify({ type: 'paddle', paddle: 'left', direction: 'up' }));
            break;
          case 's':
          case 'S':
            wsRef.current.send(
              JSON.stringify({ type: 'paddle', paddle: 'left', direction: 'down' }),
            );
            break;
          case 'ArrowUp':
            wsRef.current.send(
              JSON.stringify({ type: 'paddle', paddle: 'right', direction: 'up' }),
            );
            break;
          case 'ArrowDown':
            wsRef.current.send(
              JSON.stringify({ type: 'paddle', paddle: 'right', direction: 'down' }),
            );
            break;
        }
      } else if (gameMode === 'remote' || gameMode === 'tournament') {
        // remote/tournament: W/S and ArrowUp/Down control the player's assigned paddle
        // The server assigns left/right based on connection order (Player A = left, Player B = right)
        // We send the paddle direction and let the server decide based on PlayerRole
        // For simplicity, W/S and ArrowUp/Down all go to 'left' — the server maps role.
        // Actually, since the WS assigns role A or B, the player should control their own paddle.
        // Player A = left paddle, Player B = right paddle.
        // We use both key sets to control the paddle that gets assigned.
        switch (event.key) {
          case 'w':
          case 'W':
          case 'ArrowUp':
            event.preventDefault();
            if (event.repeat) break;
            // Send both paddles — server ignores the wrong one based on role
            wsRef.current.send(JSON.stringify({ type: 'paddle', paddle: 'left', direction: 'up' }));
            wsRef.current.send(
              JSON.stringify({ type: 'paddle', paddle: 'right', direction: 'up' }),
            );
            break;
          case 's':
          case 'S':
          case 'ArrowDown':
            event.preventDefault();
            if (event.repeat) break;
            wsRef.current.send(
              JSON.stringify({ type: 'paddle', paddle: 'left', direction: 'down' }),
            );
            wsRef.current.send(
              JSON.stringify({ type: 'paddle', paddle: 'right', direction: 'down' }),
            );
            break;
        }
      } else if (gameMode === 'ai') {
        // ai: W/S and ArrowUp/Down all control left paddle (right belongs to AI)
        switch (event.key) {
          case 'w':
          case 'W':
          case 'ArrowUp':
            event.preventDefault();
            if (event.repeat) break;
            wsRef.current.send(JSON.stringify({ type: 'paddle', paddle: 'left', direction: 'up' }));
            break;
          case 's':
          case 'S':
          case 'ArrowDown':
            event.preventDefault();
            if (event.repeat) break;
            wsRef.current.send(
              JSON.stringify({ type: 'paddle', paddle: 'left', direction: 'down' }),
            );
            break;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!wsRef.current) return;

      if (gameMode === 'local') {
        const keys = ['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'];
        if (keys.includes(event.key)) {
          wsRef.current.send(
            JSON.stringify({
              type: 'paddle',
              paddle: event.key === 'ArrowUp' || event.key === 'ArrowDown' ? 'right' : 'left',
              direction: 'stop',
            }),
          );
        }
      } else if (gameMode === 'remote' || gameMode === 'tournament') {
        const keys = ['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'];
        if (keys.includes(event.key)) {
          wsRef.current.send(JSON.stringify({ type: 'paddle', paddle: 'left', direction: 'stop' }));
          wsRef.current.send(
            JSON.stringify({ type: 'paddle', paddle: 'right', direction: 'stop' }),
          );
        }
      } else if (gameMode === 'ai') {
        const keys = ['w', 'W', 's', 'S', 'ArrowUp', 'ArrowDown'];
        if (keys.includes(event.key)) {
          wsRef.current.send(JSON.stringify({ type: 'paddle', paddle: 'left', direction: 'stop' }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [wsRef, enabled, gameMode]);
};
