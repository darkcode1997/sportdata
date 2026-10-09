ALTER TABLE "ParticipantAccount"
  ADD COLUMN "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "marketingEvents" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "marketingArticles" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "marketingConsentAt" TIMESTAMP(3),
  ADD COLUMN "marketingUnsubscribedAt" TIMESTAMP(3),
  ADD COLUMN "marketingToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
CREATE UNIQUE INDEX "ParticipantAccount_marketingToken_key" ON "ParticipantAccount"("marketingToken");

CREATE TABLE "MarketingCampaign" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('EVENT', 'ARTICLE')),
  "sourceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "imageUrl" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MarketingCampaign_kind_sourceId_key" ON "MarketingCampaign"("kind", "sourceId");
CREATE INDEX "MarketingCampaign_createdAt_idx" ON "MarketingCampaign"("createdAt");

CREATE TABLE "MarketingDelivery" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "accountId" TEXT NOT NULL REFERENCES "ParticipantAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'RUNNING', 'SENT', 'SKIPPED', 'FAILED')),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockToken" TEXT,
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MarketingDelivery_campaignId_accountId_key" ON "MarketingDelivery"("campaignId", "accountId");
CREATE INDEX "MarketingDelivery_status_availableAt_idx" ON "MarketingDelivery"("status", "availableAt");
CREATE INDEX "MarketingDelivery_status_lockedAt_idx" ON "MarketingDelivery"("status", "lockedAt");
