"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight, ArrowLeft, Wand2, Loader2, Plus, Trash2,
  ChevronDown, ChevronUp, RefreshCw, Music2, GripVertical
} from "lucide-react"
import { toast } from "sonner"
import type { AlbumData, AlbumTrack } from "./album-create-flow"

interface Props {
  data: AlbumData
  onChange: (patch: Partial<AlbumData>) => void
  onNext: () => void
  onBack: () => void
}

export function AlbumTrackList({ data, onChange, onNext, onBack }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null)

  const generateTracks = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/ai/generate-album-tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme:             data.theme,
          genre:             data.genre,
          mood:              data.mood,
          language:          data.language,
          numTracks:         data.numTracks,
          stylePrompt:       data.stylePrompt,
          audience:          data.audience,
          targetDurationMin: data.targetDurationMin,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      const { tracks } = await res.json()
      onChange({
        tracks: (tracks as AlbumTrack[]).map((t, i) => ({
          ...t,
          order:  t.order ?? i + 1,
          status: "pending",
        })),
      })
      toast.success(`Generated ${tracks.length} tracks!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  const updateTrack = (index: number, patch: Partial<AlbumTrack>) => {
    const updated = data.tracks.map((t, i) => (i === index ? { ...t, ...patch } : t))
    onChange({ tracks: updated })
  }

  const addTrack = () => {
    const newTrack: AlbumTrack = {
      order:  data.tracks.length + 1,
      title:  "",
      lyrics: "",
      status: "pending",
    }
    onChange({ tracks: [...data.tracks, newTrack] })
    setExpandedTrack(data.tracks.length)
  }

  const removeTrack = (index: number) => {
    const updated = data.tracks
      .filter((_, i) => i !== index)
      .map((t, i) => ({ ...t, order: i + 1 }))
    onChange({ tracks: updated })
  }

  const canContinue = data.tracks.length >= 2 && data.tracks.every((t) => t.title.trim())
  const totalLyrics = data.tracks.reduce((acc, t) => acc + (t.lyrics?.length ?? 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Music2 className="w-5 h-5 text-violet-400" />
            Track List — {data.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.tracks.length > 0
              ? `${data.tracks.length} tracks ready — review and edit lyrics before generating music`
              : "Click Generate to have AI create all song titles and lyrics for your album"}
          </p>
        </div>
        <Button
          variant={data.tracks.length > 0 ? "outline" : "gradient"}
          onClick={generateTracks}
          disabled={isGenerating}
          className="gap-2 shrink-0"
        >
          {isGenerating
            ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
            : data.tracks.length > 0
            ? <><RefreshCw className="w-4 h-4" />Regenerate All</>
            : <><Wand2 className="w-4 h-4" />Generate with AI</>
          }
        </Button>
      </div>

      {/* Track list */}
      {data.tracks.length === 0 ? (
        <Card className="border-dashed border-violet-500/20 bg-violet-500/3">
          <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Wand2 className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <p className="font-medium">No tracks yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Generate with AI" to create {data.numTracks} songs for "{data.title}"
              </p>
            </div>
            <Button variant="gradient" onClick={generateTracks} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Generate {data.numTracks} Tracks
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.tracks.map((track, i) => {
            const isExpanded = expandedTrack === i
            return (
              <Card key={i} className="border-border/60 overflow-hidden">
                {/* Track header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedTrack(isExpanded ? null : i)}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  <span className="w-7 h-7 rounded-full bg-violet-500/15 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{track.title || "Untitled"}</p>
                    {track.description && (
                      <p className="text-xs text-muted-foreground truncate">{track.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {track.lyrics && (
                      <Badge variant="outline" className="text-[10px] text-teal-400 border-teal-500/30">
                        {track.lyrics.length} chars
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeTrack(i) }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded editor */}
                {isExpanded && (
                  <CardContent className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Title</label>
                        <Input
                          value={track.title}
                          onChange={(e) => updateTrack(i, { title: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Style Override (optional)</label>
                        <Input
                          value={track.stylePrompt ?? data.stylePrompt}
                          onChange={(e) => updateTrack(i, { stylePrompt: e.target.value })}
                          placeholder="Inherits album style..."
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">Lyrics</label>
                        <span className={`text-xs font-mono ${(track.lyrics?.length ?? 0) > 4500 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {track.lyrics?.length ?? 0} / 5000
                        </span>
                      </div>
                      <Textarea
                        value={track.lyrics ?? ""}
                        onChange={(e) => updateTrack(i, { lyrics: e.target.value })}
                        rows={12}
                        className="text-xs font-mono resize-none"
                        placeholder={"[Intro]\n...\n\n[Verse 1]\n...\n\n[Chorus]\n..."}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add track button */}
      {data.tracks.length > 0 && (
        <button
          type="button"
          onClick={addTrack}
          className="w-full py-2.5 rounded-lg border-2 border-dashed border-border/40 text-muted-foreground hover:border-violet-500/30 hover:text-violet-400 transition-all text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />Add Track
        </button>
      )}

      {/* Summary */}
      {data.tracks.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2.5">
          <span>{data.tracks.length} tracks</span>
          <span className="w-px h-3 bg-border" />
          <span>{totalLyrics.toLocaleString()} total chars</span>
          <span className="w-px h-3 bg-border" />
          <span>Est. {data.tracks.length * 2}–{data.tracks.length * 4} min video</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />Back
        </Button>
        <Button
          variant="gradient"
          onClick={onNext}
          disabled={!canContinue}
          className="gap-2"
        >
          Start Generating Music
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
