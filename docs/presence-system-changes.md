# Système Heartbeat + JWT - Résumé des modifications

## ✅ Fichiers créés

### 1. `srcs/auth/src/services/presence.service.ts`

Service Redis pour gérer les présences utilisateurs :

- `recordHeartbeat(userId)` - Enregistre un ping
- `isUserOnline(userId)` - Vérifie le statut
- `getBulkOnlineStatus(userIds[])` - Statut bulk (optimisé)
- `cleanupOfflineUsers()` - Job de nettoyage automatique
- Structure Redis : SET `online_users` + clés `presence:{userId}`

### 2. `docs/presence-system.md`

Documentation complète du système

## 📝 Fichiers modifiés

### Backend (Service Auth)

#### `srcs/auth/package.json`

- ✅ Ajout de `ioredis@^5.4.1`

#### `srcs/auth/src/index.ts`

- ✅ Import de `presence.service`
- ✅ Initialisation du client Redis au démarrage
- ✅ Démarrage du job de cleanup (60s)

#### `srcs/auth/src/controllers/auth.controller.ts`

- ✅ Import de `presence.service`
- ✅ Nouvelle fonction `heartbeatHandler()` - Endpoint POST /heartbeat
- ✅ Modification de `listAllUsers()` - Ajoute le champ `online` via `getBulkOnlineStatus()`

#### `srcs/auth/src/routes/auth.routes.ts`

- ✅ Import de `heartbeatHandler`
- ✅ Nouvelle route `POST /heartbeat` (rate limit: 10/10s)

### Frontend

#### `srcs/nginx/src/html/index.html`

- ✅ Nouveau script de heartbeat (avant `</body>`)
  - Envoie POST /api/auth/heartbeat toutes les 15s
  - Détection de tab visible (Page Visibility API)
  - Démarrage/arrêt automatique selon état connexion
  - Optimisation : ne ping pas si tab inactive

#### `srcs/nginx/src/html/admin.html`

- ✅ Ajout de variables globales `autoRefreshTimer` et `AUTO_REFRESH_INTERVAL`
- ✅ Modification de `loadUsers()` - Paramètre `silent` pour refresh sans alert
- ✅ Nouvelle fonction `startAutoRefresh()` - Démarre le refresh auto
- ✅ Nouvelle fonction `stopAutoRefresh()` - Arrête le refresh auto
- ✅ Modification de `showCreateUserModal()` - Pause le refresh
- ✅ Modification de `hideCreateUserModal()` - Redémarre le refresh
- ✅ Modification de `showEditUserModal()` - Pause le refresh
- ✅ Modification de `hideEditUserModal()` - Redémarre le refresh
- ✅ Appel de `startAutoRefresh()` dans `DOMContentLoaded`
- ✅ Cleanup sur `beforeunload`

## 🔧 Pour tester

### 1. Rebuild et redémarrer le service auth

```bash
# Depuis la racine du projet
make down
cd srcs/auth
npm install
cd ../..
make up
```

### 2. Vérifier Redis

```bash
# Entrer dans le container Redis
docker exec -it transcendence-redis-1 redis-cli

# Vérifier les clés
KEYS *
# Devrait voir: online_users, presence:1, etc.

# Voir les utilisateurs en ligne
SMEMBERS online_users

# Voir le TTL d'une présence
TTL presence:1
```

### 3. Tester dans le navigateur

1. **Ouvrir https://localhost:4430**
2. **Se connecter** (ex: admin/adminpassword)
3. **Ouvrir la console** (F12)
4. **Voir les logs** : "Starting heartbeat system", "Heartbeat sent successfully"

### 4. Tester le panneau admin

1. **Accéder à /admin**
2. **Observer la colonne "Statut"**
3. **Attendre 20s** → La liste devrait se refresh automatiquement
4. **Fermer l'onglet d'un autre user** → Après ~45s, il passe "Hors ligne"

## 📊 Timeline de détection

```
T+0s   : User ouvre la page
T+0s   : Premier heartbeat envoyé
T+15s  : Heartbeat #2
T+30s  : Heartbeat #3
...

User ferme la page :
T+0s   : Dernier heartbeat reçu
T+45s  : TTL expire → User considéré offline
T+60s  : Cleanup job retire le user du SET online_users
```

## ⚠️ Points d'attention

### Rate limiting

- **Endpoint heartbeat :** 10 requêtes / 10 secondes
- Avec 15s d'intervalle, OK pour usage normal
- Si besoin d'ajuster : `auth.routes.ts` ligne ~73

### Redis obligatoire

- Le service auth crashera si Redis n'est pas accessible
- Solution : Ajouter un fallback ou retry logic dans `presence.service.ts`

### Cookie auth_token

- Le frontend vérifie `auth_token` pour savoir si connecté
- Si vous utilisez un autre nom de cookie, modifier `isUserLoggedIn()` dans `index.html`

## 🎉 Fonctionnalités complètes

✅ Heartbeat automatique côté client (15s)
✅ Détection de tab active/inactive
✅ Endpoint backend `/api/auth/heartbeat`
✅ Structure Redis optimisée (SET + clés TTL)
✅ Cleanup automatique (60s)
✅ Status `online` dans `/api/auth/admin/users`
✅ Refresh auto du panneau admin (20s)
✅ Pause refresh pendant édition
✅ Documentation complète

## 📈 Prochaines étapes

1. **Tester en production** avec plusieurs utilisateurs
2. **Monitorer Redis** (utilisation mémoire, ops/s)
3. **Ajuster les intervalles** selon les besoins
4. **Ajouter des métriques** (Prometheus/Grafana)
5. **Implémenter "last seen"** pour users offline
