import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const scores = await prisma.songScore.findMany({
      where: { songId: id },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(scores)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch scores"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
