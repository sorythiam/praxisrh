#!/bin/sh
# Applies pending migrations, then the RLS policies (idempotent — see
# prisma/rls.sql), before starting the API. Runs on every container
# start; both steps are safe to repeat.
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Applying row-level security policies..."
psql "$DATABASE_URL" -f prisma/rls.sql

echo "Starting API..."
exec "$@"
