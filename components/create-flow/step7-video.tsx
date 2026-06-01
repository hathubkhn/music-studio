"use client"

import { useState } from "react"
import {
  Video, ChevronLeft, Loader2, Play, Download,
  Film, Layers, Sparkles, ChevronDown, ChevronUp, Info
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ProjectData } from "./create-flow"
import { LyricVideoCreator } from "./lyric-video-creator"

interface Props {
  data: Partial<ProjectData>
  onBack: () => void
}

export function Step7Video({ data, onBack }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Audio: prefer generated, fall back to imported
  const audioUrl = data.audioUrl || data.importedAudioUrl

  // Background image: prefer the first completed scene image
  const firstSceneImage = data.scenes?.find((s) => s.imageStatus === "completed")?.imageUrl

  // Build a combined visual style hint
  const visualStyle = [
    data.songBrief?.visualDirection,
    data.globalVisualStyle,
  ].filter(Boolean).join(", ")

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
          <Film className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Lyric Video</h2>
          <p className="text-sm text-muted-foreground">
            One background image + lyrics rolling in sync with your song
          </p>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge className={audioUrl ? "bg-teal-500/15 text-teal-400 border-teal-500/30" : "bg-muted text-muted-foreground"}>
          {audioUrl ? "✓" : "✗"} Audio
        </Badge>
        <Badge className={data.lyrics ? "bg-teal-500/15 text-teal-400 border-teal-500/30" : "bg-muted text-muted-foreground"}>
          {data.lyrics ? "✓" : "✗"} Lyrics
        </Badge>
        {firstSceneImage && (
          <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30">
            ✓ Scene image available
          </Badge>
        )}
      </div>

      {!audioUrl && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            No audio detected — go back and generate music first to create a lyric video.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Lyric Video Creator ── */}
      <LyricVideoCreator
        audioUrl={audioUrl}
        lyrics={data.lyrics}
        songTitle={data.title}
        mood={data.mood || data.lyricsMood}
        genre={data.genre || data.lyricsGenre}
        visualStyle={visualStyle}
        existingImageUrl={firstSceneImage}
      />

      {/* ── Advanced: old modes ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced: Other video modes
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border/60 opacity-60">
              <CardContent className="p-5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                </div>
                <p className="font-medium text-sm">AI Video Clips</p>
                <p className="text-xs text-muted-foreground">
                  Generate short AI video clips from scene images via Kie.ai.
                </p>
                <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
              </CardContent>
            </Card>
            <Card className="border-border/60 opacity-60">
              <CardContent className="p-5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Layers className="h-4 w-4 text-cyan-400" />
                </div>
                <p className="font-medium text-sm">Multi-Image Slideshow</p>
                <p className="text-xs text-muted-foreground">
                  Rotate through all your scene images timed to the song.
                </p>
                <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-4 bg-background/95 backdrop-blur border-t flex items-center justify-between gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Assets
        </Button>
        <Button variant="gradient" asChild>
          <a href="/projects">
            🎉 Finish & View Project
          </a>
        </Button>
      </div>
    </div>
  )
}
