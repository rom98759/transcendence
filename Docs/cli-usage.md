# Interacting with Transcendence by CLI

## Connection to a new game session:

### 1. get Auth Cookie

The cookies is given back in the response's header by /api/auth/login.

```
curl -c cookies.txt -H "Content-Type: application/json" \
	-d '{"username":"admin","password":"Admin123!"}' \
	http://localhost:8080/api/auth/login
```

### 2. get a sessionId

The sessionId refere to an Game session. We must ask the server to create a session to initialize a new game.
A new game is created at session id. The id is returned in the response's body as JSON string.
It is then initialized at game.state.status = "waiting".
The game is waiting for the client's start message ({"type":"start"})

```
curl -i -b cookies.txt \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-user-name: admin" \
  -H "x-user-id: 1" \
  -d '{}' \
  http://localhost:8080/api/game/create-session

```

_formating the token, and set environnement variable_

```
SESSION_ID="session-id-returned-by-server"
TOKEN=$(grep token cookies.txt | awk '{print $7}')
WS_URL="ws://localhost:8080/api/game/$SESSION_ID"
```

### communicate with game-service with WebSocket

We can now connect to webSocket endPoint at api/game/sesion-123

```
wscat -c $WS_URL -H "cookie: token=$TOKEN"
```

Once connected, the server will send you a confirmation message "connected" _(see below for ServerMessage type)_.

#### Client Message to PongGame

Messaging the game-server should follow this format:

```
interface ClientMessage {
  type: 'paddle' | 'start' | 'stop' | 'ping'
  paddle?: 'left' | 'right'
  direction?: 'up' | 'down' | 'stop'
}
```

_Exemple (in wscat console): > {"paddle":"left","direction":"up"}_

#### Server Message to client

The server send you confirmation message for WebSocket connection.
Once the game started, the server will send to you the game state, reachable in data.

```
interface ServerMessage {
  type: 'connected' | 'state' | 'gameOver' | 'error' | 'pong'
  sessionId?: string
  data?: any
  message?: string
}

```

#### Deletion of session

When the game finish, the game session is cleanup, the websocket connection is also cleanup.
To play a second game we should fetch api/game/create-session again.
