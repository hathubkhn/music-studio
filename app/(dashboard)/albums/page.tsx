import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Disc3, Music2, CheckCircle2, Loader2, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

async function getOrCreateUser() {
  const email = "default@musicstudio.local"
  const user = await prisma.user.upsert({
    where: { email }, create: { email, name: "Default User" }, update: {},
  })
  return user.id
}

const STATUS_CFG = {
  DRAFT:      { label: "Draft",      color: "bg-muted text-muted-foreground" },
  GENERATING: { label: "Generating", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  COMPLETED:  { label: "Completed",  color: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
}

export default async function AlbumsPage() {
  const userId = await getOrCreateUser()
  const albums = await prisma.album.findMany({
    where:   { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      tracks: { orderBy: { order: "asc" } },
      _count: { select: { tracks: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Albums</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Multi-track collections — generate cohesive song sets for long-form video
          </p>
        </div>
        <Link href="/albums/create">
          <Button variant="gradient" className="gap-2">
            <Plus className="w-4 h-4" />New Album
          </Button>
        </Link>
      </div>

      {albums.length === 0 ? (
        <Card className="border-dashed border-violet-500/20">
          <CardContent className="p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Disc3 className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-lg">No albums yet</p>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                Create your first album — AI generates a full set of cohesive songs around your theme
              </p>
            </div>
            <Link href="/albums/create">
              <Button variant="gradient" className="gap-2">
                <Plus className="w-4 h-4" />Create First Album
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {albums.map((album) => {
            const cfg = STATUS_CFG[album.status]
            const completedTracks = album.tracks.filter((t) => t.status === "COMPLETED").length
            const totalTracks = album._count.tracks

            return (
              <Link key={album.id} href={`/albums/${album.id}`}>
                <Card className="border-border/60 hover:border-violet-500/30 hover:shadow-md transition-all cursor-pointer group h-full">
                  <CardContent className="p-5 space-y-4 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                        <Disc3 className="w-5 h-5 text-violet-400" />
                      </div>
                      <Badge className={cfg.color}>{cfg.label}</Badge>
                    </div>

                    {/* Title */}
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-violet-400 transition-colors line-clamp-1">
                        {album.title}
                      </h3>
                      {album.theme && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{album.theme}</p>
                      )}
                    </div>

                    {/* Tracks progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Music2 className="w-3 h-3" />{totalTracks} tracks
                        </span>
                        {album.status === "GENERATING" ? (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Loader2 className="w-3 h-3 animate-spin" />{completedTracks}/{totalTracks}
                          </span>
                        ) : album.status === "COMPLETED" ? (
                          <span className="flex items-center gap-1 text-teal-400">
                            <CheckCircle2 className="w-3 h-3" />{completedTracks}/{totalTracks}
                          </span>
                        ) : null}
                      </div>
                      {totalTracks > 0 && (
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full transition-all"
                            style={{ width: `${(completedTracks / totalTracks) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {album.genre && <span>{album.genre}</span>}
                      {album.mood  && <><span>·</span><span>{album.mood}</span></>}
                      <span className="ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(album.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
