#!/bin/bash
# scripts/migrate-db.sh — run drizzle migrations against target database

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL env var not set"
  exit 1
fi

echo "Running DB migrations..."
pnpm --filter @workspace/db run push

echo "✓ Migrations completed successfully"
