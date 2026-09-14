#!/bin/sh
set -eu

if [ -z "${POSTGRES_REPLICATION_PASSWORD:-}" ]; then
  echo "POSTGRES_REPLICATION_PASSWORD is required" >&2
  exit 1
fi

psql --set=ON_ERROR_STOP=1 \
  --set=replication_password="$POSTGRES_REPLICATION_PASSWORD" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'EOSQL'
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD :'replication_password';
EOSQL
