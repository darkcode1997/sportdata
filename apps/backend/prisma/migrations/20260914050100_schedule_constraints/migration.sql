CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_valid_time_range"
  CHECK (
    "startTime" IS NULL
    OR "endTime" IS NULL
    OR "endTime" > "startTime"
  );

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_fop_time_no_overlap"
  EXCLUDE USING gist (
    "fopId" WITH =,
    tsrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE (
    "fopId" IS NOT NULL
    AND "startTime" IS NOT NULL
    AND "endTime" IS NOT NULL
    AND "status" <> 'CANCELLED'::"MatchStatus"
  );

ALTER TABLE "CompetitionSession"
  ADD CONSTRAINT "CompetitionSession_valid_time_range"
  CHECK ("endTime" > "startTime");

ALTER TABLE "TimeSlot"
  ADD CONSTRAINT "TimeSlot_valid_time_range"
  CHECK ("endTime" > "startTime");

ALTER TABLE "TimeSlot"
  ADD CONSTRAINT "TimeSlot_fop_time_no_overlap"
  EXCLUDE USING gist (
    "fopId" WITH =,
    tsrange("startTime", "endTime", '[)') WITH &&
  );
