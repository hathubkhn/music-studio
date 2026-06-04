"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import {
  Sparkles, Loader2, ChevronLeft, Save, RotateCcw,
  Wand2, Scissors, Star, Baby, Music2, Info, ChevronDown, ChevronUp, Mic2
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
import { lyricsEditorSchema, type LyricsEditorFormData } from "@/lib/validators"
import type { ProjectData } from "./create-flow"

interface Props {
  data: Partial<ProjectData>
  onNext: (data: Partial<ProjectData>) => void
  onBack: () => void
}

const IMPROVE_ACTIONS = [
  { icon: RotateCcw, label: "Regenerate", instruction: "regenerate these lyrics from scratch with the same theme" },
  { icon: Wand2, label: "Make Catchier", instruction: "rewrite to make these lyrics more catchy and memorable" },
  { icon: Scissors, label: "Shorten", instruction: "shorten these lyrics while keeping the core message and hooks" },
  { icon: Star, label: "Improve Quality", instruction: "improve the lyrical quality, rhyme scheme, and flow" },
  { icon: Baby, label: "Kid-Friendly", instruction: "rewrite to be more suitable and engaging for young children" },
  { icon: Music2, label: "Better Rhymes", instruction: "improve the rhyming pattern while keeping the meaning" },
]

const DEFAULT_CHORUS_STYLE =
  `Start chorus with a simple hook. Repeat the hook 2–3 times.
Use contrast: I miss you / but I won't chase; I loved you / but I let you go; I own the pain / and set you free.
Keep chorus lines short (6–10 words) and memorable.`

const CHORUS_PRESETS = [
  {
    label: "Heartbreak & Letting Go",
    value: `Start chorus with a simple hook. Repeat the hook 2–3 times.
Use contrast lines: "I miss you / but I won't chase", "I loved you / but I let you go", "I own the pain / and set you free".
Keep chorus lines short (6–10 words) and memorable.`,
  },
  {
    label: "Uplifting & Hope",
    value: `Open with a soaring, hopeful hook. Repeat 2–3 times with energy.
Use rising imagery: sunlight, open doors, new beginnings.
End the chorus on a high note — leave the listener feeling lifted.`,
  },
  {
    label: "Nostalgic & Longing",
    value: `Start with a quiet, aching hook that references a specific memory.
Repeat the hook with small variations each time.
Use sensory details: a scent, a song, a place. Keep lines gentle and wistful.`,
  },
  {
    label: "Empowering Anthem",
    value: `Open with a bold declarative line. Repeat 3× with growing intensity.
Use "I am / I will / I choose" structure.
Make the hook feel like a rallying cry — short, punchy, impossible to forget.`,
  },
]

export function Step2LyricsEditor({ data, onNext, onBack }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImproving, setIsImproving] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [customPrompt, setCustomPrompt] = useState(data.customPrompt ?? "")
  const [chorusStyle, setChorusStyle] = useState(data.chorusStyle ?? DEFAULT_CHORUS_STYLE)
  // True when lyrics arrived pre-filled from Step 1
  const hasPrefilledLyrics = Boolean(data.lyrics)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(lyricsEditorSchema),
    defaultValues: {
      title: data.title || data.songBrief?.titleSuggestions?.[0] || "",
      lyrics: data.lyrics || "",
      stylePrompt: data.stylePrompt || data.songBrief?.recommendedStyle || "",
      genre: data.lyricsGenre || data.genre || "",
      mood: data.lyricsMood || data.mood || "",
      vocalStyle: data.vocalStyle || data.vocalPreference || "",
      instrumentation: data.instrumentation || "",
      tempo: data.tempo || "",
      negativePrompt: data.negativePrompt || "",
      language: data.targetLanguage || "en",
    },
  })

  const lyrics = watch("lyrics")
  const stylePrompt = watch("stylePrompt")
  const brief = data.songBrief

  // Generate lyrics from brief
  async function generateLyrics() {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/ai/generate-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief?.concept || data.prompt,
          title: data.title,
          language: data.targetLanguage,
          mood: data.mood,
          genre: data.genre,
          vocalStyle: data.vocalPreference,
          durationTarget: data.durationTarget,
          style: brief?.recommendedStyle,
          customPrompt: customPrompt.trim() || undefined,
          chorusStyle: chorusStyle.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      const result = await res.json()
      setValue("title", result.title)
      setValue("lyrics", result.lyrics)
      setValue("stylePrompt", result.stylePrompt)
      setValue("genre", result.genre)
      setValue("mood", result.mood)
      setValue("tempo", result.tempo)
      setValue("vocalStyle", result.vocalStyle)
      setValue("instrumentation", result.instrumentation)
      toast.success("Lyrics generated!")
    } catch {
      toast.error("Failed to generate lyrics")
    } finally {
      setIsGenerating(false)
    }
  }

  // Improve lyrics
  async function improveLyrics(instruction: string, label: string) {
    const currentLyrics = watch("lyrics")
    if (!currentLyrics) { toast.error("No lyrics to improve"); return }
    setIsImproving(label)
    try {
      const res = await fetch("/api/ai/improve-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyrics: currentLyrics, instruction }),
      })
      if (!res.ok) throw new Error()
      const result = await res.json()
      setValue("lyrics", result.lyrics)
      toast.success(`Lyrics updated: ${label}`)
    } catch {
      toast.error("Failed to improve lyrics")
    } finally {
      setIsImproving(null)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSubmit(formData: any) {
    onNext({
      title: formData.title,
      lyrics: formData.lyrics,
      stylePrompt: formData.stylePrompt,
      lyricsGenre: formData.genre,
      lyricsMood: formData.mood,
      tempo: formData.tempo,
      vocalStyle: formData.vocalStyle,
      instrumentation: formData.instrumentation,
      negativePrompt: formData.negativePrompt,
      language: formData.language,
      customPrompt,
      chorusStyle,
    })
  }

  const wordCount = lyrics.split(/\s+/).filter(Boolean).length

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Song brief summary */}
      {brief && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">{brief.concept}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {brief.titleSuggestions?.map((t: string) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setValue("title", t)}
                      className="px-2 py-0.5 text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lyrics writing instructions panel */}
      <Card className="border-violet-500/30">
        <button
          type="button"
          onClick={() => setShowInstructions((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">Lyrics Writing Instructions</span>
            <span className="text-xs text-muted-foreground ml-1">(optional — guide AI on style, tone, structure)</span>
          </div>
          {showInstructions
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </button>

        {showInstructions && (
          <CardContent className="pt-0 space-y-5 border-t border-border/40">
            {/* Custom writing prompt */}
            <div className="space-y-2 pt-4">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Writing Style Prompt
              </Label>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                className="text-sm resize-none bg-background/60"
                placeholder={`e.g. Write simple but powerful heartbreak lyrics about regret and letting go. Use short singable lines, direct emotions, strong chorus hook, and avoid overly poetic language.`}
              />
              <p className="text-xs text-muted-foreground">
                Describe the emotional tone, lyric style, or specific writing rules you want the AI to follow.
              </p>
            </div>

            {/* Chorus style */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Chorus Guidelines
                </Label>
                <span className="text-xs text-muted-foreground">or pick a preset →</span>
              </div>
              {/* Preset chips */}
              <div className="flex flex-wrap gap-2">
                {CHORUS_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setChorusStyle(p.value)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      chorusStyle === p.value
                        ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                        : "border-border/60 text-muted-foreground hover:border-violet-500/30 hover:text-violet-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Textarea
                value={chorusStyle}
                onChange={(e) => setChorusStyle(e.target.value)}
                rows={4}
                className="text-xs font-mono resize-none bg-background/60"
                placeholder="Describe how the chorus should be structured, how many times it repeats, what emotional contrast it should use…"
              />
              <p className="text-xs text-muted-foreground">
                These guidelines are injected directly into the AI prompt for every generation and regeneration.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Success banner when lyrics arrived from Step 1 */}
      {hasPrefilledLyrics && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-500/10 border border-teal-500/25">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-teal-300">Lyrics generated automatically!</p>
            <p className="text-xs text-teal-400/70">Review and edit anything below before generating music.</p>
          </div>
        </div>
      )}

      {/* Generate button only shown if no lyrics yet */}
      {!lyrics && (
        <Card className="border-dashed border-border/60">
          <CardContent className="p-8 text-center">
            <Music2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">No lyrics yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate lyrics based on your song brief, or write them manually below.
            </p>
            <Button
              type="button"
              variant="gradient"
              onClick={generateLyrics}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Generating Lyrics...</>
              ) : (
                <><Sparkles className="h-4 w-4" />Generate Lyrics with AI</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lyrics editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lyrics Editor</CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateLyrics}
                disabled={isGenerating}
                className="gap-1.5 text-xs"
              >
                {isGenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                Regenerate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Song Title</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Enter song title"
              className="font-medium"
            />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          {/* Lyrics textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="lyrics">Lyrics</Label>
              <span className="text-xs text-muted-foreground">{wordCount} words</span>
            </div>
            <Textarea
              id="lyrics"
              {...register("lyrics")}
              placeholder="Your lyrics will appear here. Use [Verse 1], [Chorus], [Bridge] section markers."
              className="min-h-[320px] font-mono text-sm resize-none"
            />
            {errors.lyrics && <p className="text-destructive text-xs">{errors.lyrics.message}</p>}
          </div>

          {/* Improve actions */}
          {lyrics && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick improvements:</p>
              <div className="flex flex-wrap gap-2">
                {IMPROVE_ACTIONS.map((action) => {
                  const Icon = action.icon
                  return (
                    <Button
                      key={action.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => improveLyrics(action.instruction, action.label)}
                      disabled={!!isImproving}
                      className="gap-1.5 text-xs h-8"
                    >
                      {isImproving === action.label ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Icon className="h-3 w-3" />
                      )}
                      {action.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Style prompt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Music2 className="h-4 w-4 text-teal-400" />
            Suno Style Prompt
          </CardTitle>
          <CardDescription>
            This will be sent to Suno for music generation. Edit freely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              {...register("stylePrompt")}
              placeholder="e.g. upbeat children's pop, acoustic guitar, piano, 120 BPM, children's choir vocals, bright and cheerful, major key"
              className="min-h-[80px] text-sm resize-none"
            />
            {errors.stylePrompt && (
              <p className="text-destructive text-xs">{errors.stylePrompt.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: "genre", label: "Genre", placeholder: "e.g. Pop" },
              { id: "mood", label: "Mood", placeholder: "e.g. Happy" },
              { id: "tempo", label: "Tempo", placeholder: "e.g. 120 BPM" },
              { id: "vocalStyle", label: "Vocal Style", placeholder: "e.g. Children's choir" },
              { id: "instrumentation", label: "Instrumentation", placeholder: "e.g. Guitar, piano" },
              { id: "negativePrompt", label: "Avoid", placeholder: "e.g. heavy metal, dark" },
            ].map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label className="text-xs">{field.label}</Label>
                <Input
                  {...register(field.id as keyof LyricsEditorFormData)}
                  placeholder={field.placeholder}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="sticky bottom-0 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-4 bg-background/95 backdrop-blur border-t flex items-center justify-between gap-4">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs gap-1">
            <Music2 className="h-3 w-3 text-teal-400" />
            Next: Generate Music ~$0.05
          </Badge>
          <Button type="submit" variant="gradient" disabled={isGenerating} className="gap-2">
            <Save className="h-4 w-4" />
            Save & Continue
          </Button>
        </div>
      </div>
    </form>
  )
}
