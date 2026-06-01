"use client"

import { useState } from "react"
import {
  Palette, Loader2, ChevronLeft, Sparkles, Edit3,
  Globe, RefreshCw, ChevronDown, ChevronUp, Image as ImageIcon,
  Plus, Trash2, MapPin, Wand2
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { ProjectData, SceneData } from "./create-flow"

// Parse lyric sections to suggest scene count
function parseLyricSections(lyrics: string): number {
  const headers = lyrics.match(/^\[([^\]]+)\]/gm) || []
  if (headers.length > 0) return Math.min(headers.length, 100)
  const paragraphs = lyrics.split(/\n\n+/).filter((p) => p.trim().length > 10)
  return Math.min(Math.max(paragraphs.length, 2), 100)
}

// Extract country + greeting pairs from lyrics like:
//   "In Vietnam, we say "Xin chào,""
//   "In France, we say "Bonjour,""
export type CountryScene = {
  country: string
  greeting: string
  region?: string
  prompt: string
}

function extractCountriesFromLyrics(lyrics: string, globalStyle: string): CountryScene[] {
  const results: CountryScene[] = []
  const seen = new Set<string>()

  // Detect current region section from headers like [Verse 1 – Asia]
  let currentRegion = ""
  const lines = lyrics.split("\n")

  for (const line of lines) {
    const headerMatch = line.match(/^\[([^\]]+)\]/)
    if (headerMatch) {
      currentRegion = headerMatch[1]
      continue
    }

    // Pattern: "In X, we say "Y"" or "In X, "Y" sounds ..."  or "In X, "Y""
    const patterns = [
      /^In ([^,]+),\s+we say\s+"([^"]+)"/i,
      /^In ([^,]+),\s+"([^"]+)"\s+/i,
      /^In ([^,]+),\s+"([^"]+)"/i,
      /^In ([^,]+),\s+["""]([^"""]+)["""]/i,
    ]

    for (const pat of patterns) {
      const m = line.match(pat)
      if (m) {
        const country = m[1].trim().replace(/^the\s+/i, "")
        const greeting = m[2].trim().replace(/[,.]$/, "")
        if (!seen.has(country.toLowerCase())) {
          seen.add(country.toLowerCase())
          results.push({
            country,
            greeting,
            region: currentRegion,
            prompt: buildCountryPrompt(country, greeting, globalStyle),
          })
        }
        break
      }
    }
  }

  return results
}

function buildCountryPrompt(country: string, greeting: string, globalStyle: string): string {
  const style = globalStyle || "Bright colorful illustration, educational video style, vibrant, friendly, 16:9"
  return `A cheerful child or person from ${country} saying "${greeting}", culturally accurate background elements representing ${country}, ${style}, no text overlay, clean composition`
}

interface Props {
  data: Partial<ProjectData>
  onNext: (data: Partial<ProjectData>) => void
  onBack: () => void
}

function SceneCard({
  scene,
  index,
  onChange,
  onRemove,
}: {
  scene: SceneData
  index: number
  onChange: (updated: SceneData) => void
  onRemove?: () => void
}) {
  const [expanded, setExpanded] = useState(index < 2)
  const [editing, setEditing] = useState(false)

  return (
    <Card className={`transition-all ${scene.imageUrl ? "border-blue-500/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg gradient-brand-soft flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold text-primary">{scene.order}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground italic line-clamp-1">
                "{scene.lyricExcerpt}"
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className="text-[10px]">{scene.aspectRatio}</Badge>
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={onRemove}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {expanded && (
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Image Prompt</Label>
                  <Textarea
                    value={scene.prompt || ""}
                    onChange={(e) => onChange({ ...scene, prompt: e.target.value })}
                    className="min-h-[80px] text-xs resize-none"
                    placeholder="Describe the image for this scene..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Negative Prompt</Label>
                    <Input
                      value={scene.negativePrompt || ""}
                      onChange={(e) => onChange({ ...scene, negativePrompt: e.target.value })}
                      className="h-7 text-xs"
                      placeholder="Things to avoid..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Text Overlay</Label>
                    <Input
                      value={scene.textOverlay || ""}
                      onChange={(e) => onChange({ ...scene, textOverlay: e.target.value })}
                      className="h-7 text-xs"
                      placeholder="Lyric text to show..."
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Aspect Ratio</Label>
                  <div className="flex gap-2">
                    {["16:9", "9:16", "1:1", "4:3"].map((ar) => (
                      <button
                        key={ar}
                        type="button"
                        onClick={() => onChange({ ...scene, aspectRatio: ar })}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          scene.aspectRatio === ar
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {scene.imageUrl && (
              <div className="mt-3 relative">
                <img
                  src={scene.imageUrl}
                  alt={`Scene ${scene.order}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <Badge className="absolute top-2 right-2 text-[10px] bg-teal-500/20 text-teal-400 border-teal-500/30">
                  Generated
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function Step4Storyboard({ data, onNext, onBack }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [scenes, setScenes] = useState<SceneData[]>(data.scenes || [])
  const [globalStyle, setGlobalStyle] = useState(
    data.globalVisualStyle || "Bright colorful illustration, educational video style, vibrant, friendly, 16:9"
  )
  const suggestedCount = data.lyrics ? parseLyricSections(data.lyrics) : 4
  const [sceneCount, setSceneCount] = useState(
    data.scenes?.length || suggestedCount
  )

  // Country extraction
  const extractedCountries = data.lyrics ? extractCountriesFromLyrics(data.lyrics, globalStyle) : []
  const hasCountries = extractedCountries.length > 0

  async function generateScenes() {
    if (!data.lyrics) {
      toast.error("Please add lyrics first")
      return
    }
    setIsGenerating(true)
    try {
      const res = await fetch("/api/ai/generate-scene-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          lyrics: data.lyrics,
          visualDirection: data.songBrief?.visualDirection || globalStyle,
          aspectRatio: "16:9",
          audience: data.audience,
          sceneCount,
        }),
      })
      if (!res.ok) throw new Error()
      const result = await res.json()
      setScenes(result.scenes || [])
      setGlobalStyle(result.globalVisualStyle || globalStyle)
      toast.success(`Generated ${result.scenes?.length} scenes!`)
    } catch {
      toast.error("Failed to generate scene prompts")
    } finally {
      setIsGenerating(false)
    }
  }

  function updateScene(index: number, updated: SceneData) {
    setScenes((prev) => prev.map((s, i) => (i === index ? updated : s)))
  }

  function removeScene(index: number) {
    setScenes((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })))
  }

  function addScene() {
    const order = scenes.length + 1
    setScenes((prev) => [
      ...prev,
      {
        order,
        lyricExcerpt: "",
        description: `Scene ${order}`,
        prompt: globalStyle,
        negativePrompt: "",
        aspectRatio: "16:9",
        imageStatus: "pending",
      },
    ])
  }

  function applyGlobalStyle() {
    if (!globalStyle) return
    setScenes((prev) =>
      prev.map((s) => ({
        ...s,
        style: globalStyle,
        prompt: s.prompt ? `${s.prompt}, ${globalStyle}` : globalStyle,
      }))
    )
    toast.success("Global style applied to all scenes")
  }

  return (
    <div className="space-y-6">
      {/* Config card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-teal-400" />
            Visual Storyboard
          </CardTitle>
          <CardDescription>
            Plan scene-by-scene image prompts based on your lyrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global style */}
          <div className="space-y-2">
            <Label>Global Visual Style</Label>
            <div className="flex gap-2">
              <Input
                value={globalStyle}
                onChange={(e) => setGlobalStyle(e.target.value)}
                placeholder="e.g. bright colorful illustration, warm tones, 16:9..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={applyGlobalStyle}
                disabled={!globalStyle || scenes.length === 0}
                className="gap-1.5 shrink-0"
              >
                <Globe className="h-3.5 w-3.5" />
                Apply All
              </Button>
            </div>
          </div>

          {/* Scene count picker */}
          <div className="flex items-center gap-3">
            <Label className="text-sm whitespace-nowrap">Number of scenes</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSceneCount((n) => Math.max(1, n - 1))}
              >
                <span className="text-base leading-none font-medium">−</span>
              </Button>
              <Input
                type="number"
                min={1}
                max={20}
                value={sceneCount}
            onChange={(e) => setSceneCount(Math.min(100, Math.max(1, Number(e.target.value))))}
                  className="h-7 w-16 text-center text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSceneCount((n) => Math.min(100, n + 1))}
              >
                <span className="text-base leading-none font-medium">+</span>
              </Button>
              {data.lyrics && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-teal-400"
                  onClick={() => setSceneCount(suggestedCount)}
                >
                  Suggested ({suggestedCount})
                </Button>
              )}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              Est. ~${(sceneCount * 0.012).toFixed(2)}
            </span>
          </div>

          {/* Smart country extractor */}
          {hasCountries && (
            <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-sm font-medium">
                  {extractedCountries.length} countries detected in lyrics
                </span>
                <Badge className="ml-auto bg-teal-500/15 text-teal-400 border-teal-500/30 text-xs">
                  1 image per country
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Each country gets its own scene with the greeting phrase embedded in the prompt.
              </p>
              <Button
                type="button"
                size="sm"
                className="w-full gap-2 border-teal-500/30 text-teal-300 hover:bg-teal-500/10"
                variant="outline"
                onClick={() => {
                  const newScenes: SceneData[] = extractedCountries.map((c, i) => ({
                    order: i + 1,
                    lyricExcerpt: `${c.country}: "${c.greeting}"`,
                    description: c.region || c.country,
                    prompt: buildCountryPrompt(c.country, c.greeting, globalStyle),
                    negativePrompt: "text, watermark, distorted face, extra fingers, blurry",
                    aspectRatio: "16:9",
                    imageStatus: "pending",
                  }))
                  setScenes(newScenes)
                  setSceneCount(newScenes.length)
                  toast.success(`Created ${newScenes.length} country scenes!`)
                }}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Build {extractedCountries.length} Country Scenes
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant={scenes.length > 0 ? "outline" : "gradient"}
              onClick={generateScenes}
              disabled={isGenerating}
              className="flex-1 gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Generating {sceneCount} Scenes...</>
              ) : scenes.length > 0 ? (
                <><RefreshCw className="h-4 w-4" />Regenerate ({sceneCount} scenes)</>
              ) : (
                <><Sparkles className="h-4 w-4" />Generate {sceneCount} AI Scene Prompts</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {scenes.length === 0 && !isGenerating && (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No scenes yet</p>
          <p className="text-sm">
            Click Generate to create a scene-by-scene visual plan
            {data.lyrics ? ` (${suggestedCount} sections detected)` : ""}
          </p>
        </div>
      )}

      {/* Scene list */}
      {scenes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{scenes.length} Scenes</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Edit prompts before generating</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addScene}>
                <Plus className="w-3 h-3" /> Add Scene
              </Button>
            </div>
          </div>
          {scenes.map((scene, i) => (
            <SceneCard
              key={`scene-${scene.order}-${i}`}
              scene={scene}
              index={i}
              onChange={(updated) => updateScene(i, updated)}
              onRemove={scenes.length > 1 ? () => removeScene(i) : undefined}
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
          <Badge variant="outline" className="text-xs gap-1">
            <ImageIcon className="h-3 w-3 text-teal-400" />
            {scenes.length} scenes · ~${(scenes.length * 0.012).toFixed(2)}
          </Badge>
          <Button
            variant="gradient"
            onClick={() => onNext({ scenes, globalVisualStyle: globalStyle })}
            disabled={scenes.length === 0}
            className="gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Continue to Images
          </Button>
        </div>
      </div>
    </div>
  )
}
