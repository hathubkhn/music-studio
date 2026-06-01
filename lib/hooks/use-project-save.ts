"use client"

import { useCallback, useRef } from "react"
import type { ProjectData } from "@/components/create-flow/create-flow"

/**
 * Returns helpers to create and auto-save a project.
 * projectIdRef holds the current project ID so it persists across re-renders.
 */
export function useProjectSave() {
  const projectIdRef = useRef<string | null>(null)

  /** Create a new project record and store its ID. */
  const createProject = useCallback(async (data: Partial<ProjectData>): Promise<string | null> => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:          data.title || "Untitled Project",
          originalPrompt: data.prompt || "",
          mood:           data.mood,
          genre:          data.genre,
          audience:       data.audience,
          vocalPreference:data.vocalPreference,
          durationTarget: data.durationTarget,
          outputPurpose:  data.outputPurpose,
          targetLanguage: data.targetLanguage,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      projectIdRef.current = json.id
      return json.id
    } catch (err) {
      console.error("[ProjectSave] Failed to create project:", err)
      return null
    }
  }, [])

  /** Save (PATCH) the current project with updated data. Silently skips if no ID. */
  const saveProject = useCallback(async (data: Partial<ProjectData>): Promise<void> => {
    const id = projectIdRef.current
    if (!id) return

    try {
      const body: Record<string, unknown> = {}

      if (data.title)  body.title  = data.title
      if (data.mood)   body.mood   = data.mood
      if (data.genre)  body.genre  = data.genre

      // Lyrics step
      if (data.lyrics && data.title) {
        body.lyrics = {
          title:          data.title,
          lyrics:         data.lyrics,
          stylePrompt:    data.stylePrompt ?? "",
          genre:          data.genre,
          mood:           data.mood,
          vocalStyle:     data.vocalStyle,
          instrumentation:data.instrumentation,
          tempo:          data.tempo,
          negativePrompt: data.negativePrompt,
          language:       data.targetLanguage,
          isFinal:        true,
        }
        body.status = "IN_PROGRESS"
      }

      // Song brief
      if (data.songBrief) {
        body.songBrief = data.songBrief
      }

      // Audio asset (from Suno generation or import)
      const audioSrc = data.audioUrl || data.importedAudioUrl
      if (audioSrc && !audioSrc.startsWith("blob:")) {
        body.audioUrl = {
          url:     audioSrc,
          filename: data.audioUrl ? "audio.mp3" : (data.importedAudioName ?? "audio.mp3"),
          isFinal: true,
        }
        body.status = "IN_PROGRESS"
      }

      // Scenes (images)
      if (data.scenes && data.scenes.length > 0) {
        body.scenes = data.scenes
        const allDone = data.scenes.every((s) => s.imageStatus === "completed")
        if (allDone) body.status = "COMPLETED"
      }

      if (Object.keys(body).length === 0) return

      await fetch(`/api/projects/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
    } catch (err) {
      console.error("[ProjectSave] Failed to save project:", err)
    }
  }, [])

  return { projectIdRef, createProject, saveProject }
}
