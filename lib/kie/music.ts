import { kieClient } from "./client"
import { mockGenerateMusic, mockGetMusicStatus } from "./mock"
import type {
  MusicGenerationRequest,
  MusicCoverRequest,
  MashupRequest,
  ReplaceSectionRequest,
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

/**
 * Mashup: blend 2 reference audio tracks into a new song.
 * Uses Kie.ai /api/v1/generate/mashup endpoint.
 * Both uploadUrl and uploadUrl2 must be publicly accessible URLs.
 */
export async function generateMashup(
  req: MashupRequest
): Promise<MusicGenerationResponse> {
  if (isMockMode()) {
    return mockGenerateMusic({ title: req.title, lyrics: req.lyrics, stylePrompt: req.stylePrompt ?? "" })
  }

  const model = req.model || "V4_5"   // Mashup supports V4_5PLUS per Kie docs
  const limits = getLimits(model)

  // Title cap is 80 chars for all models on the mashup endpoint
  const MASHUP_TITLE_MAX = 80

  const kiePayload = {
    uploadUrlList:        [req.uploadUrl, req.uploadUrl2],   // exactly 2 URLs as per Kie docs
    prompt:               req.lyrics.slice(0, limits.prompt),
    style:                (req.stylePrompt ?? "").slice(0, limits.style),
    title:                req.title.slice(0, MASHUP_TITLE_MAX),
    customMode:           true,
    instrumental:         false,
    model,
    callBackUrl:          `${APP_URL}/api/kie/webhook`,
    audioWeight:          req.audioWeight  ?? 0.5,
    ...(req.styleWeight         !== undefined && { styleWeight:         req.styleWeight }),
    ...(req.weirdnessConstraint !== undefined && { weirdnessConstraint: req.weirdnessConstraint }),
    ...(req.vocalGender         !== undefined && { vocalGender:         req.vocalGender }),
  }

  const response = await kieClient.post<KieApiResponse<KieMusicGenerateData>>(
    "/api/v1/generate/mashup",
    kiePayload
  )

  return {
    taskId: response.data!.taskId,
    status: "queued",
  }
}

/**
 * Replace a time segment within an already-generated song with new lyrics.
 * POST /api/v1/generate/replace-section
 * Segment must be 6–60 s and ≤ 50% of total song duration.
 */
export async function replaceSection(
  req: ReplaceSectionRequest
): Promise<MusicGenerationResponse> {
  if (isMockMode()) {
    return mockGenerateMusic({ title: req.title, lyrics: req.prompt, stylePrompt: req.tags })
  }

  const kiePayload = {
    taskId:       req.taskId,
    audioId:      req.audioId,
    prompt:       req.prompt,
    tags:         req.tags,
    title:        req.title,
    infillStartS: Math.round(req.infillStartS * 100) / 100,
    infillEndS:   Math.round(req.infillEndS   * 100) / 100,
    fullLyrics:   req.fullLyrics,
    ...(req.negativeTags && { negativeTags: req.negativeTags }),
    callBackUrl:  req.callBackUrl ?? `${APP_URL}/api/kie/webhook`,
  }

  const response = await kieClient.post<KieApiResponse<KieMusicGenerateData>>(
    "/api/v1/generate/replace-section",
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

  // If Kie returns an error message but no tracks and status is still "processing",
  // treat it as failed so the UI doesn't poll forever (e.g. copyright rejection,
  // "This audio matches an existing recording in our catalog.").
  if (data.errorMessage && tracks.length === 0 && status === "processing") {
    status = "failed"
  }

  return {
    taskId: data.taskId,
    status,
    result: tracks.length > 0 ? tracks : undefined,
    error: data.errorMessage,
  }
}
