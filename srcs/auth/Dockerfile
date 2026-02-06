# ==========================
# Stage 1 — Builder
# ==========================
FROM node:20-alpine AS builder

WORKDIR /app

# 1) Manifests nécessaires au calcul du graphe workspace
# Copy ROOT workspace manifests
COPY package.json package-lock.json ./
# les manisfests du service
COPY srcs/auth/package.json ./srcs/auth/package.json
# Copy shared core package files
COPY srcs/shared/core/package*.json ./srcs/shared/core/
COPY srcs/shared/core/tsconfig.json ./srcs/shared/core/tsconfig.json

# 2) Installation déterministe (workspaces)
RUN npm ci

# 3) Sources minimales nécessaires au build
COPY srcs/auth ./srcs/auth
COPY srcs/shared/core/src ./srcs/shared/core/src

# 4) Build (core puis auth)
RUN npm run build --workspace srcs/shared/core
RUN npm run build --workspace srcs/auth

RUN npm prune --omit=dev

# ==========================
# Stage 2 — Runner
# ==========================
FROM node:20-alpine

# Install runtime-only system deps (wget for healthcheck)
RUN apk add --no-cache wget

# 5) Installer UNIQUEMENT les dépendances runtime du workspace users
COPY package-lock.json ./package-lock.json
COPY srcs/auth/package.json ./package.json
# audit and fund are done in builder
RUN npm install --omit=dev --no-audit --no-fund

# 6) Injecter le package interne @transcendence/core (compilé)
RUN mkdir -p node_modules/@transcendence
# Copier le package core compilé
COPY --from=builder /app/srcs/shared/core/package.json ./node_modules/@transcendence/core/package.json
COPY --from=builder /app/srcs/shared/core/dist ./node_modules/@transcendence/core/dist

# 7) Artifacts runtime du service
COPY --from=builder /app/srcs/auth/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]

