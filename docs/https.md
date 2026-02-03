# 🛡️ Architecture mTLS et sécurité inter-services

Ce document a été créé dans le cadre du cursus 42 par l'équipe Transcendence.

## 📌 Présentation

Dans notre architecture microservices, la sécurité est une priorité absolue. Conformément aux exigences du sujet imposant l'usage de HTTPS partout, nous avons implémenté le mTLS (Mutual TLS).

Le mTLS garantit que :

- Le Client vérifie le Serveur (authentification standard).
- Le Serveur vérifie le Client (spécificité du mTLS).

> [!IMPORTANT]
> Cela crée un environnement "Zero Trust" où chaque microservice prouve son identité avant d'échanger des données.

## Généralité - gestion des certificats (OpenSSL)

Nous utilisons une Autorité de Certification (CA) interne pour signer tous les certificats de nos services.

1. Génération de la CA (Root - Authorité de certification)

```Bash
# Clé privée de la CA
openssl genpkey -algorithm RSA -out ca.key -aes256
# Certificat racine auto-signé
openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 -out ca.crt
```

2. Génération des certificats services
   Chaque service (Gateway, Auth, Users, etc.) possède son propre couple clé/certificat.

```Bash
# 1. Clé privée du service
openssl genpkey -algorithm RSA -out service.key
# 2. Demande de signature (CSR)
openssl req -new -key service.key -out service.csr
# 3. Signature par notre CA
openssl x509 -req -in service.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out service.crt -days 365 -sha256
```

## Gestion de notre infracstrure:

### 📄 1. `openssl.cnf` : Le "Plan d'Architecte"

> Ce fichier est la base de configuration pour OpenSSL. Il définit les règles et les caractéristiques techniques des certificats que nous créons.

- Rôles et Permissions : définition des sections spécifiques (extensions) pour s'assurer que chaque certificat ne peut faire que ce pour quoi il est prévu :
  - `ca_ext` : Autorise un certificat à signer d'autres certificats (réservé à ton AC interne).
  - `server_ext` : Destiné aux microservices (Auth, Users) pour qu'ils prouvent leur identité de serveur.
  - `client_ext` : Destiné à un client pour prouver son identité.
  - `client_server_ext` : Indispensable pour la Gateway et Nginx. Comme ils reçoivent des requêtes (serveur) et en envoient d'autres (client), ils ont besoin de cette double identité pour le mTLS.

- Standardisation : automatise les informations comme le pays (`C = FR`), l'organisation (`O = transcendence`) et l'unité (`OU = backend`), assurant une cohérence sur l'ensemble du projet.

## 📜 2. `generate_certs.sh` : Automatisation

> Ce script automatise la création complexe de toute l'infrastructure de confiance. Il automatise la création des certificats

- Création de la CA (Autorité de Certification) : Le script génère d'abord `ca.key` et `ca.crt`. C'est le "tampon officiel" du projet qui servira à valider tous les autres services.

- Gestion des SAN (Subject Alternative Names) : Le script crée dynamiquement des fichiers de configuration temporaires pour inclure des noms de domaine comme `localhost` ou les noms des services Docker (ex: `user-service`). C'est ce qui permet aux services de se reconnaître via le réseau interne de Docker.

- Signature Automatisée : Il boucle sur la liste de services (`auth`, `user`, `game`, `blockchain`, `gateway`) pour créer une clé privée, une demande de signature (CSR), et enfin le certificat final signé par la CA.

- Sécurisation : À la fin, il ajuste les permissions des fichiers (`chmod 644`) pour qu'ils soient lisibles par les containers mais protégés contre les modifications accidentelles.

## 🏗️ Implémentation Technique

1. Le rôle Serveur (Réception des requêtes)
   Chaque service Fastify agit comme un "garde-barrière". Il exige un certificat client valide via `requestCert`.

```TypeScript
const app = fastify({
  https: {
    key: fs.readFileSync('/etc/certs/service.key'),
    cert: fs.readFileSync('/etc/certs/service.crt'),
    ca: fs.readFileSync('/etc/ca/ca.crt'), // Vérifie l'authenticité du client
    requestCert: true,         // Demande le certificat au client
    rejectUnauthorized: false, // On gère la validation manuellement pour les exceptions
  }
});

// Hook de vérification d'identité
app.addHook('onRequest', (request, reply, done) => {
  const socket = request.raw.socket as any;
  // Exception pour les Health Checks locaux (Docker/K8s)
  if (socket.remoteAddress === '127.0.0.1' || socket.remoteAddress === '::1') return done();

  const cert = socket.getPeerCertificate();
  if (!cert || !cert.subject) {
    return reply.code(401).send({ error: 'Client certificate required (mTLS)' });
  }
  done();
});
```

2. Le rôle Client (Envoi des requêtes)
   Pour communiquer avec un autre service, nous utilisons un Agent Undici (Node.js natif `fetch`) qui injecte nos certificats dans l'envoi.

```TypeScript

import { Agent } from 'undici';
import { MTLSRequestInit } from '../types/https.js';

// L'Agent agit comme un Dispatcher typé pour Node.js fetch
export const mtlsAgent = new Agent({
  connect: {
    key: fs.readFileSync('/etc/certs/api-gateway.key'),
    cert: fs.readFileSync('/etc/certs/api-gateway.crt'),
    ca: fs.readFileSync('/etc/ca/ca.crt'),
    rejectUnauthorized: true, // Vérifie que le serveur est bien le nôtre
  },
});

export const fetchOptions: MTLSRequestInit = {
  method: 'GET',
  dispatcher: mtlsAgent,
};
```

Les requêtes s'envoient comme suivant :

```Typescript
 const res = await fetch(`https://${service.host}:${service.port}/health`, fetchOptions);
```

## 🚦 Configuration Nginx

Nginx sert de point d'entrée unique (Reverse Proxy) et doit lui aussi présenter des certificats valides pour parler aux services backend.

```yml
# Extrait de default.conf
ssl_client_certificate /etc/nginx/ca/ca.crt; # CA pour vérifier les services
ssl_certificate /etc/nginx/certs/nginx.crt;  # Certificat de Nginx
ssl_certificate_key /etc/nginx/certs/nginx.key;
ssl_verify_client optional;
```

## 💡 Bonnes Pratiques Adoptées

- Algorithmes Forts : Utilisation systématique de RSA 4096 bits et SHA-256.
- Isolation des Clés : Les clés privées sont injectées via des volumes Docker en lecture seule (`:ro`).
- Validation Manuelle : Le hook Fastify permet d'autoriser le trafic de loopback tout en sécurisant le trafic réseau interne.

> [!WARNING]
> Si vous créez un nouveau microservice, n'oubliez pas d'ajouter son volume de certificats dans le docker-compose.yml et d'utiliser le mtlsAgent pour vos appels API.
> Vous pouvez aller voir le code des controller dans le service api-gateway

## Rappel du sujet:

- Web : HTTPS partout (Requis).
- Cybersecurity : Implémentation du mTLS (Module de choix / Complexité technique).
