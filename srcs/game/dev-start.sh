#!/bin/sh
set -e

echo "🔄 Starting ESBuild watcher..."
# Watch and rebuild, output to src/html directory
esbuild /usr/share/nginx/src/index.ts \
    --bundle \
    --outfile=/dist/server.js \
    --format=iife \
    --target=es2017 \
    --watch=forever &

# Wait a moment for initial build
sleep 2

echo "🚀 Starting Game service (DEV)"
exec nginx -g "daemon off;"
