CREATE TYPE "TicketEmailJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SENT', 'SKIPPED', 'FAILED');

CREATE TABLE "TicketEmailJob" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "ticketCode" TEXT,
    "referenceCode" TEXT,
    "status" "TicketEmailJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TicketEmailJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TicketEmailJob_target_check" CHECK (("ticketCode" IS NOT NULL) <> ("referenceCode" IS NOT NULL))
);

CREATE INDEX "TicketEmailJob_status_availableAt_idx" ON "TicketEmailJob"("status", "availableAt");
CREATE INDEX "TicketEmailJob_status_lockedAt_idx" ON "TicketEmailJob"("status", "lockedAt");
