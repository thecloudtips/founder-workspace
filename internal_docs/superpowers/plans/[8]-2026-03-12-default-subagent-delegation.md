# [8] Default Subagent Delegation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make background subagent delegation the default execution pattern for all `/founder-os:*` commands, keeping the main session as a thin dispatcher that stays small, fast, and available.

**Architecture:** A new dispatcher skill at `_infrastructure/dispatcher/SKILL.md` reads each command's `execution-mode` frontmatter (background or foreground) and either spawns a background Task tool subagent or executes inline. All 94 command files receive `execution-mode` and `result-format` frontmatter fields. The main session sees only a 500-1500 token result summary per command instead of the full 15,000-50,000 token execution trace.

**Tech Stack:** Claude Code Task tool (`run_in_background: true`), YAML frontmatter metadata, markdown skill files

**Spec:** `docs/superpowers/specs/[8]-2026-03-12-default-subagent-delegation-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `_infrastructure/dispatcher/SKILL.md` | Dispatcher skill — reads execution-mode metadata, spawns subagents, formats result summaries |
| `_infrastructure/dispatcher/result-template.md` | Standardized result summary format reference with examples |

### Modified Files — Infrastructure
| File | Change |
|------|--------|
| `CLAUDE.md` | Add dispatcher to Universal Patterns, document execution modes and result format |

### Modified Files — Foreground Commands (2 files)
| File | Change |
|------|--------|
| `commands/setup/verify.md` | Add frontmatter with `execution-mode: foreground` |
| `commands/savings/configure.md` | Add `execution-mode: foreground` to existing frontmatter |

> **Note:** The spec lists `setup:notion-cli` as a third foreground command, but `commands/setup/notion-cli.md` does not exist yet — it will be created by spec [6] (Notion CLI Migration). When that file is created, it should include `execution-mode: foreground` in its frontmatter. This plan only modifies files that exist today.

### Modified Files — Background Commands (92 files)
All remaining command files in `commands/` receive `execution-mode: background` and `result-format: summary` frontmatter. See Tasks 5-9 for the complete per-file listing.

---

## Chunk 1: Infrastructure

### Task 1: Create `_infrastructure/dispatcher/SKILL.md`

**Files:**
- Create: `_infrastructure/dispatcher/SKILL.md`

- [ ] **Step 1: Create the dispatcher skill file**

Write `_infrastructure/dispatcher/SKILL.md` with the following content. This is the core skill that all command execution flows through.

```markdown
# Dispatcher Skill — Subagent Delegation

This skill standardizes how `/founder-os:*` commands are dispatched. It reads the command's `execution-mode` frontmatter and either spawns a background subagent or executes inline.

## Overview

The dispatcher separates the main session (user's conversational interface) from the execution engine (subagent). Background commands run in isolated subagent contexts, keeping the main session small and responsive.

## Reading Execution Mode

Every command markdown file has YAML frontmatter with two delegation fields:

```yaml
---
execution-mode: background    # background | foreground
result-format: summary        # summary | full
---
```

- `background` (default): Spawn a Task tool subagent with `run_in_background: true`
- `foreground`: Execute inline in the main session (current behavior)
- `summary`: Subagent returns a structured result summary (~500-1500 tokens)
- `full`: Subagent returns complete output (for commands where full output IS the value)

## Dispatch Flow

### Step 1: Parse the Command

Read the target command markdown file's frontmatter. Extract `execution-mode` and `result-format`.

### Step 2: Check for Flag Overrides

User flags override frontmatter defaults:
- `--foreground` → force inline execution regardless of metadata
- `--background` → force background delegation regardless of metadata

If neither flag is present, use the frontmatter value.

### Step 3: Branch on Execution Mode

**If foreground:**
Proceed with current inline execution. No dispatcher involvement beyond this point. The command runs in the main session as it always has.

**If background:**
Continue to Step 4.

### Step 4: Pre-fetch Context for Subagent

Before spawning the subagent, gather lightweight context references (NOT full file contents):

1. **Business context paths**: List files in `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` — pass paths to subagent (it reads them itself)
2. **Memory context**: Query memory engine for top 5 relevant memories for this command's namespace. Pass the memory text into the subagent prompt. This is the ONE read the dispatcher does — it's small (~200-400 tokens) and saves the subagent from having to initialize memory search.
3. **Intelligence patterns**: If Intelligence Engine [3] is active, fetch learned patterns for the namespace. Pass pattern text into subagent prompt.
4. **Skill file paths**: List the skill files referenced in the command markdown — pass paths (not contents) to subagent.

### Step 5: Spawn Background Subagent

Use the Task tool with `run_in_background: true`. The subagent prompt is constructed from the template below.

### Step 6: Confirm Dispatch to User

Print a brief confirmation in the main session:
```
Running [namespace]:[action] in background...
```

The main session is now free for new input.

### Step 7: Receive and Inject Result

When the subagent completes, the Task tool delivers the result to the main session. Format it using the result template (see `_infrastructure/dispatcher/result-template.md`) and display it.

## Subagent Prompt Template

The dispatcher constructs the subagent prompt from this template:

~~~
You are executing a Founder OS command as a background subagent.

## Command
[Full contents of the command markdown file]

## User Input
[Arguments and flags passed by the user, exactly as provided]

## Context Files
- Business context: ${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/
- Read relevant skill files referenced in the command

## Relevant Memories
[Top 5 memories from memory engine, pre-fetched by dispatcher]

## Intelligence Patterns
[Learned patterns for this namespace, if any]

## Output Requirements
Return a structured result in this format:
- **Status**: success | partial | error
- **Summary**: 2-5 sentence description of what was done
- **Key Data**: The primary output (table, list, document reference, etc.)
- **Actions Taken**: What was created/updated/sent (with links/IDs where applicable)
- **Warnings**: Any degraded dependencies or skipped steps
- **Follow-up**: Suggested next commands, if any

Do NOT include raw API responses, intermediate reasoning, or full file contents in your result. Return only the structured summary above.
~~~

## Integration Notes

### Memory Engine [2]
- Dispatcher pre-fetches top 5 memories and injects them into the subagent prompt
- Subagent logs observations at end of execution (writes happen in subagent context)
- Memory search tokens stay out of the main session

### Intelligence Engine [3]
- Learned patterns are injected into the subagent prompt by the dispatcher
- Pattern application and observation logging happen entirely in the subagent
- No intelligence engine tokens pollute the main session

### Preflight Checks [7]
- Preflight runs INSIDE the subagent, not in the dispatcher
- If preflight returns `blocked`, the subagent returns an error result with fix instructions
- The dispatcher surfaces the error as a structured message in the main session

### Agent Teams (--team flag)
- When `--team` is used, the subagent itself becomes the coordinator that spawns the agent pipeline
- The dispatcher's role is unchanged — it still spawns a single background subagent
- The subagent handles multi-agent orchestration internally

## Dispatcher Does NOT
- Execute any command logic itself
- Read skill files or tool outputs into the main session context
- Retain the subagent's full execution trace
- Need to know about agent teams or command internals
```

- [ ] **Step 2: Verify the file reads cleanly**

Read: `_infrastructure/dispatcher/SKILL.md` — confirm no formatting issues.

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/dispatcher/SKILL.md
git commit -m "feat(dispatcher): create dispatcher skill for subagent delegation"
```

---

### Task 2: Create `_infrastructure/dispatcher/result-template.md`

**Files:**
- Create: `_infrastructure/dispatcher/result-template.md`

- [ ] **Step 1: Create the result template file**

Write `_infrastructure/dispatcher/result-template.md` with the following content:

```markdown
# Result Summary Template

Standardized format for subagent result summaries displayed in the main session.

## Format

When a background subagent completes, the dispatcher injects a result block into the main session using this format:

```
--- Founder OS: [namespace]:[action] (completed in [N]s) ---
Status: [success | partial | error]
Summary: [2-5 sentences describing what was done]
Key Data:
  - [Primary output item 1]
  - [Primary output item 2]
  - [...]
Actions: [What was created/updated/sent, with IDs or links]
Warnings: [Any degraded dependencies or skipped steps, or "None"]
Follow-up: [Suggested next commands, or "None"]
---
```

## Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| Status | Yes | `success` = all steps completed. `partial` = some steps skipped (degraded dependency). `error` = command failed. |
| Summary | Yes | 2-5 sentences. Focus on what was accomplished, not how. No raw data. |
| Key Data | Yes | The primary output the user cares about. Tables, lists, counts, document references. Keep to 5-10 items max. |
| Actions | Yes | Concrete actions taken: Notion pages created (with IDs), emails drafted, files written (with paths). |
| Warnings | No | Omit if none. List any MCP tools that were unavailable, APIs that timed out, or steps that were skipped. |
| Follow-up | No | Omit if none. Suggest 1-3 natural next commands the user might want to run. |

## Examples

### Example 1: Daily Briefing

```
--- Founder OS: briefing:briefing (completed in 28s) ---
Status: success
Summary: Generated daily briefing covering 12 emails, 4 calendar events,
         and 3 Notion task updates. Saved to [FOS] Briefings database.
Key Data:
  - 3 urgent emails requiring response (from: J. Chen, M. Lopez, AWS Billing)
  - Next meeting: Product sync at 10:30am (prep note attached)
  - 2 overdue tasks flagged for follow-up
Actions: Created Notion page "Daily Briefing -- 2026-03-12" (ID: abc123)
Follow-up: /founder-os:inbox:triage, /founder-os:prep:today
---
```

### Example 2: Report Generation

```
--- Founder OS: report:generate (completed in 45s) ---
Status: success
Summary: Generated Q1 quarterly report from template. Pulled revenue data
         from 3 Notion databases and formatted 8 sections with charts.
Key Data:
  - Revenue: $142,500 (up 18% from Q4)
  - Active clients: 12 (3 new, 1 churned)
  - Top project: NaluForge redesign ($45,000)
Actions: Created Notion page "Q1 2026 Quarterly Report" (ID: def456)
         Wrote PDF export to ./reports/q1-2026-quarterly.pdf
Follow-up: /founder-os:goal:report
---
```

### Example 3: Inbox Triage

```
--- Founder OS: inbox:triage (completed in 32s) ---
Status: partial
Summary: Triaged 47 emails from the last 12 hours. Categorized 42 emails,
         drafted 5 responses. Slack digest was unavailable.
Key Data:
  - Urgent (3): AWS billing alert, client escalation from Chen, contract deadline reminder
  - Needs reply (5): drafts created and saved to [FOS] Content
  - FYI (18): newsletter subscriptions, team updates
  - Archive (21): notifications, automated alerts
Actions: Created 5 draft entries in [FOS] Content (Type: Email Draft)
         Created 3 follow-up tasks in [FOS] Tasks (Type: Email Task)
Warnings: Slack MCP unavailable — Slack mentions not included in triage
Follow-up: /founder-os:inbox:drafts-approved, /founder-os:followup:check
---
```

### Example 4: Error Result

```
--- Founder OS: health:scan (completed in 4s) ---
Status: error
Summary: Client health scan failed — Notion CLI is not configured.
         Cannot access [FOS] Companies database.
Key Data: None
Actions: None
Warnings: NOTION_AUTH_MISSING — $NOTION_API_KEY is not set
Follow-up: /founder-os:setup:notion-cli
---
```

## Display in Main Session

The result block is injected as-is into the main session context. The main session can then:
1. Display the block to the user
2. Answer follow-up questions about the summary
3. Use the summary data in subsequent reasoning

If the user needs more detail than the summary provides, they can:
- Ask a specific follow-up question (the main session can reason over the summary)
- Re-run the command with `--foreground` to see full inline execution
- Request `result-format: full` in the command frontmatter for commands where full output is always needed

## Token Budget

| Component | Typical Tokens |
|-----------|---------------|
| Dispatch overhead (prompt construction) | 300-500 |
| Result summary (injected into main session) | 500-1,500 |
| **Total main session cost per command** | **800-2,000** |
| Subagent execution (isolated, discarded) | 15,000-50,000 |
```

- [ ] **Step 2: Verify the file reads cleanly**

Read: `_infrastructure/dispatcher/result-template.md` — confirm no formatting issues.

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/dispatcher/result-template.md
git commit -m "feat(dispatcher): add result summary template with examples"
```

---

### Task 3: Update `CLAUDE.md` with Dispatcher Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read the CLAUDE.md file**

Read: `CLAUDE.md` — identify the "Universal Patterns" section and the command execution flow documentation.

- [ ] **Step 2: Add dispatcher to the Universal Patterns section**

In the `### Universal Patterns (apply to ALL namespaces)` section, add the following bullet after the Memory integration bullet:

```markdown
- **Dispatcher delegation** — all commands route through the dispatcher skill (`_infrastructure/dispatcher/SKILL.md`). Commands with `execution-mode: background` (default) are spawned as background subagents via the Task tool. Commands with `execution-mode: foreground` execute inline. Users can override with `--foreground` or `--background` flags. See `_infrastructure/dispatcher/result-template.md` for result format.
```

- [ ] **Step 3: Document execution-mode frontmatter in the Conventions section**

In the `## Conventions` section, after the existing frontmatter documentation, add:

```markdown
### Execution Mode Frontmatter

All command markdown files include delegation metadata in their YAML frontmatter:

```yaml
---
execution-mode: background    # background | foreground
result-format: summary        # summary | full
---
```

- `background` (92 commands): Spawned as a background subagent. Main session stays free.
- `foreground` (2 commands): Executed inline in the main session. Used for interactive/guided wizards.
- `summary`: Subagent returns a structured result summary (500-1500 tokens).
- `full`: Subagent returns complete output.

Foreground commands: `setup/verify.md`, `savings/configure.md`. (Also `setup/notion-cli.md` once created by spec [6].)

User flag overrides: `--foreground` forces inline, `--background` forces delegation.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add dispatcher delegation to CLAUDE.md universal patterns and conventions"
```

---

## Chunk 2: Foreground Command Metadata

### Task 4: Add `execution-mode: foreground` to Interactive Commands

**Files:**
- Modify: `commands/setup/verify.md`
- Modify: `commands/savings/configure.md`

- [ ] **Step 1: Read both command files**

Read: `commands/setup/verify.md` — note that this file has NO YAML frontmatter block currently.
Read: `commands/savings/configure.md` — this file HAS existing YAML frontmatter.

- [ ] **Step 2: Add frontmatter to `commands/setup/verify.md`**

This file currently starts with `# /founder-os:setup:verify` (no frontmatter). Add a YAML frontmatter block at the top:

```yaml
---
description: Run health checks on the Founder OS installation
argument-hint: ""
allowed-tools: ["Read", "Bash"]
execution-mode: foreground
result-format: full
---
```

The rest of the file remains unchanged.

- [ ] **Step 3: Add execution-mode to `commands/savings/configure.md`**

This file currently has:
```yaml
---
description: Configure hourly rate and custom time estimates for savings calculations
argument-hint: "[--rate=N] [--reset]"
allowed-tools: ["Read", "Write"]
---
```

Add the two new fields:
```yaml
---
description: Configure hourly rate and custom time estimates for savings calculations
argument-hint: "[--rate=N] [--reset]"
allowed-tools: ["Read", "Write"]
execution-mode: foreground
result-format: full
---
```

- [ ] **Step 4: Verify frontmatter is correct in both files**

Read the first 10 lines of each modified file to confirm frontmatter is well-formed.

- [ ] **Step 5: Commit**

```bash
git add commands/setup/verify.md commands/savings/configure.md
git commit -m "feat(dispatcher): add execution-mode: foreground to 2 interactive commands"
```

---

## Chunk 3: Background Command Metadata

### Task 5: Add Background Metadata — Pillar 1 (inbox, briefing, prep, actions, review, followup, meeting)

**Files:**
- Modify: `commands/inbox/triage.md`
- Modify: `commands/inbox/drafts-approved.md`
- Modify: `commands/briefing/briefing.md`
- Modify: `commands/briefing/review.md`
- Modify: `commands/prep/prep.md`
- Modify: `commands/prep/today.md`
- Modify: `commands/actions/extract.md`
- Modify: `commands/actions/extract-file.md`
- Modify: `commands/review/review.md`
- Modify: `commands/followup/check.md`
- Modify: `commands/followup/nudge.md`
- Modify: `commands/followup/remind.md`
- Modify: `commands/meeting/analyze.md`
- Modify: `commands/meeting/intel.md`

Total: 14 files

- [ ] **Step 1: Read all 14 files to confirm current frontmatter state**

Read the first 6 lines of each file to identify whether YAML frontmatter exists and its current fields.

- [ ] **Step 2: Add `execution-mode: background` and `result-format: summary` to each file**

For each file that HAS existing frontmatter (e.g., `commands/briefing/briefing.md`):

Before:
```yaml
---
description: Generate a structured daily briefing...
argument-hint: "--team --hours=12 --date=2026-02-25 [--schedule=EXPR] [--persistent]"
allowed-tools: ["Read"]
---
```

After:
```yaml
---
description: Generate a structured daily briefing...
argument-hint: "--team --hours=12 --date=2026-02-25 [--schedule=EXPR] [--persistent]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---
```

For any file that does NOT have frontmatter, add a complete frontmatter block with all fields including the new ones.

Apply this to all 14 files:
1. `commands/inbox/triage.md`
2. `commands/inbox/drafts-approved.md`
3. `commands/briefing/briefing.md`
4. `commands/briefing/review.md`
5. `commands/prep/prep.md`
6. `commands/prep/today.md`
7. `commands/actions/extract.md`
8. `commands/actions/extract-file.md`
9. `commands/review/review.md`
10. `commands/followup/check.md`
11. `commands/followup/nudge.md`
12. `commands/followup/remind.md`
13. `commands/meeting/analyze.md`
14. `commands/meeting/intel.md`

- [ ] **Step 3: Verify frontmatter in all 14 files**

Run: `grep -l 'execution-mode: background' commands/inbox/*.md commands/briefing/*.md commands/prep/*.md commands/actions/*.md commands/review/*.md commands/followup/*.md commands/meeting/*.md`
Expected: 14 files listed.

- [ ] **Step 4: Commit**

```bash
git add commands/inbox/triage.md commands/inbox/drafts-approved.md commands/briefing/briefing.md commands/briefing/review.md commands/prep/prep.md commands/prep/today.md commands/actions/extract.md commands/actions/extract-file.md commands/review/review.md commands/followup/check.md commands/followup/nudge.md commands/followup/remind.md commands/meeting/analyze.md commands/meeting/intel.md
git commit -m "feat(dispatcher): add execution-mode: background to Pillar 1 commands (14 files)"
```

---

### Task 6: Add Background Metadata — Pillar 2 (newsletter, report, health, invoice, proposal, contract, sow, compete, expense)

**Files:**
- Modify: `commands/newsletter/draft.md`
- Modify: `commands/newsletter/newsletter.md`
- Modify: `commands/newsletter/outline.md`
- Modify: `commands/newsletter/research.md`
- Modify: `commands/report/from-template.md`
- Modify: `commands/report/generate.md`
- Modify: `commands/health/report.md`
- Modify: `commands/health/scan.md`
- Modify: `commands/invoice/batch.md`
- Modify: `commands/invoice/process.md`
- Modify: `commands/proposal/create.md`
- Modify: `commands/proposal/from-brief.md`
- Modify: `commands/contract/analyze.md`
- Modify: `commands/contract/compare.md`
- Modify: `commands/sow/from-brief.md`
- Modify: `commands/sow/generate.md`
- Modify: `commands/compete/matrix.md`
- Modify: `commands/compete/research.md`
- Modify: `commands/expense/report.md`
- Modify: `commands/expense/summary.md`

Total: 20 files

- [ ] **Step 1: Read all 20 files to confirm current frontmatter state**

Read the first 6 lines of each file.

- [ ] **Step 2: Add `execution-mode: background` and `result-format: summary` to each file**

Apply the same frontmatter addition pattern as Task 5. Add `execution-mode: background` and `result-format: summary` as the last two fields inside the existing `---` block for each file:

1. `commands/newsletter/draft.md`
2. `commands/newsletter/newsletter.md`
3. `commands/newsletter/outline.md`
4. `commands/newsletter/research.md`
5. `commands/report/from-template.md`
6. `commands/report/generate.md`
7. `commands/health/report.md`
8. `commands/health/scan.md`
9. `commands/invoice/batch.md`
10. `commands/invoice/process.md`
11. `commands/proposal/create.md`
12. `commands/proposal/from-brief.md`
13. `commands/contract/analyze.md`
14. `commands/contract/compare.md`
15. `commands/sow/from-brief.md`
16. `commands/sow/generate.md`
17. `commands/compete/matrix.md`
18. `commands/compete/research.md`
19. `commands/expense/report.md`
20. `commands/expense/summary.md`

- [ ] **Step 3: Verify frontmatter in all 20 files**

Run: `grep -l 'execution-mode: background' commands/newsletter/*.md commands/report/*.md commands/health/*.md commands/invoice/*.md commands/proposal/*.md commands/contract/*.md commands/sow/*.md commands/compete/*.md commands/expense/*.md`
Expected: 20 files listed.

- [ ] **Step 4: Commit**

```bash
git add commands/newsletter/draft.md commands/newsletter/newsletter.md commands/newsletter/outline.md commands/newsletter/research.md commands/report/from-template.md commands/report/generate.md commands/health/report.md commands/health/scan.md commands/invoice/batch.md commands/invoice/process.md commands/proposal/create.md commands/proposal/from-brief.md commands/contract/analyze.md commands/contract/compare.md commands/sow/from-brief.md commands/sow/generate.md commands/compete/matrix.md commands/compete/research.md commands/expense/report.md commands/expense/summary.md
git commit -m "feat(dispatcher): add execution-mode: background to Pillar 2 commands (20 files)"
```

---

### Task 7: Add Background Metadata — Pillar 3 (notion, drive, slack, client, crm, morning, kb, linkedin)

**Files:**
- Modify: `commands/notion/create.md`
- Modify: `commands/notion/query.md`
- Modify: `commands/notion/update.md`
- Modify: `commands/notion/template.md`
- Modify: `commands/drive/ask.md`
- Modify: `commands/drive/organize.md`
- Modify: `commands/drive/search.md`
- Modify: `commands/drive/summarize.md`
- Modify: `commands/slack/catch-up.md`
- Modify: `commands/slack/digest.md`
- Modify: `commands/client/brief.md`
- Modify: `commands/client/load.md`
- Modify: `commands/crm/context.md`
- Modify: `commands/crm/sync-email.md`
- Modify: `commands/crm/sync-meeting.md`
- Modify: `commands/morning/quick.md`
- Modify: `commands/morning/sync.md`
- Modify: `commands/kb/ask.md`
- Modify: `commands/kb/find.md`
- Modify: `commands/kb/index.md`
- Modify: `commands/linkedin/from-doc.md`
- Modify: `commands/linkedin/post.md`
- Modify: `commands/linkedin/variations.md`

Total: 23 files

- [ ] **Step 1: Read all 23 files to confirm current frontmatter state**

Read the first 6 lines of each file.

- [ ] **Step 2: Add `execution-mode: background` and `result-format: summary` to each file**

Apply the same frontmatter addition pattern as Tasks 5-6:

1. `commands/notion/create.md`
2. `commands/notion/query.md`
3. `commands/notion/update.md`
4. `commands/notion/template.md`
5. `commands/drive/ask.md`
6. `commands/drive/organize.md`
7. `commands/drive/search.md`
8. `commands/drive/summarize.md`
9. `commands/slack/catch-up.md`
10. `commands/slack/digest.md`
11. `commands/client/brief.md`
12. `commands/client/load.md`
13. `commands/crm/context.md`
14. `commands/crm/sync-email.md`
15. `commands/crm/sync-meeting.md`
16. `commands/morning/quick.md`
17. `commands/morning/sync.md`
18. `commands/kb/ask.md`
19. `commands/kb/find.md`
20. `commands/kb/index.md`
21. `commands/linkedin/from-doc.md`
22. `commands/linkedin/post.md`
23. `commands/linkedin/variations.md`

- [ ] **Step 3: Verify frontmatter in all 23 files**

Run: `grep -l 'execution-mode: background' commands/notion/*.md commands/drive/*.md commands/slack/*.md commands/client/*.md commands/crm/*.md commands/morning/*.md commands/kb/*.md commands/linkedin/*.md`
Expected: 23 files listed.

- [ ] **Step 4: Commit**

```bash
git add commands/notion/create.md commands/notion/query.md commands/notion/update.md commands/notion/template.md commands/drive/ask.md commands/drive/organize.md commands/drive/search.md commands/drive/summarize.md commands/slack/catch-up.md commands/slack/digest.md commands/client/brief.md commands/client/load.md commands/crm/context.md commands/crm/sync-email.md commands/crm/sync-meeting.md commands/morning/quick.md commands/morning/sync.md commands/kb/ask.md commands/kb/find.md commands/kb/index.md commands/linkedin/from-doc.md commands/linkedin/post.md commands/linkedin/variations.md
git commit -m "feat(dispatcher): add execution-mode: background to Pillar 3 commands (23 files)"
```

---

### Task 8: Add Background Metadata — Pillar 4 (savings, prompt, workflow, workflow-doc, learn, goal, memory)

**Files:**
- Modify: `commands/savings/quick.md`
- Modify: `commands/savings/monthly-roi.md`
- Modify: `commands/savings/weekly.md`
- Modify: `commands/prompt/add.md`
- Modify: `commands/prompt/get.md`
- Modify: `commands/prompt/list.md`
- Modify: `commands/prompt/optimize.md`
- Modify: `commands/prompt/share.md`
- Modify: `commands/workflow/create.md`
- Modify: `commands/workflow/edit.md`
- Modify: `commands/workflow/list.md`
- Modify: `commands/workflow/run.md`
- Modify: `commands/workflow/schedule.md`
- Modify: `commands/workflow/status.md`
- Modify: `commands/workflow-doc/diagram.md`
- Modify: `commands/workflow-doc/document.md`
- Modify: `commands/learn/log.md`
- Modify: `commands/learn/search.md`
- Modify: `commands/learn/weekly.md`
- Modify: `commands/goal/check.md`
- Modify: `commands/goal/close.md`
- Modify: `commands/goal/create.md`
- Modify: `commands/goal/report.md`
- Modify: `commands/goal/update.md`
- Modify: `commands/memory/forget.md`
- Modify: `commands/memory/show.md`
- Modify: `commands/memory/sync.md`
- Modify: `commands/memory/teach.md`

Total: 28 files

> **Note:** `commands/savings/configure.md` is excluded — it was set to `foreground` in Task 4.

- [ ] **Step 1: Read all 28 files to confirm current frontmatter state**

Read the first 6 lines of each file.

- [ ] **Step 2: Add `execution-mode: background` and `result-format: summary` to each file**

Apply the same frontmatter addition pattern as Tasks 5-7:

1. `commands/savings/quick.md`
2. `commands/savings/monthly-roi.md`
3. `commands/savings/weekly.md`
4. `commands/prompt/add.md`
5. `commands/prompt/get.md`
6. `commands/prompt/list.md`
7. `commands/prompt/optimize.md`
8. `commands/prompt/share.md`
9. `commands/workflow/create.md`
10. `commands/workflow/edit.md`
11. `commands/workflow/list.md`
12. `commands/workflow/run.md`
13. `commands/workflow/schedule.md`
14. `commands/workflow/status.md`
15. `commands/workflow-doc/diagram.md`
16. `commands/workflow-doc/document.md`
17. `commands/learn/log.md`
18. `commands/learn/search.md`
19. `commands/learn/weekly.md`
20. `commands/goal/check.md`
21. `commands/goal/close.md`
22. `commands/goal/create.md`
23. `commands/goal/report.md`
24. `commands/goal/update.md`
25. `commands/memory/forget.md`
26. `commands/memory/show.md`
27. `commands/memory/sync.md`
28. `commands/memory/teach.md`

- [ ] **Step 3: Verify frontmatter in all 28 files**

Run: `grep -l 'execution-mode: background' commands/savings/quick.md commands/savings/monthly-roi.md commands/savings/weekly.md commands/prompt/*.md commands/workflow/*.md commands/workflow-doc/*.md commands/learn/*.md commands/goal/*.md commands/memory/*.md`
Expected: 28 files listed.

- [ ] **Step 4: Commit**

```bash
git add commands/savings/quick.md commands/savings/monthly-roi.md commands/savings/weekly.md commands/prompt/add.md commands/prompt/get.md commands/prompt/list.md commands/prompt/optimize.md commands/prompt/share.md commands/workflow/create.md commands/workflow/edit.md commands/workflow/list.md commands/workflow/run.md commands/workflow/schedule.md commands/workflow/status.md commands/workflow-doc/diagram.md commands/workflow-doc/document.md commands/learn/log.md commands/learn/search.md commands/learn/weekly.md commands/goal/check.md commands/goal/close.md commands/goal/create.md commands/goal/report.md commands/goal/update.md commands/memory/forget.md commands/memory/show.md commands/memory/sync.md commands/memory/teach.md
git commit -m "feat(dispatcher): add execution-mode: background to Pillar 4 commands (28 files)"
```

---

### Task 9: Add Background Metadata — Infrastructure Commands (intel, setup/notion-hq)

**Files:**
- Modify: `commands/intel/approve.md`
- Modify: `commands/intel/config.md`
- Modify: `commands/intel/healing.md`
- Modify: `commands/intel/patterns.md`
- Modify: `commands/intel/reset.md`
- Modify: `commands/intel/status.md`
- Modify: `commands/setup/notion-hq.md`

Total: 7 files

> **Note:** `commands/setup/verify.md` is excluded — it was set to `foreground` in Task 4.

- [ ] **Step 1: Read all 7 files to confirm current frontmatter state**

Read the first 6 lines of each file.

- [ ] **Step 2: Add `execution-mode: background` and `result-format: summary` to each file**

Apply the same frontmatter addition pattern:

1. `commands/intel/approve.md`
2. `commands/intel/config.md`
3. `commands/intel/healing.md`
4. `commands/intel/patterns.md`
5. `commands/intel/reset.md`
6. `commands/intel/status.md`
7. `commands/setup/notion-hq.md`

- [ ] **Step 3: Verify frontmatter in all 7 files**

Run: `grep -l 'execution-mode: background' commands/intel/*.md commands/setup/notion-hq.md`
Expected: 7 files listed.

- [ ] **Step 4: Commit**

```bash
git add commands/intel/approve.md commands/intel/config.md commands/intel/healing.md commands/intel/patterns.md commands/intel/reset.md commands/intel/status.md commands/setup/notion-hq.md
git commit -m "feat(dispatcher): add execution-mode: background to infrastructure commands (7 files)"
```

---

### Task 10: Verify All Metadata Is Applied

**Files:** None (verification only)

- [ ] **Step 1: Count background commands**

Run: `grep -rl 'execution-mode: background' commands/ | wc -l`
Expected: 92

- [ ] **Step 2: Count foreground commands**

Run: `grep -rl 'execution-mode: foreground' commands/ | wc -l`
Expected: 2

- [ ] **Step 3: Find any commands missing execution-mode**

Run: `find commands/ -name "*.md" -exec sh -c 'grep -L "execution-mode:" "$1"' _ {} \;`
Expected: 0 files (all 94 files should have execution-mode)

- [ ] **Step 4: Verify total matches expected count**

Total commands with execution-mode: 92 + 2 = 94. This must match the total command file count.

Run: `find commands/ -name "*.md" | wc -l`
Expected: 94

---

## Chunk 4: Dispatcher Integration

### Task 11: Document Dispatcher Integration in Command Flow

**Files:**
- Modify: `CLAUDE.md`

Rather than modifying all 94 command files to reference the dispatcher (which would be a large, fragile change), the dispatcher integration is documented in `CLAUDE.md` as a universal pattern. Claude Code reads `CLAUDE.md` at session start, so it will know to route commands through the dispatcher without each command file needing to explicitly reference it.

- [ ] **Step 1: Read the current command execution flow in CLAUDE.md**

Read: `CLAUDE.md` — find the section describing how commands are executed (near the "Universal Patterns" or "Conventions" sections).

- [ ] **Step 2: Add the dispatched command execution flow**

Add the following section to `CLAUDE.md`, after the Universal Patterns section:

```markdown
### Command Execution Flow (Dispatched)

When a user invokes any `/founder-os:*` command:

1. **Parse Arguments** — extract flags including `--foreground` / `--background` override
2. **Read execution-mode** — from the command's YAML frontmatter (`background` or `foreground`)
3. **Apply override** — `--foreground` flag forces inline; `--background` flag forces delegation
4. **If foreground** — execute inline in the main session (existing flow, no change)
5. **If background** — dispatcher delegates:
   a. Pre-fetch business context paths from `_infrastructure/context/active/`
   b. Pre-fetch top 5 memories from memory engine for the command namespace
   c. Pre-fetch intelligence patterns for the namespace (if Intelligence Engine active)
   d. Spawn subagent via Task tool with `run_in_background: true`, using the prompt template from `_infrastructure/dispatcher/SKILL.md`
   e. Confirm to user: "Running [namespace]:[action] in background..."
   f. Main session returns to idle — ready for new input
   g. On subagent completion: format result using `_infrastructure/dispatcher/result-template.md` and display

**Parallel commands**: When a user requests multiple commands (e.g., "run briefing, triage, and meeting prep"), spawn all subagents in a single message for parallel execution. Each result is displayed as it completes.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add dispatched command execution flow to CLAUDE.md"
```

---

### Task 12: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Verify all new files exist**

Run: `ls -la _infrastructure/dispatcher/SKILL.md _infrastructure/dispatcher/result-template.md`
Expected: Both files exist.

- [ ] **Step 2: Generate execution mode report**

Run the following to produce a complete listing of all commands and their execution modes:

```bash
for f in $(find commands/ -name "*.md" | sort); do
  mode=$(grep 'execution-mode:' "$f" | head -1 | awk '{print $2}')
  echo "$f: $mode"
done
```

Expected: 92 lines showing `background`, 2 lines showing `foreground` (`commands/setup/verify.md` and `commands/savings/configure.md`).

- [ ] **Step 3: Verify CLAUDE.md has all dispatcher documentation**

Run: `grep -c 'dispatcher' CLAUDE.md`
Expected: At least 3 matches (Universal Patterns bullet, Conventions section, Execution Flow section).

Run: `grep -c 'execution-mode' CLAUDE.md`
Expected: At least 4 matches.

- [ ] **Step 4: Verify no command logic was modified**

Run: `git diff --stat HEAD~10 -- commands/` (adjust the commit range based on how many commits were made)
For each modified command file, the diff should show ONLY frontmatter additions (2-3 lines added in the `---` block). No changes to command body, steps, or logic.

- [ ] **Step 5: Summary report**

Print the final tally:
- New files created: 2 (`_infrastructure/dispatcher/SKILL.md`, `_infrastructure/dispatcher/result-template.md`)
- Files modified with `execution-mode: background`: 92
- Files modified with `execution-mode: foreground`: 2
- `CLAUDE.md` updates: 3 sections (Universal Patterns, Conventions, Execution Flow)
- Total command files with execution-mode metadata: 94 / 94
- Pending: `commands/setup/notion-cli.md` will receive `execution-mode: foreground` when created by spec [6]
