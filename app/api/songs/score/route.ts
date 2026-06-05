import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { scoreSong, scoreSongWithAI } from "@/lib/song-scoring/scoring-engine"
import type { GeneratedSong, ScoringContext } from "@/lib/song-scoring/types"

const schema = z.object({
  song: z.object({
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
  }),
  context: z.object({
    playlistTopic: z.string().default(""),
    genre: z.string().default("Pop"),
    mood: z.string().default("Emotional"),
    targetPlatform: z.enum(["youtube", "shorts", "tiktok", "spotify", "general"]).default("youtube"),
    targetAudience: z.string().optional(),
  }),
  mode: z.enum(["rule_based", "llm"]).default("rule_based"),
  albumId: z.string().optional(),
  songType: z.string().default("album_track"),
  persist: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)

    const song = input.song as GeneratedSong
    const context = input.context as ScoringContext

    let result
    if (input.mode === "llm") {
      result = await scoreSongWithAI(song, context)
    } else {
      result = scoreSong(song, context)
    }

    if (input.persist) {
      await prisma.songScore.upsert({
        where: {
          // unique by songId + albumId combo — if no prior score exists, create
          id: `${song.id}_score`,
        },
        create: {
          id: `${song.id}_score`,
          songId: song.id,
          songType: input.songType,
          albumId: input.albumId ?? null,
          totalScore: result.totalScore,
          rank: result.rank,
          recommendation: result.recommendation,
          bestUseCase: result.bestUseCase,
          categoryScores: result.categoryScores as object,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          suggestedImprovements: result.suggestedImprovements,
          suggestedPublishingOrderReason: result.suggestedPublishingOrderReason,
          scoringContext: context as object,
          scoringMode: input.mode,
        },
        update: {
          totalScore: result.totalScore,
          rank: result.rank,
          recommendation: result.recommendation,
          bestUseCase: result.bestUseCase,
          categoryScores: result.categoryScores as object,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          suggestedImprovements: result.suggestedImprovements,
          suggestedPublishingOrderReason: result.suggestedPublishingOrderReason,
          scoringContext: context as object,
          scoringMode: input.mode,
        },
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scoring failed"
    console.error("[songs/score]", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
