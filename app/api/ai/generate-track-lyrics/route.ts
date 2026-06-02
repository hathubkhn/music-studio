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
    const isLongForm = perSongMin >= 5

    const durationHint = isLongForm
      ? `Write EXTENDED lyrics (~${perSongMin * 30}–${perSongMin * 40} lines). Include repeated choruses, multiple verses, a bridge, and instrumental cues like [Instrumental Break] to push the AI to generate a longer track.`
      : `Write concise, complete lyrics (~60–100 lines). Include all standard sections.`

    const prompt = `Write complete song lyrics for the following track.

Track: "${input.trackTitle}" (Track ${input.trackOrder})
Description: ${input.trackDescription || "Part of the album"}
Album theme: ${input.albumTheme}
Genre: ${input.albumGenre}
Mood: ${input.albumMood}
Language: ${input.language}

Requirements:
- Lyrics MUST be written entirely in ${input.language}
- Use standard song structure with section labels: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus], [Outro]
- ${durationHint}
- Lyrics should be heartfelt, poetic, and fit the mood/genre

Return a valid JSON object:
{
  "lyrics": "[Intro]\\nLyrics here...\\n\\n[Verse 1]\\n..."
}

IMPORTANT: Return ONLY the JSON object. The "lyrics" value must be the full lyrics as a single string with \\n line breaks.`

    const completion = await openai.chat.completions.create({
      model:           process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages:        [{ role: "user", content: prompt }],
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
