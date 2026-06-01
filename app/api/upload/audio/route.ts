import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import os from "os"
import { randomUUID } from "crypto"

const TEMP_DIR = path.join(os.tmpdir(), "music-studio-uploads")

const AUDIO_EXTENSIONS = ["mp3", "mp4", "wav", "m4a", "ogg", "flac", "aac", "webm"]

export async function POST(req: NextRequest) {
  try {
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate extension
    const originalExt = (file.name.split(".").pop() || "mp3").toLowerCase()
    if (!AUDIO_EXTENSIONS.includes(originalExt)) {
      return NextResponse.json(
        { error: `Unsupported format: .${originalExt}. Use: ${AUDIO_EXTENSIONS.join(", ")}` },
        { status: 400 }
      )
    }

    // Max 50 MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50 MB)" }, { status: 400 })
    }

    const fileId   = randomUUID()
    const fileName = `${fileId}.${originalExt}`
    const filePath = path.join(TEMP_DIR, fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Build the public URL based on the app's base URL
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const publicUrl = `${appUrl}/api/upload/audio/${fileName}`

    const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1")

    console.log(`[AudioUpload] Stored ${file.name} (${(file.size / 1024).toFixed(0)} KB) → ${publicUrl}`)

    return NextResponse.json({
      fileId,
      url:        publicUrl,
      fileName:   file.name,
      isLocalhost,
      warning:    isLocalhost
        ? "Running on localhost — Kie.ai cannot reach this URL from the internet. Cover mode requires a publicly accessible URL. Either deploy to production or paste a public audio URL instead."
        : null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed"
    console.error("[AudioUpload]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
