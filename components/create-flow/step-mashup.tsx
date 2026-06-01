"use client"

import { useState, useRef } from "react"
import {
  Shuffle, Upload, Play, Pause, X, ArrowRight, Link2,
  Check, Music2, Wand2, Loader2, ChevronDown, ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { ProjectData } from "./create-flow"

// ── Tag data ──────────────────────────────────────────────────────────────────

const GENRE_TAGS = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Jazz", "Electronic",
  "Country", "Folk", "Reggae", "Soul", "Metal", "Indie",
  "K-Pop", "Latin", "EDM", "Lo-fi", "Ambient",
]
const MOOD_TAGS = [
  "Happy", "Sad", "Energetic", "Calm", "Romantic", "Nostalgic",
  "Uplifting", "Dark", "Playful", "Emotional", "Epic",
]
const VOCAL_OPTIONS = [
  { label: "Male",         value: "m" as const },
  { label: "Female",       value: "f" as const },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function TagPicker({
  options, selected, onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((t) => {
        const on = selected.includes(t)
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(on ? selected.filter((x) => x !== t) : [...selected, t])}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              on
                ? "bg-pink-500/20 border-pink-500/50 text-pink-300"
                : "border-border/60 text-muted-foreground hover:border-pink-500/30 hover:text-pink-300"
            }`}
          >
            {on && <Check className="w-2.5 h-2.5 inline mr-1" />}{t}
          </button>
        )
      })}
    </div>
  )
}

// ── Audio input for one track ─────────────────────────────────────────────────

interface AudioInputProps {
  label: string
  color: "pink" | "purple"
  url: string
  setUrl: (u: string) => void
  hostedUrl: string
  setHostedUrl: (u: string) => void
}

function AudioInput({
  label, color,
  url, setUrl,
  hostedUrl, setHostedUrl,
}: AudioInputProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [inputMode, setInputMode] = useState<"url" | "upload">("url")
  const [previewUrl, setPreviewUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fileName, setFileName] = useState("")

  const colorClass = color === "pink"
    ? { ring: "border-pink-500/50 bg-pink-500/5", badge: "border-pink-500/30 text-pink-400", btn: "hover:bg-pink-500/10 hover:text-pink-300 hover:border-pink-500/30" }
    : { ring: "border-purple-500/50 bg-purple-500/5", badge: "border-purple-500/30 text-purple-400", btn: "hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/30" }

  async function handleFile(file: File) {
    if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/i)) {
      toast.error("Please upload an audio file (MP3, WAV, OGG, M4A, FLAC, AAC)")
      return
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error("File too large — max 200 MB")
      return
    }

    setFileName(file.name)
    const blob = URL.createObjectURL(file)
    setPreviewUrl(blob)

    // Upload to server to get a public URL
    setUploading(true)
    setHostedUrl("")
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload/audio", { method: "POST", body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Upload failed")
      setHostedUrl(json.url)
      setUrl(json.url)
      toast.success("File uploaded!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  function togglePlay() {
    const src = previewUrl || url
    if (!src) return
    if (!audioRef.current) {
      audioRef.current = new Audio(src)
      audioRef.current.onended = () => setIsPlaying(false)
    }
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  function clearAudio() {
    setUrl("")
    setHostedUrl("")
    setPreviewUrl("")
    setFileName("")
    setIsPlaying(false)
    audioRef.current?.pause()
    audioRef.current = null
  }

  const hasAudio = Boolean(url || previewUrl)

  return (
    <Card className={`border ${hasAudio ? colorClass.ring : "border-border/60"} transition-all`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">{label}</Label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className={`px-2 py-0.5 rounded text-xs border transition-all ${
                inputMode === "url"
                  ? `${colorClass.badge} bg-opacity-10`
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              <Link2 className="w-3 h-3 inline mr-1" />Paste URL
            </button>
            <button
              type="button"
              onClick={() => setInputMode("upload")}
              className={`px-2 py-0.5 rounded text-xs border transition-all ${
                inputMode === "upload"
                  ? `${colorClass.badge} bg-opacity-10`
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              <Upload className="w-3 h-3 inline mr-1" />Upload
            </button>
          </div>
        </div>

        {inputMode === "url" ? (
          <Input
            placeholder="https://…  (direct MP3 / WAV URL)"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setHostedUrl(e.target.value)
              setPreviewUrl("")
              setFileName("")
            }}
            className="text-sm"
          />
        ) : (
          <div
            className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center cursor-pointer hover:border-border transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />Uploading…
              </div>
            ) : fileName ? (
              <p className="text-sm text-foreground truncate">{fileName}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Drop audio here or <span className="underline">browse</span>
                <br />MP3, WAV, OGG, M4A, FLAC, AAC · max 200 MB
              </p>
            )}
          </div>
        )}

        {hasAudio && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={togglePlay} className={`gap-1 text-xs ${colorClass.btn}`}>
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? "Pause" : "Preview"}
            </Button>
            {hostedUrl && (
              <Badge variant="outline" className={`text-xs ${colorClass.badge}`}>
                <Check className="w-2.5 h-2.5 mr-1" />Hosted
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={clearAudio} className="ml-auto p-1 h-auto text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main step ─────────────────────────────────────────────────────────────────

interface Props {
  data: Partial<ProjectData>
  onNext: (data: Partial<ProjectData>) => void
}

export function StepMashup({ data, onNext }: Props) {
  // Track A
  const [url1, setUrl1] = useState(data.mashupAudio1Url || "")
  const [hostedUrl1, setHostedUrl1] = useState(data.mashupAudio1Url || "")

  // Track B
  const [url2, setUrl2] = useState(data.mashupAudio2Url || "")
  const [hostedUrl2, setHostedUrl2] = useState(data.mashupAudio2Url || "")

  // Song params
  const [title, setTitle] = useState(data.title || "")
  const [lyrics, setLyrics] = useState(data.lyrics || "")
  const [genres, setGenres] = useState<string[]>([])
  const [moods, setMoods]   = useState<string[]>([])
  const [vocalGender, setVocalGender] = useState<"m" | "f">(data.vocalGender || "m")

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [audioWeight, setAudioWeight]           = useState(data.audioWeight ?? 0.5)
  const [styleWeight, setStyleWeight]           = useState(data.styleWeight ?? 0.5)
  const [weirdness, setWeirdness]               = useState(0.3)

  // AI lyrics generation
  const [generatingLyrics, setGeneratingLyrics] = useState(false)

  const stylePrompt = [...genres, ...moods].join(", ")

  async function handleGenerateLyrics() {
    if (!title.trim()) {
      toast.error("Enter a song title first")
      return
    }
    setGeneratingLyrics(true)
    try {
      const res = await fetch("/api/ai/generate-song-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Create lyrics for a mashup song called "${title}". Style: ${stylePrompt || "pop"}. Keep it energetic and catchy.`,
          targetLanguage: "English",
          genre: genres[0] || "Pop",
          mood: moods[0] || "Energetic",
          audience: "general",
          vocalPreference: vocalGender === "m" ? "male vocal" : "female vocal",
        }),
      })
      if (!res.ok) throw new Error("Generation failed")
      const json = await res.json()
      if (json.lyrics) setLyrics(json.lyrics)
      toast.success("Lyrics generated!")
    } catch {
      toast.error("Could not generate lyrics — try again")
    } finally {
      setGeneratingLyrics(false)
    }
  }

  function handleContinue() {
    if (!hostedUrl1 || !hostedUrl2) {
      toast.error("Please provide both reference tracks before continuing")
      return
    }
    if (!title.trim()) {
      toast.error("Enter a song title")
      return
    }
    if (!lyrics.trim()) {
      toast.error("Add lyrics for the mashup")
      return
    }

    onNext({
      mashupAudio1Url: hostedUrl1,
      mashupAudio2Url: hostedUrl2,
      title,
      lyrics,
      stylePrompt,
      vocalGender,
      audioWeight,
      styleWeight,
      weirdnessConstraint: weirdness,
    })
  }

  const canContinue = Boolean(hostedUrl1 && hostedUrl2 && title.trim() && lyrics.trim())

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-3 py-1 text-xs text-pink-400 mb-2">
          <Shuffle className="w-3 h-3" />Mashup Mode
        </div>
        <h2 className="text-xl font-bold">Blend Two Songs</h2>
        <p className="text-sm text-muted-foreground">
          Upload two reference tracks — AI blends their styles and melodies into a brand-new mashup.
        </p>
      </div>

      {/* Track inputs */}
      <div className="space-y-3">
        <AudioInput
          label="Track A — Primary reference"
          color="pink"
          url={url1} setUrl={setUrl1}
          hostedUrl={hostedUrl1} setHostedUrl={setHostedUrl1}
        />
        <div className="flex items-center gap-2 px-2">
          <div className="flex-1 h-px bg-border/50" />
          <div className="w-6 h-6 rounded-full bg-muted border border-border/60 flex items-center justify-center">
            <Shuffle className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="flex-1 h-px bg-border/50" />
        </div>
        <AudioInput
          label="Track B — Secondary reference"
          color="purple"
          url={url2} setUrl={setUrl2}
          hostedUrl={hostedUrl2} setHostedUrl={setHostedUrl2}
        />
      </div>

      {/* Song details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Mashup Details</CardTitle>
          <CardDescription className="text-xs">Title, style and lyrics for the new track</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Song Title</Label>
            <Input
              placeholder="e.g. Summer Mashup 2025"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Style tags */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Genres</Label>
            <TagPicker options={GENRE_TAGS} selected={genres} onChange={setGenres} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Mood</Label>
            <TagPicker options={MOOD_TAGS} selected={moods} onChange={setMoods} />
          </div>

          {/* Vocal gender */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Vocal</Label>
            <div className="flex gap-2">
              {VOCAL_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVocalGender(v.value)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                    vocalGender === v.value
                      ? "bg-pink-500/20 border-pink-500/50 text-pink-300"
                      : "border-border/60 text-muted-foreground hover:border-border"
                  }`}
                >
                  <Music2 className="w-3 h-3 inline mr-1" />{v.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Lyrics */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Lyrics</Label>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                onClick={handleGenerateLyrics}
                disabled={generatingLyrics}
              >
                {generatingLyrics
                  ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</>
                  : <><Wand2 className="w-3 h-3" />AI Generate</>
                }
              </Button>
            </div>
            <Textarea
              placeholder="[Verse 1]&#10;Your lyrics here…&#10;&#10;[Chorus]&#10;…"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={8}
              className="font-mono text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{lyrics.length} / 5000 chars</p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced settings */}
      <div className="border border-border/40 rounded-lg overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          Advanced Blend Settings
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center justify-between">
                Audio Blend Strength
                <span className="text-muted-foreground font-normal">{audioWeight.toFixed(2)}</span>
              </Label>
              <input
                type="range" min={0} max={1} step={0.05}
                value={audioWeight}
                onChange={(e) => setAudioWeight(parseFloat(e.target.value))}
                className="w-full accent-pink-500"
              />
              <p className="text-xs text-muted-foreground">
                How strongly to follow the source audio melodies (higher = more faithful to originals).
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center justify-between">
                Style Tag Influence
                <span className="text-muted-foreground font-normal">{styleWeight.toFixed(2)}</span>
              </Label>
              <input
                type="range" min={0} max={1} step={0.05}
                value={styleWeight}
                onChange={(e) => setStyleWeight(parseFloat(e.target.value))}
                className="w-full accent-pink-500"
              />
              <p className="text-xs text-muted-foreground">
                How strongly your genre/mood tags shape the output.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center justify-between">
                Weirdness Constraint
                <span className="text-muted-foreground font-normal">{weirdness.toFixed(2)}</span>
              </Label>
              <input
                type="range" min={0} max={1} step={0.05}
                value={weirdness}
                onChange={(e) => setWeirdness(parseFloat(e.target.value))}
                className="w-full accent-pink-500"
              />
              <p className="text-xs text-muted-foreground">
                Higher values allow more experimental, unexpected blends.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Continue */}
      <Button
        className="w-full gradient-brand text-white font-semibold"
        disabled={!canContinue}
        onClick={handleContinue}
      >
        <Shuffle className="w-4 h-4 mr-2" />
        Generate Mashup
        <ArrowRight className="w-4 h-4 ml-auto" />
      </Button>

      {!canContinue && (
        <p className="text-center text-xs text-muted-foreground">
          Provide both reference tracks, a title, and lyrics to continue.
        </p>
      )}
    </div>
  )
}
