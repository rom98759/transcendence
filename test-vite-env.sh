#!/bin/bash
# Script de test pour vérifier que les variables VITE_* sont bien injectées

echo "🔍 Test des variables d'environnement Vite dans le conteneur nginx"
echo "================================================================"

# Test 1: Vérifier que le conteneur existe
if ! docker ps --format "table {{.Names}}" | grep -q "nginx-proxy"; then
    echo "❌ Conteneur nginx-proxy introuvable. Lancez d'abord docker compose up"
    exit 1
fi

echo "✅ Conteneur nginx-proxy trouvé"

# Test 2: Vérifier les variables d'environnement dans le conteneur
echo "🔍 Variables d'environnement dans le conteneur..."
docker exec nginx-proxy env | grep VITE || echo "Aucune variable VITE trouvée"

# Test 3: Vérifier le contenu du fichier .env si présent
echo "🔍 Contenu du fichier .env dans nginx..."
docker exec nginx-proxy cat /usr/share/nginx/src/.env 2>/dev/null || echo "Pas de fichier .env trouvé"

# Test 4: Rechercher les variables dans le JavaScript compilé
echo "🔍 Recherche des variables OAuth dans le bundle JavaScript..."
GOOGLE_ID_FOUND=$(docker exec nginx-proxy find /usr/share/nginx/src/html -name "*.js" -exec grep -l "975337521411" {} \; 2>/dev/null | wc -l)
SCHOOL42_ID_FOUND=$(docker exec nginx-proxy find /usr/share/nginx/src/html -name "*.js" -exec grep -l "u-s4t2ud" {} \; 2>/dev/null | wc -l)

echo "📊 Résultats:"
echo "   - Fichiers JS contenant Google Client ID: $GOOGLE_ID_FOUND"
echo "   - Fichiers JS contenant School42 Client ID: $SCHOOL42_ID_FOUND"

# Test 5: Afficher un extrait du JavaScript pour debug
echo "🔍 Extrait du JavaScript principal..."
docker exec nginx-proxy find /usr/share/nginx/src/html -name "main-*.js" -exec head -c 500 {} \; 2>/dev/null || echo "Fichier main JS non trouvé"

echo "================================================================"

if [ $GOOGLE_ID_FOUND -gt 0 ] && [ $SCHOOL42_ID_FOUND -gt 0 ]; then
    echo "✅ Variables OAuth trouvées dans le JavaScript compilé!"
else
    echo "❌ Variables OAuth manquantes. Rebuild nécessaire."
    echo "💡 Commandes à exécuter:"
    echo "   docker compose down"
    echo "   docker compose up --build nginx-proxy"
fi