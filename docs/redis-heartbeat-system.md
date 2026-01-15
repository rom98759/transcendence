# Redis - Système de Heartbeat et Statut en Ligne

## 🎯 Vue d'ensemble

Le système de statut en ligne utilise **Redis** comme store de données en mémoire pour gérer efficacement les statuts "en ligne" des utilisateurs en temps réel. Redis est choisi pour sa rapidité, ses structures de données optimisées et ses fonctionnalités d'expiration automatique.

## 🏗️ Architecture Redis

### Structure des données

```
Redis Database
├── SET: "online_users"           → {userId1, userId2, userId3...}
└── Keys: "online:{userId}"     → timestamp (avec TTL: 45s)
```

**Avantages de cette approche :**

- **Performance** : O(users_online) au lieu de O(total_users)
- **Simplicité** : Structure de données native Redis
- **Automatisme** : Expiration automatique via TTL
- **Atomicité** : Opérations Redis garantissent la cohérence

## ⚡ Fonctionnalités principales

### 1. Enregistrement de statut

**Principe :** Chaque heartbeat client met à jour le statut en ligne utilisateur dans Redis.

**Opérations Redis :**

- `SETEX online:{userId} 45 {timestamp}` - Enregistre avec expiration 45s
- `SADD online_users {userId}` - Ajoute à la liste des utilisateurs en ligne

**Comportement :**

- TTL de 45 secondes pour détecter les déconnexions
- Timestamp pour traçabilité (debugging)
- Renouvellement automatique à chaque heartbeat

### 2. Vérification de statut

**Principe :** Vérifier rapidement si un utilisateur est en ligne.

**Opérations Redis :**

- `EXISTS online:{userId}` - Vérifie l'existence de la clé
- Si la clé existe → utilisateur en ligne
- Si la clé n'existe pas → utilisateur hors ligne

**Performance :**

- O(1) - Temps constant
- ~0.1ms de latence moyenne
- Pas de scan de base de données

### 3. Statut en masse (Bulk)

**Principe :** Récupérer le statut de plusieurs utilisateurs en une seule requête.

**Technique :** Pipeline Redis pour optimiser les requêtes réseau

- Une seule connexion réseau
- Traitement parallèle côté Redis
- Réponses groupées

**Cas d'usage :**

- Affichage de la liste des utilisateurs avec statut
- Interface d'administration
- API qui retourne des listes

### 4. Nettoyage automatique

**Principe :** Suppression périodique des utilisateurs déconnectés du SET.

**Problème résolu :**

- Les clés `online:{userId}` expirent automatiquement (TTL)
- Mais le SET `online_users` conserve les entrées orphelines
- Solution : job de nettoyage qui synchronise les deux

**Fréquence :** Toutes les 60 secondes

**Impact :**

- Maintient la cohérence des données
- Optimise les performances des requêtes bulk
- Libère la mémoire Redis

## ⏱️ Timeline de fonctionnement

```
T+0s    User envoie heartbeat
        ├── SETEX online:123 45 1705234567
        └── SADD online_users 123

T+15s   Heartbeat suivant
        ├── SETEX online:123 45 1705234582  (renouvelle TTL)
        └── SADD online_users 123            (déjà présent, pas d'effet)

T+45s   User ferme son navigateur (pas de heartbeat)
        └── TTL expire → clé online:123 supprimée automatiquement

T+60s   Job de nettoyage s'exécute
        ├── SMEMBERS online_users → [123, 456, 789]
        ├── EXISTS online:123 → false
        ├── EXISTS online:456 → true
        ├── EXISTS online:789 → true
        └── SREM online_users 123       (supprime l'entrée orpheline)
```

## 📊 Optimisations Redis

### Pipeline pour requêtes bulk

**Problème :** Vérifier le statut de 100 utilisateurs = 100 requêtes réseau

**Solution :** Pipeline Redis

- Envoie toutes les requêtes d'un coup
- Redis traite en parallèle
- Récupère toutes les réponses ensemble
- **Gain :** 100x moins de latence réseau

### TTL intelligent

**Principe :** TTL de 45 secondes vs heartbeat de 15 secondes

**Calcul :**

- Heartbeat manqué : 15s
- Deuxième heartbeat manqué : 30s
- Troisième heartbeat manqué : 45s → Expiration

**Résultat :** Tolérance de 2 heartbeats manqués avant déconnexion

### Mémoire optimisée

**Consommation par utilisateur :**

- Clé `online:{userId}` : ~80 bytes
- Entrée dans SET : ~10 bytes
- **Total :** ~90 bytes par utilisateur en ligne

**Exemple :** 1000 utilisateurs en ligne = ~90 KB de RAM

## 🔧 Configuration Redis

### Paramètres recommandés

```
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
```

**Explication :**

- **maxmemory** : Limite la consommation mémoire
- **allkeys-lru** : Supprime les clés les moins utilisées si besoin
- **save** : Pas de persistance fréquente (données temporaires)

### Monitoring

**Métriques importantes :**

- `INFO memory` - Consommation mémoire
- `INFO stats` - Opérations par seconde
- `DBSIZE` - Nombre de clés actives
- `TTL online:*` - Vérifier les expirations
