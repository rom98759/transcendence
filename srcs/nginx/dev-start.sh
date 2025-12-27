#!/bin/sh
set -e

echo "🔐 Generating SSL certificates..."
# Create directory for certificates
mkdir -p /etc/nginx/ssl

# Generate self-signed certificate directly to /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -subj "/CN=localhost"

echo "✅ SSL certificates generated"

echo "📁 Preparing Nginx static directory..."
# Ensure the directory exists
mkdir -p /usr/share/nginx/src/html

# Check if index.html exists
if [ ! -f /usr/share/nginx/src/html/index.html ]; then
    echo "⚠️  Warning: index.html not found at /usr/share/nginx/src/html/index.html"
fi

echo "🔄 Starting ESBuild watcher..."
# Watch and rebuild, output to src/html directory
esbuild /usr/share/nginx/src/index.ts \
    --bundle \
    --outfile=/usr/share/nginx/src/html/app.js \
    --format=iife \
    --target=es2017 \
    --watch=forever &

# Wait a moment for initial build
sleep 2

echo "🚀 Starting Nginx..."
exec nginx -g "daemon off;"
#
# set -e
# # Create directory for certificates
# mkdir -p dev-nginx/ssl
#
# # Generate self-signed certificate
# openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
#   -keyout nginx/ssl/key.pem \
#   -out nginx/ssl/cert.pem \
#   -subj "/CN=localhost"
#
# cp dev-nginx/ssl/cert.pem /etc/nginx/ssl/cert.pem
# cp dev-nginx/ssl/key.pem /etc/nginx/ssl/key.pem
#
# echo "📁 Preparing Nginx static directory..."
# # Ensure the directory exists
# mkdir -p /usr/share/nginx/src/html
#
# # Check if index.html exists
# if [ ! -f /usr/share/nginx/src/html/index.html ]; then
#     echo "⚠️  Warning: index.html not found at /usr/share/nginx/src/html/index.html"
# fi
#
# echo "🔄 Starting ESBuild watcher..."
# # Watch and rebuild, output to src/html directory
# esbuild /usr/share/nginx/src/index.ts \
#     --bundle \
#     --outfile=/usr/share/nginx/src/html/app.js \
#     --format=iife \
#     --target=es2017 \
#     --watch=forever &
#
# # Wait a moment for initial build
# sleep 2
#
# echo "🚀 Starting Nginx..."
# exec nginx -g "daemon off;"
#

