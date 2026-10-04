CREATE TYPE "Permission" AS ENUM ('DRAW_PRECONFIGURE');
ALTER TABLE "User" ADD COLUMN "permissions" "Permission"[] NOT NULL DEFAULT ARRAY[]::"Permission"[];
CREATE TABLE "DrawPreconfiguration" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "drawType" "DrawType" NOT NULL,
  "pairs" JSONB NOT NULL,
  "options" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "inputVersion" TEXT,
  "slots" JSONB,
  "plan" JSONB,
  "previewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DrawPreconfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DrawPreconfiguration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DrawPreconfiguration_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DrawPreconfiguration_eventId_categoryId_drawType_key" ON "DrawPreconfiguration"("eventId", "categoryId", "drawType");
CREATE TABLE "DrawPreconfigurationHistory" (
  "id" TEXT NOT NULL,
  "configurationId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DrawPreconfigurationHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DrawPreconfigurationHistory_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "DrawPreconfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DrawPreconfigurationHistory_configurationId_createdAt_idx" ON "DrawPreconfigurationHistory"("configurationId", "createdAt");
