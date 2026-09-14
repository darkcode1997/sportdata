#!/bin/sh
set -eu

echo "Preparing SportData database..."
npx prisma db push --schema=apps/backend/prisma/schema.prisma --skip-generate
npx prisma db execute --schema=apps/backend/prisma/schema.prisma --file=apps/backend/prisma/sql/match-schedule-constraints.sql

if [ "${SEED_DATABASE:-true}" = "true" ]; then
  npm run seed
fi

exec node apps/backend/dist/src/main.js
