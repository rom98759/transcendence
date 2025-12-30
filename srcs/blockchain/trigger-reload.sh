#!/bin/bash
# Helper script to trigger hot reload when file watcher doesn't detect changes
# Usage: ./trigger-reload.sh

echo "🔄 Triggering hot reload for blockchain service..."
podman exec blockchain-service-dev touch /app/src/server.ts
echo "✅ Hot reload triggered! Check logs with: podman logs -f blockchain-service-dev"
