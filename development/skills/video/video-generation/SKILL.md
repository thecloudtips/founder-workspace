---
name: video-generation
description: "Activates when generating videos. Provides the end-to-end workflow: parse script, select template, resolve assets, build props JSON, invoke Remotion CLI render."
globs: ["commands/video/generate.md"]
---

# Video Generation Skill

## End-to-End Workflow

Video generation follows a 3-phase workflow. Each phase must complete successfully before advancing to the next.

### Phase 1: Content Preparation

1. **Parse the script** -- Take the `--script` text and run it through the Script Parsing rules below to produce a structured data object matching the detected content type.
2. **Select a template** -- Invoke the `video-templates` skill's selection algorithm, or use the `--template` override if the user provided one explicitly. Validate that the template ID exists in the catalog.
3. **Load the brand kit** -- Follow the resolution chain in order:
   - Check for a cached `brand-kit.json` in the project root or `assets/` directory.
   - If not found, extract brand values from the active business context (colors, fonts, logo path).
   - If neither is available, prompt the user for brand colors, font preference, and logo.
4. **Resolve all asset paths** -- Run every image, music, font, and video path through the Asset Resolution rules below.
5. **Build typed props JSON** -- Construct a JSON object that conforms exactly to the selected template's TypeScript interface. Merge in the brand kit, music track, and output preset.

### Phase 2: Preview

1. Render 3 still frames using `remotion still`:
   - Frame 0 (opening state)
   - Frame at the midpoint of the composition
   - Frame near the end (last 10% of duration)
2. Display the 3 preview images to the user alongside metadata: template name, resolution, estimated duration, and total frame count.
3. Wait for explicit user confirmation before proceeding to the full render. If the user requests changes, return to Phase 1 with the adjusted parameters.

### Phase 3: Render

1. Execute `remotion render` with:
   - `--composition` set to the selected template's composition ID
   - `--props` pointing to the generated props JSON file
   - `--codec` from the output preset (default: h264 for mp4)
   - `--output` set to the target file path
2. After render completes, report to the user:
   - Output file path
   - Video duration
   - File size
   - Resolution

## Script Parsing

Parse the `--script` text into a template-specific data structure by detecting the content type. Apply the first matching rule:

### Short text (< 50 words, no numbered items)
Produces a quote structure:
```json
{ "quote": "<the text>", "author": "<attribution if present>" }
```
Maps to `social-quote`.

### Numbered items (lines starting with digits, dashes, or bullets)
Produces a listicle structure:
```json
{ "title": "<first line or inferred title>", "items": [{ "number": 1, "text": "<item text>" }] }
```
Maps to `social-listicle`.

### Before/After or comparison language
Detects keywords: "before", "after", "vs", "compared to", "old way", "new way".
Produces a comparison structure:
```json
{
  "before": { "label": "<before label>", "description": "<before text>" },
  "after": { "label": "<after label>", "description": "<after text>" }
}
```
Maps to `social-before-after`.

### Stats and numbers
Detects 2+ values containing `$`, `%`, `k`, `M`, `B`, or bare large numbers.
Produces a metrics structure:
```json
{
  "headline": "<intro text>",
  "metrics": [{ "value": 42, "label": "Users", "prefix": "", "suffix": "k" }]
}
```
Maps to `pitch-highlight`.

### Multiple sections (separated by `---` or `##`)
Produces a sections structure:
```json
{ "title": "<document title>", "sections": [{ "heading": "<heading>", "body": "<body text>" }] }
```
Maps to `explainer`.

### Default short (< 100 words, no match above)
Splits into slides:
```json
{ "slides": [{ "text": "<slide text>", "duration": 3 }] }
```
Maps to `social-reel`.

### Default long (100+ words, no match above)
Splits into sections by paragraph breaks:
```json
{ "title": "<inferred title>", "sections": [{ "heading": "<inferred>", "body": "<paragraph>" }] }
```
Maps to `explainer`.

## Props Generation

Build the final props JSON by merging parsed content with configuration:

1. Start with the parsed content structure from Script Parsing.
2. Add `brandKit` from `brand-kit.json`:
   ```json
   {
     "brandKit": {
       "primaryColor": "#...",
       "secondaryColor": "#...",
       "fontFamily": "...",
       "logoUrl": "..."
     }
   }
   ```
3. Add `music` from the brand kit's default track or the `--music` flag override.
4. Add `outputPreset` derived from the `--aspect` flag:
   - `9:16` -- 1080x1920
   - `1:1` -- 1080x1080
   - `16:9` -- 1920x1080
   - `4:5` -- 1080x1350
5. Validate the complete JSON against the selected template's TypeScript interface. Every required field must be present, and no unknown fields should exist.
6. Write the props JSON to a temporary file for the Remotion CLI.

## Asset Resolution

All image, music, font, and video paths must be resolved before props generation. Apply the first matching rule:

- **Absolute paths** (`/Users/...`, `C:\...`) -- Pass through unchanged.
- **HTTP/HTTPS URLs** (`https://...`) -- Pass through unchanged. Remotion will fetch at render time.
- **`public/` paths** (`public/logo.png`) -- Resolve via `staticFile("logo.png")`. The `public/` prefix is stripped.
- **`stock/` paths** (`stock/background-music.mp3`) -- Resolve via `useStockAsset("background-music.mp3")` which looks up the asset in the stock library.
- **All other relative paths** (`images/hero.jpg`) -- Resolve relative to the `assets/` directory in the video studio project.

Verify that each resolved path points to an existing file or valid URL before proceeding. Warn the user about any missing assets.

## Remotion Skills Reference

The managed Remotion project includes rule files that define correct patterns for video composition. Consult these when building or debugging templates:

- **`animations.md`** -- `useCurrentFrame()` + `interpolate()` are the only permitted animation methods. Covers easing, spring physics, and sequencing.
- **`transitions.md`** -- `TransitionSeries` patterns for slide, fade, wipe, and custom transitions between scenes.
- **`audio.md`** -- `<Audio>` component usage, volume control, trimming, and layering multiple tracks.
- **`images.md`** -- `<Img>` component for static images. Handles loading states and sizing.
- **`videos.md`** -- `<OffthreadVideo>` for embedding video clips. Preferred over `<Video>` for performance.
- **`compositions.md`** -- `calculateMetadata` for dynamic duration and dimensions. Composition registration patterns.

## Important Remotion Rules

These rules are non-negotiable. Violating them produces broken renders or runtime errors.

- **Animations**: ALL animations MUST use `useCurrentFrame()` + `interpolate()`. Never use CSS transitions, CSS keyframes, `requestAnimationFrame`, or any other animation method. Remotion's rendering model requires frame-deterministic output.
- **Extrapolation clamping**: Always pass `{ extrapolateRight: "clamp" }` as the last argument to `interpolate()` calls. Without clamping, values will overshoot beyond the target range.
- **Spring animations**: Use `spring()` from `remotion` for physics-based motion (bounces, elastic effects). Spring values are also frame-deterministic.
- **Audio**: Use `<Audio>` from `remotion`, never HTML `<audio>`. The Remotion Audio component syncs with the frame timeline.
- **Images**: Use `<Img>` from `remotion`, never HTML `<img>`. The Remotion Img component handles loading synchronization during rendering.
- **Video embeds**: Use `<OffthreadVideo>` from `remotion` for embedding video clips. It renders on a separate thread for better performance.
- **Static assets**: Use `staticFile()` for anything in the `public/` directory. Never construct manual paths to public assets.
- **No external state**: Components must be pure functions of frame number and props. No `useState`, no `useEffect` with side effects, no external API calls during render.
