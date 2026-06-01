"use client"

import { useState, useRef, useCallback, useId } from "react"
import {
  FileText, Music, Image as ImageIcon, Upload, X, Play, Pause,
  Sparkles, ChevronDown, ChevronUp, Plus, Trash2, Info, ArrowRight,
  Wand2, LayoutTemplate, List, Check, RefreshCw, Copy,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ProjectData, SceneData } from "./create-flow"

interface Props {
  data: Partial<ProjectData>
  onNext: (data: Partial<ProjectData>) => void
  onBack: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type PlannedScene = { label: string; excerpt: string; prompt: string }

function buildDefaultPrompt(label: string, excerpt: string, style: string): string {
  const base = excerpt ? `Scene for "${excerpt}"` : `Scene: ${label}`
  return `${base}, ${style || "cinematic illustration, vibrant, 16:9"}`
}

/** Split lyrics into labeled sections based on [headers] */
function parseLyricSections(lyrics: string): { label: string; excerpt: string }[] {
  const lines   = lyrics.split("\n")
  const sections: { label: string; excerpt: string }[] = []
  let currentLabel = "Intro"
  let excerptLines: string[] = []

  const flush = () => {
    const excerpt = excerptLines.filter(Boolean).slice(0, 2).join(" / ")
    if (excerpt || sections.length === 0)
      sections.push({ label: currentLabel, excerpt })
    excerptLines = []
  }

  for (const line of lines) {
    const header = line.match(/^\[([^\]]+)\]/)
    if (header) {
      flush()
      currentLabel = header[1]
    } else {
      excerptLines.push(line.trim())
    }
  }
  flush()
  return sections.length > 0 ? sections : [{ label: "Scene 1", excerpt: "" }]
}

/** Extract {varName} placeholders from a template string */
function extractVars(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g) || []
  return [...new Set(matches.map((m) => m.slice(1, -1).trim()))]
}

/** Substitute {varName} in a template with values from a row */
function applyTemplate(template: string, row: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key) => row[key.trim()] ?? `{${key}}`)
}

/** Auto-extract country + greeting rows from lyrics */
function extractCountryRows(lyrics: string): Record<string, string>[] {
  const rows: Record<string, string>[] = []
  const seen = new Set<string>()
  const patterns = [
    /^In ([^,]+),\s+we say\s+"([^"]+)"/i,
    /^In ([^,]+),\s+"([^"]+)"\s+/i,
    /^In ([^,]+),\s+"([^"]+)"/i,
    /^In ([^,]+),\s+["""]([^"""]+)["""]/i,
  ]
  for (const line of lyrics.split("\n")) {
    for (const pat of patterns) {
      const m = line.match(pat)
      if (m) {
        const country = m[1].trim().replace(/^the\s+/i, "")
        const greeting = m[2].trim().replace(/[,.]$/, "")
        if (!seen.has(country.toLowerCase())) {
          seen.add(country.toLowerCase())
          rows.push({ country, greeting })
        }
        break
      }
    }
  }
  return rows
}

type PlanMode = "individual" | "template"
type DescRow = { id: string; description: string; fullPrompt: string }
type TemplateRow = { id: string; vars: Record<string, string>; fullPrompt: string }

// ── Sub-components ────────────────────────────────────────────────────────────

function DropZone({
  accept,
  icon: Icon,
  label,
  hint,
  onFile,
  hasFile,
  fileName,
  onClear,
  color = "teal",
}: {
  accept: string
  icon: React.ElementType
  label: string
  hint: string
  onFile: (file: File) => void
  hasFile?: boolean
  fileName?: string
  onClear?: () => void
  color?: "teal" | "violet" | "sky"
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const colorMap = {
    teal: "border-teal-500/30 bg-teal-500/5 hover:border-teal-500/50 hover:bg-teal-500/8",
    violet: "border-violet-500/30 bg-violet-500/5 hover:border-violet-500/50 hover:bg-violet-500/8",
    sky: "border-sky-500/30 bg-sky-500/5 hover:border-sky-500/50 hover:bg-sky-500/8",
  }
  const iconColor = { teal: "text-teal-400", violet: "text-violet-400", sky: "text-sky-400" }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile]
  )

  if (hasFile && fileName) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-secondary/30">
        <Icon className={`w-5 h-5 shrink-0 ${iconColor[color]}`} />
        <span className="text-sm flex-1 truncate">{fileName}</span>
        {onClear && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClear}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && ref.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 py-5 rounded-lg border-2 border-dashed cursor-pointer transition-all ${colorMap[color]} ${dragging ? "scale-[1.01]" : ""}`}
      >
        <Upload className={`w-5 h-5 ${iconColor[color]}`} />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => {
        const f = e.target.files?.[0]
        if (f) onFile(f)
        e.target.value = ""
      }} />
    </>
  )
}

// ── ImagePlanBuilder ──────────────────────────────────────────────────────────

function ImagePlanBuilder({
  lyrics,
  globalStyle,
  onChange,
}: {
  lyrics: string
  globalStyle: string
  onChange: (scenes: PlannedScene[]) => void
}) {
  const uid = useId()
  const mkId = () => `${uid}-${Math.random().toString(36).slice(2, 7)}`

  const [mode, setMode] = useState<PlanMode>("individual")
  const [isExpanding, setIsExpanding] = useState(false)

  // ── Individual mode ──
  const [descRows, setDescRows] = useState<DescRow[]>(() => [
    { id: mkId(), description: "", fullPrompt: "" },
  ])

  const addDescRow = () =>
    setDescRows((r) => [...r, { id: mkId(), description: "", fullPrompt: "" }])
  const removeDescRow = (id: string) =>
    setDescRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r))
  const updateDescRow = (id: string, patch: Partial<DescRow>) =>
    setDescRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  // ── Template mode ──
  const [template, setTemplate] = useState(
    "A cheerful child from {country} saying '{greeting}', {style}"
  )
  const [templateRows, setTemplateRows] = useState<TemplateRow[]>(() => [
    { id: mkId(), vars: {}, fullPrompt: "" },
  ])

  const templateVars = extractVars(template)

  const addTemplateRow = () =>
    setTemplateRows((r) => [...r, { id: mkId(), vars: {}, fullPrompt: "" }])
  const removeTemplateRow = (id: string) =>
    setTemplateRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r))
  const updateTemplateVar = (id: string, varName: string, value: string) =>
    setTemplateRows((r) =>
      r.map((x) => (x.id === id ? { ...x, vars: { ...x.vars, [varName]: value } } : x))
    )

  const autoFillFromLyrics = () => {
    const rows = extractCountryRows(lyrics)
    if (rows.length === 0) {
      toast.error("No country/greeting pattern found in lyrics")
      return
    }
    setTemplateRows(rows.map((r) => ({ id: mkId(), vars: r, fullPrompt: "" })))
    toast.success(`Auto-filled ${rows.length} rows from lyrics`)
  }

  const buildFromTemplate = () => {
    const built = templateRows.map((row) => {
      const styleVal = globalStyle || "colorful illustration, vibrant, 16:9"
      const vars = { ...row.vars, style: styleVal }
      return { ...row, fullPrompt: applyTemplate(template, vars) }
    })
    setTemplateRows(built)
    const scenes = built.map((r) => ({
      label:   Object.values(r.vars).join(" · "),
      excerpt: Object.values(r.vars).join(" · "),
      prompt:  r.fullPrompt,
    }))
    onChange(scenes)
    toast.success(`Built ${built.length} prompts from template`)
  }

  // ── Shared: Expand with AI ──
  const expandWithAI = async () => {
    const descriptions =
      mode === "individual"
        ? descRows.map((r) => r.description).filter(Boolean)
        : templateRows.map((row) => applyTemplate(template, { ...row.vars, style: "" }).trim())

    if (descriptions.length === 0) {
      toast.error("Add at least one description first")
      return
    }

    setIsExpanding(true)
    try {
      const res = await fetch("/api/ai/expand-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptions, style: globalStyle }),
      })
      if (!res.ok) throw new Error()
      const { prompts } = await res.json()

      if (mode === "individual") {
        const filled = descRows.filter((r) => r.description).map((r, i) => ({
          ...r,
          fullPrompt: prompts[i] ?? r.description,
        }))
        setDescRows(filled)
        onChange(filled.map((r) => ({ label: r.description, excerpt: r.description, prompt: r.fullPrompt })))
      } else {
        const filled = templateRows.map((r, i) => ({ ...r, fullPrompt: prompts[i] ?? r.fullPrompt }))
        setTemplateRows(filled)
        onChange(
          filled.map((r) => ({
            label:   Object.values(r.vars).join(" · "),
            excerpt: Object.values(r.vars).join(" · "),
            prompt:  r.fullPrompt,
          }))
        )
      }
      toast.success(`Expanded ${descriptions.length} prompts with AI`)
    } catch {
      toast.error("AI expansion failed. Check OpenAI key or enable MOCK_MODE.")
    } finally {
      setIsExpanding(false)
    }
  }

  const totalRows = mode === "individual" ? descRows.length : templateRows.length
  const expandedCount =
    mode === "individual"
      ? descRows.filter((r) => r.fullPrompt).length
      : templateRows.filter((r) => r.fullPrompt).length

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("individual")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
            mode === "individual"
              ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
              : "border-border/60 text-muted-foreground hover:border-border"
          }`}
        >
          <List className="w-3.5 h-3.5" />
          Individual
        </button>
        <button
          type="button"
          onClick={() => setMode("template")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
            mode === "template"
              ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
              : "border-border/60 text-muted-foreground hover:border-border"
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Template
        </button>
        {expandedCount > 0 && (
          <Badge className="ml-auto bg-teal-500/15 text-teal-400 border-teal-500/30 text-xs self-center">
            <Check className="w-3 h-3 mr-1" />
            {expandedCount}/{totalRows} prompts ready
          </Badge>
        )}
      </div>

      {/* ── Individual mode ── */}
      {mode === "individual" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Write a short description for each image. AI will expand it into a full prompt.
          </p>
          {descRows.map((row, i) => (
            <div key={row.id} className="rounded-lg border border-border/60 overflow-hidden">
              <div className="flex items-start gap-2 p-2.5">
                <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={row.description}
                    onChange={(e) => updateDescRow(row.id, { description: e.target.value })}
                    placeholder="Short description, e.g. &quot;sunset over mountains, guitar music notes&quot;"
                    className="h-8 text-sm"
                  />
                  {row.fullPrompt && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-secondary/30 rounded p-2">
                      <Sparkles className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{row.fullPrompt}</span>
                      <button
                        type="button"
                        className="shrink-0 text-teal-400 hover:text-teal-300"
                        title="Edit prompt"
                        onClick={() => {
                          const val = prompt("Edit prompt:", row.fullPrompt)
                          if (val !== null) updateDescRow(row.id, { fullPrompt: val })
                        }}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                {descRows.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeDescRow(row.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed text-xs"
            onClick={addDescRow}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add image
          </Button>
        </div>
      )}

      {/* ── Template mode ── */}
      {mode === "template" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Template — use <code className="bg-secondary px-1 rounded text-[10px]">{"{variable}"}</code> placeholders
            </Label>
            <Input
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="h-8 text-sm font-mono"
              placeholder="A child from {country} saying '{greeting}', {style}"
            />
            {templateVars.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Variables detected:{" "}
                {templateVars.map((v) => (
                  <code key={v} className="bg-secondary px-1 rounded mr-1">{`{${v}}`}</code>
                ))}
              </p>
            )}
          </div>

          {/* Auto-fill from lyrics */}
          {lyrics && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
              onClick={autoFillFromLyrics}
            >
              <Wand2 className="w-3 h-3 mr-1.5" />
              Auto-fill rows from lyrics
            </Button>
          )}

          {/* Variable table */}
          {templateVars.length > 0 && (
            <div className="rounded-lg border border-border/60 overflow-hidden">
              {/* Header */}
              <div
                className="grid text-[10px] font-semibold text-muted-foreground uppercase px-3 py-2 bg-secondary/40 border-b border-border/40"
                style={{ gridTemplateColumns: `1.5rem ${templateVars.map(() => "1fr").join(" ")} 1.5rem` }}
              >
                <span>#</span>
                {templateVars.map((v) => <span key={v}>{v}</span>)}
                <span />
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/40 max-h-64 overflow-y-auto">
                {templateRows.map((row, i) => (
                  <div
                    key={row.id}
                    className="grid items-center gap-1.5 px-3 py-1.5"
                    style={{ gridTemplateColumns: `1.5rem ${templateVars.map(() => "1fr").join(" ")} 1.5rem` }}
                  >
                    <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                    {templateVars.map((v) => (
                      <Input
                        key={v}
                        value={row.vars[v] ?? ""}
                        onChange={(e) => updateTemplateVar(row.id, v, e.target.value)}
                        className="h-6 text-xs px-2"
                        placeholder={v}
                      />
                    ))}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTemplateRow(row.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Preview of built prompt for last row */}
              {templateRows.some((r) => r.fullPrompt) && (
                <div className="px-3 py-2 border-t border-border/40 bg-secondary/20">
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    <span className="text-teal-400 font-medium">Preview: </span>
                    {templateRows.find((r) => r.fullPrompt)?.fullPrompt}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-dashed text-xs h-7"
              onClick={addTemplateRow}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add row
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
              onClick={buildFromTemplate}
              disabled={templateVars.length === 0}
            >
              <Copy className="w-3 h-3 mr-1" />
              Build {templateRows.length} prompts from template
            </Button>
          </div>
        </div>
      )}

      {/* Expand with AI */}
      <Button
        variant={expandedCount > 0 ? "outline" : "gradient"}
        size="sm"
        className="w-full gap-2"
        onClick={expandWithAI}
        disabled={isExpanding}
      >
        {isExpanding ? (
          <><Sparkles className="w-3.5 h-3.5 animate-spin" />Expanding {totalRows} prompts with AI...</>
        ) : expandedCount > 0 ? (
          <><RefreshCw className="w-3.5 h-3.5" />Re-expand with AI</>
        ) : (
          <><Wand2 className="w-3.5 h-3.5" />Expand descriptions with AI</>
        )}
      </Button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function StepImport({ data, onNext, onBack }: Props) {
  const [projectName, setProjectName] = useState(data.title || "")
  const [lyrics, setLyrics] = useState(data.lyrics || "")
  const [audioUrl, setAudioUrl] = useState(data.importedAudioUrl || "")
  const [audioName, setAudioName] = useState(data.importedAudioName || "")
  const [images, setImages] = useState<{ url: string; name: string; file?: File }[]>(
    data.importedImages || []
  )
  const [globalStyle, setGlobalStyle] = useState(
    data.stylePrompt || "Cinematic illustration, vibrant colors, clean composition, 16:9"
  )
  const [plannedScenes, setPlannedScenes] = useState<PlannedScene[]>([])
  const [sceneCount, setSceneCount] = useState(4)
  const [plannerOpen, setPlannerOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const lyricsFileRef = useRef<HTMLInputElement>(null)

  // ── Lyrics file upload ──
  const handleLyricsFile = (file: File) => {
    if (!file.name.match(/\.(txt|md)$/i)) {
      toast.error("Please upload a .txt or .md file")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setLyrics(e.target?.result as string)
      toast.success(`Loaded: ${file.name}`)
    }
    reader.readAsText(file)
  }

  // ── Audio upload ──
  const handleAudioFile = (file: File) => {
    if (!file.name.match(/\.(mp3|mp4|wav|m4a|ogg|flac|aac)$/i)) {
      toast.error("Please upload MP3, MP4, WAV, M4A, OGG, or FLAC")
      return
    }
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    setAudioName(file.name)
    toast.success(`Audio ready: ${file.name}`)
  }

  // ── Image upload ──
  const handleImageFiles = (files: FileList | File[]) => {
    const newImgs: { url: string; name: string; file: File }[] = []
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return
      newImgs.push({ url: URL.createObjectURL(file), name: file.name, file })
    })
    if (newImgs.length === 0) { toast.error("No valid image files selected"); return }
    setImages((prev) => [...prev, ...newImgs])
    toast.success(`Added ${newImgs.length} image${newImgs.length > 1 ? "s" : ""}`)
  }

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i))
  }

  // ── Auto-generate scene plan from lyrics ──
  const generatePlan = () => {
    if (!lyrics.trim()) { toast.error("Enter lyrics first"); return }
    const detected = parseLyricSections(lyrics)
    const n = Math.min(Math.max(sceneCount, 1), 100)
    // Expand/contract to requested count
    const base = detected.length > 0 ? detected : [{ label: "Scene 1", excerpt: "" }]
    const built: PlannedScene[] = Array.from({ length: n }, (_, i) => {
      const src = base[i % base.length]
      return {
        label: i < base.length ? src.label : `Scene ${i + 1}`,
        excerpt: src.excerpt,
        prompt: buildDefaultPrompt(
          i < base.length ? src.label : `Scene ${i + 1}`,
          src.excerpt,
          globalStyle
        ),
      }
    })
    setPlannedScenes(built)
    setPlannerOpen(true)
    toast.success(`Generated ${n} scene plan`)
  }

  // ── Continue handler ──
  const handleContinue = () => {
    if (!lyrics.trim()) {
      toast.error("Please provide lyrics to continue")
      return
    }
    if (!projectName.trim()) {
      toast.error("Please give your project a name")
      return
    }

    // Convert planned scenes to SceneData
    const scenes: SceneData[] = images.length > 0
      ? images.map((img, i) => ({
          order: i + 1,
          lyricExcerpt: "",
          prompt: "",
          negativePrompt: "",
          aspectRatio: "16:9",
          imageUrl: img.url,
          imageStatus: "completed" as const,
        }))
      : plannedScenes.map((s, i) => ({
          order: i + 1,
          lyricExcerpt: s.excerpt || s.label,
          description: s.label,
          prompt: s.prompt,
          negativePrompt: "text, watermark, distorted face, extra fingers, blurry",
          aspectRatio: "16:9",
          imageStatus: "pending" as const,
        }))

    onNext({
      title: projectName,
      lyrics,
      stylePrompt: globalStyle,
      importedAudioUrl: audioUrl || undefined,
      importedAudioName: audioName || undefined,
      importedImages: images.length > 0 ? images : undefined,
      scenes: scenes.length > 0 ? scenes : undefined,
    })
  }

  const hasAudio = Boolean(audioUrl)
  const hasImages = images.length > 0
  const hasLyrics = lyrics.trim().length > 10

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Import Assets</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload what you have — the flow will adapt based on what&apos;s provided.
        </p>
      </div>

      {/* Route preview */}
      <Alert className="border-violet-500/20 bg-violet-500/5">
        <Info className="w-4 h-4 text-violet-400" />
        <AlertDescription className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Your flow: </span>
          {[
            "Lyrics & Style",
            !hasAudio && "Generate Music",
            !hasImages && "Storyboard & Images",
            "Asset Pack",
          ]
            .filter(Boolean)
            .join(" → ")}
        </AlertDescription>
      </Alert>

      {/* Project Name */}
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-2">
          <Label htmlFor="project-name" className="text-sm font-medium">
            Project Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Animal Word Party, Summer Vibes..."
            className="h-9"
          />
        </CardContent>
      </Card>

      {/* Lyrics */}
      <Card className={`border-border/60 ${hasLyrics ? "border-teal-500/30" : ""}`}>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              Lyrics
              <span className="text-destructive text-sm font-normal">*</span>
            </CardTitle>
            {hasLyrics && <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 text-xs">✓ Ready</Badge>}
          </div>
          <CardDescription className="text-xs">
            Paste your lyrics or upload a .txt file
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <Textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={8}
            placeholder={"[Intro]\n...\n\n[Verse 1]\n...\n\n[Chorus]\n...\n\n[Outro]\n..."}
            className="text-sm resize-none font-mono"
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => lyricsFileRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload .txt
            </Button>
            {lyrics && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setLyrics("")}>
                <X className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            )}
            {hasLyrics && (
              <span className="text-xs text-muted-foreground ml-auto">
                {lyrics.split("\n").filter(Boolean).length} lines
              </span>
            )}
          </div>
          <input
            ref={lyricsFileRef}
            type="file"
            accept=".txt,.md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleLyricsFile(f)
              e.target.value = ""
            }}
          />
        </CardContent>
      </Card>

      {/* Audio */}
      <Card className={`border-border/60 ${hasAudio ? "border-sky-500/30" : ""}`}>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Music className="w-4 h-4 text-sky-400" />
              Music
            </CardTitle>
            <Badge variant="outline" className="text-xs text-muted-foreground">Optional</Badge>
          </div>
          <CardDescription className="text-xs">
            Upload your audio — or skip to generate with Suno
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <DropZone
            accept=".mp3,.mp4,.wav,.m4a,.ogg,.flac,.aac"
            icon={Music}
            label="Drop audio file here"
            hint="MP3 · MP4 · WAV · M4A · OGG · FLAC"
            onFile={handleAudioFile}
            hasFile={hasAudio}
            fileName={audioName}
            onClear={() => { setAudioUrl(""); setAudioName("") }}
            color="sky"
          />
          {hasAudio && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sky-400"
                onClick={() => {
                  if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false) }
                  else { audioRef.current?.play(); setIsPlaying(true) }
                }}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <span className="text-xs text-muted-foreground flex-1 truncate">{audioName}</span>
              <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30 text-xs">✓ Loaded</Badge>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}
          {!hasAudio && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-teal-400" />
              Skip this — Suno will generate music from your lyrics and style.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Images */}
      <Card className={`border-border/60 ${hasImages ? "border-violet-500/30" : ""}`}>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-violet-400" />
              Images
              {hasImages && (
                <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-xs">
                  {images.length} uploaded
                </Badge>
              )}
            </CardTitle>
            <Badge variant="outline" className="text-xs text-muted-foreground">Optional</Badge>
          </div>
          <CardDescription className="text-xs">
            Upload scene images — or skip to AI-generate them from your lyrics
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Image grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative group aspect-video rounded-lg overflow-hidden border border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white hover:text-destructive"
                      onClick={() => removeImage(i)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">
                    {i + 1}
                  </span>
                </div>
              ))}
              {/* Add more */}
              <button
                className="aspect-video rounded-lg border-2 border-dashed border-border/60 hover:border-violet-500/40 flex items-center justify-center text-muted-foreground hover:text-violet-400 transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleImageFiles(e.dataTransfer.files)
            }}
          >
            {images.length === 0 && (
              <div
                role="button"
                tabIndex={0}
                className="flex flex-col items-center justify-center gap-2 py-5 rounded-lg border-2 border-dashed border-violet-500/30 bg-violet-500/5 hover:border-violet-500/50 cursor-pointer transition-all"
                onClick={() => imageInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && imageInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 text-violet-400" />
                <span className="text-sm font-medium">Drop images here</span>
                <span className="text-xs text-muted-foreground">PNG · JPG · WEBP · GIF — multiple files OK</span>
              </div>
            )}
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleImageFiles(e.target.files)
              e.target.value = ""
            }}
          />

          {!hasImages && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-teal-400" />
              Skip this — you&apos;ll plan and generate images from your lyrics next.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Image Plan — shown when lyrics are present but no images */}
      {hasLyrics && !hasImages && (
        <Card className="border-teal-500/20">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                Image Generation Plan
              </CardTitle>
              {plannedScenes.length > 0 && (
                <Badge className="bg-teal-500/15 text-teal-400 border-teal-500/30 text-xs">
                  {plannedScenes.length} images planned
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Describe each image briefly — use a template for repeated structures.
              AI expands your descriptions into full image prompts.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Global visual style */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Global visual style</Label>
              <Input
                value={globalStyle}
                onChange={(e) => setGlobalStyle(e.target.value)}
                placeholder="e.g. Colorful illustration, vibrant, educational, 16:9"
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Applied to all images. Use <code className="bg-secondary px-1 rounded">{"{style}"}</code> in your template to embed it per row.
              </p>
            </div>

            <ImagePlanBuilder
              lyrics={lyrics}
              globalStyle={globalStyle}
              onChange={setPlannedScenes}
            />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-between pb-4">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <div className="flex items-center gap-3">
          {hasLyrics && !hasImages && plannedScenes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Tip: Plan your images above before continuing.
            </p>
          )}
          <Button
            className="gradient-brand text-white font-semibold"
            onClick={handleContinue}
            disabled={!hasLyrics || !projectName.trim()}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
