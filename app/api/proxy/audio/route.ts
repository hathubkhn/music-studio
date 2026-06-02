import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy an external audio URL through the server.
 * - Bypasses CORS for MediaRecorder / canvas recording
 * - Adds Content-Disposition so the browser saves the file when ?download=1
 *
 * Query params:
 *   url       – required, the upstream audio URL
 *   filename  – optional, the filename to save as (default: audio.mp3)
 *   download  – optional, set to "1" to force download (adds Content-Disposition: attachment)
 */
export async function GET(req: NextRequest) {
  const url      = req.nextUrl.searchParams.get("url")
  const filename = req.nextUrl.searchParams.get("filename") || "audio.mp3"
  const forceDownload = req.nextUrl.searchParams.get("download") === "1"

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 })
  }
  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "MusicStudio/1.0" },
    })
    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream returned ${upstream.status}` }, { status: upstream.status })
    }
    const buffer      = await upstream.arrayBuffer()
    const contentType = upstream.headers.get("content-type") || "audio/mpeg"

    // Sanitise filename (remove characters that break Content-Disposition)
    const safeName = filename.replace(/[^\w.\- ]/g, "_")

    const headers: Record<string, string> = {
      "Content-Type":   contentType,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control":  "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    }

    if (forceDownload) {
      headers["Content-Disposition"] = `attachment; filename="${safeName}"`
    }

    return new Response(buffer, { headers })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Proxy error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
