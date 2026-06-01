import { NextRequest, NextResponse } from "next/server"
import { generateVideo } from "@/lib/kie/video"
import { z } from "zod"

const schema = z.object({
  prompt: z.string().optional(),
  imageUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  model: z.string().optional(),
  duration: z.number().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    const result = await generateVideo(input)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start video generation"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
