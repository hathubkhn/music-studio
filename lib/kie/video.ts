import { kieClient } from "./client"
import { mockGenerateVideo, mockGetVideoStatus } from "./mock"
import type {
  VideoGenerationRequest,
  VideoGenerationResponse,
  TaskStatusResponse,
} from "./types"

const VIDEO_MODEL = process.env.KIE_VIDEO_MODEL || "kling-v1.5"
const isMockMode = () =>
  process.env.MOCK_MODE === "true" || !kieClient.isConfigured()

export async function generateVideo(
  req: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  if (isMockMode()) {
    return mockGenerateVideo(req)
  }

  return kieClient.post<VideoGenerationResponse>("/v1/videos/generate", {
    ...req,
    model: req.model || VIDEO_MODEL,
  })
}

export async function getVideoStatus(taskId: string): Promise<TaskStatusResponse> {
  if (isMockMode()) {
    return mockGetVideoStatus(taskId)
  }

  return kieClient.get<TaskStatusResponse>(`/v1/videos/status/${taskId}`)
}
