CREATE TYPE "SportDataAccountType" AS ENUM ('ATHLETE', 'FEDERATION');
CREATE TYPE "AccountVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "ParticipantAccount"
  ADD COLUMN "accountType" "SportDataAccountType" NOT NULL DEFAULT 'ATHLETE',
  ADD COLUMN "verificationStatus" "AccountVerificationStatus" NOT NULL DEFAULT 'VERIFIED',
  ADD COLUMN "representativePosition" TEXT,
  ADD COLUMN "federationId" TEXT;

CREATE INDEX "ParticipantAccount_accountType_verificationStatus_idx"
  ON "ParticipantAccount"("accountType", "verificationStatus");
CREATE INDEX "ParticipantAccount_federationId_idx"
  ON "ParticipantAccount"("federationId");

ALTER TABLE "ParticipantAccount"
  ADD CONSTRAINT "ParticipantAccount_federationId_fkey"
  FOREIGN KEY ("federationId") REFERENCES "Federation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
