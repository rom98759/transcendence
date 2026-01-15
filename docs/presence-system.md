# Système de Présence - Heartbeat + JWT

## 🎯 Vue d'ensemble

Ce système track les utilisateurs en ligne en combinant **JWT pour l'authentification** et **heartbeat périodique** pour détecter la présence active.

## 🏗️ Architecture

### Backend (Service Auth)

#### 1. Service Redis (`presence.service.ts`)

**Structure Redis optimisée :**

```
SET: online_users → {userId1, userId2, userId3...}
Keys: presence:{userId} → timestamp (TTL: 45s)
```

**Fonctions principales :**

- `recordHeartbeat(userId)` - Enregistre un heartbeat
- `isUserOnline(userId)` - Vérifie si un user est online
- `getBulkOnlineStatus(userIds[])` - Status de plusieurs users en une requête
- `cleanupOfflineUsers()` - Job de nettoyage (toutes les 60s)

**Avantages :**

- ✅ O(users_online) au lieu de O(total_users)
- ✅ Requête bulk optimisée avec pipeline Redis
- ✅ Cleanup automatique des présences expirées

#### 2. Endpoint Heartbeat (`/api/auth/heartbeat`)

**Requête :**

```http
POST /api/auth/heartbeat
Cookie: auth_token=xxx
```

**Réponse :**

```json
{
  "success": true,
  "timestamp": 1705234567890
}
```

**Rate limiting :** 10 requêtes / 10 secondes

#### 3. Endpoint Liste Utilisateurs (`/api/auth/admin/users`)

Retourne maintenant le champ `online` :

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "is2FAEnabled": false,
      "online": true
    }
  ]
}
```

### Frontend

#### 1. Client Heartbeat (`index.html`)

**Configuration :**

- Intervalle : 15 secondes
- Détection de tab visible (Page Visibility API)
- Démarrage/arrêt automatique selon l'état de connexion

**Fonctionnalités :**

- ✅ Envoie heartbeat uniquement si utilisateur connecté
- ✅ Pause si tab inactive (optimisation)
- ✅ Redémarre automatiquement au retour sur la tab
- ✅ Arrête sur déconnexion
- ✅ Nettoie sur fermeture de page

**Code simplifié :**

```javascript
setInterval(() => {
  if (isUserLoggedIn() && isTabVisible) {
    fetch('/api/auth/heartbeat', {
      method: 'POST',
      credentials: 'include',
    });
  }
}, 15000);
```

#### 2. Refresh Auto (`admin.html`)

**Configuration :**

- Intervalle : 20 secondes
- Pause pendant l'édition (modals ouverts)
- Refresh silencieux (sans alert)

**Fonctionnalités :**

- ✅ Mise à jour automatique des statuts online
- ✅ Pause quand modal ouverte
- ✅ Redémarre après fermeture modal
- ✅ Nettoie sur fermeture de page

## 📊 Flux de données

```
┌─────────────┐     Heartbeat      ┌──────────────┐
│   Client    │ ──────────────────> │  Auth API    │
│  (index.html)│   POST /heartbeat  │              │
└─────────────┘   (toutes les 15s)  └──────────────┘
                                            │
                                            ▼
                                    ┌──────────────┐
                                    │    Redis     │
                                    │  SET user:1  │
                                    │  SADD online │
                                    └──────────────┘
                                            │
                                            ▼
┌─────────────┐    GET /admin/users ┌──────────────┐
│   Admin     │ <──────────────────  │  Auth API    │
│ (admin.html)│   (toutes les 20s)  │ + Redis check│
└─────────────┘                      └──────────────┘
```

## 🚀 Installation

### 1. Installer les dépendances

```bash
cd srcs/auth
npm install
```

### 2. Configuration Redis

Le service utilise les variables d'environnement :

```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. Démarrage

```bash
# Depuis la racine
make up

# Ou avec docker-compose
docker-compose up -d
```

## 🔧 Configuration

### Temps de présence (TTL)

Dans `presence.service.ts` :

```typescript
const PRESENCE_TTL = 45; // secondes
```

**Recommandation :** Entre 30 et 60 secondes

### Intervalle heartbeat client

Dans `index.html` :

```javascript
const HEARTBEAT_INTERVAL = 15000; // millisecondes
```

**Recommandation :** Entre 10 et 20 secondes

### Intervalle refresh admin

Dans `admin.html` :

```javascript
const AUTO_REFRESH_INTERVAL = 20000; // millisecondes
```

**Recommandation :** Entre 15 et 30 secondes

## 📈 Performances

### Charge Redis

**Par utilisateur actif :**

- 1 clé `presence:{userId}` (< 100 bytes)
- 1 entrée dans SET `online_users` (~ 10 bytes)

**Total pour 1000 utilisateurs :** ~110 KB

**Opérations par seconde :**

- 1000 users × (1 heartbeat / 15s) = **~67 ops/s**

### Charge réseau

**Par utilisateur :**

- 1 requête POST /heartbeat toutes les 15s
- Taille : ~500 bytes (headers + body)

**Bande passante pour 1000 users :** ~33 KB/s

## 🐛 Debugging

### Logs backend

```bash
# Voir les logs du service auth
docker logs -f transcendence-auth-1

# Filtrer les heartbeats
docker logs -f transcendence-auth-1 | grep heartbeat
```

### Console frontend

```javascript
// index.html - Activer debug
localStorage.setItem('debug_heartbeat', 'true');

// Vérifier le statut
console.log('Heartbeat active:', !!heartbeatTimer);
console.log('User logged in:', isUserLoggedIn());
```

### Redis CLI

```bash
# Entrer dans le container Redis
docker exec -it transcendence-redis-1 redis-cli

# Vérifier les présences
KEYS presence:*
SMEMBERS online_users
TTL presence:1
```

## ⚠️ Limitations connues

1. **Délai de détection :** Jusqu'à 45 secondes pour détecter une déconnexion
2. **Redis requis :** Le système ne fonctionne pas sans Redis
3. **Tabs multiples :** Un utilisateur avec plusieurs tabs est compté comme 1 seul "online"
4. **Fermeture brutale :** Si le navigateur crash, l'utilisateur reste "online" jusqu'au TTL

## 🎯 Améliorations futures

- [ ] Ajouter un indicateur visuel de statut dans l'UI
- [ ] Gérer les reconnexions WebSocket pour temps réel instantané
- [ ] Tracker le "last seen" pour les utilisateurs offline
- [ ] Statistiques d'activité (temps passé en ligne)
- [ ] API pour obtenir la liste complète des users online

## 📚 Références

- [Redis SETEX](https://redis.io/commands/setex)
- [Redis SADD](https://redis.io/commands/sadd)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [ioredis Pipeline](https://github.com/redis/ioredis#pipelining)
