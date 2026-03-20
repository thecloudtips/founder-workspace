---
description: Manage the video brand kit (colors, fonts, logos, music)
argument-hint: '--set|--show|--import|--reset'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---

# video:brand

Manage the video brand kit — colors, fonts, logos, and music.

## Skills

Read these skill files before proceeding:
1. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/brand-kit/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--show` | No | Display current brand kit configuration |
| `--set` | No | Interactive wizard to set brand kit values |
| `--import` | No | Import brand kit from FOS business context files |
| `--reset` | No | Reset to default brand kit |

At least one flag is required.

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files. Used by `--import` to populate brand kit.

## Workspace Resolution

1. Read `~/.founder-os/video-studio.json`. If missing or invalid JSON: error with "Video studio not initialized or state file corrupted. Run /founder-os:video:init first."
2. Set `VIDEO_PATH` from the state file's `path` field.
3. Validate: check `${VIDEO_PATH}/assets/brand-kit.json` exists. If missing: error with "Brand kit not found. Run /founder-os:video:init to set up the video studio."

## Execution

### --show
1. Read `${VIDEO_PATH}/assets/brand-kit.json`
2. Display formatted brand kit: company name, color swatches (hex values), font paths, logo paths, music tracks
3. Validate: check all referenced files exist, flag any missing assets

### --set
Interactive wizard:
1. Ask: Company name
2. Ask: Primary color (hex, suggest current value)
3. Ask: Secondary color (hex, suggest complementary)
4. Ask: Accent color (hex)
5. Ask: Background color (hex)
6. Ask: Text color (hex)
7. Ask: Heading font path (or skip for default)
8. Ask: Logo file path
9. Ask: Default music track (stock options or custom path)
10. Write updated `brand-kit.json`
11. Display summary of changes

### --import
1. Read business context files from `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/`
2. Extract brand information (company, colors, fonts, logos)
3. Build brand-kit.json from extracted data
4. Copy any referenced asset files to the managed project's assets/ directory
5. Write `${VIDEO_PATH}/assets/brand-kit.json`
6. Show what was imported and any fields that still need manual configuration

### --reset
1. Copy `brand-kit.example.json` over `brand-kit.json`
2. Confirm reset to user

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Brand kit action (show/set/import/reset)
- Fields modified
