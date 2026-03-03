#!/bin/sh

set -e

# chown -R appuser:appgroup /app/uploads

DB_FILE="/app/data/um.db"

if [ ! -f "$DB_FILE" ]; then
  echo "Fresh DB — running migrate deploy..."
  npx prisma migrate deploy
else
  echo "Existing DB — using db push..."
  npx prisma db push
fi

echo "Starting app..."
exec "$@"