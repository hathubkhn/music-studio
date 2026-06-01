import { NextRequest, NextResponse } from "next/server"
import { getMusicStatus } from "@/lib/kie/music"

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }
  try {
    const result = await getMusicStatus(jobId)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get status"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
