# [20] Remotion Skill Design

> **Status:** Complete — awaiting review
> **Date:** 2026-03-19
> **Approach:** Template-Driven Pipeline (Approach A)

## 1. Overview

Claude Code skill for short-form and marketing video creation with Remotion. Enables founders to generate, preview, and render branded video content directly from Claude Code using the Remotion framework — React components driven by frame-based animation.

**Target use cases:**
- **Social content factory:** Reels, stories, quote cards, listicles for LinkedIn/X/Instagram
- **Marketing assets:** Product demos, testimonials, explainer videos, pitch highlights

**Core principle:** Composition-per-template. Each video type is a React composition with typed props. FOS generates the props from user input + brand kit, renders locally via Remotion CLI, and optionally uploads via the existing media-handler-agent pipeline.

## 2. Architecture

### 2.1 Managed Remotion Project

A self-contained Remotion project scaffolded once via `video:init` at a configurable path (default: `~/.founder-os/video-studio/`). The user never needs to touch it directly.

```
~/.founder-os/video-studio/
  ├── src/
  │   ├── Root.tsx              # Composition registry (all templates registered here)
  │   ├── templates/            # One React component per template
  │   │   ├── SocialReel.tsx
  │   │   ├── SocialQuote.tsx
  │   │   ├── SocialListicle.tsx
  │   │   ├── SocialBeforeAfter.tsx
  │   │   ├── ProductDemo.tsx
  │   │   ├── Testimonial.tsx
  │   │   ├── Explainer.tsx
  │   │   └── PitchHighlight.tsx
  │   ├── components/           # Shared building blocks
  │   │   ├── TextOverlay.tsx   # Animated text with brand fonts
  │   │   ├── Logo.tsx          # Logo placement with animation
  │   │   ├── SlideTransition.tsx
  │   │   ├── LowerThird.tsx    # Name/title bar
  │   │   ├── NumberCounter.tsx # Animated stat counter
  │   │   └── ProgressBar.tsx   # Video progress indicator
  │   ├── hooks/
  │   │   ├── useBrandKit.ts    # Reads brand-kit.json, provides colors/fonts/logos
  │   │   └── useAsset.ts       # Resolves asset paths with validation
  │   └── lib/
  │       ├── timing.ts         # Duration/fps helpers, seconds-to-frames
  │       └── colors.ts         # Color manipulation (darken, lighten, contrast)
  ├── public/
  │   └── stock/                # Bundled royalty-free assets
  │       ├── music/            # 3-4 background tracks (upbeat, calm, energetic, minimal)
  │       ├── sfx/              # Transition sounds (whoosh, pop, click)
  │       └── textures/         # Subtle gradient/texture backgrounds
  ├── assets/
  │   ├── brand-kit.json        # Resolved brand configuration
  │   ├── logos/                # Company logos (PNG/SVG)
  │   ├── fonts/                # Custom fonts (.woff2, .ttf)
  │   ├── music/                # User-supplied background tracks
  │   ├── sfx/                  # User-supplied sound effects
  │   └── images/               # Reusable images (headshots, product shots)
  ├── output/                   # Rendered videos land here
  ├── remotion.config.ts
  ├── package.json
  └── tsconfig.json
```

**Key dependencies installed:**
- `remotion`, `@remotion/cli`, `@remotion/player` — core framework
- `@remotion/skills` — official AI skill rules (38 rule files)
- `@remotion/transitions` — built-in transition effects
- `@remotion/layout-utils` — text measurement and fitting
- `@remotion/fonts` — font loading and registration
- `@remotion/media-utils` — audio/video duration and metadata

### 2.2 Data Flow

```
User command ──> FOS skill (video-generation)
                    │
                    ├─ 1. Parse script / content brief
                    ├─ 2. Select template (or use --template)
                    ├─ 3. Load brand kit from assets/brand-kit.json
                    ├─ 4. Resolve asset paths (images, music, logos)
                    ├─ 5. Build typed props JSON
                    │
                    ▼
              Remotion CLI
                    │
                    ├─ npx remotion still (preview frames)
                    ├─ npx remotion render (full video)
                    │
                    ▼
              output/<filename>.mp4
                    │
                    ├─ (optional) media-handler-agent upload
                    └─ (optional) social:post publish
```

### 2.3 Layered Skill Responsibility

| Layer | Handles | Source |
|-------|---------|--------|
| **FOS skills** | Founder workflow: content brief parsing, template selection, brand kit application, render orchestration, upload pipeline | `skills/video/*.md` |
| **@remotion/skills** | Remotion best practices: animation APIs (`interpolate`, `spring`), `useCurrentFrame()` patterns, `<TransitionSeries>` usage, font loading, caption rendering | `node_modules/@remotion/skills/` in managed project |

The agent reads both layers when working on video tasks. FOS skills define WHAT to build; official skills define HOW to build it with Remotion's API.

## 3. Command Structure

New `video` namespace under `/founder-os:video:*`.

### 3.1 Phase 1 Commands

| Command | Description | Key Arguments |
|---------|-------------|---------------|
| `video:init` | One-time scaffold of managed Remotion project | `--path=<dir>`, `--skip-templates`, `--skip-stock` |
| `video:generate` | Generate a video from template + content | `--template=<name>`, `--script="..."`, `--aspect=<preset>`, `--duration=<seconds>`, `--music=<track>`, `--post`, `--platforms=<list>` |
| `video:preview` | Render still frames at key moments | `--template=<name>`, `--frames=0,30,60`, `--props=<json>` |
| `video:render` | Re-render an existing composition | `--composition=<id>`, `--props=<path>`, `--format=<preset>`, `--output=<path>` |
| `video:templates` | List available templates with descriptions | `--category=social\|marketing`, `--detail` |
| `video:brand` | Manage brand kit assets | `--set`, `--show`, `--import`, `--reset` |

### 3.2 Phase 2 Commands

| Command | Description | Key Arguments |
|---------|-------------|---------------|
| `video:voiceover` | Generate TTS voiceover for a script | `--script="..."`, `--voice=<id>`, `--provider=elevenlabs\|openai`, `--output=<path>` |
| `video:caption` | Generate captions from audio/video | `--input=<path>`, `--style=word\|sentence\|karaoke`, `--output=srt\|embedded` |

### 3.3 Phase 3 Commands

| Command | Description | Key Arguments |
|---------|-------------|---------------|
| `video:cloud-init` | Set up Remotion Lambda for cloud rendering | `--region=<aws-region>`, `--memory=<mb>` |
| `video:batch` | Render multiple platform variants in parallel | `--template=<name>`, `--presets=reel,square,landscape`, `--cloud` |
| `video:template-create` | Scaffold a new custom template | `--name=<name>`, `--category=<cat>`, `--base=<existing>` |

### 3.4 Pipeline Hook

`social:compose` gains `--format=video` which delegates to the video namespace:

```
social:compose --format=video --template=social-reel --platforms=linkedin,instagram
  └─> video:generate --template=social-reel --script=<content-brief>
      └─> video:preview (confirm stills)
      └─> video:render (full render)
      └─> media-handler-agent (upload to platforms)
```

### 3.5 Command Frontmatter Convention

All video commands follow existing FOS patterns:

```yaml
---
description: Generate a branded video from template and content
argument-hint: '--template=social-reel --script="..." [--aspect=reel] [--duration=15] [--music=upbeat] [--post --platforms=linkedin,x]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---
```

### 3.6 Preflight Checks

Video namespace preflight requirements:

| Tool | Required | Check |
|------|----------|-------|
| Node.js >= 18 | Yes | `node --version` |
| Remotion project | Yes | Check managed project path exists; prompt `video:init` if missing |
| ffmpeg | Yes | `ffmpeg -version` (needed for audio/video processing) |
| Disk space | Yes | Warn if < 500MB free in output directory |
| Late.dev | No | Only needed if `--post` flag used |
| TTS provider | No | Only needed for `video:voiceover` (Phase 2) |

## 4. Template System

### 4.1 Template Library

Each template is a React composition registered in `src/Root.tsx` with a typed props interface.

**Phase 1 — 8 starter templates:**

| Template ID | Category | Default Aspect | Default Duration | Description |
|-------------|----------|----------------|------------------|-------------|
| `social-reel` | Social | 9:16 (1080x1920) | 15s | Animated text slides with transitions, background music, brand colors |
| `social-quote` | Social | 1:1 (1080x1080) | 8s | Quote card with animated text reveal, author attribution, logo |
| `social-listicle` | Social | 9:16 (1080x1920) | 20s | Numbered tips/points with slide transitions and icons |
| `social-before-after` | Social | 9:16 (1080x1920) | 10s | Split-screen comparison with wipe transition |
| `product-demo` | Marketing | 16:9 (1920x1080) | 30s | Screen recording frame + callouts + intro/outro |
| `testimonial` | Marketing | 16:9 (1920x1080) | 15s | Customer quote with photo, company logo, animated text |
| `explainer` | Marketing | 16:9 (1920x1080) | 45s | Section-based with icons, text animations, branded lower thirds |
| `pitch-highlight` | Marketing | 16:9 (1920x1080) | 20s | Key metrics/stats with number counter animations, logo, CTA |

**Phase 2 additions (with TTS/captions):**

| Template ID | Category | Aspect | Description |
|-------------|----------|--------|-------------|
| `talking-head` | Social | 9:16 | Voiceover with animated captions (karaoke style), background visuals |
| `story-narrated` | Social | 9:16 | TTS narration over image slideshow with word-by-word captions |
| `explainer-voiced` | Marketing | 16:9 | Full explainer with TTS voiceover and synced subtitles |

### 4.2 Props Contract

Every template exports a TypeScript interface defining its input props. Example:

```typescript
// SocialReel props
interface SocialReelProps {
  slides: Array<{
    headline: string;
    body?: string;
    image?: string;       // path relative to assets/
  }>;
  brandKit: BrandKit;      // injected automatically from brand-kit.json
  music?: string;           // path to background audio, default from brand kit
  durationPerSlide?: number; // seconds per slide, default 3
  transition?: 'fade' | 'slide' | 'wipe' | 'flip'; // default 'slide'
  showLogo?: boolean;       // show logo on last slide, default true
  ctaText?: string;         // call-to-action on final slide
}

// Shared BrandKit type (used by all templates)
interface BrandKit {
  company: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;    // path in assets/fonts/
    body: string;       // path in assets/fonts/
  };
  logo: {
    primary: string;    // path in assets/logos/
    dark?: string;
    icon?: string;
  };
  music?: {
    default?: string;
    calm?: string;
    energetic?: string;
  };
}
```

### 4.3 Template Selection Algorithm

In the `video-templates` skill:

1. If `--template=<name>` specified, use it directly
2. Otherwise, analyze content brief:
   - Count sections/slides → listicle vs single-card
   - Detect quotes → testimonial or quote card
   - Detect stats/numbers → pitch-highlight
   - Detect comparison language → before-after
   - Default to social-reel for short content, explainer for long content
3. Match target platform aspect ratio to template defaults
4. Suggest template with rationale, let user confirm before proceeding

### 4.4 Composition Registration

All templates are registered in `src/Root.tsx`:

```tsx
import { Composition, Folder } from "remotion";
import { SocialReel } from "./templates/SocialReel";
import { SocialQuote } from "./templates/SocialQuote";
// ... all templates

export const Root: React.FC = () => {
  return (
    <>
      <Folder name="social">
        <Composition
          id="social-reel"
          component={SocialReel}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={450}  // 15s default, overridden by calculateMetadata
          defaultProps={defaultSocialReelProps}
          calculateMetadata={calculateSocialReelMetadata}
        />
        {/* ... other social templates */}
      </Folder>
      <Folder name="marketing">
        {/* ... marketing templates */}
      </Folder>
    </>
  );
};
```

Each template uses `calculateMetadata` to dynamically set duration based on props (number of slides, script length, etc.).

## 5. Rendering Pipeline

### 5.1 Output Format Presets

| Preset | Resolution | Aspect | FPS | Codec | Use Case |
|--------|-----------|--------|-----|-------|----------|
| `reel` | 1080x1920 | 9:16 | 30 | H.264 | Instagram/TikTok reels |
| `story` | 1080x1920 | 9:16 | 30 | H.264 | Stories (15s max enforced) |
| `square` | 1080x1080 | 1:1 | 30 | H.264 | Feed posts, LinkedIn |
| `landscape` | 1920x1080 | 16:9 | 30 | H.264 | YouTube, presentations |
| `gif` | 800x800 | 1:1 | 15 | GIF | Lightweight social clips |

### 5.2 Local Render Flow (Phase 1)

```
video:generate
  │
  ├─ 1. Parse script, select template, resolve brand kit
  ├─ 2. Build typed props JSON → write to /tmp/fos-video-props-<id>.json
  ├─ 3. Validate all referenced assets exist and are valid formats
  │
  ├─ 4. Preview (3 still frames):
  │     npx remotion still <comp-id> --frame=0 --props=<props.json> --output=output/previews/preview-start.png
  │     npx remotion still <comp-id> --frame=<mid> --props=<props.json> --output=output/previews/preview-mid.png
  │     npx remotion still <comp-id> --frame=<end> --props=<props.json> --output=output/previews/preview-end.png
  │     └─ Show previews to user, confirm before full render
  │
  ├─ 5. Full render:
  │     npx remotion render <comp-id> \
  │       --props=<props.json> \
  │       --output=output/<filename>.mp4 \
  │       --codec=h264 \
  │       --concurrency=50%
  │
  └─ 6. Report: file path, duration, file size, resolution
        └─ If --post: hand off to media-handler-agent for upload
```

**Preview-before-render** is key: rendering 3 stills takes ~5 seconds vs 30-120 seconds for a full video. Users confirm the look before committing to the full render.

### 5.3 Cloud Render Flow (Phase 3)

```
video:cloud-init (one-time setup)
  ├─ Install @remotion/lambda
  ├─ Deploy Remotion Lambda function to AWS
  ├─ Store Lambda function ARN in video-studio config
  └─ Test render to verify setup

video:generate --cloud
  ├─ 1-3. Same as local (parse, props, validate)
  ├─ 4. Preview locally (stills are fast enough locally)
  ├─ 5. Show cost estimate before confirming cloud render
  ├─ 6. Upload props + assets to S3
  ├─ 7. Invoke Lambda render
  ├─ 8. Poll for completion, download result
  └─ 9. Report: file path, duration, render time, cost

video:batch --presets=reel,square,landscape --cloud
  ├─ Spawn parallel Lambda renders for each preset
  ├─ Same composition, different resolution/aspect
  └─ Download all variants when complete
```

### 5.4 Error Recovery

| Error | Recovery |
|-------|----------|
| Missing font | Fall back to system font (Inter/Helvetica), warn user, suggest `video:brand --set` |
| Missing image | Render with solid-color placeholder, warn user with asset path |
| Missing music | Render without audio, warn user |
| Render crash | Capture Remotion stderr, parse error. Common causes: prop type mismatch, missing asset, out-of-memory. Suggest specific fix. |
| Disk space < 500MB | Abort before render, suggest cleaning `output/` directory |
| Node.js version | Abort with install instructions |
| ffmpeg missing | Abort with install instructions (brew install ffmpeg / apt install ffmpeg) |

## 6. Asset Management & Brand Kit

### 6.1 Brand Kit Resolution Chain

1. Check `assets/brand-kit.json` in the Remotion project (cached, fastest)
2. If missing or stale, pull from FOS business context (`_infrastructure/context/active/`)
3. If no business context found, prompt user via `video:brand --set`

### 6.2 brand-kit.json Structure

```json
{
  "company": "Acme Inc",
  "colors": {
    "primary": "#2563EB",
    "secondary": "#1E40AF",
    "accent": "#F59E0B",
    "background": "#0F172A",
    "text": "#F8FAFC"
  },
  "fonts": {
    "heading": "Inter-Bold.woff2",
    "body": "Inter-Regular.woff2"
  },
  "logo": {
    "primary": "logos/logo-light.svg",
    "dark": "logos/logo-dark.svg",
    "icon": "logos/icon.svg"
  },
  "music": {
    "default": "music/upbeat-corporate.mp3",
    "calm": "music/ambient-soft.mp3",
    "energetic": "music/high-energy.mp3"
  }
}
```

### 6.3 Asset Validation Rules

| Asset Type | Valid Formats | Validation |
|-----------|--------------|------------|
| Images | PNG, JPG, SVG, WebP | Check file exists, warn if resolution < output resolution |
| Fonts | .woff2, .ttf | Must be loadable via `@remotion/fonts` `loadFont()` |
| Audio | MP3, WAV, AAC | Check duration. Warn if significantly shorter/longer than video |
| Video clips | MP4, MOV, WebM | Check codec compatibility via `@remotion/media-utils` |
| Logos | SVG (preferred), PNG | SVG preferred for resolution independence |

### 6.4 Stock Assets Bundled with Scaffolding

Installed during `video:init` into `public/stock/`:

- **Music:** 4 royalty-free background tracks (~30-60s each, loopable)
  - `upbeat-corporate.mp3` — energetic, professional
  - `ambient-soft.mp3` — calm, minimal
  - `high-energy.mp3` — dynamic, fast-paced
  - `minimal-beat.mp3` — subtle rhythm
- **SFX:** 3 transition sounds
  - `whoosh.mp3`, `pop.mp3`, `click.mp3`
- **Textures:** 4 subtle gradient backgrounds (dark, light, warm, cool)

All stock assets are royalty-free and safe for commercial use.

## 7. Skill Structure

### 7.1 FOS Skill Files

| Skill | Path | Globs | Purpose |
|-------|------|-------|---------|
| `video-generation` | `skills/video/video-generation/SKILL.md` | `commands/video/generate.md` | End-to-end generate workflow: parse script, select template, resolve assets, build props, invoke render |
| `video-templates` | `skills/video/video-templates/SKILL.md` | `commands/video/generate.md`, `commands/video/templates.md` | Template selection algorithm, prop mapping rules, content-to-template matching |
| `video-rendering` | `skills/video/video-rendering/SKILL.md` | `commands/video/render.md`, `commands/video/preview.md` | Render pipeline: CLI invocation, output format selection, preview extraction, error recovery |
| `brand-kit` | `skills/video/brand-kit/SKILL.md` | `commands/video/brand.md`, `commands/video/generate.md` | Brand asset resolution chain, color/font/logo mapping, fallback defaults |

### 7.2 Phase 2 Skill Files

| Skill | Path | Purpose |
|-------|------|---------|
| `voiceover` | `skills/video/voiceover/SKILL.md` | TTS provider integration, voice selection, audio generation, timing sync |
| `captions` | `skills/video/captions/SKILL.md` | Whisper transcription, SRT generation, caption styling, word-level timing |

### 7.3 Official Skills Integration

`@remotion/skills` is installed in the managed Remotion project (`node_modules/@remotion/skills/`). FOS skills reference it as the authoritative source for Remotion API guidance:

```markdown
# In video-generation SKILL.md:

When generating or modifying template composition code, the agent has access
to @remotion/skills rules in the Remotion project at
{videoStudioPath}/node_modules/@remotion/skills/skills/remotion/.

Key rules to consult:
- rules/animations.md — useCurrentFrame(), interpolate(), spring() patterns
- rules/compositions.md — Composition registration, calculateMetadata
- rules/transitions.md — TransitionSeries, fade/slide/wipe/flip/clockWipe
- rules/fonts.md — Font loading via @remotion/fonts
- rules/timing.md — Duration calculation, fps conversion
- rules/images.md — Static file references, Img component
- rules/videos.md — OffthreadVideo, video trimming
- rules/audio.md — Audio component, volume control
- rules/subtitles.md — Caption rendering (Phase 2)
- rules/voiceover.md — TTS integration (Phase 2)

IMPORTANT: All animations MUST use useCurrentFrame() + interpolate().
Never use CSS transitions or Tailwind animation classes — they do not
render correctly in Remotion.
```

### 7.4 Skill Execution Flow (video:generate)

```
1. Parse arguments (--template, --script, --aspect, --duration, --music, --post)
2. Read skills:
   a. _infrastructure/preflight/SKILL.md — validate Node, ffmpeg, project exists
   b. skills/video/video-generation/SKILL.md — main workflow
   c. skills/video/video-templates/SKILL.md — template selection
   d. skills/video/brand-kit/SKILL.md — brand resolution
   e. skills/video/video-rendering/SKILL.md — render pipeline
3. Business context: check _infrastructure/context/active/
4. Step 0: Memory injection (query for "video", "brand", "content")
5. Intelligence: check learned patterns from past video:generate runs

Phase 1/3: Content Preparation
  - Parse script into structured slides/sections
  - Select template (algorithm or --template flag)
  - Load brand kit
  - Resolve all asset paths

Phase 2/3: Preview
  - Generate 3 still frames (start, middle, end)
  - Show to user with template name, duration, resolution
  - Wait for confirmation

Phase 3/3: Render
  - Execute full render via Remotion CLI
  - Report output path, duration, file size
  - If --post: trigger media-handler-agent upload

Final: Memory observation logging
```

## 8. Content Pipeline Integration

### 8.1 Integration Points

```
                    ┌──────────────────────────────────────────┐
                    │         Existing Content Pipeline         │
                    │                                          │
ideate:draft ──────>│ social:compose ──┬──> text ──> social:post│
                    │                 │                        │
                    │                 └──> --format=video      │
                    │                      │                    │
                    └──────────────────────┼────────────────────┘
                                          │
                    ┌─────────────────────▼────────────────────┐
                    │           Video Namespace (new)           │
                    │                                          │
                    │  video:generate ──> video:preview         │
                    │       │                 │                 │
                    │       └──> video:render ─┘                │
                    │                │                          │
                    └────────────────┼──────────────────────────┘
                                    │
                    ┌───────────────▼──────────────────────────┐
                    │      Existing Upload Pipeline             │
                    │                                          │
                    │  media-handler-agent ──> social:post      │
                    │  (validate, resize, presign, upload)      │
                    └──────────────────────────────────────────┘
```

### 8.2 The social:compose Bridge

When `social:compose --format=video` is invoked:

1. `social:compose` takes the content brief from `ideate:draft` output (headlines, body text, key points)
2. Reads the `video-templates` skill to select an appropriate video template based on content type and target platform
3. Delegates to `video:generate` with the brief as script input and selected template
4. `video:generate` runs the full pipeline (props -> preview -> render)
5. Returns the rendered video file path
6. `social:compose` passes the file path to `media-handler-agent` for platform upload
7. `social:post` publishes with the video attached

### 8.3 Standalone Usage

Users can also call video commands directly without the social pipeline:

```bash
# Direct generation
/founder-os:video:generate --template=explainer --script="Our product solves..." --aspect=landscape

# From file
/founder-os:video:generate --template=testimonial --script=@testimonial-brief.md

# Quick social reel
/founder-os:video:generate --template=social-reel --script="5 tips for founders" --post --platforms=linkedin
```

### 8.4 Notion HQ Integration

New entries in the Content database:

| Property | Value |
|----------|-------|
| Type | `Video` |
| Title | Video title/description |
| Status | `Draft` / `Rendered` / `Published` |
| Template | Template ID used |
| Platforms | Target platforms |
| Output URL | Local file path or published URL |
| Duration | Video duration in seconds |
| Aspect | Output preset used |
| Company | Related company (if client video) |

## 9. TTS & Captions (Phase 2)

### 9.1 Voiceover Generation

**Supported providers:**

| Provider | Model | Strengths | Setup |
|----------|-------|-----------|-------|
| ElevenLabs | Multilingual v2 | Most natural, voice cloning, 29 languages | API key in env |
| OpenAI TTS | tts-1-hd | Good quality, simple API, built into Claude ecosystem | API key in env |

**Workflow:**

```
video:voiceover --script="..." --voice=<id> --provider=elevenlabs
  ├─ 1. Send script to TTS provider API
  ├─ 2. Receive audio file (MP3/WAV)
  ├─ 3. Save to assets/voiceover/<filename>.mp3
  ├─ 4. Calculate audio duration
  └─ 5. Return path + duration for use in video:generate --music=<path>
```

**Voice management:**
- `video:voiceover --list-voices` — list available voices from configured provider
- `video:voiceover --preview --voice=<id>` — generate 5-second sample
- Default voice stored in `brand-kit.json` under `voiceover.defaultVoice`

### 9.2 Caption Generation

**Transcription pipeline** using Remotion's built-in Whisper integration (`@remotion/install-whisper-cpp`):

```
video:caption --input=voiceover.mp3
  ├─ 1. Install whisper.cpp model if not present (one-time)
  ├─ 2. Transcribe audio → word-level timestamps
  ├─ 3. Generate SRT file
  └─ 4. Return caption data for embedding in video
```

**Caption display styles** (using Remotion's subtitle rules):

| Style | Description | Best For |
|-------|-------------|----------|
| `word` | Word-by-word highlight (karaoke) | Reels, TikTok-style |
| `sentence` | Full sentence with fade timing | Professional, explainers |
| `block` | Multi-line subtitle block | Longer narration |

**Integration with templates:**
- Phase 2 templates (`talking-head`, `story-narrated`, `explainer-voiced`) accept a `captions` prop
- Caption component respects brand kit fonts and colors
- Caption positioning configurable: bottom, center, top

### 9.3 TTS + Caption Combined Workflow

```
video:generate --template=talking-head --script="..." --voice=rachel --captions=word
  ├─ 1. Generate voiceover from script via TTS provider
  ├─ 2. Transcribe voiceover audio via Whisper → word timestamps
  ├─ 3. Build template props with audio path + caption data
  ├─ 4. Calculate video duration from audio duration
  ├─ 5. Preview → Render → Output
  └─ Duration matches voiceover exactly (no manual timing needed)
```

## 10. Cloud Rendering (Phase 3)

### 10.1 Remotion Lambda Setup

```
video:cloud-init --region=us-east-1
  ├─ 1. Install @remotion/lambda
  ├─ 2. Validate AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  ├─ 3. Deploy Lambda function: npx remotion lambda functions deploy
  ├─ 4. Create S3 bucket for assets: npx remotion lambda sites create
  ├─ 5. Store config in video-studio/cloud-config.json:
  │     { "functionName": "...", "region": "...", "s3Bucket": "..." }
  ├─ 6. Test render with a simple composition
  └─ 7. Report: function ARN, estimated cost per render
```

### 10.2 Cloud Render Flow

```
video:generate --cloud
  ├─ Same steps 1-4 as local (parse, props, validate, preview locally)
  ├─ 5. Upload site bundle to S3 (if changed since last deploy)
  ├─ 6. Show cost estimate: "~$0.02 for a 30s video at 1080p"
  ├─ 7. Confirm with user
  ├─ 8. Invoke: npx remotion lambda render --function-name=<fn> ...
  ├─ 9. Poll progress (Lambda provides render progress %)
  ├─ 10. Download rendered file from S3
  └─ 11. Clean up temporary S3 objects
```

### 10.3 Batch Rendering

```
video:batch --template=social-reel --presets=reel,square,landscape --cloud
  ├─ Spawn 3 parallel Lambda renders (same composition, different resolutions)
  ├─ Each render runs independently on separate Lambda invocations
  ├─ Download all 3 variants when complete
  └─ Report: all file paths, total render time, total cost
```

### 10.4 Cost Estimation

Provide cost estimate before every cloud render:

| Video Length | Resolution | Estimated Cost |
|-------------|-----------|----------------|
| 15s | 1080p | ~$0.01 |
| 30s | 1080p | ~$0.02 |
| 60s | 1080p | ~$0.04 |
| 60s | 4K | ~$0.15 |

Estimates based on Remotion Lambda pricing (AWS Lambda compute time).

## 11. Custom Template Creation (Phase 3)

### 11.1 Template Scaffolding

```
video:template-create --name=webinar-intro --category=marketing --base=explainer
  ├─ 1. Copy base template as starting point
  ├─ 2. Generate new TypeScript interface for props
  ├─ 3. Register in Root.tsx
  ├─ 4. Create placeholder component
  └─ 5. Open Remotion Studio for live preview editing:
        npx remotion studio (launches localhost:3000)
```

### 11.2 Template Development Workflow

1. User runs `video:template-create` to scaffold
2. Remotion Studio opens for interactive editing (hot-reload, timeline scrubbing)
3. User can ask Claude to modify the template code (agent reads `@remotion/skills` rules for guidance)
4. Test renders via Studio's built-in render button
5. Template becomes available in `video:templates` list

## 12. Phasing Summary

### Phase 1 — MVP (Core Video Generation)

**Deliverables:**
- `video:init` — project scaffolding with all dependencies
- `video:generate` — full generate pipeline with template selection
- `video:preview` — still frame preview before render
- `video:render` — re-render with updated props
- `video:templates` — template listing and details
- `video:brand` — brand kit management
- 8 starter templates (4 social + 4 marketing)
- 4 FOS skills (video-generation, video-templates, video-rendering, brand-kit)
- Stock asset bundle (music, SFX, textures)
- Local H.264/GIF rendering via Remotion CLI
- 5 output presets (reel, story, square, landscape, gif)
- Preflight checks (Node, ffmpeg, project, disk)
- Memory integration (observation logging)

**Dependencies:**
- Remotion v4+, Node.js 18+, ffmpeg
- `@remotion/skills` installed in managed project

### Phase 2 — TTS & Captions

**Deliverables:**
- `video:voiceover` — TTS generation (ElevenLabs or OpenAI)
- `video:caption` — Whisper transcription + SRT output
- 3 new templates (talking-head, story-narrated, explainer-voiced)
- 2 new skills (voiceover, captions)
- `social:compose --format=video` bridge to content pipeline (gated on Phase 2 because the primary bridge value is voiced templates; works with Phase 1 templates but ships here alongside TTS)
- Caption component with 3 display styles (word, sentence, block)
- Auto-sync: voiceover duration drives video duration

**Dependencies:**
- TTS provider API key (ElevenLabs or OpenAI)
- `@remotion/install-whisper-cpp` for transcription
- Phase 1 complete

### Phase 3 — Cloud & Custom Templates

**Deliverables:**
- `video:cloud-init` — Remotion Lambda deployment
- `video:batch` — parallel multi-preset rendering
- `video:template-create` — custom template scaffolding
- Cloud render support with cost estimation
- Batch rendering for platform variants
- Remotion Studio integration for template editing

**Dependencies:**
- AWS account with Lambda + S3 permissions
- `@remotion/lambda` package
- Phase 1 complete (Phase 2 not required)

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Remotion project size (~200MB with node_modules) | Disk space on founder's machine | Document size in `video:init` output, support `--path` for external drives |
| Local render speed on weak hardware | 60s video could take 5+ minutes | Preview-first workflow. Phase 3 cloud rendering offloads compute. `--concurrency=50%` default to avoid CPU lockup |
| Template React code errors from user modifications | Broken renders | Templates are code-reviewed before shipping. Custom templates (Phase 3) render in Studio first |
| ffmpeg not installed | Blocking dependency | Clear install instructions in preflight failure message. Link to platform-specific guides |
| TTS API costs (Phase 2) | Recurring cost per voiceover | Show cost estimate before generation. Cache voiceovers for re-renders |
| `@remotion/skills` package changes | Could break FOS skill references | Pin version in package.json. Test on upgrade |
| Whisper model download (Phase 2) | ~100-400MB model file on top of 200MB project | Document download size in `video:caption` first-run output. Allow model size selection (tiny/base/small) |
| Stock asset licensing | Must be verifiably royalty-free | Implementation plan includes sourcing task with license verification |
| Remotion license | Remotion requires a license for companies with >$10M revenue | Document in `video:init` output. Most founders under threshold. Link to remotion.dev/license |

## 14. Success Criteria

- [ ] `video:init` scaffolds a working Remotion project in < 2 minutes
- [ ] `video:generate` produces a branded video from script input in < 3 minutes (local, 30s video)
- [ ] Preview workflow shows 3 stills in < 10 seconds
- [ ] All 8 starter templates render without errors
- [ ] Brand kit applies consistently across all templates
- [ ] `social:compose --format=video` produces and uploads a video end-to-end (Phase 2)
- [ ] Cloud render completes in < 60 seconds for a 30s video (Phase 3)
- [ ] Template props are fully type-safe (TypeScript compile check)
