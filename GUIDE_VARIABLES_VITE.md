# Guide de résolution: Variables VITE\_\* manquantes

## Problème identifié 🔍

Les variables d'environnement `VITE_GOOGLE_CLIENT_ID` et `VITE_SCHOOL42_CLIENT_ID` ne sont pas disponibles dans le JavaScript compilé par Vite, ce qui provoque l'erreur "school42 client ID not configured".

## Solutions implémentées ✅

### 1. Fichier .env local pour Vite

**Créé**: [srcs/nginx/.env](srcs/nginx/.env)

```bash
VITE_GOOGLE_CLIENT_ID=975337521411-bg5gsbqmfuh22s40bpmt3eh3mlk60bf5.apps.googleusercontent.com
VITE_SCHOOL42_CLIENT_ID=u-s4t2ud-1c9d4899ae55b582cdc91ef8d92976879752472d19d9d0aad4eb08978074aa60
```

### 2. Arguments Docker Build

**Modifié**: [docker-compose.yml](srcs/docker-compose.yml) et [dev-docker-compose.yml](srcs/dev-docker-compose.yml)

```yaml
nginx-proxy:
  build:
    args:
      VITE_GOOGLE_CLIENT_ID: '${VITE_GOOGLE_CLIENT_ID:-975337521411-bg5gsbqmfuh22s40bpmt3eh3mlk60bf5.apps.googleusercontent.com}'
      VITE_SCHOOL42_CLIENT_ID: '${VITE_SCHOOL42_CLIENT_ID:-u-s4t2ud-1c9d4899ae55b582cdc91ef8d92976879752472d19d9d0aad4eb08978074aa60}'
```

### 3. Debug ajouté dans Dockerfile

**Modifié**: [srcs/nginx/Dockerfile](srcs/nginx/Dockerfile)

- Ajout de commandes `echo` pour vérifier les variables pendant le build
- Variables d'environnement correctement exposées avec `ENV`

### 4. Debug côté frontend

**Modifié**: [OAuthButton.tsx](srcs/nginx/src/components/OAuthButton.tsx)

- Ajout de `console.log` pour débugger les variables Vite

## Instructions de test 🧪

### 1. Rebuild complet

```bash
# Arrêter les conteneurs
docker compose down

# Rebuild avec les nouvelles variables
docker compose up --build nginx-proxy

# Ou pour dev
docker compose -f dev-docker-compose.yml up --build nginx-proxy
```

### 2. Vérifier avec le script de test

```bash
# Rendre le script exécutable
chmod +x test-vite-env.sh

# Lancer le test
./test-vite-env.sh
```

### 3. Vérification manuelle

1. **Ouvrir la console du navigateur** sur https://localhost:4430
2. **Chercher** les logs de debug:

   ```
   🔍 Debug Variables Vite: {
     VITE_GOOGLE_CLIENT_ID: "975337521411-bg5gsbqmfuh22s40bpmt3eh3mlk60bf5.apps.googleusercontent.com",
     VITE_SCHOOL42_CLIENT_ID: "u-s4t2ud-1c9d4899ae55b582cdc91ef8d92976879752472d19d9d0aad4eb08978074aa60",
     ...
   }
   ```

3. **Tester les boutons OAuth** - ils ne devraient plus afficher "client ID not configured"

## Diagnostics possibles 🔧

### Si les variables sont encore vides:

1. **Vérifier les logs Docker** pendant le build:

   ```bash
   docker compose up --build nginx-proxy 2>&1 | grep VITE
   ```

   Vous devriez voir:

   ```
   VITE_GOOGLE_CLIENT_ID=975337521411-bg5gsbqmfuh22s40bpmt3eh3mlk60bf5.apps.googleusercontent.com
   VITE_SCHOOL42_CLIENT_ID=u-s4t2ud-1c9d4899ae55b582cdc91ef8d92976879752472d19d9d0aad4eb08978074aa60
   ```

2. **Vérifier que Vite lit le fichier .env**:

   ```bash
   docker exec nginx-proxy cat /app/srcs/nginx/.env
   ```

3. **Forcer la recompilation** en supprimant le cache:
   ```bash
   docker system prune -f
   docker compose build --no-cache nginx-proxy
   ```

## Architecture finale 📋

```
Frontend (Vite) ──→ Variables VITE_*
     │                    │
     ├─ Fichier .env ────┘
     │  (développement)
     │
     └─ Docker ENV ──────┘
        (production)
```

- **Développement**: Vite lit `srcs/nginx/.env`
- **Production**: Variables passées via Docker build args → ENV → Vite build

## Validation 🎯

Une fois résolu, vous devriez voir dans le navigateur:

- ✅ Boutons OAuth sans message d'erreur
- ✅ Logs de debug avec les Client IDs complets
- ✅ Redirection OAuth fonctionnelle vers Google/42
