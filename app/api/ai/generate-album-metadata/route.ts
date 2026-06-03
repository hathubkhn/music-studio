import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import OpenAI from "openai"

export const maxDuration = 30

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const TrackSchema = z.object({
  order:    z.number(),
  title:    z.string(),
  duration: z.number().nullable().optional(), // seconds
})

const schema = z.object({
  albumTitle:  z.string(),
  theme:       z.string().optional().default(""),
  genre:       z.string().optional().default(""),
  mood:        z.string().optional().default(""),
  language:    z.string().optional().default("English"),
  brandName:   z.string().optional().default(""),
  channelUrl:  z.string().optional().default(""),
  tracks:      z.array(TrackSchema),
})

/** Format seconds → MM:SS */
function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const input = schema.parse(body)

    // Build tracklist with cumulative timestamps
    let cursor = 0
    const tracklist = input.tracks.map((t) => {
      const ts  = fmtTime(cursor)
      cursor   += t.duration ?? 270  // default 4.5 min if unknown
      return `${ts} ${t.title}`
    }).join("\n")

    const prompt = `You are a YouTube content manager for a music channel specialising in emotional, relaxing, and mood-based music.

Generate YouTube metadata for this album:
- Album title: ${input.albumTitle}
- Theme: ${input.theme || "emotional music"}
- Genre: ${input.genre || "ambient/pop"}
- Mood: ${input.mood || "melancholic"}
- Language: ${input.language}
- Channel/Brand name: ${input.brandName || input.albumTitle}

Tracklist (with timestamps):
${tracklist}

Return a JSON object with these exact keys:

{
  "youtubeTitle": "...",
  "description": "...",
  "hashtags": "..."
}

Rules for each field:

youtubeTitle:
- Format: "[Album Title] | [Emotional Hook] for [Occasion 1] & [Occasion 2]"
- Example: "Seasonal Mood | Cozy Sad Songs for Winter Nights & Rainy Autumn Evenings"
- Include 1-2 strong mood keywords and 1-2 specific occasions
- Max 100 characters

description:
Build exactly in this format (keep the --- dividers, preserve newlines as \\n):

[1–2 sentence emotional description of the album vibe, with 1-2 relevant emojis at the end]

Tracklist
${tracklist}

---

Welcome to ${input.brandName || input.albumTitle}.

[3–4 sentences describing what the channel creates and who it's for. Mention: emotional songs, relaxing sad music, soft piano ballads, cinematic melodies. Mention the target occasions: studying, journaling, sleeping, relaxing, healing, rainy days, winter nights, cold evenings, etc. — tailored to the album mood.]

Subscribe for more [mood adjective] songs 💭
${input.channelUrl ? `➡️ ${input.channelUrl}` : ""}

---

Playlist mood:
[12–18 SEO keyword phrases separated by commas, all lowercase, describing the music mood and occasions]

hashtags:
- 20–25 hashtags, each starting with #, separated by commas
- Include: album mood, genre, occasions, channel name (no spaces)
- Mix broad (#SadSongs) and specific (#WinterNightMusic)
- CamelCase each hashtag

IMPORTANT: Return ONLY the JSON object, no extra text.`

    const completion = await openai.chat.completions.create({
      model:           process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages:        [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    })

    const raw    = completion.choices[0].message.content ?? "{}"
    const parsed = JSON.parse(raw)

    return NextResponse.json({
      youtubeTitle: parsed.youtubeTitle ?? "",
      description:  parsed.description  ?? "",
      hashtags:     parsed.hashtags     ?? "",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate metadata"
    console.error("[generate-album-metadata]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
