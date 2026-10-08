-- File contents are no longer stored in PostgreSQL. No Bytes data is migrated.
-- Existing files must be uploaded again after this migration.
ALTER TABLE "Banner" ADD COLUMN "imageStorageKey" TEXT, DROP COLUMN "imageData";
ALTER TABLE "Sport" ADD COLUMN "logoStorageKey" TEXT, DROP COLUMN "logoData";
ALTER TABLE "Sport" ADD COLUMN "backgroundStorageKey" TEXT, DROP COLUMN "backgroundData";
ALTER TABLE "Event" ADD COLUMN "bannerStorageKey" TEXT, DROP COLUMN "bannerData";
ALTER TABLE "Event" ADD COLUMN "logoStorageKey" TEXT, DROP COLUMN "logoData";
ALTER TABLE "Event" ADD COLUMN "ticketBackgroundStorageKey" TEXT, DROP COLUMN "ticketBackgroundData";
ALTER TABLE "AthleteMedia" ADD COLUMN "storageKey" TEXT, DROP COLUMN "data";
ALTER TABLE "ParticipantMediaUpload" ADD COLUMN "storageKey" TEXT, DROP COLUMN "data";
ALTER TABLE "BackupUploadChunk" ADD COLUMN "storageKey" TEXT, DROP COLUMN "data";
