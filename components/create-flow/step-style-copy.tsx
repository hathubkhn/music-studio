"use client"

import { useState, useRef } from "react"
import {
  Music2, Upload, Play, Pause, X, ArrowRight, Sparkles,
  Check, Info, Wand2, Volume2, FileText, RefreshCw,
  ChevronDown, ChevronUp, Loader2, Languages, Copy, Link2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import type { ProjectData } from "./create-flow"

// ── Tag / Style data ──────────────────────────────────────────────────────────

const GENRE_TAGS = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Jazz", "Electronic", "Classical",
  "Country", "Folk", "Reggae", "Blues", "Soul", "Metal", "Indie",
  "K-Pop", "Latin", "EDM", "Lo-fi", "Ambient", "Children's",
]
const MOOD_TAGS = [
  "Happy", "Sad", "Energetic", "Calm", "Romantic", "Nostalgic",
  "Uplifting", "Dark", "Playful", "Emotional", "Mysterious", "Epic",
]
const INSTRUMENT_TAGS = [
  "Piano", "Guitar", "Acoustic Guitar", "Electric Guitar",
  "Drums", "Bass", "Violin", "Cello", "Trumpet", "Saxophone",
  "Synth", "Choir", "Ukulele", "Flute", "Harp", "808",
]
const TEMPO_OPTIONS = [
  { label: "Slow",    bpm: "60–80 BPM",  value: "slow" },
  { label: "Moderate",bpm: "80–110 BPM", value: "moderate" },
  { label: "Upbeat",  bpm: "110–140 BPM",value: "upbeat" },
  { label: "Fast",    bpm: "140+ BPM",   value: "fast" },
]
const VOCAL_OPTIONS = [
  { label: "Male",         value: "male vocal" },
  { label: "Female",       value: "female vocal" },
  { label: "Duet",         value: "male and female duet" },
  { label: "Choir",        value: "choir" },
  { label: "Rap",          value: "rap vocal" },
  { label: "Instrumental", value: "instrumental, no vocals" },
]

const COMMON_LANGUAGES = [
  "Vietnamese", "English", "Korean", "Japanese", "Chinese (Simplified)",
  "Spanish", "French", "Thai", "Indonesian", "Portuguese", "German",
  "Italian", "Hindi", "Arabic",
]
const ADAPTATION_STYLES = [
  {
    value: "translate",
    label: "Direct Translation",
    desc: "Same meaning, same structure — just in a new language",
  },
  {
    value: "adapt",
    label: "Loose Adaptation",
    desc: "Keep the vibe and structure, adapt phrases to feel natural",
  },
  {
    value: "rewrite",
    label: "New Lyrics (same vibe)",
    desc: "Brand new words, same song structure and emotional arc",
  },
] as const

// ── Small helpers ─────────────────────────────────────────────────────────────

function TagPicker({
  options, selected, onChange, color = "amber",
}: {
  options: string[]
  selected: string[]
  onChange: (t: string[]) => void
  color?: "amber" | "teal" | "violet"
}) {
  const colors = {
    amber:  "border-amber-500/50 bg-amber-500/15 text-amber-300",
    teal:   "border-teal-500/50 bg-teal-500/15 text-teal-300",
    violet: "border-violet-500/50 bg-violet-500/15 text-violet-300",
  }
  const toggle = (tag: string) =>
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag])
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((tag) => {
        const active = selected.includes(tag)
        return (
          <button
            key={tag} type="button" onClick={() => toggle(tag)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-all ${active ? colors[color] : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"}`}
          >
            {active && <Check className="w-2.5 h-2.5 inline mr-1" />}{tag}
          </button>
        )
      })}
    </div>
  )
}

function PillSelect({
  options, value, onChange,
}: {
  options: { label: string; bpm?: string; value: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value} type="button"
            onClick={() => onChange(active ? "" : opt.value)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-all flex flex-col items-center ${active ? "border-teal-500/50 bg-teal-500/15 text-teal-300" : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"}`}
          >
            <span className="font-medium">{opt.label}</span>
            {opt.bpm && <span className="text-[10px] opacity-70">{opt.bpm}</span>}
          </button>
        )
      })}
    </div>
  )
}

function buildStylePrompt(
  genres: string[], moods: string[], instruments: string[],
  tempo: string, vocal: string, freeform: string
) {
  const parts: string[] = []
  if (genres.length)      parts.push(genres.join(", "))
  if (moods.length)       parts.push(moods.join(", "))
  if (tempo)              parts.push(tempo)
  if (instruments.length) parts.push(instruments.join(", "))
  if (vocal)              parts.push(vocal)
  if (freeform.trim())    parts.push(freeform.trim())
  return parts.join(", ")
}

function Section({
  title, icon: Icon, iconColor = "text-amber-400", children,
  badge, defaultOpen = false,
}: {
  title: string
  icon: React.ElementType
  iconColor?: string
  children: React.ReactNode
  badge?: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="border-border/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-4 text-left"
      >
        <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
        <span className="font-semibold text-sm flex-1">{title}</span>
        {badge}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <CardContent className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

function SliderRow({
  label, hint, value, onChange, min = 0, max = 1, step = 0.05,
}: {
  label: string; hint: string; value: number
  onChange: (v: number) => void
  min?: number; max?: number; step?: number
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-xs font-mono text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-amber-400 cursor-pointer"
      />
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  data: Partial<ProjectData>
  onNext: (data: Partial<ProjectData>) => void
  onBack: () => void
}

type AdaptStyle = "translate" | "adapt" | "rewrite"
type AudioInputMode = "url" | "file"

export function StepStyleCopy({ data, onNext, onBack }: Props) {
  // ── Reference audio ──
  const [audioInputMode, setAudioInputMode] = useState<AudioInputMode>("url")
  // Public URL (for upload-cover API)
  const [referenceUrl, setReferenceUrl] = useState(data.referenceAudioUrl || "")
  const [referenceUrlError, setReferenceUrlError] = useState("")
  // Local file: blob URL for preview, hostedUrl for server-side upload
  const [blobUrl, setBlobUrl]       = useState("")
  const [blobName, setBlobName]     = useState("")
  const [hostedUrl, setHostedUrl]   = useState("")  // public URL after upload
  const [isUploading, setIsUploading] = useState(false)
  const [uploadWarning, setUploadWarning] = useState("")
  const [isPlaying, setIsPlaying]   = useState(false)
  const audioRef      = useRef<HTMLAudioElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const lyricsFileRef    = useRef<HTMLInputElement>(null)
  const newLyricsFileRef = useRef<HTMLInputElement>(null)

  // ── Cover settings (used when referenceUrl is set) ──
  const [audioWeight, setAudioWeight] = useState(data.audioWeight ?? 0.8)
  const [styleWeight, setStyleWeight] = useState(data.styleWeight ?? 0.5)
  const [vocalGender, setVocalGender] = useState<"" | "m" | "f">(data.vocalGender ?? "")

  // ── Original lyrics ──
  const [originalLyrics, setOriginalLyrics] = useState("")

  // ── Style tags ──
  const [genres, setGenres]           = useState<string[]>([])
  const [moods, setMoods]             = useState<string[]>([])
  const [instruments, setInstruments] = useState<string[]>([])
  const [tempo, setTempo]             = useState("")
  const [vocal, setVocal]             = useState("")
  const [freeform, setFreeform]       = useState("")

  // ── Lyrics generation config ──
  const [targetLanguage, setTargetLanguage] = useState("Vietnamese")
  const [customLanguage, setCustomLanguage] = useState("")
  const [adaptStyle, setAdaptStyle]         = useState<AdaptStyle>("adapt")
  const [toneNotes, setToneNotes]           = useState("")
  const [audience, setAudience]             = useState("")

  // ── Generated lyrics ──
  const [generatedLyrics, setGeneratedLyrics] = useState("")
  const [isGenerating, setIsGenerating]       = useState(false)

  // ── Project info ──
  const [projectName, setProjectName] = useState(data.title || "")

  const stylePrompt      = buildStylePrompt(genres, moods, instruments, tempo, vocal, freeform)
  const effectiveLanguage = customLanguage.trim() || targetLanguage

  // Cover mode active when: (a) pasted public URL, or (b) local file was uploaded & hosted
  const isCoverMode =
    (audioInputMode === "url" && referenceUrl.trim().startsWith("http")) ||
    (audioInputMode === "file" && hostedUrl.startsWith("http"))
  // The actual URL sent to Kie.ai
  const coverSourceUrl = audioInputMode === "url" ? referenceUrl.trim() : hostedUrl
  // Audio element source for in-browser preview
  const previewAudioSrc = blobUrl || referenceUrl || hostedUrl

  const canGenerate  = originalLyrics.trim().length > 10
  const canContinue  = generatedLyrics.trim().length > 10 && projectName.trim().length > 0

  // ── Handlers ──
  const handleReferenceUrlChange = (val: string) => {
    setReferenceUrl(val)
    setReferenceUrlError("")
  }

  const validateReferenceUrl = () => {
    const url = referenceUrl.trim()
    if (!url) return
    try {
      new URL(url)
      if (!url.match(/\.(mp3|mp4|wav|m4a|ogg|flac|aac)(\?|$)/i) &&
          !url.includes("aiquickdraw.com") && !url.includes("kie.ai") &&
          !url.includes("suno.ai") && !url.includes("cdn")) {
        setReferenceUrlError("URL may not be an audio file — but you can still try")
      }
    } catch {
      setReferenceUrlError("Please enter a valid URL (starting with https://)")
    }
  }

  const handleAudioFile = async (file: File) => {
    if (!file.name.match(/\.(mp3|mp4|wav|m4a|ogg|flac|aac)$/i)) {
      toast.error("Please upload MP3, WAV, M4A, OGG, or FLAC")
      return
    }
    // Create local preview URL immediately
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    const localUrl = URL.createObjectURL(file)
    setBlobUrl(localUrl)
    setBlobName(file.name)
    setHostedUrl("")
    setUploadWarning("")

    // Auto-upload to server to get a public URL for Kie.ai
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload/audio", { method: "POST", body: fd })
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed")
      const data = await res.json()
      setHostedUrl(data.url)
      {
        toast.success(`File uploaded — Cover Mode activated!`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed"
      setUploadWarning(`Could not upload to server: ${msg}. Cover mode may not work.`)
      toast.error(`Upload failed: ${msg}`)
    } finally {
      setIsUploading(false)
    }
  }

  const loadTextFile = (file: File, setter: (v: string) => void) => {
    const reader = new FileReader()
    reader.onload = (e) => { setter(e.target?.result as string); toast.success(`Loaded: ${file.name}`) }
    reader.readAsText(file)
  }

  const generateLyrics = async () => {
    if (!canGenerate) { toast.error("Paste the original lyrics first"); return }
    setIsGenerating(true)
    try {
      const res = await fetch("/api/ai/rewrite-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalLyrics,
          targetLanguage: effectiveLanguage,
          adaptationStyle: adaptStyle,
          toneNotes,
          stylePrompt,
          audience,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      const { lyrics } = await res.json()
      setGeneratedLyrics(lyrics)
      toast.success("New lyrics generated!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleContinue = () => {
    onNext({
      title:            projectName,
      lyrics:           generatedLyrics,
      stylePrompt,
      targetLanguage:   effectiveLanguage,
      // Cover mode: pass the public URL so Kie.ai can download and keep the melody
      referenceAudioUrl: isCoverMode ? coverSourceUrl : undefined,
      audioWeight:       isCoverMode ? audioWeight : undefined,
      styleWeight:       isCoverMode ? styleWeight : undefined,
      vocalGender:       (isCoverMode && vocalGender) ? vocalGender : undefined,
      // Keep blobUrl only as a local preview fallback (not for cover API)
      importedAudioUrl:  blobUrl || undefined,
      importedAudioName: blobName || undefined,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Music2 className="w-5 h-5 text-amber-400" />
          Copy Music Style
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste the reference song URL → AI rewrites lyrics → Suno covers the song keeping the same melody.
        </p>
      </div>

      {/* Mode callout */}
      {isCoverMode ? (
        <Alert className="border-teal-500/20 bg-teal-500/5">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <AlertDescription className="text-xs">
            <span className="text-teal-400 font-semibold">Cover Mode active —</span>{" "}
            Suno will preserve the <strong>melody, instruments, and vocal style</strong> of your reference audio.
            Only the lyrics will change.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-500/20 bg-amber-500/5">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <AlertDescription className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Style Copy Mode — </span>
            AI uses your style tags to generate music. For best results, paste the song URL above to enable Cover Mode.
          </AlertDescription>
        </Alert>
      )}

      {/* Project name */}
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-2">
          <Label className="text-sm font-medium">Project Name <span className="text-destructive">*</span></Label>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Bài hát xin chào của tôi..."
            className="h-9"
          />
        </CardContent>
      </Card>

      {/* ── Section 1: Reference audio ── */}
      <Section
        title="Reference Audio"
        icon={Volume2}
        iconColor="text-amber-400"
        defaultOpen={true}
        badge={
          isCoverMode
            ? <Badge className="ml-2 bg-teal-500/15 text-teal-400 border-teal-500/30 text-[10px]">✓ Cover Mode</Badge>
            : blobUrl && isUploading
            ? <Badge className="ml-2 bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                <Loader2 className="w-2.5 h-2.5 inline mr-1 animate-spin" />Uploading…
              </Badge>
            : blobUrl
            ? <Badge className="ml-2 bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">✓ Loaded</Badge>
            : undefined
        }
      >
        {/* Input mode tabs */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-lg">
          {(["url", "file"] as const).map((m) => (
            <button key={m} type="button"
              onClick={() => setAudioInputMode(m)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                audioInputMode === m
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "url" ? <Link2 className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
              {m === "url" ? "Paste URL (Cover Mode)" : "Upload File (Preview Only)"}
            </button>
          ))}
        </div>

        {audioInputMode === "url" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Paste a public audio URL — e.g. from a previous Kie.ai generation, S3, or any public CDN.
              Suno will keep the melody while your new lyrics are sung over it.
            </p>
            <div className="flex gap-2">
              <Input
                value={referenceUrl}
                onChange={(e) => handleReferenceUrlChange(e.target.value)}
                onBlur={validateReferenceUrl}
                placeholder="https://tempfile.aiquickdraw.com/r/xxx.mp3"
                className="h-9 text-xs font-mono"
              />
              {referenceUrl && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                  onClick={() => { setReferenceUrl(""); setReferenceUrlError("") }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {referenceUrlError && (
              <p className="text-xs text-amber-400">{referenceUrlError}</p>
            )}
            {isCoverMode && (
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => {
                    if (!audioRef.current) return
                    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
                    else { audioRef.current.play(); setIsPlaying(true) }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-teal-500/30 bg-teal-500/5 text-teal-400 hover:bg-teal-500/10 transition-all"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isPlaying ? "Pause preview" : "Preview"}
                </button>
                <span className="text-[10px] text-muted-foreground">Listening helps you tag the style accurately</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Upload a local audio file — it will be hosted on this server so Kie.ai can access it and preserve the melody.
            </p>
            {!blobUrl ? (
              <button
                type="button" onClick={() => audioInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 py-5 rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-all cursor-pointer"
              >
                <Upload className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-medium">Drop or click to upload audio</span>
                <span className="text-xs text-muted-foreground">MP3 · WAV · M4A · OGG · FLAC · max 50 MB</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-400 shrink-0"
                    onClick={() => {
                      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false) }
                      else { audioRef.current?.play(); setIsPlaying(true) }
                    }}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{blobName}</p>
                    {isUploading ? (
                      <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                        <Loader2 className="w-3 h-3 animate-spin" />Uploading to server…
                      </p>
                    ) : hostedUrl ? (
                      <p className="text-xs text-teal-400 mt-0.5 flex items-center gap-1">
                        <Check className="w-3 h-3" />Hosted — Cover Mode active
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Local preview only</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0"
                    onClick={() => {
                      setBlobUrl(""); setBlobName("")
                      setHostedUrl(""); setUploadWarning("")
                      setIsPlaying(false)
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Hosted URL display */}
                {hostedUrl && (
                  <div className="text-[10px] font-mono text-muted-foreground bg-muted/30 rounded px-2 py-1 break-all">
                    Public URL: {hostedUrl}
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* Shared audio element */}
        {previewAudioSrc && (
          <audio ref={audioRef} src={previewAudioSrc} onEnded={() => setIsPlaying(false)} className="hidden" />
        )}
        <input ref={audioInputRef} type="file" accept=".mp3,.mp4,.wav,.m4a,.ogg,.flac,.aac" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioFile(f); e.target.value = "" }} />

        {/* Cover settings — only when URL mode is active */}
        {isCoverMode && (
          <div className="space-y-4 pt-2 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cover Settings</p>

            <SliderRow
              label="Melody Fidelity (audioWeight)"
              hint="High = very close to original melody. Low = Suno interprets freely."
              value={audioWeight}
              onChange={setAudioWeight}
              min={0.2} max={1} step={0.05}
            />
            <SliderRow
              label="Style Influence (styleWeight)"
              hint="How much weight your style tags have vs. the reference audio's inherent style."
              value={styleWeight}
              onChange={setStyleWeight}
              min={0} max={1} step={0.05}
            />

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Vocal Gender (optional)</Label>
              <div className="flex gap-2">
                {[
                  { label: "Auto", value: "" },
                  { label: "Male", value: "m" },
                  { label: "Female", value: "f" },
                ].map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setVocalGender(opt.value as "" | "m" | "f")}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                      vocalGender === opt.value
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                        : "border-border/60 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Can increase probability of chosen gender but is not guaranteed.
              </p>
            </div>
          </div>
        )}
      </Section>

      {/* ── Section 2: Original lyrics ── */}
      <Section
        title="Original Lyrics"
        icon={FileText}
        iconColor="text-teal-400"
        badge={originalLyrics.trim().length > 10
          ? <Badge className="ml-2 bg-teal-500/15 text-teal-400 border-teal-500/30 text-[10px]">✓ {originalLyrics.split("\n").filter(Boolean).length} lines</Badge>
          : <span className="ml-2 text-xs text-destructive font-normal">*required</span>
        }
      >
        <p className="text-xs text-muted-foreground -mt-1">
          Paste the original lyrics. The AI will use their structure, rhythm, and section layout as the template.
        </p>
        <Textarea
          value={originalLyrics}
          onChange={(e) => setOriginalLyrics(e.target.value)}
          rows={9}
          placeholder={"[Intro]\n...\n\n[Verse 1]\n...\n\n[Chorus]\n...\n\n[Outro]\n..."}
          className="text-sm resize-none font-mono"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs"
            onClick={() => lyricsFileRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />Upload .txt
          </Button>
          {originalLyrics && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
              onClick={() => setOriginalLyrics("")}
            >
              <X className="w-3.5 h-3.5 mr-1" />Clear
            </Button>
          )}
        </div>
        <input ref={lyricsFileRef} type="file" accept=".txt,.md" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadTextFile(f, setOriginalLyrics); e.target.value = "" }} />
      </Section>

      {/* ── Section 3: Style tags (less important in cover mode) ── */}
      <Section
        title={isCoverMode ? "Style Tags (optional in Cover Mode)" : "Music Style Tags"}
        icon={Music2}
        iconColor="text-amber-400"
        badge={stylePrompt ? <Badge className="ml-2 bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">✓ Tagged</Badge> : undefined}
        defaultOpen={!isCoverMode}
      >
        {isCoverMode ? (
          <p className="text-xs text-muted-foreground -mt-1">
            In Cover Mode the melody comes from the reference audio. Style tags are optional — they guide the vocal & instrument direction but have limited influence.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground -mt-1">
            Describe the style of the reference song. These become Suno&apos;s style prompt.
          </p>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Genre</Label>
          <TagPicker options={GENRE_TAGS} selected={genres} onChange={setGenres} />
        </div>
        <Separator className="opacity-40" />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Mood</Label>
          <TagPicker options={MOOD_TAGS} selected={moods} onChange={setMoods} />
        </div>
        <Separator className="opacity-40" />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Tempo</Label>
          <PillSelect options={TEMPO_OPTIONS} value={tempo} onChange={setTempo} />
        </div>
        <Separator className="opacity-40" />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Instruments</Label>
          <TagPicker options={INSTRUMENT_TAGS} selected={instruments} onChange={setInstruments} />
        </div>
        <Separator className="opacity-40" />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Vocal Style</Label>
          <PillSelect options={VOCAL_OPTIONS} value={vocal} onChange={setVocal} />
        </div>
        <Separator className="opacity-40" />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Additional details</Label>
          <Input value={freeform} onChange={(e) => setFreeform(e.target.value)}
            placeholder="e.g. 4-part harmony, retro 80s reverb..." className="h-8 text-sm" />
        </div>

        {stylePrompt && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
            <p className="text-[10px] font-medium text-amber-400">Style prompt preview</p>
            <p className="text-xs font-mono text-foreground/90">{stylePrompt}</p>
          </div>
        )}
      </Section>

      {/* ── Section 4: New lyrics configuration ── */}
      <Section
        title="New Lyrics Configuration"
        icon={Languages}
        iconColor="text-violet-400"
        defaultOpen={true}
      >
        {/* Target language */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Target Language
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_LANGUAGES.map((lang) => (
              <button
                key={lang} type="button"
                onClick={() => { setTargetLanguage(lang); setCustomLanguage("") }}
                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                  targetLanguage === lang && !customLanguage
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {targetLanguage === lang && !customLanguage && <Check className="w-2.5 h-2.5 inline mr-1" />}
                {lang}
              </button>
            ))}
          </div>
          <Input
            value={customLanguage}
            onChange={(e) => setCustomLanguage(e.target.value)}
            placeholder="Or type a custom language..."
            className="h-8 text-sm mt-1"
          />
          <p className="text-[10px] text-muted-foreground">
            Will generate lyrics in: <span className="text-violet-400 font-medium">{effectiveLanguage}</span>
          </p>
        </div>

        <Separator className="opacity-40" />

        {/* Adaptation style */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Adaptation Style
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ADAPTATION_STYLES.map((opt) => (
              <button
                key={opt.value} type="button"
                onClick={() => setAdaptStyle(opt.value)}
                className={`text-left p-3 rounded-lg border text-xs transition-all space-y-1 ${
                  adaptStyle === opt.value
                    ? "border-violet-500/50 bg-violet-500/10"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <p className={`font-semibold ${adaptStyle === opt.value ? "text-violet-300" : ""}`}>
                  {adaptStyle === opt.value && <Check className="w-3 h-3 inline mr-1" />}
                  {opt.label}
                </p>
                <p className="text-muted-foreground text-[11px] leading-snug">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Separator className="opacity-40" />

        {/* Tone / extra notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Extra Instructions <span className="normal-case font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            value={toneNotes}
            onChange={(e) => setToneNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Make it suitable for children aged 3–6. Keep the cheerful tone. Simplify vocabulary."
            className="text-sm resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Target audience (optional)</Label>
          <Input value={audience} onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. Children aged 3–6, Teens, General" className="h-8 text-sm" />
        </div>

        {/* Generate button */}
        <Button
          variant={generatedLyrics ? "outline" : "gradient"}
          className="w-full gap-2"
          onClick={generateLyrics}
          disabled={isGenerating || !canGenerate}
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Generating new lyrics in {effectiveLanguage}…</>
          ) : generatedLyrics ? (
            <><RefreshCw className="w-4 h-4" />Regenerate lyrics</>
          ) : (
            <><Wand2 className="w-4 h-4" />Generate new lyrics in {effectiveLanguage}</>
          )}
        </Button>
        {!canGenerate && (
          <p className="text-xs text-muted-foreground text-center">↑ Paste the original lyrics first</p>
        )}
      </Section>

      {/* ── Section 5: Generated lyrics ── */}
      {generatedLyrics && (
        <Card className="border-teal-500/20">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                New Lyrics — {effectiveLanguage}
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 text-xs">
                  <Check className="w-3 h-3 mr-1" />Ready
                </Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  title="Copy lyrics"
                  onClick={() => { navigator.clipboard.writeText(generatedLyrics); toast.success("Copied!") }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              {isCoverMode
                ? "These lyrics will be sung over the reference audio's melody by Suno."
                : "Review and edit before continuing. These lyrics will be sent to Suno."}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <Textarea
              value={generatedLyrics}
              onChange={(e) => setGeneratedLyrics(e.target.value)}
              rows={14}
              className="text-sm resize-none font-mono"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => newLyricsFileRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />Import .txt instead
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {generatedLyrics.split("\n").filter(Boolean).length} lines
              </span>
            </div>
            <input ref={newLyricsFileRef} type="file" accept=".txt,.md" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadTextFile(f, setGeneratedLyrics); e.target.value = "" }} />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Readiness checklist + actions */}
      <div className="space-y-3 pb-4">
        <div className="flex items-center gap-5 text-xs flex-wrap">
          <span className={`flex items-center gap-1 ${projectName.trim() ? "text-teal-400" : "text-muted-foreground"}`}>
            <Check className={`w-3 h-3 ${projectName.trim() ? "" : "opacity-30"}`} />Project name
          </span>
          <span className={`flex items-center gap-1 ${originalLyrics.trim().length > 10 ? "text-teal-400" : "text-muted-foreground"}`}>
            <Check className={`w-3 h-3 ${originalLyrics.trim().length > 10 ? "" : "opacity-30"}`} />Original lyrics
          </span>
          <span className={`flex items-center gap-1 ${generatedLyrics.trim().length > 10 ? "text-teal-400" : "text-muted-foreground"}`}>
            <Check className={`w-3 h-3 ${generatedLyrics.trim().length > 10 ? "" : "opacity-30"}`} />New lyrics
          </span>
          {isCoverMode && (
            <span className="flex items-center gap-1 text-teal-400">
              <Sparkles className="w-3 h-3" />Cover Mode
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>← Back</Button>
          <Button
            className="gradient-brand text-white font-semibold gap-2"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            <Wand2 className="w-4 h-4" />
            {isCoverMode ? "Cover with New Lyrics" : "Generate Music with These Lyrics"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
