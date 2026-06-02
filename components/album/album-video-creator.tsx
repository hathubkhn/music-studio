"use client"

/**
 * AlbumVideoCreator
 * ─────────────────
 * Records ALL album tracks sequentially into one continuous WebM video.
 * Each track = image background + lyrics overlay synced to audio.
 * The final blob is downloadable and CapCut-compatible.
 */

import { useState, useRef, useCallback } from "react"
import {
  Film, Download, Loader2, AlertCircle, CheckCircle2, Play,
  RefreshCw, ImageIcon, Music2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { buildSlides, renderFrame, VideoConfig } from "./album-video-utils"

interface TrackInfo {
  id:           string
  order:        number
  title:        string
  audioUrl:     string | null
  thumbnailUrl: string | null
  lyrics:       string | null
  duration?:    number | null
}

interface Props {
  tracks:      TrackInfo[]
  albumTitle:  string
  albumMood?:  string | null
  albumGenre?: string | null
  videoConfig: VideoConfig
}

type Phase =
  | { kind: "idle" }
  | { kind: "loading"; trackIdx: number }
  | { kind: "recording"; trackIdx: number; pct: number }
  | { kind: "done" }
  | { kind: "error"; message: string }

// Load audio buffer and duration
async function loadAudio(url: string): Promise<{ buffer: ArrayBuffer; duration: number }> {
  const res = await fetch(`/api/proxy/audio?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error(`Failed to fetch audio for track`)
  const buffer  = await res.arrayBuffer()
  const audioCtx = new AudioContext()
  const decoded  = await audioCtx.decodeAudioData(buffer.slice(0))
  const duration = decoded.duration
  await audioCtx.close()
  return { buffer, duration }
}

// Load image element with CORS retry
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload  = () => resolve(img)
    img.onerror = () => {
      const img2 = new Image()
      img2.onload  = () => resolve(img2)
      img2.onerror = () => resolve(null)
      img2.src = url
    }
    img.src = url
  })
}

export function AlbumVideoCreator({ tracks, albumTitle, albumMood, albumGenre, videoConfig }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const stopRef = useRef(false)

  const readyTracks = tracks.filter((t) => t.audioUrl)

  const startRecording = useCallback(async () => {
    if (readyTracks.length === 0) {
      toast.error("No tracks with audio ready yet")
      return
    }

    stopRef.current = false
    setVideoBlob(null)

    const W = 1280, H = 720
    const canvas = document.createElement("canvas")
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext("2d")!

    const canvasStream = canvas.captureStream(30)
    const audioCtxMain = new AudioContext()
    const streamDest   = audioCtxMain.createMediaStreamDestination()
    streamDest.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t))

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus" : "video/webm"
    const recorder = new MediaRecorder(canvasStream, { mimeType })
    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      setVideoBlob(new Blob(chunks, { type: mimeType }))
      setPhase({ kind: "done" })
      audioCtxMain.close()
    }

    recorder.start(500)

    try {
      for (let ti = 0; ti < readyTracks.length; ti++) {
        if (stopRef.current) break
        const track = readyTracks[ti]

        setPhase({ kind: "loading", trackIdx: ti })

        const [{ buffer, duration }, img] = await Promise.all([
          loadAudio(track.audioUrl!),
          track.thumbnailUrl ? loadImage(track.thumbnailUrl) : Promise.resolve(null),
        ])

        const slides = buildSlides(track.lyrics ?? "", videoConfig.linesPerSlide, duration)

        // Track title card (2 sec)
        const titleSlide = { lines: [`#${track.order} — ${track.title}`], startSec: 0, endSec: 2 }
        const titleEnd = performance.now() + 2000
        while (performance.now() < titleEnd) {
          renderFrame(ctx, img, titleSlide, videoConfig, 0, 1)
          await new Promise((r) => requestAnimationFrame(r))
        }

        // Stream audio for this track
        const decoded2 = await new Promise<AudioBuffer>((res, rej) => {
          audioCtxMain.decodeAudioData(buffer.slice(0), res, rej)
        })
        const source = audioCtxMain.createBufferSource()
        source.buffer = decoded2
        source.connect(streamDest)
        source.start()

        const trackStart = performance.now()
        setPhase({ kind: "recording", trackIdx: ti, pct: 0 })

        await new Promise<void>((resolve) => {
          let animFrame: number

          const animate = () => {
            if (stopRef.current) { source.stop(); resolve(); return }

            const elapsed = (performance.now() - trackStart) / 1000
            const progress = Math.min(elapsed / duration, 1)

            setPhase({ kind: "recording", trackIdx: ti, pct: Math.round(progress * 100) })

            const idx = slides.findIndex((s) => elapsed >= s.startSec && elapsed < s.endSec)
            const slide = idx >= 0 ? slides[idx] : (slides.at(-1) ?? null)
            const slideProgress = slide && idx >= 0
              ? (elapsed - slide.startSec) / Math.max(0.001, slide.endSec - slide.startSec)
              : 1

            renderFrame(ctx, img, slide, videoConfig, progress, slideProgress)

            if (progress >= 1) { resolve(); return }
            animFrame = requestAnimationFrame(animate)
          }

          animFrame = requestAnimationFrame(animate)
          source.onended = () => { cancelAnimationFrame(animFrame); resolve() }
        })

        // 0.5 s black gap between tracks
        if (ti < readyTracks.length - 1 && !stopRef.current) {
          const gapEnd = performance.now() + 500
          while (performance.now() < gapEnd) {
            ctx.fillStyle = "#000"
            ctx.fillRect(0, 0, W, H)
            await new Promise((r) => requestAnimationFrame(r))
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      console.error("[AlbumVideo]", err)
      setPhase({ kind: "error", message: msg })
      toast.error(msg)
    } finally {
      recorder.stop()
    }
  }, [readyTracks, videoConfig])

  const downloadVideo = useCallback(() => {
    if (!videoBlob) return
    const url = URL.createObjectURL(videoBlob)
    const a   = document.createElement("a")
    a.href     = url
    a.download = `${albumTitle.replace(/\s+/g, "-")}-full-album.webm`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [videoBlob, albumTitle])

  const stop = () => { stopRef.current = true }

  const isRunning = phase.kind === "loading" || phase.kind === "recording"

  return (
    <Card className="border-violet-500/20 bg-violet-500/5">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold text-sm">Album Video</h3>
            <Badge variant="outline" className="text-[10px]">
              {readyTracks.length}/{tracks.length} tracks ready
            </Badge>
          </div>
          {phase.kind === "done" && videoBlob && (
            <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" />Ready to download
            </Badge>
          )}
        </div>

        {/* Track checklist */}
        <div className="space-y-1">
          {tracks.map((t, i) => {
            const isRecordingThis = phase.kind === "recording" && (phase as { kind: "recording"; trackIdx: number; pct: number }).trackIdx === i
            const isLoadingThis   = phase.kind === "loading"   && (phase as { kind: "loading"; trackIdx: number }).trackIdx === i

            return (
              <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-5 text-right font-mono shrink-0">{t.order}.</span>
                {t.thumbnailUrl
                  ? <div className="w-4 h-4 rounded overflow-hidden shrink-0 bg-muted border border-border/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  : <ImageIcon className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                }
                <Music2 className={`w-3.5 h-3.5 shrink-0 ${t.audioUrl ? "text-teal-400" : "text-muted-foreground/30"}`} />
                <span className={`flex-1 truncate ${!t.audioUrl ? "opacity-40" : ""}`}>{t.title}</span>
                {isLoadingThis && <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />}
                {isRecordingThis && (
                  <span className="text-[10px] text-violet-400 shrink-0">
                    {(phase as { kind: "recording"; trackIdx: number; pct: number }).pct}%
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Error */}
        {phase.kind === "error" && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {(phase as { kind: "error"; message: string }).message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {!isRunning && phase.kind !== "done" && (
            <Button size="sm" variant="gradient" className="gap-1.5"
              onClick={startRecording}
              disabled={readyTracks.length === 0}
            >
              <Play className="w-3.5 h-3.5" />
              {phase.kind === "error" ? "Retry" : "Create Album Video"}
            </Button>
          )}

          {isRunning && (
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={stop}>
              Stop Recording
            </Button>
          )}

          {phase.kind === "done" && videoBlob && (
            <>
              <Button size="sm" variant="gradient" className="gap-1.5" onClick={downloadVideo}>
                <Download className="w-3.5 h-3.5" />Download Album Video
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={startRecording}>
                <RefreshCw className="w-3.5 h-3.5" />Re-record
              </Button>
            </>
          )}
        </div>

        {readyTracks.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Generate music for at least one track to enable video creation.
          </p>
        )}

        {phase.kind === "done" && (
          <p className="text-xs text-muted-foreground">
            The WebM file contains all {readyTracks.length} tracks in sequence.
            Import into CapCut, Premiere Pro, or DaVinci Resolve for final editing.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
