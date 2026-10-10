CREATE TYPE "EventParticipationRole" AS ENUM ('ATTENDEE', 'REFEREE', 'TEAM_LEADER', 'COACH', 'MEDICAL_STAFF');
CREATE TABLE "EventParticipation" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "accountId" TEXT,
  "role" "EventParticipationRole" NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "contactPhone" TEXT,
  "federationId" TEXT,
  "referenceCode" TEXT NOT NULL,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "statusReason" TEXT,
  "statusChangedAt" TIMESTAMP(3),
  "statusChangedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventParticipation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventParticipation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EventParticipation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ParticipantAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EventParticipation_federationId_fkey" FOREIGN KEY ("federationId") REFERENCES "Federation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EventParticipation_team_leader_federation_required" CHECK ("role" <> 'TEAM_LEADER' OR "federationId" IS NOT NULL)
);
CREATE UNIQUE INDEX "EventParticipation_referenceCode_key" ON "EventParticipation"("referenceCode");
CREATE UNIQUE INDEX "EventParticipation_eventId_contactEmail_role_key" ON "EventParticipation"("eventId", "contactEmail", "role");
CREATE INDEX "EventParticipation_accountId_createdAt_idx" ON "EventParticipation"("accountId", "createdAt");
CREATE INDEX "EventParticipation_eventId_role_status_idx" ON "EventParticipation"("eventId", "role", "status");
