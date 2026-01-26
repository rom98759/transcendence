#!/bin/sh

set -e

# chown -R appuser:appgroup /app/uploads

echo "Running prisma db push..."
npx prisma migrate deploy

echo "Starting app..."
exec "$@"