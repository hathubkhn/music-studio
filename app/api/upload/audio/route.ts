import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { randomUUID } from "crypto"

const AUDIO_EXTENSIONS = ["mp3", "mp4", "wav", "m4a", "ogg", "flac", "aac", "webm"]
const MAX_SIZE_BYTES    = 200 * 1024 * 1024  // 200 MB (Kie.ai limit)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const ext = (file.name.split(".").pop() ?? "mp3").toLowerCase()
    if (!AUDIO_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported format: .${ext}. Allowed: ${AUDIO_EXTENSIONS.join(", ")}` },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large (max 200 MB)" }, { status: 400 })
    }

    // Use a UUID filename to avoid collisions / sanitise the original name
    const blobName = `audio-uploads/${randomUUID()}.${ext}`

    const blob = await put(blobName, file, {
      access:      "public",        // Kie.ai needs a publicly accessible URL
      contentType: file.type || `audio/${ext}`,
    })

    console.log(`[AudioUpload] ${file.name} (${(file.size / 1024).toFixed(0)} KB) → ${blob.url}`)

    return NextResponse.json({
      url:      blob.url,
      fileName: file.name,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed"
    console.error("[AudioUpload]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
