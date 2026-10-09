ALTER TABLE "ParticipantAccount" ALTER COLUMN "accountType" SET DEFAULT 'GENERAL';
ALTER TABLE "ParticipantAccount"
  ADD COLUMN "countryId" TEXT REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD COLUMN "gender" "Gender",
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "professionalSummary" TEXT,
  ADD COLUMN "verificationReviewedBy" TEXT,
  ADD COLUMN "verificationReviewedAt" TIMESTAMP(3),
  ADD COLUMN "verificationNote" TEXT;
UPDATE "ParticipantAccount" p SET "countryId" = a."countryId", "gender" = a."gender", "birthDate" = a."birthDate"
FROM "Athlete" a WHERE a."participantAccountId" = p."id";
ALTER TABLE "Athlete" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Athlete" ADD COLUMN "profileConfirmed" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Athlete" SET "profileConfirmed" = false WHERE "participantAccountId" IS NOT NULL;
CREATE TABLE "EventStaffRegistration" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "accountId" TEXT NOT NULL REFERENCES "ParticipantAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('REFEREE', 'TEAM_LEADER', 'COACH', 'MEDICAL')),
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  "note" TEXT,
  "reviewNote" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "EventStaffRegistration_eventId_accountId_key" ON "EventStaffRegistration"("eventId", "accountId");
CREATE INDEX "EventStaffRegistration_eventId_status_idx" ON "EventStaffRegistration"("eventId", "status");
CREATE INDEX "EventStaffRegistration_accountId_createdAt_idx" ON "EventStaffRegistration"("accountId", "createdAt");
