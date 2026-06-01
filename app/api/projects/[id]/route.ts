import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"

// ── GET /api/projects/[id] ────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        songBrief:     true,
        lyricsVersions:{ orderBy: { version: "desc" } },
        scenes:        { orderBy: { order: "asc" } },
        mediaAssets:   { orderBy: { createdAt: "desc" } },
        generationJobs:{ orderBy: { createdAt: "desc" }, take: 20 },
        _count:        { select: { scenes: true, mediaAssets: true } },
      },
    })
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(project)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch project"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── PATCH /api/projects/[id] — update project + related records ───────────────
const updateSchema = z.object({
  title:          z.string().optional(),
  originalPrompt: z.string().optional(),
  status:         z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "FAILED"]).optional(),
  mood:           z.string().optional(),
  genre:          z.string().optional(),
  audience:       z.string().optional(),
  vocalPreference:z.string().optional(),
  durationTarget: z.string().optional(),
  outputPurpose:  z.string().optional(),
  targetLanguage: z.string().optional(),

  // Lyrics version upsert
  lyrics: z.object({
    title:          z.string(),
    lyrics:         z.string(),
    stylePrompt:    z.string().optional().default(""),
    genre:          z.string().optional(),
    mood:           z.string().optional(),
    vocalStyle:     z.string().optional(),
    instrumentation:z.string().optional(),
    tempo:          z.string().optional(),
    negativePrompt: z.string().optional(),
    language:       z.string().optional(),
    isFinal:        z.boolean().optional().default(true),
  }).optional(),

  // Song brief upsert
  songBrief: z.object({
    concept:          z.string(),
    titleSuggestions: z.array(z.string()),
    structure:        z.array(z.string()),
    recommendedStyle: z.string(),
    visualDirection:  z.string(),
    lyricalTheme:     z.string().optional(),
    targetEmotion:    z.string().optional(),
  }).optional(),

  // Audio asset
  audioUrl: z.object({
    url:      z.string(),
    filename: z.string().optional(),
    isFinal:  z.boolean().optional().default(true),
  }).optional(),

  // Scenes (full replace)
  scenes: z.array(z.object({
    order:         z.number(),
    lyricExcerpt:  z.string().optional().default(""),
    description:   z.string().optional(),
    prompt:        z.string().optional(),
    negativePrompt:z.string().optional(),
    aspectRatio:   z.string().optional().default("16:9"),
    style:         z.string().optional(),
    textOverlay:   z.string().optional(),
    status:        z.enum(["PENDING", "GENERATING", "COMPLETED", "FAILED"]).optional(),
    imageUrl:      z.string().optional(),
  })).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const input = updateSchema.parse(body)

    // ── Update project base fields ──
    const projectUpdateData: Record<string, unknown> = {}
    if (input.title)           projectUpdateData.title           = input.title
    if (input.originalPrompt !== undefined) projectUpdateData.originalPrompt = input.originalPrompt
    if (input.status)          projectUpdateData.status          = input.status
    if (input.mood)            projectUpdateData.mood            = input.mood
    if (input.genre)           projectUpdateData.genre           = input.genre
    if (input.audience)        projectUpdateData.audience        = input.audience
    if (input.vocalPreference) projectUpdateData.vocalPreference = input.vocalPreference
    if (input.durationTarget)  projectUpdateData.durationTarget  = input.durationTarget
    if (input.outputPurpose)   projectUpdateData.outputPurpose   = input.outputPurpose
    if (input.targetLanguage)  projectUpdateData.targetLanguage  = input.targetLanguage

    const project = await prisma.project.update({
      where: { id },
      data:  projectUpdateData,
    })

    // ── Song brief upsert ──
    if (input.songBrief) {
      await prisma.songBrief.upsert({
        where:  { projectId: id },
        create: { projectId: id, ...input.songBrief },
        update: input.songBrief,
      })
    }

    // ── Lyrics version upsert (mark previous as not final, add new) ──
    if (input.lyrics) {
      if (input.lyrics.isFinal) {
        await prisma.lyricsVersion.updateMany({
          where:  { projectId: id },
          data:   { isFinal: false },
        })
      }
      const latest = await prisma.lyricsVersion.findFirst({
        where:   { projectId: id },
        orderBy: { version: "desc" },
        select:  { version: true },
      })
      await prisma.lyricsVersion.create({
        data: {
          projectId: id,
          version:   (latest?.version ?? 0) + 1,
          title:     input.lyrics.title,
          lyrics:    input.lyrics.lyrics,
          stylePrompt:    input.lyrics.stylePrompt ?? "",
          genre:          input.lyrics.genre,
          mood:           input.lyrics.mood,
          vocalStyle:     input.lyrics.vocalStyle,
          instrumentation:input.lyrics.instrumentation,
          tempo:          input.lyrics.tempo,
          negativePrompt: input.lyrics.negativePrompt,
          language:       input.lyrics.language ?? "en",
          isFinal:        input.lyrics.isFinal ?? true,
        },
      })
    }

    // ── Audio media asset ──
    if (input.audioUrl) {
      // Mark previous audio assets as not final
      if (input.audioUrl.isFinal) {
        await prisma.mediaAsset.updateMany({
          where: { projectId: id, type: "AUDIO" },
          data:  { isFinal: false },
        })
      }
      // Note: jobId is omitted intentionally — GenerationJob records are not created
      // in the current flow, so passing jobId would violate the FK constraint.
      await prisma.mediaAsset.create({
        data: {
          projectId: id,
          type:      "AUDIO",
          url:       input.audioUrl.url,
          filename:  input.audioUrl.filename ?? "audio.mp3",
          mimeType:  "audio/mpeg",
          isFinal:   input.audioUrl.isFinal ?? true,
        },
      })
    }

    // ── Scenes: delete and recreate (simple replace) ──
    if (input.scenes !== undefined) {
      await prisma.scene.deleteMany({ where: { projectId: id } })
      if (input.scenes.length > 0) {
        await prisma.scene.createMany({
          data: input.scenes.map((s) => ({
            projectId:     id,
            order:         s.order,
            lyricExcerpt:  s.lyricExcerpt ?? "",
            description:   s.description,
            prompt:        s.prompt,
            negativePrompt:s.negativePrompt,
            aspectRatio:   s.aspectRatio ?? "16:9",
            style:         s.style,
            textOverlay:   s.textOverlay,
            status:        s.imageUrl ? "COMPLETED" : (s.status ?? "PENDING"),
          })),
        })

        // Upsert image media assets for completed scenes
        for (const scene of input.scenes) {
          if (scene.imageUrl) {
            const dbScene = await prisma.scene.findFirst({
              where: { projectId: id, order: scene.order },
            })
            if (dbScene) {
              const asset = await prisma.mediaAsset.create({
                data: {
                  projectId: id,
                  type:      "IMAGE",
                  url:       scene.imageUrl,
                  filename:  `scene-${String(scene.order).padStart(2, "0")}.jpg`,
                  mimeType:  "image/jpeg",
                  isFinal:   true,
                },
              })
              await prisma.scene.update({
                where: { id: dbScene.id },
                data:  { selectedAssetId: asset.id },
              })
            }
          }
        }
      }
    }

    return NextResponse.json(project)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── DELETE /api/projects/[id] ──────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete project"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
