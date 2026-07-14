#!/bin/sh
# Provisions a disposable test database so the isolation e2e suite never
# touches dev/seed data, applies migrations + RLS to it, then runs the
# suite. Requires the same Postgres server as local dev (reads
# connection details from TEST_DATABASE_URL, defaulting to a local
# "praxis_test" database on the same server as DATABASE_URL).
set -e

TEST_DB_NAME="${TEST_DB_NAME:-praxis_test}"
TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://praxis:praxis@localhost:5432/${TEST_DB_NAME}?schema=public}"

echo "Provisioning test database ${TEST_DB_NAME}..."
PGPASSWORD=praxis dropdb -h localhost -U praxis --if-exists "$TEST_DB_NAME"
PGPASSWORD=praxis createdb -h localhost -U praxis "$TEST_DB_NAME"

export DATABASE_URL="$TEST_DATABASE_URL"
npx prisma migrate deploy
PGPASSWORD=praxis psql -h localhost -U praxis -d "$TEST_DB_NAME" -f prisma/rls.sql

echo "Running tenant isolation e2e suite against ${TEST_DB_NAME}..."
npx jest --config test/jest-e2e.json "$@"
