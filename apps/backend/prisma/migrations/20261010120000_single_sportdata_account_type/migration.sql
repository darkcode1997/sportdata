-- Preserve the existing primary type when reducing accounts to a single type.
UPDATE "ParticipantAccount" SET "accountTypes" = ARRAY["accountType"];

ALTER TABLE "ParticipantAccount" DROP CONSTRAINT "ParticipantAccount_accountTypes_nonempty";
ALTER TABLE "ParticipantAccount" ADD CONSTRAINT "ParticipantAccount_accountTypes_single"
  CHECK (cardinality("accountTypes") = 1
    AND array_lower("accountTypes", 1) = 1
    AND "accountTypes"[1] IS NOT NULL
    AND "accountTypes"[1] = "accountType");
