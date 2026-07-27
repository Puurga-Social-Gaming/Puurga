#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E '^(DB_USER|DB_PASSWORD|DB_NAME|DB_HOST|DB_PORT)=' | xargs)
fi

DB_USER="${DB_USER:-puurga_user}"
DB_PASSWORD="${DB_PASSWORD:-puurga123}"
DB_NAME="${DB_NAME:-puurga_db}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo ""
echo "=== 1. Local PostgreSQL setup ==="

# Create user if not exists
psql postgres -v ON_ERROR_STOP=1 <<EOSQL
SELECT CASE WHEN EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}')
  THEN 'User ${DB_USER} already exists'
  ELSE 'Creating user ${DB_USER}'
END AS status;

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    EXECUTE format('CREATE USER %I WITH PASSWORD %L CREATEDB', '${DB_USER}', '${DB_PASSWORD}');
  ELSE
    EXECUTE format('ALTER USER %I WITH PASSWORD %L', '${DB_USER}', '${DB_PASSWORD}');
  END IF;
END
\$\$;
EOSQL

echo "User ${DB_USER}: OK"

# Create database if not exists
if ! psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  psql postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  echo "Created database ${DB_NAME}"
else
  echo "Database ${DB_NAME} already exists"
fi

psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

# Test connection
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 'Local DB connection OK' AS status;"

echo ""
echo "=== 2. Supabase verification (primary DB) ==="
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const tables = ['profiles','posts','messages','conversations','friends','groups','notifications','statuses','credit_transactions','user_survival_state'];
(async () => {
  for (const t of tables) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log('  ' + t + ': ' + (error ? 'ERR ' + error.message : (count ?? 0) + ' rows'));
  }
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1 });
  const total = error ? 'ERR ' + error.message : ((data && data.users) ? data.users.length + '+ accounts' : 'OK');
  console.log('  auth.users: ' + total);
  console.log('');
  console.log('=== Done ===');
  console.log('Primary DB : Supabase — connected with existing data');
  console.log('Local DB   : PostgreSQL — user/db ready');
})();
"

echo ""
echo "Start the app:"
echo "  cd backend && npm run dev"
echo "  cd .. && npm run dev"
