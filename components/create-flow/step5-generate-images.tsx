"use client"

import { useState, useRef, useCallback } from "react"
import {
  Image as ImageIcon, Loader2, ChevronLeft, Sparkles,
  CheckCircle2, AlertCircle, RotateCcw, Download, Star, Grid3X3,
  Pause, Play, Settings2, ZapIcon
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { ProjectData, SceneData } from "./create-flow"

interface Props {
  data: Partial<ProjectData>
  onNext: (data: Partial<ProjectData>) => void
  onBack: () => void
}

// ── Single scene card ─────────────────────────────────────────────────────────

function SceneImageCard({
  scene,
  onGenerate,
  onRetry,
}: {
  scene: SceneData
  onGenerate: () => void
  onRetry: () => void
}) {
  const isGenerating = scene.imageStatus === "generating"
  const isCompleted = scene.imageStatus === "completed"
  const isFailed = scene.imageStatus === "failed"
  const isPending = !scene.imageStatus || scene.imageStatus === "pending"

  return (
    <Card className={`overflow-hidden transition-all text-xs ${isCompleted ? "border-teal-500/30" : isFailed ? "border-destructive/30" : ""}`}>
      <div className="relative aspect-video bg-secondary/30">
        {isCompleted && scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scene.imageUrl} alt={`Scene ${scene.order}`} className="w-full h-full object-cover" />
        ) : isGenerating ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-1.5">
              <Loader2 className="h-5 w-5 animate-spin text-teal-400 mx-auto" />
              <p className="text-[10px] text-muted-foreground">Generating...</p>
            </div>
          </div>
        ) : isFailed ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-1">
              <AlertCircle className="h-5 w-5 text-destructive mx-auto" />
              <p className="text-[10px] text-destructive">Failed</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-1.5 left-1.5">
          <Badge className="text-[10px] py-0 px-1.5 h-4 bg-black/60 text-white border-0">
            {scene.order}
          </Badge>
        </div>
        {isCompleted && (
          <div className="absolute top-1.5 right-1.5">
            <Badge className="text-[10px] py-0 px-1.5 h-4 bg-teal-500/90 text-white border-0">
              ✓
            </Badge>
          </div>
        )}
        {isCompleted && scene.imageUrl && (
          <a
            href={scene.imageUrl}
            download={`scene-${scene.order}.jpg`}
            target="_blank"
            className="absolute bottom-1.5 right-1.5"
          >
            <Button size="icon" variant="ghost" className="h-6 w-6 bg-black/60 hover:bg-black/80 text-white">
              <Download className="h-3 w-3" />
            </Button>
          </a>
        )}
      </div>

      <CardContent className="p-2 space-y-1.5">
        {scene.lyricExcerpt && (
          <p className="text-[10px] text-muted-foreground italic line-clamp-1">
            &ldquo;{scene.lyricExcerpt}&rdquo;
          </p>
        )}
        {scene.prompt && (
          <p className="text-[10px] line-clamp-2 text-muted-foreground/80">{scene.prompt}</p>
        )}
        <div className="flex gap-1">
          {(isPending || isFailed) && (
            <Button
              size="sm"
              variant={isFailed ? "destructive" : "outline"}
              className="flex-1 h-6 text-[10px] gap-1 py-0"
              onClick={isFailed ? onRetry : onGenerate}
              disabled={isGenerating}
            >
              {isFailed ? <><RotateCcw className="h-2.5 w-2.5" />Retry</> : <><Sparkles className="h-2.5 w-2.5" />Generate</>}
            </Button>
          )}
          {isCompleted && (
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-6 text-[10px] gap-1 py-0 text-muted-foreground"
              onClick={onRetry}
            >
              <RotateCcw className="h-2.5 w-2.5" />Redo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function Step5GenerateImages({ data, onNext, onBack }: Props) {
  const [scenes, setScenes] = useState<SceneData[]>(data.scenes || [])
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [concurrency, setConcurrency] = useState(3)
  const [showSettings, setShowSettings] = useState(false)
  const pauseRef = useRef(false)
  const abortRef = useRef(false)

  const completedCount = scenes.filter((s) => s.imageStatus === "completed").length
  const failedCount = scenes.filter((s) => s.imageStatus === "failed").length
  const generatingCount = scenes.filter((s) => s.imageStatus === "generating").length
  const pendingCount = scenes.filter(
    (s) => !s.imageStatus || s.imageStatus === "pending"
  ).length
  const progress = scenes.length > 0 ? (completedCount / scenes.length) * 100 : 0
  const totalCost = (scenes.length * 0.012).toFixed(2)
  const completedCost = (completedCount * 0.012).toFixed(2)
  const isLargeBatch = scenes.length >= 20

  // ── Generate single image ──
  const generateOne = useCallback(async (index: number): Promise<void> => {
    const scene = scenes[index]
    if (!scene?.prompt) return

    setScenes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, imageStatus: "generating" } : s))
    )

    try {
      const res = await fetch("/api/kie/image/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: scene.prompt,
          negativePrompt: scene.negativePrompt || "text, watermark, distorted face, extra fingers, blurry",
          aspectRatio: scene.aspectRatio || "16:9",
        }),
      })
      if (!res.ok) throw new Error()
      const { taskId } = await res.json()

      // Poll for completion
      let attempts = 0
      while (attempts++ < 40) {
        await new Promise((r) => setTimeout(r, 3000))
        const statusRes = await fetch(`/api/kie/image/status?jobId=${taskId}`)
        const status = await statusRes.json()

        if (status.status === "completed" && status.result?.[0]) {
          setScenes((prev) =>
            prev.map((s, i) =>
              i === index
                ? { ...s, imageStatus: "completed", imageUrl: status.result[0].url, imageJobId: taskId }
                : s
            )
          )
          return
        }
        if (status.status === "failed") throw new Error("Generation failed")
      }
      throw new Error("Timeout")
    } catch {
      setScenes((prev) =>
        prev.map((s, i) => (i === index ? { ...s, imageStatus: "failed" } : s))
      )
    }
  }, [scenes])

  // ── Generate all with concurrency ──
  const generateAll = async (onlyPending = true) => {
    const targets = scenes
      .map((s, i) => i)
      .filter((i) => {
        if (!onlyPending) return true
        return !scenes[i].imageStatus || scenes[i].imageStatus === "pending" || scenes[i].imageStatus === "failed"
      })

    if (targets.length === 0) {
      toast.info("All images are already generated")
      return
    }

    setIsRunning(true)
    setIsPaused(false)
    pauseRef.current = false
    abortRef.current = false

    // Process in concurrent batches
    for (let i = 0; i < targets.length; i += concurrency) {
      if (abortRef.current) break

      // Pause support
      while (pauseRef.current) {
        await new Promise((r) => setTimeout(r, 500))
      }

      const batch = targets.slice(i, i + concurrency)
      await Promise.all(batch.map((idx) => generateOne(idx)))

      // Small delay between batches to respect rate limits
      if (i + concurrency < targets.length) {
        await new Promise((r) => setTimeout(r, 800))
      }
    }

    setIsRunning(false)
    setIsPaused(false)
    const done = scenes.filter((s) => s.imageStatus === "completed").length
    toast.success(`Done! ${done} images generated.`)
  }

  const pause = () => {
    pauseRef.current = true
    setIsPaused(true)
  }

  const resume = () => {
    pauseRef.current = false
    setIsPaused(false)
  }

  const stop = () => {
    abortRef.current = true
    pauseRef.current = false
    setIsRunning(false)
    setIsPaused(false)
    // Reset generating → pending
    setScenes((prev) =>
      prev.map((s) => (s.imageStatus === "generating" ? { ...s, imageStatus: "pending" } : s))
    )
  }

  return (
    <div className="space-y-5">
      {/* Control panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Grid3X3 className="h-5 w-5 text-teal-400" />
              Generate Images
            </CardTitle>
            <div className="flex items-center gap-2">
              {isLargeBatch && (
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
                  Large batch: {scenes.length} images
                </Badge>
              )}
              <Badge variant="outline" className="text-xs tabular-nums">
                {completedCount}/{scenes.length}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                ${completedCost} / ${totalCost}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowSettings((v) => !v)}
                title="Batch settings"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          {scenes.length > 0 && (
            <div className="space-y-1 mt-1">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  {completedCount} done
                  {generatingCount > 0 && ` · ${generatingCount} generating`}
                  {failedCount > 0 && ` · ${failedCount} failed`}
                  {pendingCount > 0 && ` · ${pendingCount} pending`}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Concurrency settings */}
          {showSettings && (
            <div className="rounded-lg border border-border/60 p-3 space-y-2 bg-secondary/20">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ZapIcon className="w-3.5 h-3.5 text-teal-400" />
                Batch Settings
              </p>
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                  Parallel requests
                </Label>
                <div className="flex items-center gap-2">
                  {[1, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setConcurrency(n)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                        concurrency === n
                          ? "border-teal-500/50 bg-teal-500/15 text-teal-400"
                          : "border-border/60 hover:border-border text-muted-foreground"
                      }`}
                    >
                      {n}×
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {concurrency === 1 ? "Safe, slowest" : concurrency <= 3 ? "Recommended" : concurrency <= 5 ? "Fast" : "Fastest (may hit rate limit)"}
                </span>
              </div>
              {isLargeBatch && (
                <p className="text-[10px] text-amber-400">
                  Tip: For {scenes.length} images at {concurrency}× concurrency, est. ~{Math.ceil(scenes.length / concurrency * 25 / 60)} min.
                  Use 5× for fastest generation.
                </p>
              )}
            </div>
          )}

          {/* Main action buttons */}
          <div className="flex gap-2">
            {!isRunning ? (
              <>
                <Button
                  variant="gradient"
                  onClick={() => generateAll(true)}
                  disabled={scenes.length === 0}
                  className="flex-1 gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {completedCount > 0
                    ? `Generate Remaining (${pendingCount + failedCount})`
                    : `Generate All ${scenes.length} Images`}
                </Button>
                {completedCount < scenes.length && failedCount === 0 && completedCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => generateAll(false)}
                    className="gap-1.5 text-sm"
                    title="Regenerate all (including completed)"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Redo All
                  </Button>
                )}
              </>
            ) : (
              <>
                {!isPaused ? (
                  <Button variant="outline" onClick={pause} className="gap-2">
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button className="gradient-brand text-white gap-2" onClick={resume}>
                    <Play className="h-4 w-4" />
                    Resume
                  </Button>
                )}
                <Button variant="destructive" onClick={stop} className="gap-2">
                  Stop
                </Button>
                <div className="flex-1 flex items-center justify-end">
                  <span className="text-xs text-muted-foreground animate-pulse">
                    {isPaused ? "Paused..." : `Generating${generatingCount > 0 ? ` (${generatingCount} active)` : "..."}`}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image grid */}
      {scenes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No scenes to generate</p>
          <p className="text-sm">Go back and create your storyboard first.</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${
          scenes.length <= 6
            ? "grid-cols-2 sm:grid-cols-3"
            : scenes.length <= 20
            ? "grid-cols-3 sm:grid-cols-4"
            : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5"
        }`}>
          {scenes.map((scene, index) => (
            <SceneImageCard
              key={`img-${scene.order}-${index}`}
              scene={scene}
              onGenerate={() => generateOne(index)}
              onRetry={() => {
                setScenes((prev) =>
                  prev.map((s, i) => (i === index ? { ...s, imageStatus: "pending" } : s))
                )
                generateOne(index)
              }}
            />
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="sticky bottom-0 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-4 bg-background/95 backdrop-blur border-t flex items-center justify-between gap-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {failedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => generateAll(true)}
            >
              <RotateCcw className="h-3 w-3" />
              Retry {failedCount} failed
            </Button>
          )}
          <Badge variant="outline" className="text-xs gap-1">
            <CheckCircle2 className="h-3 w-3 text-teal-400" />
            {completedCount} images ready
          </Badge>
          <Button
            variant="gradient"
            onClick={() => onNext({ scenes })}
            disabled={completedCount === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Create Asset Pack
          </Button>
        </div>
      </div>
    </div>
  )
}
