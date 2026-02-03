# ==========================
# Stage 1 — Builder
# ==========================
FROM node:20-alpine AS builder

WORKDIR /app

# Native deps for sqlite / crypto libs
RUN apk add --no-cache python3 make g++

# 1) Manifests nécessaires au calcul du graphe workspace
# Copy ROOT workspace manifests
COPY package.json package-lock.json ./
COPY srcs/shared/core/package*.json ./srcs/shared/core/
COPY srcs/shared/core/tsconfig.json ./srcs/shared/core/tsconfig.json
# Workspace manifests
COPY srcs/blockchain/package.json ./srcs/blockchain/package.json

# 2) Installation déterministe (workspaces)
RUN npm ci

# 3) Sources minimales nécessaires au build
COPY srcs/blockchain ./srcs/blockchain
COPY srcs/shared/core/src ./srcs/shared/core/src

# 4) Build (core puis blockchain)
RUN npm run build --workspace srcs/shared/core
RUN npm run build --workspace srcs/blockchain


# ==========================
# Stage 2 — Runner
# ==========================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Runtime-only tools
RUN apk add --no-cache wget

# 5) Installer UNIQUEMENT les dépendances runtime du workspace users
COPY package-lock.json ./package-lock.json
COPY srcs/blockchain/package.json ./package.json
# audit and fund are done in builder
RUN npm install --omit=dev --no-audit --no-fund

# 6) Injecter le package interne @transcendence/core (compilé)
RUN mkdir -p node_modules/@transcendence
# Copier le package core compilé
COPY --from=builder /app/srcs/shared/core/package.json ./node_modules/@transcendence/core/package.json
COPY --from=builder /app/srcs/shared/core/dist ./node_modules/@transcendence/core/dist

# 7) Artifacts runtime du service
COPY --from=builder /app/srcs/blockchain/dist ./dist

# Copy static assets (not compiled by tsc)
COPY --from=builder /app/srcs/blockchain/src/views ./dist/views
COPY --from=builder /app/srcs/blockchain/src/public ./dist/public

EXPOSE 3005

CMD ["node", "dist/server.js"]

