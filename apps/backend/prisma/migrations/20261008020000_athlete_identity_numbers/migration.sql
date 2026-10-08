ALTER TABLE "AthleteIdentity"
ADD COLUMN "cccdHash" TEXT,
ADD COLUMN "passportHash" TEXT,
ADD COLUMN "cccdEncrypted" TEXT,
ADD COLUMN "passportEncrypted" TEXT;
CREATE INDEX "AthleteIdentity_cccdHash_idx" ON "AthleteIdentity"("cccdHash");
CREATE INDEX "AthleteIdentity_passportHash_idx" ON "AthleteIdentity"("passportHash");
