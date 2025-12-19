#!/bin/sh

set -e

echo "Running prisma db push..."
npx prisma db push --schema=./prisma/schema.prisma --config=./prisma.config.ts

echo "Starting app..."
exec "$@"