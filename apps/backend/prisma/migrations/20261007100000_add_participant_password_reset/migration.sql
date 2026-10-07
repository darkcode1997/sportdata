ALTER TABLE "ParticipantAccount"
ADD COLUMN "resetPasswordTokenHash" TEXT,
ADD COLUMN "resetPasswordExpiresAt" TIMESTAMP(3),
ADD COLUMN "resetPasswordRequestedAt" TIMESTAMP(3),
ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ParticipantAccount_resetPasswordTokenHash_key"
ON "ParticipantAccount"("resetPasswordTokenHash");
