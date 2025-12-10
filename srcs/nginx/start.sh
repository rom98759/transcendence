#!/bin/sh
set -e

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
