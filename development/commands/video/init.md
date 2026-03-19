---
description: Scaffold the managed Remotion video project with templates, brand kit, and stock assets
argument-hint: '[--path=<dir>] [--skip-templates] [--skip-stock]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---

# video:init

Scaffold the Remotion video studio project for local video generation.

## Skills

Read these skill files before proceeding:
1. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/brand-kit/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--path` | No | Installation path (default: `~/.founder-os/video-studio/`) |
| `--skip-templates` | No | Skip template installation |
| `--skip-stock` | No | Skip stock asset installation |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files. If present, read them to pre-populate the brand kit from business context.

## Command Flow

1. Parse `--path` argument (default `~/.founder-os/video-studio/`)
2. Check if project already exists at path — if yes, ask user to overwrite or abort
3. Copy `${CLAUDE_PLUGIN_ROOT}/_infrastructure/video-studio-template/` to target path:
   ```bash
   cp -r ${CLAUDE_PLUGIN_ROOT}/_infrastructure/video-studio-template/* <target-path>/
   ```
4. Run `npm install` in the target path:
   ```bash
   cd <target-path> && npm install
   ```
5. If `--skip-templates` not set: templates are included in the scaffold (no extra step)
6. If `--skip-stock` not set: stock assets are included in the scaffold (no extra step)
7. Create `assets/brand-kit.json` from `brand-kit.example.json`:
   ```bash
   cp <target-path>/assets/brand-kit.example.json <target-path>/assets/brand-kit.json
   ```
8. Verify installation — check that key files exist:
   ```bash
   test -f <target-path>/node_modules/remotion/package.json && echo "Remotion: OK" || echo "Remotion: MISSING"
   test -f <target-path>/src/Root.tsx && echo "Root.tsx: OK" || echo "Root.tsx: MISSING"
   ```
9. Report: project path, installed packages, template count (8), stock asset count
10. Suggest next step: `video:brand --set` to configure brand kit, or `video:generate` to create your first video

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Project scaffolded at path
- Template count
- Success or failure
- Stock assets included or skipped
