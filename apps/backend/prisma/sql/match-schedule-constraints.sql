CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Match_valid_time_range'
  ) THEN
    ALTER TABLE "Match"
      ADD CONSTRAINT "Match_valid_time_range"
      CHECK (
        "startTime" IS NULL
        OR "endTime" IS NULL
        OR "endTime" > "startTime"
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Match_fop_time_no_overlap'
  ) THEN
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
  END IF;
END
$$;
