import { z } from "zod"

export const songIdeaSchema = z.object({
  prompt: z
    .string()
    .min(10, "Please describe your song idea in at least 10 characters")
    .max(1000, "Song idea is too long (max 1000 characters)"),
  targetLanguage: z.string().min(1, "Please select a language"),
  audience: z.string().min(1, "Please select an audience"),
  mood: z.string().min(1, "Please select a mood"),
  genre: z.string().min(1, "Please select a genre"),
  vocalPreference: z.string().min(1, "Please select a vocal preference"),
  durationTarget: z.string().min(1, "Please select a duration"),
  outputPurpose: z.string().min(1, "Please select an output purpose"),
})

export const lyricsEditorSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  lyrics: z
    .string()
    .min(20, "Lyrics must be at least 20 characters")
    .max(5000, "Lyrics too long (max 5000 characters)"),
  stylePrompt: z.string().min(10, "Style prompt is required"),
  genre: z.string().optional(),
  mood: z.string().optional(),
  vocalStyle: z.string().optional(),
  instrumentation: z.string().optional(),
  tempo: z.string().optional(),
  negativePrompt: z.string().optional(),
  language: z.string().default("en"),
})

export const scenePromptSchema = z.object({
  order: z.number(),
  lyricExcerpt: z.string(),
  description: z.string().optional(),
  prompt: z.string().min(10, "Image prompt is required"),
  negativePrompt: z.string().optional(),
  aspectRatio: z.string().default("16:9"),
  textOverlay: z.string().optional(),
  style: z.string().optional(),
})

export const projectCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  originalPrompt: z.string().min(10),
  targetLanguage: z.string().default("en"),
  audience: z.string().optional(),
  mood: z.string().optional(),
  genre: z.string().optional(),
  vocalPreference: z.string().optional(),
  durationTarget: z.string().optional(),
  outputPurpose: z.string().optional(),
})

export type SongIdeaFormData = z.infer<typeof songIdeaSchema>
export type LyricsEditorFormData = z.infer<typeof lyricsEditorSchema>
export type ScenePromptFormData = z.infer<typeof scenePromptSchema>
export type ProjectCreateFormData = z.infer<typeof projectCreateSchema>
