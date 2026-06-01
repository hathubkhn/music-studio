-- CreateEnum
CREATE TYPE "AlbumStatus" AS ENUM ('DRAFT', 'GENERATING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "genre" TEXT,
    "mood" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "stylePrompt" TEXT,
    "coverImageUrl" TEXT,
    "status" "AlbumStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumTrack" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "lyrics" TEXT,
    "stylePrompt" TEXT,
    "audioUrl" TEXT,
    "audioJobId" TEXT,
    "duration" DOUBLE PRECISION,
    "status" "TrackStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlbumTrack_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumTrack" ADD CONSTRAINT "AlbumTrack_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
