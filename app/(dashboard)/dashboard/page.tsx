import Link from "next/link"
import {
  Music2, Image as ImageIcon, Video, FolderOpen,
  TrendingUp, Plus, ArrowRight, Clock, CheckCircle2,
  AlertCircle, Loader2, Sparkles, DollarSign,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const stats = [
  { label: "Projects", value: "12", icon: FolderOpen, change: "+2 this week", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  { label: "Songs Generated", value: "28", icon: Music2, change: "+5 this week", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" },
  { label: "Images Created", value: "147", icon: ImageIcon, change: "+32 this week", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  { label: "Videos Made", value: "8", icon: Video, change: "+1 this week", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
]

const recentProjects = [
  { id: "proj_1", title: "Hello Around the World", status: "COMPLETED", genre: "Children's Pop", createdAt: "2h ago", cost: "$0.48", hasMusic: true, imageCount: 6 },
  { id: "proj_2", title: "Summer Sunset Vibes", status: "IN_PROGRESS", genre: "Lo-fi", createdAt: "1d ago", cost: "$0.21", hasMusic: true, imageCount: 3 },
  { id: "proj_3", title: "Epic Gaming Anthem", status: "DRAFT", genre: "EDM", createdAt: "2d ago", cost: "$0.00", hasMusic: false, imageCount: 0 },
  { id: "proj_4", title: "Café Acoustic Morning", status: "COMPLETED", genre: "Acoustic Folk", createdAt: "3d ago", cost: "$0.35", hasMusic: true, imageCount: 5 },
]

const costBreakdown = [
  { label: "Music", value: 0.65, total: 1.04, color: "bg-teal-500" },
  { label: "Images", value: 0.32, total: 1.04, color: "bg-violet-500" },
  { label: "AI Text", value: 0.05, total: 1.04, color: "bg-sky-500" },
  { label: "Video", value: 0.02, total: 1.04, color: "bg-pink-500" },
]

const recentJobs = [
  { type: "Music", project: "Hello Around the World", status: "COMPLETED", model: "suno-v4", time: "2m ago", cost: "$0.05" },
  { type: "Image", project: "Hello Around the World", status: "COMPLETED", model: "flux-1.1-pro", time: "4m ago", cost: "$0.04" },
  { type: "Lyrics", project: "Summer Sunset Vibes", status: "COMPLETED", model: "gpt-4o-mini", time: "1d ago", cost: "$0.001" },
  { type: "Music", project: "Summer Sunset Vibes", status: "PROCESSING", model: "suno-v4", time: "1d ago", cost: "$0.05" },
  { type: "Image", project: "Summer Sunset Vibes", status: "FAILED", model: "flux-1.1-pro", time: "1d ago", cost: "$0.04" },
]

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Completed", className: "bg-teal-500/15 text-teal-400 border-teal-500/20" },
  IN_PROGRESS: { label: "In Progress", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  DRAFT: { label: "Draft", className: "bg-secondary text-muted-foreground border-border" },
  FAILED: { label: "Failed", className: "bg-red-500/15 text-red-400 border-red-500/20" },
}

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your creative studio overview</p>
        </div>
        <Link href="/create">
          <Button className="bg-teal-500 hover:bg-teal-400 text-background font-semibold gap-2 shadow-lg shadow-teal-500/20">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
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
            {recentProjects.map((p) => {
              const status = STATUS_MAP[p.status]
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
                            <span>{p.genre}</span>
                            <span className="text-border">·</span>
                            <Clock className="h-3 w-3" /><span>{p.createdAt}</span>
                            <span className="text-border">·</span>
                            <span>{p.cost}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.hasMusic && (
                            <div className="h-5 w-5 rounded bg-teal-500/15 flex items-center justify-center">
                              <Music2 className="h-3 w-3 text-teal-400" />
                            </div>
                          )}
                          {p.imageCount > 0 && (
                            <div className="h-5 w-5 rounded bg-sky-500/15 flex items-center justify-center">
                              <ImageIcon className="h-3 w-3 text-sky-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
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
                <p className="text-4xl font-bold tracking-tight text-gradient">$1.04</p>
                <p className="text-xs text-muted-foreground mt-1">Running in mock mode</p>
              </div>
              <div className="space-y-2.5">
                {costBreakdown.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">${item.value.toFixed(2)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${(item.value / item.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
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
          <CardContent className="p-0 divide-y divide-border/50">
            {recentJobs.map((job, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 text-sm hover:bg-secondary/30 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  job.type === "Music" ? "bg-teal-500/15" :
                  job.type === "Image" ? "bg-sky-500/15" : "bg-violet-500/15"
                }`}>
                  {job.type === "Music" ? <Music2 className="h-3.5 w-3.5 text-teal-400" /> :
                   job.type === "Image" ? <ImageIcon className="h-3.5 w-3.5 text-sky-400" /> :
                   <Sparkles className="h-3.5 w-3.5 text-violet-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{job.type} · {job.project}</p>
                  <p className="text-xs text-muted-foreground">{job.model} · {job.time}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{job.cost}</span>
                  {job.status === "COMPLETED" && <CheckCircle2 className="h-4 w-4 text-teal-400" />}
                  {job.status === "PROCESSING" && <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />}
                  {job.status === "FAILED" && <AlertCircle className="h-4 w-4 text-red-400" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
