"use client"

/**
 * TrackImageEditor
 * ────────────────
 * Per-track image management on the Album Detail page.
 * - Generate AI thumbnail from the track's lyrics / style / album theme
 * - Upload a custom image (via Vercel Blob)
 * - Persist thumbnailUrl to DB via PATCH /api/albums/[albumId]
 */

import { useState, useRef } from "react"
import {
  Image as ImageIcon, Sparkles, Upload, Loader2,
  CheckCircle2, RefreshCw, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { upload } from "@vercel/blob/client"

interface Props {
  albumId:      string
  trackId:      string
  trackTitle:   string
  lyrics?:      string | null
  stylePrompt?: string | null
  albumTheme?:  string | null
  albumMood?:   string | null
  albumGenre?:  string | null
  initialUrl?:  string | null
  onSaved:      (url: string) => void
}

type Phase = "idle" | "generating" | "uploading" | "saving"

export function TrackImageEditor({
  albumId, trackId, trackTitle, lyrics, stylePrompt,
  albumTheme, albumMood, albumGenre, initialUrl, onSaved,
}: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl ?? null)
  const [phase, setPhase]       = useState<Phase>("idle")
  const fileRef = useRef<HTMLInputElement>(null)

  const isBusy = phase !== "idle"

  // ── Save URL to DB ────────────────────────────────────────────────────────
  const persistUrl = async (url: string) => {
    setPhase("saving")
    try {
      const res = await fetch(`/api/albums/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: { id: trackId, thumbnailUrl: url } }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setImageUrl(url)
      onSaved(url)
      toast.success("Thumbnail saved!")
    } catch {
      toast.error("Failed to save thumbnail")
    } finally {
      setPhase("idle")
    }
  }

  // ── AI generate ───────────────────────────────────────────────────────────
  const generateAI = async () => {
    setPhase("generating")
    try {
      // Build a rich image prompt from track metadata
      const parts = [
        albumMood   && `${albumMood} mood`,
        albumGenre  && albumGenre,
        albumTheme  && albumTheme.slice(0, 80),
        stylePrompt && stylePrompt.slice(0, 80),
        "cinematic background, no people, no text, ultra HD, 16:9",
      ].filter(Boolean)
      const prompt = `${trackTitle} — ${parts.join(", ")}`

      const res = await fetch("/api/kie/image/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt: "text, watermark, logo, person, face, blurry, low quality, nsfw",
          aspectRatio: "16:9",
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { taskId } = await res.json()

      // Poll up to 90 s
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const s   = await fetch(`/api/kie/image/status?jobId=${taskId}`)
        const out = await s.json()
        if (out.status === "completed" && out.result?.[0]?.url) {
          await persistUrl(out.result[0].url)
          return
        }
        if (out.status === "failed") throw new Error(out.error ?? "Generation failed")
      }
      throw new Error("Timed out")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image generation failed")
      setPhase("idle")
    }
  }

  // ── Upload file ───────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return }
    if (file.size > 10 * 1024 * 1024)   { toast.error("Image must be under 10 MB"); return }

    setPhase("uploading")
    try {
      const ext    = file.name.split(".").pop() ?? "jpg"
      const blob   = await upload(
        `album-thumbnails/${albumId}/${trackId}-${Date.now()}.${ext}`,
        file,
        { access: "public", handleUploadUrl: "/api/upload/audio" }
      )
      await persistUrl(blob.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
      setPhase("idle")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const removeImage = async () => {
    setPhase("saving")
    try {
      await fetch(`/api/albums/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: { id: trackId, thumbnailUrl: "" } }),
      })
      setImageUrl(null)
      onSaved("")
      toast.success("Thumbnail removed")
    } catch {
      toast.error("Failed to remove thumbnail")
    } finally {
      setPhase("idle")
    }
  }

  return (
    <div className="space-y-3">
      {/* Preview */}
      {imageUrl ? (
        <div className="relative group rounded-lg overflow-hidden border border-border/60 aspect-video bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={trackTitle}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm" variant="outline"
              className="gap-1.5 text-xs h-7"
              onClick={generateAI}
              disabled={isBusy}
            >
              <RefreshCw className="w-3 h-3" />Regenerate
            </Button>
            <Button
              size="sm" variant="outline"
              className="gap-1.5 text-xs h-7"
              onClick={() => fileRef.current?.click()}
              disabled={isBusy}
            >
              <Upload className="w-3 h-3" />Replace
            </Button>
            <Button
              size="sm" variant="ghost"
              className="gap-1.5 text-xs h-7 text-destructive hover:text-destructive"
              onClick={removeImage}
              disabled={isBusy}
            >
              <X className="w-3 h-3" />Remove
            </Button>
          </div>
          {isBusy && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 aspect-video bg-muted/30 flex flex-col items-center justify-center gap-3">
          <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">No thumbnail yet</p>
          <div className="flex gap-2">
            <Button
              size="sm" variant="outline"
              className="gap-1.5 text-xs h-7"
              onClick={generateAI}
              disabled={isBusy}
            >
              {phase === "generating"
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Sparkles className="w-3 h-3 text-violet-400" />
              }
              {phase === "generating" ? "Generating…" : "AI Generate"}
            </Button>
            <Button
              size="sm" variant="outline"
              className="gap-1.5 text-xs h-7"
              onClick={() => fileRef.current?.click()}
              disabled={isBusy}
            >
              {phase === "uploading"
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Upload className="w-3 h-3" />
              }
              {phase === "uploading" ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>
      )}

      {/* Status label */}
      {phase === "saving" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />Saving…
        </p>
      )}
      {!isBusy && imageUrl && (
        <p className="text-xs text-teal-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />Thumbnail ready
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
