import type {
  GeneratedSong,
  ScoringContext,
  SongScoreResult,
  PlaylistScoringResult,
  CategoryScores,
  ScoringWeights,
  Recommendation,
  BestUseCase,
} from "./types"
import { defaultScoringWeights } from "./types"
import {
  computeCategoryScores,
  applyGenreAdjustment,
  deriveStrengthsWeaknesses,
} from "./rules"

// ── Weight normalization ──────────────────────────────────────────────────────

function mergeWeights(overrides?: Partial<ScoringWeights>): ScoringWeights {
  return { ...defaultScoringWeights, ...overrides }
}

function weightedTotal(scores: CategoryScores, weights: ScoringWeights): number {
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0)
  const raw = Object.entries(weights).reduce((sum, [key, w]) => {
    const s = scores[key as keyof CategoryScores] ?? 0
    return sum + s * w
  }, 0)
  // Normalize to 100
  return Math.round((raw / (weightSum * 100)) * 100 * 10) / 10
}

// ── Recommendation derivation ─────────────────────────────────────────────────

function deriveRecommendation(score: number): Recommendation {
  if (score >= 85) return "publish_first"
  if (score >= 75) return "publish_early"
  if (score >= 60) return "publish_later"
  return "needs_revision"
}

function deriveBestUseCase(
  scores: CategoryScores,
  platform: string,
  totalScore: number
): BestUseCase {
  if (scores.viralPotentialScore >= 75 && (platform === "shorts" || platform === "tiktok")) {
    return "youtube_shorts"
  }
  if (scores.viralPotentialScore >= 70 && platform === "tiktok") {
    return "tiktok_clip"
  }
  if (totalScore < 55 || scores.lyricsQualityScore < 50) {
    return "needs_rewrite"
  }
  if (scores.platformFitScore >= 70 && platform === "youtube") {
    return "long_form_youtube"
  }
  if (scores.platformFitScore >= 65) return "playlist_track"
  return "long_form_youtube"
}

function buildOrderReason(song: GeneratedSong, score: number, rank: number): string {
  const rec = deriveRecommendation(score)
  const prefixes: Record<Recommendation, string> = {
    publish_first: `Ranked #${rank} — strongest hook and emotional clarity.`,
    publish_early: `Ranked #${rank} — solid performer to release in the first wave.`,
    publish_later: `Ranked #${rank} — good filler track; publish after stronger songs gain traction.`,
    needs_revision: `Ranked #${rank} — needs rework before publishing.`,
  }
  return prefixes[rec] + ` Total score: ${score}/100.`
}

// ── Rule-based scorer ─────────────────────────────────────────────────────────

export function scoreSong(song: GeneratedSong, context: ScoringContext): SongScoreResult {
  const weights = mergeWeights(context.scoringWeights)
  const categoryScores = computeCategoryScores(song, context)
  let total = weightedTotal(categoryScores, weights)

  // Apply genre-specific bonus/penalty
  total = applyGenreAdjustment(total, song, context.genre)
  total = Math.max(0, Math.min(100, total))

  const { strengths, weaknesses, suggestedImprovements } = deriveStrengthsWeaknesses(
    categoryScores,
    song
  )

  const recommendation = deriveRecommendation(total)
  const bestUseCase = deriveBestUseCase(categoryScores, context.targetPlatform, total)

  return {
    songId: song.id,
    title: song.title,
    totalScore: total,
    rank: 0, // assigned during playlist ranking
    recommendation,
    categoryScores,
    strengths,
    weaknesses,
    suggestedImprovements,
    bestUseCase,
    suggestedPublishingOrderReason: buildOrderReason(song, total, 0),
  }
}

// ── Ranking ───────────────────────────────────────────────────────────────────

export function rankSongsByPublishingPriority(results: SongScoreResult[]): SongScoreResult[] {
  const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore)
  return sorted.map((r, i) => ({
    ...r,
    rank: i + 1,
    suggestedPublishingOrderReason: buildOrderReason(
      { title: r.title } as GeneratedSong,
      r.totalScore,
      i + 1
    ),
  }))
}

// ── Playlist scorer ───────────────────────────────────────────────────────────

export function scorePlaylist(
  songs: GeneratedSong[],
  context: ScoringContext
): PlaylistScoringResult {
  if (!songs.length) {
    return {
      playlistId: undefined,
      topic: context.playlistTopic,
      genre: context.genre,
      mood: context.mood,
      targetPlatform: context.targetPlatform,
      averageScore: 0,
      topSongId: "",
      rankedSongs: [],
      playlistInsights: {
        strongestCommonTheme: "No songs",
        weakestCommonIssue: "No songs",
        publishingStrategy: "Add songs first.",
        recommendedReleaseOrder: [],
      },
    }
  }

  const rawResults = songs.map((s) => scoreSong(s, context))
  const ranked = rankSongsByPublishingPriority(rawResults)
  const avg = Math.round((ranked.reduce((s, r) => s + r.totalScore, 0) / ranked.length) * 10) / 10

  const top = ranked[0]

  // Aggregate insights
  const allStrengths = ranked.flatMap((r) => r.strengths)
  const allWeaknesses = ranked.flatMap((r) => r.weaknesses)
  const strongestTheme = mostFrequent(allStrengths) || "Emotional storytelling"
  const weakestIssue = mostFrequent(allWeaknesses) || "Title originality"

  const publishFirst = ranked.filter((r) => r.recommendation === "publish_first").map((r) => r.title)
  const publishEarly = ranked.filter((r) => r.recommendation === "publish_early").map((r) => r.title)
  const needsWork = ranked.filter((r) => r.recommendation === "needs_revision").map((r) => r.title)

  let strategy = `Publish "${top.title}" first — highest score (${top.totalScore}/100).`
  if (publishFirst.length > 1) strategy += ` Other strong openers: ${publishFirst.slice(1, 3).join(", ")}.`
  if (needsWork.length) strategy += ` ${needsWork.length} song(s) need revision before release.`

  return {
    topic: context.playlistTopic,
    genre: context.genre,
    mood: context.mood,
    targetPlatform: context.targetPlatform,
    averageScore: avg,
    topSongId: top.songId,
    rankedSongs: ranked,
    playlistInsights: {
      strongestCommonTheme: strongestTheme,
      weakestCommonIssue: weakestIssue,
      publishingStrategy: strategy,
      recommendedReleaseOrder: ranked.map((r) => r.songId),
    },
  }
}

// ── LLM prompt builder ────────────────────────────────────────────────────────

export function buildSongScoringPrompt(song: GeneratedSong, context: ScoringContext): string {
  return `You are an expert music producer, songwriter, YouTube strategist, and A&R judge.

Evaluate the following generated song for publishing priority.

Context:
- Playlist topic: ${context.playlistTopic}
- Genre: ${context.genre}
- Mood: ${context.mood}
- Target platform: ${context.targetPlatform}
- Target audience: ${context.targetAudience || "general"}

Song:
Title: ${song.title}
Style prompt: ${song.stylePrompt || "N/A"}
Melody prompt: ${song.melodyPrompt || "N/A"}
Lyrics:
${song.lyrics || "No lyrics provided"}

Score the song from 0 to 100 based on:
1. Title hook strength
2. Lyrics quality
3. Emotional impact
4. Genre fit
5. Melody potential
6. Viral potential
7. Platform fit
8. Thumbnail potential
9. Originality
10. Playlist fit

Important:
- Be strict and practical.
- Do not overrate generic songs.
- Reward songs with strong hooks, clear visual identity, emotional clarity, and platform fit.
- Penalize vague lyrics, weak chorus, generic title, no memorable line, or unclear concept.
- For sad ballads, reward simple emotional images and repeated chorus hooks.
- For Shorts/TikTok, reward lyrics that can work as a 15-30 second viral caption.

Return ONLY valid JSON with this exact shape:
{
  "totalScore": number,
  "categoryScores": {
    "titleHookScore": number,
    "lyricsQualityScore": number,
    "emotionalImpactScore": number,
    "genreFitScore": number,
    "melodyPotentialScore": number,
    "viralPotentialScore": number,
    "platformFitScore": number,
    "thumbnailPotentialScore": number,
    "originalityScore": number,
    "playlistFitScore": number
  },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestedImprovements": ["string"],
  "bestUseCase": "long_form_youtube" | "youtube_shorts" | "tiktok_clip" | "playlist_track" | "needs_rewrite",
  "recommendation": "publish_first" | "publish_early" | "publish_later" | "needs_revision",
  "suggestedPublishingOrderReason": "string"
}`
}

// ── LLM scorer ────────────────────────────────────────────────────────────────

export async function scoreSongWithAI(
  song: GeneratedSong,
  context: ScoringContext
): Promise<SongScoreResult> {
  const { default: OpenAI } = await import("openai")
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const prompt = buildSongScoringPrompt(song, context)
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a music industry expert evaluating songs for publishing priority. Respond only with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  })

  const raw = response.choices[0]?.message?.content || "{}"
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)

  return {
    songId: song.id,
    title: song.title,
    totalScore: parsed.totalScore ?? 50,
    rank: 0,
    recommendation: parsed.recommendation ?? "publish_later",
    categoryScores: parsed.categoryScores ?? computeCategoryScores(song, context),
    strengths: parsed.strengths ?? [],
    weaknesses: parsed.weaknesses ?? [],
    suggestedImprovements: parsed.suggestedImprovements ?? [],
    bestUseCase: parsed.bestUseCase ?? "playlist_track",
    suggestedPublishingOrderReason: parsed.suggestedPublishingOrderReason ?? "",
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function mostFrequent(arr: string[]): string | null {
  if (!arr.length) return null
  const freq: Record<string, number> = {}
  for (const s of arr) freq[s] = (freq[s] || 0) + 1
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}
