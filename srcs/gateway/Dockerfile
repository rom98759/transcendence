# ==========================
# Stage 1 — Builder
# ==========================

# ==========================
# Paths should be written from root
# ==========================

FROM node:20-alpine AS builder

WORKDIR /app

# 1) Manifests nécessaires au calcul du graphe workspace
COPY package.json package-lock.json ./
# les manisfest du service
COPY srcs/gateway/package.json ./srcs/gateway/package.json
# Copy shared core package files
COPY srcs/shared/core/package*.json ./srcs/shared/core/
COPY srcs/shared/core/tsconfig.json ./srcs/shared/core/tsconfig.json

# 2) Installation déterministe (workspaces)
RUN npm ci

# 3) Sources nécessaires au build
COPY srcs/gateway ./srcs/gateway
COPY srcs/shared/core/src ./srcs/shared/core/src

# 4) Build core puis gateway
RUN npm run build --workspace srcs/shared/core
RUN npm run build --workspace srcs/gateway

# ==========================
# Stage 2 — Runner
# ==========================

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 6) Installer UNIQUEMENT les dépendances runtime du workspace users
COPY package-lock.json ./package-lock.json
COPY srcs/gateway/package.json ./package.json
# audit and fund are done in builder
RUN npm install --omit=dev --no-audit --no-fund

# 7) Injecter le package interne @transcendence/core (compilé)
RUN mkdir -p node_modules/@transcendence
# Copier le package core compilé
COPY --from=builder /app/srcs/shared/core/package.json ./node_modules/@transcendence/core/package.json
COPY --from=builder /app/srcs/shared/core/dist ./node_modules/@transcendence/core/dist

# 8) Artifacts runtime du service
COPY --from=builder /app/srcs/gateway/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]

