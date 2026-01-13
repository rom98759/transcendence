# Nginx Service - Reverse Proxy & TLS Termination

## 📋 Vue d'ensemble

Service Nginx configuré comme **reverse proxy HTTPS** avec terminaison TLS pour le projet Transcendence. Il route les requêtes vers les différents microservices backend en HTTP.

### Architecture

```
┌──────────────┐
│   Client     │  HTTPS (TLS 1.2/1.3)
│  (Browser)   │  Port 443
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│         Nginx (ce service)           │
│  • Terminaison TLS                   │
│  • Reverse proxy                     │
│  • Gestion cookies                   │
│  • Fichiers statiques                │
└──────┬───────────────────────────────┘
       │ HTTP (interne Docker)
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
┌─────────────┐              ┌──────────────┐
│ api-gateway │              │ user-service │
│   :3000     │              │    :3002     │
└─────────────┘              └──────────────┘
```

## 🎯 Fonctionnalités

### 1. **Terminaison TLS**
- HTTPS obligatoire (redirect HTTP → HTTPS)
- Certificat self-signed (dev) dans `/etc/nginx/ssl/`
- Support TLS 1.2 et 1.3
- Ciphers modernes uniquement

### 2. **Reverse Proxy**
- `/api/*` → API Gateway (REST)
- `/api/game/*` → API Gateway (WebSocket)
- `/users/doc/*` → User Service (Swagger)
- `/public/*` → API Gateway (fichiers publics)

### 3. **Gestion des cookies**
- Transmission automatique des cookies d'authentification
- Support `Set-Cookie` depuis les backends
- Préservation du path des cookies

### 4. **Fichiers statiques**
- Frontend : `/` (HTML/CSS/JS)
- Uploads : `/uploads/` (avatars, etc.)
- Assets : `/assets/` (images, fonts)

### 5. **Sécurité**
- Suppression des headers forgés (`x-user-name`, `x-user-id`)
- Pas de listing de répertoires
- Health check sans logs (`/health`)

## 📁 Structure des fichiers

```
nginx/
├── nginx.conf              # Configuration globale (upstreams, gzip, etc.)
├── conf.d/
│   ├── default.conf        # Virtual host HTTPS principal
│   └── default.conf.http   # Config HTTP de référence (non utilisée)
├── Dockerfile              # Image de production
├── Dockerfile.dev          # Image de développement
├── dev-start.sh            # Script de démarrage dev
├── src/
│   ├── html/               # Frontend (HTML/CSS/JS)
│   ├── assets/             # Assets statiques
│   └── service/            # Services TypeScript (monitoring)
└── README.md               # ← Ce fichier
```

## 🔧 Configuration

### Upstreams (nginx.conf)

Déclarés dans `http {}` pour éviter les 502 intermittents :

```nginx
upstream api_gateway {
    server api-gateway:3000;
    keepalive 32;  # Pool de connexions persistantes
}

upstream user_service {
    server user-service:3002;
    keepalive 16;
}
```

**Avantages :**
- ✅ Connexions keepalive vers les backends
- ✅ Load balancing possible (ajouter plusieurs `server`)
- ✅ Évite les résolutions DNS répétées
- ✅ Stabilité maximale (pas de 502 aléatoires)

**Important :** Les services backend (api-gateway, user-service) doivent avoir un `keepalive_timeout` supérieur ou égal à celui de nginx (65s) pour profiter pleinement du pool de connexions persistantes.

### Timeouts (default.conf)

#### REST API (`/api/`)
```nginx
proxy_connect_timeout 10s;   # Connexion au backend
proxy_send_timeout 60s;      # Envoi de la requête
proxy_read_timeout 60s;      # Lecture de la réponse
```

#### WebSocket (`/api/game/`)
```nginx
proxy_connect_timeout 10s;   # Connexion initiale
proxy_send_timeout 3600s;    # 1h sans envoi = timeout
proxy_read_timeout 3600s;    # 1h sans réception = timeout
```

### Transmission des cookies

```nginx
proxy_pass_header Set-Cookie;  # Transmet les Set-Cookie du backend
proxy_cookie_path / /;         # Préserve le path des cookies
```

**Critique pour l'authentification JWT !** Sans ces directives, les cookies ne passeraient pas.

## 🚀 Utilisation

### Démarrer le service

```bash
# Depuis la racine du projet
make nginx

# Ou rebuild complet
docker-compose up -d --build nginx-proxy
```

### Vérifier la configuration

```bash
# Tester la syntaxe
docker exec nginx-proxy nginx -t

# Recharger la config (sans downtime)
docker exec nginx-proxy nginx -s reload

# Redémarrer complètement
docker restart nginx-proxy
```

### Logs

```bash
# Logs en temps réel
make logs-nginx

# Dernières 50 lignes
docker logs --tail 50 nginx-proxy

# Logs d'erreur seulement
docker exec nginx-proxy cat /var/log/nginx/error.log
```

## 🐛 Debugging

### 502 Bad Gateway

**Causes fréquentes :**
1. Backend down → Vérifier `docker ps`
2. Mauvais nom de service → Vérifier `docker-compose.yml`
3. Backend lent → Augmenter les timeouts
4. DNS Docker instable → Vérifier que `resolver` est bien commenté

**Debug :**
```bash
# Ping depuis nginx vers les backends
docker exec nginx-proxy ping -c 3 api-gateway
docker exec nginx-proxy ping -c 3 user-service

# Vérifier les upstreams
docker exec nginx-proxy cat /etc/nginx/nginx.conf | grep upstream -A 3
```

### Cookies non transmis

**Vérifier :**
1. `proxy_pass_header Set-Cookie` présent
2. Backend génère bien les cookies (voir logs du service auth)
3. JWT_SECRET identique entre auth et gateway
4. `FORCE_SECURE_COOKIE=false` dans `.env.auth` (backend HTTP)

**Test curl :**
```bash
curl -v -k -X POST https://localhost:4430/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' \
  2>&1 | grep -i cookie
```

### WebSocket qui déconnecte

**Causes :**
1. Timeouts trop courts → Vérifier `proxy_read_timeout 3600s`
2. HTTP/2 activé → Doit être commenté : `# http2 on;`
3. Headers Upgrade manquants → Vérifier `proxy_set_header Upgrade $http_upgrade`

## 📝 Décisions techniques importantes

### ❌ HTTP/2 désactivé

**Raison :** Incompatibilité connue avec WebSocket sur certaines implémentations Nginx.

```nginx
# http2 on;  # ❌ Ne PAS réactiver
```

**Alternative :** HTTP/1.1 avec keepalive suffit largement pour ce projet.

### ❌ DNS Resolver Docker supprimé

**Avant (problématique) :**
```nginx
resolver 127.0.0.11 valid=5s;  # ❌ Source de 502 intermittents
```

**Maintenant :**
```nginx
# Docker gère la résolution au démarrage du container
# Les upstreams sont résolus UNE FOIS et mis en cache
```

**Pourquoi ?**
- Le resolver dynamique peut réévaluer les IPs toutes les 5s
- Si un container redémarre, Nginx garde l'ancienne IP
- Résultat : 502 aléatoires jusqu'au reload de Nginx

### ✅ Upstreams avec keepalive

**Avant :**
```nginx
proxy_pass http://api-gateway:3000;  # ❌ Connexion directe fragile
```

**Maintenant :**
```nginx
proxy_pass http://api_gateway;  # ✅ Utilise l'upstream stable
```

**Avantages :**
- Pool de connexions persistantes (keepalive)
- Pas de nouvelle connexion TCP à chaque requête
- Stabilité maximale même sous charge

## 🔐 Sécurité

### Headers forgés supprimés

```nginx
proxy_set_header x-user-name "";
proxy_set_header x-user-id "";
```

**Raison :** Ces headers sont ajoutés par le gateway APRÈS vérification JWT. Un client malveillant ne peut pas les forger.

### TLS moderne uniquement

```nginx
ssl_protocols TLSv1.2 TLSv1.3;  # Pas de SSLv3, TLS 1.0/1.1
ssl_ciphers HIGH:!aNULL:!MD5;   # Pas de chiffrement faible
```

### Pas de listing de répertoires

```nginx
autoindex off;  # Désactiver le listing dans /uploads/
```

## 📊 Monitoring

### Health Check

```bash
curl https://localhost:4430/health
# Réponse attendue: "healthy"
```

**Caractéristiques :**
- Pas de logs (`access_log off;`)
- Réponse instantanée (pas de proxy)
- Utilisé par Docker health checks

### Métriques à surveiller

1. **Taux de 502** : Backend instable
2. **Latence `/api/*`** : Performance du gateway
3. **Latence WebSocket** : Qualité du jeu
4. **Taille moyenne requêtes** : Optimisation gzip

## 🎓 Pour aller plus loin

### Load Balancing

Ajouter plusieurs backends dans un upstream :

```nginx
upstream api_gateway {
    server api-gateway-1:3000;
    server api-gateway-2:3000;
    server api-gateway-3:3000;
    keepalive 64;
}
```

### Rate Limiting

Limiter les requêtes par IP :

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    # ... reste de la config
}
```

### Logs structurés (JSON)

Pour parsing automatique (ELK, Splunk) :

```nginx
log_format json_combined escape=json
  '{'
    '"time":"$time_iso8601",'
    '"remote_addr":"$remote_addr",'
    '"request":"$request",'
    '"status":$status,'
    '"body_bytes_sent":$body_bytes_sent,'
    '"request_time":$request_time'
  '}';

access_log /var/log/nginx/access.log json_combined;
```

## 📚 Références

- [Nginx Documentation officielle](https://nginx.org/en/docs/)
- [RFC 9110 - HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 6455 - WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [Nginx Proxy Module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Nginx Upstream Module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)

---

**Dernière mise à jour :** 7 janvier 2026
