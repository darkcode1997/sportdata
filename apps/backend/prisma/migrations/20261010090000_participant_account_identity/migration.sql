ALTER TABLE "ParticipantAccount"
  ADD COLUMN "gender" "Gender",
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "countryId" TEXT,
  ADD COLUMN "weight" DOUBLE PRECISION,
  ADD COLUMN "height" DOUBLE PRECISION,
  ADD COLUMN "identityType" TEXT,
  ADD COLUMN "documentHash" TEXT,
  ADD COLUMN "documentEncrypted" TEXT;
CREATE UNIQUE INDEX "ParticipantAccount_documentHash_key" ON "ParticipantAccount"("documentHash");
