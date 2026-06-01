import { NextRequest, NextResponse } from "next/server"
// In @vercel/blob v2, handleUpload lives in @vercel/blob/client (used server-side as token issuer)
import { handleUpload } from "@vercel/blob/client"

const ALLOWED_TYPES = [
  "audio/mpeg", "audio/mp3",
  "audio/mp4", "audio/x-m4a",
  "audio/wav", "audio/x-wav",
  "audio/ogg", "audio/vorbis",
  "audio/flac", "audio/x-flac",
  "audio/aac", "audio/x-aac",
  "audio/webm",
]

/**
 * Handles two kinds of requests from @vercel/blob/client `upload()`:
 *   1. Token request — client asks for a signed upload URL (tiny JSON, no file bytes here)
 *   2. Completion callback — Vercel Blob notifies us the upload finished
 *
 * The actual file bytes travel DIRECTLY from the browser to Vercel Blob's edge —
 * they never pass through this function, so the 4.5 MB Vercel limit is irrelevant.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const response = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname: string) => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes:  200 * 1024 * 1024,
      }),
      onUploadCompleted: async ({ blob }: { blob: { url: string } }) => {
        console.log(`[AudioUpload] Completed → ${blob.url}`)
      },
    })

    return NextResponse.json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed"
    console.error("[AudioUpload]", message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
