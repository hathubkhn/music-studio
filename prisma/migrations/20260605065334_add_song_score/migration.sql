-- CreateTable
CREATE TABLE "SongScore" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "songType" TEXT NOT NULL DEFAULT 'album_track',
    "albumId" TEXT,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "recommendation" TEXT NOT NULL,
    "bestUseCase" TEXT NOT NULL,
    "categoryScores" JSONB NOT NULL,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "weaknesses" JSONB NOT NULL DEFAULT '[]',
    "suggestedImprovements" JSONB NOT NULL DEFAULT '[]',
    "suggestedPublishingOrderReason" TEXT,
    "scoringContext" JSONB NOT NULL,
    "scoringMode" TEXT NOT NULL DEFAULT 'rule_based',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongScore_pkey" PRIMARY KEY ("id")
);
