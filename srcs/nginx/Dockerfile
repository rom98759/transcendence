######## Builder #########
FROM node:18-alpine AS builder
WORKDIR /build
COPY . .
# Use esbuild to bundle TypeScript for the browser
RUN npx esbuild src/index.ts --bundle --outfile=app.js --format=iife --target=es2017
# RUN npm install -g typescript && tsc index.ts --outFile app.js --target ES2017 --lib ES2017,DOM

######## Server #########
FROM nginx:alpine

# Installer wget pour health check
RUN apk add --no-cache wget openssl

# Supprime la conf par défaut si besoin
RUN rm /etc/nginx/conf.d/default.conf || true

# Supprime les entrypoint de l'image officiel
RUN rm -f /docker-entrypoint.d/*
RUN mkdir -p /etc/nginx/ssl

# Generate self-signed certificate directly to /etc/nginx/ssl
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -subj "/CN=localhost"

COPY --from=builder /build/app.js /usr/share/nginx/src/html/
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY ./src      /usr/share/nginx/src

# Create directory for uploads
RUN mkdir -p /usr/share/nginx/html/uploads

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
