import prisma from "@/lib/db"

type CostEventRow = {
  provider: string
  model: string
  operationType: string
  estimatedCost: number
  actualCost: number | null
}

// Kie.ai credit system: 200 credits = $1 (1 credit = $0.005)
// Music generates 2 tracks per request.
// Prices below are per-request (per generation call), not per track.
export const PRICING_CONFIG = {
  music: {
    // Suno via Kie.ai — cheapest to most expensive
    V4: { perRequest: 0.01, perTrack: 0.005, currency: "USD" },      // ~2 credits/req = $0.01 ✅ cheapest modern
    V3_5: { perRequest: 0.008, perTrack: 0.004, currency: "USD" },   // ~1.6 credits/req = $0.008 (oldest)
    V4_5: { perRequest: 0.02, perTrack: 0.01, currency: "USD" },     // ~4 credits/req = $0.02
    V4_5PLUS: { perRequest: 0.03, perTrack: 0.015, currency: "USD" },// ~6 credits/req = $0.03
    V4_5ALL: { perRequest: 0.02, perTrack: 0.01, currency: "USD" },  // ~4 credits/req = $0.02
    V5: { perRequest: 0.04, perTrack: 0.02, currency: "USD" },       // ~8 credits/req = $0.04
    V5_5: { perRequest: 0.05, perTrack: 0.025, currency: "USD" },    // ~10 credits/req = $0.05
  },
  image: {
    // Flux Kontext via Kie.ai (~70-80% off official)
    "flux-kontext-pro": { perImage: 0.012, currency: "USD" },        // ~2 credits/img = $0.012 ✅ cheapest Flux
    "flux-kontext-max": { perImage: 0.025, currency: "USD" },        // ~5 credits/img = $0.025
    // Google Nano Banana 2 via Kie.ai (even cheaper, different API)
    "nano-banana-2-1k": { perImage: 0.04, currency: "USD" },         // 8 credits = $0.04
    "nano-banana-2-2k": { perImage: 0.06, currency: "USD" },         // 12 credits = $0.06
    "nano-banana-2-4k": { perImage: 0.09, currency: "USD" },         // 18 credits = $0.09
  },
  video: {
    "kling-v2.1": { per5Seconds: 0.20, currency: "USD" },
    "kling-v1.5": { per5Seconds: 0.14, currency: "USD" },
    "kling-v1": { per5Seconds: 0.10, currency: "USD" },
  },
  lyrics: {
    "gpt-4o-mini": { per1kTokens: 0.00015, currency: "USD" },
    "gpt-4o": { per1kTokens: 0.005, currency: "USD" },
  },
} as const

export function getEstimatedCost(
  operationType: "music" | "image" | "video" | "lyrics",
  model: string,
  quantity: number
): number {
  switch (operationType) {
    case "music": {
      const pricing = (PRICING_CONFIG.music as Record<string, { perRequest: number }>)[model]
      return pricing ? pricing.perRequest * quantity : 0.01 * quantity
    }
    case "image": {
      const pricing = (PRICING_CONFIG.image as Record<string, { perImage: number }>)[model]
      return pricing ? pricing.perImage * quantity : 0.012 * quantity
    }
    case "video": {
      const pricing = (PRICING_CONFIG.video as Record<string, { per5Seconds: number }>)[model]
      return pricing ? pricing.per5Seconds * Math.ceil(quantity / 5) : 0.14 * Math.ceil(quantity / 5)
    }
    case "lyrics": {
      const pricing = (PRICING_CONFIG.lyrics as Record<string, { per1kTokens: number }>)[model]
      return pricing ? pricing.per1kTokens * (quantity / 1000) : 0.00015 * (quantity / 1000)
    }
    default:
      return 0
  }
}

export async function recordCostEvent(data: {
  projectId: string
  jobId?: string
  provider: string
  model: string
  operationType: string
  unit: string
  quantity: number
  estimatedCost: number
  actualCost?: number
  currency?: string
}) {
  return prisma.costEvent.create({
    data: {
      projectId: data.projectId,
      jobId: data.jobId,
      provider: data.provider,
      model: data.model,
      operationType: data.operationType,
      unit: data.unit,
      quantity: data.quantity,
      estimatedCost: data.estimatedCost,
      actualCost: data.actualCost,
      currency: data.currency || "USD",
    },
  })
}

export async function summarizeProjectCost(projectId: string) {
  const events = await prisma.costEvent.findMany({
    where: { projectId },
  })

  const total = events.reduce(
    (sum: number, e: CostEventRow) => sum + (e.actualCost ?? e.estimatedCost),
    0
  )

  const byProvider = events.reduce(
    (acc: Record<string, number>, e: CostEventRow) => {
      acc[e.provider] = (acc[e.provider] || 0) + (e.actualCost ?? e.estimatedCost)
      return acc
    },
    {} as Record<string, number>
  )

  const byType = events.reduce(
    (acc: Record<string, number>, e: CostEventRow) => {
      acc[e.operationType] = (acc[e.operationType] || 0) + (e.actualCost ?? e.estimatedCost)
      return acc
    },
    {} as Record<string, number>
  )

  return { total, byProvider, byType, events }
}

export async function summarizeDashboardCost(userId: string) {
  const projects = await prisma.project.findMany({
    where: { userId },
    select: { id: true },
  })

  const projectIds = projects.map((p: { id: string }) => p.id)

  const events = await prisma.costEvent.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { createdAt: "asc" },
  })

  const total = events.reduce(
    (sum: number, e: CostEventRow) => sum + (e.actualCost ?? e.estimatedCost),
    0
  )

  const byModel = events.reduce(
    (acc: Record<string, number>, e: CostEventRow) => {
      const key = `${e.provider}/${e.model}`
      acc[key] = (acc[key] || 0) + (e.actualCost ?? e.estimatedCost)
      return acc
    },
    {} as Record<string, number>
  )

  return { total, byModel, events }
}
