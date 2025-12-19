# ==========================
# Stage 1 — Builder
# ==========================

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY tsconfig.json ./
COPY vite.config.* ./
COPY prisma ./prisma
COPY prisma.config.* ./
COPY src ./src

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

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/config/env.ts ./src/config/env.ts
COPY --from=builder /app/dist ./dist

COPY ./entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER appuser

ENTRYPOINT [ "/app/entrypoint.sh" ]

CMD ["node", "dist/index.js"]
