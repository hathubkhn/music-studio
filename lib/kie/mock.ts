import { sleep } from "@/lib/utils"
import type {
  MusicGenerationRequest,
  MusicGenerationResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationRequest,
  VideoGenerationResponse,
  TaskStatusResponse,
} from "./types"

const MOCK_AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
const MOCK_IMAGE_URLS = [
  "https://picsum.photos/seed/scene1/1280/720",
  "https://picsum.photos/seed/scene2/1280/720",
  "https://picsum.photos/seed/scene3/1280/720",
  "https://picsum.photos/seed/scene4/1280/720",
]

export async function mockGenerateMusic(
  req: MusicGenerationRequest
): Promise<MusicGenerationResponse> {
  await sleep(800)
  const taskId = `mock_music_${Date.now()}`
  return {
    taskId,
    status: "queued",
  }
}

export async function mockGetMusicStatus(
  taskId: string
): Promise<TaskStatusResponse> {
  await sleep(500)
  return {
    taskId,
    status: "completed",
    result: [
      {
        id: `track_${taskId}`,
        url: MOCK_AUDIO_URL,
        title: "Generated Song",
        duration: 180,
        metadata: { mock: true },
      },
    ],
  }
}

export async function mockGenerateImage(
  req: ImageGenerationRequest,
  index = 0
): Promise<ImageGenerationResponse> {
  await sleep(600)
  const taskId = `mock_image_${Date.now()}`
  return {
    taskId,
    status: "queued",
  }
}

export async function mockGetImageStatus(
  taskId: string,
  index = 0
): Promise<TaskStatusResponse> {
  await sleep(400)
  const imageUrl = MOCK_IMAGE_URLS[index % MOCK_IMAGE_URLS.length]
  return {
    taskId,
    status: "completed",
    result: [
      {
        id: `img_${taskId}`,
        url: imageUrl,
        width: 1280,
        height: 720,
        metadata: { mock: true },
      },
    ],
  }
}

export async function mockGenerateVideo(
  req: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  await sleep(700)
  const taskId = `mock_video_${Date.now()}`
  return {
    taskId,
    status: "queued",
  }
}

export async function mockGetVideoStatus(
  taskId: string
): Promise<TaskStatusResponse> {
  await sleep(500)
  return {
    taskId,
    status: "completed",
    result: [
      {
        id: `vid_${taskId}`,
        url: "https://www.w3schools.com/html/mov_bbb.mp4",
        duration: 30,
        width: 1280,
        height: 720,
        metadata: { mock: true },
      },
    ],
  }
}
