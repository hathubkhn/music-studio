import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const schema = z.object({
  theme:      z.string(),
  genre:      z.string().optional().default("pop"),
  mood:       z.string().optional().default("uplifting"),
  language:   z.string().optional().default("English"),
  numTracks:  z.number().min(2).max(20).default(5),
  targetDurationMin: z.number().optional(),
  stylePrompt:z.string().optional().default(""),
  audience:   z.string().optional().default("general"),
})

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const input = schema.parse(body)

    // Estimate per-song duration target
    const perSongMin = input.targetDurationMin
      ? Math.round(input.targetDurationMin / input.numTracks)
      : 4
    const isLongForm = perSongMin >= 4

    const durationHint = isLongForm
      ? `Each song should be LONG (${perSongMin}-${perSongMin + 2} minutes). Write EXTENDED lyrics with repeated choruses, multiple verses, a bridge, and instrumental cues like [Instrumental Break] to push the AI to generate a longer track.`
      : `Keep lyrics concise — target 80-120 lines per song.`

    const styleExtra = isLongForm
      ? `, slow tempo, extended arrangement, ${perSongMin}-${perSongMin + 2} minutes`
      : ""

    const prompt = `You are a music album producer. Create a cohesive album of ${input.numTracks} songs.

Album concept:
- Theme: ${input.theme}
- Genre: ${input.genre}
- Mood: ${input.mood}
- Language: ${input.language}
- Style: ${input.stylePrompt || "not specified"}
- Target audience: ${input.audience}
- Target total duration: ~${input.targetDurationMin ?? input.numTracks * 4} minutes

Requirements for each song:
1. Unique title that fits the album theme
2. A short description (1-2 sentences) of what the song is about
3. Complete lyrics with proper song structure: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus], [Outro]
4. Lyrics MUST be written in ${input.language}
5. Each song explores a different facet of the theme
6. Songs should feel like a cohesive album that tells a story when listened in order
7. ${durationHint}

Return a valid JSON array with exactly ${input.numTracks} objects:
[
  {
    "order": 1,
    "title": "Song Title Here",
    "description": "What this song is about",
    "lyrics": "[Intro]\\nLyrics here...\\n\\n[Verse 1]\\n...",
    "stylePrompt": "${input.genre}, ${input.mood}, ${input.stylePrompt || "cinematic"}${styleExtra}"
  }
]

IMPORTANT: Return ONLY the JSON array, no other text.`

    const completion = await openai.chat.completions.create({
      model:   process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages:[{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0].message.content ?? "{}"

    let tracks: unknown[]
    try {
      const parsed = JSON.parse(raw)
      // The model might wrap it in a key
      tracks = Array.isArray(parsed) ? parsed : (parsed.tracks ?? parsed.songs ?? Object.values(parsed)[0] ?? [])
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    return NextResponse.json({ tracks })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate album tracks"
    console.error("[generate-album-tracks]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
