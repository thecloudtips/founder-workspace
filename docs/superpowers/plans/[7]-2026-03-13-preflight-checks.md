# [7] Preflight Dependency Checks — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared preflight check to every command so users see clear, actionable error messages when dependencies are missing — instead of cryptic failures mid-execution.

**Architecture:** A dependency registry JSON file maps each namespace to its required/optional dependencies. A shared preflight skill reads the registry, runs live checks, and returns `ready`, `degraded`, or `blocked`. Every command file gets a "Preflight Check" step inserted between "Business Context" and "Step 0: Memory Context". Fix messages are in a separate reference file for maintainability.

**Tech Stack:** JSON (registry), Markdown (skill + reference), Bash (gws/Notion CLI checks).

**Spec:** `docs/superpowers/specs/[7]-2026-03-11-preflight-checks-design.md`

**Note on Notion detection:** The spec references checking for "Notion MCP tools" but the Notion MCP server was replaced by the Notion CLI (`scripts/notion-tool.mjs`) in migration [6]. All Notion checks in this plan use the CLI detection method: check `$NOTION_API_KEY` env var + `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "test" 2>/dev/null`.

---

## Chunk 1: Infrastructure — Registry, Fix Messages, and Preflight Skill

### Task 1: Create the dependency registry JSON

**Files:**
- Create: `_infrastructure/preflight/dependency-registry.json`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p _infrastructure/preflight/references
```

- [ ] **Step 2: Write the registry file**

Create `_infrastructure/preflight/dependency-registry.json` with the following content (transcribed from the design spec):

```json
{
  "$schema": "dependency-registry",
  "$version": "1.0",
  "namespaces": {
    "inbox": {
      "required": ["gws:gmail"],
      "optional": ["notion"]
    },
    "briefing": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar", "slack"]
    },
    "prep": {
      "required": ["gws:calendar", "notion"],
      "optional": ["gws:gmail", "gws:drive"]
    },
    "actions": {
      "required": ["notion"],
      "optional": []
    },
    "review": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar"]
    },
    "followup": {
      "required": ["gws:gmail", "notion"],
      "optional": ["gws:calendar"]
    },
    "meeting": {
      "required": ["notion", "filesystem"],
      "optional": []
    },
    "newsletter": {
      "required": ["filesystem"],
      "optional": ["websearch", "notion"]
    },
    "report": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "health": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar"]
    },
    "invoice": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "proposal": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "contract": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "sow": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "compete": {
      "required": ["websearch"],
      "optional": ["filesystem", "notion"]
    },
    "expense": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "notion": {
      "required": ["notion"],
      "optional": []
    },
    "drive": {
      "required": ["gws:drive"],
      "optional": ["notion"]
    },
    "slack": {
      "required": ["slack"],
      "optional": ["notion"]
    },
    "client": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar", "gws:drive"]
    },
    "crm": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar"]
    },
    "morning": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar"]
    },
    "kb": {
      "required": ["notion"],
      "optional": []
    },
    "linkedin": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "savings": {
      "required": ["notion"],
      "optional": ["filesystem"]
    },
    "prompt": {
      "required": ["notion"],
      "optional": []
    },
    "workflow": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "workflow-doc": {
      "required": ["notion"],
      "optional": ["filesystem"]
    },
    "learn": {
      "required": ["notion"],
      "optional": []
    },
    "goal": {
      "required": ["notion"],
      "optional": []
    },
    "memory": {
      "required": ["notion"],
      "optional": []
    },
    "intel": {
      "required": [],
      "optional": []
    },
    "setup": {
      "required": [],
      "optional": []
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/preflight/dependency-registry.json
git commit -m "feat(preflight): add dependency registry with all 32 namespaces"
```

---

### Task 2: Create the fix messages reference file

**Files:**
- Create: `_infrastructure/preflight/references/fix-messages.md`

- [ ] **Step 1: Write the fix messages file**

Create `_infrastructure/preflight/references/fix-messages.md` containing copy-pasteable fix instructions for each dependency type. This file is referenced by the preflight skill and provides the exact text to display to users.

Format with YAML frontmatter:
```yaml
---
name: preflight-fix-messages
description: Copy-pasteable fix instructions for each dependency type, used by the preflight skill when a dependency check fails
---
```

Include fix messages for all 7 dependency types. Each message has two variants:

**Required variant** (used when the dependency is in the namespace's `required` array):
```
✘ Required: [dependency name] not available.
  [One sentence explaining why this command needs it.]
  To fix:
    [Numbered steps with exact commands]
```

**Optional variant** (used when the dependency is in the namespace's `optional` array):
```
⚠ Optional: [dependency name] not available — skipping [feature].
  [One sentence explaining what will be missing.]
  To enable:
    [Same numbered steps]
```

The 7 dependency messages (copy from spec lines 235-275, updated for CLI migration):

**notion:**
- Required: "Notion CLI not configured. This command stores results in your Notion workspace."
- Fix steps:
  1. Get an API key: https://www.notion.so/my-integrations
  2. Add to your shell profile: `export NOTION_API_KEY="your-key-here"`
  3. Restart your terminal, then restart Claude Code
  4. Or run `/founder-os:setup:notion-cli` for guided setup
- Optional: "Notion not configured — skipping Notion save. Results will be displayed but not persisted."

**gws:gmail / gws:calendar / gws:drive:**
- Required: "gws CLI not found (or not authenticated). This command accesses your Google Workspace data."
- Fix steps:
  1. Install gws: See gws documentation for installation
  2. Authenticate: `gws auth login`
  3. Verify: `gws gmail +triage --max 1 --format json`
- Optional (per service):
  - gws:gmail: "Gmail not available — skipping email data."
  - gws:calendar: "Calendar not available — skipping calendar data."
  - gws:drive: "Drive not available — skipping document search."

**filesystem:**
- Required: "Filesystem MCP server not connected. This command reads/writes local files."
- Fix steps:
  1. Add MCP server: `claude mcp add filesystem -- npx @modelcontextprotocol/server-filesystem ~/your-workspace`
  2. Restart Claude Code
- Optional: "Filesystem not available — skipping local file export."

**slack:**
- Required: "Slack MCP server not connected. This command reads your Slack messages."
- Fix steps:
  1. Get a Slack Bot token from your workspace admin
  2. Add to shell profile: `export SLACK_BOT_TOKEN="xoxb-your-token"`
  3. Add MCP server: `claude mcp add slack -- npx @anthropic/mcp-server-slack`
  4. Restart Claude Code
- Optional: "Slack not available — skipping team activity highlights."

**websearch:**
- Required: "Web Search not available. This command searches the web for research."
- Fix steps:
  1. Add MCP server: `claude mcp add web-search -- npx @anthropic/mcp-server-web-search`
  2. Restart Claude Code
- Optional: "Web Search not available — skipping web research, using file-based sources only."

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/preflight/references/fix-messages.md
git commit -m "feat(preflight): add fix messages reference for all dependency types"
```

---

### Task 3: Write the preflight skill

**Files:**
- Create: `_infrastructure/preflight/SKILL.md`

> **Spec divergence note:** The design spec (lines 26-27, 207) says to check for Notion by looking for "Notion MCP tools (e.g., `notion-search`) in the current tool list." This is outdated — migration [6] replaced the Notion MCP server with a CLI wrapper. The correct check is: verify `$NOTION_API_KEY` env var is set, then probe `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "test" 2>/dev/null`. This plan uses the CLI detection method throughout.

- [ ] **Step 1: Write the skill file**

Create `_infrastructure/preflight/SKILL.md` with YAML frontmatter:
```yaml
---
name: preflight-dependency-check
description: Checks whether a namespace's required and optional dependencies are available before command execution. Returns ready, degraded, or blocked status with actionable fix instructions.
---
```

The skill must contain the following sections:

**Overview section:**
- Purpose: validate that required external tools are available before a command runs
- Trigger: called as "Preflight Check" step in every command, between "Business Context" and "Step 0: Memory Context"
- Invisible when all dependencies are satisfied — no output when `ready`
- Covers both single-agent and `--team` agent pipeline modes — the registry lists the union of all dependencies a namespace can use, so one check covers both modes

**Input section:**
- The current namespace name (e.g., `inbox` from `/founder-os:inbox:triage`)

**Process section:**

Step 1 — Read the registry:
```
Read ${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/dependency-registry.json
Look up the current namespace in the "namespaces" object.
If the namespace is not found in the registry, return status "ready" and proceed silently.
If the registry file is missing or malformed, return status "ready" and proceed silently.
```

Step 2 — Check each dependency. Document the exact check method for each:

| Dependency | Check Method |
|-----------|-------------|
| `notion` | Check if `$NOTION_API_KEY` env var is set: `echo $NOTION_API_KEY`. If empty, mark failed. If set, run `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "test" 2>/dev/null` — exit code 0 means available. |
| `gws:gmail`, `gws:calendar`, `gws:drive` | Run `which gws`. If not found, all gws dependencies fail. If found, run `gws auth status`. If auth is valid, all gws dependencies pass. Only run `which gws` + `gws auth status` once even if multiple gws dependencies are listed. |
| `filesystem` | Check if filesystem MCP tools (e.g., `list_directory`, `read_file`) are in the current tool list. These are MCP tools, not CLI — check tool availability. |
| `slack` | Check if Slack MCP tools (e.g., `slack_list_channels`) are in the current tool list. |
| `websearch` | Check if WebSearch/Brave search tools are in the current tool list. |

Step 3 — Classify the result:

| State | Condition | Action |
|-------|-----------|--------|
| `ready` | All required pass, all optional pass | Proceed silently. No output. |
| `degraded` | All required pass, 1+ optional fail | Display warnings for each failed optional dependency, then proceed. |
| `blocked` | 1+ required fail | Display error messages for each failed required dependency with fix instructions. **Halt execution.** |

**Output Format section:**

For `blocked`:
```
## Preflight: Blocked

This command cannot run because required dependencies are missing:

✘ Required: [dependency-specific message from fix-messages.md]

Fix the above, then retry.
```

For `degraded`:
```
## Preflight: Degraded

Some optional features are unavailable:

⚠ Optional: [dependency-specific message from fix-messages.md]

Proceeding with reduced functionality.
```

**Session Caching section:**
- Instruct: "If you have already verified a dependency earlier in this conversation (e.g., you already confirmed gws is installed), skip the re-check for that dependency. This avoids redundant Bash calls across multiple commands in the same session."

**Graceful Degradation section:**
- If the registry file is missing: treat as `ready`, proceed silently
- If a check command itself fails (e.g., Bash execution error): treat that dependency as failed
- Preflight must NEVER crash or produce an unhandled error — always return one of the three states

**Reference:**
- Fix instructions are in `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/references/fix-messages.md`

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/preflight/SKILL.md
git commit -m "feat(preflight): add preflight dependency check skill"
```

---

## Chunk 2: Command Integration — All 32 Namespaces

### Inline check removal guide

10 command files have existing inline dependency checks (`which gws`, `gws auth status`, etc.) that the preflight step replaces. When modifying these files, distinguish between two types of checks:

1. **Pre-execution gate checks** — standalone blocks that halt the command if a tool is missing (e.g., "Verify `gws` is available by running `which gws`. If not found, halt..."). **Remove these** — the preflight step replaces them.

2. **Runtime degradation logic** — conditional logic within the command's main execution that adapts behavior when a source is unavailable (e.g., "If gws data is unavailable, continue with Notion-only results"). **Keep these** — they handle graceful degradation during execution, which is separate from the preflight gate.

Files with inline checks, assigned to the task for their pillar:

| File | Pillar Task | Type of check |
|------|------------|---------------|
| `commands/inbox/triage.md` | Task 4 | Gate: `which gws` halt block + error handling section referencing `gws auth login` |
| `commands/inbox/drafts-approved.md` | Task 4 | Gate: `which gws` halt block |
| `commands/briefing/review.md` | Task 4 | Gate: `gws auth` check |
| `commands/prep/prep.md` | Task 4 | Mixed: gate check woven into error-handling — remove only the pre-execution `which gws` gate, keep runtime fallback instructions |
| `commands/prep/today.md` | Task 4 | Mixed: same as prep.md — remove gate, keep runtime fallback |
| `commands/kb/ask.md` | Task 6 | Gate: gws/Notion availability check |
| `commands/kb/find.md` | Task 6 | Mixed: gate check + runtime `--sources` flag degradation logic — remove gate, keep runtime degradation |
| `commands/kb/index.md` | Task 6 | Gate: tool availability check |
| `commands/client/load.md` | Task 6 | Gate: gws availability check |
| `commands/setup/verify.md` | Task 7 | Gate: diagnostic checks (keep verify-specific logic, only remove redundant preflight-equivalent checks) |

### Preflight block template

Insert this block between "Business Context (Optional)" and "Step 0: Memory Context" in every command file:

```markdown
## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `<namespace>` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.
```

Replace `<namespace>` with the actual namespace for each directory (e.g., `inbox`, `briefing`, `prep`).

---

### Task 4: Add preflight step to Pillar 1 commands (inbox, briefing, prep, actions, review, followup, meeting, newsletter)

**Files:**
- Modify: All `.md` files in `commands/inbox/`, `commands/briefing/`, `commands/prep/`, `commands/actions/`, `commands/review/`, `commands/followup/`, `commands/meeting/`, `commands/newsletter/`

- [ ] **Step 1: Identify all command files in Pillar 1**

```bash
ls commands/inbox/ commands/briefing/ commands/prep/ commands/actions/ commands/review/ commands/followup/ commands/meeting/ commands/newsletter/
```

- [ ] **Step 2: Add preflight step to each command file**

Insert the preflight block template (see above) into each command file between "Business Context (Optional)" and "Step 0: Memory Context".

- [ ] **Step 3: Remove inline gate checks from Pillar 1 files**

Remove pre-execution gate checks from these 5 Pillar 1 files (see inline check removal guide above for details on what to remove vs. keep):
- `commands/inbox/triage.md` — remove `which gws` halt block and the duplicate error handling section referencing `gws auth login` at the bottom. Keep the gws CLI usage instructions (those describe *how* to use gws, not *whether* it's available).
- `commands/inbox/drafts-approved.md` — remove `which gws` halt block
- `commands/briefing/review.md` — remove `gws auth` gate check
- `commands/prep/prep.md` — remove pre-execution `which gws` gate only. Keep runtime fallback instructions for when gws sources return errors during execution.
- `commands/prep/today.md` — same as prep.md

- [ ] **Step 4: Verify changes**

```bash
git diff --stat
```

Confirm only the expected files were modified and each has the new Preflight Check section.

- [ ] **Step 5: Commit**

```bash
git add commands/inbox/ commands/briefing/ commands/prep/ commands/actions/ commands/review/ commands/followup/ commands/meeting/ commands/newsletter/
git commit -m "feat(preflight): add preflight check to Pillar 1 commands (P01-P08)"
```

---

### Task 5: Add preflight step to Pillar 2 commands (report, health, invoice, proposal, contract, sow, compete, expense)

**Files:**
- Modify: All `.md` files in `commands/report/`, `commands/health/`, `commands/invoice/`, `commands/proposal/`, `commands/contract/`, `commands/sow/`, `commands/compete/`, `commands/expense/`

- [ ] **Step 1: Identify all command files in Pillar 2**

```bash
ls commands/report/ commands/health/ commands/invoice/ commands/proposal/ commands/contract/ commands/sow/ commands/compete/ commands/expense/
```

- [ ] **Step 2: Add preflight step to each command file**

Insert the preflight block template (see Chunk 2 header) into each command file between "Business Context (Optional)" and "Step 0: Memory Context". Replace `<namespace>` with the correct namespace for each directory.

No inline dependency checks exist in Pillar 2 commands, so no removals needed.

- [ ] **Step 3: Verify changes**

```bash
git diff --stat
```

Confirm only the expected files were modified.

- [ ] **Step 4: Commit**

```bash
git add commands/report/ commands/health/ commands/invoice/ commands/proposal/ commands/contract/ commands/sow/ commands/compete/ commands/expense/
git commit -m "feat(preflight): add preflight check to Pillar 2 commands (P09-P16)"
```

---

### Task 6: Add preflight step to Pillar 3 commands (notion, drive, slack, client, crm, morning, kb, linkedin)

**Files:**
- Modify: All `.md` files in `commands/notion/`, `commands/drive/`, `commands/slack/`, `commands/client/`, `commands/crm/`, `commands/morning/`, `commands/kb/`, `commands/linkedin/`

- [ ] **Step 1: Identify all command files in Pillar 3**

```bash
ls commands/notion/ commands/drive/ commands/slack/ commands/client/ commands/crm/ commands/morning/ commands/kb/ commands/linkedin/
```

- [ ] **Step 2: Add preflight step to each command file**

Insert the preflight block template (see Chunk 2 header) into each command file. Replace `<namespace>` with the correct namespace.

- [ ] **Step 3: Remove inline gate checks from Pillar 3 files**

Remove pre-execution gate checks from these 4 Pillar 3 files (see inline check removal guide above):
- `commands/kb/ask.md` — remove gate check
- `commands/kb/find.md` — remove gate check only. Keep runtime `--sources` flag degradation logic (e.g., "if gws unavailable, continue with Notion-only results")
- `commands/kb/index.md` — remove gate check
- `commands/client/load.md` — remove gate check

- [ ] **Step 4: Verify changes**

```bash
git diff --stat
```

Confirm only the expected files were modified.

- [ ] **Step 5: Commit**

```bash
git add commands/notion/ commands/drive/ commands/slack/ commands/client/ commands/crm/ commands/morning/ commands/kb/ commands/linkedin/
git commit -m "feat(preflight): add preflight check to Pillar 3 commands (P17-P24)"
```

---

### Task 7: Add preflight step to Pillar 4 + utility commands (savings, prompt, workflow, workflow-doc, learn, goal, memory, intel, setup)

**Files:**
- Modify: All `.md` files in `commands/savings/`, `commands/prompt/`, `commands/workflow/`, `commands/workflow-doc/`, `commands/learn/`, `commands/goal/`, `commands/memory/`, `commands/intel/`, `commands/setup/`

- [ ] **Step 1: Identify all command files in Pillar 4 + utility**

```bash
ls commands/savings/ commands/prompt/ commands/workflow/ commands/workflow-doc/ commands/learn/ commands/goal/ commands/memory/ commands/intel/ commands/setup/
```

- [ ] **Step 2: Add preflight step to each command file**

Insert the preflight block template (see Chunk 2 header) into each command file. Replace `<namespace>` with the correct namespace.

For `intel` and `setup` namespaces: the preflight step should still be added for consistency, even though their registry entries have empty `required` and `optional` arrays — the check will return `ready` instantly and produce no output.

- [ ] **Step 3: Remove inline gate checks from Pillar 4 files**

Remove preflight-equivalent checks from `commands/setup/verify.md` (see inline check removal guide above). The verify command has diagnostic checks that overlap with preflight — remove only the redundant tool-availability gate checks. Keep verify-specific validation logic (e.g., checking DB connectivity, template integrity) that goes beyond preflight's scope.

- [ ] **Step 4: Verify changes**

```bash
git diff --stat
```

Confirm only the expected files were modified.

- [ ] **Step 5: Commit**

- [ ] **Step 3: Commit**

```bash
git add commands/savings/ commands/prompt/ commands/workflow/ commands/workflow-doc/ commands/learn/ commands/goal/ commands/memory/ commands/intel/ commands/setup/
git commit -m "feat(preflight): add preflight check to Pillar 4 + utility commands (P25-P32)"
```

---

## Chunk 3: Documentation and Verification

### Task 8: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add preflight to Universal Patterns**

In the "Universal Patterns (apply to ALL namespaces)" section of `CLAUDE.md`, add a new bullet:
```markdown
- **Preflight dependency checks** — all namespaces run a preflight check before execution. The check validates required/optional external tools (Notion CLI, gws, Filesystem MCP, Slack MCP, Web Search) against the registry at `_infrastructure/preflight/dependency-registry.json`. Required failures halt with fix instructions; optional failures warn and continue. See `_infrastructure/preflight/SKILL.md`.
```

- [ ] **Step 2: Update command execution flow**

If CLAUDE.md documents the command execution flow order, add "Preflight Check" between "Business Context" and "Step 0: Memory Context" to match the spec's flow diagram.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add preflight dependency checks to universal patterns"
```

---

### Task 9: Smoke test — verify preflight integration

**Files:** None (verification only)

- [ ] **Step 1: Verify registry is valid JSON**

```bash
node -e "const r = JSON.parse(require('fs').readFileSync('_infrastructure/preflight/dependency-registry.json','utf8')); console.log(Object.keys(r.namespaces).length + ' namespaces registered')"
```

Expected: `32 namespaces registered` (or 33 if `setup` is counted as separate from the 32).

- [ ] **Step 2: Verify all command files have the preflight step**

```bash
for f in $(find commands -name "*.md" -not -path "*/references/*"); do
  if ! grep -q "Preflight Check" "$f"; then
    echo "MISSING: $f"
  fi
done
```

Expected: no output (all files have the step). If any files are missing, go back and add the step.

- [ ] **Step 3: Verify no inline gws/notion checks remain**

```bash
grep -rn "which gws\|gws auth status" commands/ --include="*.md" | grep -v "preflight\|SKILL\|references"
```

Expected: no output. All inline checks should have been removed in Tasks 4-7. If any remain, remove them.

- [ ] **Step 4: Verify registry covers all namespaces**

```bash
# Get all namespace directories from commands/
ls -d commands/*/ | sed 's|commands/||;s|/||' | sort > /tmp/cmd-namespaces.txt
# Get all namespaces from registry
node -e "const r = JSON.parse(require('fs').readFileSync('_infrastructure/preflight/dependency-registry.json','utf8')); Object.keys(r.namespaces).sort().forEach(n => console.log(n))" > /tmp/reg-namespaces.txt
# Compare
diff /tmp/cmd-namespaces.txt /tmp/reg-namespaces.txt
```

Expected: no difference (or expected differences like `setup` being a utility namespace). If a namespace exists in `commands/` but not in the registry, add it with empty arrays.

- [ ] **Step 5: Commit** (only if fixes were needed)

```bash
git add -A
git commit -m "fix(preflight): address smoke test findings"
```

---

## Summary

| Chunk | Tasks | What it Delivers |
|-------|-------|-----------------|
| 1 | 1-3 | Infrastructure: dependency registry, fix messages reference, preflight skill |
| 2 | 4-7 | Command integration: all ~95 command files get the preflight step, inline checks removed |
| 3 | 8-9 | Documentation: CLAUDE.md update, smoke test verification |

**Total**: 9 tasks, 3 chunks, each independently testable.

**Dependencies**: Chunk 1 must complete first (commands reference the skill). Chunk 2 depends on Chunk 1. Chunk 3 can run after Chunk 2.

**Key constraint**: No existing command behavior changes — preflight only adds a gate before execution. When all dependencies are available, the user sees zero additional output.
