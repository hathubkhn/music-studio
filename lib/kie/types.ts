export interface MusicGenerationRequest {
  title: string
  lyrics: string
  stylePrompt: string
  model?: string
  callbackUrl?: string
  makeInstrumental?: boolean
}

/**
 * Mashup: blend 2 reference audio tracks into a new song.
 * POST /api/v1/generate/mashup
 * Kie API sends these as `uploadUrlList: [url1, url2]` — exactly 2 URLs required.
 * Title max: 80 chars (all models). Prompt limits same as generate endpoint.
 */
export interface MashupRequest {
  /** Public URL of the first reference audio (melody donor A). */
  uploadUrl: string
  /** Public URL of the second reference audio (melody donor B). */
  uploadUrl2: string
  /** Title — max 80 chars (all models). */
  title: string
  /** Lyrics for the new mashup track (used as `prompt` in custom mode). */
  lyrics: string
  /** Style tags (genre, mood, instruments …). */
  stylePrompt?: string
  model?: string
  /** Balance weight for audio features (0–1, default 0.5, 2 decimal places). */
  audioWeight?: number
  /** Strength of style adherence (0–1, 2 decimal places). */
  styleWeight?: number
  /** Creativity / experimental deviation (0–1, 2 decimal places). */
  weirdnessConstraint?: number
  vocalGender?: "m" | "f"
}

/**
 * Replace a specific time segment in an already-generated track.
 * POST /api/v1/generate/replace-section
 * Constraints: 6 ≤ (end - start) ≤ 60 seconds; segment ≤ 50% of song duration.
 */
export interface ReplaceSectionRequest {
  /** Original music parent task ID. */
  taskId: string
  /** Audio track ID within that task. */
  audioId: string
  /** New lyrics for the replaced segment. */
  prompt: string
  /** Style tags (e.g. "Pop, Sad, Guitar"). */
  tags: string
  /** Song title. */
  title: string
  /** Styles to avoid (optional). */
  negativeTags?: string
  /** Start time of segment in seconds (2 decimal places). */
  infillStartS: number
  /** End time of segment in seconds (2 decimal places). */
  infillEndS: number
  /** Complete modified lyrics for the entire song. */
  fullLyrics: string
  callBackUrl?: string
}

/** Cover an existing track with new lyrics while keeping the melody. */
export interface MusicCoverRequest {
  /** Publicly accessible URL of the source audio (max 8 min, no blob: URLs). */
  uploadUrl: string
  title: string
  lyrics: string
  stylePrompt?: string
  model?: string
  /** How strongly to follow the original audio melody (0–1, default 0.8). */
  audioWeight?: number
  /** How strongly to follow the style tags (0–1). */
  styleWeight?: number
  vocalGender?: "m" | "f"
}

export interface MusicGenerationResponse {
  taskId: string
  status: "queued" | "processing" | "completed" | "failed"
  tracks?: MusicTrack[]
  error?: string
  debug?: Record<string, unknown>
}

export interface MusicTrack {
  id: string
  url: string
  title: string
  duration: number
  metadata?: Record<string, unknown>
}

export interface ImageGenerationRequest {
  prompt: string
  negativePrompt?: string
  aspectRatio?: string
  model?: string
  callbackUrl?: string
  width?: number
  height?: number
}

export interface ImageGenerationResponse {
  taskId: string
  status: "queued" | "processing" | "completed" | "failed"
  images?: GeneratedImage[]
  error?: string
}

export interface GeneratedImage {
  id: string
  url: string
  width: number
  height: number
  metadata?: Record<string, unknown>
}

export interface VideoGenerationRequest {
  prompt?: string
  imageUrl?: string
  audioUrl?: string
  model?: string
  callbackUrl?: string
  duration?: number
}

export interface VideoGenerationResponse {
  taskId: string
  status: "queued" | "processing" | "completed" | "failed"
  videos?: GeneratedVideo[]
  error?: string
}

export interface GeneratedVideo {
  id: string
  url: string
  duration: number
  width: number
  height: number
  metadata?: Record<string, unknown>
}

export interface TaskStatusResponse {
  taskId: string
  status: "queued" | "processing" | "completed" | "failed"
  progress?: number
  result?: MusicTrack[] | GeneratedImage[] | GeneratedVideo[]
  error?: string
}

export interface KieApiError {
  code: string
  message: string
  details?: unknown
}

// Raw Kie API response envelope
export interface KieApiResponse<T> {
  code: number
  msg?: string
  data?: T
}

// Kie Suno generate response data
export interface KieMusicGenerateData {
  taskId: string
}

// A single Suno track in the status response (Kie API returns camelCase)
export interface KieSunoTrack {
  id: string
  audioUrl: string
  sourceAudioUrl?: string
  streamAudioUrl: string
  sourceStreamAudioUrl?: string
  imageUrl: string
  sourceImageUrl?: string
  prompt: string
  modelName: string
  title: string
  tags: string
  createTime: number
  duration: number
}

// Kie Suno status response data
export interface KieMusicStatusData {
  taskId: string
  status: "SUCCESS" | "FIRST_SUCCESS" | "TEXT_SUCCESS" | "PENDING" | "CREATE_TASK_FAILED"
  errorMessage?: string
  response: {
    sunoData?: KieSunoTrack[]
  }
}

// Kie image generate response data
export interface KieImageGenerateData {
  taskId: string
}

// Kie image status response data
export interface KieImageStatusData {
  taskId: string
  /** 0 = generating, 1 = success, 2 = create failed, 3 = generation failed */
  successFlag: 0 | 1 | 2 | 3
  createTime?: number
  completeTime?: number
  errorMessage?: string
  errorCode?: string | number
  response?: {
    resultImageUrl?: string
    originImageUrl?: string
  }
}
