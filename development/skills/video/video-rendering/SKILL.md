---
name: video-rendering
description: "Activates when rendering videos or previewing stills. Provides render pipeline, output format presets, preview workflow, CLI commands, and error recovery."
globs: ["commands/video/render.md", "commands/video/preview.md", "commands/video/generate.md"]
---

# Video Rendering

Render pipeline, output format presets, preview workflow, CLI commands, and error recovery for Remotion-based video generation. Used by the `video:render`, `video:preview`, and `video:generate` commands.

## 1. Output Presets

Standard presets for social platform output. Pass the preset name to select dimensions, FPS, and codec automatically.

| Preset | Width | Height | FPS | Codec | Platform Use |
|--------|-------|--------|-----|-------|-------------|
| reel | 1080 | 1920 | 30 | h264 | Instagram Reels, TikTok, YouTube Shorts |
| story | 1080 | 1920 | 30 | h264 | Instagram Stories, Facebook Stories |
| square | 1080 | 1080 | 30 | h264 | Instagram Feed, LinkedIn, Facebook Feed |
| landscape | 1920 | 1080 | 30 | h264 | YouTube, Vimeo, LinkedIn Video |
| gif | 800 | 800 | 15 | gif | Email, Slack, documentation |

When a user specifies a target platform instead of a preset, resolve the preset using the Aspect Ratio Mapping in section 5.

## 2. Preview Workflow

Render still frame previews before committing to a full render. This is the default first step for all video generation commands.

**Steps:**

1. Navigate to the managed project directory:
   ```bash
   cd ${VIDEO_PATH}
   ```

2. For each frame to preview, render a still:
   ```bash
   cd ${VIDEO_PATH} && ./node_modules/.bin/remotion still <composition-id> \
     --frame=<N> \
     --output=output/previews/<comp>-frame-<N>.png \
     --props='<json>'
   ```

3. Default preview frames (render all three unless the user specifies otherwise):
   - **Frame 0** — start of the composition (title/intro state)
   - **Frame at 50% duration** — midpoint (main content visible)
   - **Frame at 90% duration** — near-end (CTA or closing state)

4. Display the output file paths to the user so they can review the stills before proceeding.

5. All preview output goes to: `${VIDEO_PATH}/output/previews/`

After the user approves the previews, proceed to the full render step.

## 3. Full Render Commands

### Standard video render (h264)

```bash
cd ${VIDEO_PATH} && ./node_modules/.bin/remotion render <composition-id> \
  --output=output/<template>-<timestamp>.mp4 \
  --props='<json>' \
  --codec=h264 \
  --concurrency=50%
```

### GIF render

```bash
cd ${VIDEO_PATH} && ./node_modules/.bin/remotion render <composition-id> \
  --output=output/<template>-<timestamp>.gif \
  --props='<json>' \
  --codec=gif \
  --every-nth-frame=2
```

### Custom dimensions

Pass `--width` and `--height` flags to override preset dimensions:

```bash
cd ${VIDEO_PATH} && ./node_modules/.bin/remotion render <composition-id> \
  --output=output/<template>-<timestamp>.mp4 \
  --props='<json>' \
  --codec=h264 \
  --width=1200 \
  --height=628 \
  --concurrency=50%
```

### Props JSON

The `--props` flag accepts a JSON string matching the template's input props interface. Always validate props against the template's TypeScript interface before rendering (see error recovery for invalid props).

## 4. Error Recovery

| Error | Cause | Recovery |
|-------|-------|----------|
| Missing font | Font file not in assets/fonts/ | Fall back to system sans-serif, warn user |
| Missing image | Image path doesn't resolve | Skip image, render placeholder background, warn user |
| Render crash | Out of memory or GPU issue | Reduce concurrency to 25%, retry once |
| Disk space | Output dir < 500MB free | Prompt user to delete old renders, show `ls -la output/` |
| Composition not found | Invalid composition ID | List valid IDs from Root.tsx, suggest closest match |
| Invalid props | Props don't match template interface | Show expected interface, highlight mismatched keys |

When an error occurs during render:

1. Log the error message and exit code.
2. Look up the error in the table above.
3. Apply the recovery action automatically if possible (e.g., reduce concurrency, fall back to system font).
4. If recovery requires user input (e.g., disk space), display the issue and suggested fix, then wait for confirmation before retrying.

## 5. Aspect Ratio Mapping

When the user specifies a target platform, resolve to the correct preset:

| Platform | Preset |
|----------|--------|
| Instagram Reels | reel |
| TikTok | reel |
| YouTube Shorts | reel |
| Instagram Stories | story |
| Facebook Stories | story |
| Instagram Feed | square |
| LinkedIn | square or landscape |
| YouTube | landscape |
| Vimeo | landscape |
| Twitter/X | landscape or square |
| Email | gif |
| Slack | gif |
| Documentation | gif |

When a platform maps to multiple presets (e.g., LinkedIn), default to the first option listed unless the user specifies a preference.

## 6. File Naming Convention

All output files follow a consistent naming pattern with template name and timestamp.

**Rendered videos:**
```
output/<template>-<YYYYMMDD-HHmmss>.<ext>
```

**Preview stills:**
```
output/previews/<composition>-frame-<N>.png
```

**Examples:**
- `output/social-reel-20260319-143022.mp4`
- `output/promo-landscape-20260319-143055.gif`
- `output/previews/social-reel-frame-0.png`
- `output/previews/social-reel-frame-45.png`
- `output/previews/social-reel-frame-81.png`

The timestamp is generated at render start time using the local timezone. Use the same timestamp for all outputs from a single render invocation.
