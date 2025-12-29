# ==========================
# Stage 1 — Builder
# ==========================

# ==========================
# Paths should be written from root
# ==========================

FROM node:20-alpine AS builder

# needed for better-sqlite3
RUN apk add --no-cache python3 make g++
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./

# Copy shared core package files
COPY srcs/shared/core/package.json ./srcs/shared/core/package.json
COPY srcs/shared/core/tsconfig.json ./srcs/shared/core/tsconfig.json

# Copy users service package files
COPY srcs/users/package.json ./srcs/users/package.json
COPY srcs/users/package-lock.json ./srcs/users/package-lock.json

# Install dependencies for workspace (this links @transcendence/core)
RUN npm ci

# Copy and build shared core first
COPY srcs/shared/core/src ./srcs/shared/core/src
RUN npm run build --workspace srcs/shared/core

# Copy users service source files
COPY srcs/users/tsconfig.json ./srcs/users/tsconfig.json
COPY srcs/users/tsconfig.build.json ./srcs/users/tsconfig.build.json
COPY srcs/users/src ./srcs/users/src
COPY srcs/users/entrypoint.sh ./srcs/users/entrypoint.sh

# Copy Prisma files
COPY srcs/users/prisma ./srcs/users/prisma
COPY srcs/users/prisma.config.* ./srcs/users/

WORKDIR /app/srcs/users
# Generate Prisma client
RUN npx prisma generate

# Build → dist/
RUN npm run build

# ==========================
# Stage 2 — Production
# ==========================

FROM node:20-alpine AS runner

# Keep the same workspace root as builder
WORKDIR /app

RUN apk add --no-cache wget python3 make g++ \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

# Copy root workspace files
COPY --from=builder /app/package.json /app/package-lock.json ./

# Copy shared core (built artifacts + package.json for workspace resolution)
COPY --from=builder /app/srcs/shared/core/package.json ./srcs/shared/core/package.json
COPY --from=builder /app/srcs/shared/core/dist ./srcs/shared/core/dist

# Copy users service package files
COPY --from=builder /app/srcs/users/package.json ./srcs/users/package.json
COPY --from=builder /app/srcs/users/package-lock.json ./srcs/users/package-lock.json

# Copy users built artifacts
COPY --from=builder /app/srcs/users/dist ./srcs/users/dist

# Copy Prisma files
COPY --from=builder /app/srcs/users/src/config/ ./srcs/users/src/config
COPY --from=builder /app/srcs/users/prisma ./srcs/users/prisma
COPY --from=builder /app/srcs/users/prisma.config.ts ./srcs/users/prisma.config.ts

# Skip husky in production
ENV HUSKY=0

# Install production dependencies (workspace resolution works because structure matches)
RUN npm ci --omit=dev

# Generate Prisma client in production
WORKDIR /app/srcs/users
RUN npx prisma generate

# Create data directory and set permissions (only for /app/srcs/users)
RUN mkdir -p ./data && chown -R appuser:appgroup ./

# Copy entrypoint
COPY --from=builder /app/srcs/users/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER appuser

ENTRYPOINT [ "/app/srcs/users/entrypoint.sh" ]

CMD ["node", "dist/index.js"]
