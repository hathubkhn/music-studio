import { NextRequest, NextResponse } from "next/server"
import { generateMusic } from "@/lib/kie/music"
import { z } from "zod"

const schema = z.object({
  title: z.string(),
  lyrics: z.string(),
  stylePrompt: z.string(),
  model: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    console.log(`[Suno Create] title="${input.title}" lyricsLen=${input.lyrics.length} styleLen=${input.stylePrompt?.length ?? 0}`)
    const result = await generateMusic({
      title:       input.title,
      lyrics:      input.lyrics,
      stylePrompt: input.stylePrompt,
      model:       input.model,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start music generation"
    console.error("[Suno Create] Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
