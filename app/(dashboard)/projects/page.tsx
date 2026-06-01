import Link from "next/link"
import {
  Plus, Music2, Image as ImageIcon, Video,
  Clock, FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/db"
import { formatDistanceToNow } from "date-fns"

const STATUS_STYLE: Record<string, string> = {
  COMPLETED:   "bg-teal-500/15 text-teal-400 border-teal-500/30",
  IN_PROGRESS: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DRAFT:       "bg-secondary text-muted-foreground border-border/60",
  FAILED:      "bg-destructive/15 text-destructive border-destructive/30",
}
const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completed", IN_PROGRESS: "In Progress", DRAFT: "Draft", FAILED: "Failed",
}

export const dynamic = "force-dynamic"

async function getOrCreateUser() {
  const user = await prisma.user.upsert({
    where:  { email: "default@musicstudio.local" },
    update: {},
    create: { email: "default@musicstudio.local", name: "Studio User" },
    select: { id: true },
  })
  return user.id
}

export default async function ProjectsPage() {
  const userId = await getOrCreateUser()
  const projects = await prisma.project.findMany({
    where:   { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      mediaAssets: {
        where:   { isFinal: true },
        orderBy: { createdAt: "desc" },
        take:    10,
      },
      scenes:  { where: { status: "COMPLETED" }, select: { id: true, selectedAssetId: true } },
      _count:  { select: { scenes: true } },
    },
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/create">
          <Button variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* New project card */}
        <Link href="/create">
          <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer border-dashed h-full min-h-[280px] flex items-center justify-center">
            <CardContent className="text-center p-6">
              <div className="w-12 h-12 rounded-xl gradient-brand-soft flex items-center justify-center mx-auto mb-3">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">Create New Project</p>
              <p className="text-sm text-muted-foreground mt-1">Start from a song idea</p>
            </CardContent>
          </Card>
        </Link>

        {projects.map((project) => {
          const audio  = project.mediaAssets.find((a) => a.type === "AUDIO")
          const images = project.mediaAssets.filter((a) => a.type === "IMAGE")
          const video  = project.mediaAssets.find((a) => a.type === "VIDEO")
          const thumb  = images[0]?.url

          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer overflow-hidden">
                <div className="aspect-video bg-secondary/40 relative">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={project.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_STYLE[project.status]}`}>
                      {STATUS_LABEL[project.status]}
                    </span>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold truncate">{project.title}</h3>
                  {project.originalPrompt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{project.originalPrompt}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {project.genre && <Badge variant="outline" className="text-[10px]">{project.genre}</Badge>}
                    {project.mood  && <Badge variant="outline" className="text-[10px]">{project.mood}</Badge>}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-1.5">
                      {audio && (
                        <div className="h-5 w-5 rounded bg-pink-500/10 flex items-center justify-center">
                          <Music2 className="h-3 w-3 text-pink-500" />
                        </div>
                      )}
                      {images.length > 0 && (
                        <div className="h-5 w-5 rounded bg-blue-500/10 flex items-center justify-center">
                          <ImageIcon className="h-3 w-3 text-blue-500" />
                        </div>
                      )}
                      {video && (
                        <div className="h-5 w-5 rounded bg-teal-500/10 flex items-center justify-center">
                          <Video className="h-3 w-3 text-teal-500" />
                        </div>
                      )}
                      {images.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{images.length} img</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="text-center py-20">
          <FolderOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No projects yet</h3>
          <p className="text-muted-foreground mt-1">Create your first song project to get started</p>
          <Link href="/create" className="mt-4 inline-block">
            <Button variant="gradient" className="gap-2 mt-4">
              <Plus className="h-4 w-4" />
              Create First Project
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
