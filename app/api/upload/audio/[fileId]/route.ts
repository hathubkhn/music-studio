import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import os from "os"

const TEMP_DIR = path.join(os.tmpdir(), "music-studio-uploads")

const MIME: Record<string, string> = {
  mp3:  "audio/mpeg",
  mp4:  "audio/mp4",
  wav:  "audio/wav",
  m4a:  "audio/mp4",
  ogg:  "audio/ogg",
  flac: "audio/flac",
  aac:  "audio/aac",
  webm: "audio/webm",
}

type Params = { params: Promise<{ fileId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { fileId } = await params

    // Sanitise: only alphanumerics, hyphens, dots, no path traversal
    if (!/^[\w\-]+\.[a-z0-9]+$/.test(fileId)) {
      return NextResponse.json({ error: "Invalid file id" }, { status: 400 })
    }

    const filePath = path.join(TEMP_DIR, fileId)

    // Extra guard against path traversal
    if (!filePath.startsWith(TEMP_DIR)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found or expired" }, { status: 404 })
    }

    const buffer  = await readFile(filePath)
    const ext     = fileId.split(".").pop()?.toLowerCase() || "mp3"
    const mime    = MIME[ext] ?? "audio/mpeg"

    return new Response(buffer, {
      headers: {
        "Content-Type":                mime,
        "Content-Length":              String(buffer.length),
        "Cache-Control":               "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (err) {
    console.error("[AudioServe]", err)
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 })
  }
}
