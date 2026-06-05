"use client"

import { useState } from "react"
import {
  ChevronDown, ChevronUp, Sparkles, RotateCcw, FileEdit,
  Image as ImageIcon, TrendingUp, TrendingDown, Lightbulb,
  Trophy, Target, Zap
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ScoreBadge, RecommendationBadge, ScoreBar } from "./score-badge"
import { defaultScoringWeights } from "@/lib/song-scoring/types"
import type { SongScoreResult, GeneratedSong, ScoringContext } from "@/lib/song-scoring/types"

const CATEGORY_LABELS: Record<string, string> = {
  titleHookScore: "Title Hook",
  lyricsQualityScore: "Lyrics Quality",
  emotionalImpactScore: "Emotional Impact",
  genreFitScore: "Genre Fit",
  melodyPotentialScore: "Melody Potential",
  viralPotentialScore: "Viral Potential",
  platformFitScore: "Platform Fit",
  thumbnailPotentialScore: "Thumbnail Potential",
  originalityScore: "Originality",
  playlistFitScore: "Playlist Fit",
}

const BEST_USE_CASE_LABELS: Record<string, string> = {
  long_form_youtube: "YouTube Long-form",
  youtube_shorts: "YouTube Shorts",
  tiktok_clip: "TikTok Clip",
  playlist_track: "Playlist Track",
  needs_rewrite: "Needs Rewrite",
}

interface Props {
  result: SongScoreResult
  song?: GeneratedSong
  context?: ScoringContext
  onRescore?: (mode: "rule_based" | "llm") => void
  onImproveLyrics?: () => void
  onGenerateBetterTitle?: () => void
  onCreateThumbnailPrompt?: () => void
  isRescoring?: boolean
  compact?: boolean
}

export function SongScoreCard({
  result,
  onRescore,
  onImproveLyrics,
  onGenerateBetterTitle,
  onCreateThumbnailPrompt,
  isRescoring,
  compact = false,
}: Props) {
  const [expanded, setExpanded] = useState(!compact)

  const categories = Object.entries(result.categoryScores)

  return (
    <Card className={cn(
      "border transition-all",
      result.totalScore >= 85 && "border-emerald-500/30",
      result.totalScore >= 75 && result.totalScore < 85 && "border-blue-500/30",
      result.totalScore >= 60 && result.totalScore < 75 && "border-amber-500/30",
      result.totalScore < 60 && "border-red-500/30",
    )}>
      <CardHeader className="pb-2 pt-4 px-4">
        {/* Top row */}
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div className={cn(
            "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border",
            result.rank === 1 && "bg-amber-500/20 border-amber-500/50 text-amber-300",
            result.rank === 2 && "bg-slate-400/15 border-slate-400/40 text-slate-300",
            result.rank === 3 && "bg-orange-600/15 border-orange-600/40 text-orange-400",
            result.rank > 3 && "bg-white/5 border-white/10 text-muted-foreground",
          )}>
            {result.rank === 1 ? <Trophy className="h-4 w-4" /> : `#${result.rank}`}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{result.title}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <ScoreBadge score={result.totalScore} size="sm" />
              <RecommendationBadge recommendation={result.recommendation} />
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                <Target className="h-2.5 w-2.5 mr-1" />
                {BEST_USE_CASE_LABELS[result.bestUseCase] || result.bestUseCase}
              </Badge>
            </div>
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Publishing reason */}
          {result.suggestedPublishingOrderReason && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-border/40 pl-3">
              {result.suggestedPublishingOrderReason}
            </p>
          )}

          {/* Category score bars */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Score Breakdown</p>
            <div className="space-y-2">
              {categories.map(([key, score]) => (
                <ScoreBar
                  key={key}
                  label={CATEGORY_LABELS[key] || key}
                  score={score}
                  weight={defaultScoringWeights[key as keyof typeof defaultScoringWeights] ?? 5}
                />
              ))}
            </div>
          </div>

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                Strengths
              </div>
              <ul className="space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {result.weaknesses.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                <TrendingDown className="h-3.5 w-3.5" />
                Weaknesses
              </div>
              <ul className="space-y-1">
                {result.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {result.suggestedImprovements.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                <Lightbulb className="h-3.5 w-3.5" />
                Suggested Improvements
              </div>
              <ul className="space-y-1">
                {result.suggestedImprovements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="text-amber-500 mt-0.5 shrink-0">→</span>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
            {onRescore && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => onRescore("rule_based")}
                  disabled={isRescoring}
                >
                  <RotateCcw className="h-3 w-3" />
                  Re-score
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => onRescore("llm")}
                  disabled={isRescoring}
                >
                  <Zap className="h-3 w-3 text-violet-400" />
                  AI Re-score
                </Button>
              </>
            )}
            {onImproveLyrics && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={onImproveLyrics}>
                <FileEdit className="h-3 w-3" />
                Improve Lyrics
              </Button>
            )}
            {onGenerateBetterTitle && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={onGenerateBetterTitle}>
                <Sparkles className="h-3 w-3 text-teal-400" />
                Better Title
              </Button>
            )}
            {onCreateThumbnailPrompt && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={onCreateThumbnailPrompt}>
                <ImageIcon className="h-3 w-3" />
                Thumbnail Prompt
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
