"use client"

import { upload } from "@vercel/blob/client"
// @vercel/blob/client works in both browser and server contexts

const AUDIO_EXTENSIONS = ["mp3", "mp4", "wav", "m4a", "ogg", "flac", "aac", "webm"]

export interface AudioUploadResult {
  url:      string
  fileName: string
}

/**
 * Upload an audio file directly from the browser to Vercel Blob.
 * The file bytes bypass the Next.js serverless function (no 4.5 MB limit).
 * Returns a publicly accessible URL that Kie.ai can reach.
 */
export async function uploadAudio(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<AudioUploadResult> {
  const ext = (file.name.split(".").pop() ?? "mp3").toLowerCase()

  if (!AUDIO_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported format .${ext}. Allowed: ${AUDIO_EXTENSIONS.join(", ")}`)
  }
  if (file.size > 200 * 1024 * 1024) {
    throw new Error("File too large — max 200 MB")
  }

  // Sanitise filename: keep extension, replace unicode / special chars
  const safeName = `audio-upload.${ext}`

  const blob = await upload(safeName, file, {
    access:          "public",
    handleUploadUrl: "/api/upload/audio",
    onUploadProgress: ({ percentage }) => onProgress?.(percentage),
  })

  return { url: blob.url, fileName: file.name }
}
