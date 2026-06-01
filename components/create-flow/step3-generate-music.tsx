"use client"

import React, { useState, useEffect } from "react"
import {
  Headphones, Loader2, ChevronLeft, Play, Pause,
  Download, RotateCcw, CheckCircle2, AlertCircle, Clock, Sparkles, Pencil
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { ProjectData } from "./create-flow"

interface Props {
  data: Partial<ProjectData>
  onNext: (data: Partial<ProjectData>) => void
  onBack: () => void
}

type JobStatus = "idle" | "queued" | "processing" | "completed" | "failed"

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  idle: { label: "Ready", color: "text-muted-foreground", bg: "bg-muted" },
  queued: { label: "Queued", color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-950" },
  processing: { label: "Generating...", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-950" },
  completed: { label: "Completed", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-950" },
  failed: { label: "Failed", color: "text-destructive", bg: "bg-destructive/10" },
}

export function Step3GenerateMusic({ data, onNext, onBack }: Props) {
  const [status, setStatus] = useState<JobStatus>("idle")
  const [jobId, setJobId] = useState<string | null>(data.musicJobId || null)
  const [audioUrl, setAudioUrl] = useState<string | null>(data.audioUrl || null)
  // Store Kie track-level ID and duration for replace-section / translate features
  const [audioId, setAudioId]       = useState<string | null>(data.musicAudioId || null)
  const [audioDuration, setAudioDuration] = useState<number | null>(data.musicDuration || null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Timestamp when generation started (for timeout detection)
  const genStartRef = React.useRef<number | null>(null)

  // Editable fields — user can adjust before generating
  const [localTitle, setLocalTitle]           = useState(data.title || "")
  const [localStylePrompt, setLocalStylePrompt] = useState(data.stylePrompt || "")

  useEffect(() => {
    if (data.audioUrl) {
      setStatus("completed")
      setAudioUrl(data.audioUrl)
    }
  }, [])

  // Poll job status
  useEffect(() => {
    if (!jobId || status === "completed" || status === "failed") return

    const TIMEOUT_MS = 5 * 60 * 1000  // 5-minute hard timeout
    if (!genStartRef.current) genStartRef.current = Date.now()

    const interval = setInterval(async () => {
      // Hard timeout guard — Kie.ai sometimes gets stuck without ever failing
      if (Date.now() - (genStartRef.current ?? 0) > TIMEOUT_MS) {
        clearInterval(interval)
        setStatus("failed")
        setErrorMessage("Generation timed out after 5 minutes. Please try again.")
        toast.error("Generation timed out")
        return
      }

      try {
        const res = await fetch(`/api/kie/suno/status?jobId=${jobId}`)
        const result = await res.json()

        if (result.status === "completed" && result.result?.[0]?.url) {
          setStatus("completed")
          setAudioUrl(result.result[0].url)
          setAudioId(result.result[0].id ?? null)
          setAudioDuration(result.result[0].duration ?? null)
          setProgress(100)
          setErrorMessage(null)
          clearInterval(interval)
          toast.success("Music generated successfully!")
        } else if (result.status === "failed" || result.error) {
          // Catch both explicit "failed" status AND error messages during "processing"
          // (e.g. Kie.ai copyright rejection: "This audio matches an existing recording")
          setStatus("failed")
          setErrorMessage(result.error || "Generation failed")
          clearInterval(interval)
          toast.error(result.error || "Music generation failed")
        } else {
          setStatus("processing")
          setProgress((p) => Math.min(p + 8, 90))
        }
      } catch {
        // network error — keep polling, timeout will eventually catch it
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [jobId, status])

  // Detect generation mode
  const isCoverMode  = Boolean(data.referenceAudioUrl)
  const isMashupMode = Boolean(data.mashupAudio1Url && data.mashupAudio2Url)

  async function generateMusic() {
    setStatus("queued")
    setProgress(5)
    setErrorMessage(null)
    genStartRef.current = Date.now()
    try {
      let endpoint: string
      let body: Record<string, unknown>

      if (isMashupMode) {
        endpoint = "/api/kie/suno/mashup"
        body = {
          uploadUrl:           data.mashupAudio1Url,
          uploadUrl2:          data.mashupAudio2Url,
          title:               localTitle || data.title,
          lyrics:              data.lyrics,
          stylePrompt:         localStylePrompt,
          audioWeight:         data.audioWeight,
          styleWeight:         data.styleWeight,
          weirdnessConstraint: data.weirdnessConstraint,
          vocalGender:         data.vocalGender,
        }
      } else if (isCoverMode) {
        endpoint = "/api/kie/suno/cover"
        body = {
          uploadUrl:   data.referenceAudioUrl,
          title:       localTitle || data.title,
          lyrics:      data.lyrics,
          stylePrompt: localStylePrompt,
          audioWeight: data.audioWeight,
          styleWeight: data.styleWeight,
          vocalGender: data.vocalGender,
        }
      } else {
        endpoint = "/api/kie/suno/create"
        body = {
          title:       localTitle || data.title,
          lyrics:      data.lyrics,
          stylePrompt: localStylePrompt,
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Request failed")
      }
      const result = await res.json()
      setJobId(result.taskId)
      setStatus("processing")
      setProgress(20)
      toast.info(
        isMashupMode
          ? "Mashup generation started — blending both tracks. This takes 1-3 min…"
          : isCoverMode
          ? "Cover generation started — melody preserved, new lyrics incoming. This takes 1-3 min…"
          : "Music generation started. This takes 1-3 minutes..."
      )
    } catch (err) {
      setStatus("failed")
      toast.error(err instanceof Error ? err.message : "Failed to start music generation")
    }
  }

  function togglePlay() {
    if (!audioUrl) return
    if (!audioEl) {
      const audio = new Audio(audioUrl)
      audio.onended = () => setIsPlaying(false)
      audio.play()
      setAudioEl(audio)
      setIsPlaying(true)
    } else {
      if (isPlaying) {
        audioEl.pause()
        setIsPlaying(false)
      } else {
        audioEl.play()
        setIsPlaying(true)
      }
    }
  }

  const statusCfg = STATUS_CONFIG[status]

  return (
    <div className="space-y-6">
      {/* Preview card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              {isCoverMode ? "Cover Generation" : "Music Generation"}
            </span>
            <Badge className={`${statusCfg.bg} ${statusCfg.color} border-0`}>
              {status === "processing" && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {statusCfg.label}
            </Badge>
          </CardTitle>
          <CardDescription>
            {isCoverMode
              ? "Suno will keep the melody of the reference audio and sing your new lyrics over it"
              : "Review the final Suno request before generating"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCoverMode && (
            <div className="p-3 rounded-lg bg-teal-500/5 border border-teal-500/20 space-y-1">
              <p className="text-xs font-medium text-teal-400 uppercase tracking-wide">Reference Audio</p>
              <p className="text-xs font-mono text-muted-foreground truncate">{data.referenceAudioUrl}</p>
              <div className="flex gap-3 text-xs text-muted-foreground pt-0.5">
                <span>Melody fidelity: <strong className="text-foreground">{((data.audioWeight ?? 0.8) * 100).toFixed(0)}%</strong></span>
                {data.styleWeight !== undefined && <span>Style weight: <strong className="text-foreground">{(data.styleWeight * 100).toFixed(0)}%</strong></span>}
                {data.vocalGender && <span>Vocal: <strong className="text-foreground">{data.vocalGender === "m" ? "Male" : "Female"}</strong></span>}
              </div>
            </div>
          )}
          <div className="grid gap-3">
            {/* Editable title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                Title <Pencil className="w-3 h-3" />
              </Label>
              <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder="Song title..."
                className="h-9"
                disabled={status === "queued" || status === "processing"}
              />
            </div>

            {/* Editable style prompt — shown for both normal and cover mode */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                Style Prompt <Pencil className="w-3 h-3" />
                {isCoverMode && (
                  <span className="normal-case font-normal text-muted-foreground ml-1">(optional in Cover Mode)</span>
                )}
              </Label>
              <Textarea
                value={localStylePrompt}
                onChange={(e) => setLocalStylePrompt(e.target.value)}
                placeholder="e.g. pop, sad, upbeat, guitar, male vocal, 80s reverb..."
                rows={2}
                className="text-sm resize-none"
                disabled={status === "queued" || status === "processing"}
              />
              <p className="text-[10px] text-muted-foreground">
                Describe genre, mood, instruments, tempo, vocal style — comma separated
              </p>
            </div>

            {/* Lyrics preview (read-only) */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lyrics Preview</p>
                {data.lyrics && (
                  <span className={`text-xs font-mono ${data.lyrics.length > 2800 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {data.lyrics.length} / 3000 chars
                    {data.lyrics.length > 3000 && " — will be truncated"}
                  </span>
                )}
              </div>
              <p className="text-sm line-clamp-4 font-mono">{data.lyrics?.slice(0, 200) ?? "No lyrics yet"}...</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Est. 1-3 minutes
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              {isCoverMode ? "Cover (upload-cover)" : "Model: suno-v4"}
            </span>
          </div>

          {(status === "queued" || status === "processing") && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Generating your song...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio player */}
      {audioUrl && (
        <Card className="border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-white shadow-lg hover:opacity-90 transition-opacity shrink-0"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </button>
              <div className="flex-1">
                <p className="font-semibold">{data.title}</p>
                <p className="text-sm text-muted-foreground">{data.stylePrompt?.slice(0, 60)}...</p>
                <div className="mt-2 h-1.5 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-1/3 rounded-full" />
                </div>
              </div>
              <a href={audioUrl} download={`${data.title}.mp3`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "failed" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Generation failed</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {errorMessage ?? "Please try again or check your API configuration"}
              </p>
              {errorMessage?.toLowerCase().includes("matches an existing recording") && (
                <p className="text-xs text-amber-400 mt-1">
                  Kie.ai blocked this audio because it matches a copyrighted recording in their catalog.
                  Try uploading a different reference audio or switching to a regular generate without cover mode.
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={generateMusic} className="ml-auto gap-1.5 shrink-0">
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action bar */}
      <div className="sticky bottom-0 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-4 bg-background/95 backdrop-blur border-t flex items-center justify-between gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {status === "idle" && (
            <>
              <Badge variant="outline" className="text-xs gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Est. $0.05/track
              </Badge>
              <Button
                variant="gradient"
                onClick={generateMusic}
                className="gap-2"
              >
                <Headphones className="h-4 w-4" />
                {isCoverMode ? "Generate Cover" : "Generate Music"}
              </Button>
            </>
          )}
          {(status === "queued" || status === "processing") && (
            <Button disabled variant="gradient" className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </Button>
          )}
          {status === "failed" && (
            <Button variant="gradient" onClick={generateMusic} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          {status === "completed" && (
            <>
              <Button
                variant="outline"
                onClick={generateMusic}
                className="gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Regenerate
              </Button>
              <Button
                variant="gradient"
                onClick={() => onNext({
                  title:          localTitle || data.title,
                  stylePrompt:    localStylePrompt || data.stylePrompt,
                  musicJobId:     jobId || undefined,
                  audioUrl:       audioUrl || undefined,
                  musicStatus:    "completed",
                  musicAudioId:   audioId || undefined,
                  musicDuration:  audioDuration || undefined,
                })}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Continue to Storyboard
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
