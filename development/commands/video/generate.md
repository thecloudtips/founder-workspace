---
description: Generate a branded video from a template and content script
argument-hint: '--template=<name> --script="..." [--aspect=reel|story|square|landscape|gif] [--duration=<seconds>] [--music=<track>] [--post --platforms=<list>]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# video:generate

Generate a branded video from a template and content script.

## Skills

Read these skill files before proceeding:
1. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/video-generation/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/video-templates/SKILL.md`
3. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/brand-kit/SKILL.md`
4. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/video-rendering/SKILL.md`
5. If `--post` provided: Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-media/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--template` | No | Template ID (auto-selected if omitted) |
| `--script` | Yes | Content script text or file path |
| `--aspect` | No | Output preset: reel, story, square, landscape, gif (default: template default) |
| `--duration` | No | Override duration in seconds |
| `--music` | No | Background music: stock track name or file path |
| `--post` | No | Post to social media after render |
| `--platforms` | No | Target platforms for --post (comma-separated) |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files. If present, read them for brand voice, company info, and client context. This feeds into brand kit resolution (step 2 of resolution chain).

## Workspace Resolution

1. Read `~/.founder-os/video-studio.json`. If missing or invalid JSON: error with "Video studio not initialized or state file corrupted. Run /founder-os:video:init first."
2. Set `VIDEO_PATH` from the state file's `path` field.
3. Validate: check `${VIDEO_PATH}/node_modules/.bin/remotion` exists. If missing: error with "Video studio workspace at [path] appears incomplete or missing. Run /founder-os:video:init to reinitialize."

## Preflight Check

Run `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md` for namespace `video`.
- Required: `node` (>= 18), `remotion-project` (managed project installed), `disk-space` (>= 500MB in output dir)
- Optional: `late` (only for `--post` flag)

## Step 0: Memory Context

Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `video rendering`, `brand kit`, template name (if specified), content type keywords.
Inject top 5 relevant memories.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `video:generate` runs. Apply any patterns discovered (e.g., preferred templates for certain content types, duration adjustments).

## Phase 1/3: Content Preparation

Display: `Phase 1/3: Preparing content...`

1. Parse `--script` into structured data (slides, sections, quotes, stats)
2. Select template (auto-selection algorithm or `--template` override)
3. Load brand kit (resolution chain: cached JSON → business context → prompt user)
4. Resolve all asset paths (images, music, fonts, logos)
5. Build props JSON matching the selected template's TypeScript interface
6. Apply `--duration` override if provided
7. Apply `--aspect` output preset if provided

## Phase 2/3: Preview

Display: `Phase 2/3: Generating preview...`

1. Write props JSON to temporary file: `${VIDEO_PATH}/output/.props-tmp.json`
2. Render 3 still frames:
   ```bash
   cd ${VIDEO_PATH} && ./node_modules/.bin/remotion still <composition-id> --frame=0 --output=output/previews/preview-start.png --props=output/.props-tmp.json
   cd ${VIDEO_PATH} && ./node_modules/.bin/remotion still <composition-id> --frame=<mid> --output=output/previews/preview-mid.png --props=output/.props-tmp.json
   cd ${VIDEO_PATH} && ./node_modules/.bin/remotion still <composition-id> --frame=<near-end> --output=output/previews/preview-end.png --props=output/.props-tmp.json
   ```
3. Display preview paths and template info to user
4. Ask user: "Proceed with full render? (yes/no)"
5. If no: suggest adjustments, allow script/template changes, restart Phase 1

## Phase 3/3: Render

Display: `Phase 3/3: Rendering video...`

1. Execute full render:
   ```bash
   cd ${VIDEO_PATH} && ./node_modules/.bin/remotion render <composition-id> \
     --output=output/<template>-<timestamp>.mp4 \
     --props=output/.props-tmp.json \
     --codec=h264 \
     --concurrency=50%
   ```
   For gif: `--codec=gif --every-nth-frame=2`
2. Report output: file path, duration, file size, resolution
3. If `--post` provided: hand off to media-handler-agent via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-media/SKILL.md`

## Output

Display video generation summary:
| Field | Value |
|-------|-------|
| Template | social-reel |
| Duration | 15s |
| Resolution | 1080x1920 |
| File Size | 2.3 MB |
| Output | ${VIDEO_PATH}/output/social-reel-20260319-143022.mp4 |

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Template used, content type, render duration, output format, success/failure
- This enables the intelligence layer to learn template preferences over time

## Intelligence: Post-Command

Log execution metrics for future optimization.
