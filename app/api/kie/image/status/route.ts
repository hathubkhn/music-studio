import { NextRequest, NextResponse } from "next/server"
import { getImageStatus } from "@/lib/kie/image"

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId")
  const sceneIndex = Number(req.nextUrl.searchParams.get("sceneIndex") || "0")
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }
  try {
    const result = await getImageStatus(jobId)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get status"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
