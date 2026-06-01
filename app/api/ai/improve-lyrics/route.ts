import { NextRequest, NextResponse } from "next/server"
import { improveLyrics } from "@/lib/ai/generate"
import { z } from "zod"

const schema = z.object({
  lyrics: z.string().min(10),
  instruction: z.string().min(5),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { lyrics, instruction } = schema.parse(body)
    const improved = await improveLyrics(lyrics, instruction)
    return NextResponse.json({ lyrics: improved })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to improve lyrics"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
