UPDATE "Athlete" AS athlete
SET
  "email" = COALESCE(athlete."email", account."email"),
  "phone" = COALESCE(athlete."phone", account."phone")
FROM "ParticipantAccount" AS account
WHERE athlete."participantAccountId" = account."id"
  AND (athlete."email" IS NULL OR athlete."phone" IS NULL);
