"use client"

import { Sparkles, FolderOpen, Check, ArrowRight, Music2, Shuffle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export type FlowMode = "scratch" | "import" | "style-copy" | "mashup"

interface Props {
  onSelect: (mode: FlowMode) => void
}

const SCRATCH_FEATURES = [
  "Describe your idea in a sentence",
  "AI writes lyrics, style prompt & brief",
  "Generate music via Suno",
  "Auto-plan scenes & generate images",
]

const IMPORT_FEATURES = [
  "Paste or upload lyrics (.txt)",
  "Upload your own audio (MP3 / MP4 / WAV)",
  "Upload your own images — or skip to AI-generate",
  "AI fills in whatever you don't have",
]

const STYLE_COPY_FEATURES = [
  "Upload a reference song (MP3 / MP4 / WAV)",
  "Tag the style: genre, mood, instruments, tempo",
  "Write new lyrics — only the words change",
  "AI generates music matching the reference vibe",
]

const MASHUP_FEATURES = [
  "Upload two reference songs (MP3 / WAV / OGG …)",
  "AI blends both styles and melodies together",
  "Add your own lyrics or let AI write them",
  "Control blend strength, style weight & weirdness",
]

export function ModeSelector({ onSelect }: Props) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-muted-foreground">
          Choose how you want to start — you can mix and match assets at any step.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* From Scratch */}
        <Card
          className="cursor-pointer group border-border/60 hover:border-teal-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-teal-500/5"
          onClick={() => onSelect("scratch")}
        >
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                <Sparkles className="w-6 h-6 text-teal-400" />
              </div>
              <Badge variant="outline" className="border-teal-500/30 text-teal-400 text-xs">
                Recommended
              </Badge>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-1">From Scratch</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Describe your song idea and AI creates lyrics, music, and visuals for you.
              </p>
            </div>

            <ul className="space-y-1.5">
              {SCRATCH_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button className="w-full gradient-brand text-white font-semibold group-hover:opacity-95">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Creating
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Import & Remix */}
        <Card
          className="cursor-pointer group border-border/60 hover:border-violet-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/5"
          onClick={() => onSelect("import")}
        >
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <FolderOpen className="w-6 h-6 text-violet-400" />
              </div>
              <Badge variant="outline" className="border-violet-500/30 text-violet-400 text-xs">
                Flexible
              </Badge>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-1">Import & Remix</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Already have lyrics, audio, or images? Upload what you have — AI fills the gaps.
              </p>
            </div>

            <ul className="space-y-1.5">
              {IMPORT_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full border-violet-500/30 text-violet-300 hover:bg-violet-500/10 font-semibold group-hover:border-violet-500/50"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Import Assets
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Style Copy */}
        <Card
          className="cursor-pointer group border-border/60 hover:border-amber-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/5"
          onClick={() => onSelect("style-copy")}
        >
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <Music2 className="w-6 h-6 text-amber-400" />
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                Style Transfer
              </Badge>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-1">Copy Music Style</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Keep the vibe of a reference song, replace only the lyrics. Same feel, new words.
              </p>
            </div>

            <ul className="space-y-1.5">
              {STYLE_COPY_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10 font-semibold group-hover:border-amber-500/50"
            >
              <Music2 className="w-4 h-4 mr-2" />
              Copy a Style
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Mashup */}
        <Card
          className="cursor-pointer group border-border/60 hover:border-pink-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-pink-500/5"
          onClick={() => onSelect("mashup")}
        >
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                <Shuffle className="w-6 h-6 text-pink-400" />
              </div>
              <Badge variant="outline" className="border-pink-500/30 text-pink-400 text-xs">
                Mashup
              </Badge>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-1">Mashup Two Songs</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Blend two reference tracks into one brand-new AI-generated mashup.
              </p>
            </div>

            <ul className="space-y-1.5">
              {MASHUP_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-pink-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full border-pink-500/30 text-pink-300 hover:bg-pink-500/10 font-semibold group-hover:border-pink-500/50"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Create Mashup
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground opacity-60">
        All modes support full editing — nothing is locked after generation.
      </p>
    </div>
  )
}
