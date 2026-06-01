import { NextRequest, NextResponse } from "next/server"
import { generateImage } from "@/lib/kie/image"
import { z } from "zod"

const schema = z.object({
  prompt: z.string().min(5),
  negativePrompt: z.string().optional(),
  aspectRatio: z.string().optional().default("16:9"),
  model: z.string().optional(),
  sceneIndex: z.number().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    const result = await generateImage({
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      aspectRatio: input.aspectRatio,
      model: input.model,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start image generation"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
