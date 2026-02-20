# Authentication OAuth 2.0 - Guide de Configuration et Test

## Overview

Implémentation complète de l'authentification OAuth 2.0 pour Google et 42 School avec auto-création d'utilisateurs et flux client-side.

### Architecture

- **Flow**: Client-side (Frontend redirige vers providers → Callback → Auth service)
- **Auto-création**: Les comptes OAuth sont créés automatiquement
- **Base de données**: Extension de la table `users` existante avec colonnes OAuth
- **JWT**: Même système JWT que l'authentification classique

## Configuration

### 1. Backend (Service Auth)

Ajouter dans `.env.auth`:

```bash
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# 42 School OAuth 2.0
SCHOOL42_CLIENT_ID=your-42-client-id
SCHOOL42_CLIENT_SECRET=your-42-secret

# Base URL pour callbacks
OAUTH_BASE_URL=https://localhost:4430
```

### 2. Frontend (Nginx)

Créer `.env` avec:

```bash
# Côté client: seulement les client IDs (pas de secrets!)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_SCHOOL42_CLIENT_ID=your-42-client-id
```

### 3. Configuration des Providers

#### Google Cloud Console

1. Créer projet sur https://console.cloud.google.com/
2. Activer Google+ API
3. Credentials > OAuth 2.0 Client ID
4. Type: Web Application
5. Authorized redirect URIs:
   - `https://localhost:4430/auth/oauth/google/callback`

#### 42 School

1. Aller sur https://profile.intra.42.fr/
2. Settings > API > Register new application
3. Redirect URI: `https://localhost:4430/auth/oauth/school42/callback`
4. Scopes: `public`

## Endpoints API

### POST `/auth/oauth/:provider/callback`

**Provider**: `google` | `school42`

**Body**:

```json
{
  \"code\": \"authorization_code_from_provider\",
  \"state\": \"optional_csrf_token\"
}
```

**Response 200**:

```json
{
  \"result\": {
    \"message\": \"Login successful with google\",
    \"username\": \"johndoe\",
    \"provider\": \"google\",
    \"isNewUser\": false
  }
}
```

**Errors**:

- `400`: Provider invalide, code manquant ou validation échouée
- `502`: Erreur communication OAuth provider
- `503`: Service UM indisponible (rollback auto)
- `500`: Erreur interne

## Flow Technique

### 1. Frontend → Provider OAuth

```typescript
// URL générée côté client
const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?
  client_id=${clientId}&
  redirect_uri=${redirectUri}&
  response_type=code&
  scope=openid profile email`;

// Redirection
window.location.href = oauthUrl;
```

### 2. Provider → Frontend Callback

```
https://localhost:4430/auth/oauth/google/callback?code=abc123&state=xyz
```

### 3. Frontend → Auth Service

```typescript
await authApi.oauthCallback('google', {
  code: 'abc123',
  state: 'xyz',
});
```

### 4. Auth Service Processing

1. **Token Exchange**: `code` → `access_token`
2. **Profile Fetch**: `access_token` → `user_profile`
3. **User Management**: Trouver ou créer utilisateur
4. **UM Integration**: Synchroniser avec service users
5. **JWT Generation**: Générer token de session

## Base de Données

### Extension Table `users`

```sql
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN school42_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN oauth_email TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

### Contraintes d'Unicité

- `google_id`: Un compte Google par utilisateur
- `school42_id`: Un compte 42 par utilisateur
- `email`: Liaison automatique si email existe déjà

## Testing

### 1. Test Manuel

1. Démarrer les services:

   ```bash
   make dev
   ```

2. Aller sur `https://localhost:4430/login`

3. Cliquer \"Continuer avec Google\" ou \"Continuer avec 42\"

4. Vérifier:
   - Redirection vers provider
   - Callback traité correctement
   - JWT généré et stocké
   - Redirection vers dashboard/profile

### 2. Logs à Vérifier

**Auth Service**:

```
oauth_exchange_start - Début échange code/token
oauth_profile_received - Profil utilisateur récupéré
oauth_user_created - Nouveau compte créé
oauth_login_success - Connexion réussie
```

**Erreurs Courantes**:

```
oauth_exchange_failed - Problème token exchange
oauth_rollback - Erreur UM service, rollback auth DB
```

### 3. Test avec curl

```bash
# Simuler callback OAuth (après avoir récupéré un vrai code)
curl -X POST https://localhost:4430/api/auth/oauth/google/callback \\
  -H \"Content-Type: application/json\" \\
  -d '{\"code\": \"real_code_from_google\", \"state\": \"test\"}'
```

## Monitoring & Logs

### Événements Importants

- `oauth_exchange_start`: Début processus OAuth
- `oauth_user_created`: Nouveau compte auto-créé
- `oauth_user_linked`: Compte OAuth lié à utilisateur existant
- `oauth_login_success`: Connexion OAuth réussie

### Métriques Rate Limiting

- OAuth callback: 10 req/5min (production)
- Token exchange timeout: 10s
- User profile timeout: 8s

## Sécurité

### Bonnes Pratiques

✅ **Client IDs publiques côté frontend uniquement**
✅ **Secrets OAuth côté backend seulement**
✅ **HTTPS obligatoire pour callbacks**
✅ **State CSRF protection (optionnel, implémenté)**
✅ **Validation stricte des codes d'autorisation**
✅ **Rate limiting sur callbacks**
✅ **Rollback automatique en cas d'erreur UM**

### Configuration Production

- [ ] Changer `OAUTH_BASE_URL` pour domaine production
- [ ] Configurer redirect URIs chez providers
- [ ] Vérifier rate limits en production
- [ ] Monitorer logs d'erreur OAuth
- [ ] Backup régulier avec nouvelles colonnes users

## Troubleshooting

### Erreur \"Invalid client_id\"

**Cause**: Client ID incorrect ou non configuré
**Solution**: Vérifier `GOOGLE_CLIENT_ID`/`SCHOOL42_CLIENT_ID`

### Erreur \"Redirect URI mismatch\"

**Cause**: URI callback non autorisée chez provider
**Solution**: Ajouter `https://localhost:4430/auth/oauth/{provider}/callback`

### Erreur \"UM service unavailable\"

**Cause**: Service users non accessible
**Solution**: Rollback automatique appliqué, vérifier service UM

### Token \"Invalid authorization code\"

**Cause**: Code expiré ou déjà utilisé
**Solution**: Codes OAuth à usage unique, recommencer le flow
