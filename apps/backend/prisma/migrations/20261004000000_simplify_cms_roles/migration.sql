BEGIN;

-- Retired operational roles retain login access without gaining broader permissions.
UPDATE "User"
SET "role" = 'READ_ONLY', "passwordChangedAt" = CURRENT_TIMESTAMP
WHERE "role"::text IN ('SPORT_MANAGER', 'VENUE_OPERATOR', 'SCOREKEEPER', 'RESULT_APPROVER', 'VIEWER');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'GAMES_ADMIN', 'READ_ONLY');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EDITOR'::"UserRole";
DROP TYPE "UserRole_old";

-- Draw preparation is now included in ADMIN and GAMES_ADMIN.
ALTER TABLE "User" DROP COLUMN "permissions";
DROP TYPE "Permission";

UPDATE "User" SET "name" = 'Demo · Quản lý sự kiện'
WHERE "username" = 'demo.games' AND "name" = 'Demo · Quản trị đại hội';

COMMIT;
