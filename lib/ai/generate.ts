import OpenAI from "openai"
import {
  SONG_BRIEF_PROMPT,
  LYRICS_GENERATION_PROMPT,
  SCENE_PROMPTS_GENERATION,
  IMPROVE_LYRICS_PROMPT,
  EXPAND_IMAGE_PROMPTS,
  REWRITE_LYRICS_PROMPT,
} from "./prompts"

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"
const isMockMode = () =>
  process.env.MOCK_MODE === "true" ||
  !process.env.OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY === "your_openai_api_key_here"

let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

async function callLLM(prompt: string, model?: string): Promise<string> {
  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: model || OPENAI_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.9,
    max_tokens: 4096,
  })
  return response.choices[0]?.message?.content || "{}"
}

async function callLLMText(prompt: string): Promise<string> {
  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
    max_tokens: 2048,
  })
  return response.choices[0]?.message?.content || ""
}

// ── Dynamic mock generators (use actual user input) ──────────────────────────

function makeMockBrief(input: {
  prompt?: string
  language?: string
  targetLanguage?: string
  audience?: string
  mood?: string
  genre?: string
  vocalPreference?: string
  durationTarget?: string
  outputPurpose?: string
}) {
  const prompt = input.prompt || "a song"
  const genre = input.genre || "Pop"
  const mood = input.mood || "Happy"
  const audience = input.audience || "General"
  const vocal = input.vocalPreference || "Female Vocal"
  const lang = input.language || input.targetLanguage || "en"
  const purpose = input.outputPurpose || "YouTube Video"
  const duration = input.durationTarget || "2 minutes"

  // Derive a title from the first meaningful words of the prompt
  const words = prompt.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/)
  const titleWords = words.slice(0, 5).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  const baseTitle = titleWords.join(" ")

  return {
    titleSuggestions: [
      baseTitle,
      `The ${titleWords.slice(0, 3).join(" ")} Song`,
      `${mood.split(" ")[0]} ${titleWords[0] || "Melody"}`,
    ],
    concept: `A ${mood.toLowerCase()} ${genre.toLowerCase()} song for ${audience.toLowerCase()} based on the idea: "${prompt}". Designed for ${purpose.toLowerCase()}, targeting ${duration} in length with ${vocal.toLowerCase()} vocals.`,
    lyricalTheme: `The central theme explores the idea of: ${prompt}`,
    targetEmotion: mood.split(" ")[0],
    structure: ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus", "Outro"],
    recommendedStyle: `${genre}, ${mood.toLowerCase()} mood, ${vocal.toLowerCase()}, clear and catchy production, ${duration} duration, suitable for ${purpose.toLowerCase()}`,
    visualDirection: `Visual scenes matching the theme of "${prompt}". Style should feel ${mood.toLowerCase()}, appropriate for ${audience.toLowerCase()}, using colors and imagery that match a ${genre.toLowerCase()} aesthetic.`,
  }
}

function makeMockLyrics(input: {
  brief?: string
  title?: string
  language?: string
  mood?: string
  genre?: string
  vocalStyle?: string
  durationTarget?: string
  style?: string
}) {
  const title = input.title || "My Song"
  const genre = input.genre || "Pop"
  const mood = input.mood || "Happy"
  const vocal = input.vocalStyle || "Female Vocal"
  const style = input.style || `${genre}, ${mood}`

  const lyrics = `[Intro]
This is a ${mood.toLowerCase()} song about: ${input.brief || title}
Let's begin, feel the beat, here we go!

[Verse 1]
(✏️ Edit this verse — write your first idea here)
Every word and every line,
Tells the story, feels just fine.
Start with something simple, true,
Something meant for me and you.

[Chorus]
${title}, ${title}!
Feel the rhythm, feel the sound,
${title}, ${title}!
Let this music turn around!

[Verse 2]
(✏️ Edit this verse — continue the story here)
Building up the second part,
Putting feelings, soul and heart.
Every note and every beat,
Makes this song feel so complete.

[Chorus]
${title}, ${title}!
Feel the rhythm, feel the sound,
${title}, ${title}!
Let this music turn around!

[Bridge]
(✏️ Edit this bridge — add a twist or emotional peak)
Something changes, something new,
A different perspective coming through.

[Outro]
${title}... fading out,
That's what this song is all about.`

  return {
    title,
    lyrics,
    stylePrompt: style || `${genre}, ${mood.toLowerCase()} mood, ${vocal.toLowerCase()}, catchy and clear`,
    genre,
    mood,
    tempo: "120 BPM",
    vocalStyle: vocal,
    instrumentation: "Piano, acoustic guitar, light percussion",
    structure: ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Outro"],
  }
}

function makeMockScenes(input: { title?: string; lyrics?: string; visualDirection?: string; aspectRatio?: string; audience?: string }) {
  const title = input.title || "My Song"
  const ar = input.aspectRatio || "16:9"
  const audience = input.audience || "General"
  const visual = input.visualDirection || `visuals that match the theme of "${title}"`

  const sections = ["Intro", "Verse 1", "Chorus", "Verse 2", "Bridge"]

  return {
    globalVisualStyle: `Visuals for "${title}": ${visual}. Style appropriate for ${audience}.`,
    characters: `Characters or visual subjects relevant to the theme of the song "${title}".`,
    scenes: sections.map((section, i) => ({
      order: i + 1,
      lyricExcerpt: `[${section}] — edit this lyric excerpt`,
      description: `Scene ${i + 1}: visual representation of the ${section.toLowerCase()} section`,
      prompt: `${visual}, scene ${i + 1} for the ${section.toLowerCase()}, high quality illustration, ${ar} composition, clean background, no text overlay, suitable for ${audience}`,
      negativePrompt: "no distorted faces, no extra fingers, no watermarks, no unreadable text",
      aspectRatio: ar,
      textOverlay: section === "Chorus" ? title : "",
      composition: i === 0 ? "Wide establishing shot" : i % 2 === 0 ? "Medium shot" : "Close-up detail shot",
    })),
  }
}

const _MOCK_SCENES_PLACEHOLDER = {
  globalVisualStyle: "",
  characters: "",
  scenes: [
    {
      order: 1,
      lyricExcerpt: "",
      description: "",
      prompt: "",
      negativePrompt: "no distorted faces, no extra fingers, no text, no watermarks",
      aspectRatio: "16:9",
      textOverlay: "",
      composition: "Wide shot",
    },
  ],
}

export async function generateSongBrief(input: Parameters<typeof SONG_BRIEF_PROMPT>[0] & { targetLanguage?: string }) {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 1200))
    return makeMockBrief(input)
  }

  const prompt = SONG_BRIEF_PROMPT(input)
  const raw = await callLLM(prompt)
  return JSON.parse(raw)
}

export async function generateLyrics(input: Parameters<typeof LYRICS_GENERATION_PROMPT>[0]) {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 1500))
    return makeMockLyrics(input)
  }

  const openai = getOpenAI()
  const prompt = LYRICS_GENERATION_PROMPT(input)
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an award-winning songwriter and lyricist. You write complete, creative, high-quality song lyrics that are fun to sing. You always write REAL lyrics — never placeholders or descriptions. You respond only with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.92,
    max_tokens: 4096,
  })
  const raw = response.choices[0]?.message?.content || "{}"
  return JSON.parse(raw)
}

export async function generateScenePrompts(input: Parameters<typeof SCENE_PROMPTS_GENERATION>[0]) {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 1500))
    return makeMockScenes(input)
  }

  const prompt = SCENE_PROMPTS_GENERATION(input)
  const raw = await callLLM(prompt)
  return JSON.parse(raw)
}

export async function rewriteLyrics(
  input: Parameters<typeof REWRITE_LYRICS_PROMPT>[0]
): Promise<string> {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 1500))
    return `[Mock rewritten lyrics in ${input.targetLanguage}]\n\n${input.originalLyrics}`
  }
  const prompt = REWRITE_LYRICS_PROMPT(input)
  return callLLMText(prompt)
}

export async function expandImagePrompts(descriptions: string[], style: string): Promise<string[]> {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 1200))
    return descriptions.map(
      (d) => `${d}, ${style || "colorful illustration, vibrant, clean composition, 16:9"}, no text overlay, cinematic`
    )
  }

  const prompt = EXPAND_IMAGE_PROMPTS(descriptions, style)
  const raw = await callLLM(prompt)
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error("Unexpected response from AI")
  return parsed as string[]
}

export async function improveLyrics(lyrics: string, instruction: string): Promise<string> {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, 1200))
    return lyrics + "\n\n[Improved with: " + instruction + "]"
  }

  const prompt = IMPROVE_LYRICS_PROMPT(lyrics, instruction)
  return callLLMText(prompt)
}
