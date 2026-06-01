# MusicStudio AI 🎵

An AI creative studio for generating songs, lyrics, music style prompts, images, and video assets from a single idea. Built to help content creators, teachers, marketers, and casual creators produce music videos ready for CapCut editing.

## Features

- 🎵 **AI Song Brief** — Turn a prompt into a full song concept
- ✍️ **AI Lyrics Generation** — Full structured lyrics in any language
- 🎸 **Suno Style Prompts** — AI-generated style prompts optimized for Suno
- 🖼️ **Visual Storyboard** — Scene-by-scene image prompt planning
- 🎨 **Image Generation** — Kie.ai-powered scene images
- 🎧 **Music Generation** — Kie.ai Suno API integration
- 🎬 **Video Generation** — Optional video clips or slideshow assembly
- 📦 **CapCut Asset Pack** — One ZIP with everything for CapCut editing
- 💰 **Cost Dashboard** — Track per-generation costs by provider/model
- 🎭 **Mock Mode** — Full workflow preview without real API keys

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v3**
- **shadcn/ui** components
- **React Hook Form** + **Zod** validation
- **Prisma ORM** + **PostgreSQL**
- **Kie.ai** provider adapter (music, images, video)
- **OpenAI** for text generation (lyrics, scenes, briefs)
- **JSZip** for asset pack generation
- **Sonner** for toast notifications
- **Recharts** for cost analytics

## Setup

### 1. Install dependencies

```bash
cd music-studio
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Required for database
DATABASE_URL=postgresql://user:password@localhost:5432/music_studio

# For AI text generation (lyrics, scene prompts)
OPENAI_API_KEY=sk-...

# For music & image generation
KIE_API_KEY=your_kie_api_key
KIE_BASE_URL=https://api.kie.ai

# Set to false when you have real API keys
MOCK_MODE=true
```

### 3. Set up database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Mock Mode

The app runs in mock mode by default (`MOCK_MODE=true`). In mock mode:

- Song brief generation returns example data
- Lyrics generation returns example lyrics
- Music generation returns a public sample audio file
- Image generation returns placeholder images from picsum.photos
- No real API costs are incurred
- All UI flows work end-to-end

To enable mock mode explicitly:
```env
MOCK_MODE=true
```

To disable and use real APIs:
```env
MOCK_MODE=false
OPENAI_API_KEY=your-key
KIE_API_KEY=your-key
```

## Configuring Kie.ai Models

Update these environment variables to configure which models are used:

```env
KIE_SUNO_MODEL=suno-v4        # or suno-v3
KIE_IMAGE_MODEL=flux-1.1-pro  # or flux-schnell, stable-diffusion-xl
KIE_VIDEO_MODEL=kling-v1.5    # or kling-v1
```

## Adding Real Provider Endpoints

The Kie.ai adapter is in `lib/kie/`:

- `lib/kie/client.ts` — Base HTTP client
- `lib/kie/music.ts` — Music generation adapter
- `lib/kie/image.ts` — Image generation adapter
- `lib/kie/video.ts` — Video generation adapter
- `lib/kie/mock.ts` — Mock implementations
- `lib/kie/types.ts` — Shared type definitions

To add a new provider:
1. Create `lib/kie/new-provider.ts`
2. Implement the same interface as the existing adapters
3. Update the relevant route handlers in `app/api/kie/`

## Updating Pricing

Edit `lib/cost/pricing.ts` to update cost estimates:

```typescript
export const PRICING_CONFIG = {
  music: {
    "suno-v4": { perTrack: 0.05, currency: "USD" },
  },
  image: {
    "flux-1.1-pro": { perImage: 0.04, currency: "USD" },
  },
  // ...
}
```

## Project Structure

```
music-studio/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/          # Dashboard overview page
│   │   ├── projects/           # Projects list + detail
│   │   ├── create/             # 7-step creation wizard
│   │   └── settings/           # API config & settings
│   ├── api/
│   │   ├── ai/                 # OpenAI text generation routes
│   │   ├── kie/                # Kie.ai provider routes
│   │   └── asset-pack/         # ZIP pack creation
│   └── page.tsx                # Landing page
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Sidebar, header
│   └── create-flow/            # 7-step wizard components
├── lib/
│   ├── ai/                     # OpenAI integration + prompts
│   ├── kie/                    # Kie.ai provider adapters
│   ├── cost/                   # Cost tracking + pricing
│   ├── db/                     # Prisma client
│   └── validators/             # Zod schemas
└── prisma/
    └── schema.prisma           # Database schema
```

## Deploying on Vercel

1. Push to a GitHub repository
2. Import project in Vercel
3. Set all environment variables in Vercel dashboard
4. Deploy

For the database, use:
- [Supabase](https://supabase.com) (free tier)
- [Neon](https://neon.tech) (serverless Postgres)
- [Railway](https://railway.app)

```bash
# After deploying, run migrations
npx prisma migrate deploy
```

## Implementation Phases

### Phase 1 & 2 (Implemented)
- [x] Landing page
- [x] Dashboard shell
- [x] 7-step create flow UI
- [x] Database schema (Prisma)
- [x] Mock generation for all steps
- [x] Real LLM generation (OpenAI)
- [x] Kie.ai adapter layer
- [x] Music generation (Suno via Kie.ai)
- [x] Image generation (Flux via Kie.ai)
- [x] Status polling for jobs
- [x] Asset pack ZIP download
- [x] Cost estimation display

### Phase 3 (Ready to implement)
- [ ] Real database project persistence
- [ ] Webhook processing from Kie.ai
- [ ] Full cost dashboard with charts
- [ ] Project detail page with full history

### Phase 4 (Scaffold ready)
- [ ] Video generation (Mode A: Kie.ai)
- [ ] Slideshow assembly (Mode B: local)
- [ ] Remotion/FFmpeg integration
- [ ] Timeline preview editor

## Content Safety

All generated content is original and AI-authored. The system:
- Does not imitate specific living artists
- Does not reproduce copyrighted lyrics
- Validates input for appropriateness
- Allows content style inspiration (not imitation)

## License

MIT — Built for creative use only.
