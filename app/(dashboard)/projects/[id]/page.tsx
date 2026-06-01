import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft, Music2, Image as ImageIcon, Video,
  Download, Edit3, Clock, DollarSign, FileText, CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { prisma } from "@/lib/db"
import { formatDistanceToNow } from "date-fns"

export const dynamic = "force-dynamic"

const STATUS_STYLE: Record<string, string> = {
  COMPLETED:   "bg-teal-500/15 text-teal-400 border-teal-500/30",
  IN_PROGRESS: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DRAFT:       "bg-secondary text-muted-foreground border-border/60",
  FAILED:      "bg-destructive/15 text-destructive border-destructive/30",
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where:   { id },
    include: {
      lyricsVersions: { where: { isFinal: true }, take: 1 },
      mediaAssets:    { orderBy: { createdAt: "desc" } },
      scenes:         { orderBy: { order: "asc" }, include: { selectedAsset: true } },
      generationJobs: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  })

  if (!project) notFound()

  const finalLyrics  = project.lyricsVersions[0]
  const audioAsset   = project.mediaAssets.find((a) => a.type === "AUDIO" && a.isFinal)
  const imageAssets  = project.mediaAssets.filter((a) => a.type === "IMAGE")
  const videoAsset   = project.mediaAssets.find((a) => a.type === "VIDEO")
  const completedScenes = project.scenes.filter((s) => s.status === "COMPLETED")

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-2 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Projects
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          {project.originalPrompt && (
            <p className="text-muted-foreground text-sm mt-1 line-clamp-1">
              &ldquo;{project.originalPrompt}&rdquo;
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_STYLE[project.status]}`}>
            {project.status.replace("_", " ")}
          </span>
          <Link href={`/create?projectId=${id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Edit3 className="h-3.5 w-3.5" />
              Continue Editing
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: Music2,
            label: "Music",
            value: audioAsset ? "1 track" : "Not generated",
            color: "text-pink-500",
            bg: "bg-pink-500/10",
          },
          {
            icon: ImageIcon,
            label: "Images",
            value: `${completedScenes.length} scene${completedScenes.length !== 1 ? "s" : ""}`,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            icon: DollarSign,
            label: "Total Cost",
            value: project.generationJobs.reduce((s, j) => s + (j.actualCost ?? j.costEstimate ?? 0), 0) > 0
              ? `$${project.generationJobs.reduce((s, j) => s + (j.actualCost ?? j.costEstimate ?? 0), 0).toFixed(3)}`
              : "—",
            color: "text-teal-500",
            bg: "bg-teal-500/10",
          },
          {
            icon: Clock,
            label: "Updated",
            value: formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true }),
            color: "text-violet-500",
            bg: "bg-violet-500/10",
          },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-sm font-semibold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
          <TabsTrigger value="images">Images ({completedScenes.length})</TabsTrigger>
          <TabsTrigger value="jobs">Jobs ({project.generationJobs.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Audio player */}
          {audioAsset ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Music2 className="h-4 w-4 text-pink-500" />
                  Generated Audio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls className="w-full" src={audioAsset.url} />
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-sm font-medium">{project.title}</p>
                    {finalLyrics?.stylePrompt && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{finalLyrics.stylePrompt}</p>
                    )}
                  </div>
                  <a href={audioAsset.url} download={`${project.title}.mp3`}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <Music2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                No audio generated yet
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Song Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {[
                  ["Genre",    project.genre],
                  ["Mood",     project.mood],
                  ["Language", project.targetLanguage],
                  ["Audience", project.audience],
                  ["Duration", project.durationTarget],
                  ["Vocal",    project.vocalPreference],
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Scene thumbnails */}
          {completedScenes.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-3">
                Scene Images ({completedScenes.length})
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {completedScenes.map((scene) => {
                  const imgUrl = scene.selectedAsset?.url
                  return (
                    <div key={scene.id} className="relative aspect-video rounded-lg overflow-hidden bg-secondary/40">
                      {imgUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgUrl} alt={`Scene ${scene.order}`} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute top-1 left-1 text-[10px] font-bold text-white bg-black/50 rounded px-1">
                        {scene.order}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Lyrics */}
        <TabsContent value="lyrics" className="mt-4 space-y-4">
          {finalLyrics ? (
            <>
              <Card>
                <CardContent className="p-5">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-foreground leading-relaxed">
                    {finalLyrics.lyrics}
                  </pre>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Style Prompt (for Suno)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-3 rounded-lg bg-muted/50 font-mono text-sm">
                    {finalLyrics.stylePrompt}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                No lyrics saved yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Images */}
        <TabsContent value="images" className="mt-4">
          {completedScenes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {completedScenes.map((scene) => {
                const imgUrl = scene.selectedAsset?.url
                return (
                  <Card key={scene.id} className="overflow-hidden">
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgUrl} alt={`Scene ${scene.order}`} className="w-full aspect-video object-cover" />
                    ) : (
                      <div className="w-full aspect-video bg-secondary/40 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                    <CardContent className="p-3 flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">Scene {scene.order}</Badge>
                      {imgUrl && (
                        <a href={imgUrl} download={`scene-${String(scene.order).padStart(2, "0")}.jpg`} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                No images generated yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Jobs */}
        <TabsContent value="jobs" className="mt-4">
          {project.generationJobs.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {project.generationJobs.map((job) => (
                    <div key={job.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        {job.type === "MUSIC"  ? <Music2    className="h-4 w-4 text-pink-500"   /> :
                         job.type === "IMAGE"  ? <ImageIcon className="h-4 w-4 text-blue-500"   /> :
                         job.type === "VIDEO"  ? <Video     className="h-4 w-4 text-teal-500"   /> :
                         <FileText className="h-4 w-4 text-violet-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{job.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.model || job.provider} · {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {(job.actualCost ?? job.costEstimate) != null && (
                          <span className="text-xs text-muted-foreground">
                            ${((job.actualCost ?? job.costEstimate) ?? 0).toFixed(3)}
                          </span>
                        )}
                        <CheckCircle2 className={`h-4 w-4 ${
                          job.status === "COMPLETED" ? "text-teal-500" :
                          job.status === "FAILED"    ? "text-destructive" :
                          "text-muted-foreground"
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No generation jobs recorded yet
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
