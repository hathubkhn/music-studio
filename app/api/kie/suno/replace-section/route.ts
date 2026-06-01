import { NextRequest, NextResponse } from "next/server"
import { replaceSection } from "@/lib/kie/music"
import { z } from "zod"

const schema = z.object({
  taskId:       z.string().min(1),
  audioId:      z.string().min(1),
  prompt:       z.string().min(1, "New lyrics are required"),
  tags:         z.string().min(1, "Style tags are required"),
  title:        z.string().min(1),
  negativeTags: z.string().optional(),
  infillStartS: z.number().min(0),
  infillEndS:   z.number().min(0),
  fullLyrics:   z.string().min(1),
}).refine(
  (d) => d.infillEndS > d.infillStartS,
  { message: "infillEndS must be greater than infillStartS" }
).refine(
  (d) => (d.infillEndS - d.infillStartS) >= 6,
  { message: "Segment must be at least 6 seconds" }
).refine(
  (d) => (d.infillEndS - d.infillStartS) <= 60,
  { message: "Segment cannot exceed 60 seconds" }
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    console.log(
      `[Suno ReplaceSection] taskId=${input.taskId} audioId=${input.audioId}`,
      `range=${input.infillStartS}–${input.infillEndS}s`,
      `promptLen=${input.prompt.length}`,
    )
    const result = await replaceSection(input)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start section replacement"
    console.error("[Suno ReplaceSection] Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
