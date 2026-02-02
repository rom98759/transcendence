# ==========================
# Stage 1 — Builder
# ==========================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy ROOT workspace manifests
COPY package.json package-lock.json ./

# Workspace manifests
COPY srcs/game/package.json ./srcs/game/package.json

# Install full workspace deps (deterministic)
RUN npm ci

# Copy full monorepo
COPY srcs/game ./srcs/game

# Build game-service only
RUN npm run build --workspace srcs/game


# ==========================
# Stage 2 — Runner
# ==========================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy runtime deps and built artefacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/srcs/game/dist ./dist

EXPOSE 3003

CMD ["node", "dist/server.js"]

