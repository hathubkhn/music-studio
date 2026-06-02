/**
 * Shared canvas rendering utilities for LyricVideoCreator and AlbumVideoCreator.
 */

export type TextEffect  = "fade" | "slide-up" | "typewriter" | "pop" | "static"
export type TextPosition = "bottom" | "center" | "top"

export interface VideoConfig {
  linesPerSlide:   number
  fontSize:        number
  textColor:       string
  textPosition:    TextPosition
  fontFamily:      string
  effect:          TextEffect
  showGradient:    boolean
  gradientOpacity: number
}

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  linesPerSlide:   2,
  fontSize:        60,
  textColor:       "#FFFFFF",
  textPosition:    "bottom",
  fontFamily:      "'Inter', sans-serif",
  effect:          "fade",
  showGradient:    true,
  gradientOpacity: 0.75,
}

export interface LyricSlide {
  lines:    string[]
  startSec: number
  endSec:   number
}

export function parseLyricLines(lyrics: string): string[] {
  return lyrics
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.match(/^\[.*\]$/))
}

export function buildSlides(lyrics: string, linesPerSlide: number, duration: number): LyricSlide[] {
  const lines  = parseLyricLines(lyrics)
  const chunks: string[][] = []
  for (let i = 0; i < lines.length; i += linesPerSlide) {
    const chunk = lines.slice(i, i + linesPerSlide).filter(Boolean)
    if (chunk.length > 0) chunks.push(chunk)
  }
  const secPerSlide = duration > 0 && chunks.length > 0 ? duration / chunks.length : 3
  return chunks.map((c, i) => ({
    lines:    c,
    startSec: i * secPerSlide,
    endSec:   (i + 1) * secPerSlide,
  }))
}

function easeOut(t: number) { return 1 - Math.pow(1 - t, 2) }

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  slide: LyricSlide | null,
  cfg: VideoConfig,
  progress: number,
  slideProgress: number
) {
  const W = ctx.canvas.width
  const H = ctx.canvas.height

  // Background
  if (img) {
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight)
    const sw = img.naturalWidth * scale
    const sh = img.naturalHeight * scale
    ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh)
  } else {
    ctx.fillStyle = "#0d0d1a"
    ctx.fillRect(0, 0, W, H)
  }

  // Gradient overlay
  if (cfg.showGradient) {
    const grad = ctx.createLinearGradient(0, H * 0.35, 0, H)
    grad.addColorStop(0, "rgba(0,0,0,0)")
    grad.addColorStop(1, `rgba(0,0,0,${cfg.gradientOpacity})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }

  // Lyric text
  if (slide) {
    const lines = [...slide.lines]
    const fs    = cfg.fontSize
    ctx.font         = `bold ${fs}px ${cfg.fontFamily}`
    ctx.textAlign    = "center"
    ctx.textBaseline = "middle"
    const lineH  = fs * 1.45
    const totalH = lines.length * lineH

    let baseY: number
    if      (cfg.textPosition === "top")    baseY = 100 + totalH / 2
    else if (cfg.textPosition === "center") baseY = H / 2
    else                                    baseY = H - 100 - totalH / 2

    const ep = easeOut(Math.min(slideProgress * 3, 1))

    ctx.shadowColor = "rgba(0,0,0,0.95)"
    ctx.shadowBlur  = 24

    lines.forEach((rawLine, i) => {
      const y = baseY - totalH / 2 + lineH * i + lineH / 2

      if (cfg.effect === "pop") {
        const scale = 0.7 + 0.3 * ep
        ctx.save()
        ctx.globalAlpha = ep
        ctx.translate(W / 2, y)
        ctx.scale(scale, scale)
        ctx.fillStyle = cfg.textColor
        ctx.fillText(rawLine, 0, 0)
        ctx.restore()
        return
      }

      let line    = rawLine
      let drawY   = y
      let alpha   = 1

      if (cfg.effect === "fade") {
        alpha = ep
      } else if (cfg.effect === "slide-up") {
        drawY = y + (1 - ep) * 40
        alpha = ep
      } else if (cfg.effect === "typewriter") {
        const charCount = Math.floor(slideProgress * rawLine.length * 1.5)
        line = rawLine.slice(0, Math.min(charCount, rawLine.length))
      }

      ctx.globalAlpha = alpha
      ctx.fillStyle   = cfg.textColor
      ctx.fillText(line, W / 2, drawY)
    })

    ctx.globalAlpha = 1
    ctx.shadowBlur  = 0
  }

  // Progress bar
  ctx.fillStyle = "rgba(255,255,255,0.15)"
  ctx.fillRect(0, H - 5, W, 5)
  ctx.fillStyle = "rgba(255,255,255,0.6)"
  ctx.fillRect(0, H - 5, W * progress, 5)
}
