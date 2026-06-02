import Link from "next/link"
import {
  Music2, Image as ImageIcon, Video, FolderOpen,
  TrendingUp, Plus, ArrowRight, Clock, CheckCircle2,
  AlertCircle, Loader2, Sparkles, DollarSign, Disc3,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/db"
import { formatDistanceToNow } from "date-fns"

async function getOrCreateUser() {
  const email = "default@musicstudio.local"
  return prisma.user.upsert({
    where: { email },
    create: { email, name: "Default User" },
    update: {},
  })
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  COMPLETED:   { label: "Completed",   className: "bg-teal-500/15 text-teal-400 border-teal-500/20" },
  IN_PROGRESS: { label: "In Progress", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  DRAFT:       { label: "Draft",       className: "bg-secondary text-muted-foreground border-border" },
  FAILED:      { label: "Failed",      className: "bg-red-500/15 text-red-400 border-red-500/20" },
}

const JOB_TYPE_CFG: Record<string, { label: string; color: string; icon: string }> = {
  MUSIC:        { label: "Music",   color: "bg-teal-500/15 text-teal-400",    icon: "music" },
  IMAGE:        { label: "Image",   color: "bg-sky-500/15 text-sky-400",      icon: "image" },
  LYRICS:       { label: "Lyrics",  color: "bg-violet-500/15 text-violet-400",icon: "sparkles" },
  VIDEO:        { label: "Video",   color: "bg-pink-500/15 text-pink-400",    icon: "video" },
  SONG_BRIEF:   { label: "Brief",   color: "bg-orange-500/15 text-orange-400",icon: "sparkles" },
  SCENE_PROMPTS:{ label: "Scenes",  color: "bg-indigo-500/15 text-indigo-400",icon: "sparkles" },
  ASSET_PACK:   { label: "Pack",    color: "bg-yellow-500/15 text-yellow-400",icon: "sparkles" },
}

export default async function DashboardPage() {
  const user = await getOrCreateUser()
  const userId = user.id
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  // ── Parallel DB queries ────────────────────────────────────────────────────
  const [
    projectCount, projectWeekCount,
    songJobCount, songJobWeekCount,
    albumTrackCount, albumTrackWeekCount,
    imageJobCount, imageJobWeekCount,
    videoJobCount, videoJobWeekCount,
    recentProjects,
    recentJobs,
    costByType,
    costTotal,
    recentAlbums,
  ] = await Promise.all([
    // Projects
    prisma.project.count({ where: { userId } }),
    prisma.project.count({ where: { userId, createdAt: { gte: weekAgo } } }),

    // Music jobs (projects)
    prisma.generationJob.count({ where: { project: { userId }, type: "MUSIC", status: "COMPLETED" } }),
    prisma.generationJob.count({ where: { project: { userId }, type: "MUSIC", status: "COMPLETED", createdAt: { gte: weekAgo } } }),

    // Album completed tracks
    prisma.albumTrack.count({ where: { album: { userId }, status: "COMPLETED" } }),
    prisma.albumTrack.count({ where: { album: { userId }, status: "COMPLETED", createdAt: { gte: weekAgo } } }),

    // Image jobs
    prisma.generationJob.count({ where: { project: { userId }, type: "IMAGE", status: "COMPLETED" } }),
    prisma.generationJob.count({ where: { project: { userId }, type: "IMAGE", status: "COMPLETED", createdAt: { gte: weekAgo } } }),

    // Video jobs
    prisma.generationJob.count({ where: { project: { userId }, type: "VIDEO", status: "COMPLETED" } }),
    prisma.generationJob.count({ where: { project: { userId }, type: "VIDEO", status: "COMPLETED", createdAt: { gte: weekAgo } } }),

    // Recent 4 projects
    prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        generationJobs: { select: { type: true, status: true } },
        mediaAssets:    { select: { type: true } },
      },
    }),

    // Recent 8 generation jobs across all projects
    prisma.generationJob.findMany({
      where:   { project: { userId } },
      orderBy: { createdAt: "desc" },
      take:    8,
      include: { project: { select: { id: true, title: true } } },
    }),

    // Cost grouped by operationType for current month
    prisma.costEvent.groupBy({
      by:     ["operationType"],
      where:  { project: { userId }, createdAt: { gte: monthStart } },
      _sum:   { estimatedCost: true },
    }),

    // Total cost this month
    prisma.costEvent.aggregate({
      where: { project: { userId }, createdAt: { gte: monthStart } },
      _sum:  { estimatedCost: true },
    }),

    // Recent albums (for context)
    prisma.album.count({ where: { userId } }),
  ])

  const totalSongs  = songJobCount + albumTrackCount
  const weekSongs   = songJobWeekCount + albumTrackWeekCount
  const totalImages = imageJobCount
  const weekImages  = imageJobWeekCount
  const totalVideos = videoJobCount
  const weekVideos  = videoJobWeekCount
  const totalProjects = projectCount + (recentAlbums as number)

  const monthlyTotal = costTotal._sum.estimatedCost ?? 0

  // Map cost by category
  const costMap: Record<string, number> = {}
  for (const row of costByType) {
    costMap[row.operationType] = (costMap[row.operationType] ?? 0) + (row._sum.estimatedCost ?? 0)
  }
  const musicCost  = costMap["music"]  ?? 0
  const imageCost  = costMap["image"]  ?? 0
  const textCost   = (costMap["lyrics"] ?? 0) + (costMap["brief"] ?? 0) + (costMap["scene_prompts"] ?? 0)
  const videoCost  = costMap["video"]  ?? 0

  const stats = [
    { label: "Projects",        value: String(totalProjects), icon: FolderOpen, change: `+${projectCount} this week`,  color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
    { label: "Songs Generated", value: String(totalSongs),    icon: Music2,     change: `+${weekSongs} this week`,     color: "text-teal-400",   bg: "bg-teal-500/10",   border: "border-teal-500/20" },
    { label: "Images Created",  value: String(totalImages),   icon: ImageIcon,  change: `+${weekImages} this week`,    color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/20" },
    { label: "Videos Made",     value: String(totalVideos),   icon: Video,      change: `+${weekVideos} this week`,    color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/20" },
  ]

  const costBreakdown = [
    { label: "Music",    value: musicCost,  color: "bg-teal-500" },
    { label: "Images",   value: imageCost,  color: "bg-violet-500" },
    { label: "AI Text",  value: textCost,   color: "bg-sky-500" },
    { label: "Video",    value: videoCost,  color: "bg-pink-500" },
  ].filter((c) => c.value > 0 || monthlyTotal === 0)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your creative studio overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/albums/create">
            <Button variant="outline" className="gap-2 border-violet-500/30 hover:border-violet-500/50">
              <Disc3 className="h-4 w-4 text-violet-400" />New Album
            </Button>
          </Link>
          <Link href="/create">
            <Button className="bg-teal-500 hover:bg-teal-400 text-background font-semibold gap-2 shadow-lg shadow-teal-500/20">
              <Plus className="h-4 w-4" />New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className={`border ${stat.border} hover:shadow-lg transition-shadow`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-teal-400" />
                      {stat.change}
                    </p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent projects */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent Projects</h2>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground h-7 text-xs">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {recentProjects.length === 0 ? (
              <Card className="border-dashed border-teal-500/20">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">No projects yet — create your first song!</p>
                  <Link href="/create">
                    <Button size="sm" className="mt-3 gap-2 bg-teal-500 hover:bg-teal-400 text-background">
                      <Plus className="h-3.5 w-3.5" />Create Song
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              recentProjects.map((p) => {
                const status = STATUS_MAP[p.status] ?? STATUS_MAP.DRAFT
                const hasMusic  = p.generationJobs.some((j) => j.type === "MUSIC" && j.status === "COMPLETED")
                const imgCount  = p.mediaAssets.filter((a) => a.type === "IMAGE").length
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <Card className="hover:border-teal-500/30 transition-all hover:-translate-y-px cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                            <Music2 className="h-4 w-4 text-teal-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{p.title}</p>
                              <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.className}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              {p.genre && <span>{p.genre}</span>}
                              {p.genre && <span className="text-border">·</span>}
                              <Clock className="h-3 w-3" />
                              <span>{formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasMusic && (
                              <div className="h-5 w-5 rounded bg-teal-500/15 flex items-center justify-center" title="Has audio">
                                <Music2 className="h-3 w-3 text-teal-400" />
                              </div>
                            )}
                            {imgCount > 0 && (
                              <div className="h-5 w-5 rounded bg-sky-500/15 flex items-center justify-center" title={`${imgCount} images`}>
                                <ImageIcon className="h-3 w-3 text-sky-400" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Cost summary */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-teal-400" />
                Cost This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-1">
                <p className="text-4xl font-bold tracking-tight text-gradient">
                  ${monthlyTotal.toFixed(2)}
                </p>
                {monthlyTotal === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No costs recorded yet</p>
                )}
              </div>
              {monthlyTotal > 0 && (
                <div className="space-y-2.5">
                  {costBreakdown.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">${item.value.toFixed(3)}</span>
                      </div>
                      <div className="h-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${monthlyTotal > 0 ? (item.value / monthlyTotal) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Link href="/create">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 border-teal-500/20 hover:border-teal-500/40 hover:bg-teal-500/5 text-xs h-8">
                  <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                  Create New Song
                </Button>
              </Link>
              <Link href="/albums/create">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/5 text-xs h-8">
                  <Disc3 className="h-3.5 w-3.5 text-violet-400" />
                  Create Album
                </Button>
              </Link>
              <Link href="/projects">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8">
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  Browse Projects
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8">
                  <Music2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Configure APIs
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent generations */}
      <div>
        <h2 className="font-semibold mb-3">Recent Generations</h2>
        <Card className="border-border/60">
          {recentJobs.length === 0 ? (
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No generation jobs yet — create a project to get started.
            </CardContent>
          ) : (
            <CardContent className="p-0 divide-y divide-border/50">
              {recentJobs.map((job) => {
                const cfg = JOB_TYPE_CFG[job.type] ?? JOB_TYPE_CFG.LYRICS
                return (
                  <Link key={job.id} href={`/projects/${job.project.id}`}>
                    <div className="flex items-center gap-4 px-4 py-3 text-sm hover:bg-secondary/30 transition-colors cursor-pointer">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color.split(" ")[0]}`}>
                        {job.type === "MUSIC"  ? <Music2    className={`h-3.5 w-3.5 ${cfg.color.split(" ")[1]}`} /> :
                         job.type === "IMAGE"  ? <ImageIcon className={`h-3.5 w-3.5 ${cfg.color.split(" ")[1]}`} /> :
                         job.type === "VIDEO"  ? <Video     className={`h-3.5 w-3.5 ${cfg.color.split(" ")[1]}`} /> :
                         <Sparkles className={`h-3.5 w-3.5 ${cfg.color.split(" ")[1]}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {cfg.label} · {job.project.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.model ?? job.provider} · {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {(job.actualCost ?? job.costEstimate) != null && (
                          <span className="text-xs text-muted-foreground">
                            ${((job.actualCost ?? job.costEstimate) as number).toFixed(3)}
                          </span>
                        )}
                        {job.status === "COMPLETED"  && <CheckCircle2 className="h-4 w-4 text-teal-400" />}
                        {job.status === "PROCESSING" && <Loader2      className="h-4 w-4 text-amber-400 animate-spin" />}
                        {job.status === "FAILED"     && <AlertCircle  className="h-4 w-4 text-red-400" />}
                        {job.status === "QUEUED"     && <Clock        className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
