"use client"

/**
 * LyricVideoCreator (v2)
 * ──────────────────────
 * Canvas-based lyric video renderer with:
 * - Per-slide timing (auto-distribute or manual)
 * - Text effects: fade | slide-up | typewriter | pop
 * - Font family selection
 * - AI background generation OR custom image upload
 * - Preview player synced to audio
 * - MediaRecorder-based WebM export
 */

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Image as ImageIcon, Loader2, Play, Pause, Download,
  RefreshCw, Film, Sparkles, AlertCircle, Upload,
  Settings, ChevronDown, ChevronUp, Clock, Type,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { upload } from "@vercel/blob/client"
import {
  buildSlides, renderFrame,
  DEFAULT_VIDEO_CONFIG,
  type LyricSlide, type VideoConfig, type TextEffect, type TextPosition,
} from "@/components/album/album-video-utils"

export type { VideoConfig, LyricSlide, TextEffect, TextPosition }

const FONTS = [
  { label: "Inter",    value: "'Inter', sans-serif" },
  { label: "Georgia",  value: "Georgia, serif" },
  { label: "Impact",   value: "Impact, fantasy" },
  { label: "Courier",  value: "'Courier New', monospace" },
  { label: "Oswald",   value: "Oswald, sans-serif" },
]

const DEFAULT_CONFIG = DEFAULT_VIDEO_CONFIG

// ── Sub-components ────────────────────────────────────────────────────────────

function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
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

// ── Main component ────────────────────────────────────────────────────────────

export interface LyricVideoCreatorProps {
  audioUrl?:        string
  lyrics?:          string
  songTitle?:       string
  mood?:            string
  genre?:           string
  visualStyle?:     string
  existingImageUrl?:string
  audioDuration?:   number   // seconds, if known
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
  audioDuration,
}: LyricVideoCreatorProps) {
  const [bgImageUrl, setBgImageUrl]     = useState<string | null>(existingImageUrl ?? null)
  const [isGenImg, setIsGenImg]         = useState(false)
  const [config, setConfig]             = useState<VideoConfig>(DEFAULT_CONFIG)
  const [showConfig, setShowConfig]     = useState(false)
  const [showTiming, setShowTiming]     = useState(false)
  const [duration, setDuration]         = useState<number>(audioDuration ?? 0)
  const [slides, setSlides]             = useState<LyricSlide[]>([])
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0)
  const [isPreview, setIsPreview]       = useState(false)
  const [recordState, setRecordState]   = useState<RecordState>("idle")
  const [recordProgress, setRecordProgress] = useState(0)
  const [videoBlob, setVideoBlob]       = useState<Blob | null>(null)

  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const bgImgEl          = useRef<HTMLImageElement | null>(null)
  const previewAudioRef  = useRef<HTMLAudioElement | null>(null)
  const previewTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordingRef     = useRef(false)
  const fileRef          = useRef<HTMLInputElement>(null)

  // Rebuild slides when lyrics/config/duration change
  useEffect(() => {
    setSlides(buildSlides(lyrics, config.linesPerSlide, duration))
  }, [lyrics, config.linesPerSlide, duration])

  // Load audio to get duration
  useEffect(() => {
    if (!audioUrl || duration > 0) return
    const a = new Audio(audioUrl)
    a.addEventListener("loadedmetadata", () => setDuration(a.duration))
  }, [audioUrl, duration])

  // Load bg image element
  useEffect(() => {
    if (!bgImageUrl) { bgImgEl.current = null; return }
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload  = () => { bgImgEl.current = img; drawPreview(previewSlideIdx) }
    img.onerror = () => { img.crossOrigin = ""; img.src = bgImageUrl }
    img.src = bgImageUrl
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImageUrl])

  const currentSlideFor = useCallback((timeSec: number): { slide: LyricSlide | null; idx: number; slideProgress: number } => {
    const idx = slides.findIndex((s) => timeSec >= s.startSec && timeSec < s.endSec)
    if (idx === -1) {
      if (timeSec >= (slides.at(-1)?.startSec ?? 0)) return { slide: slides.at(-1) ?? null, idx: slides.length - 1, slideProgress: 1 }
      return { slide: null, idx: -1, slideProgress: 0 }
    }
    const s = slides[idx]
    const slideProgress = (timeSec - s.startSec) / Math.max(0.001, s.endSec - s.startSec)
    return { slide: s, idx, slideProgress }
  }, [slides])

  const drawPreview = useCallback((idx: number) => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx   = canvas.getContext("2d")!
    const slide = slides[idx] ?? null
    const prog  = duration > 0 && slide ? slide.startSec / duration : 0
    renderFrame(ctx, bgImgEl.current, slide, config, prog, 0.8)
  }, [slides, config, duration])

  useEffect(() => { drawPreview(previewSlideIdx) }, [drawPreview, previewSlideIdx])

  // ── Upload custom image ───────────────────────────────────────────────────
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { toast.error("Select an image file"); return }
    try {
      const ext  = file.name.split(".").pop() ?? "jpg"
      const blob = await upload(
        `lyric-bg/${songTitle.replace(/\s+/g, "-")}-${Date.now()}.${ext}`,
        file,
        { access: "public", handleUploadUrl: "/api/upload/audio" }
      )
      setBgImageUrl(blob.url)
      toast.success("Image uploaded!")
    } catch {
      toast.error("Upload failed")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  // ── AI background image ───────────────────────────────────────────────────
  const generateBgImage = async () => {
    setIsGenImg(true)
    try {
      const prompt = [visualStyle, mood, genre].filter(Boolean).join(", ") || "cinematic landscape"
      const res = await fetch("/api/kie/image/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${prompt}, atmospheric background, no people, no text, ultra HD, 16:9, moody lighting`,
          negativePrompt: "text, watermark, logo, person, face, blurry, low quality",
          aspectRatio: "16:9",
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { taskId } = await res.json()

      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const s = await fetch(`/api/kie/image/status?jobId=${taskId}`)
        const out = await s.json()
        if (out.status === "completed" && out.result?.[0]?.url) {
          setBgImageUrl(out.result[0].url)
          toast.success("Background generated!")
          return
        }
        if (out.status === "failed") throw new Error("Generation failed")
      }
      throw new Error("Timeout")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed")
    } finally {
      setIsGenImg(false)
    }
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  const startPreview = useCallback(() => {
    if (!audioUrl) { toast.error("No audio"); return }
    setIsPreview(true)
    const audio = new Audio(audioUrl)
    previewAudioRef.current = audio
    audio.play()
    previewTimerRef.current = setInterval(() => {
      const t = audio.currentTime
      const { idx } = currentSlideFor(t)
      setPreviewSlideIdx(Math.max(0, idx))
      if (audio.ended) stopPreview()
    }, 80)
    audio.onended = () => stopPreview()
  }, [audioUrl, currentSlideFor])

  const stopPreview = useCallback(() => {
    setIsPreview(false)
    previewAudioRef.current?.pause()
    previewAudioRef.current = null
    if (previewTimerRef.current) { clearInterval(previewTimerRef.current); previewTimerRef.current = null }
  }, [])

  useEffect(() => () => stopPreview(), [stopPreview])

  // ── Record ────────────────────────────────────────────────────────────────
  const recordVideo = useCallback(async () => {
    if (!audioUrl) { toast.error("No audio URL"); return }

    setRecordState("preparing")
    setRecordProgress(0)
    setVideoBlob(null)
    recordingRef.current = true

    try {
      const proxyUrl  = `/api/proxy/audio?url=${encodeURIComponent(audioUrl)}`
      const audioRes  = await fetch(proxyUrl)
      if (!audioRes.ok) throw new Error("Failed to download audio")
      const buffer    = await audioRes.arrayBuffer()

      const audioCtx  = new AudioContext()
      const decoded   = await audioCtx.decodeAudioData(buffer.slice(0))
      const audioDur  = decoded.duration
      setDuration(audioDur)

      const W = 1280, H = 720
      const recCanvas   = document.createElement("canvas")
      recCanvas.width   = W
      recCanvas.height  = H
      const recCtx      = recCanvas.getContext("2d")!

      let img = bgImgEl.current
      if (!img && bgImageUrl) {
        img = await new Promise<HTMLImageElement>((res, rej) => {
          const el = new Image(); el.crossOrigin = "anonymous"
          el.onload = () => res(el); el.onerror = () => rej(new Error("Image load failed"))
          el.src = bgImageUrl
        })
        bgImgEl.current = img
      }

      const canvasStream = recCanvas.captureStream(30)
      const streamDest   = audioCtx.createMediaStreamDestination()
      const decoded2     = await audioCtx.decodeAudioData(buffer.slice(0))
      const source2      = audioCtx.createBufferSource()
      source2.buffer     = decoded2
      source2.connect(streamDest)
      streamDest.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t))

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus" : "video/webm"
      const recorder = new MediaRecorder(canvasStream, { mimeType })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        setVideoBlob(new Blob(chunks, { type: mimeType }))
        setRecordState("done")
        setRecordProgress(100)
        audioCtx.close()
        recordingRef.current = false
      }

      // Build slides with final duration
      const finalSlides = buildSlides(lyrics, config.linesPerSlide, audioDur)

      setRecordState("recording")
      recorder.start(1000)
      source2.start()

      const startTime = performance.now()

      const animate = () => {
        if (!recordingRef.current) { recorder.stop(); return }
        const elapsed  = (performance.now() - startTime) / 1000
        const progress = Math.min(elapsed / audioDur, 1)
        setRecordProgress(Math.round(progress * 100))

        const { slide, slideProgress } = (() => {
          const idx = finalSlides.findIndex((s) => elapsed >= s.startSec && elapsed < s.endSec)
          if (idx === -1) {
            const last = finalSlides.at(-1)
            return { slide: last ?? null, slideProgress: 1 }
          }
          const s = finalSlides[idx]
          return { slide: s, slideProgress: (elapsed - s.startSec) / Math.max(0.001, s.endSec - s.startSec) }
        })()

        renderFrame(recCtx, img, slide, config, progress, slideProgress)

        if (progress < 1) { requestAnimationFrame(animate) } else { recorder.stop() }
      }

      requestAnimationFrame(animate)

      await new Promise<void>((res) => {
        const t = setInterval(() => { if (!recordingRef.current) { clearInterval(t); res() } }, 500)
        setTimeout(() => { clearInterval(t); if (recordingRef.current) recorder.stop(); res() }, (audioDur + 3) * 1000)
      })
    } catch (err) {
      console.error("[LyricVideo]", err)
      setRecordState("error")
      recordingRef.current = false
      toast.error(err instanceof Error ? err.message : "Video creation failed")
    }
  }, [audioUrl, bgImageUrl, lyrics, config])

  const downloadVideo = useCallback(() => {
    if (!videoBlob) return
    const url = URL.createObjectURL(videoBlob)
    const a   = document.createElement("a")
    a.href     = url
    a.download = `${songTitle.replace(/\s+/g, "-")}-lyric-video.webm`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [videoBlob, songTitle])

  const cfg = (patch: Partial<VideoConfig>) => setConfig((c) => ({ ...c, ...patch }))

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Background image row */}
      <div className="flex gap-2 flex-wrap">
        {bgImageUrl ? (
          <div className="relative w-32 h-18 rounded overflow-hidden border border-border/60 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bgImageUrl} alt="bg" className="w-full h-full object-cover" />
            <button
              type="button" onClick={() => setBgImageUrl(null)}
              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
            >✕</button>
          </div>
        ) : (
          <div className="w-32 h-18 rounded border border-dashed border-border/60 bg-muted/30 flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex flex-col gap-1.5 justify-center">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 w-fit"
            onClick={generateBgImage} disabled={isGenImg}
          >
            {isGenImg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-violet-400" />}
            {isGenImg ? "Generating…" : "AI Background"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 w-fit"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-3 h-3" />Upload Image
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
        </div>
      </div>

      {/* Canvas preview */}
      <div className="relative rounded-lg overflow-hidden border border-border/60 bg-black aspect-video">
        <canvas
          ref={previewCanvasRef}
          width={960}
          height={540}
          className="w-full h-full"
        />
        {/* Slide indicator */}
        <div className="absolute bottom-3 right-3 flex gap-1">
          {slides.slice(0, Math.min(slides.length, 12)).map((_, i) => (
            <button
              key={i} type="button"
              onClick={() => setPreviewSlideIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === previewSlideIdx ? "bg-white w-4" : "bg-white/40"}`}
            />
          ))}
        </div>
        {/* Preview nav */}
        <div className="absolute top-2 left-2 flex gap-1">
          <button type="button" onClick={() => setPreviewSlideIdx(Math.max(0, previewSlideIdx - 1))}
            className="px-2 py-0.5 text-[10px] bg-black/50 text-white rounded hover:bg-black/70">←</button>
          <button type="button" onClick={() => setPreviewSlideIdx(Math.min(slides.length - 1, previewSlideIdx + 1))}
            className="px-2 py-0.5 text-[10px] bg-black/50 text-white rounded hover:bg-black/70">→</button>
          <span className="px-2 py-0.5 text-[10px] bg-black/40 text-white/70 rounded">
            {previewSlideIdx + 1}/{slides.length}
          </span>
        </div>
      </div>

      {/* Style config */}
      <div className="space-y-2">
        <button type="button" onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Text Style
          {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showConfig && (
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-4">
              {/* Font family */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Type className="w-3 h-3" />Font</Label>
                <div className="flex flex-wrap gap-1.5">
                  {FONTS.map((f) => (
                    <PillBtn key={f.value} active={config.fontFamily === f.value} onClick={() => cfg({ fontFamily: f.value })}>
                      {f.label}
                    </PillBtn>
                  ))}
                </div>
              </div>

              {/* Effect */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Text Effect</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(["fade","slide-up","typewriter","pop","static"] as TextEffect[]).map((e) => (
                    <PillBtn key={e} active={config.effect === e} onClick={() => cfg({ effect: e })}>
                      {e.charAt(0).toUpperCase() + e.slice(1)}
                    </PillBtn>
                  ))}
                </div>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Position</Label>
                <div className="flex gap-1.5">
                  {(["top","center","bottom"] as TextPosition[]).map((p) => (
                    <PillBtn key={p} active={config.textPosition === p} onClick={() => cfg({ textPosition: p })}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </PillBtn>
                  ))}
                </div>
              </div>

              {/* Font size + color */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Font Size: {config.fontSize}px</Label>
                  <Slider
                    value={[config.fontSize]} min={28} max={100} step={2}
                    onValueChange={([v]) => cfg({ fontSize: v })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Lines/Slide: {config.linesPerSlide}</Label>
                  <Slider
                    value={[config.linesPerSlide]} min={1} max={4} step={1}
                    onValueChange={([v]) => cfg({ linesPerSlide: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Text Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={config.textColor}
                      onChange={(e) => cfg({ textColor: e.target.value })}
                      className="w-8 h-8 rounded border border-border/60 cursor-pointer bg-transparent"
                    />
                    <Input value={config.textColor} onChange={(e) => cfg({ textColor: e.target.value })}
                      className="h-8 text-xs font-mono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Gradient: {Math.round(config.gradientOpacity * 100)}%</Label>
                  <Slider
                    value={[config.gradientOpacity]} min={0} max={1} step={0.05}
                    onValueChange={([v]) => cfg({ gradientOpacity: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Timing editor */}
      {slides.length > 0 && (
        <div className="space-y-2">
          <button type="button" onClick={() => setShowTiming(!showTiming)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Lyric Timing ({slides.length} slides)
            {showTiming ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showTiming && (
            <Card className="border-border/60">
              <CardContent className="p-3 space-y-1.5 max-h-64 overflow-y-auto">
                {slides.map((slide, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <button type="button" onClick={() => setPreviewSlideIdx(i)}
                      className="w-5 h-5 rounded bg-muted text-muted-foreground hover:bg-violet-500/15 hover:text-violet-400 text-[10px] shrink-0 flex items-center justify-center"
                    >{i + 1}</button>
                    <span className="flex-1 truncate text-foreground/80">{slide.lines.join(" / ")}</span>
                    <input
                      type="number" step="0.1" min={0}
                      value={slide.startSec.toFixed(1)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        setSlides((prev) => prev.map((s, j) => j === i ? { ...s, startSec: v } : s))
                      }}
                      className="w-16 h-6 bg-muted/50 border border-border/60 rounded px-1.5 text-[10px] font-mono text-right"
                    />
                    <span className="text-muted-foreground">→</span>
                    <input
                      type="number" step="0.1" min={0}
                      value={slide.endSec.toFixed(1)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        setSlides((prev) => prev.map((s, j) => j === i ? { ...s, endSec: v } : s))
                      }}
                      className="w-16 h-6 bg-muted/50 border border-border/60 rounded px-1.5 text-[10px] font-mono text-right"
                    />
                  </div>
                ))}
                <button type="button"
                  onClick={() => setSlides(buildSlides(lyrics, config.linesPerSlide, duration))}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >↺ Auto-redistribute</button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Record error */}
      {recordState === "error" && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Video creation failed. Try again or use a different browser.
        </div>
      )}

      {/* Recording progress */}
      {(recordState === "preparing" || recordState === "recording") && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {recordState === "preparing" ? "Preparing audio…" : `Recording ${recordProgress}%`}
            </span>
            <button type="button" onClick={() => { recordingRef.current = false }}
              className="text-destructive hover:underline">Stop</button>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="h-full bg-gradient-to-r from-violet-500 to-teal-500 rounded-full transition-all"
              style={{ width: `${recordProgress}%` }} />
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="flex flex-wrap gap-2">
        {audioUrl && (
          <Button size="sm" variant="outline" className="gap-1.5"
            onClick={isPreview ? stopPreview : startPreview}
          >
            {isPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPreview ? "Stop Preview" : "Preview"}
          </Button>
        )}

        {recordState === "idle" || recordState === "error" ? (
          <Button size="sm" variant="gradient" className="gap-1.5"
            onClick={recordVideo}
            disabled={!audioUrl || recordState === "preparing"}
          >
            <Film className="w-3.5 h-3.5" />Create Video
          </Button>
        ) : recordState === "done" ? (
          <>
            <Button size="sm" variant="gradient" className="gap-1.5" onClick={downloadVideo}>
              <Download className="w-3.5 h-3.5" />Download WebM
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={recordVideo}>
              <RefreshCw className="w-3.5 h-3.5" />Re-record
            </Button>
          </>
        ) : null}
      </div>

      {recordState === "done" && (
        <p className="text-xs text-muted-foreground">
          WebM format is compatible with CapCut, DaVinci Resolve, and most editors.
          Open CapCut → Import → select the .webm file to continue editing.
        </p>
      )}
    </div>
  )
}
