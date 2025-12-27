#!/bin/sh

set -e

mkdir -p ./data
echo "Running prisma db push..."
npx prisma migrate deploy --config=./prisma.config.ts

echo "Starting app..."
exec "$@"