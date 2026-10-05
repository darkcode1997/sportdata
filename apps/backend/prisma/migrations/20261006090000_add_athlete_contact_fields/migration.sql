ALTER TABLE "Athlete"
ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT;

CREATE INDEX "Athlete_email_idx" ON "Athlete"("email");
