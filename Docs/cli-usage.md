# Interacting with Transcendence by CLI
## Connection to a new game session:
### 1. get Auth Cookie
```
curl -c cookies.txt -H "Content-Type: application/json" \
	-d '{"username":"admin","password":"Admin123!"}' \
	http://localhost:8080/api/auth/login
```
### 2. get a sessionId
```
curl -i -b cookies.txt \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-user-name: admin" \
  -H "x-user-id: 1" \
  -d '{}' \
  http://localhost:8080/api/game/create-session

```
_formating the token_
```
TOKEN=$(grep token cookies.txt | awk '{print $7}')
WS_URL="ws://localhost:8080/api/game/sessionId"

```
### communicate with game-service with WebSocket
```
wscat -c $WS_URL -H "cookie: token=$TOKEN" 
```


