import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { getOrCreateUserId } from "@/lib/user"

const createSchema = z.object({
  title:       z.string(),
  theme:       z.string().optional(),
  genre:       z.string().optional(),
  mood:        z.string().optional(),
  language:    z.string().optional().default("en"),
  stylePrompt: z.string().optional(),
  tracks: z.array(z.object({
    order:       z.number(),
    title:       z.string(),
    description: z.string().optional(),
    lyrics:      z.string().optional(),
    stylePrompt: z.string().optional(),
  })).optional(),
})

export async function GET() {
  try {
    const userId = await getOrCreateUserId()
    const albums = await prisma.album.findMany({
      where:   { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        tracks: { orderBy: { order: "asc" } },
        _count: { select: { tracks: true } },
      },
    })
    return NextResponse.json(albums)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch albums"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getOrCreateUserId()
    const body   = await req.json()
    const input  = createSchema.parse(body)

    const album = await prisma.album.create({
      data: {
        userId,
        title:       input.title,
        theme:       input.theme,
        genre:       input.genre,
        mood:        input.mood,
        language:    input.language,
        stylePrompt: input.stylePrompt,
        status:      "DRAFT",
        tracks: input.tracks?.length
          ? {
              create: input.tracks.map((t) => ({
                order:       t.order,
                title:       t.title,
                description: t.description,
                lyrics:      t.lyrics,
                stylePrompt: t.stylePrompt,
                status:      "PENDING",
              })),
            }
          : undefined,
      },
      include: { tracks: { orderBy: { order: "asc" } } },
    })
    revalidatePath("/albums")
    revalidatePath(`/albums/${album.id}`)

    return NextResponse.json(album, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create album"
    console.error("[Albums POST]", message, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
