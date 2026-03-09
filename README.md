This project has been created as part of the 42 curriculum by lisambet, fpetit, rcaillie, jhervoch, npolack.

## Description

> A full-stack multiplayer Pong web application. Built as a microservices SPA with real-time gameplay, tournament system, OAuth2 auth, 2FA, an AI opponent, and blockchain score storage. It covers a wide range of concepts including real-time communication, modern authentication flows, containerized deployment, and blockchain integration.

![CI Status](https://github.com/codastream/transcendence/actions/workflows/ci.yml/badge.svg)
![User Service Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/codastream/13a5ca1442b77566f5c439d203084db2/raw/coverage-users.json)

```
srcs/
├── auth/           # Authentication service — OAuth2 (42 API), JWT, 2FA
├── users/          # User management service — profiles, stats, friends
├── game/           # Game logic & WebSocket server — real-time Pong engine
├── pong-ai/        # AI opponent service
├── gateway/        # API gateway — routes requests between services
├── blockchain/     # Smart contract — stores match scores on-chain
├── redis/          # Session cache & pub/sub
├── nginx/          # Reverse proxy & HTTPS termination
├── shared/         # Shared types/utilities across services
└── tests/          # Integration & end-to-end test suite
```

## Instructions

### Quick Start

```bash
# 1. Clone the repository

git clone https://github.com/codastream/transcendence.git
cd transcendence

# 2. Set up environment variables

make envs

# → Fill in your 42 OAuth2 credentials in srcs/.env.auth and srcs/.env.nginx

# 3. Install dependencies

npm install

# 4. Build and launch all services

make

# 5. Stop all services

make down

# 6. Build AI opponent service separately (optional)

make ai

# 7. Run tests

make test
```

The app will be available at: **https://localhost:4430**

> **Note:** The HTTPS certificate is self-signed for local development. Most browsers will show a security warning when you first access the app. You need to manually accept or bypass this warning to proceed. This is expected and safe for local testing.

### Setup Details

The `make` command orchestrates the full setup: volume creation, certificate generation, dependency installation, Docker build, and service startup. Below is what happens at each step.

#### 1. Environment Variables (`make envs`)

Copies all `.env.*.example` files in `srcs/` to their corresponding `.env.*` files and auto-generates a shared `JWT_SECRET` across all of them.

| File                   | Purpose                                                     | Action required                                                   |
| ---------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `srcs/.env`            | Global config (service names, ports, volume name)           | Usually no change needed                                          |
| `srcs/.env.auth`       | Auth service (DB path, admin credentials, Redis)            | Change `ADMIN_PASSWORD` in production                             |
| `srcs/.env.oauth`      | OAuth2 secrets (Google & 42 School)                         | **Fill in your client IDs and secrets**                           |
| `srcs/.env.nginx`      | Frontend OAuth public client IDs (Vite build vars)          | **Fill in `VITE_GOOGLE_CLIENT_ID` and `VITE_SCHOOL42_CLIENT_ID`** |
| `srcs/.env.gateway`    | API gateway (rate limits, proxy timeout)                    | Usually no change needed                                          |
| `srcs/.env.um`         | User service (DB path)                                      | Usually no change needed                                          |
| `srcs/.env.game`       | Game service (DB path)                                      | Usually no change needed                                          |
| `srcs/.env.blockchain` | Blockchain service (RPC URL, contract address, private key) | **Fill in Avalanche credentials if using blockchain**             |

> **OAuth2 callback URIs** to register with providers:
>
> - Google: `https://localhost:4430/auth/oauth/google/callback`
> - 42 School: `https://localhost:4430/auth/oauth/school42/callback`

#### 2. Data Volumes (`make volumes`)

Creates the local directories that are bind-mounted into containers:

```
data/
├── database/   # SQLite databases (auth.db, um.db, game.db, blockchain.db)
└── uploads/    # User-uploaded files (avatars)
```

The path defaults to `./data` and can be overridden via `VOLUME_NAME` in `srcs/.env`. These directories are mapped as Docker named volumes in `docker-compose.yml`:

- **`data`** → `data/database/` — mounted at `/data` (auth, game, blockchain) and `/app/data` (users)
- **`uploads`** → `data/uploads/` — mounted at `/app/uploads` (user-service) and `/usr/share/nginx/html/uploads` (nginx, to serve avatars statically)

> ⚠ `make fclean` deletes these directories entirely. `make volumes` recreates them.

#### 3. mTLS Certificates (`make certs`)

Generates a full internal PKI under `make/scripts/certs/certs/`:

```
make/scripts/certs/certs/
├── ca/                     # Internal Certificate Authority
│   ├── ca.key              # CA private key (RSA 4096)
│   └── ca.crt              # CA certificate (valid 10 years)
├── services/               # Per-service client/server certs (RSA 2048, valid 825 days)
│   ├── user-service/
│   ├── auth-service/
│   ├── blockchain-service/
│   ├── game-service/
│   └── api-gateway/
└── nginx/                  # Nginx reverse proxy cert (also serves HTTPS to browser)
    ├── nginx.key
    └── nginx.crt
```

Each service gets a certificate with a SAN matching its Docker service name, enabling **mutual TLS** between all backend services. The CA cert is mounted as read-only into every container at `/etc/ca/`.

Certificates are generated once and reused. To regenerate: `rm -rf make/scripts/certs/certs && make certs`.

#### 4. Build & Run

```bash
make          # Full pipeline: volumes → certs → npm install → docker build → up -d
make dev      # Development mode (with hot-reload via dev-docker-compose.yml)
make re       # Full clean rebuild (fclean + all)
make ai       # Build only the AI opponent service (for local development/testing)
```

## Resources

> See also our [project wiki](https://github.com/codastream/transcendence/wiki) for in-depth articles on each tool.

| Category        | Tool / Concept                                                         | Docs                                                                       | Wiki                                                                                  |
| --------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Architecture    | Microservices                                                          | —                                                                          | [Wiki](https://github.com/codastream/transcendence/wiki/Gateway-Service)              |
| Architecture    | [Fastify](https://fastify.dev/docs/latest/)                            | [Docs](https://fastify.dev/docs/latest/)                                   | [Wiki](https://github.com/codastream/transcendence/wiki/Fastify)                      |
| Architecture    | [Nginx](https://nginx.org/en/docs/)                                    | [Docs](https://nginx.org/en/docs/)                                         | —                                                                                     |
| Architecture    | [Redis](https://redis.io/docs/)                                        | [Docs](https://redis.io/docs/)                                             | —                                                                                     |
| Architecture    | [NPM Workspaces](https://docs.npmjs.com/cli/using-npm/workspaces)      | [Docs](https://docs.npmjs.com/cli/using-npm/workspaces)                    | [Wiki](https://github.com/codastream/transcendence/wiki/NPM-workspaces)               |
| Web - Frontend  | [React](https://react.dev/)                                            | [Docs](https://react.dev/)                                                 | [Wiki](https://github.com/codastream/transcendence/wiki/React)                        |
| Web - Frontend  | [Tailwind CSS](https://tailwindcss.com/docs)                           | [Docs](https://tailwindcss.com/docs)                                       | [Wiki](https://github.com/codastream/transcendence/wiki/Tailwind-CSS)                 |
| Web - Frontend  | [Vite](https://vitejs.dev/)                                            | [Docs](https://vitejs.dev/)                                                | —                                                                                     |
| Web - Frontend  | [i18next](https://www.i18next.com/)                                    | [Docs](https://www.i18next.com/)                                           | —                                                                                     |
| Web - Backend   | [WebSockets](https://github.com/websockets/ws)                         | [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)                  | [Wiki](https://github.com/codastream/transcendence/wiki/WebSockets)                   |
| Web - Backend   | [Pino](https://getpino.io/)                                            | [Docs](https://getpino.io/)                                                | [Wiki](https://github.com/codastream/transcendence/wiki/Logging-and-Error-management) |
| Security & Auth | OAuth 2.0                                                              | [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)                  | [Wiki](https://github.com/codastream/transcendence/wiki/OAuth-2.0)                    |
| Security & Auth | JWT                                                                    | [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)                  | —                                                                                     |
| Security & Auth | [otplib](https://github.com/yeojz/otplib) (TOTP)                       | [Docs](https://github.com/yeojz/otplib)                                    | [Wiki](https://github.com/codastream/transcendence/wiki/Two-factor-authentication)    |
| Security & Auth | [bcrypt](https://github.com/kelektiv/node.bcrypt.js)                   | [Docs](https://github.com/kelektiv/node.bcrypt.js)                         | —                                                                                     |
| Security & Auth | mTLS                                                                   | —                                                                          | —                                                                                     |
| Database        | [SQLite](https://github.com/WiseLibs/better-sqlite3)                   | [Docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) | [Wiki](https://github.com/codastream/transcendence/wiki/SQLite)                       |
| Database        | [Prisma](https://www.prisma.io/docs/)                                  | [Docs](https://www.prisma.io/docs/)                                        | [Wiki](https://github.com/codastream/transcendence/wiki/Prisma)                       |
| Blockchain      | [Solidity](https://docs.soliditylang.org/)                             | [Docs](https://docs.soliditylang.org/)                                     | [Wiki](https://github.com/codastream/transcendence/wiki/Solidity)                     |
| Blockchain      | [Hardhat](https://hardhat.org/docs)                                    | [Docs](https://hardhat.org/docs)                                           | [Wiki](https://github.com/codastream/transcendence/wiki/Hardhat)                      |
| Blockchain      | [Avalanche](https://docs.avax.network/)                                | [Docs](https://docs.avax.network/)                                         | [Wiki](https://github.com/codastream/transcendence/wiki/Avalanche)                    |
| Blockchain      | [OpenZeppelin](https://docs.openzeppelin.com/)                         | [Docs](https://docs.openzeppelin.com/)                                     | [Wiki](https://github.com/codastream/transcendence/wiki/Open-Zeppelin)                |
| AI & ML         | [Python](https://docs.python.org/3/)                                   | [Docs](https://docs.python.org/3/)                                         | [Wiki](https://github.com/codastream/transcendence/wiki/Python)                       |
| AI & ML         | PPO Algorithm                                                          | [Stable Baselines3](https://stable-baselines3.readthedocs.io/)             | [Wiki](https://github.com/codastream/transcendence/wiki/PPO-Algorithm)                |
| Dev Tools       | [TypeScript](https://www.typescriptlang.org/docs/)                     | [Docs](https://www.typescriptlang.org/docs/)                               | [Wiki](https://github.com/codastream/transcendence/wiki/TypeScript)                   |
| Dev Tools       | [Zod](https://zod.dev/)                                                | [Docs](https://zod.dev/)                                                   | [Wiki](https://github.com/codastream/transcendence/wiki/Zod)                          |
| Dev Tools       | [ESLint](https://eslint.org/)                                          | [Docs](https://eslint.org/)                                                | [Wiki](https://github.com/codastream/transcendence/wiki/ESLint)                       |
| Dev Tools       | [Prettier](https://prettier.io/)                                       | [Docs](https://prettier.io/)                                               | —                                                                                     |
| Dev Tools       | [Vitest](https://vitest.dev/)                                          | [Docs](https://vitest.dev/)                                                | [Wiki](https://github.com/codastream/transcendence/wiki/Vitest)                       |
| Dev Tools       | [Docker](https://docs.docker.com/)                                     | [Docs](https://docs.docker.com/)                                           | [Wiki](https://github.com/codastream/transcendence/wiki/Docker)                       |
| Dev Tools       | [GitHub Actions](https://docs.github.com/en/actions)                   | [Docs](https://docs.github.com/en/actions)                                 | [Wiki](https://github.com/codastream/transcendence/wiki/GitHub-Actions)               |
| Dev Tools       | [Husky](https://typicode.github.io/husky/)                             | [Docs](https://typicode.github.io/husky/)                                  | —                                                                                     |
| Dev Tools       | [Commitlint](https://commitlint.js.org/)                               | [Docs](https://commitlint.js.org/)                                         | —                                                                                     |
| Hardware        | [LED Score Controller](https://github.com/rom98759/Transcendance_LEDS) | [Repo](https://github.com/rom98759/Transcendance_LEDS)                     | [Wiki](https://github.com/rom98759/Transcendance_LEDS)                                |

How AI was used: we asked for explanation on how different libraries and tools work. We also used AI for debugging purposes and in case of blocking on a certain problem. Copilot was helpful with pull request reviews.

---

## Team Information

| Login                                   | Role(s)         | Responsibilities                                |
| --------------------------------------- | --------------- | ----------------------------------------------- |
| [lisambet](https://github.com/lisambet) | _Product Owner_ | _AI Opponent_                                   |
| [fpetit](https://github.com/codastream) | _Tech Lead_     | _User Service_                                  |
| [rcaillie](https://github.com/rom98759) | _Developer_     | _Auth Service_                                  |
| [jhervoch](https://github.com/jmtth)    | _Tech Lead_     | _Blockchain integration, Tournament management_ |
| [npolack](https://github.com/Ilia1177)  | _Scrum Master_  | _Game Engine_                                   |

> **\*Roles reference:**
>
> - **Product Owner:** Vision, priorities, feature validation
> - **Scrum Master:** Coordination, tracking, sprint planning, communication
> - **Tech Lead:** Architecture decisions, code quality standards, technical guidance
> - **Developer:** Implementation, code reviews, testing, documentation

---

## Project Management

◦ How the team organized the work ?

We used GitHub Issues to track tasks and features. We held regular meetings to discuss progress and blockers.

◦ Tools used for project management:

- GitHub Issues
- Github Actions for CI/CD with tests and linting for every PR

◦ Communication channels used:

- Discord
- GitHub Code Reviews

---

## Tech Stack

| Layer            | Technology                                    |
| ---------------- | --------------------------------------------- |
| Frontend         | TypeScript, React                             |
| Auth             | OAuth2 (42 API), JWT, 2FA (TOTP)              |
| Backend services | Node.js / TypeScript                          |
| Database         | SQLite (users), Redis (sessions)              |
| Blockchain       | Solidity, Hardhat, Ethereum                   |
| DevOps           | Docker, Docker Compose, Nginx, GitHub Actions |
| Code quality     | ESLint, Prettier, Husky, Commitlint           |
| AI & ML          | Python, Stable Baselines3, NumPy, PyTorch     |

---

## Database Schemes

The key architectural pattern is "copy on write" - Auth is the source of truth for identity, but Game and Blockchain store snapshots of that data at the time of the event, ensuring historical records remain valid even if a user later changes their username or avatar.

### Cross-Service Data Relationships

```
[Auth DB] ──── users.id ────────────────────────────────────────────┐
     │                                                               │
     ├── login_tokens.token ──→ [Redis] session:{token}             │
     └── users.id ───────────→ [Redis] online:{userId}              │
                                                                     ▼
                                                          [Users DB] UserProfile.authId
                                                               │
                                                    Friendship.requesterId / receiverId

[Auth DB] users.username / avatar_url
     │  (copied at game session creation via API call)
     ▼
[Game DB] player.username / player.avatar
     │
     ├── match.player1 / player2 / winner_id
     ├── tournament.creator_id
     ├── tournament_player.player_id
     │
     └── tournament.id ──→ [Blockchain DB] snapshot.tour_id
                               snapshot.player1/2/3/4
                               snapshot.tx_hash / block_number (immutable)
```

### Auth Service Schema

```mermaid
erDiagram
    users {
        INTEGER id PK "AUTOINCREMENT"
        TEXT username "UNIQUE"
        TEXT email "UNIQUE"
        TEXT password
        TEXT role "DEFAULT 'user'"
        INTEGER is_2fa_enabled "DEFAULT 0"
        TEXT totp_secret
        TEXT google_id "UNIQUE"
        TEXT school42_id "UNIQUE"
        TEXT oauth_email
        TEXT avatar_url
        DATETIME created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    login_tokens {
        TEXT token PK
        INTEGER user_id FK
        DATETIME expires_at
    }

    login_token_attempts {
        TEXT token PK,FK "REFERENCES login_tokens(token)"
        INTEGER attempts "DEFAULT 0"
    }

    totp_setup_secrets {
        TEXT token PK
        INTEGER user_id FK
        TEXT secret
        DATETIME expires_at
    }

    users ||--o{ login_tokens : "has"
    users ||--o{ totp_setup_secrets : "has"
    login_tokens ||--o| login_token_attempts : "tracks"
```

### Users Service Schema

```mermaid
erDiagram
    UserProfile {
        Int id PK "autoincrement"
        Int authId "UNIQUE (Soft FK to auth.users.id)"
        DateTime createdAt "default(now())"
        String username "UNIQUE"
        String avatarUrl "nullable"
    }

    Friendship {
        Int id PK "autoincrement"
        DateTime createdAt "default(now())"
        String nicknameRequester "nullable"
        String nicknameReceiver "nullable"
        String status
        Int requesterId FK "REFERENCES UserProfile.authId"
        Int receiverId FK "REFERENCES UserProfile.authId"
    }

    UserProfile ||--o{ Friendship : "requested (requesterId)"
    UserProfile ||--o{ Friendship : "received (receiverId)"
```

### Game/Tournament Schema

```mermaid
erDiagram
    player {
        INTEGER id PK
        TEXT username
        TEXT avatar
        INTEGER updated_at
    }

    tournament {
        INTEGER id PK "AUTOINCREMENT"
        INTEGER creator_id FK
        TEXT status "DEFAULT 'PENDING'"
        INTEGER created_at
    }

    tournament_player {
        INTEGER tournament_id PK,FK
        INTEGER player_id PK,FK
        INTEGER final_position
        INTEGER slot
    }

    match {
        INTEGER id PK "AUTOINCREMENT"
        INTEGER tournament_id FK "nullable"
        INTEGER player1 FK
        INTEGER player2 FK
        TEXT sessionId "nullable"
        INTEGER score_player1 "DEFAULT 0"
        INTEGER score_player2 "DEFAULT 0"
        INTEGER winner_id FK "nullable"
        TEXT round "nullable"
        INTEGER created_at
    }

    player ||--o{ tournament : "creates"
    tournament ||--o{ tournament_player : "includes"
    player ||--o{ tournament_player : "participates in"
    tournament ||--o{ match : "contains"
    player ||--o{ match : "plays as p1 / p2 / winner"
```

### Blockchain Schema

```mermaid
erDiagram
    snapshot {
        INTEGER id PK "AUTOINCREMENT"
        TEXT tx_hash "UNIQUE"
        TEXT snapshot_hash "UNIQUE"
        INTEGER block_timestamp
        INTEGER tour_id "UNIQUE (Soft FK to game.tournament.id)"
        INTEGER player1
        INTEGER player2
        INTEGER player3
        INTEGER player4
        INTEGER block_number
        TEXT verify_status "DEFAULT 'PENDING'"
        INTEGER verified_at
    }
```

### Redis Keys

| Key pattern     | Value type | Notes                          |
| --------------- | ---------- | ------------------------------ |
| online:{userId} | String     | Online status with TTL expiry  |
| session:{token} | String     | JWT payload for session lookup |

## Features List

### Authentication — `@rcaillie`

| Feature            | Description                                        |
| ------------------ | -------------------------------------------------- |
| Local auth         | Registration & login via username/email + password |
| OAuth2             | Login via 42 School and Google                     |
| JWT sessions       | HttpOnly cookie-based session management           |
| Token verification | `/verify` endpoint for session validation          |
| Account deletion   | User-initiated account removal                     |

### Two-Factor Authentication — `@rcaillie`

| Feature            | Description                             |
| ------------------ | --------------------------------------- |
| TOTP setup         | Generates QR code with secret           |
| Setup verification | Confirms secret before activation       |
| Login verification | Required on each login when 2FA enabled |
| Disable 2FA        | User can deactivate 2FA                 |
| Status check       | Query 2FA enabled state                 |

### User Profiles — `@fpetit`

| Feature         | Description                          |
| --------------- | ------------------------------------ |
| Create profile  | Linked to `authId` from auth service |
| Get profile     | Retrieve by username                 |
| Search profiles | Query by username (min 2 chars)      |
| Avatar upload   | Multipart file upload                |
| Delete profile  | Remove by username or user ID        |

### Friends System — `@fpetit` `@lisambet`

| Feature         | Description                                      |
| --------------- | ------------------------------------------------ |
| Friend request  | Send friendship invitation                       |
| List friends    | View all friends                                 |
| Remove friend   | Delete friendship                                |
| Update status   | Accept / block requests                          |
| Custom nickname | Set alias per friend (independent for each side) |

### Game — `@npolack` `@jhervoch` `@lisambet`

| Feature        | Description                             |
| -------------- | --------------------------------------- |
| Create session | Initialize a new game session           |
| List sessions  | View all active game sessions           |
| Delete session | Remove a game session                   |
| Real-time play | WebSocket gameplay via `/ws/:sessionId` |
| Game settings  | Configurable game parameters            |
| Match history  | Record of past games                    |
| Player stats   | Performance statistics                  |
| AI opponent    | Play against a machine-learned bot      |

### Tournaments — `@jhervoch`

| Feature            | Description                   |
| ------------------ | ----------------------------- |
| Create tournament  | Initialize new tournament     |
| Join tournament    | Register for participation    |
| List tournaments   | View all tournaments          |
| Tournament details | View specific tournament info |
| Current match      | Get next match to play        |
| Tournament stats   | Competition statistics        |

### Admin Panel — `@rcaillie`

| Role          | Permissions                                  |
| ------------- | -------------------------------------------- |
| **Admin**     | See, update, modify, delete any user         |
| **Moderator** | List all users, force-disable any user's 2FA |

### Infrastructure — `@rcaillie` `@jhervoch`

| Feature         | Description                                                             |
| --------------- | ----------------------------------------------------------------------- |
| Online presence | Heartbeat + Redis TTL tracking                                          |
| User status     | Check if specific user is online                                        |
| Rate limiting   | Protection on sensitive endpoints (login, register, 2FA, OAuth, delete) |
| mTLS            | Client certificate required between services                            |
| Token cleanup   | Automatic expiration of tokens and TOTP secrets                         |

### Blockchain - `@jhervoch`

| Feature                | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| Message Broker (Redis) | Listening and consuming tournament results from game service |
| Smart contract         | Storing tournament results on-chain                          |
| Dapp                   | Viewing tournament results                                   |

## Modules:

> **Total: 33 pts** (minimum required: 14 pts)

| #   | Category         | Module                                                       | Type  | Points |
| --- | ---------------- | ------------------------------------------------------------ | ----- | ------ |
| 1   | Web              | Real-time features (WebSockets)                              | Major | 2      |
| 2   | Web              | Use a framework for both frontend and backend                | Major | 2      |
| 3   | Web              | Custom-made design system with reusable components           | Minor | 1      |
| 4   | Web              | Advanced search with filters, sorting, and pagination        | Minor | 1      |
| 5   | User Management  | Standard user management & authentication                    | Major | 2      |
| 6   | User Management  | Advanced permissions system (admin / moderator)              | Major | 2      |
| 7   | User Management  | Remote authentication (OAuth 2.0 — Google & 42)              | Minor | 1      |
| 8   | User Management  | Two-Factor Authentication (TOTP / 2FA)                       | Minor | 1      |
| 9   | User Management  | Game statistics & match history                              | Minor | 1      |
| 10  | Gaming & UX      | Complete web-based game (Pong)                               | Major | 2      |
| 11  | Gaming & UX      | Remote players (real-time multiplayer)                       | Major | 2      |
| 12  | Gaming & UX      | Tournament system                                            | Minor | 1      |
| 13  | AI               | AI Opponent (PPO reinforcement learning)                     | Major | 2      |
| 14  | DevOps           | Backend as microservices                                     | Major | 2      |
| 15  | Blockchain       | Store tournament scores on Blockchain (Solidity)             | Major | 2      |
| 16  | Database         | A public API to interact with the database                   | Major | 2      |
| 17  | Database         | ORM (Prisma)                                                 | Minor | 1      |
| 18  | Security         | GDPR compliance features                                     | Minor | 1      |
| 19  | Accessibility    | Internationalization (i18n) — support for multiple languages | Minor | 1      |
| 20  | Accessibility    | Support for additional browsers                              | Minor | 1      |
| 21  | Module of choice | LED panel implementation (IoT)                               | Minor | 1      |
|     |                  | **Major modules × 10**                                       |       | **20** |
|     |                  | **Minor modules × 12**                                       |       | **13** |
|     |                  | **TOTAL**                                                    |       | **33** |

Module of choice justification: We chose to implement a LED panel for scores as an extra feature. It adds a nice visual and interactive element to the game and allows us to experiment with real-time updates and animations.

## Individual Contributions:

### lisambet — Product Owner

- **AI Opponent**: PPO reinforcement learning agent for the Pong game
- **Friends System**: Co-developed friendship features (requests, status updates, nicknames)
- **Game**: Contributed to game session logic and real-time gameplay

### fpetit — Tech Lead

- **User Service**: Full implementation of user profiles (create, get, search, avatar upload, delete)
- **Friends System**: Co-developed friendship management (requests, list, remove, block, nicknames)
- **Admin Panel**: Role-based permissions system (admin: update/delete users, moderator: list users, force-disable 2FA)
- **ORM**: Prisma integration for the Users service

### rcaillie — Developer

- **Auth Service**: Local auth (register/login), OAuth2 (42 School & Google), JWT session management, account deletion
- **Two-Factor Authentication**: TOTP setup, QR code generation, login verification, enable/disable 2FA
- **Infrastructure**: Rate limiting on sensitive endpoints, mTLS between services, token cleanup

### jhervoch — Tech Lead

- **Blockchain Service**: Redis message broker for tournament results, Solidity smart contract on Avalanche, Dapp for viewing results
- **Tournament System**: Tournament creation, join, bracket management, match scheduling, statistics
- **Infrastructure**: Co-developed mTLS certificate system, online presence tracking
- **Game**: Contributed to game service and match history

### npolack — Scrum Master

- **Game Engine**: Real-time Pong gameplay over WebSockets, game session management (create/list/delete), configurable game settings, player stats

> README file was created and maintained by `@lisambet` with contributions from the team.
