"use client"

import { useState, useCallback } from "react"
import {
  Sparkles, Loader2, Download, SortAsc, Filter,
  BarChart3, Trophy, AlertCircle, RefreshCw, FileJson
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { SongScoreCard } from "./song-score-card"
import { ScoreBadge, getScoreTier } from "./score-badge"
import type {
  GeneratedSong,
  ScoringContext,
  SongScoreResult,
  PlaylistScoringResult,
  Recommendation,
} from "@/lib/song-scoring/types"

type FilterOption = "all" | Recommendation

interface Props {
  songs: GeneratedSong[]
  context: ScoringContext
  playlistId?: string
  onImproveLyrics?: (songId: string) => void
}

export function PlaylistScoringPanel({ songs, context, playlistId, onImproveLyrics }: Props) {
  const [result, setResult] = useState<PlaylistScoringResult | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [rescoring, setRescoring] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterOption>("all")
  const [sortByScore, setSortByScore] = useState(true)

  const runScore = useCallback(async () => {
    if (!songs.length) return
    setIsScoring(true)
    try {
      const res = await fetch("/api/playlists/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songs, context, playlistId, persist: true }),
      })
      if (!res.ok) throw new Error("Scoring failed")
      const data: PlaylistScoringResult = await res.json()
      setResult(data)
      toast.success(`Scored ${data.rankedSongs.length} songs. Top: "${data.rankedSongs[0]?.title}"`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to score playlist")
    } finally {
      setIsScoring(false)
    }
  }, [songs, context, playlistId])

  const rescore = useCallback(async (songId: string, mode: "rule_based" | "llm") => {
    const song = songs.find((s) => s.id === songId)
    if (!song) return
    setRescoring(songId)
    try {
      const res = await fetch("/api/songs/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song, context, mode, albumId: playlistId, persist: true }),
      })
      if (!res.ok) throw new Error("Re-score failed")
      const updated: SongScoreResult = await res.json()
      setResult((prev) => {
        if (!prev) return prev
        const newRanked = prev.rankedSongs.map((r) =>
          r.songId === songId ? { ...updated, rank: r.rank } : r
        )
        return { ...prev, rankedSongs: newRanked }
      })
      toast.success("Song re-scored!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-score failed")
    } finally {
      setRescoring(null)
    }
  }, [songs, context, playlistId])

  const exportCSV = useCallback(() => {
    if (!result) return
    const header = "Rank,Title,Score,Recommendation,Best Use Case\n"
    const rows = result.rankedSongs.map((r) =>
      `${r.rank},"${r.title}",${r.totalScore},${r.recommendation},${r.bestUseCase}`
    ).join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `playlist-scores-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV exported")
  }, [result])

  const exportJSON = useCallback(() => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `playlist-scores-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("JSON exported")
  }, [result])

  // Filtered & sorted songs
  const displayedSongs: SongScoreResult[] = result
    ? (() => {
        let list = result.rankedSongs
        if (filter !== "all") list = list.filter((r) => r.recommendation === filter)
        if (!sortByScore) list = [...list].sort((a, b) => a.rank - b.rank)
        return list
      })()
    : []

  const scoreDistribution = result
    ? {
        excellent: result.rankedSongs.filter((r) => r.totalScore >= 85).length,
        strong: result.rankedSongs.filter((r) => r.totalScore >= 75 && r.totalScore < 85).length,
        usable: result.rankedSongs.filter((r) => r.totalScore >= 60 && r.totalScore < 75).length,
        needsWork: result.rankedSongs.filter((r) => r.totalScore < 60).length,
      }
    : null

  if (!result) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="py-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mx-auto">
            <BarChart3 className="h-7 w-7 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold">Song Scoring & Publishing Priority</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Automatically score all {songs.length} songs and get a ranked publishing order with strengths, weaknesses, and actionable improvements.
            </p>
          </div>
          <Button
            variant="gradient"
            onClick={runScore}
            disabled={isScoring || !songs.length}
            className="gap-2"
          >
            {isScoring ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Scoring {songs.length} songs...</>
            ) : (
              <><Sparkles className="h-4 w-4" />Score All Songs</>
            )}
          </Button>
          {!songs.length && (
            <p className="text-xs text-muted-foreground">No songs available to score.</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const topSong = result.rankedSongs[0]

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card className="border-violet-500/20 bg-violet-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-violet-400" />
                Playlist Score Summary
              </CardTitle>
              <CardDescription>
                {result.rankedSongs.length} songs · Avg score:&nbsp;
                <strong className={getScoreTier(result.averageScore).color}>{result.averageScore}/100</strong>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
                <Download className="h-3 w-3" />CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportJSON}>
                <FileJson className="h-3 w-3" />JSON
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={runScore} disabled={isScoring}>
                <RefreshCw className={`h-3 w-3 ${isScoring ? "animate-spin" : ""}`} />
                Re-score All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Score distribution */}
          {scoreDistribution && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Excellent", count: scoreDistribution.excellent, color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30" },
                { label: "Strong", count: scoreDistribution.strong, color: "text-blue-300", bg: "bg-blue-500/10 border-blue-500/30" },
                { label: "Usable", count: scoreDistribution.usable, color: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/30" },
                { label: "Needs Work", count: scoreDistribution.needsWork, color: "text-red-300", bg: "bg-red-500/10 border-red-500/30" },
              ].map((tier) => (
                <div key={tier.label} className={`rounded-lg border p-2.5 text-center ${tier.bg}`}>
                  <p className={`text-xl font-bold ${tier.color}`}>{tier.count}</p>
                  <p className="text-[10px] text-muted-foreground">{tier.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Top song highlight */}
          {topSong && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/8 border border-amber-500/25">
              <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-400/70 font-medium">Publish First</p>
                <p className="font-semibold text-sm truncate">{topSong.title}</p>
              </div>
              <ScoreBadge score={topSong.totalScore} />
            </div>
          )}

          {/* Average score bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Playlist average</span>
              <span>{result.averageScore}/100</span>
            </div>
            <Progress value={result.averageScore} className="h-2" />
          </div>

          {/* Insights */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/3 border border-border/30 space-y-1">
              <p className="text-xs font-medium text-emerald-400">Strongest Theme</p>
              <p className="text-xs text-muted-foreground">{result.playlistInsights.strongestCommonTheme}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/3 border border-border/30 space-y-1">
              <p className="text-xs font-medium text-amber-400">Common Issue</p>
              <p className="text-xs text-muted-foreground">{result.playlistInsights.weakestCommonIssue}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/3 border border-border/30 space-y-1 sm:col-span-2">
              <p className="text-xs font-medium text-violet-400">Publishing Strategy</p>
              <p className="text-xs text-muted-foreground">{result.playlistInsights.publishingStrategy}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter + sort controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-7 px-3">All</TabsTrigger>
            <TabsTrigger value="publish_first" className="text-xs h-7 px-3">Publish First</TabsTrigger>
            <TabsTrigger value="publish_early" className="text-xs h-7 px-3">Publish Early</TabsTrigger>
            <TabsTrigger value="publish_later" className="text-xs h-7 px-3">Publish Later</TabsTrigger>
            <TabsTrigger value="needs_revision" className="text-xs h-7 px-3">
              <AlertCircle className="h-3 w-3 mr-1" />
              Needs Revision
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={() => setSortByScore((v) => !v)}
        >
          <SortAsc className="h-3.5 w-3.5" />
          {sortByScore ? "Sort by Score" : "Sort by Order"}
        </Button>
      </div>

      {/* Song cards */}
      {displayedSongs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Filter className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No songs match this filter.
        </div>
      )}

      <div className="space-y-3">
        {displayedSongs.map((songResult) => (
          <SongScoreCard
            key={songResult.songId}
            result={songResult}
            song={songs.find((s) => s.id === songResult.songId)}
            context={context}
            onRescore={(mode) => rescore(songResult.songId, mode)}
            onImproveLyrics={onImproveLyrics ? () => onImproveLyrics(songResult.songId) : undefined}
            isRescoring={rescoring === songResult.songId}
            compact={false}
          />
        ))}
      </div>

      {/* Recommended release order */}
      <Card className="border-border/40">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <SortAsc className="h-4 w-4 text-violet-400" />
            Recommended Publishing Order
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {result.rankedSongs.map((r, i) => (
              <div key={r.songId} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground/50 tabular-nums">{i + 1}.</span>
                <Badge variant="outline" className="text-xs">
                  {r.title}
                </Badge>
                <ScoreBadge score={r.totalScore} size="sm" />
                {i < result.rankedSongs.length - 1 && (
                  <span className="text-muted-foreground/30 text-sm">→</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
