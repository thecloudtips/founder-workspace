---
description: Re-render an existing composition with updated props or different output format
argument-hint: '--composition=<id> [--props=<path>] [--format=reel|story|square|landscape|gif] [--output=<path>]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# video:render

Re-render an existing composition with updated props or different output format.

## Skills

Read these skill files before proceeding:
1. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/video-rendering/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--composition` | Yes | Composition ID from Root.tsx (e.g., social-reel) |
| `--props` | No | Props JSON file path (default: last-used `output/.props-tmp.json`) |
| `--format` | No | Output preset: reel, story, square, landscape, gif |
| `--output` | No | Custom output file path |

## Workspace Resolution

1. Read `~/.founder-os/video-studio.json`. If missing or invalid JSON: error with "Video studio not initialized or state file corrupted. Run /founder-os:video:init first."
2. Set `VIDEO_PATH` from the state file's `path` field.
3. Validate: check `${VIDEO_PATH}/node_modules/.bin/remotion` exists. If missing: error with "Video studio workspace at [path] appears incomplete or missing. Run /founder-os:video:init to reinitialize."

## Preflight Check

Run `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md` for namespace `video`.

## Step 0: Memory Context

Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`. Query for `video rendering`, composition name.

## Execution

1. Validate composition exists in the managed project
2. Load props from `--props` or `output/.props-tmp.json`
3. Resolve output preset from `--format` (default: use composition's native dimensions)
4. Build output file path: `--output` or `output/<composition>-<timestamp>.mp4`
5. Execute render:
   ```bash
   cd ${VIDEO_PATH} && ./node_modules/.bin/remotion render <composition-id> \
     --output=<output-path> \
     --props=<props-path> \
     --codec=h264 \
     --concurrency=50%
   ```
   For gif format: `--codec=gif --every-nth-frame=2`
6. Report: output path, duration, file size, resolution

## Output

| Field | Value |
|-------|-------|
| Composition | social-reel |
| Format | reel (1080x1920) |
| Duration | 15s |
| File Size | 2.3 MB |
| Output | ${VIDEO_PATH}/output/social-reel-20260319-143022.mp4 |

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Composition rendered, format, duration, file size
- Success or failure
