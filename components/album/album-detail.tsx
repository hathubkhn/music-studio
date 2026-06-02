"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Disc3, Music2, Play, Pause, Download, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Clock, Package, Film, X, Image as ImageIcon,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { LyricVideoCreator } from "@/components/create-flow/lyric-video-creator"
import { TrackImageEditor }  from "./track-image-editor"
import { AlbumVideoCreator } from "./album-video-creator"
import { DEFAULT_VIDEO_CONFIG } from "./album-video-utils"

type Track = {
  id:           string
  order:        number
  title:        string
  description:  string | null
  lyrics:       string | null
  stylePrompt:  string | null
  audioUrl:     string | null
  thumbnailUrl: string | null
  status:       string
  duration:     number | null
}

type Album = {
  id:           string
  title:        string
  theme:        string | null
  genre:        string | null
  mood:         string | null
  language:     string
  stylePrompt:  string | null
  status:       string
  updatedAt:    Date
  tracks:       Track[]
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
  const [tracks, setTracks]             = useState<Track[]>(album.tracks)
  const [expandedTrack, setExpanded]    = useState<string | null>(null)
  const [imageTrackId, setImageTrackId] = useState<string | null>(null)
  const [videoTrackId, setVideoTrackId] = useState<string | null>(null)
  const [playingTrackId, setPlaying]    = useState<string | null>(null)
  const [showAlbumVideo, setShowAlbumVideo] = useState(false)
  const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map())

  const completedTracks = tracks.filter((t) => t.status === "COMPLETED")
  const cfg = STATUS_CFG[album.status] ?? STATUS_CFG.DRAFT

  const updateThumbnail = (trackId: string, url: string) => {
    setTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, thumbnailUrl: url || null } : t))
  }

  const togglePlay = (trackId: string, url: string) => {
    if (playingTrackId === trackId) {
      audioEls.current.get(trackId)?.pause()
      setPlaying(null)
      return
    }
    if (playingTrackId) audioEls.current.get(playingTrackId)?.pause()
    let el = audioEls.current.get(trackId)
    if (!el) {
      el = new Audio(url)
      el.onended = () => setPlaying(null)
      audioEls.current.set(trackId, el)
    }
    el.play()
    setPlaying(trackId)
  }

  const proxyDownloadUrl = (audioUrl: string, filename: string) => {
    const safe = filename.replace(/[^\w.\- ]/g, "_")
    return `/api/proxy/audio?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(safe)}&download=1`
  }

  const downloadAll = () => {
    completedTracks.forEach((track, i) => {
      if (!track.audioUrl) return
      const filename = `${String(track.order).padStart(2, "0")}-${track.title}.mp3`
      // Stagger downloads slightly so browser doesn't block multiple simultaneous saves
      setTimeout(() => {
        const a = document.createElement("a")
        a.href     = proxyDownloadUrl(track.audioUrl!, filename)
        a.download = filename
        a.click()
      }, i * 800)
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
            <div className="flex items-center gap-2 shrink-0">
              {completedTracks.length > 0 && (
                <Button variant="outline" className="gap-2" onClick={downloadAll}>
                  <Package className="w-4 h-4" />Download All ({completedTracks.length})
                </Button>
              )}
            </div>
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
              <span>{completedTracks.length} of {tracks.length} tracks ready</span>
              <span>{Math.round((completedTracks.length / tracks.length) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-teal-500 rounded-full transition-all"
                style={{ width: `${(completedTracks.length / tracks.length) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Track list */}
      <div>
        <h2 className="text-base font-semibold mb-3">Track List</h2>
        <div className="space-y-2">
          {tracks.map((track) => {
            const isExpanded   = expandedTrack === track.id
            const isImageOpen  = imageTrackId  === track.id
            const isVideoOpen  = videoTrackId  === track.id
            const isPlaying    = playingTrackId === track.id
            const trackCfg     = TRACK_STATUS_CFG[track.status] ?? TRACK_STATUS_CFG.PENDING

            return (
              <Card key={track.id} className={`border-border/60 overflow-hidden transition-all ${
                track.status === "COMPLETED"
                  ? "border-teal-500/20"
                  : track.status === "FAILED"
                  ? "border-destructive/20"
                  : ""
              }`}>
                {/* Header row */}
                <div className="flex items-center gap-3 p-3">
                  {track.audioUrl ? (
                    <button type="button"
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

                  {/* Thumbnail mini */}
                  {track.thumbnailUrl ? (
                    <div className="w-10 h-10 rounded overflow-hidden border border-border/40 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={track.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded border border-dashed border-border/40 bg-muted/30 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4 text-muted-foreground/30" />
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

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Image editor toggle */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-400 hover:bg-amber-500/10"
                      title="Edit thumbnail"
                      onClick={() => setImageTrackId(isImageOpen ? null : track.id)}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                    </Button>

                    {track.audioUrl && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-violet-400 hover:bg-violet-500/10"
                          title="Create lyric video"
                          onClick={() => setVideoTrackId(isVideoOpen ? null : track.id)}
                        >
                          <Film className="w-3.5 h-3.5" />
                        </Button>
                        <a
                          href={proxyDownloadUrl(track.audioUrl!, `${String(track.order).padStart(2, "0")}-${track.title}.mp3`)}
                          download={`${String(track.order).padStart(2, "0")}-${track.title}.mp3`}
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      </>
                    )}
                    {track.lyrics && (
                      <button type="button"
                        onClick={() => setExpanded(isExpanded ? null : track.id)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Image editor panel */}
                {isImageOpen && (
                  <CardContent className="px-4 pb-4 pt-0 border-t border-amber-500/20 bg-amber-500/3">
                    <div className="flex items-center justify-between mb-3 pt-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-amber-400" />
                        Thumbnail — {track.title}
                      </p>
                      <button type="button" onClick={() => setImageTrackId(null)}
                        className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <TrackImageEditor
                      albumId={album.id}
                      trackId={track.id}
                      trackTitle={track.title}
                      lyrics={track.lyrics}
                      stylePrompt={track.stylePrompt}
                      albumTheme={album.theme}
                      albumMood={album.mood}
                      albumGenre={album.genre}
                      initialUrl={track.thumbnailUrl}
                      onSaved={(url) => updateThumbnail(track.id, url)}
                    />
                  </CardContent>
                )}

                {/* Lyric Video Creator panel */}
                {isVideoOpen && (
                  <CardContent className="px-4 pb-4 pt-0 border-t border-violet-500/20 bg-violet-500/3">
                    <div className="flex items-center justify-between mb-3 pt-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Film className="w-4 h-4 text-violet-400" />
                        Lyric Video — {track.title}
                      </p>
                      <button type="button" onClick={() => setVideoTrackId(null)}
                        className="text-muted-foreground hover:text-foreground">
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
                      existingImageUrl={track.thumbnailUrl ?? undefined}
                      audioDuration={track.duration ?? undefined}
                    />
                  </CardContent>
                )}

                {/* Expanded lyrics */}
                {isExpanded && track.lyrics && (
                  <CardContent className="px-4 pb-4 pt-0 border-t border-border/40">
                    {track.stylePrompt && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 mb-2">
                        <span className="font-medium">Style:</span> {track.stylePrompt}
                      </p>
                    )}
                    <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {track.lyrics}
                    </pre>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Album Video section */}
      {completedTracks.length > 0 && (
        <div className="space-y-3">
          <button type="button"
            onClick={() => setShowAlbumVideo(!showAlbumVideo)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Film className="w-4 h-4 text-violet-400" />
            Full Album Video
            {showAlbumVideo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAlbumVideo && (
            <AlbumVideoCreator
              tracks={tracks.map((t) => ({
                id:           t.id,
                order:        t.order,
                title:        t.title,
                audioUrl:     t.audioUrl,
                thumbnailUrl: t.thumbnailUrl,
                lyrics:       t.lyrics,
                duration:     t.duration,
              }))}
              albumTitle={album.title}
              albumMood={album.mood}
              albumGenre={album.genre}
              videoConfig={DEFAULT_VIDEO_CONFIG}
            />
          )}
        </div>
      )}
    </div>
  )
}
