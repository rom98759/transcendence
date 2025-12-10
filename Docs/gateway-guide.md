**Guide d'intégration des services internes/routes**

- **But :** Information gateway dev services (ex : `auth`, `game`, `score`, etc.). Informations gateway (headers + cookie) + comment écrire routes côté service + routes depuis la gateway.

**Contexte rapide**

- Le client parle uniquement à la `gateway` depuis site SPA load par NGINX.
- La `gateway` vérifie et décode le JWT depuis le cookie `token` et expose l'identité aux appels internes.
- Les services internes reçoivent automatiquement les headers internes suivants :
  - **`x-user-name` :** le nom d'utilisateur extrait du JWT
  - **`x-user-id` :** l'identifiant (`sub`) extrait du JWT (id unique de l'utilisateur à travers les DB)
- La `gateway` transmet aussi le cookie original (`cookie`) vers les services internes quand elle fait des requêtes internes.

Important Docker note : Utilisez le nom du service / hostname fourni par la docker-compose.yml (ex: `http://auth-service:3001/login`, `http://game:3002`). Dans Docker Compose le nom du service est le hostname.

> ⚠️ Attention ⚠️ : Seuls les endpoints sous `/api` sont soumis au check JWT dans la gateway. Les routes hors `/api` sont publiques par conception donc pas de login.

**Ce que reçoit un service interne par défaut**

- Header `cookie` contenant le JWT si présent.
- Header `x-user-name` (peut être vide si pas authentifié).
- Header `x-user-id` (peut être vide si pas authentifié).

Remarque : ces headers sont fournis par la `gateway` _après_ validation du JWT. Ne faites pas confiance aux headers envoyés directement par le client — la `gateway` est l'autorité.

**Comment écrire un router de service (exemple minimal)**

- Exemple de lecture des headers dans un handler :

```ts
// dans service X (ex: game)
export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  const userName = (request.headers as any)['x-user-name'] || null
  const userId = Number((request.headers as any)['x-user-id']) || null
  if (!userId) return reply.code(401).send({ error: { message: 'Unauthorized' } })
  // utiliser userId pour récupérer/enregistrer des ressources en DB
  return { data: { id: userId, username: userName } }
}
```

**Comment exposer une route via la gateway (pattern recommandé)**

- Dans la `gateway` créez un controller dans `src/controllers` qui proxyfie vers le service cible avec `proxyRequest()` (voir exemple pour un service `auth`) :

```ts
// gateway/src/controllers/auth.controller.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { proxyRequest } from '../utils/proxy'
app.get('/me', async (request, reply) => {
  // proxyRequest ajoutera les headers internes et propagera Set-Cookie
  return await proxyRequest(app, request, reply, 'http://game:3001/me')
})
```

- Important : dans le code de la gateway utilisez le hostname du service (`http://game:3001`)

**Flux classique (login → appel protégé)**

1. Client POST `/api/auth/login` → la `gateway` proxie vers `auth`.
2. `auth` renvoie `Set-Cookie: token=...` (JWT). `proxyRequest` propage le cookie au client.
3. Les requêtes suivantes du client envoient le cookie au gateway ; `onRequest` décode le JWT et set `request.user`.
4. Lorsque la gateway appelle un service interne (via `fetchInternal`), elle ajoute `x-user-name`, `x-user-id` et `cookie` dans la requête interne.
5. Le service interne lit ces headers et sait qui a fait la requête.

**Tests curl**

- Vérifiez que le client reçoit bien le cookie après login (`Set-Cookie` présent dans la réponse du gateway).
- Test rapide (PowerShell) :

```powershell
# Register
curl -i -X POST http://localhost/api/auth/register -H "Content-Type: application/json" -d '{"username":"alice","email":"alice@example.com","password":"pass"}' -c cookies.txt

# Login (enregistre cookie dans cookies.txt)
curl -i -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d '{"username":"alice","password":"pass"}' -c cookies.txt -b cookies.txt

# Me (utilise cookie)
curl -i http://localhost/api/auth/me -b cookies.txt
```

**Conseils pratiques pour dev gateway**

- Structure :
  - `/controllers` : handlers qui appellent `proxyRequest()` pour proxyfier vers les services.
  - `/routes` : définition des routes et enregistrement des controllers.
- Toujours lire `x-user-id` et `x-user-name` pour identifier l'utilisateur côté service.
- Ne faites **jamais** confiance aux `x-user-*` envoyés directement par le client — la gateway doit valider le JWT et fournir ces headers depuis `/api` + `proxyRequest()`.
- Token + Cookie dure 1h + refresh token (à implémenter plus tard).

**Fichiers utiles**

- `gateway/src/index.ts` : hooks et `fetchInternal`.
- `gateway/src/utils/proxy.ts` : forwarding et propagation de `Set-Cookie` + headers.
- `gateway/src/controllers/*.ts` : pattern pour proxyfier les routes vers les services.
- `auth/src/controllers/auth.controller.ts` : implémentation de `/login`, `/register`, `/me`.
