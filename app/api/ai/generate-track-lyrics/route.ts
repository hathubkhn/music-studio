import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import OpenAI from "openai"

export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const schema = z.object({
  trackTitle:       z.string(),
  trackOrder:       z.number(),
  trackDescription: z.string().optional().default(""),
  albumTheme:       z.string(),
  albumGenre:       z.string().optional().default("pop"),
  albumMood:        z.string().optional().default("uplifting"),
  language:         z.string().optional().default("English"),
  targetDurationMin:z.number().optional(),   // per-song target in minutes
})

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const input = schema.parse(body)

    // Suno song length is driven almost entirely by lyrics length.
    // ~60-70 lyric lines → 4-5 min song. Keep within this range.
    const TARGET_LINES = 65
    const MAX_LINES    = 72

    const prompt = `Write complete song lyrics for the following track.

Track: "${input.trackTitle}" (Track ${input.trackOrder})
Description: ${input.trackDescription || "Part of the album"}
Album theme: ${input.albumTheme}
Genre: ${input.albumGenre}
Mood: ${input.albumMood}
Language: ${input.language}
Target song duration: ~4–5 minutes

Requirements:
- Lyrics MUST be written entirely in ${input.language}
- Target exactly ${TARGET_LINES}–${MAX_LINES} lyric lines (count only actual lyric lines, NOT blank lines or section labels)
- Use this song structure with labels on their own line:
  [Intro] (4–6 lines)
  [Verse 1] (8–10 lines)
  [Pre-Chorus] (4 lines)
  [Chorus] (6–8 lines)
  [Verse 2] (8–10 lines)
  [Pre-Chorus] (4 lines)
  [Chorus] (6–8 lines)
  [Bridge] (6 lines)
  [Chorus] (6–8 lines, slight variation)
  [Outro] (3–4 lines)
- Repeat the chorus 3 times with slight variations
- Verse 1 and Verse 2 must have completely different lyrics
- Lyrics should be heartfelt, poetic, and fit the mood/genre
- STOP after the Outro — do not add extra sections

Return a valid JSON object:
{
  "lyrics": "[Intro]\\nLine 1\\nLine 2\\n\\n[Verse 1]\\nLine 1\\n..."
}

IMPORTANT: Return ONLY the JSON object. Keep total lyric lines between ${TARGET_LINES} and ${MAX_LINES}.`

    const completion = await openai.chat.completions.create({
      model:                   process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages:                [{ role: "user", content: prompt }],
      max_completion_tokens:   4096,
      response_format:         { type: "json_object" },
    })

    const raw  = completion.choices[0].message.content ?? "{}"
    const parsed = JSON.parse(raw)
    const lyrics = typeof parsed.lyrics === "string" ? parsed.lyrics : ""

    if (!lyrics.trim()) {
      return NextResponse.json({ error: "AI returned empty lyrics" }, { status: 500 })
    }

    return NextResponse.json({ lyrics })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate lyrics"
    console.error("[generate-track-lyrics]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
