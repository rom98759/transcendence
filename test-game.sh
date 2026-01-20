#!/bin/bash

if ! command -v wscat &> /dev/null; then
  echo -e "${RED}❌ wscat is not installed${NC}"
  echo "Please install it with: npm install -g wscat"
  exit 1
fi

WSBASE_URL="wss://localhost:4430"
BASE_URL="https://localhost:4430"
API_URL="$BASE_URL/api"
CREATE_SESSION_URL="$API_URL/game/create-session"
LOGIN_URL="$API_URL/auth/login"
WSAPI_URL="$WSBASE_URL/api"
GATEWAY_URL="$BASE_URL/public"

echo -e "\t\t\t🧪 Test game-service"
echo -e "========================================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BOLD='\e[1m'
BOLDEND='\e[0m'

#### TEST 1 # Authentificate user as admin -> creating cookie
printf "%b" "${BOLD}1. Creating auth cookie as admin user:${BOLDEND}"
RESPONSE=$(curl -k -c cookies.txt -H "Content-Type: application/json" -d '{"username":"admin","password":"Admin123!"}' "${LOGIN_URL}" 2>/dev/null)
TOKEN=$(grep token cookies.txt | awk '{print $7}')
RESPONSE=$(echo "$RESPONSE" | jq -r '.result.message' 2>/dev/null)
if [ "$RESPONSE" = "Bienvenue admin !" ]; then
    echo -e "${GREEN}\t✅Login successful${NC}"
	printf "\tToken: %s...\n" "$(printf "%s" "$TOKEN" | cut -c1-50)"
else
    echo -e "${RED}\t❌Login failed${NC}"
fi

#### TEST 2 # Create a new Game Session
printf "%b" "${BOLD}2. Create game session:${BOLDEND}"
RESPONSE=$(curl -k -b cookies.txt \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-user-name: admin" \
  -H "x-user-id: 1" \
  -d '{}' $CREATE_SESSION_URL 2>/dev/null)
SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId' 2>/dev/null)
WS_URL=$WSAPI_URL$(echo "$RESPONSE" | jq -r '.wsUrl' 2>/dev/null)
RESPONSE=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
if [ "$RESPONSE" = "success" ]; then
  echo -e "${GREEN}\t\t\t✅Game creation successful${NC}"
  echo -e "\tSession ID:\t$SESSION_ID\n\tWS_URL ID:\t$WS_URL"
else
  echo -e "${RED}\t\t\t❌Game creation failed${NC}"
  echo -e "\treceived:\t$WS_OUTPUT" | head -n 1
fi

#### TEST 3 # Connect to the Game Session should work
printf "%b" "${BOLD}3. WebSocket connect:${BOLDEND}"
WS_OUTPUT=$({ echo "" & sleep 1; } | wscat -c "$WS_URL" --no-check -H "cookie: token=$TOKEN" 2>&1)
# CONNECTION_STATUS=$(echo "$WS_OUTPUT" | jq -r '.type' 2>/dev/null)
CONNECTION_STATUS=$(printf '%s\n' "$WS_OUTPUT" | jq -r 'select(.type == "connected") | .type' | head -n 1)
if [ "$CONNECTION_STATUS" == "connected" ]; then
  echo -e "${GREEN}\t\t\t✅Connection successful${NC}"
else
  echo -e "${RED}\t\t\t❌Connection failed${NC}"
  echo -e "${RED}\tExpected message: {"type":"connected"...}${NC}"
fi
echo -e "\treceived:\t$WS_OUTPUT" | head -n 1

#### TEST 4 # Connect to wrong Game session should not work
printf "%b" "${BOLD}4. Connection to invalid session:${BOLDEND}"
WS_OUTPUT=$({ echo "" & sleep 1; } | wscat -c "${WS_URL}wrong" --no-check -H "cookie: token=$TOKEN" 2>&1)
CONNECTION_STATUS=$(echo "$WS_OUTPUT" | jq -r '.type' 2>/dev/null)
if [ "$CONNECTION_STATUS" == "error" ]; then
  echo -e "${GREEN}\t✅Connection failed${NC}"
else
  echo -e "${RED}\t❌Connection failed${NC}"
  echo -e "${RED}\tExpected message: {"type":"error"...}${NC}"
fi
echo -e "\treceived:\t$WS_OUTPUT"

#### TEST 5 # Connect to the Game Session with invalid credential
printf "%b" "${BOLD}5. WS connect with invalid credential:${BOLDEND}"
WS_OUTPUT=$({ echo "" & sleep 2; } | wscat -c "$WS_URL" --no-check -H "cookie: token='wrongToken" 2>&1)
ERROR_CODE=$(echo "$WS_OUTPUT" | grep -o -E '[0-9]{3}')

if [ "$ERROR_CODE" == "401" ]; then
  echo -e "${GREEN}\t✅Invalid credential${NC}"
else
  echo -e "${RED}\t❌Test failed${NC}"
  echo -e "${RED}\tExpected: error: Unexpected server received: 401${NC}"
fi
echo -e "\treceived:\t$WS_OUTPUT"

#### TEST 6 # RECONNECT TO OLD SESSION should not work (cleaned)
printf "%b" "${BOLD}6. WS connect to deleted session:${BOLDEND}"
WS_OUTPUT=$({ echo "" & sleep 1; } | wscat -c "$WS_URL" --no-check -H "cookie: token=$TOKEN" 2>&1)
CONNECTION_STATUS=$(echo "$WS_OUTPUT" | jq -r '.type' 2>/dev/null)
if [ "$CONNECTION_STATUS" == "error" ]; then
  echo -e "${GREEN}\t✅No game for this session${NC}"
else
  echo -e "${RED}\t❌Test failed${NC}"
  echo -e "${RED}\tExpected: {"type":"error"}${NC}"
fi
echo -e "\treceived:\t$WS_OUTPUT"

exit 0
