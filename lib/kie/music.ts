import { kieClient } from "./client"
import { mockGenerateMusic, mockGetMusicStatus } from "./mock"
import type {
  MusicGenerationRequest,
  MusicCoverRequest,
  MusicGenerationResponse,
  TaskStatusResponse,
  KieApiResponse,
  KieMusicGenerateData,
  KieMusicStatusData,
} from "./types"

// Default to V4_5 — valid Kie Suno model identifiers: V4, V4_5, V4_5PLUS, V4_5ALL, V5, V5_5
const SUNO_MODEL = process.env.KIE_SUNO_MODEL || "V4_5"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// Per-model character limits from Kie.ai docs
const MODEL_LIMITS: Record<string, { prompt: number; style: number; title: number }> = {
  V4:      { prompt: 3000, style: 200,  title: 80  },
  V4_5:    { prompt: 5000, style: 1000, title: 100 },
  V4_5PLUS:{ prompt: 5000, style: 1000, title: 100 },
  V4_5ALL: { prompt: 5000, style: 1000, title: 80  },
  V5:      { prompt: 5000, style: 1000, title: 100 },
}

function getLimits(model: string) {
  return MODEL_LIMITS[model] ?? MODEL_LIMITS["V4_5"]
}

const isMockMode = () =>
  process.env.MOCK_MODE === "true" || !kieClient.isConfigured()

export async function generateMusic(
  req: MusicGenerationRequest
): Promise<MusicGenerationResponse> {
  if (isMockMode()) {
    return mockGenerateMusic(req)
  }

  const model = req.model || SUNO_MODEL
  const limits = getLimits(model)

  if (req.lyrics.length > limits.prompt) {
    console.warn(`[Suno] Lyrics too long (${req.lyrics.length} chars, limit ${limits.prompt} for ${model}) — truncating`)
  }

  // Map our internal shape to the Kie Suno API shape
  const kiePayload = {
    prompt:      req.lyrics.slice(0, limits.prompt),
    style:       req.stylePrompt.slice(0, limits.style),
    title:       req.title.slice(0, limits.title),
    customMode:  true,
    instrumental:req.makeInstrumental ?? false,
    model,
    callBackUrl: `${APP_URL}/api/kie/webhook`,
    negativeTags:"",
  }

  const response = await kieClient.post<KieApiResponse<KieMusicGenerateData>>(
    "/api/v1/generate",
    kiePayload
  )

  return {
    taskId: response.data!.taskId,
    status: "queued",
    debug: { model, promptLen: kiePayload.prompt.length, styleLen: kiePayload.style.length },
  }
}

/**
 * Cover an existing audio track with new lyrics while preserving the melody.
 * Uses Kie.ai /api/v1/generate/upload-cover endpoint.
 * `uploadUrl` must be a publicly accessible URL (not a blob: URL).
 */
export async function generateMusicCover(
  req: MusicCoverRequest
): Promise<MusicGenerationResponse> {
  if (isMockMode()) {
    return mockGenerateMusic({ title: req.title, lyrics: req.lyrics, stylePrompt: req.stylePrompt ?? "" })
  }

  const model = req.model || SUNO_MODEL
  const limits = getLimits(model)

  const kiePayload = {
    uploadUrl:   req.uploadUrl,
    prompt:      req.lyrics.slice(0, limits.prompt),
    style:       (req.stylePrompt ?? "").slice(0, limits.style),
    title:       req.title.slice(0, limits.title),
    customMode:  true,
    instrumental:false,
    model,
    callBackUrl: `${APP_URL}/api/kie/webhook`,
    negativeTags:"",
    audioWeight: req.audioWeight ?? 0.8,
    ...(req.styleWeight  !== undefined && { styleWeight:  req.styleWeight }),
    ...(req.vocalGender  !== undefined && { vocalGender:  req.vocalGender }),
  }

  const response = await kieClient.post<KieApiResponse<KieMusicGenerateData>>(
    "/api/v1/generate/upload-cover",
    kiePayload
  )

  return {
    taskId: response.data!.taskId,
    status: "queued",
  }
}

export async function getMusicStatus(taskId: string): Promise<TaskStatusResponse> {
  if (isMockMode()) {
    return mockGetMusicStatus(taskId)
  }

  const response = await kieClient.get<KieApiResponse<KieMusicStatusData>>(
    `/api/v1/generate/record-info?taskId=${taskId}`
  )

  const data = response.data!

  const tracks = data.response?.sunoData?.map((track) => ({
    id: track.id,
    url: track.audioUrl || track.sourceAudioUrl || "",
    title: track.title,
    duration: track.duration,
    metadata: {
      imageUrl: track.imageUrl,
      streamUrl: track.streamAudioUrl,
      tags: track.tags,
      model: track.modelName,
    },
  })) ?? []

  // Map Kie status strings to our internal status.
  // Treat FIRST_SUCCESS as completed when at least one track has a URL.
  let status: TaskStatusResponse["status"]
  switch (data.status) {
    case "SUCCESS":
      status = "completed"
      break
    case "FIRST_SUCCESS":
      status = tracks.some((t) => t.url) ? "completed" : "processing"
      break
    case "CREATE_TASK_FAILED":
      status = "failed"
      break
    case "TEXT_SUCCESS":
    case "PENDING":
    default:
      status = "processing"
  }

  return {
    taskId: data.taskId,
    status,
    result: tracks.length > 0 ? tracks : undefined,
    error: data.errorMessage,
  }
}
