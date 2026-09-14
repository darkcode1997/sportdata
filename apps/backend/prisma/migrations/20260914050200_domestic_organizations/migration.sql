-- Allow the same competition platform to represent international delegations,
-- domestic federations, sports centers, clubs, schools and academies.
CREATE TYPE "FederationType" AS ENUM (
  'INTERNATIONAL_FEDERATION',
  'NATIONAL_FEDERATION',
  'SPORTS_CENTER',
  'CLUB',
  'SCHOOL',
  'ACADEMY',
  'OTHER'
);

CREATE TYPE "EventLevel" AS ENUM (
  'INTERNATIONAL',
  'NATIONAL',
  'REGIONAL',
  'PROVINCIAL',
  'CENTER_INTERNAL',
  'OPEN'
);

ALTER TABLE "Federation"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "type" "FederationType" NOT NULL DEFAULT 'NATIONAL_FEDERATION';

ALTER TABLE "Event"
  ADD COLUMN "level" "EventLevel" NOT NULL DEFAULT 'INTERNATIONAL',
  ADD COLUMN "organizerId" TEXT,
  ADD COLUMN "allowIndependentAthletes" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "_EventParticipatingFederations" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE INDEX "Federation_type_idx" ON "Federation"("type");
CREATE UNIQUE INDEX "Federation_countryId_code_key" ON "Federation"("countryId", "code");
CREATE INDEX "Event_level_idx" ON "Event"("level");
CREATE INDEX "Event_organizerId_idx" ON "Event"("organizerId");
CREATE UNIQUE INDEX "_EventParticipatingFederations_AB_unique" ON "_EventParticipatingFederations"("A", "B");
CREATE INDEX "_EventParticipatingFederations_B_index" ON "_EventParticipatingFederations"("B");

ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey"
  FOREIGN KEY ("organizerId") REFERENCES "Federation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_EventParticipatingFederations" ADD CONSTRAINT "_EventParticipatingFederations_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_EventParticipatingFederations" ADD CONSTRAINT "_EventParticipatingFederations_B_fkey"
  FOREIGN KEY ("B") REFERENCES "Federation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
