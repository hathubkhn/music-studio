import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import OpenAI from "openai"

const schema = z.object({
  lyrics:          z.string().min(1),
  targetLanguage:  z.string().min(1),
  adaptationStyle: z.enum(["translate", "adapt", "rewrite"]).default("adapt"),
  stylePrompt:     z.string().optional().default(""),
  /** Estimated total song duration in seconds (used for timestamp distribution). */
  durationS:       z.number().optional().default(180),
})

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/** Parse "[Verse 1]\nline1\nline2\n\n[Chorus]\nline3\n..." into sections. */
function parseSections(lyrics: string) {
  const lines = lyrics.split("\n")
  const sections: { label: string; lines: string[] }[] = []
  let current: { label: string; lines: string[] } | null = null

  for (const line of lines) {
    const tagMatch = line.trim().match(/^\[(.+?)\]$/)
    if (tagMatch) {
      if (current) sections.push(current)
      current = { label: tagMatch[1], lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

/** Distribute total duration proportionally across sections by line count. */
function estimateTimestamps(
  sections: { label: string; lines: string[] }[],
  totalS: number,
) {
  const lineCounts = sections.map((s) => Math.max(s.lines.filter((l) => l.trim()).length, 1))
  const totalLines = lineCounts.reduce((a, b) => a + b, 0)

  const results: { label: string; startS: number; endS: number }[] = []
  let cursor = 0
  for (let i = 0; i < sections.length; i++) {
    const raw = (lineCounts[i] / totalLines) * totalS
    // Clamp to 6–60 s (replace-section constraint)
    const duration = Math.min(60, Math.max(6, Math.round(raw * 100) / 100))
    results.push({ label: sections[i].label, startS: Math.round(cursor * 100) / 100, endS: Math.round((cursor + duration) * 100) / 100 })
    cursor += duration
  }
  return results
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lyrics, targetLanguage, adaptationStyle, stylePrompt, durationS } = schema.parse(body)

    const styleHint = adaptationStyle === "translate"
      ? "Translate as literally as possible, keeping the same structure and meaning."
      : adaptationStyle === "adapt"
      ? "Adapt the lyrics so they sound natural and idiomatic in the target language, keeping the same emotional arc and structure."
      : "Write brand-new lyrics in the target language with the same vibe, structure, and emotional energy — but completely fresh wording."

    const systemPrompt = `You are a professional music lyricist and translator specialising in ${targetLanguage}.
${styleHint}
${stylePrompt ? `Musical style context: ${stylePrompt}` : ""}

RULES:
- Preserve section tags exactly as-is: [Verse 1], [Chorus], [Bridge], etc.
- Match syllable count and phrasing rhythm as closely as possible so the translated lyrics fit the original melody.
- Output ONLY the translated lyrics — no explanations, no commentary.`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Translate the following song lyrics to ${targetLanguage}:\n\n${lyrics}` },
      ],
      temperature: 0.7,
    })

    const translatedLyrics = response.choices[0].message.content?.trim() ?? ""

    // Parse both original and translated into sections + estimate timestamps
    const origSections = parseSections(lyrics)
    const transSections = parseSections(translatedLyrics)
    const timestamps = estimateTimestamps(origSections, durationS)

    const sections = origSections.map((orig, i) => ({
      label:          orig.label,
      originalText:   `[${orig.label}]\n${orig.lines.join("\n")}`,
      translatedText: transSections[i]
        ? `[${transSections[i].label}]\n${transSections[i].lines.join("\n")}`
        : `[${orig.label}]\n(translation missing)`,
      estimatedStartS: timestamps[i]?.startS ?? 0,
      estimatedEndS:   timestamps[i]?.endS   ?? 30,
    }))

    return NextResponse.json({ translatedLyrics, sections })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Translation failed"
    console.error("[TranslateLyrics]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
