# ==========================
# Stage 1 — Builder
# ==========================
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ wget

WORKDIR /app

# Manifests
COPY package.json package-lock.json ./
COPY srcs/users/package.json ./srcs/users/package.json
COPY srcs/shared/core/package*.json ./srcs/shared/core/
COPY srcs/shared/core/tsconfig.json ./srcs/shared/core/tsconfig.json

# Install
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy build sources
COPY srcs/users ./srcs/users
COPY srcs/shared/core/src ./srcs/shared/core/src

# Prisma
WORKDIR /app/srcs/users
RUN npx prisma generate

# Build
WORKDIR /app
RUN npm run build --workspace srcs/shared/core
RUN npm run build --workspace srcs/users

# ==========================
# Stage 2 — Runner
# ==========================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules

# Remove symlink @transcendence/core to later get real artifact
RUN rm -rf ./node_modules/@transcendence/core

# COPY artifacts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/srcs/shared/core/package.json ./node_modules/@transcendence/core/package.json
COPY --from=builder /app/srcs/shared/core/dist ./node_modules/@transcendence/core/dist

COPY --from=builder /app/srcs/users/dist ./dist
COPY --from=builder /app/srcs/users/prisma ./prisma
COPY --from=builder /app/srcs/users/prisma.config.js ./prisma.config.js

# Entrypoint
COPY srcs/users/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Runtime dirs
RUN mkdir -p /app/data /app/uploads

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/index.js"]
