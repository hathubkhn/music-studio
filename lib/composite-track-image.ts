"use client"

/**
 * Generates an AI background image for a track, composites the song title
 * as a text overlay on the bottom, uploads to Vercel Blob, and returns the URL.
 *
 * Steps:
 * 1. POST /api/kie/image/create with a rich prompt
 * 2. Poll /api/kie/image/status until done
 * 3. Load image via proxy (bypasses CORS), draw onto Canvas
 * 4. Overlay title + subtle gradient at the bottom
 * 5. Upload composited JPEG to Vercel Blob
 * 6. Return public URL
 */
import { upload } from "@vercel/blob/client"

interface GenerateParams {
  albumId:      string
  trackId:      string
  trackTitle:   string
  trackOrder:   number
  lyrics?:      string | null
  stylePrompt?: string | null
  albumTheme?:  string | null
  albumMood?:   string | null
  albumGenre?:  string | null
  onProgress?:  (msg: string) => void
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error("Image load failed"))
    img.src = src
  })
}

function firstNWords(text: string | null | undefined, n: number): string {
  if (!text) return ""
  return text.split(/\s+/).slice(0, n).join(" ")
}

export async function generateTrackImage(params: GenerateParams): Promise<string> {
  const { albumId, trackId, trackTitle, trackOrder, lyrics, stylePrompt, albumTheme, albumMood, albumGenre, onProgress } = params

  onProgress?.("Generating AI background…")

  // Build a song-specific prompt
  const lyricSnippet = firstNWords(lyrics?.replace(/\[.*?\]/g, ""), 12)
  const parts = [
    albumMood  ? `${albumMood} atmosphere` : null,
    albumGenre ? albumGenre                : null,
    albumTheme ? albumTheme.slice(0, 60)   : null,
    stylePrompt ? stylePrompt.slice(0, 60) : null,
    lyricSnippet ? `inspired by "${lyricSnippet}"` : null,
    "cinematic background, no people, no text, ultra HD, 16:9, moody lighting",
  ].filter(Boolean).join(", ")

  // Submit image generation
  const genRes = await fetch("/api/kie/image/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `${trackTitle} — ${parts}`,
      negativePrompt: "text, watermark, logo, person, face, blurry, low quality, nsfw",
      aspectRatio: "16:9",
    }),
  })
  if (!genRes.ok) throw new Error((await genRes.json()).error ?? "Image generation failed")
  const { taskId } = await genRes.json()

  // Poll
  onProgress?.("Waiting for image…")
  let imageUrl = ""
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const s   = await fetch(`/api/kie/image/status?jobId=${taskId}`)
    const out = await s.json()
    if (out.status === "completed" && out.result?.[0]?.url) {
      imageUrl = out.result[0].url
      break
    }
    if (out.status === "failed") throw new Error(out.error ?? "Image generation failed")
  }
  if (!imageUrl) throw new Error("Image generation timed out")

  onProgress?.("Adding title overlay…")

  // Load image via proxy to avoid CORS
  const proxied = `/api/proxy/audio?url=${encodeURIComponent(imageUrl)}`
  const imgBlob = await fetch(proxied).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch image")
    return r.blob()
  })
  const blobUrl = URL.createObjectURL(imgBlob)

  let compositeBlob: Blob
  try {
    const img = await loadImg(blobUrl)

    const W = 1280, H = 720
    const canvas = document.createElement("canvas")
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext("2d")!

    // Draw image cover-fit
    const scale = Math.max(W / img.width, H / img.height)
    const sw = img.width * scale, sh = img.height * scale
    ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh)

    // Bottom gradient
    const grad = ctx.createLinearGradient(0, H * 0.6, 0, H)
    grad.addColorStop(0, "rgba(0,0,0,0)")
    grad.addColorStop(1, "rgba(0,0,0,0.82)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Track number badge (top-left)
    ctx.fillStyle = "rgba(255,255,255,0.15)"
    ctx.beginPath()
    ctx.roundRect(24, 24, 52, 32, 8)
    ctx.fill()
    ctx.font = "bold 16px 'Inter', sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText(`#${trackOrder}`, 36, 40)

    // Song title (bottom center)
    const title = trackTitle.slice(0, 55)
    ctx.font = "bold 54px 'Inter', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "alphabetic"
    ctx.shadowColor = "rgba(0,0,0,0.95)"
    ctx.shadowBlur  = 24
    ctx.fillStyle   = "#FFFFFF"
    ctx.fillText(title, W / 2, H - 52)
    ctx.shadowBlur = 0

    // Thin bottom border line
    ctx.fillStyle = "rgba(255,255,255,0.25)"
    ctx.fillRect(W / 2 - 140, H - 34, 280, 2)

    compositeBlob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Canvas toBlob failed"))), "image/jpeg", 0.92)
    )
  } finally {
    URL.revokeObjectURL(blobUrl)
  }

  // Upload to Vercel Blob
  onProgress?.("Uploading thumbnail…")
  const safeName = trackTitle.replace(/[^a-zA-Z0-9 \-_]/g, "_").slice(0, 40)
  const blobResult = await upload(
    `album-thumbnails/${albumId}/${String(trackOrder).padStart(2, "0")}-${safeName}.jpg`,
    compositeBlob,
    { access: "public", handleUploadUrl: "/api/upload/audio" }
  )

  // Save to DB
  onProgress?.("Saving…")
  await fetch(`/api/albums/${albumId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ track: { id: trackId, thumbnailUrl: blobResult.url } }),
  })

  return blobResult.url
}
