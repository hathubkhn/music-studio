#!/usr/bin/env node
/**
 * Bulk song generator — calls Kie.ai Suno API directly.
 * Usage:
 *   node scripts/generate-songs.mjs          (test song #1 only)
 *   node scripts/generate-songs.mjs --all    (generate all songs)
 */
import fs from "fs"
import path from "path"
import https from "https"
import http from "http"

const KIE_API_KEY = "63022c2c39f14dd72d520d5ecd541b7e"
const KIE_BASE    = "https://api.kie.ai"
const MODEL       = "V5_5"
const OUT_DIR     = path.resolve("./songs-output")

const songs = [
  {
    num:   2,
    slug:  "when-you-were-mine",
    title: "When You Were Mine",
    style: "Original AI romantic ballad, emotional female vocal, cinematic piano and strings, slow heartbreaking love song, nostalgic mood, soft drums, emotional chorus, warm reverb, sad but beautiful atmosphere",
    lyrics: `[Intro]
When you were mine
The world felt kind
Now every sunrise
Leaves you behind

[Verse 1]
I remember summer nights
Your hand was close to mine
We were young and full of dreams
Dancing past the warning signs

You said forever softly
Like forever could not break
But even golden promises
Can turn into mistakes

[Pre-Chorus]
Now I keep the memories
Like letters never sent
Trying to understand
Where all the love went

[Chorus]
When you were mine
Every road led back to home
Every song had your heartbeat
I was never on my own

When you were mine
Even silence felt alive
Now I'm learning how to breathe
With your ghost still by my side

[Verse 2]
I don't blame the falling rain
I don't blame the changing sky
Sometimes love can lose its way
Even when two hearts still try

I see your face in crowded rooms
Then it fades before my eyes
Like a candle in the wind
Like a truth dressed up as lies

[Pre-Chorus]
Now I keep the memories
Like stars I cannot touch
Maybe losing you
Is loving you too much

[Chorus]
When you were mine
Every road led back to home
Every song had your heartbeat
I was never on my own

When you were mine
Even silence felt alive
Now I'm learning how to breathe
With your ghost still by my side

[Bridge]
If I could turn back all the time
I'd hold you closer in the light
But love is not a place we own
Sometimes hearts must walk alone

[Final Chorus]
When you were mine
I believed in everything
Now I wear the quiet nights
Like a broken silver ring

When you were mine
I was yours beyond the end
And if love remembers me
I would choose you once again

[Outro]
When you were mine
The world felt kind`,
  },
  {
    num:   3,
    slug:  "stay-one-more-night",
    title: "Stay One More Night",
    style: "Emotional AI love song 2026, soft male and female duet, cinematic piano ballad, romantic slow pop, strings, emotional build-up, rainy night atmosphere, heartfelt chorus",
    lyrics: `[Intro]
Stay one more night
Before the morning comes
Before the quiet takes
What we were running from

[Verse 1 – Male]
I see goodbye inside your eyes
But your hand still holds mine
We've been standing at the edge
Between the dark and light

[Verse 2 – Female]
I know we said we'd walk away
Before we fall apart
But every step I try to take
Still leads me to your heart

[Pre-Chorus – Both]
So let the world wait outside
Let the rain fall down
For one more breath, one more touch
Let love make a sound

[Chorus – Both]
Stay one more night
Hold me like we're not broken
Say one more line
Leave the truth unspoken

Stay one more night
Till the stars fade out of sight
If tomorrow takes you away
Love me one more night

[Verse 3 – Male]
The room is full of memories
We never learned to say
Every dream we almost had
Still refuses to fade

[Verse 4 – Female]
I don't need a promise now
I don't need a reason why
Just a little more of us
Before we say goodbye

[Pre-Chorus – Both]
So let the world wait outside
Let the rain fall down
For one more breath, one more touch
Let love make a sound

[Chorus – Both]
Stay one more night
Hold me like we're not broken
Say one more line
Leave the truth unspoken

Stay one more night
Till the stars fade out of sight
If tomorrow takes you away
Love me one more night

[Bridge – Both]
Maybe we were fire
Maybe we were rain
Maybe love is beautiful
Even through the pain

[Final Chorus – Both]
Stay one more night
Hold me like we're forever
Even if the sunrise
Pulls our hearts together

Stay one more night
Till the stars fade out of sight
If tomorrow takes you away
Love me one more night

[Outro]
Stay one more night
Before the morning comes`,
  },
  {
    num:   4,
    slug:  "echoes-of-your-heart",
    title: "Echoes of Your Heart",
    style: "Sad romantic ballad, emotional AI vocal, cinematic piano, soft orchestral strings, melancholic love song, slow tempo, deep emotional chorus, atmospheric night visuals, original heartbreak lyrics",
    lyrics: `[Intro]
I hear echoes
Echoes of your heart
Calling through the distance
Tearing me apart

[Verse 1]
The room still feels like yesterday
Your laughter on the wall
I try to fill the empty space
But I can't fill it all

The clock keeps moving endlessly
But I'm still standing here
Holding on to memories
That never disappear

[Pre-Chorus]
Every word we never said
Still lives inside the dark
And every lonely midnight
Carries echoes of your heart

[Chorus]
Echoes of your heart
They follow me tonight
Like a song without an ending
Like a star without a light

Echoes of your heart
Still whisper through the rain
I lost you in the silence
But I feel you in the pain

[Verse 2]
I walk beneath the city lights
Pretending I'm okay
But every face becomes your face
Then slowly fades away

I wonder if you think of me
When evening turns to blue
Or if the love we left behind
Still speaks inside of you

[Pre-Chorus]
Every dream we never lived
Still leaves a little mark
And every lonely midnight
Carries echoes of your heart

[Chorus]
Echoes of your heart
They follow me tonight
Like a song without an ending
Like a star without a light

Echoes of your heart
Still whisper through the rain
I lost you in the silence
But I feel you in the pain

[Bridge]
If love could cross the ocean
If time could bend and start
I'd find you in the silence
And follow back your heart

[Final Chorus]
Echoes of your heart
They never let me go
Like a fire under ashes
Like a river under snow

Echoes of your heart
Still whisper through the rain
I lost you in the silence
But I love you just the same

[Outro]
I hear echoes
Echoes of your heart`,
  },
  {
    num:   5,
    slug:  "before-the-last-goodbye",
    title: "Before the Last Goodbye",
    style: "Emotional piano love song, cinematic romantic ballad, soft female vocal, sad breakup song, gentle strings, slow emotional build, heartfelt chorus, rain and sunset atmosphere",
    lyrics: `[Intro]
Before the last goodbye
Before the final tear
Let me hold the memory
Of when you were still here

[Verse 1]
We said we'd never reach this place
But here we are tonight
Standing in the fading glow
Of a love that lost its light

Your suitcase by the doorway
My heart still on the floor
I know you have to leave now
But I keep wanting more

[Pre-Chorus]
Just one more look
Just one more smile
Let me pretend
For a little while

[Chorus]
Before the last goodbye
Let the world stop turning
Before the final sky
Let this love keep burning

Before you walk away
Before the tears run dry
Hold me like you need me
Before the last goodbye

[Verse 2]
I'll keep the songs we used to sing
Inside a quiet place
I'll keep the way you said my name
Like sunlight on my face

Maybe years from now we'll smile
At all we couldn't save
But tonight I'm just a heart
Trying to be brave

[Pre-Chorus]
Just one more look
Just one more smile
Let me pretend
For a little while

[Chorus]
Before the last goodbye
Let the world stop turning
Before the final sky
Let this love keep burning

Before you walk away
Before the tears run dry
Hold me like you need me
Before the last goodbye

[Bridge]
I won't ask you to stay
I won't ask why we changed
But some love leaves slowly
Like rain on a windowpane

[Final Chorus]
Before the last goodbye
Let me love you softly
Before the final sky
Let the night still want me

Before you walk away
Before the tears run dry
Hold me like you need me
Before the last goodbye

[Outro]
Before the last goodbye
Before the final tear`,
  },
  {
    num:   6,
    slug:  "in-another-life",
    title: "In Another Life",
    style: "Original AI love ballad, emotional male vocal, cinematic piano and strings, slow romantic song, bittersweet lyrics, dreamy atmosphere, soft drums, emotional chorus, suitable for YouTube emotional music",
    lyrics: `[Intro]
In another life
Maybe we don't say goodbye
Maybe time is on our side
In another life

[Verse 1]
We met beneath a restless sky
Two hearts afraid to fall
You were looking for forever
I was scared to give my all

Now I see it clearly
All the things I didn't say
Love was standing right in front of me
And I let it walk away

[Pre-Chorus]
If the stars could rearrange
If the world could start again
I would find you in the crowd
And never lose you then

[Chorus]
In another life
I would love you better
I would hold you through the storm
I would stay through every weather

In another life
You would still be mine
Maybe we were meant to meet
But not in this time

[Verse 2]
I keep your name inside a prayer
I never speak out loud
You became the quiet song
That follows me around

I hope you found a kinder road
I hope your dreams came true
Even if I'm not the one
Walking next to you

[Pre-Chorus]
If the stars could rearrange
If the world could start again
I would find you in the crowd
And never lose you then

[Chorus]
In another life
I would love you better
I would hold you through the storm
I would stay through every weather

In another life
You would still be mine
Maybe we were meant to meet
But not in this time

[Bridge]
Some hearts meet too early
Some hearts learn too late
Some love becomes a memory
Too beautiful to hate

[Final Chorus]
In another life
I would never let you go
I would tell you every feeling
That I was too afraid to show

In another life
You would still be mine
Maybe we were meant to love
But not in this time

[Outro]
In another life
Maybe we don't say goodbye`,
  },
  {
    num:   7,
    slug:  "rain-on-my-window",
    title: "Rain on My Window",
    style: "Emotional sad love song, soft AI female vocal, cinematic piano, ambient rain sound, gentle strings, slow pop ballad, lonely night mood, heartbreaking chorus, original lyrics",
    lyrics: `[Intro]
Rain on my window
Your name in my mind
The night keeps asking
Why you left me behind

[Verse 1]
I make coffee for one now
In the morning light
The chair across the table
Still feels yours tonight

I try to change the music
But every melody
Finds a way to break me
With your memory

[Pre-Chorus]
And I don't know how
To let the silence win
When every drop of rain
Brings you back again

[Chorus]
There's rain on my window
And pain in my chest
I gave you my forever
But love gave me less

There's rain on my window
And tears I can't hide
I'm learning how to miss you
One night at a time

[Verse 2]
The city keeps on moving
Like nothing disappeared
But I lost a whole world
When you were no longer here

Maybe you are happy
Maybe you are free
Maybe that should help me
But it doesn't comfort me

[Pre-Chorus]
And I don't know how
To let the silence win
When every drop of rain
Brings you back again

[Chorus]
There's rain on my window
And pain in my chest
I gave you my forever
But love gave me less

There's rain on my window
And tears I can't hide
I'm learning how to miss you
One night at a time

[Bridge]
If the clouds could carry wishes
I would send one to your door
Not to ask you to return
Just to love me like before

[Final Chorus]
There's rain on my window
And your ghost in the light
I still reach for your shadow
In the middle of the night

There's rain on my window
And tears I can't hide
I'm learning how to miss you
One night at a time

[Outro]
Rain on my window
Your name in my mind`,
  },
  {
    num:   8,
    slug:  "if-love-finds-us-again",
    title: "If Love Finds Us Again",
    style: "Cinematic romantic ballad, emotional AI duet, soft piano, warm strings, hopeful love song, slow pop, emotional build, dreamy atmosphere, original lyrics, romantic YouTube music",
    lyrics: `[Intro]
If love finds us again
Somewhere down the road
I'll meet you with an open heart
And never let you go

[Verse 1]
We were young and full of fire
Running faster than the rain
We thought love was only easy
We didn't understand the pain

Every word we left unfinished
Every promise left behind
Still keeps glowing in the distance
Like a candle in my mind

[Pre-Chorus]
Maybe time will heal the places
Where our hearts were torn in two
Maybe someday I'll be ready
Maybe I'll be ready for you

[Chorus]
If love finds us again
I won't be afraid
I will hold you through the thunder
I will stay when skies turn gray

If love finds us again
After all the tears and pain
Maybe what we lost before
Can come alive again

[Verse 2]
I have walked through different seasons
I have learned to stand alone
But a part of me still wonders
If your heart still feels like home

I don't want to chase the past now
I don't want to force the light
But if destiny remembers
I will meet you there tonight

[Pre-Chorus]
Maybe time will heal the places
Where our hearts were torn in two
Maybe someday I'll be ready
Maybe I'll be ready for you

[Chorus]
If love finds us again
I won't be afraid
I will hold you through the thunder
I will stay when skies turn gray

If love finds us again
After all the tears and pain
Maybe what we lost before
Can come alive again

[Bridge]
No more running from the feeling
No more hiding from the truth
If the road leads back together
I will walk it back to you

[Final Chorus]
If love finds us again
I will know what love is worth
I will choose you in the silence
I will choose you in the hurt

If love finds us again
After all the tears and pain
Maybe what we lost before
Can come alive again

[Outro]
If love finds us again
I'll never let you go`,
  },
  {
    num:   9,
    slug:  "the-night-we-let-go",
    title: "The Night We Let Go",
    style: "Emotional breakup song, cinematic piano ballad, soft male vocal, sad romantic lyrics, orchestral strings, slow tempo, dramatic emotional chorus, night atmosphere, original AI ballad",
    lyrics: `[Intro]
The night we let go
The stars lost their glow
We said it was over
But my heart didn't know

[Verse 1]
Your hand slipped slowly out of mine
Like autumn leaves from trees
We stood beneath the streetlight
Too broken to believe

You said we tried our best now
I said I understood
But love was still inside me
Doing all it could

[Pre-Chorus]
I watched you turn away
I watched the silence grow
And everything changed forever
The night we let go

[Chorus]
The night we let go
I lost more than you
I lost the future we dreamed of
I lost the life we knew

The night we let go
The whole world moved too slow
You walked away from us
But my heart couldn't let go

[Verse 2]
I still pass by that corner
Where we said our last goodbye
I tell myself I'm stronger
But I still wonder why

Maybe love is not enough
Maybe timing broke the flame
Maybe two hearts can be honest
And still not stay the same

[Pre-Chorus]
I watched you turn away
I watched the silence grow
And everything changed forever
The night we let go

[Chorus]
The night we let go
I lost more than you
I lost the future we dreamed of
I lost the life we knew

The night we let go
The whole world moved too slow
You walked away from us
But my heart couldn't let go

[Bridge]
I don't hate the ending
I don't hate the tears
I only hate the distance
Growing through the years

[Final Chorus]
The night we let go
I learned how love can ache
How even gentle endings
Can leave a heart to break

The night we let go
The whole world moved too slow
You walked away from us
But my heart couldn't let go

[Outro]
The night we let go
The stars lost their glow`,
  },
  {
    num:   10,
    slug:  "still-waiting-for-you",
    title: "Still Waiting for You",
    style: "Emotional AI romantic ballad, soft female vocal, cinematic piano and strings, slow hopeful love song, gentle drums, emotional chorus, dreamy sunset and rain atmosphere, original lyrics, YouTube love music",
    lyrics: `[Intro]
I'm still waiting for you
Where the old dreams stay
Where the sky turns gold
At the end of the day

[Verse 1]
I know the world keeps moving on
And seasons change their names
But something in my heart remains
A quiet little flame

I don't count the lonely nights
I don't ask the moon for signs
But every road I walk alone
Still feels close to yours and mine

[Pre-Chorus]
Maybe I should let it fade
Maybe I should start anew
But every time I close my eyes
I'm still waiting for you

[Chorus]
I'm still waiting for you
Where the rain meets the light
Where the memories are soft
And the stars still shine bright

I'm still waiting for you
Though I know you may not come
Some loves never disappear
Even when they're done

[Verse 2]
I keep your letter in a box
Beside the life I made
Not because I cannot heal
But some colors never fade

I hope you found your morning sun
I hope your heart is free
And maybe if you think of love
You think a little bit of me

[Pre-Chorus]
Maybe I should let it fade
Maybe I should start anew
But every time I close my eyes
I'm still waiting for you

[Chorus]
I'm still waiting for you
Where the rain meets the light
Where the memories are soft
And the stars still shine bright

I'm still waiting for you
Though I know you may not come
Some loves never disappear
Even when they're done

[Bridge]
Waiting doesn't mean I'm broken
Waiting doesn't mean I'm lost
Some hearts keep a little window
Open at any cost

[Final Chorus]
I'm still waiting for you
In a quiet part of me
Where the love we almost saved
Still becomes a melody

I'm still waiting for you
Though I know you may not come
Some loves never disappear
Even when they're done

[Outro]
I'm still waiting for you
Where the old dreams stay`,
  },
]

// ─── helpers ────────────────────────────────────────────────────────────────

function kiePost(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const options = {
      hostname: "api.kie.ai",
      path,
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${KIE_API_KEY}`,
        "Content-Length": Buffer.byteLength(payload),
      },
    }
    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", (c) => (data += c))
      res.on("end", () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(new Error(`Bad JSON: ${data}`)) }
      })
    })
    req.on("error", reject)
    req.write(payload)
    req.end()
  })
}

function kieGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.kie.ai",
      path,
      method:  "GET",
      headers: { "Authorization": `Bearer ${KIE_API_KEY}` },
    }
    https.get(options, (res) => {
      let data = ""
      res.on("data", (c) => (data += c))
      res.on("end", () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(new Error(`Bad JSON: ${data}`)) }
      })
    }).on("error", reject)
  })
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http
    const file  = fs.createWriteStream(dest)
    proto.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        fs.unlinkSync(dest)
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject)
      }
      res.pipe(file)
      file.on("finish", () => file.close(resolve))
    }).on("error", (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function pollStatus(taskId, timeoutMs = 10 * 60 * 1000) {
  const start = Date.now()
  let networkFailures = 0
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await kieGet(`/api/v1/generate/record-info?taskId=${taskId}`)
      networkFailures = 0
      const d      = res.data ?? res
      const status = d.status ?? ""
      const tracks = d.response?.sunoData ?? []

      console.log(`  ↳ status: ${status}  tracks: ${tracks.length}  errorMsg: ${d.errorMessage ?? ""}`)

      if (["SUCCESS", "FIRST_SUCCESS"].includes(status) && tracks.some(t => t.audioUrl || t.sourceAudioUrl)) {
        return { ok: true, tracks }
      }
      if (status === "CREATE_TASK_FAILED" || d.errorMessage) {
        return { ok: false, error: d.errorMessage || status }
      }
    } catch (err) {
      networkFailures++
      const msg = err?.message ?? String(err)
      console.warn(`  ⚠ Network error (attempt ${networkFailures}): ${msg.slice(0, 80)}`)
      if (networkFailures >= 5) return { ok: false, error: `Network error after 5 retries: ${msg}` }
      // Exponential back-off: 10s, 20s, 40s …
      await sleep(10000 * Math.pow(2, networkFailures - 1))
      continue
    }
    await sleep(6000)
  }
  return { ok: false, error: "Timeout after 10 minutes" }
}

async function generateSong(song) {
  console.log(`\n🎵 [${song.num}] ${song.title}`)
  const folderNum  = String(song.num).padStart(2, "0")
  const folderName = `${folderNum}-${song.slug}`
  const folderPath = path.join(OUT_DIR, folderName)
  fs.mkdirSync(folderPath, { recursive: true })

  // Skip if audio already downloaded
  const existing = fs.readdirSync(folderPath).filter(f => f.startsWith("audio"))
  if (existing.length > 0) {
    console.log(`  ⏭ Already done (${existing.join(", ")}) — skipping`)
    return { ok: true, song }
  }

  // Save lyrics immediately
  const lyricsPath = path.join(folderPath, "lyrics.txt")
  fs.writeFileSync(lyricsPath, `${song.title}\n${"=".repeat(song.title.length)}\n\nStyle: ${song.style}\n\n${song.lyrics}`)
  console.log(`  ✓ lyrics saved → ${lyricsPath}`)

  // Submit generation
  const genRes = await kiePost("/api/v1/generate", {
    prompt:       song.lyrics,
    style:        song.style,
    title:        song.title.slice(0, 100),
    customMode:   true,
    instrumental: false,
    model:        MODEL,
    callBackUrl:  "https://music-studio-nine.vercel.app/api/kie/webhook",
    negativeTags: "",
  })

  const taskId = genRes.data?.taskId
  if (!taskId) {
    console.error(`  ✗ No taskId — response:`, JSON.stringify(genRes))
    fs.writeFileSync(path.join(folderPath, "error.txt"), JSON.stringify(genRes, null, 2))
    return { ok: false, song }
  }
  console.log(`  → taskId: ${taskId}`)
  fs.writeFileSync(path.join(folderPath, "taskId.txt"), taskId)

  // Poll
  const result = await pollStatus(taskId)
  if (!result.ok) {
    console.error(`  ✗ Generation failed: ${result.error}`)
    fs.writeFileSync(path.join(folderPath, "error.txt"), result.error)
    return { ok: false, song, error: result.error }
  }

  // Download all tracks (with retry)
  const tracks = result.tracks.filter(t => t.audioUrl || t.sourceAudioUrl)
  for (let i = 0; i < tracks.length; i++) {
    const t   = tracks[i]
    const url = t.audioUrl || t.sourceAudioUrl
    const ext = url.split("?")[0].split(".").pop() || "mp3"
    const filename = tracks.length === 1 ? `audio.${ext}` : `audio-${i + 1}.${ext}`
    const dest = path.join(folderPath, filename)
    console.log(`  ⬇ Downloading track ${i + 1}: ${url.slice(0, 80)}…`)
    let downloaded = false
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await downloadFile(url, dest)
        downloaded = true
        break
      } catch (err) {
        console.warn(`  ⚠ Download attempt ${attempt} failed: ${err?.message?.slice(0, 60)}`)
        if (attempt < 3) await sleep(5000 * attempt)
      }
    }
    if (!downloaded) {
      console.error(`  ✗ Could not download track ${i + 1} after 3 attempts — URL saved to metadata`)
    } else {
      console.log(`  ✓ saved → ${dest}`)
    }
  }

  // Write metadata
  const meta = {
    taskId,
    title: song.title,
    model: MODEL,
    tracks: tracks.map(t => ({
      id:       t.id,
      audioUrl: t.audioUrl || t.sourceAudioUrl,
      duration: t.duration,
      imageUrl: t.imageUrl,
      tags:     t.tags,
    })),
  }
  fs.writeFileSync(path.join(folderPath, "metadata.json"), JSON.stringify(meta, null, 2))
  console.log(`  ✓ metadata saved`)
  return { ok: true, song }
}

// ─── main ───────────────────────────────────────────────────────────────────

const runAll = process.argv.includes("--all")
const toRun  = runAll ? songs : [songs[0]]

fs.mkdirSync(OUT_DIR, { recursive: true })
console.log(`\n🚀 Generating ${toRun.length} song(s) with model ${MODEL}`)
console.log(`📁 Output: ${OUT_DIR}\n`)

const results = []
for (const song of toRun) {
  const r = await generateSong(song)
  results.push(r)
  if (!runAll && !r.ok) {
    console.error("\nTest song failed — check error above before running --all")
    process.exit(1)
  }
  // Brief pause between submissions to be polite to the API
  if (runAll && song !== toRun.at(-1)) await sleep(3000)
}

console.log("\n─────────────────────────────────────────")
console.log("📊 Summary")
for (const r of results) {
  const icon = r.ok ? "✅" : "❌"
  console.log(`  ${icon} [${r.song.num}] ${r.song.title}${r.ok ? "" : `  → ${r.error}` }`)
}
console.log(`\n📁 All files saved to: ${OUT_DIR}`)
