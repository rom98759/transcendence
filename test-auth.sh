#!/bin/bash

# Script de test des services
# Usage: ./test-services.sh

set -e

BASE_URL="http://localhost:8080"
API_URL="$BASE_URL/api"
GATEWAY_URL="$BASE_URL/gateway"

echo "🧪 Tests des services Transcendance"
echo "=================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour tester une URL
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_code)"
        return 1
    fi
}

# Fonction pour tester avec corps de réponse
test_endpoint_json() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"

    echo -n "Testing $name... "

    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    body=$(echo "$response" | head -n -1)
    code=$(echo "$response" | tail -n 1)

    if [ "$code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $code)"
        echo "   Response: $body" | head -c 100
        echo ""
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $code, expected $expected_code)"
        echo "   Response: $body"
        return 1
    fi
}

echo "📡 Health Checks"
echo "----------------"
test_endpoint "Nginx health" "$BASE_URL/health"
test_endpoint "Gateway health" "$GATEWAY_URL/health"
test_endpoint_json "Gateway healthAll" "$GATEWAY_URL/healthAll"
test_endpoint "Auth health" "$API_URL/auth/health"
echo ""

echo "📄 Static content"
echo "-----------------"
test_endpoint "Homepage" "$BASE_URL/"
echo ""

echo "🔐 Gateway routes"
echo "-----------------"
test_endpoint_json "Gateway root" "$GATEWAY_URL/"
test_endpoint_json "Gateway help" "$GATEWAY_URL/help"
echo ""

echo "🔒 Auth routes (public)"
echo "-----------------------"
test_endpoint_json "Auth service root health" "$API_URL/auth/health"

# Test registration
echo -n "Testing user registration... "
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"testuser_$(date +%s)\",\"email\":\"test_$(date +%s)@example.com\",\"password\":\"testpass123\"}" \
    2>/dev/null)
REGISTER_CODE=$(echo "$REGISTER_RESPONSE" | tail -n 1)

if [ "$REGISTER_CODE" = "201" ]; then
    echo -e "${GREEN}✓ OK${NC} (HTTP $REGISTER_CODE)"
else
    echo -e "${YELLOW}⚠ INFO${NC} (HTTP $REGISTER_CODE - user may already exist)"
fi

# Test login
echo -n "Testing user login... "
LOGIN_RESPONSE=$(curl -s -c /tmp/cookies.txt -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"wrongpass"}' \
    2>/dev/null)
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)

if [ "$LOGIN_CODE" = "401" ]; then
    echo -e "${GREEN}✓ OK${NC} (HTTP $LOGIN_CODE - correctly rejected bad credentials)"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $LOGIN_CODE)"
fi
echo ""

echo "🔒 Protected routes"
echo "-------------------"
echo -n "Testing /me without auth... "
ME_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/me" 2>/dev/null)

if [ "$ME_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✓ OK${NC} (HTTP $ME_RESPONSE - correctly rejected)"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $ME_RESPONSE - should be 401)"
fi
echo ""

echo "=================================="
echo -e "${GREEN}Tests terminés !${NC}"
echo ""
echo "💡 Commandes utiles :"
echo "   make logs         # Voir tous les logs"
echo "   make logs-auth    # Voir logs auth-service"
echo "   make logs-api     # Voir logs api-gateway"
echo "   make logs-nginx   # Voir logs nginx"
