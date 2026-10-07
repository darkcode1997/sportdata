CREATE TABLE "ParticipantMediaUpload" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "type" "AthleteMediaType" NOT NULL,
  "data" BYTEA NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParticipantMediaUpload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParticipantMediaUpload_tokenHash_key"
  ON "ParticipantMediaUpload"("tokenHash");

CREATE INDEX "ParticipantMediaUpload_expiresAt_idx"
  ON "ParticipantMediaUpload"("expiresAt");
