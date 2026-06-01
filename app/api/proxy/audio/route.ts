import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy an external audio URL through the server so the browser can load it
 * without CORS restrictions — required for MediaRecorder audio capture.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 })
  }
  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "MusicStudio/1.0" },
    })
    if (!upstream.ok) {
      return NextResponse.json({ error: "Failed to fetch audio" }, { status: upstream.status })
    }
    const buffer = await upstream.arrayBuffer()
    const contentType = upstream.headers.get("content-type") || "audio/mpeg"
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Proxy error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
