# Video Studio Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 blocking issues from the first video studio test — eliminate `npx remotion`, add managed workspace state file, make preflight checks path-aware, and add graceful degradation for memory hooks.

**Architecture:** Introduce a state file (`~/.founder-os/video-studio.json`) written by `video:init` and read by all other video commands. Replace all `npx remotion` with direct binary invocation via `cd ${VIDEO_PATH} && ./node_modules/.bin/remotion`. Update preflight registry to read state file. Add skip guards to memory infrastructure skills.

**Tech Stack:** Markdown command files (Claude Code plugin format), JSON (dependency registry), SQLite (memory store)

**Spec:** `docs/superpowers/specs/2026-03-20-video-studio-remediation-design.md`

---

## Chunk 1: State File and Init Command

### Task 1: Update `video:init` to write state file

**Files:**
- Modify: `development/commands/video/init.md`

- [ ] **Step 1: Read the current init.md**

Read `development/commands/video/init.md` to confirm current state matches plan expectations.

- [ ] **Step 2: Add state file write to init flow**

After step 8 (verify installation) and before step 9 (report), add a new step that writes the state file. Edit `development/commands/video/init.md`:

Replace:
```markdown
8. Verify installation — check that key files exist:
   ```bash
   test -f <target-path>/node_modules/remotion/package.json && echo "Remotion: OK" || echo "Remotion: MISSING"
   test -f <target-path>/src/Root.tsx && echo "Root.tsx: OK" || echo "Root.tsx: MISSING"
   ```
9. Report: project path, installed packages, template count (8), stock asset count
```

With:
```markdown
8. Verify installation — check that key files exist:
   ```bash
   test -f <target-path>/node_modules/remotion/package.json && echo "Remotion: OK" || echo "Remotion: MISSING"
   test -f <target-path>/src/Root.tsx && echo "Root.tsx: OK" || echo "Root.tsx: MISSING"
   ```
9. Write state file at `~/.founder-os/video-studio.json`:
   ```json
   {
     "path": "<target-path>",
     "remotionVersion": "<version from target-path/node_modules/remotion/package.json>",
     "initializedAt": "<ISO 8601 timestamp>"
   }
   ```
   Read the Remotion version from `<target-path>/node_modules/remotion/package.json` `version` field.
   If a state file already exists pointing to a **different** path, warn the user: "An existing video studio exists at [old-path]. Overwriting state file to point to [new-path]."
10. Report: project path, installed packages, template count (8), stock asset count
```

- [ ] **Step 3: Update step numbering**

Renumber step 10 (previously 9) and step 11 (previously 10: "Suggest next step") accordingly.

- [ ] **Step 4: Verify the edit**

Read `development/commands/video/init.md` and confirm: state file write is step 9, report is step 10, suggest next step is step 11. Final Step (Observation Logging) remains unchanged.

- [ ] **Step 5: Commit**

```bash
git add development/commands/video/init.md
git commit -m "feat(video): add state file write to video:init command"
```

---

### Task 2: Add state file preamble to `video:generate`

**Files:**
- Modify: `development/commands/video/generate.md`

- [ ] **Step 1: Read the current generate.md**

Read `development/commands/video/generate.md`.

- [ ] **Step 2: Add state file preamble before Preflight Check**

Insert a new section between "Business Context" and "Preflight Check". Edit `development/commands/video/generate.md`:

Replace:
```markdown
## Preflight Check

Run `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md` for namespace `video`.
- Required: `node` (>= 18), `remotion-project` (managed project installed), `ffmpeg`, `disk-space` (>= 500MB in output dir)
- Optional: `late` (only for `--post` flag)
```

With:
```markdown
## Workspace Resolution

1. Read `~/.founder-os/video-studio.json`. If missing or invalid JSON: error with "Video studio not initialized or state file corrupted. Run /founder-os:video:init first."
2. Set `VIDEO_PATH` from the state file's `path` field.
3. Validate: check `${VIDEO_PATH}/node_modules/.bin/remotion` exists. If missing: error with "Video studio workspace at [path] appears incomplete or missing. Run /founder-os:video:init to reinitialize."

## Preflight Check

Run `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md` for namespace `video`.
- Required: `node` (>= 18), `remotion-project` (managed project installed), `disk-space` (>= 500MB in output dir)
- Optional: `late` (only for `--post` flag)
```

Note: `ffmpeg` removed from the required list. The `Optional` line is preserved.

- [ ] **Step 3: Replace all `npx remotion` and hardcoded paths in Phase 2**

Replace the Phase 2 preview code block (lines 70-77):

Replace:
```markdown
1. Write props JSON to temporary file: `~/.founder-os/video-studio/output/.props-tmp.json`
2. Render 3 still frames:
   ```bash
   cd ~/.founder-os/video-studio
   npx remotion still <composition-id> --frame=0 --output=output/previews/preview-start.png --props=output/.props-tmp.json
   npx remotion still <composition-id> --frame=<mid> --output=output/previews/preview-mid.png --props=output/.props-tmp.json
   npx remotion still <composition-id> --frame=<near-end> --output=output/previews/preview-end.png --props=output/.props-tmp.json
   ```
```

With:
```markdown
1. Write props JSON to temporary file: `${VIDEO_PATH}/output/.props-tmp.json`
2. Render 3 still frames:
   ```bash
   cd ${VIDEO_PATH} && ./node_modules/.bin/remotion still <composition-id> --frame=0 --output=output/previews/preview-start.png --props=output/.props-tmp.json
   cd ${VIDEO_PATH} && ./node_modules/.bin/remotion still <composition-id> --frame=<mid> --output=output/previews/preview-mid.png --props=output/.props-tmp.json
   cd ${VIDEO_PATH} && ./node_modules/.bin/remotion still <composition-id> --frame=<near-end> --output=output/previews/preview-end.png --props=output/.props-tmp.json
   ```
```

- [ ] **Step 4: Replace all `npx remotion` and hardcoded paths in Phase 3**

Replace the Phase 3 render code block (lines 86-94):

Replace:
```markdown
1. Execute full render:
   ```bash
   cd ~/.founder-os/video-studio
   npx remotion render <composition-id> \
     --output=output/<template>-<timestamp>.mp4 \
     --props=output/.props-tmp.json \
     --codec=h264 \
     --concurrency=50%
   ```
```

With:
```markdown
1. Execute full render:
   ```bash
   cd ${VIDEO_PATH} && ./node_modules/.bin/remotion render <composition-id> \
     --output=output/<template>-<timestamp>.mp4 \
     --props=output/.props-tmp.json \
     --codec=h264 \
     --concurrency=50%
   ```
```

- [ ] **Step 5: Update Output table path**

Replace:
```markdown
| Output | ~/.founder-os/video-studio/output/social-reel-20260319-143022.mp4 |
```

With:
```markdown
| Output | ${VIDEO_PATH}/output/social-reel-20260319-143022.mp4 |
```

- [ ] **Step 6: Verify the edit**

Read `development/commands/video/generate.md` and confirm: no `npx remotion` references remain, no hardcoded `~/.founder-os/video-studio` paths remain, `ffmpeg` removed from preflight comment.

- [ ] **Step 7: Commit**

```bash
git add development/commands/video/generate.md
git commit -m "feat(video): add workspace resolution and replace npx remotion in generate command"
```

---

### Task 3: Update `video:render` with state file preamble and direct binary

**Files:**
- Modify: `development/commands/video/render.md`

- [ ] **Step 1: Read the current render.md**

Read `development/commands/video/render.md`.

- [ ] **Step 2: Add Workspace Resolution section before Preflight Check**

Insert between "Arguments" table and "Preflight Check":

```markdown
## Workspace Resolution

1. Read `~/.founder-os/video-studio.json`. If missing or invalid JSON: error with "Video studio not initialized or state file corrupted. Run /founder-os:video:init first."
2. Set `VIDEO_PATH` from the state file's `path` field.
3. Validate: check `${VIDEO_PATH}/node_modules/.bin/remotion` exists. If missing: error with "Video studio workspace at [path] appears incomplete or missing. Run /founder-os:video:init to reinitialize."
```

- [ ] **Step 3: Replace render code block**

Note: The code block in the actual file is indented under a numbered list item (3 spaces of leading whitespace). Match the indented version as it appears in the file. The snippets below show content without leading whitespace for readability.

Replace the bash code block inside step 5 ("Execute render:") that contains `cd ~/.founder-os/video-studio` and `npx remotion render`. Change to:
- `cd ~/.founder-os/video-studio` → `cd ${VIDEO_PATH} && ./node_modules/.bin/remotion render <composition-id> \`
- Remove the separate `npx remotion render` line (merged into the `cd` line)
- Keep all `--output`, `--props`, `--codec`, `--concurrency` flags unchanged

- [ ] **Step 4: Update Output table path**

Replace `~/.founder-os/video-studio/output/` with `${VIDEO_PATH}/output/` in the Output table.

- [ ] **Step 5: Verify — no `npx remotion` or hardcoded paths remain**

- [ ] **Step 6: Commit**

```bash
git add development/commands/video/render.md
git commit -m "feat(video): add workspace resolution and replace npx remotion in render command"
```

---

### Task 4: Update `video:preview` with state file preamble and direct binary

**Files:**
- Modify: `development/commands/video/preview.md`

- [ ] **Step 1: Read the current preview.md**

Read `development/commands/video/preview.md`.

- [ ] **Step 2: Add Workspace Resolution section before Preflight Check**

Same Workspace Resolution block as Tasks 2-3.

- [ ] **Step 3: Replace preview code block**

Note: The code block in the actual file is indented under a numbered list item (3 spaces of leading whitespace). Match the indented version as it appears in the file.

Replace the bash code block inside step 4 ("For each frame:") that contains `cd ~/.founder-os/video-studio` and `npx remotion still`. Change to a single line:
`cd ${VIDEO_PATH} && ./node_modules/.bin/remotion still <composition-id> --frame=<N> --output=output/previews/<comp>-frame-<N>.png --props='<json>'`

- [ ] **Step 4: Verify — no `npx remotion` or hardcoded paths remain**

- [ ] **Step 5: Commit**

```bash
git add development/commands/video/preview.md
git commit -m "feat(video): add workspace resolution and replace npx remotion in preview command"
```

---

### Task 5: Update `video:brand` with state file preamble

**Files:**
- Modify: `development/commands/video/brand.md`

- [ ] **Step 1: Read the current brand.md**

Read `development/commands/video/brand.md`.

- [ ] **Step 2: Add Workspace Resolution section before Execution**

Insert between "Business Context" and "Execution":

```markdown
## Workspace Resolution

1. Read `~/.founder-os/video-studio.json`. If missing or invalid JSON: error with "Video studio not initialized or state file corrupted. Run /founder-os:video:init first."
2. Set `VIDEO_PATH` from the state file's `path` field.
3. Validate: check `${VIDEO_PATH}/assets/brand-kit.json` exists. If missing: error with "Brand kit not found. Run /founder-os:video:init to set up the video studio."
```

- [ ] **Step 3: Replace hardcoded paths in --show, --import, --reset**

Replace all `~/.founder-os/video-studio/` references with `${VIDEO_PATH}/`:
- `--show`: `~/.founder-os/video-studio/assets/brand-kit.json` → `${VIDEO_PATH}/assets/brand-kit.json`
- `--import`: `~/.founder-os/video-studio/assets/brand-kit.json` → `${VIDEO_PATH}/assets/brand-kit.json`
- `--reset`: no hardcoded path (uses relative reference), but verify

- [ ] **Step 4: Verify — no hardcoded `~/.founder-os/video-studio` paths remain**

- [ ] **Step 5: Commit**

```bash
git add development/commands/video/brand.md
git commit -m "feat(video): add workspace resolution to brand command"
```

---

### Task 6: Update `video:templates` with state file preamble

**Files:**
- Modify: `development/commands/video/templates.md`

- [ ] **Step 1: Read the current templates.md**

Read `development/commands/video/templates.md`.

- [ ] **Step 2: Add Workspace Resolution section before Execution**

Insert between "Arguments" table and "Execution":

```markdown
## Workspace Resolution

1. Read `~/.founder-os/video-studio.json`. If missing or invalid JSON: error with "Video studio not initialized or state file corrupted. Run /founder-os:video:init first."
2. Set `VIDEO_PATH` from the state file's `path` field.
```

- [ ] **Step 3: Replace hardcoded path in --detail**

Replace:
```markdown
4. If `--detail` flag: for each template, read the TypeScript source file at `~/.founder-os/video-studio/src/templates/<Name>.tsx` and display the props interface.
```

With:
```markdown
4. If `--detail` flag: for each template, read the TypeScript source file at `${VIDEO_PATH}/src/templates/<Name>.tsx` and display the props interface.
```

- [ ] **Step 4: Verify — no hardcoded paths remain**

- [ ] **Step 5: Commit**

```bash
git add development/commands/video/templates.md
git commit -m "feat(video): add workspace resolution to templates command"
```

---

## Chunk 2: Preflight Registry and Rendering Skill

### Task 7: Update dependency registry

**Files:**
- Modify: `development/_infrastructure/preflight/dependency-registry.json`

- [ ] **Step 1: Read the current registry**

Read `development/_infrastructure/preflight/dependency-registry.json` lines 145-172.

- [ ] **Step 2: Remove ffmpeg from video required array**

Replace:
```json
    "video": {
      "required": ["node", "remotion-project", "ffmpeg", "disk-space"],
      "optional": ["late"]
    }
```

With:
```json
    "video": {
      "required": ["node", "remotion-project", "disk-space"],
      "optional": ["late"]
    }
```

- [ ] **Step 3: Update remotion-project check to use state file**

Replace:
```json
    "remotion-project": {
      "check": "test -d ~/.founder-os/video-studio/node_modules/remotion",
      "description": "Managed Remotion project (run /founder-os:video:init to set up)"
    },
```

With:
```json
    "remotion-project": {
      "check": "node -e \"const j=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.founder-os/video-studio.json','utf8')); require('fs').accessSync(j.path+'/node_modules/remotion')\" 2>/dev/null",
      "description": "Managed Remotion project with state file (run /founder-os:video:init to set up)"
    },
```

- [ ] **Step 4: Update disk-space check to use state file**

Replace:
```json
    "disk-space": {
      "check": "df -k ~/.founder-os/video-studio/output 2>/dev/null | awk 'NR==2 {if ($4 < 512000) exit 1}'",
      "description": ">= 500MB free in video output directory"
    }
```

With:
```json
    "disk-space": {
      "check": "df -k $(node -e \"process.stdout.write(JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.founder-os/video-studio.json','utf8')).path)\")/output 2>/dev/null | awk 'NR==2 {if ($4 < 512000) exit 1}'",
      "description": ">= 500MB free in video output directory"
    }
```

- [ ] **Step 5: Remove the ffmpeg dependency entry entirely**

Delete:
```json
    "ffmpeg": {
      "check": "ffmpeg -version 2>/dev/null",
      "description": "ffmpeg for video encoding"
    },
```

- [ ] **Step 6: Verify the edits**

Read the modified file and confirm: no `ffmpeg` in video required array, no `ffmpeg` dependency entry, remotion-project and disk-space checks read from state file.

- [ ] **Step 7: Commit**

```bash
git add development/_infrastructure/preflight/dependency-registry.json
git commit -m "fix(preflight): make video checks path-aware via state file, remove ffmpeg requirement"
```

---

### Task 8: Update video-rendering skill

**Files:**
- Modify: `development/skills/video/video-rendering/SKILL.md`

- [ ] **Step 1: Read the current skill file**

Read `development/skills/video/video-rendering/SKILL.md`.

- [ ] **Step 2: Replace hardcoded path in section 2 (Preview Workflow)**

Replace:
```markdown
1. Navigate to the managed project directory:
   ```bash
   cd ~/.founder-os/video-studio/
   ```

2. For each frame to preview, render a still:
   ```bash
   npx remotion still <composition-id> \
     --frame=<N> \
     --output=output/previews/<comp>-frame-<N>.png \
     --props='<json>'
   ```
```

With:
```markdown
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
```

- [ ] **Step 3: Replace preview output path**

Replace:
```markdown
5. All preview output goes to: `~/.founder-os/video-studio/output/previews/`
```

With:
```markdown
5. All preview output goes to: `${VIDEO_PATH}/output/previews/`
```

- [ ] **Step 4: Replace section 3 Standard video render**

Replace:
```markdown
```bash
cd ~/.founder-os/video-studio
npx remotion render <composition-id> \
  --output=output/<template>-<timestamp>.mp4 \
  --props='<json>' \
  --codec=h264 \
  --concurrency=50%
```
```

With:
```markdown
```bash
cd ${VIDEO_PATH} && ./node_modules/.bin/remotion render <composition-id> \
  --output=output/<template>-<timestamp>.mp4 \
  --props='<json>' \
  --codec=h264 \
  --concurrency=50%
```
```

- [ ] **Step 5: Replace section 3 GIF render**

Replace:
```markdown
```bash
cd ~/.founder-os/video-studio
npx remotion render <composition-id> \
  --output=output/<template>-<timestamp>.gif \
  --props='<json>' \
  --codec=gif \
  --every-nth-frame=2
```
```

With:
```markdown
```bash
cd ${VIDEO_PATH} && ./node_modules/.bin/remotion render <composition-id> \
  --output=output/<template>-<timestamp>.gif \
  --props='<json>' \
  --codec=gif \
  --every-nth-frame=2
```
```

- [ ] **Step 6: Replace section 3 Custom dimensions**

Replace:
```markdown
```bash
npx remotion render <composition-id> \
  --output=output/<template>-<timestamp>.mp4 \
  --props='<json>' \
  --codec=h264 \
  --width=1200 \
  --height=628 \
  --concurrency=50%
```
```

With:
```markdown
```bash
cd ${VIDEO_PATH} && ./node_modules/.bin/remotion render <composition-id> \
  --output=output/<template>-<timestamp>.mp4 \
  --props='<json>' \
  --codec=h264 \
  --width=1200 \
  --height=628 \
  --concurrency=50%
```
```

- [ ] **Step 7: Remove ffmpeg error recovery row and stale prose reference**

Delete this row from the error recovery table:
```markdown
| ffmpeg missing | ffmpeg not in PATH | Show install instructions: `brew install ffmpeg` (macOS), `apt install ffmpeg` (Linux) |
```

Also update the error recovery prose (line 114) that references "missing ffmpeg". Change:
```markdown
4. If recovery requires user input (e.g., disk space, missing ffmpeg), display the issue and suggested fix, then wait for confirmation before retrying.
```
To:
```markdown
4. If recovery requires user input (e.g., disk space), display the issue and suggested fix, then wait for confirmation before retrying.
```

Remotion 4.x bundles its own ffmpeg — no system dependency needed.

- [ ] **Step 8: Verify the edits**

Read the full file. Confirm: zero `npx remotion` references, zero `~/.founder-os/video-studio` hardcoded paths, no ffmpeg error recovery row.

- [ ] **Step 9: Commit**

```bash
git add development/skills/video/video-rendering/SKILL.md
git commit -m "fix(video): replace npx remotion with direct binary, remove ffmpeg dependency from rendering skill"
```

---

## Chunk 3: Memory Infrastructure Graceful Degradation

### Task 9: Update context-injection skill

**Files:**
- Modify: `development/_infrastructure/memory/context-injection/SKILL.md`

- [ ] **Step 1: Read the current skill file**

Read `development/_infrastructure/memory/context-injection/SKILL.md`.

- [ ] **Step 2: Replace Step 1 auto-initialization with skip guard**

Replace:
```markdown
### Step 1: Initialize the store

Check that `.memory/memory.db` exists. If it does not, initialize it from the schema:

```bash
if [ ! -f ".memory/memory.db" ]; then
  mkdir -p .memory
  sqlite3 .memory/memory.db < _infrastructure/memory/schema/memory-store.sql
fi
```

Quick schema validation — confirm the core tables exist:

```sql
SELECT name FROM sqlite_master
WHERE type = 'table'
  AND name IN ('memories', 'observations', 'adaptations');
-- Expected: 3 rows. If fewer, re-run the schema file.
```

If validation fails, re-apply the schema (idempotent due to `CREATE TABLE IF NOT EXISTS`) and continue.
```

With:
```markdown
### Step 1: Check memory store availability

Check that `.memory/memory.db` exists.

If it does **not** exist:
- Output: `[memory: not initialized, skipping]`
- Return immediately — do not create the database, do not proceed to Step 2
- Database initialization is the responsibility of explicit setup (e.g., `/founder-os:memory:sync`), not a side effect of running a command

If it **does** exist, validate the core tables:

```sql
SELECT name FROM sqlite_master
WHERE type = 'table'
  AND name IN ('memories', 'observations', 'adaptations');
-- Expected: 3 rows.
```

If tables are missing, skip injection and output: `[memory: schema incomplete, skipping]`. Do not attempt to re-create the schema.
```

- [ ] **Step 3: Update the Graceful Degradation table**

Replace:
```markdown
| `.memory/memory.db` does not exist | Attempt initialization once. If that fails, skip injection silently and continue. |
```

With:
```markdown
| `.memory/memory.db` does not exist | Output `[memory: not initialized, skipping]`. Skip injection and continue. Do not attempt initialization. |
```

- [ ] **Step 4: Update the Plugin Command Template**

Replace:
```markdown
1. Verify `.memory/memory.db` exists (initialize from schema if not).
```

With:
```markdown
1. Check if `.memory/memory.db` exists. If not, output `[memory: not initialized, skipping]` and skip to Step 1 of the plugin's main logic.
```

- [ ] **Step 5: Verify the edits**

Read the full file. Confirm: no auto-initialization of `.memory/memory.db`, skip-with-log behavior in Step 1, degradation table updated, plugin command template updated.

- [ ] **Step 6: Commit**

```bash
git add development/_infrastructure/memory/context-injection/SKILL.md
git commit -m "fix(memory): replace auto-initialization with skip guard in context injection"
```

---

### Task 10: Verify and update pattern-detection skill

**Files:**
- Modify: `development/_infrastructure/memory/pattern-detection/SKILL.md`

- [ ] **Step 1: Read the current skill file — focus on the top of execution flow**

Read `development/_infrastructure/memory/pattern-detection/SKILL.md` (first 50 lines to find the execution entry point).

- [ ] **Step 2: Read the graceful degradation section**

Read lines 550-567 to confirm the degradation table.

- [ ] **Step 3: Add skip guard at top of execution flow**

Insert immediately before the `## Observation Logging` heading (currently around line 24) — this is the first execution entry point. Add a guard before any DB operations:

```markdown
### Pre-check: Memory Store Availability

Before any database operations, check that `.memory/memory.db` exists.

If it does **not** exist:
- Output: `[memory: not initialized, skipping observation logging]`
- Return immediately — do not attempt any observation logging or pattern detection
- This is the expected state for fresh installations

If it **does** exist, proceed to Step 1.
```

- [ ] **Step 4: Verify the edit**

Read the modified section. Confirm: skip guard is the first thing that executes, before any SQLite operations. The existing degradation table at line 558 remains as a secondary safety net.

- [ ] **Step 5: Commit**

```bash
git add development/_infrastructure/memory/pattern-detection/SKILL.md
git commit -m "fix(memory): add skip guard at top of pattern detection execution flow"
```

---

### Task 11: Final verification and combined commit

- [ ] **Step 1: Verify no `npx remotion` remains anywhere in video commands or skills**

```bash
grep -r "npx remotion" development/commands/video/ development/skills/video/
```

Expected: zero matches.

- [ ] **Step 2: Verify no hardcoded `~/.founder-os/video-studio` paths in commands or skills**

```bash
grep -r "~/.founder-os/video-studio/" development/commands/video/ development/skills/video/
```

Expected: zero matches. Note the trailing `/` in the grep pattern — this distinguishes directory paths from `~/.founder-os/video-studio.json` state file references, which should remain.

- [ ] **Step 3: Verify no `ffmpeg` in video preflight**

```bash
grep "ffmpeg" development/_infrastructure/preflight/dependency-registry.json
```

Expected: zero matches.

- [ ] **Step 4: Verify state file preamble in all 5 non-init commands**

```bash
grep -l "video-studio.json" development/commands/video/generate.md development/commands/video/render.md development/commands/video/preview.md development/commands/video/brand.md development/commands/video/templates.md
```

Expected: all 5 files listed.

- [ ] **Step 5: Push to remote**

```bash
git push
```
