#!/bin/bash
# Bootstrap and migrate the database for raadso backend (secure, idempotent, and ordered)
set -e
set -x # Enable debug printing

# Securely load environment variables
set -o allexport
if [ -f .env ]; then
  source .env
fi
set +o allexport

# Always resolve project root.
# $0 is the script path. dirname $0 is the folder containing the script (scripts/).
# ../ is the project root.
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Load root .env if it exists
set -o allexport
if [ -f .env ]; then
  source .env
fi
set +o allexport

# Database Configuration
DB_URL="${DATABASE_URL:-postgresql://postgres@localhost:5432/job_platform}"
SQL_DIR="$PROJECT_ROOT/backend/sql"
INIT_MIGRATION="$SQL_DIR/initialmigration.sql"
MIGRATIONS_DIR="$SQL_DIR/migrations"

echo "[INFO] Starting DB Bootstrap"
echo "[INFO] Project Root: $PROJECT_ROOT"
echo "[INFO] SQL Dir: $SQL_DIR"

# Create database if it doesn't exist
db_name=$(echo "$DB_URL" | sed -E 's|.*/([^/?]+).*|\1|')
if ! psql "$DB_URL" -c '\q' 2>/dev/null; then
  echo "[INFO] Creating database $db_name..."
  createdb "$db_name"
else
  echo "[INFO] Database $db_name exists."
fi

# Helper to check required columns exist
check_column() {
  local table_name="$1"
  local column_name="$2"
  local exists
  exists=$(psql -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table_name' AND column_name = '$column_name'" "$DB_URL" | xargs)
  if [ "$exists" != "1" ]; then
    echo "[ERROR] Column $column_name missing from $table_name"
    exit 1
  fi
}

# 1. Run initial migration
if [ -f "$INIT_MIGRATION" ]; then
  echo "[INFO] Running initial migration: $INIT_MIGRATION"
  psql -v ON_ERROR_STOP=1 "$DB_URL" -f "$INIT_MIGRATION"
else
  echo "[ERROR] Initial migration not found at $INIT_MIGRATION"
  exit 1
fi

# 2. Ensure migrations tracking table exists
echo "[INFO] Verifying migrations table..."
psql "$DB_URL" -c "CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, filename TEXT UNIQUE, applied_at TIMESTAMP DEFAULT now());"

# 3. Run other migrations
if [ -d "$MIGRATIONS_DIR" ]; then
  echo "[INFO] Checking for new migrations in $MIGRATIONS_DIR..."
  # Use sort to ensure strict ordering if needed, currently glob order
  for file in "$MIGRATIONS_DIR"/*.sql; do
    # Check if glob matched nothing
    [ -e "$file" ] || continue
    
    fname=$(basename "$file")
    
    # Check if migration applied
    APPLIED=$(psql "$DB_URL" -tAc "SELECT 1 FROM migrations WHERE filename = '$fname'")
    
    if [ "$APPLIED" != "1" ]; then
      echo "[INFO] Applying migration: $fname"
      
      file_dir="$(cd "$(dirname "$file")" && pwd)"
      abs_path="$file_dir/$fname"

      if [ -f "$abs_path" ]; then
        psql -v ON_ERROR_STOP=1 "$DB_URL" -f "$abs_path"
        psql "$DB_URL" -c "INSERT INTO migrations (filename) VALUES ('$fname') ON CONFLICT (filename) DO NOTHING;"
      else
         echo "[ERROR] File $abs_path not found"
         exit 1
      fi
    else
      echo "[INFO] Skipping already applied: $fname"
    fi
  done
else
  echo "[WARN] No migrations directory found at $MIGRATIONS_DIR"
fi

echo "[INFO] All migrations complete."
echo ""
echo "========================================"
echo "      DATABASE BOOTSTRAP SUMMARY"
echo "========================================"
TABLE_COUNT=$(psql -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" "$DB_URL")
COLUMN_COUNT=$(psql -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public'" "$DB_URL")
echo "Total Tables Created:  $TABLE_COUNT"
echo "Total Columns Created: $COLUMN_COUNT"
echo "========================================"

echo "[INFO] Verifying critical 2FA session columns..."
check_column "two_fa_sessions" "ip_address"
check_column "two_fa_sessions" "device_fingerprint"
check_column "two_fa_sessions" "token_jti"
check_column "two_fa_sessions" "revoked_at"

echo "[INFO] Verifying critical user compliance columns..."
check_column "users" "is_admin"
check_column "users" "agreed_to_terms"
check_column "users" "agreed_at"
check_column "users" "terms_version_accepted"

set +x