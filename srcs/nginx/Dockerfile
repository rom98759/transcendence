# ==========================
# Stage 1 — Builder (frontend only)
# ==========================

FROM node:20-alpine AS builder

ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_SCHOOL42_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_SCHOOL42_CLIENT_ID=${VITE_SCHOOL42_CLIENT_ID}

WORKDIR /app

# COPY manifests
COPY package.json package-lock.json ./
COPY srcs/shared/core/package.json ./srcs/shared/core/package.json
COPY srcs/nginx/package.json ./srcs/nginx/package.json
COPY srcs/nginx/tsconfig.json ./srcs/nginx/tsconfig.json
COPY srcs/shared/core/tsconfig.json ./srcs/shared/core/tsconfig.json

# Install
RUN --mount=type=cache,target=/root/.npm npm ci

# Build
COPY srcs/shared/core/src ./srcs/shared/core/src
COPY srcs/nginx ./srcs/nginx
RUN npm run build --workspace srcs/shared/core
RUN npm run build --workspace proxy-service

# ==========================
# Stage 2 — Dev (node + nginx)
# ==========================

FROM node:20-alpine AS dev

RUN apk add --no-cache nginx wget openssl

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

# COPY DEV conf file
COPY srcs/nginx/nginx.conf /etc/nginx/nginx.conf
COPY srcs/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY srcs/nginx/conf.d/proxy_headers.conf /etc/nginx/conf.d/proxy_headers.conf
COPY srcs/nginx/conf.d/proxy_nginx_certs.conf /etc/nginx/conf.d/proxy_nginx_certs.conf
COPY srcs/nginx/conf.d/frontend.dev.conf /etc/nginx/snippets/frontend.conf

RUN mkdir -p /usr/share/nginx/html/uploads && chmod 755 /usr/share/nginx/html/uploads

EXPOSE 80 443 5173

# ==========================
# Stage 3 — Production (nginx)
# ==========================

FROM nginx:alpine AS production

RUN apk add --no-cache wget openssl
RUN rm -f /etc/nginx/conf.d/default.conf

# COPY PROD conf file
COPY srcs/nginx/nginx.conf /etc/nginx/nginx.conf
COPY srcs/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY srcs/nginx/conf.d/proxy_headers.conf /etc/nginx/conf.d/proxy_headers.conf
COPY srcs/nginx/conf.d/proxy_nginx_certs.conf /etc/nginx/conf.d/proxy_nginx_certs.conf
COPY srcs/nginx/conf.d/frontend.prod.conf /etc/nginx/snippets/frontend.conf

COPY --from=builder /app/srcs/nginx/dist /usr/share/nginx/src/html
COPY --from=builder /app/srcs/nginx/dist/src/html/dashboard.html /usr/share/nginx/src/html/dashboard.html
COPY --from=builder /app/srcs/nginx/dist/src/html/admin.html /usr/share/nginx/src/html/admin.html

RUN mkdir -p /usr/share/nginx/html/uploads \
 && chmod 755 /usr/share/nginx/html/uploads

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]

