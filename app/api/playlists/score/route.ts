import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { scorePlaylist } from "@/lib/song-scoring/scoring-engine"
import type { GeneratedSong, ScoringContext } from "@/lib/song-scoring/types"

const songSchema = z.object({
  id: z.string(),
  title: z.string(),
  topic: z.string().default(""),
  genre: z.string().default("Pop"),
  mood: z.string().default("Emotional"),
  targetAudience: z.string().optional(),
  targetPlatform: z.enum(["youtube", "shorts", "tiktok", "spotify", "general"]).optional(),
  stylePrompt: z.string().optional(),
  melodyPrompt: z.string().optional(),
  lyrics: z.string().default(""),
  description: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  thumbnailPrompt: z.string().optional(),
  createdAt: z.string().default(new Date().toISOString()),
})

const schema = z.object({
  songs: z.array(songSchema).min(1),
  context: z.object({
    playlistTopic: z.string().default(""),
    genre: z.string().default("Pop"),
    mood: z.string().default("Emotional"),
    targetPlatform: z.enum(["youtube", "shorts", "tiktok", "spotify", "general"]).default("youtube"),
    targetAudience: z.string().optional(),
  }),
  playlistId: z.string().optional(),
  songType: z.string().default("album_track"),
  persist: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)

    const context = input.context as ScoringContext
    const result = scorePlaylist(input.songs as GeneratedSong[], context)

    if (input.playlistId) {
      result.playlistId = input.playlistId
    }

    if (input.persist) {
      // Persist each song's score record
      const upserts = result.rankedSongs.map((r) =>
        prisma.songScore.upsert({
          where: { id: `${r.songId}_score` },
          create: {
            id: `${r.songId}_score`,
            songId: r.songId,
            songType: input.songType,
            albumId: input.playlistId ?? null,
            totalScore: r.totalScore,
            rank: r.rank,
            recommendation: r.recommendation,
            bestUseCase: r.bestUseCase,
            categoryScores: r.categoryScores as object,
            strengths: r.strengths,
            weaknesses: r.weaknesses,
            suggestedImprovements: r.suggestedImprovements,
            suggestedPublishingOrderReason: r.suggestedPublishingOrderReason,
            scoringContext: context as object,
            scoringMode: "rule_based",
          },
          update: {
            totalScore: r.totalScore,
            rank: r.rank,
            recommendation: r.recommendation,
            bestUseCase: r.bestUseCase,
            categoryScores: r.categoryScores as object,
            strengths: r.strengths,
            weaknesses: r.weaknesses,
            suggestedImprovements: r.suggestedImprovements,
            suggestedPublishingOrderReason: r.suggestedPublishingOrderReason,
            scoringContext: context as object,
            scoringMode: "rule_based",
          },
        })
      )
      await prisma.$transaction(upserts)
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playlist scoring failed"
    console.error("[playlists/score]", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
