#!/bin/sh
set -eu

echo "Preparing SportData database..."
npx prisma db push --schema=apps/backend/prisma/schema.prisma --skip-generate

if [ "${SEED_DATABASE:-true}" = "true" ]; then
  npm run seed
fi

exec node apps/backend/dist/src/main.js
