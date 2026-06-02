"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, Disc3, Check } from "lucide-react"
import type { AlbumData } from "./album-create-flow"

const GENRES = ["Pop","Rock","Hip-Hop","R&B","Jazz","Electronic","K-Pop","Folk","Classical","Lo-fi","EDM","Indie"]
const MOODS  = ["Uplifting","Sad","Romantic","Energetic","Calm","Nostalgic","Epic","Playful","Dark","Motivational"]
const LANGUAGES = ["Vietnamese","English","Korean","Japanese","Chinese","Spanish","French","Thai","Indonesian","Portuguese"]
const AUDIENCES = ["Children (3–6)","Kids (6–12)","Teens","Young Adults","General","Adults","Seniors"]
const TRACK_COUNTS = [3, 4, 5, 6, 7, 8, 10, 12, 15, 20]
const DURATION_PRESETS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "90 min", value: 90 },
  { label: "2 hours", value: 120 },
]

interface Props {
  data: AlbumData
  onChange: (patch: Partial<AlbumData>) => void
  onNext: () => void
}

export function AlbumSetup({ data, onChange, onNext }: Props) {
  const canContinue = data.title.trim().length > 0 && data.theme.trim().length > 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Disc3 className="w-6 h-6 text-violet-400" />
          Album Setup
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Define your album concept — AI will generate {data.numTracks} cohesive songs around this theme.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Album title */}
        <Card className="md:col-span-2 border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Album Title <span className="text-destructive">*</span></Label>
              <Input
                value={data.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="e.g. Journey Through Vietnam, Songs of Childhood, My Love Story..."
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Theme / Concept <span className="text-destructive">*</span></Label>
              <Textarea
                value={data.theme}
                onChange={(e) => onChange({ theme: e.target.value })}
                rows={3}
                placeholder="Describe what this album is about. e.g. 'A journey through Vietnam's 63 provinces, each song celebrating a different region's culture, food, and people.'"
                className="resize-none text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Genre */}
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Genre</Label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => (
                <button key={g} type="button" onClick={() => onChange({ genre: g })}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                    data.genre === g
                      ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {data.genre === g && <Check className="w-2.5 h-2.5 inline mr-1" />}{g}
                </button>
              ))}
            </div>
            <Input
              value={!GENRES.includes(data.genre) ? data.genre : ""}
              onChange={(e) => onChange({ genre: e.target.value })}
              placeholder="Or type custom genre..."
              className="h-8 text-xs mt-1"
            />
          </CardContent>
        </Card>

        {/* Mood */}
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mood</Label>
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map((m) => (
                <button key={m} type="button" onClick={() => onChange({ mood: m })}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                    data.mood === m
                      ? "border-teal-500/50 bg-teal-500/15 text-teal-300"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {data.mood === m && <Check className="w-2.5 h-2.5 inline mr-1" />}{m}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Language</Label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map((l) => (
                <button key={l} type="button" onClick={() => onChange({ language: l })}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                    data.language === l
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {data.language === l && <Check className="w-2.5 h-2.5 inline mr-1" />}{l}
                </button>
              ))}
            </div>
            <Input
              value={!LANGUAGES.includes(data.language) ? data.language : ""}
              onChange={(e) => onChange({ language: e.target.value })}
              placeholder="Or type custom language..."
              className="h-8 text-xs mt-1"
            />
          </CardContent>
        </Card>

        {/* Audience + style */}
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Audience</Label>
              <div className="flex flex-wrap gap-1.5">
                {AUDIENCES.map((a) => (
                  <button key={a} type="button" onClick={() => onChange({ audience: a })}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      data.audience === a
                        ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                        : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {data.audience === a && <Check className="w-2.5 h-2.5 inline mr-1" />}{a}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Style prompt (optional)</Label>
              <Input
                value={data.stylePrompt}
                onChange={(e) => onChange({ stylePrompt: e.target.value })}
                placeholder="e.g. acoustic guitar, warm, nostalgic, female vocal..."
                className="h-8 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Number of tracks + duration */}
        <Card className="md:col-span-2 border-border/60">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Number of Tracks
              </Label>
              <div className="flex flex-wrap gap-2">
                {TRACK_COUNTS.map((n) => (
                  <button key={n} type="button" onClick={() => onChange({ numTracks: n })}
                    className={`w-12 h-12 rounded-lg border text-sm font-bold transition-all ${
                      data.numTracks === n
                        ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                        : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Target Album Duration
              </Label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((p) => (
                  <button key={p.value} type="button"
                    onClick={() => onChange({ targetDurationMin: data.targetDurationMin === p.value ? undefined : p.value })}
                    className={`px-3 h-8 rounded-lg border text-xs font-medium transition-all ${
                      data.targetDurationMin === p.value
                        ? "border-teal-500/50 bg-teal-500/15 text-teal-300"
                        : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.targetDurationMin
                  ? <>
                      {data.numTracks} tracks × ~{Math.round(data.targetDurationMin / data.numTracks)} min/song = <strong className="text-foreground">{data.targetDurationMin} min</strong> total.
                      {data.targetDurationMin >= 45 && <span className="text-amber-400"> AI will write extended lyrics for longer songs.</span>}
                      {data.numTracks >= 10 && <span className="text-violet-400"> Download per-track WebMs and combine in CapCut for best results.</span>}
                    </>
                  : <>
                      {data.numTracks} tracks · AI decides song length. Select a duration for longer songs.
                    </>
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          variant="gradient"
          onClick={onNext}
          disabled={!canContinue}
          className="gap-2"
        >
          Generate Track List with AI
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
