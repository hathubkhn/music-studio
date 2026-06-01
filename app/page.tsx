import Link from "next/link"
import {
  Music2, Sparkles, Image as ImageIcon, Video,
  Download, ArrowRight, CheckCircle2, Mic2, Palette,
  Wand2, Zap, Play, Star, Globe2, Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Sparkles, title: "AI Lyrics Generation",
    desc: "Structured lyrics with verse-chorus-bridge in any language, instantly.",
    gradient: "from-violet-500/20 to-purple-500/10",
    iconColor: "text-violet-400",
  },
  {
    icon: Music2, title: "Suno Style Prompts",
    desc: "Optimized prompts for Suno with genre, tempo, and vocal description.",
    gradient: "from-teal-500/20 to-cyan-500/10",
    iconColor: "text-teal-400",
  },
  {
    icon: Palette, title: "Visual Storyboard",
    desc: "Scene-by-scene image prompts that build a cohesive visual story.",
    gradient: "from-sky-500/20 to-blue-500/10",
    iconColor: "text-sky-400",
  },
  {
    icon: ImageIcon, title: "Image Generation",
    desc: "Stunning scene images via Kie.ai Flux model — one per lyric section.",
    gradient: "from-pink-500/20 to-rose-500/10",
    iconColor: "text-pink-400",
  },
  {
    icon: Mic2, title: "Music Generation",
    desc: "Full songs with vocals and production through Kie.ai Suno API.",
    gradient: "from-amber-500/20 to-orange-500/10",
    iconColor: "text-amber-400",
  },
  {
    icon: Download, title: "CapCut Asset Pack",
    desc: "One ZIP — audio, images, lyrics, and a step-by-step editing guide.",
    gradient: "from-emerald-500/20 to-green-500/10",
    iconColor: "text-emerald-400",
  },
]

const steps = [
  { n: "01", title: "Describe your song", desc: "One prompt is all it takes. Add mood, genre, and audience." },
  { n: "02", title: "Review & edit", desc: "AI drafts lyrics, style prompts, and scene plans — all editable." },
  { n: "03", title: "Generate assets", desc: "Music, images, and storyboard created with one click." },
  { n: "04", title: "Download & edit", desc: "Get a CapCut-ready pack with everything bundled." },
]

const audienceItems = [
  { icon: "🎓", label: "Teachers" },
  { icon: "📱", label: "Creators" },
  { icon: "🏢", label: "Marketers" },
  { icon: "🎵", label: "Musicians" },
  { icon: "✈️", label: "Travel" },
  { icon: "👶", label: "Kids Content" },
  { icon: "🎨", label: "Artists" },
  { icon: "🛍️", label: "Businesses" },
]

/* Animated waveform bars */
function WaveBars() {
  return (
    <div className="flex items-end gap-0.5 h-8">
      {[3, 5, 7, 5, 8, 4, 6, 8, 5, 7, 4, 6, 8, 5, 3].map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-teal-400 opacity-80 wave-bar"
          style={{
            height: `${h * 4}px`,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 shadow-lg shadow-teal-500/30">
              <Music2 className="h-4 w-4 text-background" />
            </div>
            <span className="font-semibold tracking-tight text-sm">MusicStudio AI</span>
            <Badge variant="outline" className="text-[10px] border-teal-500/40 text-teal-400 hidden sm:flex">
              Beta
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Button>
            </Link>
            <Link href="/create">
              <Button
                size="sm"
                className="bg-teal-500 hover:bg-teal-400 text-background font-semibold gap-1.5 shadow-lg shadow-teal-500/25 transition-all hover:shadow-teal-400/35"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-28 px-6 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-teal-500/8 blur-[120px]" />
          <div className="absolute top-20 left-1/4 w-[400px] h-[300px] rounded-full bg-violet-600/8 blur-[100px]" />
          <div className="absolute top-10 right-1/4 w-[300px] h-[250px] rounded-full bg-cyan-500/6 blur-[80px]" />
        </div>
        {/* Grid */}
        <div className="absolute inset-0 -z-10 bg-grid opacity-40" />

        <div className="container mx-auto text-center max-w-4xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/8 text-teal-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Powered by Kie.ai + OpenAI
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Create any song{" "}
            <span className="text-gradient">from a single</span>
            <br />
            <span className="text-gradient">idea.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Turn a text prompt into studio-ready lyrics, Suno music, scene images, and a complete
            CapCut-ready video asset pack — in minutes.
          </p>

          {/* Waveform animation */}
          <div className="flex justify-center mb-10">
            <WaveBars />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/create">
              <Button
                size="lg"
                className="bg-teal-500 hover:bg-teal-400 text-background font-semibold gap-2 px-8 h-12 text-base shadow-xl shadow-teal-500/25 hover:shadow-teal-400/40 transition-all animate-pulse-glow"
              >
                <Sparkles className="h-5 w-5" />
                Start Creating
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 px-8 h-12 text-base border-border/60 hover:border-teal-500/40 hover:bg-teal-500/5"
              >
                <Play className="h-4 w-4" />
                View Demo
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-5 justify-center mt-10 text-sm text-muted-foreground">
            {[
              { icon: CheckCircle2, text: "No design skills needed" },
              { icon: Globe2, text: "Any language" },
              { icon: Shield, text: "Mock mode — zero cost" },
              { icon: Star, text: "CapCut-ready output" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-1.5">
                <item.icon className="h-3.5 w-3.5 text-teal-400" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="py-12 border-y border-border/40">
        <div className="container mx-auto px-6">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-6">
            Built for every kind of creator
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {audienceItems.map((a) => (
              <div
                key={a.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/60 text-sm text-muted-foreground hover:border-teal-500/40 hover:text-foreground transition-colors"
              >
                <span>{a.icon}</span>
                {a.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-400 mb-3">Workflow</p>
            <h2 className="text-4xl font-bold mb-4">From idea to asset pack in 4 steps</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A guided wizard keeps you in control while AI handles the heavy lifting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <div key={step.n} className="relative group">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-full w-full h-px bg-gradient-to-r from-border to-transparent z-0" />
                )}
                <div className="relative z-10 p-5 rounded-xl bg-card border border-border/60 hover:border-teal-500/40 transition-all hover:-translate-y-0.5">
                  <div className="text-3xl font-black text-gradient mb-3 leading-none">{step.n}</div>
                  <p className="font-semibold mb-1 text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 border-t border-border/40">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-400 mb-3">Features</p>
            <h2 className="text-4xl font-bold mb-4">Everything in one studio</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              One platform to go from idea to published music video.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="group p-5 rounded-xl bg-card border border-border/60 hover:border-teal-500/30 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/5"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                    <Icon className={`h-5 w-5 ${f.iconColor}`} />
                  </div>
                  <p className="font-semibold mb-1.5 text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-background to-violet-500/10 p-12 text-center">
            {/* Decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-teal-500/15 blur-3xl rounded-full" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-6">
                <WaveBars />
              </div>
              <h2 className="text-4xl font-bold mb-4">
                Ready to create your first song?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Fully functional in mock mode — no API keys required to explore the complete workflow.
              </p>
              <Link href="/create">
                <Button
                  size="lg"
                  className="bg-teal-500 hover:bg-teal-400 text-background font-semibold gap-2 px-10 h-12 text-base shadow-xl shadow-teal-500/25"
                >
                  <Sparkles className="h-5 w-5" />
                  Start Creating Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-10 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-500">
              <Music2 className="h-3 w-3 text-background" />
            </div>
            <span className="font-medium text-foreground/70">MusicStudio AI</span>
            <span className="text-border">·</span>
            <span>Powered by Kie.ai + OpenAI</span>
          </div>
          <div className="flex gap-6">
            {["Dashboard", "Create", "Projects", "Settings"].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                className="hover:text-foreground transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
          <p>© 2026 MusicStudio AI · For creative use only</p>
        </div>
      </footer>

    </div>
  )
}
