ALTER TYPE "SportDataAccountType" RENAME VALUE 'FEDERATION' TO 'TEAM_LEADER';
ALTER TYPE "SportDataAccountType" ADD VALUE 'REFEREE';
ALTER TYPE "SportDataAccountType" ADD VALUE 'COACH';
ALTER TYPE "SportDataAccountType" ADD VALUE 'MEDICAL_STAFF';

-- Keep accountType as the primary type for compatibility with existing clients.
ALTER TABLE "ParticipantAccount" ADD COLUMN "accountTypes" "SportDataAccountType"[]
  NOT NULL DEFAULT ARRAY['ATHLETE']::"SportDataAccountType"[];
UPDATE "ParticipantAccount" SET "accountTypes" = ARRAY["accountType"];
ALTER TABLE "ParticipantAccount" ADD CONSTRAINT "ParticipantAccount_accountTypes_nonempty"
  CHECK (cardinality("accountTypes") > 0);

-- Existing organization accounts become personal team leaders without losing
-- their organization, verification status, password or registration history.
UPDATE "ParticipantAccount" p SET "countryId" = f."countryId", "gender" = COALESCE(p."gender", 'MIXED'::"Gender")
FROM "Federation" f WHERE p."federationId" = f.id AND p."accountType" = 'TEAM_LEADER';
