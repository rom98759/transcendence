# 🔐 Migration des Variables d'Environnement - Documentation

## 📋 Résumé des Changements

Cette migration supprime **toutes les valeurs hardcodées** du code et centralise la configuration dans les fichiers `.env` avec une **validation stricte** via `envalid`.

---

## ✨ Nouveautés

### 🛡️ Validation Stricte des Variables d'Environnement

Chaque service possède maintenant un fichier `src/config/env.ts` qui :

1. ✅ **Charge et valide** toutes les variables d'environnement au démarrage
2. ✅ **Bloque le démarrage** si des valeurs critiques sont manquantes ou invalides
3. ✅ **Détecte les secrets par défaut** (ex: `supersecretkey`) et refuse de démarrer
4. ✅ **Vérifie la longueur minimale** des secrets JWT (32 caractères minimum)
5. ✅ **Affiche des avertissements** pour les mots de passe par défaut en production

### 🎯 Services Mis à Jour

| Service        | Fichier de Configuration            | Statut      |
| -------------- | ----------------------------------- | ----------- |
| **Auth**       | `srcs/auth/src/config/env.ts`       | ✅ Validé   |
| **Gateway**    | `srcs/gateway/src/config/env.ts`    | ✅ Validé   |
| **Users**      | `srcs/users/src/config/env.ts`      | ✅ Existant |
| **Blockchain** | `srcs/blockchain/src/config/env.ts` | ✅ Validé   |
| **Game**       | `srcs/game/src/config/env.ts`       | ✅ Validé   |

---

## 🔑 Variables d'Environnement par Service

### 🔐 Auth Service (`.env.auth`)

```bash
# JWT Secret - CRITICAL SECURITY
JWT_SECRET=<32+ caractères cryptographiquement sécurisés>

# Service Configuration
AUTH_SERVICE_PORT=3001
AUTH_SERVICE_NAME=auth-service
AUTH_DB_PATH=/data/auth.db

# Redis Configuration
REDIS_HOST=redis-broker
REDIS_PORT=6379
REDIS_PASSWORD=

# User Management Service
UM_SERVICE_NAME=user-service
UM_SERVICE_PORT=3002

# Application
APP_NAME=Transcendence

# Admin User (CHANGE IN PRODUCTION!)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@transcendence.local
ADMIN_PASSWORD=<mot de passe fort>

# Invite User (CHANGE IN PRODUCTION!)
INVITE_USERNAME=invite
INVITE_EMAIL=invite@transcendence.local
INVITE_PASSWORD=<mot de passe fort>
```

### 🌐 Gateway Service (`.env.gateway`)

```bash
# JWT Secret - MUST match auth service!
JWT_SECRET=<même secret que auth>

# Gateway Configuration
API_GATEWAY_PORT=3000
API_GATEWAY_NAME=api-gateway

# Proxy Configuration
PROXY_TIMEOUT_MS=5000

# Rate Limiting
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=1 minute

# Services Configuration
AUTH_SERVICE_NAME=auth-service
AUTH_SERVICE_PORT=3001

UM_SERVICE_NAME=user-service
UM_SERVICE_PORT=3002

GAME_SERVICE_NAME=game-service
GAME_SERVICE_PORT=3003

BK_SERVICE_NAME=blockchain-service
BK_SERVICE_PORT=3005
```

### 🎮 Game Service (`.env.game`)

```bash
# Game Service Configuration
GAME_SERVICE_PORT=3003
GAME_SERVICE_NAME=game-service

# Redis Configuration (for pub/sub)
REDIS_HOST=redis-broker
REDIS_PORT=6379
REDIS_PASSWORD=

# Game Engine Configuration
GAME_TICK_RATE=60
GAME_MAX_SESSIONS=100
GAME_SESSION_TIMEOUT_MS=300000
```

### ⛓️ Blockchain Service (`.env.blockchain`)

```bash
# Service Configuration
BK_SERVICE_PORT=3005
BK_SERVICE_NAME=blockchain-service

# Database Configuration
BLOCK_DB_PATH=/data/blockchain.db

# Blockchain Configuration
BLOCKCHAIN_READY=false
AVALANCHE_RPC_URL=http://localhost:8545
GAME_STORAGE_ADDRESS=0x...
BLOCKCHAIN_PRIVATE_KEY=0x...
```

---

## 🚨 Sécurité Renforcée

### ❌ Valeurs Interdites pour JWT_SECRET

Le système **refuse de démarrer** si `JWT_SECRET` contient l'une de ces valeurs :

- `supersecretkey`
- `supersecretke1`
- `changeme`
- `secret`
- `password`
- `default`
- `test`

### ✅ Exigences de Sécurité

1. **JWT_SECRET** :
   - Minimum **32 caractères**
   - Doit être **cryptographiquement sécurisé**
   - **Identique** dans `auth` et `gateway`

2. **Générer un secret sécurisé** :

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Production** :
   - ⚠️ Changer `ADMIN_PASSWORD` et `INVITE_PASSWORD`
   - ⚠️ Utiliser un JWT_SECRET unique
   - ⚠️ Ne jamais commiter les fichiers `.env` (seulement `.env.example`)

---

## 📝 Exemple de Configuration de Développement

### Générer un JWT_SECRET

```bash
# Générer un secret sécurisé
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Exemple de sortie: 1f952a3fdcca49b3c3ad5b27b2345f0ccdb942678a9dc036470b56f784629b1f
```

### Copier et personnaliser les fichiers

```bash
cd srcs/
cp .env.example .env
cp .env.auth.example .env.auth
cp .env.gateway.example .env.gateway
cp .env.game.example .env.game
cp .env.blockchain.example .env.blockchain
cp .env.um.example .env.um

# Éditer chaque fichier et remplacer les valeurs par défaut
```

---

## 🔄 Changements dans le Code

### Avant (❌ Mauvais)

```typescript
// Valeurs hardcodées partout
const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_URL = 'http://auth-service:3001';
const ADMIN_USERNAME = 'admin';
```

### Après (✅ Bon)

```typescript
// Import du module de validation
import { authenv, UM_SERVICE_URL } from './config/env.js';

// Utilisation des valeurs validées
const jwtToken = jwt.sign(payload, authenv.JWT_SECRET);
const response = await fetch(UM_SERVICE_URL);
console.log(`Starting on port ${authenv.AUTH_SERVICE_PORT}`);
```

---

## 🧪 Tests et Vérification

### Vérifier la Configuration

```bash
# Démarrer les services
make up

# Vérifier les logs
make logs

# Si JWT_SECRET est invalide, vous verrez :
# ❌ CRITICAL SECURITY ERROR: JWT_SECRET cannot be a default/common value!
#    Forbidden values: supersecretkey, supersecretke1, ...
```

### Messages de Démarrage

#### ✅ Configuration Valide

```
✓ Environment variables loaded successfully
✓ JWT_SECRET validated (length: 64 chars)
✓ Auth service listening at http://0.0.0.0:3001
```

#### ❌ Configuration Invalide

```
❌ CRITICAL SECURITY ERROR: JWT_SECRET is too short!
   Current length: 16
   Minimum length: 32 characters

   Generate a secure secret with:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

[Service exits with code 1]
```

---

## 📚 Références

- **envalid** : https://github.com/af/envalid
- **JWT Best Practices** : https://datatracker.ietf.org/doc/html/rfc8725
- **Crypto randomBytes** : https://nodejs.org/api/crypto.html#cryptorandombytessize-callback

---

## 🎓 Pour les Étudiants 42

### Pourquoi cette Migration ?

1. **Sécurité** : Plus de secrets hardcodés dans le code
2. **Flexibilité** : Changement de configuration sans recompilation
3. **Validation** : Détection précoce des erreurs de configuration
4. **Production-Ready** : Suivre les best practices de l'industrie

### Points Clés pour l'Évaluation

1. ✅ **Tous les secrets sont dans `.env`** (jamais dans le code)
2. ✅ **Validation stricte au démarrage** (pas de surprises en production)
3. ✅ **Messages d'erreur clairs** (facile à débugger)
4. ✅ **Séparation dev/prod** (fichiers `.env.example` comme référence)

### Ce que Vous Pouvez Expliquer

- Pourquoi `JWT_SECRET` doit être le même dans auth et gateway
- Comment `envalid` valide les variables au démarrage
- Pourquoi refuser `supersecretkey` améliore la sécurité
- Comment les URLs de services sont calculées depuis les variables d'env

---

## 🛠️ Troubleshooting

### Problème : Service ne démarre pas

**Erreur** : `CRITICAL SECURITY ERROR: JWT_SECRET...`

**Solution** :

1. Vérifier que `.env.auth` et `.env.gateway` existent
2. Générer un nouveau JWT_SECRET
3. S'assurer qu'il est identique dans les deux fichiers

### Problème : Service Auth ne peut pas contacter Users

**Erreur** : `ECONNREFUSED` ou `Upstream service error`

**Solution** :

1. Vérifier `UM_SERVICE_NAME` et `UM_SERVICE_PORT` dans `.env.auth`
2. Vérifier que le service users est démarré : `docker ps`
3. Vérifier les logs du service users : `docker logs user-service`

### Problème : Variables d'environnement non chargées

**Solution** :

1. Les fichiers `.env.*` doivent être dans `srcs/`
2. Vérifier la syntaxe : pas d'espaces autour du `=`
3. Redémarrer les conteneurs : `make re`

---

**Auteur** : Équipe Transcendence
**Date** : 2026-01-14
**Version** : 1.0.0
