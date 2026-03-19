---
description: Render still frames at key moments to preview a video before full render
argument-hint: '--template=<name> [--frames=0,30,60] [--props=<json>]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# video:preview

Render still frames at key moments to preview a video before full render.

## Skills

Read these skill files before proceeding:
1. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/video-rendering/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/video-templates/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--template` | Yes | Template/composition ID to preview |
| `--frames` | No | Comma-separated frame numbers (default: 0, midpoint, 90% of duration) |
| `--props` | No | Props JSON string or file path |

## Preflight Check

Run `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md` for namespace `video`.

## Step 0: Memory Context

Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`. Query for `video preview`, template name.

## Execution

1. Resolve template composition ID
2. Load props (from `--props` or from last-used props in `output/.props-tmp.json`)
3. Determine frame numbers (default: 0, midpoint, near-end based on composition duration)
4. For each frame:
   ```bash
   cd ~/.founder-os/video-studio
   npx remotion still <composition-id> --frame=<N> --output=output/previews/<comp>-frame-<N>.png --props='<json>'
   ```
5. Display generated preview file paths

## Output

| Frame | File |
|-------|------|
| 0 | output/previews/social-reel-frame-0.png |
| 45 | output/previews/social-reel-frame-45.png |
| 81 | output/previews/social-reel-frame-81.png |

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Template previewed, frame count
- Success or failure
