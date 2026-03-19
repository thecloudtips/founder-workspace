# [18] Init Runtime Wiring Design

**Date**: 2026-03-17
**Status**: Draft
**Depends on**: [4] Installer Design, [9] Evals Framework, [17] Init Plugin Install
**Blocks**: None

---

## 1. Problem Statement

The founderOS init command copies 630+ files (commands, skills, agents, infrastructure) into the user's project but does NOT activate the runtime. After installation, users get a dead workspace where all the infrastructure exists as inert files:

1. **Memory DB exists but nothing triggers it.** The file `.memory/memory.db` is created during install with the correct schema, but no hook calls the memory engine. Memories are never stored, retrieved, or decayed.

2. **Intelligence DB exists but nothing initializes the engine.** The file `.founderOS/infrastructure/intelligence/.data/intelligence.db` is present with 8 tables, but no process feeds observations, detects patterns, or runs evals.

3. **Dispatcher is a SKILL.md file but commands do not invoke it.** Every `/founder-os:*` command runs inline in the main session. There is no background delegation, no foreground/background routing, and no parallelism. The user's session blocks on every command.

4. **Hooks are described in SKILL.md files but NOT registered.** Claude Code supports 5 hook events (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop). None of them are wired into `.claude/settings.json` after init.

The result: users install founderOS and get a collection of static files. The memory engine, intelligence engine, dispatcher, and evals pipeline all require manual setup that is not documented and not expected.

---

## 2. Goals and Non-Goals

### Goals

- Init wires up all 5 Claude Code hooks in `.claude/settings.json` as part of the install process.
- Memory engine lazy-initializes on first relevant command via the PreToolUse hook.
- Intelligence engine lazy-initializes on first relevant command via the PreToolUse hook.
- Dispatcher is enforced via SessionStart prompt injection so every command respects execution-mode routing.
- Preflight checks run via UserPromptSubmit to catch missing dependencies before a command executes.
- Session cleanup runs via the Stop hook (flush writes, update scores, clean temp files).
- Evals pipeline is integrated into PostToolUse for Tier 0/1 inline checks and Tier 2 sampled judge runs.
- Kill switch via `FOUNDER_OS_HOOKS=0` environment variable disables all hooks instantly.

### Non-Goals

- Changing the file installation logic. Phase 1 and Phase 2 of init already work and are not modified.
- Modifying individual command files. Commands remain unchanged; the runtime wraps them.
- Adding new MCP servers. The hook scripts use Node.js and SQLite directly.
- Changing the memory or intelligence DB schemas. The schemas defined in specs [2] and [3] are final.

### DB Paths (canonical)

All hook scripts use these paths relative to the project root:

| Database | Path |
|----------|------|
| Memory DB | `<project-root>/.memory/memory.db` |
| Intelligence DB | `<project-root>/.founderOS/infrastructure/intelligence/.data/intelligence.db` |
| Memory schema | `<project-root>/.founderOS/infrastructure/memory/schema/memory-store.sql` |
| Intelligence schema | `<project-root>/.founderOS/infrastructure/intelligence/hooks/schema/intelligence.sql` |

> **Note**: The intelligence hooks SKILL.md references two paths (`${CLAUDE_PLUGIN_ROOT}/../.intelligence/intelligence.db` and `_infrastructure/intelligence/.data/intelligence.db`). The canonical path for this spec is `.founderOS/infrastructure/intelligence/.data/intelligence.db` — the path already in use in the live test workspace. The SKILL.md contradiction should be resolved as part of this work.

---

## 3. Architecture

### 3.1 Init Enhancement: New Phase 2a and 2b

After file installation (existing Phase 1 and Phase 2), init adds two new phases:

**Phase 2a: Hook Registration**

1. Read hook definitions from `.founderOS/infrastructure/hooks/hook-registry.json`.
2. Merge hook entries into `.claude/settings.json` using the idempotent merge strategy described in section 3.5.
3. Preserve all existing permissions, allowlists, and user settings.
4. Create hook script files in `.founderOS/scripts/hooks/` (these are installed as part of the file copy in Phase 1).
5. Set executable permissions on all `.mjs` files in the hooks directory.
6. No new permission needed — existing `Bash(node .founderOS/scripts/*)` in `settings.json` already covers hook scripts.

**Phase 2b: DB Verification**

1. Verify `.memory/memory.db` schema has the required 3 tables (`memories`, `observations`, `adaptations`) and 9 indexes. Run the full schema SQL (`CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`) to create any missing structures without touching existing data.
2. Verify `.founderOS/infrastructure/intelligence/.data/intelligence.db` schema has the required 8 tables (`events`, `patterns`, `healing_patterns`, `config`, `eval_dimensions`, `eval_rubrics`, `exec_log`, `eval_results`) and their indexes. Run the full schema SQL to create any missing structures.
3. Both schema files use `IF NOT EXISTS` for all statements, making re-execution safe and idempotent.
4. Verify eval rubrics are seeded: universal rubric plus 3 namespace overrides (inbox, invoice, prep).
5. Report status to stdout: table counts, missing tables created, rubrics seeded.

### 3.2 Hook Suite

Five hooks, each with specific responsibilities and performance targets.

#### Hook 1: SessionStart (command hook, outputs text)

- **Type**: Command hook. Runs a node script that outputs text to stdout. Claude Code injects this text into the session context.
- **Script**: `node .founderOS/scripts/hooks/session-start.mjs`
- **Timeout**: 5000ms
- **Responsibilities**:
  1. **Inject dispatcher rules.** Read a structured text block defining execution-mode routing (see section 3.3). This block tells Claude how to handle `/founder-os:*` commands based on their frontmatter.
  2. **Load business context.** Check `.founderOS/infrastructure/context/active/` for context files. If present, inject their paths so commands can reference them.
  3. **Load active intelligence patterns.** Query `intelligence.db` for the top patterns (by confidence score). Inject them as behavioral guidance so Claude applies learned patterns automatically.
  4. **Run memory decay (once per day).** If this is the first session of the day, apply confidence decay to stale memories in `.memory/memory.db`. Track the last decay date in a session marker file.
- **Output**: Structured text block injected into session context.
- **Performance target**: Less than 500ms.

#### Hook 2: UserPromptSubmit (command hook, outputs text)

- **Type**: Command hook. Runs a node script that reads the user prompt from **stdin** (Claude Code pipes it as a JSON object) and outputs text to stdout.
- **Script**: `node .founderOS/scripts/hooks/prompt-submit.mjs`
- **Stdin contract**: Claude Code pipes `{"prompt": "...user text..."}` to stdin.
- **Timeout**: 3000ms
- **Responsibilities**:
  1. **Detect commands.** Parse stdin JSON, check if the prompt contains a `/founder-os:*` command. If not, exit immediately (fast path).
  2. **Read command frontmatter.** Parse the command file's YAML frontmatter for dependency declarations (`requires-mcp`, `requires-files`, `requires-context`).
  3. **Run preflight checks.** Verify required MCP servers are available, required files exist, and required context is loaded. **Note**: This replaces the "preflight in subagent" approach from the dispatcher SKILL.md. Preflight now runs once in the main session hook, NOT in the subagent. The dispatcher SKILL.md should be updated to remove the conflicting instruction.
  4. **Output preflight status.** One of three states: `ready` (all dependencies met), `degraded` (optional dependencies missing, include workarounds), or `blocked` (critical dependencies missing, include fix instructions).
  5. **Check eval regression.** If the command's namespace has an EWMA score below 0.65, emit a one-time-per-session warning: "Namespace [X] quality score is below threshold."
- **Output**: Preflight status with fix instructions if needed.
- **Performance target**: Less than 200ms.

#### Hook 3: PreToolUse (command hook, stdout JSON)

- **Type**: Command hook. Reads tool info from **stdin** (Claude Code pipes `{"tool_name": "...", "tool_input": {...}}`) and outputs a JSON decision to stdout.
- **Script**: `node .founderOS/scripts/hooks/pre-tool.mjs`
- **Stdin contract**: Claude Code pipes `{"tool_name": "...", "tool_input": {...}}` to stdin.
- **Stdout contract**: Output `{"decision": "allow"}` to permit the tool call. To block (not used by this hook), output `{"decision": "block", "reason": "..."}`.
- **Timeout**: 2000ms
- **Responsibilities**:
  1. **Lazy init memory engine.** On the first tool call, verify `.memory/memory.db` exists and the schema is valid (3 tables + 9 indexes). If the DB is missing or the schema is incomplete, create tables and indexes from the schema SQL using `CREATE TABLE/INDEX IF NOT EXISTS`.
  2. **Lazy init intelligence engine.** On the first tool call, verify `.founderOS/infrastructure/intelligence/.data/intelligence.db` exists and the schema is valid (8 tables + indexes). If missing or incomplete, create from schema SQL.
  3. **Set session-level flags.** After first initialization, write flags to a session temp file so subsequent calls skip the check entirely (fast path).
- **Performance target**: Less than 50ms on the fast path (after first init). Up to 200ms on first init.
- **Decision**: Always `{"decision": "allow"}`. This hook never blocks tool use. It only ensures DBs are ready. Future extensions that need to block should use the stdout JSON mechanism, not exit codes.

#### Hook 4: PostToolUse (command hook)

- **Type**: Command hook. Reads tool info and result from **stdin** (Claude Code pipes `{"tool_name": "...", "tool_input": {...}, "tool_result": "..."}`) and runs observation/eval logic.
- **Script**: `node .founderOS/scripts/hooks/post-tool.mjs`
- **Stdin contract**: Claude Code pipes `{"tool_name": "...", "tool_input": {...}, "tool_result": "..."}` to stdin.
- **Timeout**: 5000ms
- **Responsibilities**:
  1. **Intelligence observation.** Log the event to `intelligence.db` with `event_type`, `payload` (tool name and input), and `outcome` (success/failure based on tool output).
  2. **Eval pipeline: Tier 0 and Tier 1.** After command completion, run Tier 0 (telemetry: latency, token count) and Tier 1 (format checks: output structure, schema validation).
  3. **Sampling decision.** If sampled for deeper evaluation (based on `sampler.mjs` logic), spawn an eval-judge agent in the background for Tier 2 (LLM-as-judge rubric scoring).
  4. **Pattern detection.** Check for recurring behaviors in recent events that could become intelligence patterns. If a candidate pattern is found, insert it with low confidence for future reinforcement.
- **Performance target**: Less than 100ms for Tier 0 and Tier 1 (synchronous). Tier 2 is async and does not block.

#### Hook 5: Stop (command hook)

- **Type**: Command hook. Runs a node script when the Claude Code session ends.
- **Script**: `node .founderOS/scripts/hooks/stop.mjs`
- **Timeout**: 5000ms
- **Responsibilities**:
  1. **Flush pending memory writes.** Any buffered memory operations are committed to `.memory/memory.db`.
  2. **Update memory confidence scores.** Memories that were retrieved and used during the session get a confidence boost. Memories that were retrieved but not used get a slight penalty.
  3. **Write session summary.** Insert a session summary event into `intelligence.db` with aggregate stats (commands run, evals passed, patterns applied).
  4. **Clean up temp files.** Remove `/tmp/fos-exec-*.txt` and `/tmp/fos-session-init.json`.
- **Performance target**: Less than 500ms.

### 3.3 Dispatcher Enforcement

The SessionStart hook injects the following rules as a text block into every session:

```
## Founder OS Dispatcher Rules

When executing any /founder-os:* command:
1. Read the command file's YAML frontmatter
2. Check for `execution-mode` field (default: background)
3. Check for user override flags: --foreground, --background
4. If execution-mode is "background" (and no --foreground flag):
   - Spawn an Agent with run_in_background: true
   - Pass the full command content, user arguments, business context paths,
     top 5 memories, and active intelligence patterns
   - Print "Running [namespace]:[action] in background..." to the user
   - The main session stays free for new input
5. If execution-mode is "foreground" (or --foreground flag):
   - Execute inline in the main session
```

This block is emitted to stdout by `session-start.mjs` and Claude Code injects it into the session context automatically. Every Claude session that runs within a founderOS project will see these rules.

### 3.4 Hook Registry

New file: `.founderOS/infrastructure/hooks/hook-registry.json`

```json
{
  "version": 1,
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "node .founderOS/scripts/hooks/session-start.mjs",
        "timeout": 5000
      }
    ],
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "node .founderOS/scripts/hooks/prompt-submit.mjs",
        "timeout": 3000
      }
    ],
    "PreToolUse": [
      {
        "type": "command",
        "command": "node .founderOS/scripts/hooks/pre-tool.mjs",
        "timeout": 2000
      }
    ],
    "PostToolUse": [
      {
        "type": "command",
        "command": "node .founderOS/scripts/hooks/post-tool.mjs",
        "timeout": 5000
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "node .founderOS/scripts/hooks/stop.mjs",
        "timeout": 5000
      }
    ]
  }
}
```

This file is the single source of truth for hook declarations. The installer reads it and merges the entries into `.claude/settings.json`. The updater reads it to add new hooks or update existing ones. The uninstaller reads it to know which entries to remove.

> **Stdin contract**: All hook scripts receive their input via stdin as JSON piped by Claude Code — NOT via shell arguments or environment variables. This avoids shell-breaking characters in tool inputs and prompts. Each hook event pipes different JSON shapes (documented per hook above).

### 3.5 Settings.json Merge Strategy

Init merges hooks into the existing `settings.json` without overwriting user permissions, allowlists, or other configuration:

```javascript
// Pseudocode for merge
const existing = readJSON('.claude/settings.json');
const registry = readJSON('.founderOS/infrastructure/hooks/hook-registry.json');

// Preserve existing permissions
existing.hooks = existing.hooks || {};

// Merge each hook event, appending to any existing hooks
for (const [event, handlers] of Object.entries(registry.hooks)) {
  existing.hooks[event] = existing.hooks[event] || [];
  for (const handler of handlers) {
    // Skip if identical hook already exists (dedup by command string)
    const exists = existing.hooks[event].some(h => h.command === handler.command);
    if (!exists) {
      existing.hooks[event].push(handler);
    }
  }
}

writeJSON('.claude/settings.json', existing);
```

**Permissions**: No new permission entry is needed. The existing `Bash(node .founderOS/scripts/*)` in `settings.json` already covers `node .founderOS/scripts/hooks/*`.

**Hook ordering**: founderOS hooks are **appended** to any existing hook arrays (they run after user hooks). If the installer detects pre-existing hooks in any of the 5 events, it logs a warning: `"Existing [event] hooks detected. founderOS hooks will run after them."`

**Kill switch**: Every hook script checks `process.env.FOUNDER_OS_HOOKS` as its first operation. If the value is `"0"` or `"false"`, the script exits immediately with no output. This allows users to disable all founderOS hooks by setting `FOUNDER_OS_HOOKS=0` in their environment without editing `settings.json`.

The `mergeHooksIntoSettingsJson()` function is added to `settings-json.js` (see section 5). It follows the same idempotent append pattern as the pseudocode above. The matching `removeHooksFromSettingsJson()` function filters entries where the `command` field contains `.founderOS`.

---

## 4. New Files

| File | Type | Purpose |
|------|------|---------|
| `.founderOS/infrastructure/hooks/hook-registry.json` | Config | Declares all 5 hooks for settings.json merge |
| `.founderOS/scripts/hooks/session-start.mjs` | Node script | SessionStart: dispatcher rules, context loading, pattern injection, memory decay |
| `.founderOS/scripts/hooks/prompt-submit.mjs` | Node script | UserPromptSubmit: preflight checks, dependency validation, eval regression warning |
| `.founderOS/scripts/hooks/pre-tool.mjs` | Node script | PreToolUse: lazy init memory and intelligence DBs |
| `.founderOS/scripts/hooks/post-tool.mjs` | Node script | PostToolUse: event observation, eval pipeline (Tier 0+1), pattern detection |
| `.founderOS/scripts/hooks/stop.mjs` | Node script | Stop: flush writes, update scores, session summary, temp cleanup |
| `.founderOS/scripts/hooks/lib/db-helper.mjs` | Node module | Shared SQLite helpers (open, query, run, close, retry-on-lock) |
| `.founderOS/scripts/hooks/lib/memory-init.mjs` | Node module | Memory engine lazy initialization (schema creation, table verification) |
| `.founderOS/scripts/hooks/lib/intelligence-init.mjs` | Node module | Intelligence engine lazy initialization (schema creation, rubric seeding) |

---

## 5. Modified Files

| File | Change |
|------|--------|
| `founder-os-dist/lib/installer.js` | Add Phase 2a (hook registration) and Phase 2b (DB verification) after existing Phase 2 |
| `founder-os-dist/lib/settings-json.js` | Add `mergeHooksIntoSettingsJson()` and `removeHooksFromSettingsJson()` functions. The existing `mergeSettingsJson()` only handles `permissions.allow` and has no hooks awareness. |
| `founder-os-dist/lib/updater.js` | Add hook registry merge on update (calls new `mergeHooksIntoSettingsJson`) |
| `founder-os-dist/lib/uninstaller.js` | Call new `removeHooksFromSettingsJson()` to strip founderOS hook entries. The existing `removeFromSettingsJson` only removes permissions. Note: the uninstaller already deletes the entire `.founderOS/` directory, so hook script removal is implicit. |
| `.founderOS/infrastructure/dispatcher/SKILL.md` | **Hard prerequisite** — must be updated BEFORE hooks are activated. Update section "Preflight Checks" to note that preflight now runs in the UserPromptSubmit hook, NOT in the subagent. Remove the conflicting instruction. If both the hook and the old SKILL.md instruction are active simultaneously, preflight runs twice. |
| `.claude/settings.json` | Hooks section added by installer during Phase 2a |
| `.claude/settings.local.json` | No new hook permission needed — existing `Bash(node .founderOS/scripts/*)` already covers hooks |

---

## 6. Lazy Init Strategy

The PreToolUse hook uses session-level flags stored in a temp file to avoid repeated initialization checks:

```javascript
// pre-tool.mjs pseudocode
import fs from 'node:fs';
import crypto from 'node:crypto';

// Kill switch
if (process.env.FOUNDER_OS_HOOKS === '0' || process.env.FOUNDER_OS_HOOKS === 'false') {
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

// Read tool info from stdin (Claude Code pipes JSON)
let stdinData = '';
process.stdin.on('data', d => stdinData += d);
process.stdin.on('end', () => {
  const event = JSON.parse(stdinData); // { tool_name, tool_input }
  main(event);
});

// Project-specific session file to avoid multi-session collisions
const projectHash = crypto.createHash('md5').update(process.cwd()).digest('hex').slice(0, 8);
const SESSION_FILE = `/tmp/fos-session-init-${projectHash}.json`;

const MEMORY_DB = '.memory/memory.db';
const INTEL_DB = '.founderOS/infrastructure/intelligence/.data/intelligence.db';

function getSessionState() {
  try { return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')); }
  catch { return { memoryReady: false, intelligenceReady: false }; }
}

function saveSessionState(state) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(state));
}

function main(event) {
  const state = getSessionState();

  if (!state.memoryReady) {
    // Check .memory/memory.db exists and has correct schema (3 tables + 9 indexes)
    // If not, create from schema SQL using CREATE TABLE/INDEX IF NOT EXISTS
    state.memoryReady = true;
  }

  if (!state.intelligenceReady) {
    // Check intelligence.db exists and has correct schema (8 tables + indexes)
    // If not, create from schema SQL using CREATE TABLE/INDEX IF NOT EXISTS
    state.intelligenceReady = true;
  }

  saveSessionState(state);
  console.log(JSON.stringify({ decision: 'allow' })); // Never block
}
```

The fast path (both flags already true) reads one file, outputs `{"decision": "allow"}`, and exits. Target: less than 50ms. The slow path (first call of session) opens the SQLite databases, verifies schemas, and creates missing tables and indexes. Target: less than 200ms.

> **Temp file collision prevention**: The session file uses a project-specific hash (`/tmp/fos-session-init-{hash}.json`) derived from `process.cwd()`. This prevents two concurrent Claude Code sessions in different projects from sharing or corrupting each other's state. Similarly, eval temp files use `fos-exec-{projectHash}-{sessionId}.txt`.

---

## 7. Error Handling

| Scenario | Behavior |
|----------|----------|
| SQLite DB corrupted | Re-create from schema SQL. Data loss is accepted for a fresh install. For existing installs, log a warning and attempt repair first. |
| Hook script crashes | Claude Code continues without the hook effect. All hooks are designed for graceful degradation. The user sees no error. |
| settings.json malformed | Backup the existing file to `settings.json.bak`, write a fresh file with hooks only, warn the user to restore their permissions. |
| Permission denied on hook scripts | Init sets `chmod +x` on all `.mjs` files in `.founderOS/scripts/hooks/`. If that fails, warn the user. |
| Node.js not available | Init warns: "Node.js required for runtime hooks. Install Node.js 18+ to enable memory, intelligence, and dispatcher." Hooks are registered but will fail silently at runtime. |
| Memory DB locked (WAL mode) | Retry up to 3 times with 500ms delay between attempts. If still locked, skip the operation and log a warning. |
| Hook timeout exceeded | Claude Code kills the hook process. The session continues normally. |
| intelligence.db missing after init | PreToolUse hook recreates it on next tool call (lazy init). |

---

## 8. Updater Behavior

When running `npx founder-os@latest --init` on an existing installation:

1. **Re-merge hook registry.** Read the latest `hook-registry.json` and merge into `settings.json`. The merge is idempotent: hooks with matching command strings are skipped, new hooks are appended.
2. **Re-verify DB schemas.** Run `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for all required tables. This adds missing tables or indexes without touching existing data.
3. **Update hook scripts.** Overwrite all `.mjs` files in `.founderOS/scripts/hooks/` with the latest versions. Hook scripts are stateless; they read from DBs and temp files, so overwriting them is safe.
4. **Re-seed eval rubrics.** Insert missing rubrics using `INSERT OR IGNORE`. Existing rubrics are not modified.
5. **Preserve user config.** Do NOT reset permissions, allowlists, or any other user configuration in `settings.json` or `settings.local.json`.

---

## 9. Uninstaller Behavior

When running `npx founder-os --uninstall`:

1. **Remove founderOS hook entries from settings.json.** Call `removeHooksFromSettingsJson()` which filters `settings.hooks[event]` arrays, removing entries where `command` contains `.founderOS`. Preserve all other hooks the user may have configured.
2. **Hook scripts removed implicitly.** The existing uninstaller already deletes the entire `.founderOS/` directory (`fs.rmSync(founderOsDir, { recursive: true })`), which removes all hook scripts. No additional step needed.
3. **Leave databases intact.** `.memory/memory.db` and `intelligence.db` contain user data and are not managed files. The uninstaller does not touch them.
4. **Clean up temp files.** Remove `/tmp/fos-session-init-*.json` and `/tmp/fos-exec-*.txt` if present.

---

## 10. Testing Strategy

| Test | What It Verifies |
|------|-----------------|
| Fresh install: hooks registered | `settings.json` has all 5 hook events with correct command paths |
| Fresh install: scripts exist | All `.mjs` files in `.founderOS/scripts/hooks/` exist and are executable |
| Fresh install: memory DB valid | `.memory/memory.db` has 3 tables: memories, observations, adaptations |
| Fresh install: intelligence DB valid | `intelligence.db` has 8 tables, config row seeded, eval rubrics present |
| Update over existing: no duplicates | Running init twice does not create duplicate hook entries in `settings.json` |
| Update over existing: data preserved | DB data from first install is intact after second init run |
| Update over existing: new hooks added | If hook-registry.json adds a new hook, update appends it |
| Uninstall: hooks removed | founderOS hook entries are removed from `settings.json` |
| Uninstall: permissions preserved | Non-founderOS permissions in `settings.json` are untouched |
| Uninstall: DBs preserved | `.memory/memory.db` and `intelligence.db` still exist after uninstall |
| SessionStart hook: dispatcher output | Script outputs the dispatcher rules text block to stdout |
| SessionStart hook: patterns loaded | Script queries intelligence.db and includes top patterns in output |
| UserPromptSubmit hook: fast path | Non-command prompts exit in under 50ms |
| UserPromptSubmit hook: preflight | Command with missing MCP dependency returns "blocked" status |
| PreToolUse hook: lazy init | First call creates missing DB tables; second call exits in under 50ms |
| PreToolUse hook: always allows | Exit code is 0 in all cases (DB missing, DB corrupt, DB ready) |
| PostToolUse hook: event logged | intelligence.db events table has a new row after hook runs |
| PostToolUse hook: eval Tier 0+1 | Telemetry and format checks run synchronously |
| Stop hook: cleanup | `/tmp/fos-exec-*.txt` and `/tmp/fos-session-init-{hash}.json` are removed (glob pattern match) |
| Stop hook: session summary | intelligence.db has a session summary event after Stop runs |

---

## 11. Evals Integration

The evals pipeline (currently in the dev repo but not shipped to dist) must be included in the distribution and wired into the PostToolUse hook.

**Dist packaging**: These eval files must be copied from the dev repo (`founderOS/_infrastructure/intelligence/evals/`) into the dist package template (`founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/`) as part of the release process. Without this step, Phase 2b rubric seeding will fail because the files are not present in the installed template.

**Files to ship from `founderOS/_infrastructure/intelligence/evals/`:**

| File | Role |
|------|------|
| `eval-runner.mjs` | Main entry point, orchestrates Tier 0, 1, 2 |
| `db.mjs` | SQLite helpers for eval result storage |
| `sampler.mjs` | Tier 2 sampling decision (probability based on namespace, recency, error rate) |
| `checks/telemetry.mjs` | Tier 0: latency, token count, tool call count |
| `checks/format.mjs` | Tier 1: output structure validation |
| `checks/schema.mjs` | Tier 1: output schema validation against command spec |
| `rubrics/universal.json` | Default rubric applied to all commands |
| `rubrics/overrides/inbox.json` | Namespace override rubric for inbox commands |
| `rubrics/overrides/invoice.json` | Namespace override rubric for invoice commands |
| `rubrics/overrides/prep.json` | Namespace override rubric for prep commands |

**Integration flow in PostToolUse:**

1. `post-tool.mjs` detects a `/founder-os:*` command completed.
2. It imports `eval-runner.mjs` and calls `runTier0(event)` and `runTier1(event)`.
3. Results are written to `intelligence.db` in the `eval_results` table.
4. `sampler.mjs` decides if Tier 2 should run (based on namespace EWMA, time since last Tier 2, error rate).
5. If sampled, `post-tool.mjs` outputs instructions for Claude to spawn an eval-judge agent in the background.
6. The eval-judge agent runs the rubric (universal + namespace override) and writes results back to `eval_results`.

---

## 12. Migration Path

For existing users who already ran init without hooks:

1. User runs `npx founder-os@latest --init` again.
2. The installer detects an existing installation (`.founderOS/` directory present).
3. Phase 1-2 runs as normal: files are updated (new/changed files overwritten, existing files preserved based on updater logic).
4. **Phase 2a runs**: Hook registry is merged into `settings.json`. Since no hooks existed before, all 5 are added.
5. **Phase 2b runs**: DB schemas are verified. Since the DBs exist from the original install, only missing tables/indexes are added. Existing data is preserved.
6. Eval rubrics are seeded (INSERT OR IGNORE, so existing rubrics are not overwritten).
7. User sees confirmation output:

```
founderOS runtime activated:
  Hooks: 5/5 registered (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop)
  Memory engine: ready (.memory/memory.db - 3 tables verified)
  Intelligence engine: ready (intelligence.db - 8 tables verified)
  Eval rubrics: 4 seeded (1 universal + 3 namespace overrides)
  Dispatcher: active (SessionStart injection)
```

No data loss. No configuration loss. The user's next Claude Code session will have the full runtime active.
