#!/bin/sh
set -eu

: "${PGDATA:=/var/lib/postgresql/data}"
: "${POSTGRES_REPLICATION_PASSWORD:?POSTGRES_REPLICATION_PASSWORD is required}"

until pg_isready -h postgres-primary -U replicator; do
  echo "Waiting for PostgreSQL primary..."
  sleep 2
done

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  mkdir -p "$PGDATA"
  chown -R postgres:postgres "$PGDATA"
  PGPASSWORD="$POSTGRES_REPLICATION_PASSWORD" su-exec postgres pg_basebackup \
    -h postgres-primary -U replicator -D "$PGDATA" -Fp -Xs -P -R
fi

exec su-exec postgres postgres -c hot_standby=on
