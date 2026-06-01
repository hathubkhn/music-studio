import { kieClient } from "./client"
import { mockGenerateImage, mockGetImageStatus } from "./mock"
import type {
  ImageGenerationRequest,
  ImageGenerationResponse,
  TaskStatusResponse,
  KieApiResponse,
  KieImageGenerateData,
  KieImageStatusData,
} from "./types"

// Valid Kie Flux Kontext model identifiers: flux-kontext-pro, flux-kontext-max
const IMAGE_MODEL = process.env.KIE_IMAGE_MODEL || "flux-kontext-pro"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

const isMockMode = () =>
  process.env.MOCK_MODE === "true" || !kieClient.isConfigured()

export async function generateImage(
  req: ImageGenerationRequest,
  index = 0
): Promise<ImageGenerationResponse> {
  if (isMockMode()) {
    return mockGenerateImage(req, index)
  }

  // Map our internal shape to the Kie Flux Kontext API shape
  const kiePayload = {
    prompt: req.prompt,
    aspectRatio: req.aspectRatio || "16:9",
    model: req.model || IMAGE_MODEL,
    callBackUrl: `${APP_URL}/api/kie/webhook`,
    enableTranslation: true,
    outputFormat: "jpeg",
    safetyTolerance: 2,
  }

  const response = await kieClient.post<KieApiResponse<KieImageGenerateData>>(
    "/api/v1/flux/kontext/generate",
    kiePayload
  )

  return {
    taskId: response.data!.taskId,
    status: "queued",
  }
}

export async function getImageStatus(taskId: string): Promise<TaskStatusResponse> {
  if (isMockMode()) {
    return mockGetImageStatus(taskId)
  }

  const response = await kieClient.get<KieApiResponse<KieImageStatusData>>(
    `/api/v1/flux/kontext/record-info?taskId=${taskId}`
  )

  const data = response.data!

  // Map successFlag to our internal status
  // 0 = generating, 1 = success, 2 = create failed, 3 = generation failed
  let status: TaskStatusResponse["status"]
  switch (data.successFlag) {
    case 1:
      status = "completed"
      break
    case 2:
    case 3:
      status = "failed"
      break
    case 0:
    default:
      status = "processing"
  }

  const images =
    data.successFlag === 1 && data.response?.resultImageUrl
      ? [
          {
            id: taskId,
            url: data.response.resultImageUrl,
            width: 0,
            height: 0,
            metadata: {
              originUrl: data.response.originImageUrl,
            },
          },
        ]
      : []

  return {
    taskId,
    status,
    result: images.length > 0 ? images : undefined,
    error: data.errorMessage,
  }
}
