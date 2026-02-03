# ==========================
# Stage 1 — Builder (frontend only)
# ==========================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy ROOT workspace manifests
COPY package.json package-lock.json ./


# Workspace manifests (OBLIGATOIRE avant npm ci)
COPY srcs/shared/core/package.json ./srcs/shared/core/package.json
COPY srcs/nginx/package.json ./srcs/nginx/package.json
COPY srcs/shared/core/tsconfig.json ./srcs/shared/core/tsconfig.json

# Install deps once (workspace-aware)
RUN npm ci

# Build shared core (types/constants)
COPY srcs/shared/core/src ./srcs/shared/core/src

# Copy only nginx frontend sources
COPY srcs/nginx ./srcs/nginx
COPY srcs/nginx/src/html/dashboard.html ./srcs/nginx/html/dashboard.html
COPY srcs/nginx/src/html/admin.html ./srcs/nginx/html/admin.html

# Build frontend (Vite)
RUN npm run build --workspace srcs/shared/core
RUN npm run build --workspace srcs/nginx


# ==========================
# Stage 2 — Production (nginx)
# ==========================
FROM nginx:alpine

# Runtime tools (healthcheck / TLS)
RUN apk add --no-cache wget openssl

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy nginx configuration
COPY srcs/nginx/nginx.conf /etc/nginx/nginx.conf
COPY srcs/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY srcs/nginx/conf.d/proxy_headers.conf /etc/nginx/conf.d/proxy_headers.conf
COPY srcs/nginx/conf.d/proxy_nginx_certs.conf /etc/nginx/conf.d/proxy_nginx_certs.conf

# Copy built frontend React app built with Vite
COPY --from=builder /app/srcs/nginx/dist /usr/share/nginx/src/html
# Copy dashboard
COPY --from=builder /app/srcs/nginx/html/dashboard.html /usr/share/nginx/src/html/
# Copy admin page
COPY --from=builder /app/srcs/nginx/html/admin.html /usr/share/nginx/src/html/

# Create uploads directory
RUN mkdir -p /usr/share/nginx/html/uploads \
 && chmod 755 /usr/share/nginx/html/uploads

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]

