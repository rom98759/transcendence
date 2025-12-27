# ==========================
# Stage 1 — Builder
# ==========================

FROM node:20-alpine AS builder

# needed for better-sqlite3
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

COPY prisma ./prisma
COPY prisma.config.* ./
RUN npx prisma generate

RUN npm run build

# ==========================
# Stage 2 — Production
# ==========================

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache wget \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

RUN mkdir -p ./data && chown -R appuser:appgroup /app

# needed for npm ci
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/src/config/env.ts ./src/config/env.ts
COPY --from=builder /app/dist ./dist

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN npx prisma generate

COPY ./entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER appuser

ENTRYPOINT [ "/app/entrypoint.sh" ]

CMD ["node", "dist/index.js"]
