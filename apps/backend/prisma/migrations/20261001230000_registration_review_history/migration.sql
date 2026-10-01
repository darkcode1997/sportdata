ALTER TABLE "EventRegistration"
ADD COLUMN "statusReason" TEXT,
ADD COLUMN "statusChangedAt" TIMESTAMP(3),
ADD COLUMN "statusChangedBy" TEXT,
ADD COLUMN "paymentStatusReason" TEXT,
ADD COLUMN "paymentStatusChangedAt" TIMESTAMP(3),
ADD COLUMN "paymentStatusChangedBy" TEXT;

-- Repair legacy paid-event registrations that were created with a zero fee.
UPDATE "EventRegistration" AS registration
SET
  "feeAmount" = event."registrationFee",
  "currency" = event."registrationCurrency"
FROM "Event" AS event
WHERE registration."eventId" = event."id"
  AND registration."paymentStatus" = 'PENDING'
  AND registration."feeAmount" = 0
  AND event."paymentMode" <> 'FREE'
  AND event."registrationFee" > 0;

CREATE TABLE "RegistrationStatusHistory" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "fromStatus" "RegistrationStatus" NOT NULL,
  "toStatus" "RegistrationStatus" NOT NULL,
  "reason" TEXT NOT NULL,
  "changedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentStatusHistory" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "fromStatus" "PaymentStatus" NOT NULL,
  "toStatus" "PaymentStatus" NOT NULL,
  "reason" TEXT NOT NULL,
  "changedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistrationStatusHistory_registrationId_createdAt_idx"
ON "RegistrationStatusHistory"("registrationId", "createdAt");

CREATE INDEX "PaymentStatusHistory_registrationId_createdAt_idx"
ON "PaymentStatusHistory"("registrationId", "createdAt");

ALTER TABLE "RegistrationStatusHistory"
ADD CONSTRAINT "RegistrationStatusHistory_registrationId_fkey"
FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentStatusHistory"
ADD CONSTRAINT "PaymentStatusHistory_registrationId_fkey"
FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
