import { NextRequest, NextResponse } from "next/server"
import { generateLyrics } from "@/lib/ai/generate"
import { z } from "zod"

const schema = z.object({
  brief: z.string(),
  title: z.string().optional(),
  language: z.string().default("en"),
  mood: z.string().default("Happy"),
  genre: z.string().default("Pop"),
  vocalStyle: z.string().default("Female Vocal"),
  durationTarget: z.string().default("2 minutes"),
  style: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    const lyrics = await generateLyrics({
      ...input,
      title: input.title || "Untitled",
    })
    return NextResponse.json(lyrics)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate lyrics"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
