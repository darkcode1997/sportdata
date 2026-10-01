ALTER TABLE "Event"
ADD COLUMN "ticketBackgroundData" BYTEA,
ADD COLUMN "ticketBackgroundMimeType" TEXT,
ADD COLUMN "ticketBackgroundSize" INTEGER;
