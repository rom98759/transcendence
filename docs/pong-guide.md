# game service

## WebSocket Error Managment

```
    websocket.close(code, reason)
```

    **code -> reason**
    4001 -> game over
    4002 -> A player has quit the game
    4003 -> Session is full ( 2 players max)

## Memory management:

    export const gameSessions = new Map<string, {
      id: string;
      game: PongGame;
      interval: NodeJS.Timeout | null;
      players: Set<any>; // sockets des clients
    }>();

## Routes:

**-> api/game/health**

```
    return:
        status: 'healthy',
        service: 'websocket-game-service',
        activeSessions: gameSessions.size,
        activeConnections: Array.from(playerConnections.values())
          .reduce((sum, conns) => sum + conns.size, 0),
        timestamp: new Date().toISOString()
```

**-> api/game/create-session**
Creation d'une nouvelle session de jeu: - ID de sessions -> sessionId = randomUUID(); - nouvelle instance de jeu;

```
    return:
        status: 'success',
        message: 'Game session created',
        sessionId,
        wsUrl: `/game/${sessionId}`

```

**-> api/game/:sessionId**
Websocket endpoint 1) Get into the given game session. Add client's websocket to the session. 2) send confirmation message type: connected; 3) Start broadcasting game state at 60fps.

**-> api/game/sessions**
List alls game sessions (debug purpose).

**-> api/game/settings**
modify the settings of the game for a given sessions id (in the header)

## Communication par WebSocket

_Client_ <-- WebSocket 1 --> _API_ <-- WebSocket 2 --> _Game-service_
Une seule connection par client, echange de messages en continue.
Message du server delivre a 60FPS a tous les clients de la session de jeu.
Expected message by the server:

```
    interface ClientMessage {
      type: 'paddle' | 'start' | 'stop' | 'ping';
      paddle?: 'left' | 'right';
      direction?: 'up' | 'down' | 'stop';
    }
```

Expected message by the client:

```
    interface ServerMessage {
      type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong';
      sessionId?: string;
      data?: any;
      message?: string;
    }
```

    Use of a switch to set actions on client message:

    Message's types:
    - paddle (move paddles)
    - ping (answer pong)
    - stop (stop the current game session)
    - start (start a new game session)

    serverMessage.data = game.getState()

## Game Logic

    Server broadcast game state as ServerMessage:
    ```
     interface GameState {
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
      cosmicBackground: number[][];
    }
    ```

the Ball is influenced by the cosmic background forcefield, animated by time.

### The Cosmic MicroWave BackGround && Perlin Noise

...
