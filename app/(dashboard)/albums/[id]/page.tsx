import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { AlbumDetail } from "@/components/album/album-detail"
import { ChevronLeft } from "lucide-react"

type Params = { params: Promise<{ id: string }> }

export default async function AlbumDetailPage({ params }: Params) {
  const { id } = await params
  const album = await prisma.album.findUnique({
    where:   { id },
    include: { tracks: { orderBy: { order: "asc" } } },
  })
  if (!album) return notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/albums"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />Albums
      </Link>
      <AlbumDetail album={album as Parameters<typeof AlbumDetail>[0]["album"]} />
    </div>
  )
}
