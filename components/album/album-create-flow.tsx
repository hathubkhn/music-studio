"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlbumSetup } from "./step1-album-setup"
import { AlbumTrackList } from "./step2-track-list"
import { AlbumGenerate } from "./step3-generate-tracks"
import { Disc3, ListMusic, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export type AlbumTrack = {
  id?: string           // set after saving to DB
  order: number
  title: string
  description?: string
  lyrics?: string
  stylePrompt?: string
  audioUrl?: string
  audioJobId?: string
  duration?: number
  status: "pending" | "generating" | "completed" | "failed"
}

export type AlbumData = {
  id?: string
  title: string
  theme: string
  genre: string
  mood: string
  language: string
  stylePrompt: string
  audience: string
  numTracks: number
  targetDurationMin?: number  // total album duration target in minutes
  tracks: AlbumTrack[]
}

const STEPS = [
  { key: "setup",    label: "Album Setup",     icon: Disc3 },
  { key: "tracks",   label: "Track List",      icon: ListMusic },
  { key: "generate", label: "Generate Music",  icon: Zap },
]

export function AlbumCreateFlow() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [album, setAlbum] = useState<AlbumData>({
    title: "",
    theme: "",
    genre: "Pop",
    mood: "Uplifting",
    language: "English",
    stylePrompt: "",
    audience: "General",
    numTracks: 5,
    targetDurationMin: undefined,
    tracks: [],
  })

  const updateAlbum = (patch: Partial<AlbumData>) =>
    setAlbum((prev) => ({ ...prev, ...patch }))

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0))

  const currentStep = STEPS[stepIndex].key

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isActive = i === stepIndex
          const isDone   = i < stepIndex
          return (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => isDone && setStepIndex(i)}
                disabled={!isDone && !isActive}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive && "bg-violet-500/15 text-violet-400 border border-violet-500/30",
                  isDone  && "text-teal-400 cursor-pointer hover:bg-teal-500/8",
                  !isActive && !isDone && "text-muted-foreground opacity-40 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isActive && "bg-violet-500 text-white",
                  isDone   && "bg-teal-500 text-white",
                  !isActive && !isDone && "bg-muted text-muted-foreground"
                )}>
                  {isDone ? "✓" : i + 1}
                </div>
                <Icon className="w-4 h-4" />
                {step.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 h-px mx-1",
                  i < stepIndex ? "bg-teal-500/50" : "bg-border/40"
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Steps */}
      {currentStep === "setup" && (
        <AlbumSetup
          data={album}
          onChange={updateAlbum}
          onNext={goNext}
        />
      )}
      {currentStep === "tracks" && (
        <AlbumTrackList
          data={album}
          onChange={updateAlbum}
          onNext={goNext}
          onBack={goPrev}
        />
      )}
      {currentStep === "generate" && (
        <AlbumGenerate
          data={album}
          onChange={updateAlbum}
          onBack={goPrev}
          onFinish={(albumId) => router.push(`/albums/${albumId}`)}
        />
      )}
    </div>
  )
}
