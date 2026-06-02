import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const album = await prisma.album.findUnique({
      where:   { id },
      include: { tracks: { orderBy: { order: "asc" } } },
    })
    if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(album)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch album" }, { status: 500 })
  }
}

const patchSchema = z.object({
  title:       z.string().optional(),
  theme:       z.string().optional(),
  genre:       z.string().optional(),
  mood:        z.string().optional(),
  language:    z.string().optional(),
  stylePrompt: z.string().optional(),
  status:      z.enum(["DRAFT", "GENERATING", "COMPLETED"]).optional(),
  coverImageUrl: z.string().optional(),
  // Patch a single track
  track: z.object({
    id:           z.string(),
    audioUrl:     z.string().optional(),
    audioJobId:   z.string().optional(),
    duration:     z.number().optional(),
    status:       z.enum(["PENDING", "GENERATING", "COMPLETED", "FAILED"]).optional(),
    lyrics:       z.string().optional(),
    stylePrompt:  z.string().optional(),
    thumbnailUrl: z.string().optional(),
  }).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body  = await req.json()
    const input = patchSchema.parse(body)

    // Update album base fields
    const albumData: Record<string, unknown> = {}
    if (input.title)        albumData.title        = input.title
    if (input.theme)        albumData.theme        = input.theme
    if (input.genre)        albumData.genre        = input.genre
    if (input.mood)         albumData.mood         = input.mood
    if (input.language)     albumData.language     = input.language
    if (input.stylePrompt)  albumData.stylePrompt  = input.stylePrompt
    if (input.status)       albumData.status       = input.status
    if (input.coverImageUrl)albumData.coverImageUrl= input.coverImageUrl

    const album = await prisma.album.update({ where: { id }, data: albumData })

    // Update single track if provided
    if (input.track) {
      const trackData: Record<string, unknown> = {}
      const t = input.track
      if (t.audioUrl    !== undefined) trackData.audioUrl    = t.audioUrl
      if (t.audioJobId  !== undefined) trackData.audioJobId  = t.audioJobId
      if (t.duration    !== undefined) trackData.duration    = t.duration
      if (t.status      !== undefined) trackData.status      = t.status
      if (t.lyrics      !== undefined) trackData.lyrics      = t.lyrics
      if (t.stylePrompt !== undefined) trackData.stylePrompt = t.stylePrompt
      if (t.thumbnailUrl!== undefined) trackData.thumbnailUrl= t.thumbnailUrl

      await prisma.albumTrack.update({ where: { id: t.id }, data: trackData })
    }

    // Auto-update album status based on tracks
    const tracks = await prisma.albumTrack.findMany({ where: { albumId: id } })
    const allDone = tracks.length > 0 && tracks.every((t) => t.status === "COMPLETED")
    const anyGen  = tracks.some((t) => t.status === "GENERATING")
    if (allDone) {
      await prisma.album.update({ where: { id }, data: { status: "COMPLETED" } })
    } else if (anyGen) {
      await prisma.album.update({ where: { id }, data: { status: "GENERATING" } })
    }

    return NextResponse.json(album)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update album"
    console.error("[Album PATCH]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await prisma.album.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete album" }, { status: 500 })
  }
}
