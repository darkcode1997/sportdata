CREATE TABLE "CmsNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT,
  "registrationId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CmsNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CmsNotification_userId_readAt_createdAt_idx"
  ON "CmsNotification"("userId", "readAt", "createdAt");
CREATE INDEX "CmsNotification_eventId_createdAt_idx"
  ON "CmsNotification"("eventId", "createdAt");
CREATE INDEX "CmsNotification_registrationId_idx"
  ON "CmsNotification"("registrationId");

ALTER TABLE "CmsNotification"
  ADD CONSTRAINT "CmsNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsNotification"
  ADD CONSTRAINT "CmsNotification_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsNotification"
  ADD CONSTRAINT "CmsNotification_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
