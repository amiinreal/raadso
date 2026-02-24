#!/bin/bash
# migrate.sh: Robust migration runner for raadso platform
# Usage: ./migrate.sh <database_url>
# Example: ./migrate.sh postgres://user:pass@localhost:5432/job_platform

set -e

DB_URL="$1"
MIGRATIONS_DIR="$(dirname "$0")/migrations"
INIT_MIGRATION="$(dirname "$0")/initialmigration.sql"

if [ -z "$DB_URL" ]; then
  echo "Usage: $0 <database_url>"
  exit 1
fi

# 1. Run initial migration (idempotent)
echo "Running initial migration..."
psql "$DB_URL" -f "$INIT_MIGRATION"

echo "Ensuring migrations tracking table exists..."
psql "$DB_URL" -c "CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, filename TEXT UNIQUE, applied_at TIMESTAMP DEFAULT now());"

# 2. Run other migrations only if not already applied
if [ -d "$MIGRATIONS_DIR" ]; then
  for file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    fname=$(basename "$file")
    APPLIED=$(psql "$DB_URL" -tAc "SELECT 1 FROM migrations WHERE filename = '$fname'")
    if [ "$APPLIED" != "1" ]; then
      echo "Applying migration: $fname"
      psql "$DB_URL" -f "$file"
      psql "$DB_URL" -c "INSERT INTO migrations (filename) VALUES ('$fname') ON CONFLICT (filename) DO NOTHING;"
    else
      echo "Skipping already applied migration: $fname"
    fi
  done
else
  echo "No migrations directory found. Skipping additional migrations."
fi

echo "All migrations complete."
