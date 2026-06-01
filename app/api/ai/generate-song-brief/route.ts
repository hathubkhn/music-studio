import { NextRequest, NextResponse } from "next/server"
import { generateSongBrief } from "@/lib/ai/generate"
import { z } from "zod"

const schema = z.object({
  prompt: z.string().min(5),
  targetLanguage: z.string().default("en"),
  audience: z.string().default("General"),
  mood: z.string().default("Happy"),
  genre: z.string().default("Pop"),
  vocalPreference: z.string().default("Female Vocal"),
  durationTarget: z.string().default("2 minutes"),
  outputPurpose: z.string().default("YouTube Video"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    const brief = await generateSongBrief({
      ...input,
      language: input.targetLanguage,
    })
    return NextResponse.json(brief)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate song brief"
    const isAuthError = message.includes("401") || message.includes("Incorrect API key")
    return NextResponse.json(
      { error: isAuthError ? "Invalid OpenAI API key. Please check your .env file or enable MOCK_MODE=true." : message },
      { status: isAuthError ? 401 : 500 }
    )
  }
}
