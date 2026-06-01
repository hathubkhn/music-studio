import { NextRequest, NextResponse } from "next/server"
import { generateScenePrompts } from "@/lib/ai/generate"
import { z } from "zod"

const schema = z.object({
  title: z.string(),
  lyrics: z.string(),
  visualDirection: z.string().optional().default(""),
  aspectRatio: z.string().default("16:9"),
  audience: z.string().optional().default("General"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    const scenes = await generateScenePrompts(input)
    return NextResponse.json(scenes)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate scene prompts"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
