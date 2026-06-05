// ── Input ──────────────────────────────────────────────────────────────────

export type GeneratedSong = {
  id: string
  title: string
  topic: string
  genre: string
  mood: string
  targetAudience?: string
  targetPlatform?: "youtube" | "shorts" | "tiktok" | "spotify" | "general"
  stylePrompt?: string
  melodyPrompt?: string
  lyrics: string
  description?: string
  hashtags?: string[]
  thumbnailPrompt?: string
  createdAt: string
}

// ── Scoring weights ──────────────────────────────────────────────────────────

export const defaultScoringWeights = {
  titleHookScore: 15,
  lyricsQualityScore: 15,
  emotionalImpactScore: 15,
  genreFitScore: 10,
  melodyPotentialScore: 10,
  viralPotentialScore: 15,
  platformFitScore: 10,
  thumbnailPotentialScore: 5,
  originalityScore: 3,
  playlistFitScore: 2,
} as const

export type ScoringWeights = typeof defaultScoringWeights

export type CategoryScores = {
  titleHookScore: number
  lyricsQualityScore: number
  emotionalImpactScore: number
  genreFitScore: number
  melodyPotentialScore: number
  viralPotentialScore: number
  platformFitScore: number
  thumbnailPotentialScore: number
  originalityScore: number
  playlistFitScore: number
}

// ── Context ──────────────────────────────────────────────────────────────────

export type TargetPlatform = "youtube" | "shorts" | "tiktok" | "spotify" | "general"

export type ScoringContext = {
  playlistTopic: string
  genre: string
  mood: string
  targetPlatform: TargetPlatform
  targetAudience?: string
  scoringWeights?: Partial<ScoringWeights>
}

// ── Results ───────────────────────────────────────────────────────────────────

export type Recommendation = "publish_first" | "publish_early" | "publish_later" | "needs_revision"
export type BestUseCase = "long_form_youtube" | "youtube_shorts" | "tiktok_clip" | "playlist_track" | "needs_rewrite"

export type SongScoreResult = {
  songId: string
  title: string
  totalScore: number
  rank: number
  recommendation: Recommendation
  categoryScores: CategoryScores
  strengths: string[]
  weaknesses: string[]
  suggestedImprovements: string[]
  bestUseCase: BestUseCase
  suggestedPublishingOrderReason: string
}

export type PlaylistInsights = {
  strongestCommonTheme: string
  weakestCommonIssue: string
  publishingStrategy: string
  recommendedReleaseOrder: string[]
}

export type PlaylistScoringResult = {
  playlistId?: string
  topic: string
  genre: string
  mood: string
  targetPlatform: string
  averageScore: number
  topSongId: string
  rankedSongs: SongScoreResult[]
  playlistInsights: PlaylistInsights
}

// ── AI provider interface ──────────────────────────────────────────────────────

export type SongScoringProvider = {
  scoreSongWithAI(song: GeneratedSong, context: ScoringContext): Promise<SongScoreResult>
}

// ── DB record type (matches Prisma model) ────────────────────────────────────

export type SongScoreRecord = {
  id: string
  songId: string
  songType: string
  albumId?: string | null
  totalScore: number
  rank: number
  recommendation: string
  bestUseCase: string
  categoryScores: CategoryScores
  strengths: string[]
  weaknesses: string[]
  suggestedImprovements: string[]
  suggestedPublishingOrderReason?: string | null
  scoringContext: ScoringContext
  scoringMode: string
  createdAt: Date
  updatedAt: Date
}
