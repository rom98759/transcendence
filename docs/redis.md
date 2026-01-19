# Redis

Les microservices s'appuient sur la communication interservices pour partager les événements, l'état et les données, ainsi que pour maintenir l'isolation et le découplage. De nombreux développeurs implémentent un courtier de messages asynchrone(message broker) de type publication(PUB)/abonnement(SUB) piloté par les événements pour cette communication, mais cette solution est complexe.

Redis Streams fait office à la fois de structure de données de journalisation native et de canal de communication capable de publier un événement sans exiger de réponse immédiate. Simple à déployer, il prend en charge la persistance des messages et offre une grande scalabilité grâce aux groupes de consommateurs.

![diagram services redis](https://redis.io/wp-content/uploads/2023/07/diagram-interservice-communication-1.svg?&auto=webp&quality=85,75&width=800$0)

## 1. Différence fondamentale : Pub/Sub vs Streams

### Pub/Sub Redis (PUBLISH / SUBSCRIBE)

```bash
PUBLISH → message envoyé → abonnés connectés uniquement
```

Caractéristiques :

- éphémère
- aucune persistance
- aucun ACK
- aucun retry
- aucun état

> ➡️ si le consumer est down au moment de l’émission, le message est perdu.

### Redis Streams (XADD / XREADGROUP)

```bash
XADD → log persistant → consumer group → ACK
```

Caractéristiques :

- persistant
- ordonné
- rejouable
- ACK explicite
- consumer groups
- recovery possible

> ➡️ le message existe tant que tu ne l’as pas ACK.

### On utilise Redis Streams plutôt que Pub/Sub parce que perdre un événement de tournoi signifie perdre une écriture blockchain, et Pub/Sub ne fournit aucune garantie contre ça.

## 2. Concepts Redis Streams utilisés

- **Stream (`tournament.results`)** : Un journal d'événements persistant, ordonné et adressé par ID unique.
- **Consumer Group (`blockchain-group`)** : Permet une répartition automatique des messages entre plusieurs instances et un suivi des messages non-acquittés via la PEL (Pending Entries List).

---

## 🛠️ Détails Techniques (Opérations Redis)

L'implémentation repose sur trois commandes critiques pour la fiabilité du système :

### `XREADGROUP`

Utilisé dans la boucle de consommation principale (`consumeLoop`) pour récupérer les nouveaux messages :

```typescript
const streams = await redis.xreadgroup(
  'GROUP',
  GROUP,
  CONSUMER,
  'BLOCK',
  5000,
  'COUNT',
  1,
  'STREAMS',
  STREAM,
  '>',
);
```

- `>` : Indique que nous voulons les messages qui n'ont jamais été délivrés à d'autres consommateurs.
- `BLOCK 5000` : Commande non-bloquante pour le thread principal, attendant jusqu'à 5s l'arrivée d'un message.

### `XPENDING`

Utilisé dans `recoverPending` pour inspecter la PEL (Pending Entries List).

- Cette commande permet d'identifier les messages qui ont été lus mais jamais acquittés (en cas de crash du service ou d'erreur réseau), assurant ainsi qu'aucune donnée de tournoi ne reste "en suspens" indéfiniment.

### `XCLAIM`

Essentiel pour la tolérance aux pannes :

- Si un message reste "Pending" au-delà de PENDING_IDLE_MS (30s), notre consumer se réapproprie le message.
- Cela garantit que même si un exemplaire du service blockchain tombe, les autres instances peuvent reprendre le travail inachevé.

---

## Envoi de données au `blockchain-service`

> Pour que le service Blockchain puisse traiter vos données, vous devez publier vos messages dans le stream `tournament.results` en respectant la structure attendue par le type BlockTournamentInput.

### commande Redis

```typescript
XADD tournament.results * payload '{"tour_id": "UUID", "player1": "login1", "player2": "login2", "player3": "login3", "player4": "login4"}'
```

### Spécifications du format :

- Champ unique : Le message doit contenir une clé nommée payload.
- Valeur JSON : La valeur associée à payload doit être une chaîne de caractères JSON valide.
- Champs obligatoires dans le JSON :
- `tour_id` (string) : L'identifiant unique du tournoi.
- `player1` à `player4` (string) : Id des participants.

> Note importante : Conformément aux exigences techniques du projet, toutes les données envoyées seront validées côté consommateur. Assurez-vous que les logins correspondent aux utilisateurs existants dans la base de données pour éviter des erreurs de traitement blockchain.

### Exemple de fonction d'envoi de données

> Voici ma route de test pour envoi manuel de donnees

```typescript
app.post('/tournamentspub', async (req, _reply) => {
  await app.redis.xadd('tournament.results', '*', 'data', JSON.stringify(req.body));
  return { status: 'published' };
});
```
