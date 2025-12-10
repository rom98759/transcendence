# Services Architecture

## Structure des services

```
nginx-proxy (port 80/443)
    ↓
api-gateway (port 3000)
    ↓
auth-service (port 3001)
```

## Services

### nginx-proxy

- **Rôle** : Reverse proxy et serveur de fichiers statiques
- **Port** : 80 (HTTP), 443 (HTTPS)
- **Routes** :
  - `/` : Fichiers statiques HTML
  - `/api/*` : Proxifie vers api-gateway:3000
  - `/gateway/*` : Proxifie vers api-gateway:3000/
  - `/health` : Health check Nginx

### api-gateway

- **Rôle** : API Gateway avec gestion JWT et routage
- **Port** : 3000
- **Fonctionnalités** :
  - Vérification JWT sur toutes les routes `/api/*` (sauf routes publiques)
  - Ajout des headers `x-user-name` et `x-user-id` pour les services downstream
  - Proxy vers auth-service
  - CORS configuré pour localhost
- **Routes** :
  - `GET /` : Message de bienvenue
  - `GET /help` : Documentation des routes
  - `GET /health` : Health check
  - `GET /healthAll` : Health check de tous les services
  - `/api/auth/*` : Routes d'authentification (proxifiées vers auth-service)

### auth-service

- **Rôle** : Service d'authentification avec base de données SQLite
- **Port** : 3001
- **Base de données** : `/data/auth.db` (volume persistant)
- **Routes** :
  - `GET /` : Status du service
  - `GET /health` : Health check
  - `GET /me` : Informations utilisateur courant (protégé)
  - `POST /register` : Inscription
  - `POST /login` : Connexion (génère JWT cookie)
  - `POST /logout` : Déconnexion (supprime cookie)

## Variables d'environnement

Variables disponibles :

- `HOST_VOLUME_PATH` : Chemin pour les volumes Docker
- `JWT_SECRET` : Clé secrète JWT (à changer en production !)
- `LOG_LEVEL` : Niveau de log (debug, info, warn, error)
- `NODE_ENV` : Environnement Node.js

## Accès aux services

Une fois démarré :

- **Interface web** : http://localhost
- **API Gateway** : http://localhost/api ou http://localhost/gateway (qui devient la racine de gateway)
- **Health checks** :
  - http://localhost/health (Nginx)
  - http://localhost/gateway/health (Gateway)
  - http://localhost/gateway/healthAll (Tous les services)

## Changer :

- Changez `JWT_SECRET` dans `.env`
- Configurez HTTPS avec certificats SSL
- Utilisez un secret management (Hashicorp Vault)
- Restreignez CORS aux domaines autorisés
- Activez rate limiting
- Scannez les images Docker pour vulnérabilités
