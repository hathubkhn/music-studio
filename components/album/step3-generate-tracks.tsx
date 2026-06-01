"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft, Play, Pause, Download, Loader2, CheckCircle2,
  AlertCircle, Zap, Music2, Package, ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import type { AlbumData, AlbumTrack } from "./album-create-flow"

interface Props {
  data: AlbumData
  onChange: (patch: Partial<AlbumData>) => void
  onBack: () => void
  onFinish: (albumId: string) => void
}

type TrackJobState = {
  jobId?: string
  status: "pending" | "generating" | "completed" | "failed"
  audioUrl?: string
  errorMsg?: string
}

export function AlbumGenerate({ data, onChange, onBack, onFinish }: Props) {
  const [albumId, setAlbumId]   = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const [jobs, setJobs] = useState<TrackJobState[]>(
    data.tracks.map((t) => ({ status: t.status ?? "pending", audioUrl: t.audioUrl }))
  )
  const pollTimers = useRef<Map<number, NodeJS.Timeout>>(new Map())
  const [playingIdx, setPlayingIdx] = useState<number | null>(null)
  const audioEls = useRef<Map<number, HTMLAudioElement>>(new Map())

  const completedCount = jobs.filter((j) => j.status === "completed").length
  const failedCount    = jobs.filter((j) => j.status === "failed").length
  const totalProgress  = Math.round((completedCount / data.tracks.length) * 100)
  const allDone        = completedCount + failedCount === data.tracks.length && isStarted

  // ── Save album to DB ──────────────────────────────────────────────────────
  const saveAlbum = useCallback(async () => {
    if (albumId) return albumId
    setIsSaving(true)
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       data.title,
          theme:       data.theme,
          genre:       data.genre,
          mood:        data.mood,
          language:    data.language,
          stylePrompt: data.stylePrompt,
          tracks:      data.tracks.map((t) => ({
            order:       t.order,
            title:       t.title,
            description: t.description,
            lyrics:      t.lyrics,
            stylePrompt: t.stylePrompt,
          })),
        }),
      })
      if (!res.ok) throw new Error()
      const album = await res.json()
      setAlbumId(album.id)
      // Store track DB IDs
      onChange({
        id: album.id,
        tracks: data.tracks.map((t, i) => ({ ...t, id: album.tracks[i]?.id })),
      })
      return album.id as string
    } catch {
      toast.error("Failed to save album to database")
      return null
    } finally {
      setIsSaving(false)
    }
  }, [albumId, data, onChange])

  // ── Update single track in DB ─────────────────────────────────────────────
  const patchTrack = useCallback(async (
    aid: string,
    trackDbId: string,
    patch: Record<string, unknown>
  ) => {
    await fetch(`/api/albums/${aid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track: { id: trackDbId, ...patch } }),
    })
  }, [])

  // ── Poll one track ────────────────────────────────────────────────────────
  const startPolling = useCallback((trackIdx: number, jobId: string, aid: string, trackDbId: string) => {
    const timer = setInterval(async () => {
      try {
        const res    = await fetch(`/api/kie/suno/status?jobId=${jobId}`)
        const result = await res.json()

        if (result.status === "completed" && result.result?.[0]?.url) {
          clearInterval(timer)
          pollTimers.current.delete(trackIdx)
          const url = result.result[0].url
          setJobs((prev) => {
            const next = [...prev]
            next[trackIdx] = { ...next[trackIdx], status: "completed", audioUrl: url }
            return next
          })
          onChange({
            tracks: data.tracks.map((t, i) =>
              i === trackIdx ? { ...t, status: "completed", audioUrl: url } : t
            ),
          })
          await patchTrack(aid, trackDbId, { status: "COMPLETED", audioUrl: url })
          toast.success(`Track ${trackIdx + 1}: "${data.tracks[trackIdx].title}" done!`)
        } else if (result.status === "failed") {
          clearInterval(timer)
          pollTimers.current.delete(trackIdx)
          setJobs((prev) => {
            const next = [...prev]
            next[trackIdx] = { ...next[trackIdx], status: "failed", errorMsg: "Generation failed" }
            return next
          })
          await patchTrack(aid, trackDbId, { status: "FAILED" })
        }
      } catch { /* keep polling */ }
    }, 4000)
    pollTimers.current.set(trackIdx, timer)
  }, [data.tracks, onChange, patchTrack])

  // ── Generate one track ────────────────────────────────────────────────────
  const generateTrack = useCallback(async (
    trackIdx: number,
    aid: string,
    trackDbId: string
  ) => {
    const track = data.tracks[trackIdx]
    setJobs((prev) => {
      const next = [...prev]
      next[trackIdx] = { ...next[trackIdx], status: "generating" }
      return next
    })
    await patchTrack(aid, trackDbId, { status: "GENERATING" })
    try {
      const res = await fetch("/api/kie/suno/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       track.title,
          lyrics:      track.lyrics ?? "",
          stylePrompt: track.stylePrompt ?? data.stylePrompt,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      const { taskId } = await res.json()
      setJobs((prev) => {
        const next = [...prev]
        next[trackIdx] = { ...next[trackIdx], jobId: taskId }
        return next
      })
      await patchTrack(aid, trackDbId, { audioJobId: taskId })
      startPolling(trackIdx, taskId, aid, trackDbId)
    } catch (err) {
      setJobs((prev) => {
        const next = [...prev]
        next[trackIdx] = { ...next[trackIdx], status: "failed", errorMsg: err instanceof Error ? err.message : "Failed" }
        return next
      })
      await patchTrack(aid, trackDbId, { status: "FAILED" })
    }
  }, [data, patchTrack, startPolling])

  // ── Start all tracks ──────────────────────────────────────────────────────
  const startGeneration = useCallback(async () => {
    setIsStarted(true)
    const aid = await saveAlbum()
    if (!aid) return

    const albumRes = await fetch(`/api/albums/${aid}`)
    const albumDB  = await albumRes.json()
    const dbTracks = albumDB.tracks as { id: string }[]

    // Generate 2 at a time to avoid rate limits
    const CONCURRENCY = 2
    for (let i = 0; i < data.tracks.length; i += CONCURRENCY) {
      const batch = data.tracks.slice(i, i + CONCURRENCY)
      await Promise.all(
        batch.map((_, bi) => {
          const idx = i + bi
          return generateTrack(idx, aid, dbTracks[idx]?.id)
        })
      )
      // Small delay between batches
      if (i + CONCURRENCY < data.tracks.length) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }, [data.tracks, saveAlbum, generateTrack])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollTimers.current.forEach((t) => clearInterval(t))
    }
  }, [])

  // ── Audio playback ────────────────────────────────────────────────────────
  const togglePlay = (idx: number, url: string) => {
    if (playingIdx === idx) {
      audioEls.current.get(idx)?.pause()
      setPlayingIdx(null)
      return
    }
    if (playingIdx !== null) {
      audioEls.current.get(playingIdx)?.pause()
    }
    let el = audioEls.current.get(idx)
    if (!el) {
      el = new Audio(url)
      el.onended = () => setPlayingIdx(null)
      audioEls.current.set(idx, el)
    }
    el.play()
    setPlayingIdx(idx)
  }

  const statusIcon = (job: TrackJobState) => {
    if (job.status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    if (job.status === "failed")    return <AlertCircle  className="w-4 h-4 text-destructive" />
    if (job.status === "generating")return <Loader2      className="w-4 h-4 text-amber-400 animate-spin" />
    return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Generate Music — {data.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {!isStarted
              ? `Ready to generate ${data.tracks.length} tracks. Generation runs 2 at a time.`
              : `${completedCount}/${data.tracks.length} tracks completed`}
          </p>
        </div>
        {isStarted && (
          <Badge className={`gap-1.5 ${allDone ? "bg-teal-500/15 text-teal-400 border-teal-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`}>
            {allDone ? <CheckCircle2 className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
            {allDone ? "All done" : "Generating…"}
          </Badge>
        )}
      </div>

      {/* Overall progress */}
      {isStarted && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedCount} of {data.tracks.length} tracks complete</span>
            <span>{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
          {failedCount > 0 && (
            <p className="text-xs text-destructive">{failedCount} track(s) failed — you can retry individually</p>
          )}
        </div>
      )}

      {/* Track list with status */}
      <div className="space-y-2">
        {data.tracks.map((track, i) => {
          const job = jobs[i]
          return (
            <Card key={i} className={`border-border/60 transition-all ${job.status === "completed" ? "border-emerald-500/20" : job.status === "generating" ? "border-amber-500/20" : ""}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                {statusIcon(job)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{track.title}</p>
                  {track.description && (
                    <p className="text-xs text-muted-foreground truncate">{track.description}</p>
                  )}
                  {job.status === "generating" && (
                    <p className="text-xs text-amber-400 mt-0.5">Generating via Suno… (~2 min)</p>
                  )}
                  {job.status === "failed" && (
                    <p className="text-xs text-destructive mt-0.5">{job.errorMsg}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {job.status === "failed" && albumId && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => {
                        const dbTrackId = data.tracks[i].id
                        if (dbTrackId) generateTrack(i, albumId, dbTrackId)
                      }}
                    >
                      Retry
                    </Button>
                  )}
                  {job.audioUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => togglePlay(i, job.audioUrl!)}
                        className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                      >
                        {playingIdx === i ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      <a href={job.audioUrl} download={`${track.title}.mp3`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={isStarted && !allDone} className="gap-2">
          <ArrowLeft className="w-4 h-4" />Back
        </Button>

        <div className="flex items-center gap-3">
          {!isStarted ? (
            <Button variant="gradient" onClick={startGeneration} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {isSaving ? "Saving…" : `Generate ${data.tracks.length} Tracks`}
            </Button>
          ) : allDone ? (
            <>
              {albumId && (
                <>
                  <a href={`/albums/${albumId}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="gap-2">
                      <ExternalLink className="w-4 h-4" />View Album
                    </Button>
                  </a>
                  <Button variant="gradient" onClick={() => onFinish(albumId)} className="gap-2">
                    <Package className="w-4 h-4" />Go to Album
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button disabled variant="gradient" className="gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating {completedCount}/{data.tracks.length}…
            </Button>
          )}
        </div>
      </div>

      {/* Cost note */}
      {!isStarted && (
        <p className="text-xs text-muted-foreground text-center">
          Est. cost: {data.tracks.length} tracks × $0.05 ≈ <strong className="text-foreground">${(data.tracks.length * 0.05).toFixed(2)}</strong>
        </p>
      )}
    </div>
  )
}
