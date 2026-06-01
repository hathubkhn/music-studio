import { NextRequest, NextResponse } from "next/server"
import { generateMashup } from "@/lib/kie/music"
import { z } from "zod"

const schema = z.object({
  uploadUrl:            z.string().url("Audio 1 must be a valid public URL"),
  uploadUrl2:           z.string().url("Audio 2 must be a valid public URL"),
  title:                z.string(),
  lyrics:               z.string(),
  stylePrompt:          z.string().optional().default(""),
  model:                z.string().optional(),
  audioWeight:          z.number().min(0).max(1).optional(),
  styleWeight:          z.number().min(0).max(1).optional(),
  weirdnessConstraint:  z.number().min(0).max(1).optional(),
  vocalGender:          z.enum(["m", "f"]).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    console.log(
      `[Suno Mashup] title="${input.title}" lyricsLen=${input.lyrics.length}`,
      `url1="${input.uploadUrl.slice(0, 60)}"`,
      `url2="${input.uploadUrl2.slice(0, 60)}"`,
    )
    const result = await generateMashup(input)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start mashup generation"
    console.error("[Suno Mashup] Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
