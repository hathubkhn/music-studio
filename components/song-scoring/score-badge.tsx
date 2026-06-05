"use client"

import { cn } from "@/lib/utils"
import type { Recommendation } from "@/lib/song-scoring/types"

export function getScoreTier(score: number): {
  label: string
  color: string
  bg: string
  border: string
  ring: string
} {
  if (score >= 85) return {
    label: "Excellent",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    ring: "ring-emerald-500/30",
  }
  if (score >= 75) return {
    label: "Strong",
    color: "text-blue-300",
    bg: "bg-blue-500/15",
    border: "border-blue-500/40",
    ring: "ring-blue-500/30",
  }
  if (score >= 60) return {
    label: "Usable",
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    ring: "ring-amber-500/30",
  }
  return {
    label: "Needs Work",
    color: "text-red-300",
    bg: "bg-red-500/15",
    border: "border-red-500/40",
    ring: "ring-red-500/30",
  }
}

export const RECOMMENDATION_META: Record<Recommendation, { label: string; color: string; bg: string; border: string }> = {
  publish_first: { label: "Publish First", color: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-500/40" },
  publish_early: { label: "Publish Early", color: "text-blue-300", bg: "bg-blue-500/15", border: "border-blue-500/40" },
  publish_later: { label: "Publish Later", color: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/40" },
  needs_revision: { label: "Needs Revision", color: "text-red-300", bg: "bg-red-500/15", border: "border-red-500/40" },
}

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const tier = getScoreTier(score)
  const sizes = { sm: "text-xs px-2 py-0.5", md: "text-sm px-2.5 py-1", lg: "text-base px-3 py-1.5 font-bold" }
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-medium",
      tier.bg, tier.border, tier.color, sizes[size]
    )}>
      <span className="font-bold tabular-nums">{Math.round(score)}</span>
      <span className="opacity-70">/100</span>
      <span className={cn("text-[10px] uppercase tracking-wide opacity-80", size === "sm" && "hidden")}>
        {tier.label}
      </span>
    </span>
  )
}

export function RecommendationBadge({ recommendation }: { recommendation: Recommendation }) {
  const meta = RECOMMENDATION_META[recommendation]
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
      meta.bg, meta.border, meta.color
    )}>
      {meta.label}
    </span>
  )
}

export function ScoreBar({
  label,
  score,
  weight,
}: {
  label: string
  score: number
  weight: number
}) {
  const tier = getScoreTier(score)
  const contribution = Math.round((score * weight) / 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className={cn("font-medium", tier.color)}>{Math.round(score)}</span>
          <span className="text-muted-foreground/50">×{weight}% = {contribution}pts</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", tier.bg.replace("/15", "/60"))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
