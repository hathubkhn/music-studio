"use client"

/**
 * LyricVideoCreator
 * ─────────────────
 * 1. Generates a single mood-based background image (AI)
 * 2. Overlays lyrics as text on top of that image — one "slide" per lyric chunk
 * 3. Records the canvas animation + audio into a WebM video whose length = song length
 */

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Image as ImageIcon, Loader2, Play, Pause, Square, Download,
  RefreshCw, CheckCircle2, Film, Sparkles, AlertCircle, Eye,
  Type, Sliders, ChevronDown, ChevronUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

// ── Types & helpers ────────────────────────────────────────────────────────────

export type TextPosition = "bottom" | "center" | "top"
export type TextAlign = "center" | "left"

export interface VideoConfig {
  linesPerSlide: number
  fontSize: number
  textColor: string
  textPosition: TextPosition
  showGradient: boolean
  gradientOpacity: number
}

const DEFAULT_CONFIG: VideoConfig = {
  linesPerSlide: 2,
  fontSize: 64,
  textColor: "#FFFFFF",
  textPosition: "bottom",
  showGradient: true,
  gradientOpacity: 0.75,
}

/** Split lyrics into display chunks, skipping [Section] headers */
function parseLyricSlides(lyrics: string, linesPerSlide: number): string[][] {
  const lines = lyrics
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.match(/^\[.*\]$/))

  const slides: string[][] = []
  for (let i = 0; i < lines.length; i += linesPerSlide) {
    const chunk = lines.slice(i, i + linesPerSlide).filter(Boolean)
    if (chunk.length > 0) slides.push(chunk)
  }
  return slides
}

/** Draw one lyric frame onto canvas */
function renderFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  lines: string[],
  cfg: VideoConfig,
  progress?: number  // 0–1, shows a bottom progress bar if provided
) {
  const W = ctx.canvas.width
  const H = ctx.canvas.height

  // ── Background image (object-fit: cover) ──
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight)
  const sw = img.naturalWidth * scale
  const sh = img.naturalHeight * scale
  const sx = (W - sw) / 2
  const sy = (H - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh)

  // ── Gradient overlay ──
  if (cfg.showGradient) {
    const grad = ctx.createLinearGradient(0, H * 0.4, 0, H)
    grad.addColorStop(0, "rgba(0,0,0,0)")
    grad.addColorStop(1, `rgba(0,0,0,${cfg.gradientOpacity})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }

  // ── Lyric text ──
  const fs = cfg.fontSize
  ctx.font = `bold ${fs}px 'Segoe UI', Arial, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  const lineH = fs * 1.4
  const totalH = lines.length * lineH

  let startY: number
  if (cfg.textPosition === "bottom")       startY = H - 90 - totalH / 2
  else if (cfg.textPosition === "top")     startY = 90 + totalH / 2
  else /* center */                        startY = H / 2

  lines.forEach((line, i) => {
    const y = startY - totalH / 2 + lineH * i + lineH / 2
    // Drop shadow
    ctx.shadowColor = "rgba(0,0,0,0.9)"
    ctx.shadowBlur = 20
    ctx.fillStyle = cfg.textColor
    ctx.fillText(line, W / 2, y)
  })
  ctx.shadowBlur = 0

  // ── Progress bar ──
  if (progress !== undefined) {
    ctx.fillStyle = "rgba(255,255,255,0.2)"
    ctx.fillRect(0, H - 6, W, 6)
    ctx.fillStyle = "rgba(255,255,255,0.7)"
    ctx.fillRect(0, H - 6, W * progress, 6)
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PillBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-full border transition-all ${
        active
          ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
          : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  audioUrl?: string
  lyrics?: string
  songTitle?: string
  mood?: string
  genre?: string
  visualStyle?: string // from song brief
  // pre-existing background image (from storyboard step)
  existingImageUrl?: string
}

type RecordState = "idle" | "preparing" | "recording" | "done" | "error"

export function LyricVideoCreator({
  audioUrl,
  lyrics = "",
  songTitle = "My Song",
  mood = "",
  genre = "",
  visualStyle = "",
  existingImageUrl,
}: Props) {
  // ── Background image ──
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(existingImageUrl || null)
  const [isGenImg, setIsGenImg] = useState(false)

  // ── Video config ──
  const [config, setConfig] = useState<VideoConfig>(DEFAULT_CONFIG)
  const [showConfig, setShowConfig] = useState(false)

  // ── Preview ──
  const [isPreview, setIsPreview]   = useState(false)
  const [previewSlide, setPreviewSlide] = useState(0)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const previewAudioRef  = useRef<HTMLAudioElement | null>(null)

  // ── Recording ──
  const [recordState, setRecordState] = useState<RecordState>("idle")
  const [recordProgress, setRecordProgress] = useState(0)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const recordingRef = useRef(false)

  const slides = parseLyricSlides(lyrics, config.linesPerSlide)
  const slideCount = slides.length

  // ── Load background image into HTMLImageElement ──
  const bgImgEl = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!bgImageUrl) { bgImgEl.current = null; return }
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload  = () => { bgImgEl.current = img; drawPreviewSlide(previewSlide) }
    img.onerror = () => { img.crossOrigin = ""; img.src = bgImageUrl } // retry without CORS
    img.src = bgImageUrl
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImageUrl])

  // ── Draw one slide on preview canvas ──
  const drawPreviewSlide = useCallback((idx: number) => {
    const canvas = previewCanvasRef.current
    const img    = bgImgEl.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    if (!img) {
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    const safeIdx = Math.max(0, Math.min(idx, slides.length - 1))
    const lines   = slides[safeIdx] || ["♪ ♪ ♪"]
    if (img) renderFrame(ctx, img, lines, config, safeIdx / (slides.length - 1 || 1))
    else {
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `bold ${config.fontSize}px sans-serif`
      ctx.fillStyle = config.textColor
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      lines.forEach((l, i) => {
        ctx.fillText(l, canvas.width / 2, canvas.height / 2 + i * config.fontSize * 1.4)
      })
    }
  }, [slides, config])

  // Re-draw when config or slide changes
  useEffect(() => { drawPreviewSlide(previewSlide) }, [drawPreviewSlide, previewSlide])

  // ── Generate background image ──
  const generateBgImage = async () => {
    setIsGenImg(true)
    try {
      const moodPrompt = [visualStyle, mood, genre].filter(Boolean).join(", ")
      const prompt = `${moodPrompt || "cinematic landscape"}, atmospheric background, no people, no text, high quality, wide shot, 16:9, moody lighting, ultra HD`

      const res = await fetch("/api/kie/image/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt: "text, watermark, logo, person, face, blurry, low quality",
          aspectRatio: "16:9",
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { taskId } = await res.json()

      // Poll
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const s = await fetch(`/api/kie/image/status?jobId=${taskId}`)
        const result = await s.json()
        if (result.status === "completed" && result.result?.[0]?.url) {
          setBgImageUrl(result.result[0].url)
          toast.success("Background image generated!")
          return
        }
        if (result.status === "failed") throw new Error("Generation failed")
      }
      throw new Error("Timeout")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image generation failed")
    } finally {
      setIsGenImg(false)
    }
  }

  // ── Preview controls ──
  const startPreview = useCallback(() => {
    if (!audioUrl) { toast.error("No audio yet — generate music first"); return }
    setIsPreview(true)
    setPreviewSlide(0)

    const audio = new Audio(audioUrl)
    previewAudioRef.current = audio
    audio.play()

    let lastSlide = -1
    previewTimerRef.current = setInterval(() => {
      const progress = audio.currentTime / (audio.duration || 1)
      const idx = Math.min(Math.floor(progress * slides.length), slides.length - 1)
      if (idx !== lastSlide) { lastSlide = idx; setPreviewSlide(idx) }
      if (audio.ended || audio.paused) stopPreview()
    }, 100)

    audio.onended = () => stopPreview()
  }, [audioUrl, slides.length])

  const stopPreview = useCallback(() => {
    setIsPreview(false)
    previewAudioRef.current?.pause()
    previewAudioRef.current = null
    if (previewTimerRef.current) { clearInterval(previewTimerRef.current); previewTimerRef.current = null }
  }, [])

  useEffect(() => () => stopPreview(), [stopPreview])

  // ── Record video ──
  const recordVideo = useCallback(async () => {
    if (!audioUrl) { toast.error("No audio URL"); return }
    if (!bgImgEl.current && !bgImageUrl) { toast.error("Generate a background image first"); return }

    setRecordState("preparing")
    setRecordProgress(0)
    setVideoBlob(null)
    recordingRef.current = true

    try {
      // Fetch audio via proxy to bypass CORS
      const proxyUrl = `/api/proxy/audio?url=${encodeURIComponent(audioUrl)}`
      const audioRes = await fetch(proxyUrl)
      if (!audioRes.ok) throw new Error("Failed to download audio")
      const audioBuffer = await audioRes.arrayBuffer()

      const audioCtx   = new AudioContext()
      const decoded    = await audioCtx.decodeAudioData(audioBuffer.slice(0))
      const audioDur   = decoded.duration

      // Offscreen recording canvas (1280×720)
      const W = 1280, H = 720
      const recCanvas = document.createElement("canvas")
      recCanvas.width = W; recCanvas.height = H

      const recCtx = recCanvas.getContext("2d")!

      // Prepare image element (may differ from preview due to CORS)
      let img = bgImgEl.current
      if (!img && bgImageUrl) {
        img = await new Promise<HTMLImageElement>((res, rej) => {
          const el = new Image(); el.crossOrigin = "anonymous"
          el.onload = () => res(el); el.onerror = () => rej(new Error("Image load failed"))
          el.src = bgImageUrl
        })
        bgImgEl.current = img
      }

      // Canvas stream
      const canvasStream = recCanvas.captureStream(30)

      // Audio stream via AudioBuffer → MediaStream
      const streamDest = audioCtx.createMediaStreamDestination()
      const source     = audioCtx.createBufferSource()
      source.buffer    = decoded

      // Second decode for the source node (needed because decodeAudioData detaches)
      const decoded2 = await audioCtx.decodeAudioData(audioBuffer.slice(0))
      const source2  = audioCtx.createBufferSource()
      source2.buffer = decoded2
      source2.connect(streamDest)

      streamDest.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t))

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm"
      const recorder = new MediaRecorder(canvasStream, { mimeType })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        setVideoBlob(blob)
        setRecordState("done")
        setRecordProgress(100)
        audioCtx.close()
        recordingRef.current = false
      }

      // Start
      setRecordState("recording")
      recorder.start(1000)
      source2.start()

      const startTime = performance.now()
      const frameDur  = audioDur / slides.length

      const animate = () => {
        if (!recordingRef.current) { recorder.stop(); return }

        const elapsed  = (performance.now() - startTime) / 1000
        const progress = Math.min(elapsed / audioDur, 1)
        setRecordProgress(Math.round(progress * 100))

        const slideIdx = Math.min(Math.floor(elapsed / frameDur), slides.length - 1)
        const lines    = slides[slideIdx] || ["♪"]

        if (img) {
          renderFrame(recCtx, img, lines, config, progress)
        } else {
          recCtx.fillStyle = "#000"
          recCtx.fillRect(0, 0, W, H)
          recCtx.font = `bold ${config.fontSize}px sans-serif`
          recCtx.fillStyle = config.textColor
          recCtx.textAlign = "center"
          recCtx.textBaseline = "middle"
          lines.forEach((l, i) => recCtx.fillText(l, W / 2, H / 2 + i * config.fontSize * 1.4))
        }

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          recorder.stop()
        }
      }

      requestAnimationFrame(animate)

      // Safety stop after audio duration + 1s
      await new Promise<void>((res) => {
        const t = setInterval(() => {
          if (!recordingRef.current) { clearInterval(t); res() }
        }, 500)
        setTimeout(() => { clearInterval(t); if (recordingRef.current) recorder.stop(); res() }, (audioDur + 2) * 1000)
      })
    } catch (err) {
      console.error("[LyricVideo]", err)
      setRecordState("error")
      recordingRef.current = false
      toast.error(err instanceof Error ? err.message : "Video creation failed")
    }
  }, [audioUrl, bgImageUrl, slides, config])

  const downloadVideo = useCallback(() => {
    if (!videoBlob) return
    const url = URL.createObjectURL(videoBlob)
    const a   = document.createElement("a")
    a.href = url
    a.download = `${songTitle.replace(/\s+/g, "-")}-lyric-video.webm`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [videoBlob, songTitle])

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Section 1: Background Image ── */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="w-4 h-4 text-violet-400" />
            Background Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bgImageUrl ? (
            <div className="relative rounded-lg overflow-hidden aspect-video bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bgImageUrl} alt="Background" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-end p-4 pointer-events-none">
                <div className="bg-black/70 rounded px-3 py-1.5 text-xs text-white font-medium">
                  {slides[0]?.join(" / ")}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 gap-1 bg-black/70 border-white/20 text-white hover:bg-black/90 text-xs h-7"
                onClick={generateBgImage}
                disabled={isGenImg}
              >
                {isGenImg ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Regenerate
              </Button>
            </div>
          ) : (
            <div className="aspect-video rounded-lg border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/20">
              <ImageIcon className="w-10 h-10 opacity-20" />
              <p className="text-sm">No background image yet</p>
              <Button variant="gradient" onClick={generateBgImage} disabled={isGenImg} className="gap-2">
                {isGenImg
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                  : <><Sparkles className="w-4 h-4" />Generate Mood Image</>}
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            One AI image generated from your song's mood ({[mood, genre].filter(Boolean).join(", ") || "auto"}).
            The same image is used for the entire video — only the lyrics text changes.
          </p>
        </CardContent>
      </Card>

      {/* ── Section 2: Preview Canvas ── */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="w-4 h-4 text-teal-400" />
              Lyric Video Preview
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{slideCount} slides</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={() => setShowConfig((v) => !v)}
              >
                <Sliders className="w-3 h-3" />
                Style
                {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Config panel */}
          {showConfig && (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Lines per slide</Label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((n) => (
                      <PillBtn key={n} active={config.linesPerSlide === n}
                        onClick={() => setConfig((c) => ({ ...c, linesPerSlide: n }))}>
                        {n}
                      </PillBtn>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Text position</Label>
                  <div className="flex gap-1.5">
                    {(["top", "center", "bottom"] as TextPosition[]).map((p) => (
                      <PillBtn key={p} active={config.textPosition === p}
                        onClick={() => setConfig((c) => ({ ...c, textPosition: p }))}>
                        {p}
                      </PillBtn>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Font size: {config.fontSize}px</Label>
                  <Slider
                    min={32} max={96} step={4}
                    value={[config.fontSize]}
                    onValueChange={([v]) => setConfig((c) => ({ ...c, fontSize: v }))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Text color</Label>
                  <div className="flex gap-2 items-center">
                    {["#FFFFFF", "#FFEE58", "#80DEEA", "#FFB3BA"].map((c) => (
                      <button key={c} type="button"
                        onClick={() => setConfig((cfg) => ({ ...cfg, textColor: c }))}
                        style={{ background: c }}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${config.textColor === c ? "border-white scale-110" : "border-transparent"}`}
                      />
                    ))}
                    <input type="color" value={config.textColor}
                      onChange={(e) => setConfig((c) => ({ ...c, textColor: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border border-border/60"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-2">
                    Dark overlay: {Math.round(config.gradientOpacity * 100)}%
                    <input type="checkbox" checked={config.showGradient}
                      onChange={(e) => setConfig((c) => ({ ...c, showGradient: e.target.checked }))}
                      className="ml-1"
                    />
                  </Label>
                  <Slider
                    min={0} max={1} step={0.05}
                    value={[config.gradientOpacity]}
                    disabled={!config.showGradient}
                    onValueChange={([v]) => setConfig((c) => ({ ...c, gradientOpacity: v }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <canvas
              ref={previewCanvasRef}
              width={1280}
              height={720}
              className="w-full h-full"
            />
            {/* Slide nav dots */}
            {!isPreview && slideCount > 0 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {slides.map((_, i) => (
                  <button key={i} type="button"
                    onClick={() => setPreviewSlide(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === previewSlide ? "bg-white scale-125" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Preview controls */}
          <div className="flex items-center gap-3">
            {!isPreview ? (
              <Button
                variant="outline"
                onClick={startPreview}
                disabled={!audioUrl || slideCount === 0}
                className="gap-2"
              >
                <Play className="w-4 h-4" />Preview with Audio
              </Button>
            ) : (
              <Button variant="outline" onClick={stopPreview} className="gap-2">
                <Square className="w-4 h-4" />Stop Preview
              </Button>
            )}
            <div className="flex gap-1.5 ml-auto">
              <button type="button" onClick={() => setPreviewSlide((i) => Math.max(0, i - 1))}
                disabled={isPreview} className="px-2 py-1 text-xs rounded border border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-30">
                ← Prev
              </button>
              <span className="text-xs text-muted-foreground self-center tabular-nums">
                {previewSlide + 1} / {slideCount}
              </span>
              <button type="button" onClick={() => setPreviewSlide((i) => Math.min(slideCount - 1, i + 1))}
                disabled={isPreview} className="px-2 py-1 text-xs rounded border border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-30">
                Next →
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Create Video ── */}
      <Card className={`border-border/60 ${recordState === "done" ? "border-teal-500/30" : ""}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Film className="w-4 h-4 text-amber-400" />
            Create Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recordState === "idle" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Records a WebM video in real-time: background image + lyric text overlay + audio.
                Duration matches the song exactly. Compatible with CapCut, Premiere, DaVinci.
              </p>
              <div className="flex gap-3 flex-wrap text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-teal-400" />Audio embedded</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-teal-400" />1280×720 HD</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-teal-400" />WebM format</span>
              </div>
              <Button
                variant="gradient"
                onClick={recordVideo}
                disabled={!audioUrl || slideCount === 0}
                className="w-full gap-2"
              >
                <Film className="w-4 h-4" />
                Create Lyric Video
              </Button>
            </div>
          )}

          {recordState === "preparing" && (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium">Preparing audio…</p>
                <p className="text-xs text-muted-foreground">Downloading and decoding audio stream</p>
              </div>
            </div>
          )}

          {recordState === "recording" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <p className="text-sm font-medium">Recording… {recordProgress}%</p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all"
                  style={{ width: `${recordProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Real-time recording in progress — please don't close this tab
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => { recordingRef.current = false; setRecordState("idle") }}
              >
                <Square className="w-3 h-3" />Cancel
              </Button>
            </div>
          )}

          {recordState === "done" && videoBlob && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-teal-400">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium text-sm">Video ready! ({(videoBlob.size / 1024 / 1024).toFixed(1)} MB)</p>
              </div>
              <div className="flex gap-3">
                <Button variant="gradient" onClick={downloadVideo} className="flex-1 gap-2">
                  <Download className="w-4 h-4" />Download WebM
                </Button>
                <Button variant="outline" onClick={() => { setVideoBlob(null); setRecordState("idle") }} className="gap-2">
                  <RefreshCw className="w-4 h-4" />Re-record
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Import the WebM into CapCut, Premiere, or DaVinci Resolve. The audio is already embedded.
              </p>
            </div>
          )}

          {recordState === "error" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">Recording failed</p>
              </div>
              <Button variant="outline" onClick={() => setRecordState("idle")} className="gap-2">
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
