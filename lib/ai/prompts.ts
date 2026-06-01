export const SONG_BRIEF_PROMPT = (input: {
  prompt: string
  language?: string
  targetLanguage?: string
  audience: string
  mood: string
  genre: string
  vocalPreference: string
  durationTarget: string
  outputPurpose: string
}) => `You are a professional music producer and creative director. Generate a detailed song brief based on the user's idea.

User's song idea: "${input.prompt}"
Target language: ${input.language || input.targetLanguage || "English"}
Audience: ${input.audience}
Mood: ${input.mood}
Genre: ${input.genre}
Vocal preference: ${input.vocalPreference}
Target duration: ${input.durationTarget}
Output purpose: ${input.outputPurpose}

Think carefully about what kind of song this should be. Consider the audience, purpose, and mood.
Respond ONLY with valid JSON:
{
  "titleSuggestions": ["Creative Title 1", "Creative Title 2", "Creative Title 3"],
  "concept": "2-3 sentences describing the core song concept and what makes it special for this audience",
  "lyricalTheme": "The central theme, story arc, and emotional journey of the lyrics",
  "targetEmotion": "The primary emotion the song should make listeners feel",
  "structure": ["Intro", "Chorus", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Final Chorus", "Outro"],
  "recommendedStyle": "Suno-compatible style prompt with: genre, subgenre, instrumentation, tempo (BPM), vocal style, energy level, production style, key/scale",
  "visualDirection": "Visual style, color palette, setting, character descriptions, and scene mood for the music video or storyboard"
}

Important: Be specific and creative. The concept must directly address the user's idea.`

export const LYRICS_GENERATION_PROMPT = (input: {
  brief: string
  title: string
  language: string
  mood: string
  genre: string
  vocalStyle: string
  durationTarget: string
  style?: string
}) => `You are a professional songwriter and lyricist. Write complete, high-quality, original song lyrics.

Song concept: ${input.brief}
Working title: ${input.title}
Language: ${input.language}
Mood/Energy: ${input.mood}
Genre: ${input.genre}
Vocal style: ${input.vocalStyle}
Target duration: ${input.durationTarget}
Style reference: ${input.style || "based on the concept"}

IMPORTANT REQUIREMENTS:
- Write REAL, complete, creative lyrics — not placeholders
- Match the language, vocabulary level, and themes to the concept and audience
- For educational songs: include specific vocabulary, call-and-response, repetition for learning
- For children's songs: use simple rhymes, action words, animal sounds, counting, repetition
- Include varied sections: Intro, Verse 1, Chorus, Verse 2, Bridge, Outro — label each clearly with [Section Name]
- Make the chorus catchy and memorable — it should repeat 2-4 times
- For ${input.durationTarget} duration, write enough content (aim for 300-600 words of lyrics)
- Every section should feel natural to sing aloud

Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{
  "title": "Final polished song title",
  "lyrics": "Complete lyrics here with all sections labeled like [Intro], [Verse 1], [Chorus], [Bridge], [Outro] — write the ACTUAL lyrics, not descriptions",
  "stylePrompt": "Suno-optimized prompt: specific genre, instruments (e.g. acoustic guitar, piano, percussion), exact BPM, vocal description, energy, production style, key",
  "genre": "Primary genre",
  "mood": "Primary mood descriptors",
  "tempo": "BPM number or range",
  "vocalStyle": "Detailed vocal description",
  "instrumentation": "Comma-separated list of key instruments",
  "structure": ["list", "of", "section", "names", "in", "order"]
}`

export const SCENE_PROMPTS_GENERATION = (input: {
  title: string
  lyrics: string
  visualDirection: string
  aspectRatio: string
  audience: string
}) => `You are a creative director. Create a scene-by-scene visual storyboard for a music video.

Song title: "${input.title}"
Lyrics:
${input.lyrics}

Visual direction: ${input.visualDirection}
Aspect ratio: ${input.aspectRatio}
Audience: ${input.audience}

Rules:
- Create 1 scene per major section (Intro, each Verse, Chorus, Bridge, Outro)
- Each scene prompt must be a complete, detailed image generation prompt (50-80 words)
- Prompts must be self-contained (can be understood without other scenes)
- Keep visual style consistent across all scenes
- Match the visual to the specific lyrics of that section

Respond ONLY with valid JSON:
{
  "globalVisualStyle": "One-paragraph description of the consistent art style, color palette, character design for all scenes",
  "characters": "Description of recurring characters/subjects and consistency notes",
  "scenes": [
    {
      "order": 1,
      "lyricExcerpt": "Exact quote from the lyrics for this section",
      "description": "One sentence: what is happening visually in this scene",
      "prompt": "Full detailed image generation prompt — describe subject, setting, style, lighting, mood, composition in 50-80 words",
      "negativePrompt": "no text, no watermarks, no distorted faces, no extra fingers, no blurry faces",
      "aspectRatio": "${input.aspectRatio}",
      "textOverlay": "Short lyric phrase to overlay on image, or empty string",
      "composition": "Camera angle: wide shot / medium shot / close-up / bird's eye / etc."
    }
  ]
}

Aim for 5-8 scenes total. Make each prompt vivid and specific enough to generate a great image.`

export const EXPAND_IMAGE_PROMPTS = (descriptions: string[], style: string) =>
  `You are an expert image prompt engineer for AI image generators (Flux, Stable Diffusion, Midjourney).

Global visual style: "${style || "Colorful illustration, vibrant, clean composition, 16:9"}"

I have ${descriptions.length} short image descriptions. Expand EACH into a detailed, self-contained image generation prompt (40-70 words). Rules:
- Keep the core concept of each description exactly as intended
- Add specific details: lighting, color palette, composition, mood, art style
- Embed the global visual style naturally into every prompt
- Never add text, logos, or watermarks to the scene
- Keep cultural accuracy for country/character references
- Make each prompt work standalone without needing context from others

Short descriptions:
${descriptions.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Respond ONLY with valid JSON — an array of expanded prompts in the same order:
["expanded prompt 1", "expanded prompt 2", ...]`

export const IMPROVE_LYRICS_PROMPT = (lyrics: string, instruction: string) =>
  `You are a professional lyricist. ${instruction}

Current lyrics:
${lyrics}

Respond ONLY with the improved lyrics text (no JSON, no explanation). Keep section markers like [Verse 1], [Chorus] etc.`

export const REWRITE_LYRICS_PROMPT = (input: {
  originalLyrics: string
  targetLanguage: string
  adaptationStyle: "translate" | "adapt" | "rewrite"
  toneNotes: string
  stylePrompt: string
  audience?: string
}) => {
  const styleGuide =
    input.adaptationStyle === "translate"
      ? "Translate the lyrics as closely as possible to the target language. Keep the same meaning, metaphors, and emotion. Preserve section headers exactly (e.g. [Verse 1], [Chorus])."
      : input.adaptationStyle === "adapt"
      ? "Loosely adapt the lyrics to the target language. Keep the same song structure and emotional arc, but feel free to change idioms and phrases to feel natural in the target language."
      : "Write entirely new lyrics in the target language inspired by the original song's structure and theme. The words can be completely different but should match the rhythm and section layout."

  return `You are a professional lyricist and translator specializing in songs for AI music generation (Suno).

## Task
${styleGuide}

## Target Language
${input.targetLanguage}

## Music Style (for context)
${input.stylePrompt || "Not specified"}

## Audience
${input.audience || "General"}

## Additional Notes from User
${input.toneNotes || "None"}

## Original Lyrics
${input.originalLyrics}

## Rules
- ALWAYS keep the section headers exactly as in the original: [Intro], [Verse 1], [Chorus], [Bridge], [Outro], etc.
- Each line should have roughly the same number of syllables as the original for Suno to set it to music correctly.
- Write ONLY the new lyrics — no explanation, no commentary.
- Make every word singable and natural-sounding in ${input.targetLanguage}.
- If the original has repeated sections (e.g. Chorus appears 3 times), keep the same repetition count.`
}

export const SUNO_STYLE_PROMPT_TEMPLATE = (input: {
  genre: string
  mood: string
  tempo: string
  vocalStyle: string
  instrumentation: string
  avoid?: string
}) =>
  `${input.genre}, ${input.mood}, ${input.tempo}, ${input.vocalStyle} vocals, ${input.instrumentation}${input.avoid ? `, no ${input.avoid}` : ""}`
