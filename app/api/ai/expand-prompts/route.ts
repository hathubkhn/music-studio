import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { expandImagePrompts } from "@/lib/ai/generate"

const schema = z.object({
  descriptions: z.array(z.string()).min(1).max(100),
  style: z.string().default(""),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { descriptions, style } = schema.parse(body)
    const prompts = await expandImagePrompts(descriptions, style)
    return NextResponse.json({ prompts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to expand prompts"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
