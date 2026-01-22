# ==========================
# Stage 1 — Builder
# ==========================

FROM node:20-alpine AS builder
WORKDIR /build

# Copy root package files for workspace resolution
# Copy shared core package files
# Copy nginx service package files
# Install dependencies
COPY package.json package-lock.json ./
COPY srcs/shared/core/package*.json ./srcs/shared/core/
COPY srcs/shared/core/tsconfig.json ./srcs/shared/core/
COPY srcs/nginx/package.json ./srcs/nginx/
RUN npm i

# Copy and build shared core first
COPY srcs/shared/core/ ./srcs/shared/core/
RUN npm run build -w @transcendence/core

# Copy code and build
COPY srcs/nginx/. ./srcs/nginx/.
COPY srcs/nginx/src/html/dashboard.html ./srcs/nginx/html/dashboard.html 
RUN npm run build -w srcs/nginx

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
COPY srcs/nginx/nginx.conf /etc/nginx/nginx.conf
COPY srcs/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY srcs/nginx/conf.d/proxy_headers.conf /etc/nginx/conf.d/proxy_headers.conf

# Copy React app built with Vite
COPY --from=builder /build/srcs/nginx/dist /usr/share/nginx/src/html/

# Copy dashboard
COPY --from=builder /build/srcs/nginx/html/dashboard.html /usr/share/nginx/html/

# Create directory for uploads
RUN mkdir -p /usr/share/nginx/html/uploads \
  && chmod 755 /usr/share/nginx/html/uploads

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
