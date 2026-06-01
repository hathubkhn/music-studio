import { NextRequest, NextResponse } from "next/server"
import { generateMusicCover } from "@/lib/kie/music"
import { z } from "zod"

const schema = z.object({
  uploadUrl:   z.string().url(),
  title:       z.string(),
  lyrics:      z.string(),
  stylePrompt: z.string().optional().default(""),
  model:       z.string().optional(),
  audioWeight: z.number().min(0).max(1).optional(),
  styleWeight: z.number().min(0).max(1).optional(),
  vocalGender: z.enum(["m", "f"]).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    console.log(`[Suno Cover] title="${input.title}" lyricsLen=${input.lyrics.length} uploadUrl="${input.uploadUrl?.slice(0,60)}"`)
    const result = await generateMusicCover(input)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start cover generation"
    console.error("[Suno Cover] Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
