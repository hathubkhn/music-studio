"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Disc3, Music2, Play, Pause, Download, ChevronDown,
  ChevronUp, CheckCircle2, AlertCircle, Clock, Package, Film, X
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { LyricVideoCreator } from "@/components/create-flow/lyric-video-creator"

type Track = {
  id: string
  order: number
  title: string
  description: string | null
  lyrics: string | null
  stylePrompt: string | null
  audioUrl: string | null
  status: string
  duration: number | null
}

type Album = {
  id: string
  title: string
  theme: string | null
  genre: string | null
  mood: string | null
  language: string
  stylePrompt: string | null
  status: string
  updatedAt: Date
  tracks: Track[]
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  DRAFT:      { label: "Draft",      color: "bg-muted text-muted-foreground" },
  GENERATING: { label: "Generating", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  COMPLETED:  { label: "Completed",  color: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
}

const TRACK_STATUS_CFG: Record<string, { label: string; color: string }> = {
  PENDING:    { label: "Pending",    color: "bg-muted text-muted-foreground" },
  GENERATING: { label: "Generating", color: "bg-amber-500/15 text-amber-400" },
  COMPLETED:  { label: "Done",       color: "bg-teal-500/15 text-teal-400" },
  FAILED:     { label: "Failed",     color: "bg-destructive/15 text-destructive" },
}

export function AlbumDetail({ album }: { album: Album }) {
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null)
  const [videoTrackId, setVideoTrackId]   = useState<string | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map())

  const completedTracks = album.tracks.filter((t) => t.status === "COMPLETED")
  const cfg = STATUS_CFG[album.status] ?? STATUS_CFG.DRAFT

  const togglePlay = (trackId: string, url: string) => {
    if (playingTrackId === trackId) {
      audioEls.current.get(trackId)?.pause()
      setPlayingTrackId(null)
      return
    }
    if (playingTrackId) audioEls.current.get(playingTrackId)?.pause()

    let el = audioEls.current.get(trackId)
    if (!el) {
      el = new Audio(url)
      el.onended = () => setPlayingTrackId(null)
      audioEls.current.set(trackId, el)
    }
    el.play()
    setPlayingTrackId(trackId)
  }

  const downloadAll = () => {
    completedTracks.forEach((track) => {
      if (!track.audioUrl) return
      const a = document.createElement("a")
      a.href     = track.audioUrl
      a.download = `${String(track.order).padStart(2, "0")}-${track.title}.mp3`
      a.click()
    })
  }

  return (
    <div className="space-y-6">
      {/* Album header */}
      <Card className="border-border/60 bg-gradient-to-br from-violet-500/5 to-background">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center">
                <Disc3 className="w-7 h-7 text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-2xl font-bold">{album.title}</h1>
                  <Badge className={cfg.color}>{cfg.label}</Badge>
                </div>
                {album.theme && (
                  <p className="text-sm text-muted-foreground max-w-xl">{album.theme}</p>
                )}
              </div>
            </div>
            {completedTracks.length > 0 && (
              <Button variant="outline" className="gap-2 shrink-0" onClick={downloadAll}>
                <Package className="w-4 h-4" />Download All ({completedTracks.length})
              </Button>
            )}
          </div>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2">
            {album.genre && <Badge variant="outline" className="gap-1"><Music2 className="w-3 h-3" />{album.genre}</Badge>}
            {album.mood  && <Badge variant="outline">{album.mood}</Badge>}
            {album.language && <Badge variant="outline">{album.language}</Badge>}
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              Updated {formatDistanceToNow(new Date(album.updatedAt), { addSuffix: true })}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{completedTracks.length} of {album.tracks.length} tracks ready</span>
              <span>{Math.round((completedTracks.length / album.tracks.length) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-teal-500 rounded-full transition-all"
                style={{ width: `${(completedTracks.length / album.tracks.length) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Track list */}
      <div>
        <h2 className="text-base font-semibold mb-3">Track List</h2>
        <div className="space-y-2">
          {album.tracks.map((track) => {
            const isExpanded   = expandedTrack === track.id
            const isPlaying    = playingTrackId === track.id
            const trackCfg     = TRACK_STATUS_CFG[track.status] ?? TRACK_STATUS_CFG.PENDING

            return (
              <Card key={track.id} className={`border-border/60 overflow-hidden transition-all ${track.status === "COMPLETED" ? "border-teal-500/20" : track.status === "FAILED" ? "border-destructive/20" : ""}`}>
                {/* Header row */}
                <div className="flex items-center gap-3 p-3">
                  {/* Play btn or status */}
                  {track.audioUrl ? (
                    <button
                      type="button"
                      onClick={() => togglePlay(track.id, track.audioUrl!)}
                      className="w-8 h-8 rounded-full bg-teal-500/15 flex items-center justify-center text-teal-400 hover:bg-teal-500/25 transition-colors shrink-0"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {track.status === "COMPLETED"
                        ? <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        : track.status === "FAILED"
                        ? <AlertCircle className="w-4 h-4 text-destructive" />
                        : <span className="text-xs font-bold text-muted-foreground">{track.order}</span>}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">#{track.order}</span>
                      <p className="font-medium text-sm truncate">{track.title}</p>
                      <Badge className={`text-[10px] shrink-0 ${trackCfg.color}`}>{trackCfg.label}</Badge>
                    </div>
                    {track.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{track.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {track.audioUrl && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-violet-400 hover:bg-violet-500/10"
                        title="Create lyric video"
                        onClick={() => setVideoTrackId(videoTrackId === track.id ? null : track.id)}
                      >
                        <Film className="w-3.5 h-3.5" />
                      </Button>
                      <a href={track.audioUrl} download={`${String(track.order).padStart(2, "0")}-${track.title}.mp3`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </>
                  )}
                    {track.lyrics && (
                      <button
                        type="button"
                        onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Lyric Video Creator */}
                {videoTrackId === track.id && (
                  <CardContent className="px-4 pb-4 pt-0 border-t border-violet-500/20 bg-violet-500/3">
                    <div className="flex items-center justify-between mb-3 pt-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Film className="w-4 h-4 text-violet-400" />
                        Lyric Video — {track.title}
                      </p>
                      <button type="button" onClick={() => setVideoTrackId(null)}
                        className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <LyricVideoCreator
                      audioUrl={track.audioUrl ?? undefined}
                      lyrics={track.lyrics ?? ""}
                      songTitle={track.title}
                      mood={album.mood ?? ""}
                      genre={album.genre ?? ""}
                      visualStyle={album.theme ?? ""}
                    />
                  </CardContent>
                )}

                {/* Expanded lyrics */}
                {isExpanded && track.lyrics && (
                  <CardContent className="px-4 pb-4 pt-0 border-t border-border/40">
                    <div className="space-y-2">
                      {track.stylePrompt && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                          <span className="font-medium">Style:</span> {track.stylePrompt}
                        </p>
                      )}
                      <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {track.lyrics}
                      </pre>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Playlist note */}
      {completedTracks.length > 1 && (
        <Card className="border-teal-500/20 bg-teal-500/5">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                {completedTracks.length} tracks ready for video!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download all audio files and combine in your video editor (CapCut, Premiere, DaVinci).
                Est. total duration: {completedTracks.length * 2}–{completedTracks.length * 4} min.
              </p>
            </div>
            <Button variant="gradient" className="gap-2 shrink-0" onClick={downloadAll}>
              <Package className="w-4 h-4" />Download All
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
