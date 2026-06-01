"use client"

import { upload } from "@vercel/blob/client"

const AUDIO_EXTENSIONS = ["mp3", "mp4", "wav", "m4a", "ogg", "flac", "aac", "webm"]

export interface AudioUploadResult {
  url:      string
  fileName: string
}

/** Generate a short random hex string usable in a pathname. */
function shortId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Upload an audio file directly from the browser to Vercel Blob.
 * File bytes go browser → Vercel Blob edge (bypasses the 4.5 MB function limit).
 * Each upload gets a unique pathname so it never collides with existing blobs.
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

  // Unique path per upload — prevents "blob already exists" 400 error
  const uniquePath = `audio-uploads/${Date.now()}-${shortId()}.${ext}`

  const blob = await upload(uniquePath, file, {
    access:           "public",
    handleUploadUrl:  "/api/upload/audio",
    onUploadProgress: ({ percentage }) => onProgress?.(percentage),
  })

  return { url: blob.url, fileName: file.name }
}
