# ==========================
# Stage 1 — Builder
# ==========================
FROM node:20-alpine AS builder

WORKDIR /app

# Installer les deps (dev + prod)
COPY package.json package-lock.json ./
RUN npm install

# Copier le code source
COPY tsconfig.json ./
COPY src ./src

# Compiler TypeScript → dist/
RUN npm run build



# ==========================
# Stage 2 — Production
# ==========================
FROM node:20-alpine AS runner

WORKDIR /app

# Installer wget pour health check
RUN apk add --no-cache wget
RUN apk add --no-cache python3 make g++
# Copier uniquement package.json pour installer deps prod
COPY package.json package-lock.json ./

# Installer uniquement les deps nécessaires en runtime
RUN npm install --omit=dev

# Copier build compilé depuis le builder
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
