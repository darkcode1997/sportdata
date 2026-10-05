BEGIN;

CREATE TYPE "Permission" AS ENUM ('DRAW_PRECONFIGURE');
ALTER TABLE "User" ADD COLUMN "permissions" "Permission"[] NOT NULL DEFAULT ARRAY[]::"Permission"[];

-- Restore access for existing administrators after the previous migration
-- removed the per-account permission column. New accounts require an explicit grant.
UPDATE "User" SET "permissions" = ARRAY['DRAW_PRECONFIGURE']::"Permission"[]
WHERE "role" = 'ADMIN';

COMMIT;
