import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rewriteLyrics } from "@/lib/ai/generate"

const schema = z.object({
  originalLyrics:  z.string().min(1),
  targetLanguage:  z.string().min(1),
  adaptationStyle: z.enum(["translate", "adapt", "rewrite"]).default("adapt"),
  toneNotes:       z.string().optional().default(""),
  stylePrompt:     z.string().optional().default(""),
  audience:        z.string().optional().default(""),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    const lyrics = await rewriteLyrics(input)
    return NextResponse.json({ lyrics })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rewrite lyrics"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
