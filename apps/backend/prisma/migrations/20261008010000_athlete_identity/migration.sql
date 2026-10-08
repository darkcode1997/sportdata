CREATE TABLE "AthleteIdentity" (
  "athleteId" TEXT NOT NULL,
  "documentHash" TEXT,
  "addressHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AthleteIdentity_pkey" PRIMARY KEY ("athleteId"),
  CONSTRAINT "AthleteIdentity_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AthleteIdentity_documentHash_idx" ON "AthleteIdentity"("documentHash");
CREATE INDEX "Athlete_birthDate_idx" ON "Athlete"("birthDate");
