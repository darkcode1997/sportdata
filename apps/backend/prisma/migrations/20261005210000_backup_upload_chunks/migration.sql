CREATE TABLE "BackupUpload" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "totalSize" BIGINT NOT NULL,
  "receivedSize" BIGINT NOT NULL DEFAULT 0,
  "nextChunk" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'UPLOADING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BackupUpload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackupUploadChunk" (
  "uploadId" TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BackupUploadChunk_pkey" PRIMARY KEY ("uploadId", "index")
);

CREATE INDEX "BackupUpload_expiresAt_idx" ON "BackupUpload"("expiresAt");

ALTER TABLE "BackupUploadChunk"
  ADD CONSTRAINT "BackupUploadChunk_uploadId_fkey"
  FOREIGN KEY ("uploadId") REFERENCES "BackupUpload"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
