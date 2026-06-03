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

    const perSongMin = input.targetDurationMin ?? 4

    // Target line count: ~15 lines/min of music is a good approximation
    const targetLines    = Math.max(80, perSongMin * 18)
    const targetLineMax  = targetLines + 40

    const prompt = `Write COMPLETE, FULL song lyrics for the following track. Do NOT truncate or summarise — write every single line.

Track: "${input.trackTitle}" (Track ${input.trackOrder})
Description: ${input.trackDescription || "Part of the album"}
Album theme: ${input.albumTheme}
Genre: ${input.albumGenre}
Mood: ${input.albumMood}
Language: ${input.language}
Target song duration: ~${perSongMin} minutes

Requirements:
- Lyrics MUST be written entirely in ${input.language}
- Target length: ${targetLines}–${targetLineMax} lyric lines (excluding blank lines and section labels)
- Use this full song structure with labels on their own line:
  [Intro] (4–8 lines)
  [Verse 1] (8–12 lines)
  [Pre-Chorus] (4–6 lines)
  [Chorus] (6–10 lines)
  [Verse 2] (8–12 lines)
  [Pre-Chorus] (4–6 lines)
  [Chorus] (6–10 lines)
  [Instrumental Break]
  [Bridge] (6–10 lines)
  [Chorus] (6–10 lines)
  [Chorus] (6–10 lines, slight variation)
  [Outro] (4–8 lines)
- Repeat the chorus at least 3 times with slight variations each time
- Every verse must have DIFFERENT lyrics (no copy-pasting)
- Lyrics should be heartfelt, poetic, vivid, and fit the mood/genre
- DO NOT add any commentary, explanation, or meta text — just the lyrics

Return a valid JSON object:
{
  "lyrics": "[Intro]\\nLine 1\\nLine 2\\n\\n[Verse 1]\\nLine 1\\n..."
}

IMPORTANT: Return ONLY the JSON object. Write the COMPLETE lyrics — do not stop early.`

    const completion = await openai.chat.completions.create({
      model:      process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages:   [{ role: "user", content: prompt }],
      max_tokens: 4096,
      response_format: { type: "json_object" },
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
