# Video Studio Remediation — Design Spec

**Date**: 2026-03-20
**Status**: Approved
**Scope**: Issues #1-4 from `docs/troubleshooting/video-studio-remediation-plan.md`
**Environment**: Node v25.8.1, npm v25.x, Remotion v4.0.438, macOS ARM64

---

## Problem Summary

The first end-to-end test of the video studio (2026-03-19) revealed 6 issues. This spec addresses the 4 that block or degrade the video command experience:

1. `npx remotion` broken on npm v25+ (all video commands fail)
2. Preflight dependency checks hardcoded to default path (false failures)
3. Working directory sensitivity (Remotion CLI fails from parent directory)
4. Memory/context hooks error noisily on fresh installs

Issues #5-6 are captured in a separate deferred spec.

---

## Design

### 1. Managed Workspace with State File

**Replaces**: hardcoded `~/.founder-os/video-studio/` path and all `npx remotion` invocations.

#### How it works

`video:init` installs Remotion from npm into a workspace directory and writes a state file that all other commands read.

**State file location**: `~/.founder-os/video-studio.json`

**State file schema**:
```json
{
  "path": "/Users/alice/.founder-os/video-studio",
  "remotionVersion": "4.0.438",
  "initializedAt": "2026-03-19T16:05:00Z"
}
```

**Init flow**:
1. Resolve target path: `--path` argument or default `~/.founder-os/video-studio/`
2. Copy template from `${CLAUDE_PLUGIN_ROOT}/_infrastructure/video-studio-template/`
3. Run `cd ${VIDEO_PATH} && npm install` (pulls Remotion from npm registry)
4. Write `~/.founder-os/video-studio.json` with resolved path and version
5. Confirm initialization

**Command flow** (generate, render, preview, brand, templates):
1. Read `~/.founder-os/video-studio.json`
2. If missing or invalid JSON: error with `"Video studio not initialized or state file corrupted. Run /founder-os:video:init first."`
3. Set `VIDEO_PATH` from state file's `path` field
4. Validate workspace: check `${VIDEO_PATH}/node_modules/.bin/remotion` exists. If missing: error with `"Video studio workspace at [path] appears incomplete or missing. Run /founder-os:video:init to reinitialize."`
5. All Remotion CLI calls use: `cd ${VIDEO_PATH} && ./node_modules/.bin/remotion <args>`

**How commands use `VIDEO_PATH`**: These are markdown command files read by Claude Code, not shell scripts. Each command should include a preamble instruction: "Read `~/.founder-os/video-studio.json`. Extract the `path` field. Use it as `VIDEO_PATH` for all subsequent commands in this execution." The `VIDEO_PATH` variable is a conceptual reference for Claude Code to resolve, not a shell export.

This eliminates `npx remotion` entirely (fixes issue #1), resolves working directory sensitivity (fixes issue #3), and provides a single source of truth for the installation path.

#### Files changed

| File | Change |
|------|--------|
| `development/commands/video/init.md` | Add state file write after npm install |
| `development/commands/video/generate.md` | Read state file, replace `npx remotion` with `cd ${VIDEO_PATH} && ./node_modules/.bin/remotion`, remove `ffmpeg` from inline preflight comment (line 41) |
| `development/commands/video/render.md` | Same pattern |
| `development/commands/video/preview.md` | Same pattern |
| `development/commands/video/brand.md` | Read state file for brand-kit.json location |
| `development/commands/video/templates.md` | Read state file for template directory |

---

### 2. Path-Aware Preflight Checks

**Replaces**: hardcoded path checks in `dependency-registry.json`.

#### Changes

**`remotion-project` check**:
- Before: checks `~/.founder-os/video-studio/node_modules/remotion` (hardcoded)
- After: reads `~/.founder-os/video-studio.json`, checks `${path}/node_modules/remotion`
- If no state file: fails with "Run video:init first"

**`ffmpeg` check**:
- Removed from `required` array entirely
- Remotion 4.x bundles ffmpeg in `@remotion/compositor-darwin-arm64/ffmpeg`
- No system ffmpeg dependency needed

**`disk-space` check**:
- Before: checks `~/.founder-os/video-studio/output` (hardcoded)
- After: reads state file, checks `${path}/output/` for >= 500MB free

**Video required array**:
```json
// Before
"required": ["node", "remotion-project", "ffmpeg", "disk-space"]

// After
"required": ["node", "remotion-project", "disk-space"]
```

#### Files changed

| File | Change |
|------|--------|
| `development/_infrastructure/preflight/dependency-registry.json` | Update video checks to read state file, remove ffmpeg |
| `development/skills/video/video-rendering/SKILL.md` | Replace all `npx remotion` with `cd ${VIDEO_PATH} && ./node_modules/.bin/remotion` (sections 2, 3), replace hardcoded `~/.founder-os/video-studio/` with `${VIDEO_PATH}`, remove ffmpeg error recovery row |

---

### 3. Graceful Degradation for Memory & Context Hooks

**Replaces**: noisy errors when `.memory/memory.db` or `context/active/` don't exist.

#### Design principle

Memory enhances commands but never blocks them. A command produces identical core output whether memory is initialized or not.

#### Guard behavior

**Context injection** (`_infrastructure/memory/context-injection/SKILL.md`):
- Current behavior: Step 1 auto-initializes the database if missing (`mkdir -p .memory && sqlite3 .memory/memory.db < schema`). This is being **changed** to a skip pattern.
- New behavior: Before querying `.memory/memory.db`, check if file exists. If missing: output `[memory: not initialized, skipping]`, return empty context. Do NOT auto-create the database — initialization is the responsibility of explicit setup, not a side effect of running a video command.
- Before loading `context/active/*.md`: check if directory has `.md` files
- If empty: skip silently (context is optional enrichment, no log needed)

**Pattern detection** (`_infrastructure/memory/pattern-detection/SKILL.md`):
- Current behavior: The degradation table (line 558) already specifies "Skip all pattern detection silently; do not attempt to create the DB." This is the correct behavior.
- Change needed: Verify this guard is applied at the **top** of the execution flow (before any DB operations), not just documented in the degradation table. Ensure the skip message `[memory: not initialized, skipping observation logging]` is output for debuggability.

#### Files changed

| File | Change |
|------|--------|
| `development/_infrastructure/memory/context-injection/SKILL.md` | Change Step 1 from auto-initializing DB to skip-with-log. Add guard for context/active/ |
| `development/_infrastructure/memory/pattern-detection/SKILL.md` | Verify skip guard is applied at top of execution flow, add one-line log message |

---

## Files Changed Summary

| # | File | Issues Fixed |
|---|------|-------------|
| 1 | `development/commands/video/init.md` | #1, #3 |
| 2 | `development/commands/video/generate.md` | #1, #3 |
| 3 | `development/commands/video/render.md` | #1, #3 |
| 4 | `development/commands/video/preview.md` | #1, #3 |
| 5 | `development/commands/video/brand.md` | #1, #3 |
| 6 | `development/commands/video/templates.md` | #1, #3 |
| 7 | `development/_infrastructure/preflight/dependency-registry.json` | #2 |
| 8 | `development/skills/video/video-rendering/SKILL.md` | #1, #2, #3 |
| 9 | `development/_infrastructure/memory/context-injection/SKILL.md` | #4 |
| 10 | `development/_infrastructure/memory/pattern-detection/SKILL.md` | #4 |

---

## Testing Strategy

After implementation, re-run the original test scenario:

1. **Fresh install test**: Delete `~/.founder-os/video-studio.json` and `~/.founder-os/video-studio/`. Run `video:init`. Verify state file created with correct path and version.
2. **Custom path test**: Run `video:init --path=/tmp/test-video-studio`. Verify state file points to custom path.
3. **Generate without init**: Delete state file. Run `video:generate`. Verify clear error message.
4. **Preflight test**: Run any video command. Verify no false ffmpeg failure. Verify remotion-project and disk-space checks use state file path.
5. **Memory degradation test**: Ensure `.memory/memory.db` does not exist. Run `video:generate`. Verify one-line skip messages, no errors, successful render.
6. **Full render test**: Run `video:generate --template=SocialReel --script="Test render"`. Verify end-to-end success on npm v25+.
