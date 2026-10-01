-- Document verification is deliberately separate from upload presence.
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "DocumentOcrStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "RegistrationSubmissionType" AS ENUM ('INDIVIDUAL', 'GROUP');

ALTER TABLE "AthleteMedia"
  ADD COLUMN "verificationStatus" "DocumentVerificationStatus",
  ADD COLUMN "verificationNote" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedBy" TEXT,
  ADD COLUMN "ocrStatus" "DocumentOcrStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN "ocrProvider" TEXT,
  ADD COLUMN "ocrConfidence" DOUBLE PRECISION,
  ADD COLUMN "ocrData" JSONB;

CREATE TABLE "RegistrationSubmission" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "accountId" TEXT,
  "type" "RegistrationSubmissionType" NOT NULL DEFAULT 'INDIVIDUAL',
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "contactPhone" TEXT,
  "organizationName" TEXT,
  "referenceCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrationSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationSubmission_referenceCode_key" ON "RegistrationSubmission"("referenceCode");
CREATE INDEX "RegistrationSubmission_eventId_createdAt_idx" ON "RegistrationSubmission"("eventId", "createdAt");
CREATE INDEX "RegistrationSubmission_contactEmail_createdAt_idx" ON "RegistrationSubmission"("contactEmail", "createdAt");
CREATE INDEX "RegistrationSubmission_accountId_idx" ON "RegistrationSubmission"("accountId");

ALTER TABLE "RegistrationSubmission"
  ADD CONSTRAINT "RegistrationSubmission_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistrationSubmission"
  ADD CONSTRAINT "RegistrationSubmission_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "ParticipantAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventRegistration" ADD COLUMN "submissionId" TEXT;
ALTER TABLE "EventRegistration" ALTER COLUMN "accountId" DROP NOT NULL;
ALTER TABLE "EventRegistration" DROP CONSTRAINT IF EXISTS "EventRegistration_accountId_fkey";
ALTER TABLE "EventRegistration"
  ADD CONSTRAINT "EventRegistration_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "ParticipantAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventRegistration"
  ADD CONSTRAINT "EventRegistration_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "RegistrationSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "EventRegistration_submissionId_idx" ON "EventRegistration"("submissionId");
