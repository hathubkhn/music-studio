"use client"

import { useState } from "react"
import {
  Languages, Wand2, Loader2, Check, ChevronDown, ChevronUp,
  RefreshCw, Play, Pause, ArrowRightLeft, Info, AlertCircle,
  CheckCircle2, Music2, Scissors,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ── Types ─────────────────────────────────────────────────────────────────────

interface LyricsSection {
  label: string
  originalText: string
  translatedText: string
  estimatedStartS: number
  estimatedEndS: number
}

interface Props {
  taskId: string | null
  audioId: string | null
  audioUrl: string
  durationS?: number
  lyrics: string
  stylePrompt?: string
  title: string
}

// ── Language options ──────────────────────────────────────────────────────────

const LANGUAGES = [
  "English", "Vietnamese", "Korean", "Japanese",
  "Chinese (Simplified)", "Spanish", "French", "Portuguese",
  "German", "Italian", "Thai", "Indonesian", "Hindi", "Arabic",
]

const ADAPTATION_STYLES = [
  { value: "translate", label: "Direct Translation",  desc: "Same meaning, same structure — literal" },
  { value: "adapt",     label: "Loose Adaptation",    desc: "Keep vibe; adapt phrases to feel natural" },
  { value: "rewrite",   label: "New Lyrics (same vibe)", desc: "Fresh words, same song structure & emotion" },
] as const

// ── Section row ───────────────────────────────────────────────────────────────

function SectionRow({
  section, index, taskId, audioId, tags, title, onReplaced,
}: {
  section: LyricsSection
  index: number
  taskId: string | null
  audioId: string | null
  tags: string
  title: string
  onReplaced: (newTaskId: string) => void
}) {
  const [open, setOpen]               = useState(index === 0)
  const [translated, setTranslated]   = useState(section.translatedText)
  const [startS, setStartS]           = useState(section.estimatedStartS)
  const [endS, setEndS]               = useState(section.estimatedEndS)
  const [status, setStatus]           = useState<"idle" | "replacing" | "polling" | "done" | "failed">("idle")
  const [newTaskId, setNewTaskId]     = useState<string | null>(null)

  const canReplace = taskId && audioId && translated.trim() && endS > startS
    && (endS - startS) >= 6 && (endS - startS) <= 60

  async function handleReplace() {
    if (!canReplace) return
    setStatus("replacing")

    // Build prompt = lyrics only (strip the section tag line)
    const prompt = translated.split("\n").filter((l) => !l.trim().match(/^\[.+\]$/)).join("\n").trim()

    try {
      const res = await fetch("/api/kie/suno/replace-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId, audioId,
          prompt, tags, title,
          infillStartS: startS,
          infillEndS:   endS,
          fullLyrics:   translated,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Request failed")
      }
      const data = await res.json()
      setNewTaskId(data.taskId)
      setStatus("polling")
      toast.info(`Replacing section "${section.label}"… this takes ~1-2 min`)

      // Poll until done
      const poll = setInterval(async () => {
        const sr = await fetch(`/api/kie/suno/status?jobId=${data.taskId}`)
        const result = await sr.json()
        if (result.status === "completed" && result.result?.[0]?.url) {
          clearInterval(poll)
          setStatus("done")
          onReplaced(data.taskId)
          toast.success(`Section "${section.label}" replaced!`)
        } else if (result.status === "failed") {
          clearInterval(poll)
          setStatus("failed")
          toast.error(`Section "${section.label}" replacement failed`)
        }
      }, 4000)
    } catch (err) {
      setStatus("failed")
      toast.error(err instanceof Error ? err.message : "Replace failed")
    }
  }

  const duration = endS - startS
  const durationOk = duration >= 6 && duration <= 60

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-violet-400">
          {index + 1}
        </div>
        <span className="text-sm font-medium flex-1">{section.label}</span>
        <span className="text-xs text-muted-foreground">{startS.toFixed(1)}s – {endS.toFixed(1)}s</span>
        {status === "done"     && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        {status === "failed"   && <AlertCircle  className="w-4 h-4 text-destructive shrink-0"  />}
        {(status === "replacing" || status === "polling") && <Loader2 className="w-4 h-4 animate-spin text-violet-400 shrink-0" />}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border/40 space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Original</Label>
              <div className="p-2 rounded bg-muted/40 text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">
                {section.originalText}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Translated (editable)</Label>
              <Textarea
                value={translated}
                onChange={(e) => setTranslated(e.target.value)}
                className="text-xs font-mono resize-none h-28"
                disabled={status === "replacing" || status === "polling"}
              />
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex gap-3 items-end">
            <div className="space-y-1 flex-1">
              <Label className="text-xs text-muted-foreground">Start (seconds)</Label>
              <Input
                type="number" min={0} step={0.5}
                value={startS}
                onChange={(e) => setStartS(parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
                disabled={status === "replacing" || status === "polling"}
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs text-muted-foreground">End (seconds)</Label>
              <Input
                type="number" min={0} step={0.5}
                value={endS}
                onChange={(e) => setEndS(parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
                disabled={status === "replacing" || status === "polling"}
              />
            </div>
            <Badge
              variant="outline"
              className={`mb-0.5 text-xs shrink-0 ${durationOk ? "border-emerald-500/30 text-emerald-400" : "border-destructive/50 text-destructive"}`}
            >
              {duration.toFixed(1)}s {!durationOk && "(needs 6–60s)"}
            </Badge>
          </div>

          {!audioId && (
            <p className="text-xs text-muted-foreground opacity-70">
              Section replacement requires audioId — only available for newly generated tracks.
            </p>
          )}

          <Button
            size="sm"
            className="gap-1.5 bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
            disabled={!canReplace || status === "replacing" || status === "polling"}
            onClick={handleReplace}
          >
            {status === "replacing" || status === "polling"
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Replacing…</>
              : status === "done"
              ? <><CheckCircle2 className="w-3.5 h-3.5" />Replaced!</>
              : <><Scissors className="w-3.5 h-3.5" />Replace This Section</>
            }
          </Button>
          {newTaskId && status === "done" && (
            <p className="text-xs text-muted-foreground">New task: <code className="font-mono">{newTaskId}</code></p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SongTranslator({ taskId, audioId, audioUrl, durationS = 180, lyrics, stylePrompt = "", title }: Props) {
  const [targetLang, setTargetLang]     = useState("English")
  const [adaptStyle, setAdaptStyle]     = useState<"translate" | "adapt" | "rewrite">("adapt")
  const [translating, setTranslating]   = useState(false)
  const [translatedLyrics, setTranslated] = useState("")
  const [sections, setSections]         = useState<LyricsSection[]>([])

  // Full-translate generation state
  const [generating, setGenerating]     = useState(false)
  const [genJobId, setGenJobId]         = useState<string | null>(null)
  const [genStatus, setGenStatus]       = useState<"idle" | "queued" | "processing" | "completed" | "failed">("idle")
  const [genAudioUrl, setGenAudioUrl]   = useState<string | null>(null)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [audioEl, setAudioEl]           = useState<HTMLAudioElement | null>(null)

  // Latest replaced taskId (section editor)
  const [latestTaskId, setLatestTaskId] = useState<string | null>(taskId)

  async function handleTranslate() {
    setTranslating(true)
    setSections([])
    setTranslated("")
    try {
      const res = await fetch("/api/ai/translate-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics,
          targetLanguage:  targetLang,
          adaptationStyle: adaptStyle,
          stylePrompt,
          durationS,
        }),
      })
      if (!res.ok) throw new Error("Translation failed")
      const data = await res.json()
      setTranslated(data.translatedLyrics)
      setSections(data.sections ?? [])
      toast.success("Lyrics translated!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Translation failed")
    } finally {
      setTranslating(false)
    }
  }

  async function handleGenerateCover() {
    if (!translatedLyrics.trim()) {
      toast.error("Translate the lyrics first")
      return
    }
    if (!audioUrl) {
      toast.error("No source audio available")
      return
    }
    setGenerating(true)
    setGenStatus("queued")
    setGenAudioUrl(null)
    try {
      const res = await fetch("/api/kie/suno/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadUrl:   audioUrl,
          title,
          lyrics:      translatedLyrics,
          stylePrompt: stylePrompt || "",
          audioWeight: 0.8,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed")
      const result = await res.json()
      setGenJobId(result.taskId)
      setGenStatus("processing")
      toast.info("Cover generation started — preserving melody, new lyrics. Takes 1-3 min…")

      const poll = setInterval(async () => {
        const sr = await fetch(`/api/kie/suno/status?jobId=${result.taskId}`)
        const r = await sr.json()
        if (r.status === "completed" && r.result?.[0]?.url) {
          clearInterval(poll)
          setGenStatus("completed")
          setGenAudioUrl(r.result[0].url)
          setGenerating(false)
          toast.success("Translated track ready!")
        } else if (r.status === "failed") {
          clearInterval(poll)
          setGenStatus("failed")
          setGenerating(false)
          toast.error("Generation failed")
        }
      }, 4000)
    } catch (err) {
      setGenStatus("failed")
      setGenerating(false)
      toast.error(err instanceof Error ? err.message : "Failed to start generation")
    }
  }

  function togglePlay(url: string) {
    if (!audioEl || audioEl.src !== url) {
      audioEl?.pause()
      const el = new Audio(url)
      el.onended = () => setIsPlaying(false)
      el.play()
      setAudioEl(el)
      setIsPlaying(true)
    } else {
      if (isPlaying) { audioEl.pause(); setIsPlaying(false) }
      else           { audioEl.play();  setIsPlaying(true)  }
    }
  }

  return (
    <div className="space-y-5">
      {/* Language + style config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Languages className="w-4 h-4 text-violet-400" />
            Language Conversion
          </CardTitle>
          <CardDescription className="text-xs">
            Translate or adapt the song&apos;s lyrics to a different language using AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-foreground font-medium truncate">
              {lyrics.split("\n").find((l) => l.trim().match(/^\[.+\]$/))?.replace(/[\[\]]/g, "") ?? "Original"} lyrics
            </div>
            <ArrowRightLeft className="w-4 h-4 shrink-0" />
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="flex-1 h-9 rounded-lg border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Adaptation Style</Label>
            <div className="grid grid-cols-3 gap-2">
              {ADAPTATION_STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setAdaptStyle(s.value)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    adaptStyle === s.value
                      ? "bg-violet-500/10 border-violet-500/40 text-violet-300"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  <p className="text-xs font-medium">{s.label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full gap-2 bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
            onClick={handleTranslate}
            disabled={translating}
          >
            {translating
              ? <><Loader2 className="w-4 h-4 animate-spin" />Translating…</>
              : <><Wand2 className="w-4 h-4" />Translate to {targetLang}</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {translatedLyrics && (
        <Tabs defaultValue="full">
          <TabsList className="w-full">
            <TabsTrigger value="full" className="flex-1 gap-1.5">
              <Music2 className="w-3.5 h-3.5" />Full Track Replace
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex-1 gap-1.5">
              <Scissors className="w-3.5 h-3.5" />Section Editor
            </TabsTrigger>
          </TabsList>

          {/* ── Full translate tab ── */}
          <TabsContent value="full" className="space-y-4 mt-4">
            <Alert>
              <Info className="w-3.5 h-3.5" />
              <AlertDescription className="text-xs">
                Generates a brand-new track using <strong>Upload &amp; Cover</strong> — the original melody is preserved while all lyrics are replaced.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-3">
                  <Label className="text-xs text-muted-foreground mb-2 block">Original</Label>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto leading-relaxed">
                    {lyrics}
                  </pre>
                </CardContent>
              </Card>
              <Card className="border-violet-500/20 bg-violet-500/5">
                <CardContent className="p-3">
                  <Label className="text-xs text-violet-400 mb-2 block">{targetLang} Translation</Label>
                  <Textarea
                    value={translatedLyrics}
                    onChange={(e) => setTranslated(e.target.value)}
                    className="text-xs font-mono resize-none min-h-48 bg-transparent border-0 p-0 focus-visible:ring-0"
                  />
                </CardContent>
              </Card>
            </div>

            <Button
              className="w-full gradient-brand text-white font-semibold gap-2"
              onClick={handleGenerateCover}
              disabled={generating || genStatus === "completed"}
            >
              {genStatus === "processing" || genStatus === "queued"
                ? <><Loader2 className="w-4 h-4 animate-spin" />Generating… (1-3 min)</>
                : genStatus === "completed"
                ? <><Check className="w-4 h-4" />Track Ready!</>
                : <><Music2 className="w-4 h-4" />Generate Translated Track</>
              }
            </Button>

            {genAudioUrl && (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {title} ({targetLang})
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => togglePlay(genAudioUrl)}
                      className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      {isPlaying && audioEl?.src === genAudioUrl
                        ? <><Pause className="w-3 h-3" />Pause</>
                        : <><Play  className="w-3 h-3" />Play</>
                      }
                    </Button>
                  </div>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio controls src={genAudioUrl} className="w-full h-10" />
                  <a href={genAudioUrl} download={`${title}-${targetLang}.mp3`}>
                    <Button variant="outline" size="sm" className="w-full">Download MP3</Button>
                  </a>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Section editor tab ── */}
          <TabsContent value="sections" className="space-y-4 mt-4">
            <Alert>
              <Info className="w-3.5 h-3.5" />
              <AlertDescription className="text-xs">
                Replace individual sections (verse, chorus…) using Kie.ai&apos;s <strong>Replace Section</strong> API.
                Each section creates a new task — adjust start/end timestamps to match the original audio.
                <br />Constraints: segment must be <strong>6–60 seconds</strong> and ≤ 50% of total duration.
              </AlertDescription>
            </Alert>

            {!audioId && (
              <Alert>
                <AlertCircle className="w-3.5 h-3.5" />
                <AlertDescription className="text-xs text-amber-400">
                  Section replacement requires the Kie track ID (audioId). This is available for tracks generated after the feature was added. Use &ldquo;Full Track Replace&rdquo; for older projects.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {sections.map((s, i) => (
                <SectionRow
                  key={i}
                  section={s}
                  index={i}
                  taskId={latestTaskId}
                  audioId={audioId}
                  tags={stylePrompt || "Pop"}
                  title={title}
                  onReplaced={(newId) => setLatestTaskId(newId)}
                />
              ))}
            </div>

            {latestTaskId && latestTaskId !== taskId && (
              <Card className="border-violet-500/20 bg-violet-500/5">
                <CardContent className="p-3 text-xs text-violet-300">
                  Latest task after replacements: <code className="font-mono">{latestTaskId}</code>
                  <br />Use &ldquo;Get Music Details&rdquo; with this ID to retrieve the updated audio.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
