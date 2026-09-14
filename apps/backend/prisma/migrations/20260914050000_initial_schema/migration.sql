-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER', 'GAMES_ADMIN', 'SPORT_MANAGER', 'VENUE_OPERATOR', 'SCOREKEEPER', 'RESULT_APPROVER', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('HEAD_TO_HEAD', 'ROUND_ROBIN', 'HEAT', 'LANE', 'MULTI_PARTICIPANT', 'RELAY');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('INDIVIDUAL', 'TEAM', 'RELAY');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('REGISTERED', 'VERIFIED', 'WITHDRAWN', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'LOCKED');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'ENTERED', 'REFEREE_CONFIRMED', 'APPROVED', 'PUBLISHED', 'LOCKED');

-- CreateEnum
CREATE TYPE "HeatStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'FINISHED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WinMethod" AS ENUM ('POINTS', 'SUBMISSION', 'IPPON', 'KNOCKOUT', 'DISQUALIFICATION', 'WALKOVVER', 'DECISION', 'TECHNICAL');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('POOL', 'ELIMINATION', 'FINAL', 'SEMIFINAL', 'QUARTERFINAL', 'ROUND_OF_16', 'ROUND_OF_32', 'GROUP_STAGE', 'HEAT', 'QUALIFIER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'MIXED');

-- CreateEnum
CREATE TYPE "JiuJitsuDiscipline" AS ENUM ('NEWAZA', 'FIGHTING', 'CONTACT', 'FULL_CONTACT', 'DUO', 'SHOW');

-- CreateEnum
CREATE TYPE "UniformType" AS ENUM ('GI', 'NO_GI');

-- CreateEnum
CREATE TYPE "BeltLevel" AS ENUM ('WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK', 'OPEN');

-- CreateEnum
CREATE TYPE "DrawType" AS ENUM ('ROUND_ROBIN_POOL', 'MAIN_TREE', 'POOL_WINNER_TREE', 'REPECHAGE', 'DOUBLE_ELIMINATION');

-- CreateEnum
CREATE TYPE "BracketSide" AS ENUM ('ATHLETE1', 'ATHLETE2');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'READ', 'RESOLVED');

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flagUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Federation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Federation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetPasswordTokenHash" TEXT,
    "resetPasswordExpiresAt" TIMESTAMP(3),
    "resetPasswordRequestedAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "discipline" "JiuJitsuDiscipline",
    "uniform" "UniformType",
    "beltLevel" "BeltLevel",
    "matchDurationSeconds" INTEGER,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "minWeight" DOUBLE PRECISION,
    "maxWeight" DOUBLE PRECISION,
    "format" "CompetitionFormat" NOT NULL DEFAULT 'HEAD_TO_HEAD',
    "laneCount" INTEGER,
    "maxEntriesPerCountry" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "bannerUrl" TEXT,
    "logoUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birthDate" TIMESTAMP(3),
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "countryId" TEXT NOT NULL,
    "federationId" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "divisionId" TEXT,
    "drawId" TEXT,
    "matchNumber" INTEGER,
    "fop" TEXT,
    "fopId" TEXT,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "athlete1Id" TEXT,
    "athlete2Id" TEXT,
    "team1Id" TEXT,
    "team2Id" TEXT,
    "athlete1Score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "athlete2Score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "athlete1Advantages" INTEGER NOT NULL DEFAULT 0,
    "athlete2Advantages" INTEGER NOT NULL DEFAULT 0,
    "athlete1Penalties" INTEGER NOT NULL DEFAULT 0,
    "athlete2Penalties" INTEGER NOT NULL DEFAULT 0,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "matchType" "MatchType" NOT NULL DEFAULT 'ELIMINATION',
    "winnerId" TEXT,
    "winnerTeamId" TEXT,
    "winMethod" "WinMethod",
    "round" INTEGER,
    "bracketPosition" INTEGER,
    "winnerToMatchId" TEXT,
    "winnerToSide" "BracketSide",
    "loserToMatchId" TEXT,
    "loserToSide" "BracketSide",
    "pool" TEXT,
    "notes" TEXT,
    "sessionId" TEXT,
    "timeSlotId" TEXT,
    "scheduleLocked" BOOLEAN NOT NULL DEFAULT false,
    "scheduleLockedAt" TIMESTAMP(3),
    "scheduleLockedBy" TEXT,
    "scheduleLockReason" TEXT,
    "resultStatus" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "resultData" JSONB,
    "resultVersion" INTEGER NOT NULL DEFAULT 0,
    "resultEnteredAt" TIMESTAMP(3),
    "resultEnteredBy" TEXT,
    "refereeConfirmedAt" TIMESTAMP(3),
    "refereeConfirmedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "resultPublishedAt" TIMESTAMP(3),
    "resultPublishedBy" TEXT,
    "resultLockedAt" TIMESTAMP(3),
    "resultLockedBy" TEXT,
    "roundRobinGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draw" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DrawType" NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "divisionId" TEXT,
    "poolNumber" INTEGER,
    "bracketSize" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "venueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionSession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "sportId" TEXT,
    "name" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fopId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportSchedulingRule" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "matchDurationMinutes" INTEGER NOT NULL DEFAULT 10,
    "turnaroundMinutes" INTEGER NOT NULL DEFAULT 5,
    "minRestMinutes" INTEGER NOT NULL DEFAULT 60,
    "earliestStart" TEXT NOT NULL DEFAULT '08:00',
    "latestEnd" TEXT NOT NULL DEFAULT '22:00',
    "preferredStart" TEXT,
    "preferredEnd" TEXT,
    "outdoor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportSchedulingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "gender" "Gender",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "role" TEXT,
    "relayLeg" INTEGER,
    "isReserve" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'REGISTERED',
    "athleteId" TEXT,
    "teamId" TEXT,
    "seed" INTEGER,
    "bib" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "entryId" TEXT,
    "athleteId" TEXT,
    "teamId" TEXT,
    "lane" INTEGER,
    "position" INTEGER,
    "score" JSONB,
    "rank" INTEGER,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Heat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "status" "HeatStatus" NOT NULL DEFAULT 'DRAFT',
    "startTime" TIMESTAMP(3),
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Heat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeatLane" (
    "id" TEXT NOT NULL,
    "heatId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "athleteId" TEXT,
    "lane" INTEGER NOT NULL,
    "result" JSONB,
    "rank" INTEGER,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeatLane_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundRobinGroup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundRobinGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundRobinGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "seed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundRobinGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultRevision" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ResultStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "method" TEXT,
    "path" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statistic" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "eventId" TEXT,
    "sportId" TEXT NOT NULL,
    "categoryId" TEXT,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalLosses" INTEGER NOT NULL DEFAULT 0,
    "totalDraws" INTEGER NOT NULL DEFAULT 0,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "goldMedals" INTEGER NOT NULL DEFAULT 0,
    "silverMedals" INTEGER NOT NULL DEFAULT 0,
    "bronzeMedals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Statistic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VenueSports" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CategoryToEvent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_EventSports" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_EventVenues" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AthleteToEvent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AthleteToCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_DrawFops" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Federation_countryId_idx" ON "Federation"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetPasswordTokenHash_key" ON "User"("resetPasswordTokenHash");

-- CreateIndex
CREATE INDEX "User_isActive_role_idx" ON "User"("isActive", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_isPublished_publishedAt_idx" ON "Article"("isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_isPublished_isFeatured_publishedAt_idx" ON "Article"("isPublished", "isFeatured", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_createdAt_idx" ON "Article"("createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_email_idx" ON "ContactMessage"("email");

-- CreateIndex
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_code_key" ON "Sport"("code");

-- CreateIndex
CREATE INDEX "Category_sportId_idx" ON "Category"("sportId");

-- CreateIndex
CREATE INDEX "Division_categoryId_idx" ON "Division"("categoryId");

-- CreateIndex
CREATE INDEX "Event_sportId_idx" ON "Event"("sportId");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE INDEX "Athlete_countryId_idx" ON "Athlete"("countryId");

-- CreateIndex
CREATE INDEX "Athlete_federationId_idx" ON "Athlete"("federationId");

-- CreateIndex
CREATE INDEX "Athlete_fullName_idx" ON "Athlete"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Match_timeSlotId_key" ON "Match"("timeSlotId");

-- CreateIndex
CREATE INDEX "Match_eventId_idx" ON "Match"("eventId");

-- CreateIndex
CREATE INDEX "Match_eventId_matchDate_idx" ON "Match"("eventId", "matchDate");

-- CreateIndex
CREATE INDEX "Match_eventId_status_idx" ON "Match"("eventId", "status");

-- CreateIndex
CREATE INDEX "Match_categoryId_idx" ON "Match"("categoryId");

-- CreateIndex
CREATE INDEX "Match_drawId_idx" ON "Match"("drawId");

-- CreateIndex
CREATE INDEX "Match_fopId_idx" ON "Match"("fopId");

-- CreateIndex
CREATE INDEX "Match_fopId_startTime_idx" ON "Match"("fopId", "startTime");

-- CreateIndex
CREATE INDEX "Match_winnerToMatchId_idx" ON "Match"("winnerToMatchId");

-- CreateIndex
CREATE INDEX "Match_loserToMatchId_idx" ON "Match"("loserToMatchId");

-- CreateIndex
CREATE INDEX "Match_matchDate_idx" ON "Match"("matchDate");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_athlete1Id_idx" ON "Match"("athlete1Id");

-- CreateIndex
CREATE INDEX "Match_athlete2Id_idx" ON "Match"("athlete2Id");

-- CreateIndex
CREATE INDEX "Match_team1Id_idx" ON "Match"("team1Id");

-- CreateIndex
CREATE INDEX "Match_team2Id_idx" ON "Match"("team2Id");

-- CreateIndex
CREATE INDEX "Match_winnerTeamId_idx" ON "Match"("winnerTeamId");

-- CreateIndex
CREATE INDEX "Match_sessionId_startTime_idx" ON "Match"("sessionId", "startTime");

-- CreateIndex
CREATE INDEX "Match_resultStatus_idx" ON "Match"("resultStatus");

-- CreateIndex
CREATE INDEX "Match_roundRobinGroupId_idx" ON "Match"("roundRobinGroupId");

-- CreateIndex
CREATE INDEX "Draw_eventId_categoryId_idx" ON "Draw"("eventId", "categoryId");

-- CreateIndex
CREATE INDEX "Draw_divisionId_idx" ON "Draw"("divisionId");

-- CreateIndex
CREATE UNIQUE INDEX "Draw_eventId_categoryId_name_key" ON "Draw"("eventId", "categoryId", "name");

-- CreateIndex
CREATE INDEX "Fop_eventId_idx" ON "Fop"("eventId");

-- CreateIndex
CREATE INDEX "Fop_venueId_idx" ON "Fop"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "Fop_eventId_name_key" ON "Fop"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_code_key" ON "Venue"("code");

-- CreateIndex
CREATE INDEX "Venue_isActive_idx" ON "Venue"("isActive");

-- CreateIndex
CREATE INDEX "CompetitionSession_eventId_startTime_idx" ON "CompetitionSession"("eventId", "startTime");

-- CreateIndex
CREATE INDEX "CompetitionSession_venueId_startTime_idx" ON "CompetitionSession"("venueId", "startTime");

-- CreateIndex
CREATE INDEX "CompetitionSession_sportId_startTime_idx" ON "CompetitionSession"("sportId", "startTime");

-- CreateIndex
CREATE INDEX "TimeSlot_sessionId_startTime_idx" ON "TimeSlot"("sessionId", "startTime");

-- CreateIndex
CREATE INDEX "TimeSlot_fopId_startTime_idx" ON "TimeSlot"("fopId", "startTime");

-- CreateIndex
CREATE INDEX "SportSchedulingRule_sportId_idx" ON "SportSchedulingRule"("sportId");

-- CreateIndex
CREATE UNIQUE INDEX "SportSchedulingRule_eventId_sportId_key" ON "SportSchedulingRule"("eventId", "sportId");

-- CreateIndex
CREATE INDEX "Team_eventId_sportId_idx" ON "Team"("eventId", "sportId");

-- CreateIndex
CREATE INDEX "Team_countryId_idx" ON "Team"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_eventId_sportId_countryId_name_key" ON "Team"("eventId", "sportId", "countryId", "name");

-- CreateIndex
CREATE INDEX "TeamMember_athleteId_idx" ON "TeamMember"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_athleteId_key" ON "TeamMember"("teamId", "athleteId");

-- CreateIndex
CREATE INDEX "CompetitionEntry_eventId_categoryId_status_idx" ON "CompetitionEntry"("eventId", "categoryId", "status");

-- CreateIndex
CREATE INDEX "CompetitionEntry_countryId_idx" ON "CompetitionEntry"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEntry_eventId_categoryId_athleteId_key" ON "CompetitionEntry"("eventId", "categoryId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEntry_eventId_categoryId_teamId_key" ON "CompetitionEntry"("eventId", "categoryId", "teamId");

-- CreateIndex
CREATE INDEX "MatchParticipant_athleteId_idx" ON "MatchParticipant"("athleteId");

-- CreateIndex
CREATE INDEX "MatchParticipant_teamId_idx" ON "MatchParticipant"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_entryId_key" ON "MatchParticipant"("matchId", "entryId");

-- CreateIndex
CREATE UNIQUE INDEX "Heat_matchId_key" ON "Heat"("matchId");

-- CreateIndex
CREATE INDEX "Heat_eventId_startTime_idx" ON "Heat"("eventId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Heat_eventId_categoryId_round_sequence_key" ON "Heat"("eventId", "categoryId", "round", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "HeatLane_heatId_lane_key" ON "HeatLane"("heatId", "lane");

-- CreateIndex
CREATE UNIQUE INDEX "HeatLane_heatId_entryId_key" ON "HeatLane"("heatId", "entryId");

-- CreateIndex
CREATE INDEX "RoundRobinGroup_eventId_categoryId_idx" ON "RoundRobinGroup"("eventId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundRobinGroup_eventId_categoryId_name_key" ON "RoundRobinGroup"("eventId", "categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RoundRobinGroupMember_groupId_entryId_key" ON "RoundRobinGroupMember"("groupId", "entryId");

-- CreateIndex
CREATE INDEX "ResultRevision_matchId_createdAt_idx" ON "ResultRevision"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "ResultRevision_actorUserId_idx" ON "ResultRevision"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultRevision_matchId_version_key" ON "ResultRevision"("matchId", "version");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Statistic_athleteId_idx" ON "Statistic"("athleteId");

-- CreateIndex
CREATE INDEX "Statistic_eventId_idx" ON "Statistic"("eventId");

-- CreateIndex
CREATE INDEX "Statistic_sportId_idx" ON "Statistic"("sportId");

-- CreateIndex
CREATE UNIQUE INDEX "Statistic_athleteId_eventId_sportId_key" ON "Statistic"("athleteId", "eventId", "sportId");

-- CreateIndex
CREATE UNIQUE INDEX "_VenueSports_AB_unique" ON "_VenueSports"("A", "B");

-- CreateIndex
CREATE INDEX "_VenueSports_B_index" ON "_VenueSports"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToEvent_AB_unique" ON "_CategoryToEvent"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToEvent_B_index" ON "_CategoryToEvent"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EventSports_AB_unique" ON "_EventSports"("A", "B");

-- CreateIndex
CREATE INDEX "_EventSports_B_index" ON "_EventSports"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_EventVenues_AB_unique" ON "_EventVenues"("A", "B");

-- CreateIndex
CREATE INDEX "_EventVenues_B_index" ON "_EventVenues"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AthleteToEvent_AB_unique" ON "_AthleteToEvent"("A", "B");

-- CreateIndex
CREATE INDEX "_AthleteToEvent_B_index" ON "_AthleteToEvent"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AthleteToCategory_AB_unique" ON "_AthleteToCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_AthleteToCategory_B_index" ON "_AthleteToCategory"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DrawFops_AB_unique" ON "_DrawFops"("A", "B");

-- CreateIndex
CREATE INDEX "_DrawFops_B_index" ON "_DrawFops"("B");

-- AddForeignKey
ALTER TABLE "Federation" ADD CONSTRAINT "Federation_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_federationId_fkey" FOREIGN KEY ("federationId") REFERENCES "Federation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_fopId_fkey" FOREIGN KEY ("fopId") REFERENCES "Fop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_athlete1Id_fkey" FOREIGN KEY ("athlete1Id") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_athlete2Id_fkey" FOREIGN KEY ("athlete2Id") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerToMatchId_fkey" FOREIGN KEY ("winnerToMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_loserToMatchId_fkey" FOREIGN KEY ("loserToMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CompetitionSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundRobinGroupId_fkey" FOREIGN KEY ("roundRobinGroupId") REFERENCES "RoundRobinGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fop" ADD CONSTRAINT "Fop_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fop" ADD CONSTRAINT "Fop_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSession" ADD CONSTRAINT "CompetitionSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSession" ADD CONSTRAINT "CompetitionSession_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSession" ADD CONSTRAINT "CompetitionSession_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CompetitionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_fopId_fkey" FOREIGN KEY ("fopId") REFERENCES "Fop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportSchedulingRule" ADD CONSTRAINT "SportSchedulingRule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportSchedulingRule" ADD CONSTRAINT "SportSchedulingRule_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CompetitionEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heat" ADD CONSTRAINT "Heat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heat" ADD CONSTRAINT "Heat_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heat" ADD CONSTRAINT "Heat_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeatLane" ADD CONSTRAINT "HeatLane_heatId_fkey" FOREIGN KEY ("heatId") REFERENCES "Heat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeatLane" ADD CONSTRAINT "HeatLane_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CompetitionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeatLane" ADD CONSTRAINT "HeatLane_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundRobinGroup" ADD CONSTRAINT "RoundRobinGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundRobinGroup" ADD CONSTRAINT "RoundRobinGroup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundRobinGroupMember" ADD CONSTRAINT "RoundRobinGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RoundRobinGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundRobinGroupMember" ADD CONSTRAINT "RoundRobinGroupMember_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CompetitionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultRevision" ADD CONSTRAINT "ResultRevision_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statistic" ADD CONSTRAINT "Statistic_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statistic" ADD CONSTRAINT "Statistic_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statistic" ADD CONSTRAINT "Statistic_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VenueSports" ADD CONSTRAINT "_VenueSports_A_fkey" FOREIGN KEY ("A") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VenueSports" ADD CONSTRAINT "_VenueSports_B_fkey" FOREIGN KEY ("B") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToEvent" ADD CONSTRAINT "_CategoryToEvent_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToEvent" ADD CONSTRAINT "_CategoryToEvent_B_fkey" FOREIGN KEY ("B") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventSports" ADD CONSTRAINT "_EventSports_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventSports" ADD CONSTRAINT "_EventSports_B_fkey" FOREIGN KEY ("B") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventVenues" ADD CONSTRAINT "_EventVenues_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventVenues" ADD CONSTRAINT "_EventVenues_B_fkey" FOREIGN KEY ("B") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AthleteToEvent" ADD CONSTRAINT "_AthleteToEvent_A_fkey" FOREIGN KEY ("A") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AthleteToEvent" ADD CONSTRAINT "_AthleteToEvent_B_fkey" FOREIGN KEY ("B") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AthleteToCategory" ADD CONSTRAINT "_AthleteToCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AthleteToCategory" ADD CONSTRAINT "_AthleteToCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DrawFops" ADD CONSTRAINT "_DrawFops_A_fkey" FOREIGN KEY ("A") REFERENCES "Draw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DrawFops" ADD CONSTRAINT "_DrawFops_B_fkey" FOREIGN KEY ("B") REFERENCES "Fop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
