-- Public participant accounts, secure athlete documents and event registration.
CREATE TYPE "AthleteMediaType" AS ENUM ('AVATAR', 'CCCD_FRONT', 'CCCD_BACK', 'PASSPORT');
CREATE TYPE "PaymentMode" AS ENUM ('FREE', 'MANUAL', 'ONLINE');
CREATE TYPE "RegistrationStatus" AS ENUM ('SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED');

ALTER TABLE "Event"
  ADD COLUMN "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "registrationOpenAt" TIMESTAMP(3),
  ADD COLUMN "registrationCloseAt" TIMESTAMP(3),
  ADD COLUMN "registrationFee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "registrationCurrency" TEXT NOT NULL DEFAULT 'VND',
  ADD COLUMN "paymentMode" "PaymentMode" NOT NULL DEFAULT 'FREE';

ALTER TABLE "Athlete" ADD COLUMN "participantAccountId" TEXT;

CREATE TABLE "ParticipantAccount" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "phone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParticipantAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AthleteMedia" (
  "id" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "type" "AthleteMediaType" NOT NULL,
  "data" BYTEA NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AthleteMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventRegistration" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "athleteId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "federationId" TEXT,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "feeAmount" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "ticketCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParticipantAccount_email_key" ON "ParticipantAccount"("email");
CREATE INDEX "ParticipantAccount_isActive_idx" ON "ParticipantAccount"("isActive");
CREATE UNIQUE INDEX "Athlete_participantAccountId_key" ON "Athlete"("participantAccountId");
CREATE UNIQUE INDEX "AthleteMedia_athleteId_type_key" ON "AthleteMedia"("athleteId", "type");
CREATE INDEX "AthleteMedia_athleteId_idx" ON "AthleteMedia"("athleteId");
CREATE UNIQUE INDEX "EventRegistration_ticketCode_key" ON "EventRegistration"("ticketCode");
CREATE UNIQUE INDEX "EventRegistration_eventId_athleteId_categoryId_key" ON "EventRegistration"("eventId", "athleteId", "categoryId");
CREATE INDEX "EventRegistration_accountId_createdAt_idx" ON "EventRegistration"("accountId", "createdAt");
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId", "status");
CREATE INDEX "EventRegistration_categoryId_idx" ON "EventRegistration"("categoryId");

ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_participantAccountId_fkey" FOREIGN KEY ("participantAccountId") REFERENCES "ParticipantAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AthleteMedia" ADD CONSTRAINT "AthleteMedia_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ParticipantAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_federationId_fkey" FOREIGN KEY ("federationId") REFERENCES "Federation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
