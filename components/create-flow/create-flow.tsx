"use client"

import { useState, useEffect } from "react"
import { Music2, FileText, Image, Headphones, Package, Video, Palette, FolderOpen, Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProjectSave } from "@/lib/hooks/use-project-save"
import { ModeSelector, type FlowMode } from "./mode-selector"
import { StepImport } from "./step-import"
import { StepStyleCopy } from "./step-style-copy"
import { StepMashup } from "./step-mashup"
import { Step1SongIdea } from "./step1-song-idea"
import { Step2LyricsEditor } from "./step2-lyrics-editor"
import { Step3GenerateMusic } from "./step3-generate-music"
import { Step4Storyboard } from "./step4-storyboard"
import { Step5GenerateImages } from "./step5-generate-images"
import { Step6AssetPack } from "./step6-asset-pack"
import { Step7Video } from "./step7-video"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProjectData = {
  // Step 1 / general
  prompt: string
  targetLanguage: string
  audience: string
  mood: string
  genre: string
  vocalPreference: string
  durationTarget: string
  outputPurpose: string
  // Song brief + lyrics
  songBrief?: {
    titleSuggestions: string[]
    concept: string
    lyricalTheme: string
    targetEmotion: string
    structure: string[]
    recommendedStyle: string
    visualDirection: string
  }
  title?: string
  lyrics?: string
  stylePrompt?: string
  lyricsGenre?: string
  lyricsMood?: string
  tempo?: string
  vocalStyle?: string
  instrumentation?: string
  negativePrompt?: string
  language?: string
  // Music
  musicJobId?: string
  musicStatus?: string
  audioUrl?: string
  // Storyboard + images
  scenes?: SceneData[]
  globalVisualStyle?: string
  // Lyric video: single mood background image
  bgImageUrl?: string
  // Asset pack
  assetPackUrl?: string
  // Import mode extras
  importedAudioUrl?: string
  importedAudioName?: string
  importedImages?: { url: string; name: string; file?: File }[]
  // Cover mode: public URL of reference audio to preserve melody, only change lyrics
  referenceAudioUrl?: string
  audioWeight?: number   // 0–1: how strongly to follow source melody (default 0.8)
  styleWeight?: number   // 0–1: how strongly to follow style tags
  vocalGender?: "m" | "f"
  // Mashup mode: two reference audio tracks blended into one new song
  mashupAudio1Url?: string
  mashupAudio2Url?: string
  weirdnessConstraint?: number  // 0–1: how experimental the blend can be
  // Kie track-level IDs (needed for replace-section / language translate)
  musicAudioId?: string    // individual track ID within the generation task
  musicDuration?: number   // track duration in seconds
  // Lyrics writing instructions
  customPrompt?: string    // user's own lyric writing instructions
  chorusStyle?: string     // user's chorus-specific guidelines
}

export type SceneData = {
  order: number
  lyricExcerpt: string
  description?: string
  prompt?: string
  negativePrompt?: string
  aspectRatio: string
  textOverlay?: string
  style?: string
  imageUrl?: string
  imageStatus?: "pending" | "generating" | "completed" | "failed"
  imageJobId?: string
}

// ── Step definitions ──────────────────────────────────────────────────────────

type StepKey =
  | "import"
  | "style-copy"
  | "mashup"
  | "song-idea"
  | "lyrics"
  | "music"
  | "storyboard"
  | "images"
  | "assets"
  | "video"

const STEP_META: Record<StepKey, { label: string; short: string; icon: React.ElementType }> = {
  import:       { label: "Import Assets",  short: "Import",  icon: FolderOpen },
  "style-copy": { label: "Copy Style",     short: "Style",   icon: Music2 },
  mashup:       { label: "Mashup Setup",   short: "Mashup",  icon: Shuffle },
  "song-idea":  { label: "Song Idea",      short: "Idea",    icon: Music2 },
  lyrics:       { label: "Lyrics & Style", short: "Lyrics",  icon: FileText },
  music:        { label: "Generate Music", short: "Music",   icon: Headphones },
  storyboard:   { label: "Storyboard",     short: "Scenes",  icon: Palette },
  images:       { label: "Generate Images",short: "Images",  icon: Image },
  assets:       { label: "Asset Pack",     short: "Assets",  icon: Package },
  video:        { label: "Video",          short: "Video",   icon: Video },
}

// Build the active step list based on mode and what was imported
function buildSteps(mode: FlowMode, data: Partial<ProjectData>): StepKey[] {
  if (mode === "scratch") {
    return ["song-idea", "lyrics", "music", "storyboard", "images", "assets", "video"]
  }
  if (mode === "style-copy") {
    return ["style-copy", "music", "storyboard", "images", "assets", "video"]
  }
  if (mode === "mashup") {
    return ["mashup", "music", "storyboard", "images", "assets", "video"]
  }
  // Import mode — skip steps where assets are already provided
  const steps: StepKey[] = ["import", "lyrics"]
  if (!data.importedAudioUrl && !data.audioUrl) steps.push("music")
  if (!data.importedImages?.length) {
    steps.push("storyboard", "images")
  }
  steps.push("assets", "video")
  return steps
}

// ── Stepper UI ─────────────────────────────────────────────────────────────────

function Stepper({
  steps,
  current,
  completed,
  onGoTo,
}: {
  steps: StepKey[]
  current: number
  completed: Set<number>
  onGoTo: (i: number) => void
}) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {steps.map((key, i) => {
        const meta = STEP_META[key]
        const Icon = meta.icon
        const isActive = i === current
        const isDone = completed.has(i)
        const isClickable = isDone || i === current

        return (
          <div key={key} className="flex items-center">
            <button
              onClick={() => isClickable && onGoTo(i)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm whitespace-nowrap",
                isActive && "bg-teal-500/15 text-teal-400 font-medium border border-teal-500/30",
                isDone && !isActive && "text-teal-400 hover:bg-teal-500/8 cursor-pointer",
                !isActive && !isDone && "text-muted-foreground cursor-not-allowed opacity-40"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                isActive && "bg-teal-500 text-background",
                isDone && "bg-teal-500 text-background",
                !isActive && !isDone && "bg-secondary text-muted-foreground"
              )}>
                {isDone ? "✓" : <Icon className="w-3 h-3" />}
              </div>
              <span className="hidden sm:block">{meta.label}</span>
              <span className="sm:hidden">{meta.short}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn(
                "w-6 h-0.5 mx-1 shrink-0",
                isDone ? "bg-teal-500" : "bg-border/60"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Flow Component ───────────────────────────────────────────────────────

export function CreateFlow() {
  const [mode, setMode] = useState<FlowMode | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [projectData, setProjectData] = useState<Partial<ProjectData>>({})
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  const { projectIdRef, createProject, saveProject } = useProjectSave()

  // Recompute active steps whenever data changes (audio/images may be added later)
  const activeSteps = mode ? buildSteps(mode, projectData) : []
  const currentKey = activeSteps[stepIndex] as StepKey | undefined

  const updateProject = (data: Partial<ProjectData>) => {
    setProjectData((prev) => ({ ...prev, ...data }))
  }

  const goNext = async (data?: Partial<ProjectData>) => {
    const merged = data ? { ...projectData, ...data } : projectData
    if (data) updateProject(data)
    setCompleted((prev) => new Set([...prev, stepIndex]))
    setStepIndex((i) => Math.min(i + 1, activeSteps.length - 1))

    // Auto-save to DB (create on first step, patch on subsequent)
    setIsSaving(true)
    try {
      if (!projectIdRef.current) {
        await createProject(merged)
      }
      await saveProject(merged)
    } finally {
      setIsSaving(false)
    }
  }

  const goPrev = () => {
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  const goTo = (i: number) => {
    if (completed.has(i) || i === stepIndex) setStepIndex(i)
  }

  const handleModeSelect = (m: FlowMode) => {
    setMode(m)
    setStepIndex(0)
    setCompleted(new Set())
    setProjectData({})
    projectIdRef.current = null
  }

  // ── Mode Selector ──
  if (!mode) {
    return <ModeSelector onSelect={handleModeSelect} />
  }

  const mergedData = projectData

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Step {stepIndex + 1} of {activeSteps.length} —{" "}
            {currentKey ? STEP_META[currentKey].label : ""}
            {(mode === "import" || mode === "style-copy") && (
              <button
                className="ml-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                onClick={() => setMode(null)}
              >
                Change mode
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving && <span className="animate-pulse">Saving…</span>}
          {!isSaving && projectIdRef.current && (
            <span className="text-teal-500">✓ Saved</span>
          )}
          {projectIdRef.current && (
            <a
              href={`/projects/${projectIdRef.current}`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              View project
            </a>
          )}
        </div>
      </div>

      {/* Stepper */}
      <Stepper
        steps={activeSteps}
        current={stepIndex}
        completed={completed}
        onGoTo={goTo}
      />

      {/* Step content */}
      <div>
        {currentKey === "import" && (
          <StepImport
            data={mergedData}
            onNext={(data) => {
              updateProject(data)
              setCompleted(new Set([...completed, stepIndex]))
              const newData = { ...projectData, ...data }
              setStepIndex(1)
              setProjectData(newData)
            }}
            onBack={() => setMode(null)}
          />
        )}
        {currentKey === "style-copy" && (
          <StepStyleCopy
            data={mergedData}
            onNext={(data) => goNext(data)}
            onBack={() => setMode(null)}
          />
        )}
        {currentKey === "mashup" && (
          <StepMashup
            data={mergedData}
            onNext={(data) => goNext(data)}
          />
        )}
        {currentKey === "song-idea" && (
          <Step1SongIdea
            data={mergedData}
            onNext={(data) => goNext(data)}
          />
        )}
        {currentKey === "lyrics" && (
          <Step2LyricsEditor
            data={mergedData}
            onNext={(data) => goNext(data)}
            onBack={goPrev}
          />
        )}
        {currentKey === "music" && (
          <Step3GenerateMusic
            data={mergedData}
            onNext={(data) => goNext(data)}
            onBack={goPrev}
          />
        )}
        {currentKey === "storyboard" && (
          <Step4Storyboard
            data={mergedData}
            onNext={(data) => goNext(data)}
            onBack={goPrev}
          />
        )}
        {currentKey === "images" && (
          <Step5GenerateImages
            data={mergedData}
            onNext={(data) => goNext(data)}
            onBack={goPrev}
          />
        )}
        {currentKey === "assets" && (
          <Step6AssetPack
            data={mergedData}
            onNext={() => goNext()}
            onBack={goPrev}
          />
        )}
        {currentKey === "video" && (
          <Step7Video
            data={mergedData}
            onBack={goPrev}
          />
        )}
      </div>
    </div>
  )
}
