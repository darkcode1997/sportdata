-- AlterTable
ALTER TABLE "Sport"
ADD COLUMN "displayName" TEXT,
ADD COLUMN "subtitle" TEXT,
ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "backgroundData" BYTEA,
ADD COLUMN "backgroundMimeType" TEXT,
ADD COLUMN "backgroundSize" INTEGER;

-- CreateIndex
CREATE INDEX "Sport_isVisible_sortOrder_idx" ON "Sport"("isVisible", "sortOrder");
