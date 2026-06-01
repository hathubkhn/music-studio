import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"

const DEFAULT_USER_EMAIL = "default@musicstudio.local"

/** Ensure the default user exists and return their ID. */
async function getOrCreateUser(): Promise<string> {
  const user = await prisma.user.upsert({
    where:  { email: DEFAULT_USER_EMAIL },
    update: {},
    create: { email: DEFAULT_USER_EMAIL, name: "Studio User" },
    select: { id: true },
  })
  return user.id
}

// ── GET /api/projects — list all projects ────────────────────────────────────
export async function GET() {
  try {
    const userId = await getOrCreateUser()
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        lyricsVersions: { where: { isFinal: true }, take: 1 },
        mediaAssets:    { where: { type: "AUDIO", isFinal: true }, take: 1 },
        scenes:         { where: { status: "COMPLETED" }, select: { id: true } },
        _count:         { select: { scenes: true, mediaAssets: true } },
      },
    })
    return NextResponse.json(projects)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list projects"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── POST /api/projects — create a new project ─────────────────────────────────
const createSchema = z.object({
  title:          z.string().min(1),
  originalPrompt: z.string().optional().default(""),
  mode:           z.enum(["scratch", "import", "style-copy"]).optional(),
  targetLanguage: z.string().optional(),
  audience:       z.string().optional(),
  mood:           z.string().optional(),
  genre:          z.string().optional(),
  vocalPreference:z.string().optional(),
  durationTarget: z.string().optional(),
  outputPurpose:  z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = createSchema.parse(body)
    const userId = await getOrCreateUser()

    const project = await prisma.project.create({
      data: {
        userId,
        title:          input.title,
        originalPrompt: input.originalPrompt,
        targetLanguage: input.targetLanguage ?? "en",
        audience:       input.audience,
        mood:           input.mood,
        genre:          input.genre,
        vocalPreference:input.vocalPreference,
        durationTarget: input.durationTarget,
        outputPurpose:  input.outputPurpose,
        status:         "DRAFT",
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
