ALTER TABLE "Event"
ADD COLUMN "bannerData" BYTEA,
ADD COLUMN "bannerMimeType" TEXT,
ADD COLUMN "bannerSize" INTEGER,
ADD COLUMN "logoData" BYTEA,
ADD COLUMN "logoMimeType" TEXT,
ADD COLUMN "logoSize" INTEGER;
