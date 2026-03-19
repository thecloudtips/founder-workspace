# Plan: Replace Google MCP Servers with gws CLI Across All Plugins

**Date**: 2026-03-09
**Status**: Completed
**Scope**: 20 plugins using Gmail, Calendar, or Drive MCP servers

## Context

Founder OS uses Google MCP servers (Gmail, Calendar, Drive) across 20 plugins. These MCP servers add token overhead, require separate npm packages, need per-plugin credential configuration, and are less flexible than direct CLI access. The `gws` CLI tool is already installed, authenticated, and provides full access to Gmail, Calendar, and Drive APIs with JSON output, helper commands (`+triage`, `+send`, `+agenda`, `+insert`, `+upload`), and configurable scopes. This refactoring replaces all Google MCP dependencies with `gws` CLI commands invoked via Bash, reducing complexity and improving reliability.

## Decisions

- **Skill style**: FOS wrapper skills using gws commands + Founder OS conventions
- **MCP removal**: Clean break — remove Google entries from `.mcp.json` entirely
- **Agent rewrite**: Replace inline MCP refs with specific gws CLI commands
- **Scope**: All 3 Google services (Gmail + Calendar + Drive) in one sweep
- **Skill location**: Shared at `_infrastructure/gws-skills/` (assess feasibility; fallback: per-plugin)
- **Write scopes**: Full parity — user adjusts gws scopes as needed
- **Tool naming**: `"tools": ["Bash"]` in teams/config.json for gws-using agents
- **Skill creation**: Use `/skill-creator` skill for each shared gws skill
- **Execution**: Use `/superpowers:subagent-driven-development` with parallel Agent tool subagents per tier

---

## Phase 0: Create Shared gws Skills (8 files)

### Method: `/skill-creator` Skill

Each skill is created by invoking the `skill-creator` skill. The skill-creator handles YAML frontmatter, SKILL.md structure, and validation. Since skill-creator is interactive within a session, skills are created **sequentially** but can be batched (create all 8 in one pass).

### Invocation Pattern

For each skill below, invoke:
```
/skill-creator
```
Then provide:
- **Name**: e.g., `gmail-read`
- **Location**: `_infrastructure/gws-skills/gmail-read/SKILL.md`
- **Description**: From the table below
- **Content**: The gws command mappings, FOS conventions, and examples

### Skills to Create

| # | Skill Name | Path | Purpose | Key Content |
|---|-----------|------|---------|-------------|
| 1 | gws-common | `_infrastructure/gws-skills/gws-common/SKILL.md` | Auth, global flags, error handling, FOS conventions | `which gws` check, `--format json` convention, error code handling, rate limit awareness |
| 2 | gmail-read | `_infrastructure/gws-skills/gmail-read/SKILL.md` | Search, list, get messages/threads | `+triage`, `users messages list`, `users messages get`, query syntax |
| 3 | gmail-write | `_infrastructure/gws-skills/gmail-write/SKILL.md` | Send, draft, insert, trash, modify labels | `+send`, `users drafts create`, `users messages trash`, `users messages modify` |
| 4 | calendar-read | `_infrastructure/gws-skills/calendar-read/SKILL.md` | List events, check availability | `+agenda`, `events list` with timeMin/timeMax, freebusy query |
| 5 | calendar-write | `_infrastructure/gws-skills/calendar-write/SKILL.md` | Create/update/delete events | `+insert`, `events patch`, `events delete` |
| 6 | drive-read | `_infrastructure/gws-skills/drive-read/SKILL.md` | Search, list, get, export files | `files list` with query, `files get`, `files export` |
| 7 | drive-write | `_infrastructure/gws-skills/drive-write/SKILL.md` | Upload, create, update files | `+upload`, `files create`, `files update` |
| 8 | gws-migration | `_infrastructure/gws-skills/gws-migration-notes/SKILL.md` | MCP-to-gws mapping reference | Side-by-side MCP tool → gws command table, common gotchas |

### Skill Content Template

Each skill should follow this structure:
```markdown
---
name: [skill-name]
description: [one-line description]
---

## Overview
[What this skill covers and when to use it]

## Prerequisites
- gws CLI installed: `which gws`
- Authentication configured (see gws-common skill)

## Commands

### [Command Category]
```bash
# Description of what this does
gws [service] [command] --params '...' --format json
```

**Output format**: [describe JSON structure]
**Error handling**: [what to do on failure]

## FOS Conventions
- Always use `--format json` for machine-readable output
- Parse with `jq` or inline JSON parsing
- Graceful degradation: if gws unavailable, skip Google data and note in output
```

### Key gws Command Mappings (reference for skill content)

**Gmail:**
```bash
# Search unread
gws gmail +triage --max 50 --format json

# Custom query
gws gmail users messages list --params '{"userId":"me","q":"QUERY","maxResults":N}' --format json

# Get message
gws gmail users messages get --params '{"userId":"me","id":"MSG_ID","format":"full"}' --format json

# Send
gws gmail +send --to EMAIL --subject 'SUBJ' --body 'TEXT'

# Trash
gws gmail users messages trash --params '{"userId":"me","id":"MSG_ID"}'

# Create draft
gws gmail users drafts create --params '{"userId":"me"}' --json '{"message":{"raw":"BASE64"}}'
```

**Calendar:**
```bash
# Today's events
gws calendar +agenda --today --format json

# Date range
gws calendar events list --params '{"calendarId":"primary","timeMin":"ISO","timeMax":"ISO","singleEvents":true,"orderBy":"startTime"}' --format json

# Create event
gws calendar +insert --summary 'TITLE' --start ISO --end ISO

# Update event
gws calendar events patch --params '{"calendarId":"primary","eventId":"ID"}' --json '{"summary":"NEW"}'
```

**Drive:**
```bash
# Search files
gws drive files list --params '{"q":"name contains '\''TERM'\''","pageSize":20,"fields":"files(id,name,mimeType,modifiedTime,webViewLink)"}' --format json

# Export doc
gws drive files export --params '{"fileId":"ID","mimeType":"text/plain"}' --output /tmp/file.txt

# Upload
gws drive +upload ./file.pdf --parent FOLDER_ID
```

---

## Phase 1: Plugin Refactoring (4 tiers)

### Execution Method: `/superpowers:subagent-driven-development`

Each tier is executed using **parallel Agent tool subagents**. This is preferred over claude-flow swarms because:
1. Plugin refactoring is file-edit-heavy (Agent tool has Edit/Write access)
2. Each plugin is independent within its tier (no coordination needed)
3. Simpler orchestration — no MCP server overhead for the migration itself

### Agent Dispatch Pattern

Each subagent receives this standard prompt structure:
```
You are refactoring plugin [PLUGIN_NAME] at [FOLDER_PATH] to replace Google MCP
servers with gws CLI commands.

## Reference
- gws command mappings: [paste from Phase 0]
- Shared skills location: _infrastructure/gws-skills/

## Files to Modify
[list of specific files per plugin]

## Changes Required
1. `.mcp.json`: Remove all Google MCP entries (gmail, google-calendar, google-drive).
   Preserve Notion, Filesystem, Slack, Web Search entries.
2. Skills (SKILL.md): Replace "Gmail/Calendar/Drive MCP" references with gws CLI commands.
   Keep output contracts (JSON structure) unchanged.
3. Commands (commands/*.md): Update tool references from MCP to Bash + gws.
4. Agent teams (teams/): Update config.json tools from MCP names to "Bash".
   Rewrite agent .md files to use gws commands.

## Verification
After changes, confirm:
- grep -r "mcp-server-gmail\|mcp-server-google-calendar\|mcp-server-google-drive" [FOLDER] → empty
- grep -ri "Gmail MCP\|Calendar MCP\|Drive MCP" [FOLDER] → empty
- .mcp.json is valid JSON
- Non-Google MCP entries preserved
```

### Tier 1: Drive-Only Plugins (8 plugins — simplest)

**Dispatch**: 4 parallel subagents, 2 plugins each

| Subagent | Plugins | Changes |
|----------|---------|---------|
| A1 | P04 Action Items, P09 Report Generator | `.mcp.json`: remove google-drive |
| A2 | P11 Invoice Processor, P12 Proposal Automator | `.mcp.json`: remove google-drive (P11 also gmail); P11 `teams/agents/extraction-agent.md` update |
| A3 | P13 Contract Analyzer, P14 SOW Generator | `.mcp.json`: remove google-drive |
| A4 | P16 Expense Report, P23 Knowledge Base | `.mcp.json`: remove google-drive; P23 `commands/kb-*.md` update refs |

### Tier 2: Gmail + Calendar Plugins Without Teams (6 plugins)

**Dispatch**: 3 parallel subagents, 2 plugins each

| Subagent | Plugins | Key Files |
|----------|---------|-----------|
| B1 | P05 Weekly Review, P06 Follow-Up Tracker | P05: commands/review.md, skills/weekly-reflection/SKILL.md; P06: 3 commands, 2 skills |
| B2 | P07 Meeting Intel, P10 Client Health | P07: remove disabled entries only; P10: 2 commands, 1 skill |
| B3 | P21 CRM Sync, P22 Morning Sync | P21: 3 commands, 2 skills; P22: 2 commands, morning-briefing SKILL.md (HEAVY rewrite) |

### Tier 3: Agent Team Plugins (4 plugins — most complex)

**Dispatch**: 4 parallel subagents, 1 plugin each (these are complex enough to warrant dedicated agents)

| Subagent | Plugin | Agent Files to Rewrite |
|----------|--------|----------------------|
| C1 | P01 Inbox Zero | `teams/config.json`, `triage-agent.md`, `response-agent.md`, `archive-agent.md` |
| C2 | P02 Daily Briefing | `teams/config.json`, `gmail-agent.md`, `calendar-agent.md` |
| C3 | P03 Meeting Prep | `teams/config.json`, `calendar-agent.md`, `gmail-agent.md`, `drive-agent.md` |
| C4 | P20 Client Context | `teams/config.json`, `email-agent.md`, `calendar-agent.md`, `docs-agent.md` |

**teams/config.json change pattern:**
```json
// Before
{"tools": ["gmail"], "skills": ["email-prioritization"]}
// After
{"tools": ["Bash"], "skills": ["email-prioritization"]}
```

**Agent markdown change pattern:**
- Replace "Detect whether the Gmail MCP server is available" → "Verify gws CLI is available by running `which gws`"
- Replace "Search Gmail for unread emails" → specific `gws gmail` commands with `--format json`
- Replace "Gmail MCP server not configured" → "gws CLI unavailable or authentication not configured"
- Keep output JSON contracts unchanged (same structure agents return)

### Tier 4: Heavy Drive Plugin (1 plugin)

**Dispatch**: 2 parallel subagents

| Subagent | Plugin | Key Files |
|----------|--------|-----------|
| D1 | P18 Drive Brain | `.mcp.json`, 4 commands, `skills/drive-navigation/SKILL.md` (deep rewrite), `skills/document-qa/SKILL.md` |
| D2 | (reserved for P22 morning-briefing deep rewrite if B3 flags it as needing more work) | Contingency |

### Sequencing

```
Phase 0 (sequential, /skill-creator)
    ↓
Tier 1 (A1-A4 parallel) + Tier 2 (B1-B3 parallel) + Tier 3 (C1-C4 parallel)
    ↓ (all complete)
Tier 4 (D1-D2 parallel)
    ↓
Phase 2 (infrastructure cleanup, single agent)
    ↓
Phase 4 (UAT plan update, single agent)
```

Tiers 1-3 launch simultaneously because they have no inter-dependencies. Tier 4 waits because patterns from Tiers 1-3 inform the heavy rewrites.

**Total parallel subagents at peak**: 11 (4 + 3 + 4)

---

## Phase 2: Infrastructure Cleanup

**Dispatch**: 1 subagent after all plugin tiers complete

### Tasks

1. **Archive deprecated MCP configs**:
   - `mkdir -p _infrastructure/mcp-configs/deprecated/`
   - Move `gmail.json`, `google-calendar.json`, `google-drive.json` → `deprecated/`

2. **Update `_infrastructure/mcp-configs/README.md`**:
   - Document gws CLI replacement
   - Add gws installation/auth instructions
   - Mark Google MCP configs as deprecated

3. **Update `_infrastructure/mcp-configs/combined-example.json`**:
   - Remove Google entries

4. **Update root `CLAUDE.md`**:
   - MCP Servers section: replace Google MCPs with gws CLI
   - MCP Package Names: remove Google entries, add gws note
   - Plugin Quick Reference table: update "Required MCP" column (Gmail/Calendar/Drive → gws)

---

## Phase 3: Not Applicable (Swarm Strategy Folded into Phase 1)

The original Phase 3 "Swarm Execution Strategy" is now integrated directly into Phase 1's subagent dispatch pattern. No separate swarm initialization is needed — the Agent tool with `subagent-driven-development` provides equivalent parallelism with simpler orchestration.

**Why not claude-flow swarms?**
- This is a file-editing task, not a long-running coordination task
- Each plugin refactoring is independent — no shared state needed
- Agent tool subagents have direct access to Edit/Write/Read tools
- No MCP server overhead for the migration tooling itself
- Simpler error recovery (re-dispatch single subagent vs. swarm recovery)

---

## Phase 4: UAT Testing Plan Updates

**Dispatch**: 1 subagent after Phase 2

### 4.1 MCP Environment Table (line 12-21 of `docs/plans/2026-03-08-uat-testing-plan-design.md`)

**Before:**
| MCP Server | Status | Usage |
|--|--|--|
| Gmail | Test account (full send/receive) | P01, P06, P10, P20, P21 |
| Calendar | Test account | P02, P03, P20, P21, P22 |
| Drive | Skipped | P09, P18, P20 tested via degradation path |

**After:**
| Tool | Status | Usage |
|--|--|--|
| gws CLI (Gmail) | Authenticated, gmail.readonly + gmail.insert + gmail.send scopes | P01, P02, P05, P06, P10, P20, P21, P22 |
| gws CLI (Calendar) | Authenticated, calendar.events + calendar.readonly scopes | P02, P03, P05, P06, P10, P20, P21, P22 |
| gws CLI (Drive) | Authenticated, drive.readonly scope | P03, P04, P09, P11-P14, P16, P18, P20, P23 |

Drive is **no longer skipped** — gws CLI provides reliable Drive access without MCP server overhead.

### 4.2 `.mcp.json` in `/uat-testing/`

Remove Gmail, Calendar, Drive MCP entries. The UAT `.mcp.json` only needs:
- Notion MCP (for DB validation)
- Filesystem MCP (if needed — may also move to direct file access)

gws CLI is available system-wide, no per-project configuration needed.

### 4.3 Seeding Scripts Updates

Scripts already use `gws gmail users messages insert`. Update:
- `seed-calendar-events.sh`: Use `gws calendar +insert` or `gws calendar events insert` instead of Calendar MCP
- `validate-environment.sh`: Replace MCP connection checks with `which gws && gws gmail +triage --max 1 --format json` smoke tests
- Add `validate-gws-scopes.sh`: Verify required gws scopes are enabled

### 4.4 Test Categories Updates

Update category #6 "Graceful degradation":
- **Before**: "Missing optional MCPs" → test with Gmail/Calendar/Drive MCP unavailable
- **After**: "gws CLI unavailable or auth expired" → test with gws command returning errors
- Add new category: "gws CLI error handling" — test behavior when gws returns non-zero exit codes, empty results, rate limits

### 4.5 Degradation Path Changes

- **Drive**: No longer tested via degradation path — now fully available via gws CLI
- **Slack**: Still tested via degradation path (no gws equivalent)
- **Web Search**: Still tested via degradation path
- **New degradation scenario**: gws CLI not installed or not authenticated — all Google-dependent plugins should degrade gracefully

### 4.6 Stress Test Updates

gws CLI has different performance characteristics than MCP servers:
- MCP: persistent connection, structured tool calls
- gws: process spawn per command, JSON stdout parsing

Update stress test scenarios to measure:
- gws command latency under load (many sequential `gws gmail` calls)
- JSON parsing overhead for large result sets
- Concurrent gws processes (will swarm agents hit rate limits?)

### 4.7 Files to Modify

| File | Change |
|------|--------|
| `docs/plans/2026-03-08-uat-testing-plan-design.md` | Update MCP table, seeding scripts, degradation paths, stress tests |
| `/uat-testing/.mcp.json` (when created) | Omit Google MCP entries |
| `/uat-testing/scripts/validate-environment.sh` (when created) | Use gws smoke tests instead of MCP checks |
| `/uat-testing/scripts/seed-calendar-events.sh` (when created) | Use `gws calendar` commands |
| `/uat-testing/swarms/*.yaml` (when created) | Agent tool references use Bash not MCP names |

---

## Verification

### Per-Plugin Checks (run by each subagent before completing)
1. `grep -r "mcp-server-gmail\|mcp-server-google-calendar\|mcp-server-google-drive" founder-os-PLUGIN/` → empty
2. `grep -ri "Gmail MCP\|Calendar MCP\|Drive MCP" founder-os-PLUGIN/` → empty (except migration notes)
3. `.mcp.json` is valid JSON with no Google entries
4. Non-Google MCP entries (Notion, Filesystem, Slack) preserved
5. `teams/config.json` references `"Bash"` not Google MCP names
6. Agent output contracts (JSON structure) unchanged
7. Graceful degradation messages updated

### Cross-Plugin Checks (run after all tiers complete)
1. Dependency chains work: P01→P06, P20↔P21↔P10, P12→P14
2. All 20 affected `.mcp.json` files modified, zero contain Google entries
3. `CLAUDE.md` consistent with new architecture

### Smoke Tests
```bash
gws gmail +triage --max 5 --format json    # Gmail reads work
gws calendar +agenda --today --format json  # Calendar reads work
gws drive files list --params '{"q":"trashed=false","pageSize":3}' --format json  # Drive works
```

---

## File Count Summary

- **New files**: 8 (shared gws skills via /skill-creator)
- **Modified files**: ~95 across 20 plugins + infrastructure
- **Archived files**: 3 (deprecated MCP configs)
- **Key rewrites** (most change): P18 drive-navigation skill, P22 morning-briefing skill, P01/P02/P03/P20 agent team files

## Critical Files

- `founder-os-daily-briefing-generator/teams/agents/gmail-agent.md` — template for Gmail agent rewrites
- `founder-os-google-drive-brain/skills/drive-navigation/SKILL.md` — deepest Drive integration
- `founder-os-multi-tool-morning-sync/skills/morning-briefing/SKILL.md` — heaviest multi-MCP skill
- `founder-os-inbox-zero/teams/config.json` — pipeline pattern config reference
- `_infrastructure/mcp-configs/README.md` — central MCP documentation
- `docs/plans/2026-03-08-uat-testing-plan-design.md` — UAT testing plan to update

---

## Session Kickoff Prompt

Use this prompt to start a new Claude Code session for executing this plan:

```
I need to execute the gws CLI migration plan at docs/plans/2026-03-09-gws-cli-migration-plan.md

Read the full plan first, then execute it phase by phase:

**Phase 0**: Create 8 shared gws skills at _infrastructure/gws-skills/ using /skill-creator for each one. Create them sequentially: gws-common, gmail-read, gmail-write, calendar-read, calendar-write, drive-read, drive-write, gws-migration-notes.

**Phase 1**: Use /superpowers:subagent-driven-development to dispatch parallel subagents per tier:
- Tiers 1+2+3 simultaneously (11 subagents total)
- Each subagent gets its plugin path, file list, and the gws command mappings from Phase 0
- Wait for all to complete, then dispatch Tier 4
- Each subagent must run the per-plugin verification checks before completing

**Phase 2**: Single subagent for infrastructure cleanup — archive old MCP configs, update README, update CLAUDE.md

**Phase 4**: Single subagent to update UAT testing plan at docs/plans/2026-03-08-uat-testing-plan-design.md

After all phases, run cross-plugin verification:
- grep across all 20 plugin folders for remaining Google MCP references
- Validate all .mcp.json files are valid JSON
- Confirm CLAUDE.md is consistent

Commit all changes with a descriptive message when done.
```
