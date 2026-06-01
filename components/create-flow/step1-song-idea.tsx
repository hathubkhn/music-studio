"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Sparkles, Loader2, ShieldAlert, Globe } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { songIdeaSchema, type SongIdeaFormData } from "@/lib/validators"
import type { ProjectData } from "./create-flow"

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "vi", label: "Vietnamese" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
]

const AUDIENCE_OPTIONS = [
  "Kids (3-8)", "Children (6-12)", "Teens", "Family", "Adults",
  "Education / School", "Marketing / Business", "Entertainment",
  "Travel Content", "General / All Ages"
]

const MOOD_OPTIONS = [
  "Happy & Cheerful", "Emotional & Touching", "Epic & Powerful",
  "Calm & Relaxing", "Funny & Playful", "Cinematic & Dramatic",
  "Romantic & Sweet", "Energetic & Hype", "Nostalgic & Dreamy",
  "Inspiring & Uplifting"
]

const GENRE_OPTIONS = [
  "Pop", "Acoustic Folk", "EDM / Electronic", "Lo-fi Hip Hop",
  "Rock", "Orchestral / Classical", "Children's Song", "R&B / Soul",
  "Country", "Jazz", "Reggae", "K-Pop Style", "Latin Pop", "Indie"
]

const VOCAL_OPTIONS = [
  "Female Vocal", "Male Vocal", "Duet (Male + Female)",
  "Children's Choir", "Instrumental Only", "Rap / Hip-Hop",
  "Group / Choir"
]

const DURATION_OPTIONS = [
  "30 seconds", "45 seconds", "60 seconds (1 min)",
  "90 seconds", "2 minutes", "2.5 minutes", "3 minutes",
  "3.5 minutes", "4 minutes", "4+ minutes"
]

const PURPOSE_OPTIONS = [
  "TikTok / Reels (15-60s)", "YouTube Shorts", "YouTube Video",
  "Classroom / Education", "Social Media Ad", "Personal Project",
  "Music Video", "Background Music", "Podcast Intro"
]

const EXAMPLE_PROMPTS = [
  "A cheerful children's song about saying hello in different languages, bright pop style, for a YouTube educational video",
  "An uplifting corporate anthem for a tech startup, epic orchestral with modern beats, for an ad campaign",
  "A relaxing lo-fi song about rainy mornings and coffee, for a YouTube study playlist",
  "A fun kids song about counting numbers and shapes, with a playful cartoon style",
]

interface Props {
  data: Partial<ProjectData>
  onNext: (data: Partial<ProjectData>) => void
}

export function Step1SongIdea({ data, onNext }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingStep, setGeneratingStep] = useState<"brief" | "lyrics" | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SongIdeaFormData>({
    resolver: zodResolver(songIdeaSchema),
    defaultValues: {
      prompt: data.prompt || "",
      targetLanguage: data.targetLanguage || "en",
      audience: data.audience || "",
      mood: data.mood || "",
      genre: data.genre || "",
      vocalPreference: data.vocalPreference || "",
      durationTarget: data.durationTarget || "2 minutes",
      outputPurpose: data.outputPurpose || "",
    },
  })

  const prompt = watch("prompt")

  async function onSubmit(formData: SongIdeaFormData) {
    setIsGenerating(true)
    try {
      // Step 1: Generate song brief
      setGeneratingStep("brief")
      const briefRes = await fetch("/api/ai/generate-song-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!briefRes.ok) throw new Error("Failed to generate song brief")
      const brief = await briefRes.json()

      toast.success("Song brief ready! Generating lyrics...")

      // Step 2: Generate lyrics from the brief automatically
      setGeneratingStep("lyrics")
      const lyricsRes = await fetch("/api/ai/generate-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief.concept,
          title: brief.titleSuggestions?.[0] || "Untitled Song",
          language: formData.targetLanguage,
          mood: formData.mood,
          genre: formData.genre,
          vocalStyle: formData.vocalPreference,
          durationTarget: formData.durationTarget,
          style: brief.recommendedStyle,
        }),
      })
      if (!lyricsRes.ok) throw new Error("Failed to generate lyrics")
      const lyrics = await lyricsRes.json()

      toast.success("Lyrics generated! Review and edit below.")

      onNext({
        ...formData,
        songBrief: brief,
        // Pre-fill all Step 2 fields from the lyrics response
        title: lyrics.title || brief.titleSuggestions?.[0] || "Untitled Song",
        lyrics: lyrics.lyrics,
        stylePrompt: lyrics.stylePrompt,
        lyricsGenre: lyrics.genre,
        lyricsMood: lyrics.mood,
        tempo: lyrics.tempo,
        vocalStyle: lyrics.vocalStyle,
        instrumentation: lyrics.instrumentation,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed. Please try again.")
    } finally {
      setIsGenerating(false)
      setGeneratingStep(null)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Main idea */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-400" />
            Describe Your Song Idea
          </CardTitle>
          <CardDescription>
            Tell the AI what kind of song you want to create. The more detail, the better the result.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Song Idea / Prompt</Label>
            <Textarea
              id="prompt"
              {...register("prompt")}
              placeholder="e.g. A cheerful children's song about saying hello in different languages, with a bright pop style, suitable for a YouTube educational video for kids age 5-8..."
              className="min-h-[120px] resize-none text-base"
            />
            {errors.prompt && (
              <p className="text-destructive text-xs">{errors.prompt.message}</p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{prompt.length} / 1000 characters</span>
              {prompt.length === 0 && (
                <span>Try an example below ↓</span>
              )}
            </div>
          </div>

          {/* Example prompts */}
          {prompt.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Example prompts:</p>
              <div className="grid gap-2">
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setValue("prompt", ex)}
                    className="text-left text-xs p-3 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Song Configuration</CardTitle>
          <CardDescription>Help the AI understand exactly what you need</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Language */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Target Language
              </Label>
              <Select
                defaultValue={data.targetLanguage || "en"}
                onValueChange={(v) => setValue("targetLanguage", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.targetLanguage && (
                <p className="text-destructive text-xs">{errors.targetLanguage.message}</p>
              )}
            </div>

            {/* Audience */}
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select
                defaultValue={data.audience}
                onValueChange={(v) => setValue("audience", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Who is this for?" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.audience && (
                <p className="text-destructive text-xs">{errors.audience.message}</p>
              )}
            </div>

            {/* Mood */}
            <div className="space-y-2">
              <Label>Mood</Label>
              <Select
                defaultValue={data.mood}
                onValueChange={(v) => setValue("mood", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="What feeling?" />
                </SelectTrigger>
                <SelectContent>
                  {MOOD_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.mood && (
                <p className="text-destructive text-xs">{errors.mood.message}</p>
              )}
            </div>

            {/* Genre */}
            <div className="space-y-2">
              <Label>Music Genre</Label>
              <Select
                defaultValue={data.genre}
                onValueChange={(v) => setValue("genre", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.genre && (
                <p className="text-destructive text-xs">{errors.genre.message}</p>
              )}
            </div>

            {/* Vocal */}
            <div className="space-y-2">
              <Label>Vocal Preference</Label>
              <Select
                defaultValue={data.vocalPreference}
                onValueChange={(v) => setValue("vocalPreference", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vocal style" />
                </SelectTrigger>
                <SelectContent>
                  {VOCAL_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vocalPreference && (
                <p className="text-destructive text-xs">{errors.vocalPreference.message}</p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Target Duration</Label>
              <Select
                defaultValue={data.durationTarget || "2 minutes"}
                onValueChange={(v) => setValue("durationTarget", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How long?" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Output purpose */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Output Purpose</Label>
              <Select
                defaultValue={data.outputPurpose}
                onValueChange={(v) => setValue("outputPurpose", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Where will you publish this?" />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSE_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.outputPurpose && (
                <p className="text-destructive text-xs">{errors.outputPurpose.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety notice */}
      <Alert variant="info">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Content Safety:</strong> MusicStudio AI generates original content only. 
          Do not request imitation of copyrighted songs or living artists' unique styles. 
          All generated content must comply with community guidelines.
        </AlertDescription>
      </Alert>

      {/* Action bar */}
      <div className="sticky bottom-0 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-4 bg-background/95 backdrop-blur border-t border-border/50">
        {/* Progress indicator when generating */}
        {isGenerating && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="flex items-center gap-2 text-xs">
              <div className={`flex items-center gap-1.5 ${generatingStep === "brief" ? "text-teal-400" : generatingStep === "lyrics" ? "text-teal-400/50 line-through" : "text-muted-foreground"}`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${generatingStep === "brief" ? "bg-teal-500 text-background" : "bg-teal-500/30 text-teal-400"}`}>
                  {generatingStep === "lyrics" ? "✓" : "1"}
                </div>
                Song Brief
              </div>
              <div className="w-6 h-px bg-border/60" />
              <div className={`flex items-center gap-1.5 ${generatingStep === "lyrics" ? "text-teal-400" : "text-muted-foreground"}`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${generatingStep === "lyrics" ? "bg-teal-500 text-background" : "bg-secondary text-muted-foreground"}`}>
                  2
                </div>
                Lyrics & Style
              </div>
            </div>
            <span className="text-xs text-muted-foreground ml-2">
              {generatingStep === "brief" ? "Generating song concept..." : "Writing lyrics and style prompt..."}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Sparkles className="h-3 w-3 text-teal-400" />
              Estimated: ~$0.001
            </Badge>
            <span className="text-xs text-muted-foreground">brief + lyrics in one step</span>
          </div>
          <Button
            type="submit"
            variant="gradient"
            disabled={isGenerating}
            className="gap-2 min-w-[190px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {generatingStep === "brief" ? "Building Song Brief..." : "Writing Lyrics..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Brief & Lyrics
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
