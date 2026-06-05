import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rankSongsByPublishingPriority } from "@/lib/song-scoring/scoring-engine"

const schema = z.object({
  results: z.array(
    z.object({
      songId: z.string(),
      title: z.string(),
      totalScore: z.number(),
      rank: z.number(),
      recommendation: z.string(),
      categoryScores: z.record(z.string(), z.number()),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      suggestedImprovements: z.array(z.string()),
      bestUseCase: z.string(),
      suggestedPublishingOrderReason: z.string(),
    })
  ),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ranked = rankSongsByPublishingPriority(input.results as any)
    return NextResponse.json({ rankedSongs: ranked })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ranking failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
