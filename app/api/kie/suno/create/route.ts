import { NextRequest, NextResponse } from "next/server"
import { generateMusic } from "@/lib/kie/music"
import { z } from "zod"

// Max lyric lines sent to Suno — keeps song duration around 4-5 min.
// Suno length scales almost linearly with lyrics line count.
const MAX_LYRIC_LINES = 75

function trimLyrics(raw: string): string {
  const lines   = raw.split("\n")
  let lyricCount = 0
  const result: string[] = []
  for (const line of lines) {
    result.push(line)
    const trimmed = line.trim()
    // Count non-empty, non-section-label lines as lyric lines
    if (trimmed && !/^\[.*\]$/.test(trimmed)) lyricCount++
    if (lyricCount >= MAX_LYRIC_LINES) break
  }
  return result.join("\n")
}

const schema = z.object({
  title: z.string(),
  lyrics: z.string(),
  stylePrompt: z.string().optional().default(""),
  model: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    const lyrics = trimLyrics(input.lyrics)
    const lyricLines = lyrics.split("\n").filter((l) => l.trim() && !/^\[.*\]$/.test(l.trim())).length
    console.log(`[Suno Create] title="${input.title}" lyricsLen=${input.lyrics.length}→${lyrics.length} lyricLines=${lyricLines} styleLen=${input.stylePrompt?.length ?? 0}`)
    const result = await generateMusic({
      title:       input.title,
      lyrics,
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
