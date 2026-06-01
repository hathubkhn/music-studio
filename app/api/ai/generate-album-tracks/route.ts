import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const schema = z.object({
  theme:      z.string(),
  genre:      z.string().optional().default("pop"),
  mood:       z.string().optional().default("uplifting"),
  language:   z.string().optional().default("English"),
  numTracks:  z.number().min(2).max(10).default(5),
  stylePrompt:z.string().optional().default(""),
  audience:   z.string().optional().default("general"),
})

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const input = schema.parse(body)

    const prompt = `You are a music album producer. Create a cohesive album of ${input.numTracks} songs.

Album concept:
- Theme: ${input.theme}
- Genre: ${input.genre}
- Mood: ${input.mood}
- Language: ${input.language}
- Style: ${input.stylePrompt || "not specified"}
- Target audience: ${input.audience}

Requirements for each song:
1. Unique title that fits the album theme
2. A short description (1-2 sentences) of what the song is about
3. Complete lyrics with proper song structure: [Intro], [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro]
4. Lyrics MUST be written in ${input.language}
5. Each song explores a different facet of the theme
6. Songs should feel like a cohesive album that tells a story when listened in order
7. Keep lyrics concise — target 80-150 lines per song (fits the ${input.numTracks > 5 ? "V4_5" : "V4_5"} model limit)

Return a valid JSON array with exactly ${input.numTracks} objects:
[
  {
    "order": 1,
    "title": "Song Title Here",
    "description": "What this song is about",
    "lyrics": "[Intro]\\nLyrics here...\\n\\n[Verse 1]\\n...",
    "stylePrompt": "${input.genre}, ${input.mood}, ${input.stylePrompt || "energetic"}"
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
