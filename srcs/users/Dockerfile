# ==========================
# Stage 1 — Builder
# ==========================
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

# 1) Manifests nécessaires au calcul du graphe workspace
COPY package.json package-lock.json ./
COPY srcs/users/package.json ./srcs/users/package.json
COPY srcs/shared/core/package*.json ./srcs/shared/core/
COPY srcs/shared/core/tsconfig.json ./srcs/shared/core/tsconfig.json

# 2) Installation déterministe (workspaces)
RUN npm ci

# 3) Sources minimales nécessaires au build
COPY srcs/users ./srcs/users
COPY srcs/shared/core/src ./srcs/shared/core/src

# 4) Prisma (génération du client pour users)
WORKDIR /app/srcs/users
RUN npx prisma generate


# 5) Build (core puis users)
WORKDIR /app
RUN npm run build --workspace srcs/shared/core
RUN npm run build --workspace srcs/users


# ==========================
# Stage 2 — Runner
# ==========================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# 6) Installer UNIQUEMENT les dépendances runtime du workspace users
COPY package-lock.json ./package-lock.json
COPY srcs/users/package.json ./package.json
# audit and fund are done in builder
RUN npm install --omit=dev --no-audit --no-fund

# 7) Injecter le package interne @transcendence/core (compilé)
RUN mkdir -p node_modules/@transcendence
COPY --from=builder /app/srcs/shared/core/package.json ./node_modules/@transcendence/core/package.json
COPY --from=builder /app/srcs/shared/core/dist ./node_modules/@transcendence/core/dist

# 8) Artifacts runtime du service
COPY --from=builder /app/srcs/users/dist ./dist

# 9) Prisma runtime (client généré)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/srcs/users/prisma ./prisma
COPY --from=builder /app/srcs/users/prisma.config.ts ./prisma.config.ts

# 10) Config runtime
COPY --from=builder /app/srcs/users/src/config ./src/config

# Entry point
COPY srcs/users/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
# RUN apk add --no-cache openssl

# Runtime dirs
RUN mkdir -p /app/data /app/uploads

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/index.js"]
