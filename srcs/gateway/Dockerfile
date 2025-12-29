# ==========================
# Stage 1 — Builder
# ==========================

# ==========================
# Paths should be written from root
# ==========================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./

# Copy shared core package files
COPY srcs/shared/core/package.json ./srcs/shared/core/package.json
COPY srcs/shared/core/tsconfig.json ./srcs/shared/core/tsconfig.json

# Copy service package files
COPY srcs/gateway/package.json ./srcs/gateway/package.json
COPY srcs/gateway/package-lock.json ./srcs/gateway/package-lock.json

# Install dependencies for workspace (this links @transcendence/core)
RUN npm ci

# Copy and build shared core first
COPY srcs/shared/core/src ./srcs/shared/core/src
RUN npm run build --workspace srcs/shared/core

# Copy service source files
COPY srcs/gateway/tsconfig.json ./srcs/gateway/tsconfig.json
COPY srcs/gateway/src ./srcs/gateway/src

WORKDIR /app/srcs/gateway

# Build → dist/
RUN npm run build

# ==========================
# Stage 2 — Production
# ==========================

FROM node:20-alpine AS runner

# Keep the same workspace root as builder
WORKDIR /app

# Copy root workspace files
COPY --from=builder /app/package.json /app/package-lock.json ./

# Copy shared core (built artifacts + package.json for workspace resolution)
COPY --from=builder /app/srcs/shared/core/package.json ./srcs/shared/core/package.json
COPY --from=builder /app/srcs/shared/core/dist ./srcs/shared/core/dist

# Copy service package files
COPY --from=builder /app/srcs/gateway/package.json ./srcs/gateway/package.json
COPY --from=builder /app/srcs/gateway/package-lock.json ./srcs/gateway/package-lock.json

# Copy built artifacts
COPY --from=builder /app/srcs/gateway/dist ./srcs/gateway/dist

# Skip husky in production
ENV HUSKY=0

# Installer uniquement les deps nécessaires en runtime
RUN npm ci --omit=dev

WORKDIR /app/srcs/gateway

EXPOSE 3000

CMD ["node", "dist/index.js"]

