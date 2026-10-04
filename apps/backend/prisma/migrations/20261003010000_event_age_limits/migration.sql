CREATE TYPE "EventAgeLimitMode" AS ENUM ('CATEGORY', 'UNRESTRICTED', 'CUSTOM');
ALTER TABLE "Event"
  ADD COLUMN "ageLimitMode" "EventAgeLimitMode" NOT NULL DEFAULT 'CATEGORY',
  ADD COLUMN "minAge" INTEGER,
  ADD COLUMN "maxAge" INTEGER;
-- Preserve category rules for existing events; new events have no age limit by default.
ALTER TABLE "Event" ALTER COLUMN "ageLimitMode" SET DEFAULT 'UNRESTRICTED';
ALTER TABLE "Event" ADD CONSTRAINT "Event_age_limits_check" CHECK (
  ("minAge" IS NULL OR "minAge" >= 0)
  AND ("maxAge" IS NULL OR "maxAge" >= 0)
  AND ("minAge" IS NULL OR "maxAge" IS NULL OR "minAge" <= "maxAge")
  AND ("ageLimitMode" <> 'CUSTOM' OR "minAge" IS NOT NULL OR "maxAge" IS NOT NULL)
);
