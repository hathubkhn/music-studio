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


export async function generateTrackImage(params: GenerateParams): Promise<string> {
  const { albumId, trackId, trackTitle, trackOrder, lyrics, stylePrompt, albumTheme, albumMood, albumGenre, onProgress } = params

  onProgress?.("Generating AI background…")

  // Build a song-specific prompt
  const parts = [
    albumMood   ? `${albumMood} atmosphere` : null,
    albumGenre  ? albumGenre                : null,
    albumTheme  ? albumTheme.slice(0, 60)   : null,
    stylePrompt ? stylePrompt.slice(0, 60)  : null,
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

  // Fetch raw AI image via proxy (no text overlay — clean cinematic image)
  onProgress?.("Fetching image…")
  const proxied = `/api/proxy/audio?url=${encodeURIComponent(imageUrl)}`
  const compositeBlob = await fetch(proxied).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch image")
    return r.blob()
  })

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
