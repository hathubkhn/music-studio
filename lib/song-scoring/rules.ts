import type { CategoryScores, GeneratedSong, ScoringContext, TargetPlatform } from "./types"

// ── Keyword banks ─────────────────────────────────────────────────────────────

const EMOTIONAL_KEYWORDS = [
  "heart", "cry", "tears", "love", "miss", "lost", "alone", "pain", "hurt", "ache",
  "broken", "empty", "cold", "dark", "wait", "hope", "heal", "fade", "gone", "hold",
  "remember", "forget", "stay", "leave", "goodbye", "sorry", "breath", "silent", "still",
  "numb", "ache", "longing", "yearning", "grief", "sorrow", "tender", "fragile", "shatter",
]

const VISUAL_KEYWORDS = [
  "rain", "window", "light", "shadow", "room", "road", "sky", "stars", "fire", "snow",
  "coffee", "phone", "bed", "door", "floor", "hands", "eyes", "night", "moon", "street",
  "smoke", "glass", "mirror", "photograph", "candle", "ocean", "wave", "sunrise", "letter",
  "jacket", "scarf", "empty chair", "old photo", "city lights", "blue light", "silence",
]

const GENERIC_TITLE_WORDS = [
  "missing you", "broken heart", "without you", "love song", "my heart", "forever",
  "always", "never", "together", "apart", "gone away", "come back", "holding on",
  "letting go", "move on", "moving on", "stay with me", "in my heart",
]

const CHORUS_MARKERS = ["[chorus]", "[pre-chorus]", "[final chorus]", "[hook]"]
const VERSE_MARKERS = ["[verse", "[intro]", "[bridge]", "[outro]", "[breakdown]"]
const HOOK_CONTRAST_PATTERNS = [
  /i (miss|love|need|want) you.*but (i won't|i don't|i can't)/i,
  /i (loved|missed|held) you.*but (i let|i walked|i chose)/i,
  /but i (won't|don't|can't|let go|walk away)/i,
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function countKeywordMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  return keywords.filter((kw) => lower.includes(kw)).length
}

function extractChorusLines(lyrics: string): string[] {
  const lines = lyrics.split("\n")
  const result: string[] = []
  let inChorus = false
  for (const line of lines) {
    const lower = line.toLowerCase().trim()
    if (CHORUS_MARKERS.some((m) => lower.includes(m))) {
      inChorus = true
      continue
    }
    if (VERSE_MARKERS.some((m) => lower.includes(m))) {
      inChorus = false
      continue
    }
    if (inChorus && line.trim()) result.push(line.trim())
  }
  return result
}

function countChorusRepetitions(lyrics: string): number {
  return (lyrics.toLowerCase().match(/\[chorus\]/g) || []).length
}

function avgLineLength(lyrics: string): number {
  const lines = lyrics.split("\n").filter((l) => l.trim() && !l.trim().startsWith("["))
  if (!lines.length) return 0
  return lines.reduce((s, l) => s + l.trim().length, 0) / lines.length
}

function hasSection(lyrics: string, marker: string): boolean {
  return lyrics.toLowerCase().includes(marker.toLowerCase())
}

function isGenericTitle(title: string): boolean {
  const lower = title.toLowerCase()
  return GENERIC_TITLE_WORDS.some((w) => lower.includes(w))
}

function titleWordCount(title: string): number {
  return title.trim().split(/\s+/).length
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

// ── Individual sub-scorers ────────────────────────────────────────────────────

function scoreTitleHook(song: GeneratedSong): number {
  let score = 60
  const words = titleWordCount(song.title)

  if (words >= 3 && words <= 7) score += 15
  else if (words === 2 || words === 8) score += 5
  else score -= 10

  if (isGenericTitle(song.title)) score -= 20
  if (/[A-Z]/.test(song.title[0])) score += 5

  // Specific/visual/evocative title
  const titleVisuals = countKeywordMatches(song.title, VISUAL_KEYWORDS)
  if (titleVisuals >= 1) score += 10

  // Contrast or question mark adds intrigue
  if (song.title.includes("/") || song.title.includes(":")) score += 8
  if (song.title.endsWith("?")) score += 5

  return clamp(score)
}

function scoreLyricsQuality(song: GeneratedSong): number {
  if (!song.lyrics) return 20
  const lyrics = song.lyrics

  let score = 50
  const lines = lyrics.split("\n").filter((l) => l.trim() && !l.trim().startsWith("["))
  const lineCount = lines.length

  if (lineCount >= 40) score += 15
  else if (lineCount >= 20) score += 8

  const avgLen = avgLineLength(lyrics)
  if (avgLen >= 20 && avgLen <= 50) score += 10
  else if (avgLen > 70) score -= 15

  if (hasSection(lyrics, "[Intro]") || hasSection(lyrics, "[intro]")) score += 5
  if (hasSection(lyrics, "[Bridge]") || hasSection(lyrics, "[bridge]")) score += 5
  if (hasSection(lyrics, "[Final Chorus]") || hasSection(lyrics, "[final chorus]")) score += 5

  const chorusReps = countChorusRepetitions(lyrics)
  if (chorusReps >= 2) score += 10
  else if (chorusReps === 0) score -= 15

  const chorusLines = extractChorusLines(lyrics)
  if (chorusLines.length >= 4) score += 5

  return clamp(score)
}

function scoreEmotionalImpact(song: GeneratedSong): number {
  if (!song.lyrics) return 20
  const lyrics = song.lyrics.toLowerCase()

  let score = 40
  const emotionalHits = countKeywordMatches(lyrics, EMOTIONAL_KEYWORDS)
  score += Math.min(emotionalHits * 3, 25)

  const visualHits = countKeywordMatches(lyrics, VISUAL_KEYWORDS)
  score += Math.min(visualHits * 2, 20)

  const hasContrast = HOOK_CONTRAST_PATTERNS.some((p) => p.test(lyrics))
  if (hasContrast) score += 10

  const moodLower = song.mood.toLowerCase()
  if (moodLower.includes("sad") || moodLower.includes("emotional") || moodLower.includes("heartbreak")) {
    score += 5
  }

  return clamp(score)
}

function scoreGenreFit(song: GeneratedSong, context: ScoringContext): number {
  const songGenre = (song.genre || "").toLowerCase()
  const ctxGenre = (context.genre || "").toLowerCase()

  if (!ctxGenre) return 70

  const exactMatch = songGenre === ctxGenre
  const partialMatch =
    songGenre.includes(ctxGenre) || ctxGenre.includes(songGenre)

  let score = exactMatch ? 90 : partialMatch ? 75 : 55

  const styleHits = countKeywordMatches(song.stylePrompt || "", ctxGenre.split(/\s+/))
  score += Math.min(styleHits * 3, 10)

  return clamp(score)
}

function scoreMelodyPotential(song: GeneratedSong): number {
  let score = 55
  const lyrics = song.lyrics || ""

  const chorusReps = countChorusRepetitions(lyrics)
  if (chorusReps >= 2) score += 15
  if (chorusReps >= 3) score += 5

  const chorusLines = extractChorusLines(lyrics)
  const shortChorusLines = chorusLines.filter((l) => l.split(/\s+/).length <= 8)
  if (shortChorusLines.length >= 3) score += 10

  if (song.stylePrompt) {
    const styleLower = song.stylePrompt.toLowerCase()
    if (/\d+\s*bpm/.test(styleLower)) score += 5
    if (styleLower.includes("piano") || styleLower.includes("guitar") || styleLower.includes("strings")) score += 5
  }

  return clamp(score)
}

function scoreViralPotential(song: GeneratedSong, context: ScoringContext): number {
  let score = 40

  // Title is shareable/unique
  if (!isGenericTitle(song.title)) score += 15
  if (titleWordCount(song.title) >= 4 && titleWordCount(song.title) <= 7) score += 8

  const lyrics = (song.lyrics || "").toLowerCase()
  const chorusLines = extractChorusLines(song.lyrics || "")

  // Short chorus lines = good for short-form captions
  const veryShortLines = chorusLines.filter((l) => l.split(/\s+/).length <= 6)
  if (veryShortLines.length >= 2) score += 12

  const hasContrast = HOOK_CONTRAST_PATTERNS.some((p) => p.test(lyrics))
  if (hasContrast) score += 10

  // Visual imagery helps thumbnails
  const visualHits = countKeywordMatches(lyrics, VISUAL_KEYWORDS)
  score += Math.min(visualHits * 1.5, 10)

  // Platform boost
  const platform = context.targetPlatform
  if (platform === "shorts" || platform === "tiktok") score += 5

  return clamp(score)
}

function scorePlatformFit(song: GeneratedSong, context: ScoringContext): number {
  const platform: TargetPlatform = song.targetPlatform || context.targetPlatform || "general"
  const lyrics = (song.lyrics || "").toLowerCase()
  const chorusLines = extractChorusLines(song.lyrics || "")

  let score = 60

  if (platform === "youtube") {
    // Long-form YouTube: needs title, thumbnail concept, emotional storytelling
    if (!isGenericTitle(song.title)) score += 10
    const visualHits = countKeywordMatches(lyrics, VISUAL_KEYWORDS)
    score += Math.min(visualHits * 2, 15)
    const chorusReps = countChorusRepetitions(song.lyrics || "")
    if (chorusReps >= 2) score += 10
    if (song.thumbnailPrompt) score += 5
  } else if (platform === "shorts" || platform === "tiktok") {
    // Short-form: hook early, short lines, captionable
    const shortLines = chorusLines.filter((l) => l.split(/\s+/).length <= 7)
    score += Math.min(shortLines.length * 5, 20)
    const hasContrast = HOOK_CONTRAST_PATTERNS.some((p) => p.test(lyrics))
    if (hasContrast) score += 10
    if (hasSection(song.lyrics || "", "[Pre-Chorus]")) score += 5
  } else if (platform === "spotify") {
    // Playlist listening: replay value, smooth mood
    const chorusReps = countChorusRepetitions(song.lyrics || "")
    if (chorusReps >= 3) score += 15
    const avgLen = avgLineLength(song.lyrics || "")
    if (avgLen >= 20 && avgLen <= 45) score += 10
  }

  return clamp(score)
}

function scoreThumbnailPotential(song: GeneratedSong): number {
  let score = 50

  if (song.thumbnailPrompt) score += 20
  if (!isGenericTitle(song.title)) score += 15

  const titleVisuals = countKeywordMatches(song.title, VISUAL_KEYWORDS)
  if (titleVisuals >= 1) score += 10

  const lyricsVisuals = countKeywordMatches(song.lyrics || "", VISUAL_KEYWORDS)
  score += Math.min(lyricsVisuals * 1, 5)

  return clamp(score)
}

function scoreOriginality(song: GeneratedSong): number {
  let score = 60

  if (isGenericTitle(song.title)) score -= 30
  if (titleWordCount(song.title) >= 4) score += 10

  // Unique/evocative phrases
  const titleLower = song.title.toLowerCase()
  if (/\b(dial|ghost|static|echo|unread|rewind|cassette|3 a\.?m|2 a\.?m)\b/.test(titleLower)) score += 15

  const chorusLines = extractChorusLines(song.lyrics || "")
  const hasContrastLine = chorusLines.some((l) => l.includes("/") || HOOK_CONTRAST_PATTERNS.some((p) => p.test(l)))
  if (hasContrastLine) score += 10

  return clamp(score)
}

function scorePlaylistFit(song: GeneratedSong, context: ScoringContext): number {
  let score = 60

  const songMood = (song.mood || "").toLowerCase()
  const ctxMood = (context.mood || "").toLowerCase()
  if (ctxMood && (songMood === ctxMood || songMood.includes(ctxMood) || ctxMood.includes(songMood))) {
    score += 25
  }

  const topicHits = countKeywordMatches(
    (song.topic || "") + " " + (song.description || ""),
    (context.playlistTopic || "").toLowerCase().split(/\s+/)
  )
  score += Math.min(topicHits * 3, 15)

  return clamp(score)
}

// ── Genre-specific adjustments ────────────────────────────────────────────────

type GenreAdjustment = {
  bonusKeywords: string[]
  penaltyKeywords: string[]
  bonusConditions: ((song: GeneratedSong) => boolean)[]
  penaltyConditions: ((song: GeneratedSong) => boolean)[]
  bonusAmount: number
  penaltyAmount: number
}

const genreAdjustments: Record<string, GenreAdjustment> = {
  "sad love song": {
    bonusKeywords: ["rain", "empty", "cold", "phone", "old", "coffee", "bed"],
    penaltyKeywords: [],
    bonusConditions: [
      (s) => HOOK_CONTRAST_PATTERNS.some((p) => p.test(s.lyrics || "")),
      (s) => countChorusRepetitions(s.lyrics || "") >= 2,
      (s) => !isGenericTitle(s.title),
    ],
    penaltyConditions: [
      (s) => isGenericTitle(s.title),
      (s) => countChorusRepetitions(s.lyrics || "") === 0,
      (s) => avgLineLength(s.lyrics || "") > 65,
    ],
    bonusAmount: 5,
    penaltyAmount: 8,
  },
  "heartbreak ballad": {
    bonusKeywords: ["rain", "empty", "cold", "phone", "old", "coffee", "bed", "door", "silence"],
    penaltyKeywords: [],
    bonusConditions: [
      (s) => HOOK_CONTRAST_PATTERNS.some((p) => p.test(s.lyrics || "")),
      (s) => countChorusRepetitions(s.lyrics || "") >= 2,
    ],
    penaltyConditions: [
      (s) => isGenericTitle(s.title),
      (s) => avgLineLength(s.lyrics || "") > 65,
    ],
    bonusAmount: 5,
    penaltyAmount: 8,
  },
  "healing ballad": {
    bonusKeywords: ["morning", "light", "breath", "walk", "window", "curtain", "forward", "warmth"],
    penaltyKeywords: ["healing", "moving on", "self-help"],
    bonusConditions: [
      (s) => hasSection(s.lyrics || "", "[Final Chorus]"),
    ],
    penaltyConditions: [
      (s) => countKeywordMatches((s.lyrics || "").toLowerCase(), ["healing", "moving on"]) > 3,
    ],
    bonusAmount: 5,
    penaltyAmount: 10,
  },
  "acoustic folk-pop": {
    bonusKeywords: ["road", "home", "hands", "stars", "fire", "coffee", "town", "simple"],
    penaltyKeywords: [],
    bonusConditions: [
      (s) => avgLineLength(s.lyrics || "") <= 40,
      (s) => hasSection(s.lyrics || "", "[Bridge]"),
    ],
    penaltyConditions: [
      (s) => avgLineLength(s.lyrics || "") > 60,
    ],
    bonusAmount: 5,
    penaltyAmount: 8,
  },
  "cinematic pop ballad": {
    bonusKeywords: ["shadow", "light", "night", "sky", "fire", "falling", "rise", "storm"],
    penaltyKeywords: [],
    bonusConditions: [
      (s) => hasSection(s.lyrics || "", "[Final Chorus]"),
      (s) => countChorusRepetitions(s.lyrics || "") >= 2,
    ],
    penaltyConditions: [
      (s) => !hasSection(s.lyrics || "", "[Final Chorus]"),
      (s) => countChorusRepetitions(s.lyrics || "") === 0,
    ],
    bonusAmount: 6,
    penaltyAmount: 10,
  },
  "dark pop": {
    bonusKeywords: ["blue light", "phone", "silence", "shadow", "rain", "2 am", "3 am", "empty"],
    penaltyKeywords: [],
    bonusConditions: [
      (s) => avgLineLength(s.lyrics || "") <= 35,
    ],
    penaltyConditions: [
      (s) => avgLineLength(s.lyrics || "") > 60,
    ],
    bonusAmount: 7,
    penaltyAmount: 10,
  },
  "lo-fi sad r&b": {
    bonusKeywords: ["city", "late", "night", "2 am", "unread", "phone", "rain", "window"],
    penaltyKeywords: [],
    bonusConditions: [
      (s) => countChorusRepetitions(s.lyrics || "") >= 2,
    ],
    penaltyConditions: [
      (s) => avgLineLength(s.lyrics || "") > 55,
    ],
    bonusAmount: 5,
    penaltyAmount: 8,
  },
}

export function applyGenreAdjustment(
  totalScore: number,
  song: GeneratedSong,
  genre: string
): number {
  const key = genre.toLowerCase()
  const adj = genreAdjustments[key] || Object.entries(genreAdjustments).find(([k]) => key.includes(k))?.[1]
  if (!adj) return totalScore

  let delta = 0
  const lyrics = (song.lyrics || "").toLowerCase()
  delta += Math.min(countKeywordMatches(lyrics, adj.bonusKeywords) * 1.5, 10)
  delta -= Math.min(countKeywordMatches(lyrics, adj.penaltyKeywords) * 2, 10)
  adj.bonusConditions.forEach((cond) => { if (cond(song)) delta += adj.bonusAmount })
  adj.penaltyConditions.forEach((cond) => { if (cond(song)) delta -= adj.penaltyAmount })

  return clamp(totalScore + delta)
}

// ── Main category scorer ──────────────────────────────────────────────────────

export function computeCategoryScores(
  song: GeneratedSong,
  context: ScoringContext
): CategoryScores {
  return {
    titleHookScore: scoreTitleHook(song),
    lyricsQualityScore: scoreLyricsQuality(song),
    emotionalImpactScore: scoreEmotionalImpact(song),
    genreFitScore: scoreGenreFit(song, context),
    melodyPotentialScore: scoreMelodyPotential(song),
    viralPotentialScore: scoreViralPotential(song, context),
    platformFitScore: scorePlatformFit(song, context),
    thumbnailPotentialScore: scoreThumbnailPotential(song),
    originalityScore: scoreOriginality(song),
    playlistFitScore: scorePlaylistFit(song, context),
  }
}

// ── Strengths / weaknesses derivation ────────────────────────────────────────

export function deriveStrengthsWeaknesses(
  scores: CategoryScores,
  song: GeneratedSong
): { strengths: string[]; weaknesses: string[]; suggestedImprovements: string[] } {
  const strengths: string[] = []
  const weaknesses: string[] = []
  const improvements: string[] = []

  if (scores.titleHookScore >= 75) strengths.push("Strong, original title with visual or emotional hook")
  else if (scores.titleHookScore < 55) {
    weaknesses.push("Title is generic or lacks distinctiveness")
    improvements.push("Rewrite the title with a specific image or unusual phrase (e.g. 'I Keep Dialing Silence')")
  }

  if (scores.lyricsQualityScore >= 75) strengths.push("Well-structured lyrics with clear sections and repeated chorus")
  else if (scores.lyricsQualityScore < 55) {
    weaknesses.push("Lyrics lack structure or chorus repetition")
    improvements.push("Add [Final Chorus] and repeat the main chorus at least twice")
  }

  if (scores.emotionalImpactScore >= 75) strengths.push("Emotionally resonant with vivid, relatable imagery")
  else if (scores.emotionalImpactScore < 55) {
    weaknesses.push("Emotional impact is weak — lacks specific imagery")
    improvements.push("Replace abstract emotions with concrete images: empty room, cold coffee, blue phone light")
  }

  if (scores.genreFitScore >= 80) strengths.push("Excellent genre alignment")
  else if (scores.genreFitScore < 60) {
    weaknesses.push("Song doesn't clearly fit the target genre")
    improvements.push("Refine the style prompt to match genre-specific instruments and production keywords")
  }

  if (scores.viralPotentialScore >= 75) strengths.push("High viral potential — short memorable hook, strong visual concept")
  else if (scores.viralPotentialScore < 55) {
    weaknesses.push("Low viral potential — chorus lines are too long or generic")
    improvements.push("Shorten chorus lines to 6–8 words and add contrast ('I loved you / but I let you go')")
  }

  if (scores.platformFitScore >= 75) strengths.push("Fits target platform well")
  else if (scores.platformFitScore < 55) {
    weaknesses.push("Doesn't fully match target platform requirements")
    improvements.push("For YouTube: strengthen thumbnail concept. For Shorts/TikTok: shorten the hook to one punchy line.")
  }

  if (scores.thumbnailPotentialScore >= 70) strengths.push("Strong thumbnail concept — title suggests a clear visual")
  else if (scores.thumbnailPotentialScore < 45) {
    improvements.push("Create a thumbnail prompt with specific visual elements from the lyrics")
  }

  if (scores.originalityScore >= 70) strengths.push("Original, distinctive song identity")
  else if (scores.originalityScore < 50) {
    weaknesses.push("Title or concept feels too common")
    improvements.push("Make the title more specific or unusual to stand out in search results")
  }

  if (countChorusRepetitions(song.lyrics || "") >= 2) {
    strengths.push("Chorus repeats multiple times — improves memorability")
  }

  if (HOOK_CONTRAST_PATTERNS.some((p) => p.test(song.lyrics || ""))) {
    strengths.push("Uses emotional contrast lines — highly singable and shareable")
  }

  return { strengths, weaknesses, suggestedImprovements: improvements }
}
