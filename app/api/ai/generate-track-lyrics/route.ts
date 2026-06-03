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
  albumStyle:       z.string().optional().default(""),   // album common style prompt
  language:         z.string().optional().default("English"),
  targetDurationMin:z.number().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const input = schema.parse(body)

    // ~60-70 lyric lines → 4-5 min Suno song
    const TARGET_LINES = 65
    const MAX_LINES    = 72

    const styleHint = input.albumStyle
      ? `\nMusical style / atmosphere: ${input.albumStyle}`
      : ""

    const prompt = `You are a professional pop songwriter. Write an original song for the following track.

Track: "${input.trackTitle}" (Track ${input.trackOrder})
Description: ${input.trackDescription || "Part of the album"}
Album theme: ${input.albumTheme}
Genre: ${input.albumGenre}
Mood: ${input.albumMood}${styleHint}
Language: ${input.language}

---

WRITING RULES — follow these strictly:

1. Language & tone:
   - Use simple, natural, everyday ${input.language}. Write the way people actually talk.
   - Lyrics must be easy and natural to sing — NOT like a poem.
   - Use short lines: 6–10 words per line maximum.
   - Avoid complex metaphors, overly literary phrases, or long sentences.
   - Avoid formal or unusual words (e.g. "resentment," "refrain," "constellations," "essential," "forgiveness train").

2. Emotional imagery — use clear, relatable images like:
   rain on the window, an empty room, old photos, late nights, silence, a cold cup of coffee,
   city lights, walking alone, a phone screen, familiar streets, a jacket left behind.

3. Chorus:
   - Make the chorus the emotional core of the song.
   - It must be memorable, easy to sing along to, and repeat a clear emotional idea.
   - Keep the chorus hook to 6–8 lines. Use repetition and simple rhymes.

4. Verses:
   - Verse 1 and Verse 2 must have completely different lyrics.
   - Tell a small story or paint a scene in each verse.

5. Rhyme & flow:
   - Use simple, natural rhymes (ABAB or AABB). Don't force rhymes that sound unnatural.
   - Avoid filler lines just to rhyme — every line should carry meaning.

6. Length: exactly ${TARGET_LINES}–${MAX_LINES} lyric lines total (do NOT count blank lines or section labels).

---

STRUCTURE — use exactly these labels on their own line:

[Intro] (3–4 lines)
[Verse 1] (8–10 lines)
[Pre-Chorus] (4 lines)
[Chorus] (6–8 lines)
[Verse 2] (8–10 lines)
[Pre-Chorus] (4 lines)
[Chorus] (6–8 lines, same or slight variation)
[Bridge] (5–6 lines, shift perspective or emotion)
[Final Chorus] (6–8 lines, stronger or slightly varied from main chorus)
[Outro] (3–4 lines, quiet fade-out feeling)

---

Return a JSON object:
{
  "lyrics": "[Intro]\\nLine 1\\nLine 2\\n\\n[Verse 1]\\nLine 1\\n..."
}

IMPORTANT: Return ONLY the JSON. Write all lyrics in ${input.language}. Keep total lyric lines between ${TARGET_LINES} and ${MAX_LINES}.`

    const completion = await openai.chat.completions.create({
      model:    process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    })

    const raw = completion.choices[0].message.content ?? ""
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      const plainLyrics = raw.trim()
      if (!plainLyrics) return NextResponse.json({ error: "AI returned empty lyrics" }, { status: 500 })
      return NextResponse.json({ lyrics: plainLyrics })
    }

    let lyrics = ""
    try {
      const parsed = JSON.parse(jsonMatch[0])
      lyrics = typeof parsed.lyrics === "string" ? parsed.lyrics : raw.trim()
    } catch {
      lyrics = raw.trim()
    }

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
