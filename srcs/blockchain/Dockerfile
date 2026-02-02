# ==========================
# Stage 1 — Builder
# ==========================
FROM node:20-alpine AS builder

WORKDIR /app

# Native deps for sqlite / crypto libs
RUN apk add --no-cache python3 make g++

# Copy ROOT workspace manifests
COPY package.json package-lock.json ./

# Workspace manifests
COPY srcs/blockchain/package.json ./srcs/blockchain/package.json

# Install full workspace deps
RUN npm ci

# Copy full monorepo
COPY srcs/blockchain ./srcs/blockchain

# Build blockchain-service only
RUN npm run build --workspace srcs/blockchain


# ==========================
# Stage 2 — Runner
# ==========================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Runtime-only tools
RUN apk add --no-cache wget

# Copy runtime deps and built artefacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/srcs/blockchain/dist ./dist

# Copy static assets (not compiled by tsc)
COPY --from=builder /app/srcs/blockchain/src/views ./dist/views
COPY --from=builder /app/srcs/blockchain/src/public ./dist/public

EXPOSE 3005

CMD ["node", "dist/server.js"]

