# Remotion Video Skill (Phase 1) — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. Use `/plugin-dev:skill-development` for all skill files and `/plugin-dev:command-development` for all command files.

**Goal:** Add video generation to Founder OS — 8 Remotion templates, 6 commands under `video:*`, 4 skills, local rendering with preview-before-render workflow.

**Architecture:** A managed Remotion project scaffolded at `~/.founder-os/video-studio/` contains React composition templates with typed props. FOS commands parse user input + brand kit into props JSON, render via Remotion CLI, and optionally hand off to the existing media-handler-agent for upload. `@remotion/skills` is bundled for Remotion API guidance.

**Tech Stack:** Remotion v4, React, TypeScript, `@remotion/skills`, `@remotion/transitions`, `@remotion/layout-utils`, `@remotion/fonts`, ffmpeg (local rendering)

**Spec:** `docs/superpowers/specs/[20]-2026-03-18-remotion-skill-design.md` (Sections 1-7, 12 Phase 1)

**Reference files to read before starting any task:**
- `commands/social/post.md` — canonical command pattern (frontmatter, skills loading, phases, observation logging)
- `skills/social/template-engine/SKILL.md` — skill pattern with template selection algorithm
- `_infrastructure/late-skills/late-media/SKILL.md` — media handling pattern
- `_infrastructure/preflight/SKILL.md` — preflight check pattern
- `_infrastructure/memory/context-injection/SKILL.md` — memory injection pattern

---

## File Structure

### New FOS Files (Markdown — Plugin Layer)

| File | Responsibility |
|------|---------------|
| `commands/video/init.md` | Scaffold managed Remotion project |
| `commands/video/generate.md` | Generate video from template + content |
| `commands/video/preview.md` | Render still frames at key moments |
| `commands/video/render.md` | Re-render composition with updated props |
| `commands/video/templates.md` | List available templates |
| `commands/video/brand.md` | Manage brand kit assets |
| `skills/video/video-generation/SKILL.md` | End-to-end generate workflow |
| `skills/video/video-templates/SKILL.md` | Template selection algorithm |
| `skills/video/video-rendering/SKILL.md` | Render pipeline, format presets, error recovery |
| `skills/video/brand-kit/SKILL.md` | Brand asset resolution chain |

### New Remotion Project Files (TypeScript — Scaffold Template)

These are template files that `video:init` copies into the managed project. They live at `_infrastructure/video-studio-template/` in the plugin repo and get installed to `~/.founder-os/video-studio/`.

| File | Responsibility |
|------|---------------|
| `_infrastructure/video-studio-template/package.json` | Remotion dependencies |
| `_infrastructure/video-studio-template/tsconfig.json` | TypeScript config |
| `_infrastructure/video-studio-template/remotion.config.ts` | Remotion project config |
| `_infrastructure/video-studio-template/src/Root.tsx` | Composition registry |
| `_infrastructure/video-studio-template/src/types.ts` | Shared types (BrandKit, OutputPreset) |
| `_infrastructure/video-studio-template/src/hooks/useBrandKit.ts` | Brand kit loader hook |
| `_infrastructure/video-studio-template/src/hooks/useAsset.ts` | Asset path resolver hook |
| `_infrastructure/video-studio-template/src/lib/timing.ts` | Duration/fps helpers |
| `_infrastructure/video-studio-template/src/lib/colors.ts` | Color manipulation utilities |
| `_infrastructure/video-studio-template/src/components/TextOverlay.tsx` | Animated text component |
| `_infrastructure/video-studio-template/src/components/Logo.tsx` | Logo placement with animation |
| `_infrastructure/video-studio-template/src/components/SlideTransition.tsx` | Scene transition wrapper |
| `_infrastructure/video-studio-template/src/components/LowerThird.tsx` | Name/title bar component |
| `_infrastructure/video-studio-template/src/components/NumberCounter.tsx` | Animated number counter |
| `_infrastructure/video-studio-template/src/components/ProgressBar.tsx` | Video progress indicator |
| `_infrastructure/video-studio-template/src/templates/SocialReel.tsx` | Animated text slides reel |
| `_infrastructure/video-studio-template/src/templates/SocialQuote.tsx` | Quote card with text reveal |
| `_infrastructure/video-studio-template/src/templates/SocialListicle.tsx` | Numbered tips/points |
| `_infrastructure/video-studio-template/src/templates/SocialBeforeAfter.tsx` | Split-screen comparison |
| `_infrastructure/video-studio-template/src/templates/ProductDemo.tsx` | Screen recording + callouts |
| `_infrastructure/video-studio-template/src/templates/Testimonial.tsx` | Customer quote video |
| `_infrastructure/video-studio-template/src/templates/Explainer.tsx` | Section-based explainer |
| `_infrastructure/video-studio-template/src/templates/PitchHighlight.tsx` | Key metrics/stats |
| `_infrastructure/video-studio-template/assets/brand-kit.example.json` | Example brand kit |

### Stock Assets (Bundled)

| File | Responsibility |
|------|---------------|
| `_infrastructure/video-studio-template/public/stock/music/upbeat-corporate.mp3` | Energetic background track |
| `_infrastructure/video-studio-template/public/stock/music/ambient-soft.mp3` | Calm background track |
| `_infrastructure/video-studio-template/public/stock/music/high-energy.mp3` | Dynamic background track |
| `_infrastructure/video-studio-template/public/stock/music/minimal-beat.mp3` | Subtle rhythm track |
| `_infrastructure/video-studio-template/public/stock/sfx/whoosh.mp3` | Transition sound |
| `_infrastructure/video-studio-template/public/stock/sfx/pop.mp3` | Transition sound |
| `_infrastructure/video-studio-template/public/stock/sfx/click.mp3` | Transition sound |
| `_infrastructure/video-studio-template/public/stock/textures/dark-gradient.png` | Dark blue/black gradient background |
| `_infrastructure/video-studio-template/public/stock/textures/light-gradient.png` | Light gray/white gradient background |
| `_infrastructure/video-studio-template/public/stock/textures/warm-gradient.png` | Warm orange/amber gradient background |
| `_infrastructure/video-studio-template/public/stock/textures/cool-gradient.png` | Cool blue/teal gradient background |

**Note on stock assets:** These must be sourced from royalty-free/CC0 sources (e.g., Pixabay, Freesound) with verifiable licenses. Task 16 includes sourcing instructions.

**Out of scope for Phase 1:** The `social:compose --format=video` bridge (spec section 8.2) is a Phase 2 deliverable. Phase 1 provides standalone `video:*` commands only.

### Preflight Registry Update

| File | Modification |
|------|-------------|
| `_infrastructure/preflight/dependency-registry.json` | Add `video` namespace entry with required/optional tools |

---

## Chunk 1: Foundation (Shared Types, Utilities, Hooks, Components)

Build the shared TypeScript foundation that all templates depend on. These files live in `_infrastructure/video-studio-template/` and get installed into the managed Remotion project.

### Task 1: Project Scaffold Template — package.json, configs, types

**Files:**
- Create: `_infrastructure/video-studio-template/package.json`
- Create: `_infrastructure/video-studio-template/tsconfig.json`
- Create: `_infrastructure/video-studio-template/remotion.config.ts`
- Create: `_infrastructure/video-studio-template/src/types.ts`
- Create: `_infrastructure/video-studio-template/assets/brand-kit.example.json`

- [ ] **Step 1: Create package.json with Remotion dependencies**

```json
{
  "name": "founder-os-video-studio",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "studio": "remotion studio",
    "render": "remotion render",
    "still": "remotion still"
  },
  "dependencies": {
    "remotion": "^4.0.0",
    "@remotion/cli": "^4.0.0",
    "@remotion/player": "^4.0.0",
    "@remotion/transitions": "^4.0.0",
    "@remotion/layout-utils": "^4.0.0",
    "@remotion/fonts": "^4.0.0",
    "@remotion/media-utils": "^4.0.0",
    "@remotion/skills": "^4.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create remotion.config.ts**

```typescript
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

- [ ] **Step 4: Create src/types.ts with shared type definitions**

Define `BrandKit`, `OutputPreset`, and shared template prop types per spec section 4.2:

```typescript
export interface BrandKit {
  company: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string; // path in assets/fonts/
    body: string;    // path in assets/fonts/
  };
  logo: {
    primary: string; // path in assets/logos/
    dark?: string;
    icon?: string;
  };
  music?: {
    default?: string;
    calm?: string;
    energetic?: string;
  };
}

export interface OutputPreset {
  name: string;
  width: number;
  height: number;
  fps: number;
  codec: "h264" | "gif";
}

export const OUTPUT_PRESETS: Record<string, OutputPreset> = {
  reel: { name: "reel", width: 1080, height: 1920, fps: 30, codec: "h264" },
  story: { name: "story", width: 1080, height: 1920, fps: 30, codec: "h264" },
  square: { name: "square", width: 1080, height: 1080, fps: 30, codec: "h264" },
  landscape: { name: "landscape", width: 1920, height: 1080, fps: 30, codec: "h264" },
  gif: { name: "gif", width: 800, height: 800, fps: 15, codec: "gif" },
};

export type TransitionType = "fade" | "slide" | "wipe" | "flip";
```

- [ ] **Step 5: Create assets/brand-kit.example.json**

```json
{
  "company": "Your Company",
  "colors": {
    "primary": "#2563EB",
    "secondary": "#1E40AF",
    "accent": "#F59E0B",
    "background": "#0F172A",
    "text": "#F8FAFC"
  },
  "fonts": {
    "heading": "fonts/Inter-Bold.woff2",
    "body": "fonts/Inter-Regular.woff2"
  },
  "logo": {
    "primary": "logos/logo.svg"
  },
  "music": {
    "default": "../public/stock/music/upbeat-corporate.mp3",
    "calm": "../public/stock/music/ambient-soft.mp3"
  }
}
```

- [ ] **Step 6: Create directory structure placeholders**

```bash
mkdir -p _infrastructure/video-studio-template/{src/{templates,components,hooks,lib},assets/{logos,fonts,music,sfx,images},public/stock/{music,sfx,textures},output/previews}
```

- [ ] **Step 7: Commit**

```bash
git add _infrastructure/video-studio-template/
git commit -m "feat(video): scaffold Remotion project template with types and configs"
```

### Task 2: Utility Libraries — timing.ts, colors.ts

**Files:**
- Create: `_infrastructure/video-studio-template/src/lib/timing.ts`
- Create: `_infrastructure/video-studio-template/src/lib/colors.ts`

- [ ] **Step 1: Create src/lib/timing.ts**

```typescript
/**
 * Convert seconds to frames at a given fps.
 */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/**
 * Convert frames to seconds at a given fps.
 */
export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}

/**
 * Calculate total duration in frames from an array of per-slide durations.
 */
export function totalFrames(
  slideDurations: number[],
  fps: number,
  transitionOverlapFrames: number = 0,
): number {
  const totalSlideFrames = slideDurations.reduce(
    (sum, d) => sum + secondsToFrames(d, fps),
    0,
  );
  const overlapReduction =
    Math.max(0, slideDurations.length - 1) * transitionOverlapFrames;
  return totalSlideFrames - overlapReduction;
}

/**
 * Get the start frame for slide N, accounting for transition overlaps.
 */
export function slideStartFrame(
  slideIndex: number,
  durationPerSlide: number,
  fps: number,
  transitionOverlapFrames: number = 0,
): number {
  const framesPerSlide = secondsToFrames(durationPerSlide, fps);
  return slideIndex * (framesPerSlide - transitionOverlapFrames);
}
```

- [ ] **Step 2: Create src/lib/colors.ts**

```typescript
/**
 * Parse hex color to RGB components.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Darken a hex color by a percentage (0-1).
 */
export function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    Math.round(r * (1 - amount)),
    Math.round(g * (1 - amount)),
    Math.round(b * (1 - amount)),
  );
}

/**
 * Lighten a hex color by a percentage (0-1).
 */
export function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  );
}

/**
 * Get a contrasting text color (black or white) for a given background.
 */
export function contrastText(backgroundHex: string): string {
  const { r, g, b } = hexToRgb(backgroundHex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
```

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/video-studio-template/src/lib/
git commit -m "feat(video): add timing and color utility libraries"
```

### Task 3: Hooks — useBrandKit.ts, useAsset.ts

**Files:**
- Create: `_infrastructure/video-studio-template/src/hooks/useBrandKit.ts`
- Create: `_infrastructure/video-studio-template/src/hooks/useAsset.ts`

- [ ] **Step 1: Create src/hooks/useBrandKit.ts**

```typescript
import { staticFile } from "remotion";
import type { BrandKit } from "../types";

// Default brand kit used when brand-kit.json is not configured
const DEFAULT_BRAND_KIT: BrandKit = {
  company: "My Company",
  colors: {
    primary: "#2563EB",
    secondary: "#1E40AF",
    accent: "#F59E0B",
    background: "#0F172A",
    text: "#F8FAFC",
  },
  fonts: {
    heading: "fonts/Inter-Bold.woff2",
    body: "fonts/Inter-Regular.woff2",
  },
  logo: {
    primary: "logos/logo.svg",
  },
};

/**
 * Resolve brand kit from props. Templates receive brandKit as a prop,
 * populated by the FOS command from assets/brand-kit.json.
 * Falls back to defaults for any missing values.
 */
export function useBrandKit(brandKit?: Partial<BrandKit>): BrandKit {
  return {
    ...DEFAULT_BRAND_KIT,
    ...brandKit,
    colors: { ...DEFAULT_BRAND_KIT.colors, ...brandKit?.colors },
    fonts: { ...DEFAULT_BRAND_KIT.fonts, ...brandKit?.fonts },
    logo: { ...DEFAULT_BRAND_KIT.logo, ...brandKit?.logo },
    music: { ...DEFAULT_BRAND_KIT.music, ...brandKit?.music },
  };
}

/**
 * Resolve a brand asset path to a staticFile reference.
 */
export function brandAsset(path: string): string {
  return staticFile(`../assets/${path}`);
}
```

- [ ] **Step 2: Create src/hooks/useAsset.ts**

```typescript
import { staticFile } from "remotion";

/**
 * Resolve an asset path. Supports:
 * - Absolute paths (returned as-is)
 * - Relative paths prefixed with assets/ or public/
 * - Static file references via Remotion's staticFile()
 */
export function useAsset(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("/") || path.startsWith("http")) return path;
  if (path.startsWith("public/")) return staticFile(path.replace("public/", ""));
  return staticFile(`../assets/${path}`);
}

/**
 * Resolve a stock asset path (from public/stock/).
 */
export function useStockAsset(path: string): string {
  return staticFile(`stock/${path}`);
}
```

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/video-studio-template/src/hooks/
git commit -m "feat(video): add useBrandKit and useAsset hooks"
```

### Task 4: Shared Components — TextOverlay, Logo, SlideTransition, LowerThird, NumberCounter, ProgressBar

**Files:**
- Create: `_infrastructure/video-studio-template/src/components/TextOverlay.tsx`
- Create: `_infrastructure/video-studio-template/src/components/Logo.tsx`
- Create: `_infrastructure/video-studio-template/src/components/SlideTransition.tsx`
- Create: `_infrastructure/video-studio-template/src/components/LowerThird.tsx`
- Create: `_infrastructure/video-studio-template/src/components/NumberCounter.tsx`
- Create: `_infrastructure/video-studio-template/src/components/ProgressBar.tsx`

Each component uses `useCurrentFrame()` and `interpolate()` for all animation (never CSS transitions — per `@remotion/skills` rules). Consult `node_modules/@remotion/skills/skills/remotion/rules/animations.md` for correct patterns.

- [ ] **Step 1: Create TextOverlay.tsx**

Animated text component with fade-in, optional word-by-word reveal. Props: `text`, `fontSize`, `fontFamily`, `color`, `enterFrame`, `animationType` ("fade" | "slide-up" | "word-by-word").

Uses `useCurrentFrame()` + `interpolate()` for opacity and transform. Font size and family come from brand kit. Must handle multi-line text with proper line-height.

```typescript
// Key structure:
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface TextOverlayProps {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  enterFrame?: number;
  animationType?: "fade" | "slide-up" | "word-by-word";
  bold?: boolean;
}

// Component uses interpolate() for opacity and translateY based on frame - enterFrame
// word-by-word mode splits text and staggers each word's entrance by ~3 frames
```

- [ ] **Step 2: Create Logo.tsx**

Logo component with configurable position and fade-in animation. Props: `src`, `width`, `position` ("top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"), `enterFrame`.

```typescript
// Uses Img from "remotion" for image rendering
// Position maps to absolute CSS positioning
// Fade-in via interpolate(frame, [enterFrame, enterFrame + 15], [0, 1], { extrapolateRight: "clamp" })
```

- [ ] **Step 3: Create SlideTransition.tsx**

Wrapper component for `<TransitionSeries>` from `@remotion/transitions`. Provides pre-configured transitions matching spec section 5. Props: `type` ("fade" | "slide" | "wipe" | "flip"), `durationInFrames`.

Consult `node_modules/@remotion/skills/skills/remotion/rules/transitions.md` for correct `<TransitionSeries>` usage. Uses `linearTiming()` or `springTiming()`.

```typescript
import { TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { springTiming } from "@remotion/transitions";

// Maps TransitionType to the correct presentation function
// Default: springTiming({ durationInFrames: 15 })
```

- [ ] **Step 4: Create LowerThird.tsx**

Name/title bar with slide-in animation. Props: `name`, `title`, `backgroundColor`, `textColor`, `enterFrame`, `exitFrame`.

```typescript
// Slides in from left using interpolate for translateX
// Two-line text: name (bold, larger) and title (regular, smaller)
// Background bar with brand primary color, text in contrast color
```

- [ ] **Step 5: Create NumberCounter.tsx**

Animated number counter (for stats/metrics). Props: `from`, `to`, `prefix`, `suffix`, `enterFrame`, `durationFrames`, `fontSize`, `color`.

```typescript
// Uses interpolate(frame, [enterFrame, enterFrame + durationFrames], [from, to])
// Rounds to integer, formats with commas
// Supports prefix ("$") and suffix ("%", "k", "+")
```

- [ ] **Step 6: Create ProgressBar.tsx**

Video progress indicator bar. Props: `color`, `height`, `position` ("top" | "bottom").

```typescript
// Uses useCurrentFrame() and useVideoConfig() to calculate progress
// Width = (frame / (durationInFrames - 1)) * 100%
// Fixed position at top or bottom of video
```

- [ ] **Step 7: Commit**

```bash
git add _infrastructure/video-studio-template/src/components/
git commit -m "feat(video): add shared video components (TextOverlay, Logo, transitions, LowerThird, NumberCounter, ProgressBar)"
```

---

## Chunk 2: Templates (8 Compositions + Root Registry)

Build all 8 starter templates as React compositions. Each template uses the shared components from Chunk 1 and follows Remotion patterns from `@remotion/skills`.

### Task 5: Social Templates — SocialReel, SocialQuote, SocialListicle, SocialBeforeAfter

**Files:**
- Create: `_infrastructure/video-studio-template/src/templates/SocialReel.tsx`
- Create: `_infrastructure/video-studio-template/src/templates/SocialQuote.tsx`
- Create: `_infrastructure/video-studio-template/src/templates/SocialListicle.tsx`
- Create: `_infrastructure/video-studio-template/src/templates/SocialBeforeAfter.tsx`

All social templates default to 9:16 (1080x1920) at 30fps.

- [ ] **Step 1: Create SocialReel.tsx**

Animated text slides with transitions and background music. Per spec section 4.2:

```typescript
interface SocialReelProps {
  slides: Array<{
    headline: string;
    body?: string;
    image?: string;
  }>;
  brandKit?: Partial<BrandKit>;
  music?: string;
  durationPerSlide?: number; // seconds, default 3
  transition?: TransitionType; // default "slide"
  showLogo?: boolean; // default true
  ctaText?: string;
}
```

Structure:
- Uses `<TransitionSeries>` to sequence slides
- Each slide: full-screen branded background + TextOverlay headline + optional body + optional image
- Final slide: logo + optional CTA text
- Background music via `<Audio>` component
- `calculateMetadata`: sets `durationInFrames` based on `slides.length * durationPerSlide * fps`

Consult `@remotion/skills` rules: `animations.md`, `transitions.md`, `audio.md`, `images.md`.

- [ ] **Step 2: Create SocialQuote.tsx**

Quote card with animated text reveal. 1:1 default.

```typescript
interface SocialQuoteProps {
  quote: string;
  author: string;
  authorTitle?: string;
  authorImage?: string;
  brandKit?: Partial<BrandKit>;
  music?: string;
  duration?: number; // seconds, default 8
}
```

Structure:
- Background with brand primary color gradient
- Quote text reveals word-by-word using TextOverlay
- Author attribution fades in after quote completes
- Optional author headshot with circular mask
- Logo in corner

- [ ] **Step 3: Create SocialListicle.tsx**

Numbered tips/points with slide transitions. 9:16 default.

```typescript
interface SocialListicleProps {
  title: string;
  items: Array<{
    number: number;
    text: string;
    icon?: string;
  }>;
  brandKit?: Partial<BrandKit>;
  music?: string;
  durationPerItem?: number; // seconds, default 3
  transition?: TransitionType;
}
```

Structure:
- Opening title slide (1.5s)
- Each item: large number (NumberCounter animation) + text (TextOverlay slide-up)
- Transitions between items via TransitionSeries
- Closing slide with logo

- [ ] **Step 4: Create SocialBeforeAfter.tsx**

Split-screen comparison with wipe transition. 9:16 default.

```typescript
interface SocialBeforeAfterProps {
  before: { label: string; image: string; description?: string };
  after: { label: string; image: string; description?: string };
  title?: string;
  brandKit?: Partial<BrandKit>;
  music?: string;
  duration?: number; // seconds, default 10
}
```

Structure:
- Optional title slide (1.5s)
- "Before" full-screen with label overlay (3s)
- Wipe transition to "After" (1s)
- "After" full-screen with label overlay (3s)
- Optional side-by-side comparison view (2s)

- [ ] **Step 5: Commit**

```bash
git add _infrastructure/video-studio-template/src/templates/Social*.tsx
git commit -m "feat(video): add 4 social video templates (Reel, Quote, Listicle, BeforeAfter)"
```

### Task 6: Marketing Templates — ProductDemo, Testimonial, Explainer, PitchHighlight

**Files:**
- Create: `_infrastructure/video-studio-template/src/templates/ProductDemo.tsx`
- Create: `_infrastructure/video-studio-template/src/templates/Testimonial.tsx`
- Create: `_infrastructure/video-studio-template/src/templates/Explainer.tsx`
- Create: `_infrastructure/video-studio-template/src/templates/PitchHighlight.tsx`

All marketing templates default to 16:9 (1920x1080) at 30fps.

- [ ] **Step 1: Create ProductDemo.tsx**

Screen recording frame with callouts and intro/outro. 16:9 default.

```typescript
interface ProductDemoProps {
  title: string;
  subtitle?: string;
  screenRecording: string; // path to video file
  callouts?: Array<{
    text: string;
    startFrame: number;
    endFrame: number;
    position: { x: number; y: number };
  }>;
  brandKit?: Partial<BrandKit>;
  music?: string;
}
```

Structure:
- Branded intro slide (2s): title + subtitle with logo
- Screen recording with device frame overlay
- Callout bubbles appear/disappear at specified frames
- Branded outro slide (2s): logo + CTA
- Uses `<OffthreadVideo>` for the screen recording per `@remotion/skills` `videos.md` rules

- [ ] **Step 2: Create Testimonial.tsx**

Customer quote with photo and animated text. 16:9 default.

```typescript
interface TestimonialProps {
  quote: string;
  customerName: string;
  customerTitle: string;
  customerCompany?: string;
  customerImage?: string;
  companyLogo?: string;
  brandKit?: Partial<BrandKit>;
  music?: string;
  duration?: number; // seconds, default 15
}
```

Structure:
- Background with brand secondary color gradient
- Large quote marks (decorative)
- Quote text with word-by-word reveal
- Customer photo (circular mask) with LowerThird
- Company logo fades in
- Your logo in corner

- [ ] **Step 3: Create Explainer.tsx**

Section-based explainer with icons and lower thirds. 16:9 default.

```typescript
interface ExplainerProps {
  title: string;
  sections: Array<{
    heading: string;
    body: string;
    icon?: string;
  }>;
  brandKit?: Partial<BrandKit>;
  music?: string;
  durationPerSection?: number; // seconds, default 6
  transition?: TransitionType;
}
```

Structure:
- Opening title slide (3s)
- Each section: heading (TextOverlay) + body text + optional icon
- LowerThird with section number/total
- Transitions between sections
- Closing slide with logo + CTA
- ProgressBar at bottom

- [ ] **Step 4: Create PitchHighlight.tsx**

Key metrics with animated number counters. 16:9 default.

```typescript
interface PitchHighlightProps {
  headline: string;
  metrics: Array<{
    value: number;
    label: string;
    prefix?: string;
    suffix?: string;
  }>;
  ctaText?: string;
  brandKit?: Partial<BrandKit>;
  music?: string;
  duration?: number; // seconds, default 20
}
```

Structure:
- Opening headline slide with brand gradient (3s)
- Each metric: NumberCounter animation + label (3s each)
- If 2-3 metrics: show side-by-side comparison view (3s)
- Closing CTA slide with logo

- [ ] **Step 5: Commit**

```bash
git add _infrastructure/video-studio-template/src/templates/{ProductDemo,Testimonial,Explainer,PitchHighlight}.tsx
git commit -m "feat(video): add 4 marketing video templates (ProductDemo, Testimonial, Explainer, PitchHighlight)"
```

### Task 7: Composition Registry — Root.tsx

**Files:**
- Create: `_infrastructure/video-studio-template/src/Root.tsx`

- [ ] **Step 1: Create Root.tsx registering all 8 templates**

Each template exports a `calculateMetadata` function and `defaultProps`. Register all 8 compositions explicitly:

```typescript
import React from "react";
import { Composition, Folder } from "remotion";
import { SocialReel, calculateSocialReelMetadata, defaultSocialReelProps } from "./templates/SocialReel";
import { SocialQuote, calculateSocialQuoteMetadata, defaultSocialQuoteProps } from "./templates/SocialQuote";
import { SocialListicle, calculateSocialListicleMetadata, defaultSocialListicleProps } from "./templates/SocialListicle";
import { SocialBeforeAfter, calculateSocialBeforeAfterMetadata, defaultSocialBeforeAfterProps } from "./templates/SocialBeforeAfter";
import { ProductDemo, calculateProductDemoMetadata, defaultProductDemoProps } from "./templates/ProductDemo";
import { Testimonial, calculateTestimonialMetadata, defaultTestimonialProps } from "./templates/Testimonial";
import { Explainer, calculateExplainerMetadata, defaultExplainerProps } from "./templates/Explainer";
import { PitchHighlight, calculatePitchHighlightMetadata, defaultPitchHighlightProps } from "./templates/PitchHighlight";

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
          durationInFrames={450}
          defaultProps={defaultSocialReelProps}
          calculateMetadata={calculateSocialReelMetadata}
        />
        <Composition
          id="social-quote"
          component={SocialQuote}
          width={1080}
          height={1080}
          fps={30}
          durationInFrames={240}
          defaultProps={defaultSocialQuoteProps}
          calculateMetadata={calculateSocialQuoteMetadata}
        />
        <Composition
          id="social-listicle"
          component={SocialListicle}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={600}
          defaultProps={defaultSocialListicleProps}
          calculateMetadata={calculateSocialListicleMetadata}
        />
        <Composition
          id="social-before-after"
          component={SocialBeforeAfter}
          width={1080}
          height={1920}
          fps={30}
          durationInFrames={300}
          defaultProps={defaultSocialBeforeAfterProps}
          calculateMetadata={calculateSocialBeforeAfterMetadata}
        />
      </Folder>
      <Folder name="marketing">
        <Composition
          id="product-demo"
          component={ProductDemo}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={900}
          defaultProps={defaultProductDemoProps}
          calculateMetadata={calculateProductDemoMetadata}
        />
        <Composition
          id="testimonial"
          component={Testimonial}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={450}
          defaultProps={defaultTestimonialProps}
          calculateMetadata={calculateTestimonialMetadata}
        />
        <Composition
          id="explainer"
          component={Explainer}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={1350}
          defaultProps={defaultExplainerProps}
          calculateMetadata={calculateExplainerMetadata}
        />
        <Composition
          id="pitch-highlight"
          component={PitchHighlight}
          width={1920}
          height={1080}
          fps={30}
          durationInFrames={600}
          defaultProps={defaultPitchHighlightProps}
          calculateMetadata={calculatePitchHighlightMetadata}
        />
      </Folder>
    </>
  );
};
```

Each template must export: the component, a `calculateMetadata` function (sets `durationInFrames` dynamically based on props), and `defaultProps` (valid sample data for Remotion Studio preview). Consult `@remotion/skills` `compositions.md` for the `calculateMetadata` pattern.

**Note:** Each template's `durationInFrames` above is a placeholder default — `calculateMetadata` overrides it at render time based on actual props (number of slides, section count, etc.).

- [ ] **Step 2: Verify the template project builds**

Install dependencies first, then type-check:

```bash
cd _infrastructure/video-studio-template && npm install && npx tsc --noEmit
```

Expected: No TypeScript errors. (Dependencies must be installed for imports to resolve.)

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/video-studio-template/src/Root.tsx
git commit -m "feat(video): register all 8 templates in Root.tsx composition registry"
```

---

## Chunk 3: FOS Skills (4 Skill Files)

Create the markdown skill files that provide domain knowledge for the video commands. Follow existing FOS skill patterns (frontmatter with name, description, globs).

### Task 8: video-generation Skill

**Files:**
- Create: `skills/video/video-generation/SKILL.md`

- [ ] **Step 1: Write video-generation skill**

Follow the pattern in `skills/social/template-engine/SKILL.md`. Frontmatter:

```yaml
---
name: video-generation
description: "Activates when generating videos. Provides the end-to-end workflow: parse script, select template, resolve assets, build props JSON, invoke Remotion CLI render."
globs: ["commands/video/generate.md"]
---
```

Content sections:
1. **End-to-End Workflow** — the 3-phase flow from spec section 7.4 (Content Preparation, Preview, Render)
2. **Script Parsing** — how to break user's `--script` text into structured slides/sections
3. **Props Generation** — how to build the typed props JSON from parsed content + brand kit
4. **Asset Resolution** — resolve all image/music/font paths using the brand kit and useAsset patterns
5. **@remotion/skills Reference** — point to key rule files in the managed project's `node_modules/@remotion/skills/`
6. **Important Remotion Rules** — all animations use `useCurrentFrame()` + `interpolate()`, never CSS transitions

- [ ] **Step 2: Commit**

```bash
git add skills/video/video-generation/
git commit -m "feat(video): add video-generation skill"
```

### Task 9: video-templates Skill

**Files:**
- Create: `skills/video/video-templates/SKILL.md`

- [ ] **Step 1: Write video-templates skill**

```yaml
---
name: video-templates
description: "Activates when selecting video templates. Provides template selection algorithm, template catalog with prop contracts, and content-to-template matching rules."
globs: ["commands/video/generate.md", "commands/video/templates.md"]
---
```

Content sections:
1. **Template Catalog** — table of all 8 templates with ID, category, default aspect, default duration, description
2. **Selection Algorithm** — the 4-step matching logic from spec section 4.3
3. **Prop Contracts** — reference to TypeScript interfaces in each template file (what each template expects)
4. **Content Mapping Rules** — how to map different content types to templates:
   - Short text (< 50 words) → social-quote
   - Numbered list → social-listicle
   - Comparison → social-before-after
   - Stats/numbers → pitch-highlight
   - Customer quote → testimonial
   - Multi-section → explainer
   - Default short → social-reel
   - Default long → explainer

- [ ] **Step 2: Commit**

```bash
git add skills/video/video-templates/
git commit -m "feat(video): add video-templates skill with selection algorithm"
```

### Task 10: video-rendering Skill

**Files:**
- Create: `skills/video/video-rendering/SKILL.md`

- [ ] **Step 1: Write video-rendering skill**

```yaml
---
name: video-rendering
description: "Activates when rendering videos or previewing stills. Provides render pipeline, output format presets, preview workflow, CLI commands, and error recovery."
globs: ["commands/video/render.md", "commands/video/preview.md", "commands/video/generate.md"]
---
```

Content sections:
1. **Output Presets** — table from spec section 5.1 (reel, story, square, landscape, gif)
2. **Preview Workflow** — `remotion still` commands for 3 key frames, output to `output/previews/`
3. **Full Render Commands** — `remotion render` with codec, output path, concurrency flags
4. **Error Recovery Table** — from spec section 5.4 (missing font, missing image, render crash, disk space, etc.)
5. **Aspect Ratio Mapping** — which preset to use for which platform
6. **File Naming** — `output/{template}-{timestamp}.{ext}` convention

- [ ] **Step 2: Commit**

```bash
git add skills/video/video-rendering/
git commit -m "feat(video): add video-rendering skill with presets and error recovery"
```

### Task 11: brand-kit Skill

**Files:**
- Create: `skills/video/brand-kit/SKILL.md`

- [ ] **Step 1: Write brand-kit skill**

```yaml
---
name: brand-kit
description: "Activates when managing brand assets for video. Provides brand kit resolution chain, brand-kit.json structure, asset validation rules, and import workflow."
globs: ["commands/video/brand.md", "commands/video/generate.md"]
---
```

Content sections:
1. **Resolution Chain** — 3-step resolution from spec section 6.1 (cached JSON → business context → prompt user)
2. **brand-kit.json Schema** — exact structure from spec section 6.2
3. **Asset Validation** — format/size rules from spec section 6.3
4. **Import Workflow** — how `video:brand --import` pulls from business context files
5. **Font Registration** — how fonts are loaded via `@remotion/fonts` `loadFont()`

- [ ] **Step 2: Commit**

```bash
git add skills/video/brand-kit/
git commit -m "feat(video): add brand-kit skill with resolution chain and validation"
```

---

## Chunk 4: FOS Commands (6 Command Files) + Preflight

Create the command markdown files following existing FOS command patterns (frontmatter, skills loading, phases, observation logging).

### Task 12: video:init Command

**Files:**
- Create: `commands/video/init.md`

- [ ] **Step 1: Write video:init command**

```yaml
---
description: Scaffold the managed Remotion video project with templates, brand kit, and stock assets
argument-hint: '[--path=<dir>] [--skip-templates] [--skip-stock]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---
```

This is one of the rare `foreground` commands (like `setup/verify.md`) because it's a guided setup wizard.

Command flow:
1. Parse `--path` (default `~/.founder-os/video-studio/`)
2. Check if project already exists at path — if yes, ask to overwrite or abort
3. Copy `${CLAUDE_PLUGIN_ROOT}/_infrastructure/video-studio-template/` to target path
4. Run `npm install` in the target path
5. If `--skip-templates` not set: templates are already in the scaffold
6. If `--skip-stock` not set: stock assets are already in the scaffold
7. Create `assets/brand-kit.json` from `brand-kit.example.json`
8. Verify: `npx remotion studio --port=0` (start and immediately stop — validates install)
9. Report: project path, installed packages, template count, stock asset count
10. Suggest next step: `video:brand --set` to configure brand kit
11. Final: Log observation — project scaffolded, path, template count, success/failure

- [ ] **Step 2: Commit**

```bash
git add commands/video/init.md
git commit -m "feat(video): add video:init command for project scaffolding"
```

### Task 13: video:generate Command

**Files:**
- Create: `commands/video/generate.md`

- [ ] **Step 1: Write video:generate command**

```yaml
---
description: Generate a branded video from a template and content script
argument-hint: '--template=<name> --script="..." [--aspect=reel|story|square|landscape|gif] [--duration=<seconds>] [--music=<track>] [--post --platforms=<list>]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---
```

Skills loading:
1. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/video-generation/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/video-templates/SKILL.md`
3. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/brand-kit/SKILL.md`
4. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/video-rendering/SKILL.md`
5. If `--post` provided: Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-media/SKILL.md`

Arguments table per spec section 3.1.

Business context: Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files. If present, read them for brand voice, company info, and client context. This feeds into brand kit resolution (step 2 of resolution chain).

Preflight: `video` namespace (Node >= 18, Remotion project, ffmpeg, disk space >= 500MB in output dir).

Step 0: Memory injection — read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`. Query memory store for: `video rendering`, `brand kit`, template name, content type. Inject top 5 relevant memories.

Intelligence: Check for learned optimizations from past `video:generate` runs. Apply any patterns discovered (e.g., preferred templates for certain content types, duration adjustments).

Phase 1/3: Content Preparation
- Parse `--script` into structured data (slides, sections, quotes, stats)
- Select template (algorithm or `--template`)
- Load brand kit (resolution chain: cached JSON → business context → prompt)
- Resolve asset paths
- Build props JSON

Phase 2/3: Preview
- Render 3 still frames
- Show to user with template info
- Wait for confirmation

Phase 3/3: Render
- Full render via Remotion CLI
- Report output: file path, duration, file size, resolution
- If `--post`: hand off to media-handler-agent

Final: Log observation to memory — template used, content type, render duration, output format, success/failure. This enables the intelligence layer to learn template preferences over time.

- [ ] **Step 2: Commit**

```bash
git add commands/video/generate.md
git commit -m "feat(video): add video:generate command with full pipeline"
```

### Task 14: video:preview, video:render, video:templates, video:brand Commands

**Files:**
- Create: `commands/video/preview.md`
- Create: `commands/video/render.md`
- Create: `commands/video/templates.md`
- Create: `commands/video/brand.md`

- [ ] **Step 1: Write video:preview command**

```yaml
---
description: Render still frames at key moments to preview a video before full render
argument-hint: '--template=<name> [--frames=0,30,60] [--props=<json>]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---
```

Skills: video-rendering, video-templates.
Preflight: video namespace.
Flow: resolve template + props → `remotion still` for each frame → display image paths.
Final: Log observation (template previewed, frames rendered).

- [ ] **Step 2: Write video:render command**

```yaml
---
description: Re-render an existing composition with updated props or different output format
argument-hint: '--composition=<id> [--props=<path>] [--format=reel|story|square|landscape|gif] [--output=<path>]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---
```

Skills: video-rendering.
Preflight: video namespace.
Flow: validate composition exists → apply format preset → `remotion render` → report output.
Final: Log observation (composition rendered, format, duration, file size).

- [ ] **Step 3: Write video:templates command**

```yaml
---
description: List available video templates with descriptions and example output
argument-hint: '[--category=social|marketing] [--detail]'
allowed-tools: ["Read"]
execution-mode: background
result-format: full
---
```

Skills: video-templates.
Flow: read template catalog from skill → format as table → if `--detail`, show props interface for each.

- [ ] **Step 4: Write video:brand command**

```yaml
---
description: Manage the video brand kit (colors, fonts, logos, music)
argument-hint: '--set|--show|--import|--reset'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---
```

Skills: brand-kit.
`--show`: display current brand-kit.json.
`--set`: guided wizard to set colors, fonts, logos, music.
`--import`: pull from FOS business context files.
`--reset`: restore brand-kit.example.json.

- [ ] **Step 5: Commit**

```bash
git add commands/video/
git commit -m "feat(video): add preview, render, templates, and brand commands"
```

### Task 15: Preflight Registry Update

**Files:**
- Modify: `_infrastructure/preflight/dependency-registry.json`

- [ ] **Step 1: Read current dependency-registry.json**

Read the file to understand the existing format.

- [ ] **Step 2: Add video namespace entry**

Add a new entry for the `video` namespace:

```json
{
  "video": {
    "required": {
      "node": {
        "check": "node --version",
        "minVersion": "18.0.0",
        "fix": "Install Node.js 18+ from https://nodejs.org/"
      },
      "remotion-project": {
        "check": "test -d {videoStudioPath}/node_modules/remotion",
        "fix": "Run /founder-os:video:init to scaffold the Remotion project"
      },
      "ffmpeg": {
        "check": "ffmpeg -version",
        "fix": "Install ffmpeg: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)"
      },
      "disk-space": {
        "check": "df -k {videoStudioPath}/output | awk 'NR==2 {if ($4 < 512000) exit 1}'",
        "fix": "Less than 500MB free in video output directory. Delete old renders: rm ~/.founder-os/video-studio/output/*.mp4"
      }
    },
    "optional": {
      "late": {
        "check": "node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs --validate-only",
        "fix": "Only needed for --post flag. Run /founder-os:social:connect to set up."
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/preflight/dependency-registry.json
git commit -m "feat(video): add video namespace to preflight dependency registry"
```

---

## Chunk 5: Stock Assets & Integration Testing

Source stock assets and verify the full pipeline works end-to-end.

### Task 16: Source and Add Stock Assets

**Files:**
- Create: `_infrastructure/video-studio-template/public/stock/music/*.mp3` (4 tracks)
- Create: `_infrastructure/video-studio-template/public/stock/sfx/*.mp3` (3 sounds)
- Create: `_infrastructure/video-studio-template/public/stock/textures/*.png` (4 gradients)

- [ ] **Step 1: Source royalty-free music tracks**

Find 4 short (~30-60s) loopable background tracks from CC0/royalty-free sources:
- Sources: Pixabay Music, Freesound.org, Mixkit
- Verify license allows commercial use without attribution
- Download as MP3, normalize audio levels
- Name: `upbeat-corporate.mp3`, `ambient-soft.mp3`, `high-energy.mp3`, `minimal-beat.mp3`

If sourcing is not possible during implementation, create placeholder silent MP3 files and add a `STOCK_ASSETS_TODO.md` documenting what needs to be sourced.

- [ ] **Step 2: Source royalty-free SFX**

Find 3 short transition sounds:
- Sources: Freesound.org (CC0 filter), Mixkit
- Download as MP3
- Name: `whoosh.mp3`, `pop.mp3`, `click.mp3`

Same placeholder approach if sourcing not possible.

- [ ] **Step 3: Generate gradient texture backgrounds**

Create 4 subtle gradient PNG backgrounds (1920x1080):
- `dark-gradient.png` — dark blue/black
- `light-gradient.png` — light gray/white
- `warm-gradient.png` — warm orange/amber
- `cool-gradient.png` — cool blue/teal

These can be generated programmatically or sourced from CC0 libraries.

- [ ] **Step 4: Add LICENSE-STOCK.md documenting asset sources**

Create `LICENSE-STOCK.md` with a table for each asset category (Music, SFX, Textures). Each row must list the exact filename, source URL where it was downloaded, and the license name (e.g., "CC0 1.0", "Pixabay Content License"). Fill in the actual source details as each asset is sourced in Steps 1-3. Do not leave placeholder brackets — every cell must contain the real value or "Placeholder — replace before release" if the asset could not be sourced.

- [ ] **Step 5: Commit**

```bash
git add _infrastructure/video-studio-template/public/stock/ _infrastructure/video-studio-template/LICENSE-STOCK.md
git commit -m "feat(video): add royalty-free stock assets (music, SFX, textures)"
```

### Task 17: End-to-End Integration Verification

**Files:** No new files. This is a manual verification task.

- [ ] **Step 1: Run video:init to scaffold the project**

```bash
# Invoke the init command (or manually copy template + npm install)
cp -r _infrastructure/video-studio-template ~/.founder-os/video-studio
cd ~/.founder-os/video-studio && npm install
```

Verify: `node_modules/remotion/` exists, `npx tsc --noEmit` passes.

- [ ] **Step 2: Verify Remotion Studio launches**

```bash
cd ~/.founder-os/video-studio && npx remotion studio
```

Verify: Studio opens at localhost:3000, all 8 compositions appear under `social/` and `marketing/` folders.

- [ ] **Step 3: Test still frame rendering**

```bash
cd ~/.founder-os/video-studio
npx remotion still social-reel --frame=0 --output=output/previews/test-preview.png \
  --props='{"slides":[{"headline":"Test Slide 1"},{"headline":"Test Slide 2"}]}'
```

Verify: `test-preview.png` is generated, shows branded content.

- [ ] **Step 4: Test full video render**

```bash
cd ~/.founder-os/video-studio
npx remotion render social-reel --output=output/test-reel.mp4 --codec=h264 \
  --props='{"slides":[{"headline":"Test Slide 1"},{"headline":"Test Slide 2"},{"headline":"Test Slide 3"}]}'
```

Verify: `test-reel.mp4` is generated, plays correctly, is 9:16 at 30fps.

- [ ] **Step 5: Test with brand kit**

Copy `assets/brand-kit.example.json` to `assets/brand-kit.json`, modify colors, re-render. Verify brand colors appear in output.

- [ ] **Step 6: Verify all 8 templates render without errors**

Render a still frame from each of the 8 compositions with their default props. All should produce valid PNG output without errors.

```bash
for comp in social-reel social-quote social-listicle social-before-after product-demo testimonial explainer pitch-highlight; do
  npx remotion still $comp --frame=0 --output=output/previews/$comp-test.png
done
```

Verify: 8 PNG files generated, no render errors.

- [ ] **Step 7: Clean up test outputs and commit any fixes**

```bash
rm -rf ~/.founder-os/video-studio/output/previews/test-* ~/.founder-os/video-studio/output/test-*
```

If any templates needed fixes during testing, commit those fixes:

```bash
git add -A && git commit -m "fix(video): template fixes from integration testing"
```

---

## Summary

| Chunk | Tasks | Files Created | Focus |
|-------|-------|--------------|-------|
| 1: Foundation | 1-4 | 12 TypeScript files | Types, utilities, hooks, shared components |
| 2: Templates | 5-7 | 9 TypeScript files | 8 template compositions + Root.tsx registry |
| 3: Skills | 8-11 | 4 skill markdown files | FOS domain knowledge for video workflow |
| 4: Commands | 12-15 | 6 command markdown files + 1 registry update | User-facing commands + preflight |
| 5: Integration | 16-17 | Stock assets + LICENSE | Asset sourcing + end-to-end verification |

**Total: 17 tasks, 5 chunks, ~32 new files**

After Phase 1 is complete, Phase 2 (TTS/Captions) and Phase 3 (Cloud/Custom Templates) can be planned independently using the same spec.
