#!/bin/sh
set -eu

: "${POSTGRES_REPLICATION_PASSWORD:?POSTGRES_REPLICATION_PASSWORD is required}"
: "${BACKUP_RETENTION_DAYS:=7}"

while true; do
  timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
  target="/backups/base-${timestamp}"
  mkdir -p "$target"
  PGPASSWORD="$POSTGRES_REPLICATION_PASSWORD" pg_basebackup \
    -h postgres-primary -U replicator -D "$target" -Fp -Xs -P
  find /backups -mindepth 1 -maxdepth 1 -type d -mtime "+$BACKUP_RETENTION_DAYS" -exec rm -rf -- {} \;
  sleep 86400
done
