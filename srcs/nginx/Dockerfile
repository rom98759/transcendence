# ==========================
# Stage 1 — Builder
# ==========================

FROM node:20-alpine AS builder
WORKDIR /build

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy code and build
COPY . .
RUN npm run build

# ==========================
# Stage 2 — Production
# ==========================

FROM nginx:alpine

# Installer wget pour health check
RUN apk add --no-cache wget openssl

# Remove default nginx conf
RUN rm /etc/nginx/conf.d/default.conf || true

# Remove official entrypoint scripts
RUN rm -f /docker-entrypoint.d/*
RUN mkdir -p /etc/nginx/ssl

# Generate self-signed certificate directly to /etc/nginx/ssl
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf
# Assets should be bundled by Vite under dist/assets (from src/assets) : no need to copy
# COPY ./src/assets         /usr/share/nginx/html/assets

# Copy React app built with Vite
COPY --from=builder /build/dist /usr/share/nginx/src/html/

# Create directory for uploads
RUN mkdir -p /usr/share/nginx/html/uploads \
  && chmod 755 /usr/share/nginx/html/uploads

EXPOSE 8080 4430
CMD ["nginx", "-g", "daemon off;"]
