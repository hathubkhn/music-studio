"use client"

/**
 * Generates a YouTube-style album cover thumbnail containing:
 *  - AI-generated cinematic background image
 *  - Dark gradient overlay on the left panel
 *  - Genre/mood header in bold caps (e.g. "RELAXING SAD SONGS")
 *  - Album title as a subtitle in elegant italic
 *  - Numbered tracklist
 *  - Brand/channel name at the bottom
 *
 * Returns the Vercel Blob public URL and saves it as the album's coverImageUrl.
 */
import { upload } from "@vercel/blob/client"

export interface AlbumThumbnailParams {
  albumId:    string
  albumTitle: string
  genre?:     string | null
  mood?:      string | null
  theme?:     string | null
  brandName?: string | null
  tracks: { order: number; title: string }[]
  onProgress?: (msg: string) => void
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error("Image load failed"))
    img.src = src
  })
}

/** Build the genre/mood header label — e.g. "RELAXING SAD SONGS" */
function buildHeader(genre?: string | null, mood?: string | null, theme?: string | null): string {
  const parts: string[] = []
  if (mood)  parts.push(mood.toUpperCase())
  if (genre) parts.push(genre.toUpperCase())
  if (parts.length === 0 && theme) parts.push(theme.slice(0, 30).toUpperCase())
  return parts.length > 0 ? `${parts.join(" ")} SONGS` : "ORIGINAL SONGS"
}

/** Wrap text to fit within maxWidth, returning array of lines */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function generateAlbumThumbnail(params: AlbumThumbnailParams): Promise<string> {
  const { albumId, albumTitle, genre, mood, theme, brandName, tracks, onProgress } = params

  // ── 1. Generate background image ─────────────────────────────────────────
  onProgress?.("Generating cover background…")

  const bgPromptParts = [
    mood   ? `${mood.toLowerCase()} atmosphere` : null,
    genre  ? `${genre.toLowerCase()} music` : null,
    theme  ? theme.slice(0, 60) : null,
    "cinematic wide shot, no people visible, no text, ultra HD, 16:9, moody lighting, dramatic colors",
    "suitable for music album cover, dark atmospheric, beautiful scenery",
  ].filter(Boolean).join(", ")

  const genRes = await fetch("/api/kie/image/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: bgPromptParts,
      negativePrompt: "text, watermark, logo, person, face, blurry, low quality, nsfw, crowd",
      aspectRatio: "16:9",
    }),
  })
  if (!genRes.ok) throw new Error((await genRes.json()).error ?? "Image generation failed")
  const { taskId } = await genRes.json()

  // ── 2. Poll for image ─────────────────────────────────────────────────────
  onProgress?.("Waiting for background image…")
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

  // ── 3. Build composite on Canvas ─────────────────────────────────────────
  onProgress?.("Compositing album cover…")

  const proxied  = `/api/proxy/audio?url=${encodeURIComponent(imageUrl)}`
  const imgBlob  = await fetch(proxied).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch background image")
    return r.blob()
  })
  const blobUrl = URL.createObjectURL(imgBlob)

  let compositeBlob: Blob
  try {
    const bgImg = await loadImg(blobUrl)

    const W = 1280, H = 720
    const canvas  = document.createElement("canvas")
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext("2d")!

    // Draw background cover-fit
    const scale = Math.max(W / bgImg.width, H / bgImg.height)
    const sw    = bgImg.width * scale
    const sh    = bgImg.height * scale
    ctx.drawImage(bgImg, (W - sw) / 2, (H - sh) / 2, sw, sh)

    // ── Dark overlay: full image tint + strong left panel gradient ──
    // Full slight tint
    ctx.fillStyle = "rgba(0,0,0,0.35)"
    ctx.fillRect(0, 0, W, H)

    // Left panel gradient (text area)
    const leftGrad = ctx.createLinearGradient(0, 0, W * 0.62, 0)
    leftGrad.addColorStop(0,    "rgba(0,0,0,0.90)")
    leftGrad.addColorStop(0.55, "rgba(0,0,0,0.78)")
    leftGrad.addColorStop(1,    "rgba(0,0,0,0)")
    ctx.fillStyle = leftGrad
    ctx.fillRect(0, 0, W, H)

    // Bottom gradient for depth
    const btmGrad = ctx.createLinearGradient(0, H * 0.65, 0, H)
    btmGrad.addColorStop(0, "rgba(0,0,0,0)")
    btmGrad.addColorStop(1, "rgba(0,0,0,0.60)")
    ctx.fillStyle = btmGrad
    ctx.fillRect(0, 0, W, H)

    const PAD = 56   // left padding
    const TEXT_W = W * 0.52 // max text width in left panel

    // ── Genre/mood header (e.g. "RELAXING SAD SONGS") ───────────────
    const header = buildHeader(genre, mood, theme)
    // Measure to pick right font size
    let headerSize = 74
    ctx.font = `bold ${headerSize}px Georgia, 'Times New Roman', serif`
    while (ctx.measureText(header).width > TEXT_W && headerSize > 40) {
      headerSize -= 2
      ctx.font = `bold ${headerSize}px Georgia, 'Times New Roman', serif`
    }
    const headerLines = wrapText(ctx, header, TEXT_W)
    ctx.textAlign    = "left"
    ctx.textBaseline = "top"
    // Gold-ish color for header
    ctx.fillStyle = "#D4AF6A"
    ctx.shadowColor = "rgba(0,0,0,0.8)"
    ctx.shadowBlur  = 16
    let y = 52
    for (const line of headerLines) {
      ctx.fillText(line, PAD, y)
      y += headerSize * 1.12
    }
    ctx.shadowBlur = 0

    // ── Album title (italic, slightly smaller, lighter gold) ────────
    const subtitle = albumTitle.slice(0, 60)
    let subSize = 42
    ctx.font = `italic ${subSize}px Georgia, 'Times New Roman', serif`
    while (ctx.measureText(subtitle).width > TEXT_W - 10 && subSize > 24) {
      subSize -= 2
      ctx.font = `italic ${subSize}px Georgia, 'Times New Roman', serif`
    }
    y += 8
    ctx.fillStyle = "#EDD9A3"
    ctx.shadowColor = "rgba(0,0,0,0.9)"
    ctx.shadowBlur  = 12
    ctx.fillText(subtitle, PAD, y)
    ctx.shadowBlur = 0

    // ── Thin divider line ────────────────────────────────────────────
    y += subSize + 18
    ctx.strokeStyle = "rgba(212,175,106,0.45)"
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(PAD + TEXT_W * 0.7, y)
    ctx.stroke()
    y += 18

    // ── Tracklist ────────────────────────────────────────────────────
    const displayTracks = tracks.slice(0, 12) // max 12 visible
    const trackFontSize = Math.max(16, Math.min(21, Math.floor((H - y - 100) / (displayTracks.length + 0.5))))
    const lineH = trackFontSize * 1.45

    for (const track of displayTracks) {
      if (y + lineH > H - 80) break
      // Number
      ctx.font      = `bold ${trackFontSize}px 'Inter', system-ui, sans-serif`
      ctx.fillStyle = "rgba(212,175,106,0.85)"
      ctx.shadowBlur = 0
      ctx.fillText(`${track.order}.`, PAD, y)

      // Title
      ctx.font      = `${trackFontSize}px 'Inter', system-ui, sans-serif`
      ctx.fillStyle = "rgba(255,255,255,0.88)"
      ctx.shadowColor = "rgba(0,0,0,0.6)"
      ctx.shadowBlur  = 6
      const numW  = ctx.measureText(`${track.order}.  `).width
      const titleMaxW = TEXT_W - numW
      let trackTitle  = track.title
      // Truncate if too long
      while (ctx.measureText(trackTitle + "…").width > titleMaxW && trackTitle.length > 4) {
        trackTitle = trackTitle.slice(0, -1)
      }
      if (trackTitle !== track.title) trackTitle += "…"
      ctx.fillText(trackTitle, PAD + numW, y)
      ctx.shadowBlur = 0
      y += lineH
    }

    // ── Bottom brand name ────────────────────────────────────────────
    if (brandName?.trim()) {
      const brand = brandName.toUpperCase()
      ctx.font      = `500 15px 'Inter', system-ui, sans-serif`
      ctx.fillStyle = "rgba(255,255,255,0.55)"
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      // Spaced letters effect via manual spacing
      const spaced = brand.split("").join("  ")
      ctx.fillText(spaced, W * 0.28, H - 22)

      // Small decorative dot line above
      ctx.fillStyle = "rgba(212,175,106,0.5)"
      ctx.beginPath()
      ctx.arc(W * 0.28, H - 46, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "rgba(212,175,106,0.35)"
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(W * 0.28 - 60, H - 46)
      ctx.lineTo(W * 0.28 - 8, H - 46)
      ctx.moveTo(W * 0.28 + 8, H - 46)
      ctx.lineTo(W * 0.28 + 60, H - 46)
      ctx.stroke()
    }

    compositeBlob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(
        (b) => (b ? res(b) : rej(new Error("Canvas toBlob failed"))),
        "image/jpeg",
        0.93
      )
    )
  } finally {
    URL.revokeObjectURL(blobUrl)
  }

  // ── 4. Upload to Vercel Blob ──────────────────────────────────────────────
  onProgress?.("Uploading album cover…")
  const safeName = albumTitle.replace(/[^a-zA-Z0-9 \-_]/g, "_").slice(0, 40)
  const blobResult = await upload(
    `album-covers/${albumId}/${safeName}.jpg`,
    compositeBlob,
    { access: "public", handleUploadUrl: "/api/upload/audio" }
  )

  // ── 5. Save to DB ─────────────────────────────────────────────────────────
  onProgress?.("Saving cover URL…")
  await fetch(`/api/albums/${albumId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coverImageUrl: blobResult.url }),
  })

  return blobResult.url
}
