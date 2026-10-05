#!/bin/sh
set -eu

echo "Preparing SportData database..."
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
npx prisma db execute --schema=apps/backend/prisma/schema.prisma --file=apps/backend/prisma/sql/match-schedule-constraints.sql

if [ "${SEED_DATABASE:-false}" = "true" ]; then
  npm run seed
fi

exec node apps/backend/dist/src/main.js
