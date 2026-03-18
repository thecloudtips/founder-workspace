# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Founder OS is a single-plugin AI automation ecosystem for SMB founders, built on Claude Code using the official Anthropic plugin format. 33 namespaces cover email triage, meeting prep, report generation, CRM sync, and more. Each namespace = working tool + blog post + welcome gift component.

**Notion is the source of truth** for all task specs. Local `docs/specs/` files are synced copies. When in doubt, fetch from Notion database `[NaluForge] Projects & Tasks` (project: "🚀 Founder OS: 30 Plugin Development").

**Documentation**: All docs live under `docs/` — see `docs/INDEX.md` for full map:
- `docs/getting-started/` — Setup guide, FAQ, troubleshooting
- `docs/specs/` — Plugin specifications (per-pillar) + research docs (evals, Notion CLI migration)
- `docs/plans/` — Completed architecture decisions and design docs
- `docs/superpowers/` — Future development specs (8) and implementation plans (8)
- `docs/agent-specs/` — Agent deployment specs for complex plugins (P03, P20)
- `docs/reference/` — Condensed references (AIOS concepts, UAT summary)
- `docs/reports/` — Audit reports

## Architecture

### Plugin Architecture

The repository is a single Claude Code plugin. The `.claude-plugin/plugin.json` manifest at the repo root enables automatic discovery. Commands, skills, and agents are organized by namespace:

```
.claude-plugin/plugin.json                     # Single plugin manifest
commands/<namespace>/<action>.md               # → /founder-os:<namespace>:<action>
skills/<namespace>/<skill-name>/SKILL.md       # Domain knowledge per namespace
agents/<namespace>/config.json + <agent>.md    # Agent teams (7 namespaces)
```

There are 33 command namespaces (one per logical tool area) and 7 agent team namespaces (`briefing`, `client`, `inbox`, `invoice`, `prep`, `report`, `sow`).

### Social Content

Blog posts and welcome gifts live in a separate directory from the plugin structure:
```
social/
└── [plugin-short-name]/       # e.g., inbox-zero, follow-up-tracker
    ├── blog/
    │   └── [slug].md          # Week N blog post
    └── welcome-gift/
        └── [name].md          # User cheat sheet or template
```

### Four Pillars

| Pillar | Emoji | Plugins | Focus |
|--------|-------|---------|-------|
| Daily Work | 📧 | #01-#08 | Email, meetings, reviews |
| Code Without Coding | 🛠️ | #09-#16 | Reports, invoices, contracts |
| MCP & Integrations | 🔌 | #17-#24 | Notion, Drive, Slack, CRM |
| Meta & Growth | 📈 | #25-#30 | ROI, workflows, templates |

### Platform

All functionality runs on **Claude Code** via a single plugin. The `"platform": "claude-code"` field in `.claude-plugin/plugin.json` confirms this.

### Agent Teams Patterns (Priority 5 plugins)

| Pattern | Used By | How It Works |
|---------|---------|--------------|
| Pipeline | #01 Inbox Zero, #09 Report Gen | Sequential: Input → Agent A → Agent B → Output |
| Parallel Gathering | #02 Daily Briefing, #03 Meeting Prep, #20 Client Context | All agents fetch simultaneously, lead merges |
| Pipeline + Batch | #11 Invoice Processor | Pipeline per item, batch across items |
| Competing Hypotheses | #14 SOW Generator | Multiple agents propose, lead synthesizes |

### Autonomous Spectrum

Namespaces operate at different autonomy levels:

| Level | Trigger | Examples |
|-------|---------|---------|
| Interactive | User runs command | All namespaces (default) |
| Scheduled | Cron/timer | P02, P05, P06, P10, P18, P19, P21, P22, P29 (via `--schedule`) |
| Workflow | P27 orchestration | Any namespace via `/founder-os:workflow:create` |

## MCP Servers & External Tools

The plugin uses these MCP servers and tools (install in priority order):

1. **Notion** CLI (`scripts/notion-tool.mjs`, 21 namespaces) - CRM backbone, task tracking, output storage. Run `/founder-os:setup:notion-cli` to configure.
2. **gws CLI** (20 namespaces) - Gmail, Calendar, and Drive access via `gws` CLI tool. Install once, authenticate with `gws auth login`. No per-plugin config needed.
3. **Filesystem** MCP (8 namespaces) - Local file processing, document generation
4. **Slack** MCP (2 namespaces) - Team communication digests
5. **Web Search** MCP (1 namespace) - Competitive research
6. **Late.dev** CLI (`scripts/late-tool.mjs`, 1 namespace) - Social media publishing across 13 platforms. Run `/founder-os:social:connect` to add accounts.

> **Note**: Google MCP servers (`@anthropic/mcp-server-gmail`, `@anthropic/mcp-server-google-calendar`, `@anthropic/mcp-server-google-drive`) were replaced by the gws CLI in March 2026. See `_infrastructure/gws-skills/` for shared command reference skills.

## Key Decisions

| Topic | Decision |
|-------|----------|
| CRM | Notion (not HubSpot/Pipedrive) |
| Voice transcription | Whisper (local, free, privacy-first) |
| Morning sync tools | Gmail + Calendar + Notion + Slack + Drive |
| Time savings tracking | Pre-defined task type estimates (not manual input) |
| Client health metrics | 5 scores 0-100: contact, response, tasks, payment, sentiment |

## Implementation Order

All 30 namespaces complete and consolidated into a single plugin. Current phase: superpowers development — 8 specs and 8 plans covering AIOS enrichment, memory engine, intelligence engine, installer, single-plugin restructure, preflight checks, Notion CLI migration, and default subagent delegation. See `docs/superpowers/` for details.

Active research: evals framework (`docs/specs/evals-research.md`).

## Specs Location

- **Master summary**: `docs/specs/master-summary.md`
- **Per-pillar**: `docs/specs/pillar-{1..4}-*.md`
- **Research**: `docs/specs/evals-research.md`, `docs/specs/notion-cli-research.md`

Each plugin spec includes: Overview, Input/Output, MCP Requirements, Deliverables Checklist, Dependencies, Acceptance Criteria, Blog Angle.

## Development Workflow

### Templates & References
- `_templates/agent-patterns/[pattern]/examples/` -- Pre-built agent content per namespace (use as starting point)
- `_infrastructure/` -- MCP server configs, shared skills, and design docs

### Starting a New Session
1. Run `bd prime` — restores beads context after compaction or new session
2. Run `bd ready` — find unblocked tasks available to work
3. Run `bd list --status=in_progress` — check if anything was left in progress

### Adding a New Namespace
1. Check `bd ready` for the next unblocked task
2. Read the spec from `docs/specs/` (pillar-specific file)
3. Create commands in `commands/<namespace>/<action>.md`
4. Create skills in `skills/<namespace>/<skill-name>/SKILL.md`
5. If agent team is needed, create `agents/<namespace>/config.json` + agent markdown files
6. Create Notion DB template JSON in `_infrastructure/notion-db-templates/`
7. Close all beads subtasks, then the epic: `bd close <id> --reason="..."`

### MCP Package Names
- Notion: Use `scripts/notion-tool.mjs` CLI (not MCP). See `skills/notion/notion-operations/SKILL.md`.
- Filesystem: `@modelcontextprotocol/server-filesystem`
- Gmail/Calendar/Drive: **Use `gws` CLI** (not MCP servers). See `_infrastructure/gws-skills/`.

### Namespace Quick Reference

Each namespace's files (`skills/<ns>/`, `commands/<ns>/`) contain full implementation details. Read those when modifying a specific area.

| # | Plugin | Namespace | Commands | Required Tools | HQ DB |
|---|--------|-----------|----------|---------------|-------|
| 01 | Inbox Zero | `inbox` | triage, drafts-approved | gws (Gmail) | Tasks (Email Task), Content (Email Draft) |
| 02 | Daily Briefing | `briefing` | briefing, review | gws (Calendar, Gmail), Notion | Briefings (Daily Briefing) |
| 03 | Meeting Prep | `prep` | prep, today | gws (Calendar, Gmail, Drive), Notion | Meetings |
| 04 | Action Items | `actions` | extract, extract-file | Notion | Tasks (Action Item) |
| 05 | Weekly Review | `review` | review | gws (Calendar, Gmail), Notion | Briefings (Weekly Review) |
| 06 | Follow-Up Tracker | `followup` | check, nudge, remind | gws (Gmail, Calendar), Notion | Tasks (Follow-Up) |
| 07 | Meeting Intel | `meeting` | analyze, intel | Notion, Filesystem | Meetings |
| 08 | Newsletter Engine | `newsletter` | draft, newsletter, outline, research | WebSearch, Filesystem | Content (Newsletter), Research (Newsletter Research) |
| 09 | Report Generator | `report` | from-template, generate | Filesystem, Notion | Reports (Business Report) |
| 10 | Client Health | `health` | report, scan | gws (Gmail, Calendar), Notion | Companies (health props) |
| 11 | Invoice Processor | `invoice` | batch, process | Filesystem, Notion | Finance (Invoice) |
| 12 | Proposal Automator | `proposal` | create, from-brief | Filesystem, Notion | Deliverables (Proposal) |
| 13 | Contract Analyzer | `contract` | analyze, compare | Filesystem | Deliverables (Contract) |
| 14 | SOW Generator | `sow` | from-brief, generate | Filesystem, Notion | Deliverables (SOW) |
| 15 | Competitive Intel | `compete` | matrix, research | WebSearch, Filesystem | Research (Competitive Analysis) |
| 16 | Expense Report | `expense` | report, summary | Filesystem, Notion | Reports (Expense Report), Finance (reads) |
| 17 | Notion Command Center | `notion` | create, query, template, update | Notion | (stateless) |
| 18 | Drive Brain | `drive` | ask, organize, search, summarize | gws (Drive), Notion | Activity Log |
| 19 | Slack Digest | `slack` | catch-up, digest | Slack | Briefings (Slack Digest) |
| 20 | Client Context | `client` | brief, load | gws (Gmail, Calendar, Drive), Notion | Companies (dossier props) |
| 21 | CRM Sync | `crm` | context, sync-email, sync-meeting | gws (Gmail, Calendar), Notion | Communications |
| 22 | Morning Sync | `morning` | quick, sync | gws (Gmail, Calendar), Notion | Briefings (Morning Sync) |
| 23 | Knowledge Base | `kb` | ask, find, index | Notion | Knowledge Base |
| 24 | Content Ideation | `ideate` | draft, from-doc, variations, research, outline, facts | WebSearch (research only) | — |
| 25 | Time Savings | `savings` | configure, monthly-roi, quick, weekly | Notion, Filesystem | Reports (ROI Report) |
| 26 | Prompt Library | `prompt` | add, get, list, optimize, share | Notion | Prompts |
| 27 | Workflow Automator | `workflow` | create, edit, list, run, schedule, status | Filesystem | Workflows (Execution) |
| 28 | Workflow Documenter | `workflow-doc` | diagram, document | Notion, Filesystem | Workflows (SOP) |
| 29 | Learning Log | `learn` | log, search, weekly | Notion | Learnings, Weekly Insights |
| 30 | Goal Tracker | `goal` | check, close, create, report, update | Notion | Goals, Milestones |
| 33 | Social Media | `social` | post, cross-post, schedule, draft, status, reply, analytics, queue, connect, profiles, webhooks, compose, ab-test, templates | Late.dev | Content (Social Post, X Post, X Thread, LinkedIn Thread, Cross-Post) |
| 31 | Memory Hub | `memory` | forget, show, sync, teach | Notion | Memory |
| -- | Intelligence | `intel` | approve, config, healing, patterns, reset, status | -- | -- |
| -- | Scout | `scout` | find, install, catalog, review, promote, remove, sources | WebSearch, WebFetch | Research (Scout Discovery) |
| -- | Setup | `setup` | notion-hq, verify | -- | -- |

### Namespace Dependencies (chained namespaces)
```
#01 Inbox Zero -> #06 Follow-Up Tracker
#07 Voice Note -> #04 Action Item Extractor
#11 Invoice Processor -> #16 Expense Report Builder
#12 Proposal Automator -> #14 SOW Generator
#20 Client Context <-> #21 CRM Sync <-> #10 Client Health Dashboard
#27 Workflow Automator -> chains ANY plugins
```

### Memory Engine

Cross-namespace shared memory with adaptive behavior. Two components:

- **Infrastructure** (`_infrastructure/memory/`): 3 shared skills — core memory API, context injection, pattern detection
- **Plugin** (`commands/memory/`, `skills/memory/`): User-facing commands `/founder-os:memory:show`, `/founder-os:memory:teach`, `/founder-os:memory:forget`, `/founder-os:memory:sync`
- **Notion DB**: `[FOS] Memory` in HQ template — syncs with local SQLite store

**How it works**: Before any command runs, the context-injection skill queries the local memory store and injects the top 5 relevant memories. After execution, the pattern-detection skill logs observations and promotes patterns to memories when confidence reaches threshold. Auto-adaptations apply after 3+ confirmations and notify the user.

**Local store**: `.memory/memory.db` (SQLite + HNSW). Auto-initializes on first use. Not committed to git.

## Infrastructure Commands

Shared infrastructure commands under `_infrastructure/`. These are not part of the plugin namespace hierarchy.

| Command | File | Description |
|---------|------|-------------|
| `/context:setup` | `_infrastructure/context/commands/context-setup.md` | Set up business context files via guided interview |
| `/audit:scan` | `_infrastructure/automation-audit/commands/audit-scan.md` | Scan plugin deployment and coverage |
| `/audit:report` | `_infrastructure/automation-audit/commands/audit-report.md` | Generate detailed automation scorecard |

## Conventions

- Command namespaces: `commands/<namespace>/<action>.md`
- Slash commands: `/founder-os:<namespace>:<action>` (e.g., `/founder-os:inbox:triage`, `/founder-os:client:load`)
- Skills are markdown files describing domain knowledge
- Commands are markdown files describing slash command behavior
- Agent definitions are markdown files with role, tools, and instructions
- Notion task status should be updated after completing each plugin

### Universal Patterns (apply to ALL namespaces)
- **HQ DB discovery** — search "[FOS] [Name]" first, then "Founder OS HQ - [Name]", then plugin-specific legacy DB name (backward compat)
- **No lazy DB creation** — databases are pre-created in the HQ template; only fall back to lazy creation for non-HQ users
- **Type column** — every write to a merged DB MUST include the correct Type value (e.g., Type="Email Task" for P01 → Tasks DB)
- **Company relation** — populate when client context is available (email domain match, user input, CRM lookup)
- `${CLAUDE_PLUGIN_ROOT}` for all file paths in plugin markdown (portability)
- Graceful degradation — optional MCP sources return `status: "unavailable"`, never error
- Dual-mode commands — default fast single-agent mode + `--team` flag for full agent pipeline
- Idempotent re-runs — update existing output, never duplicate; add Type to compound keys for merged DBs
- DB template JSON in `_infrastructure/notion-db-templates/hq-[db-name].json` (consolidated) or `[plugin-short-name]-[db-name].json` (legacy)
- `status: "complete"` standardized across all agent outputs
- **Business context loading** — all namespaces check `_infrastructure/context/active/` for business context files at command start. See `_infrastructure/context/SKILL.md`.
- **Preflight dependency checks** — all namespaces run a preflight check before execution (between Business Context and Step 0). The check validates required/optional external tools (Notion CLI, gws, Filesystem MCP, Slack MCP, Web Search) against the registry at `_infrastructure/preflight/dependency-registry.json`. Required failures halt with fix instructions; optional failures warn and continue. See `_infrastructure/preflight/SKILL.md`.
- **Scheduling support** — 10 namespaces accept `--schedule "expression"` flag for recurring execution. Generates P27 workflows automatically. Supported: briefing, review, followup, health, drive, slack, crm, morning, learn, social. See `_infrastructure/scheduling/SKILL.md`.
- **Memory integration** — all namespaces inject relevant memories at start (Step 0) and log observations at end (Final step). See `_infrastructure/memory/SKILL.md`.
- **Dispatcher delegation** — all commands route through the dispatcher skill (`_infrastructure/dispatcher/SKILL.md`). Commands with `execution-mode: background` (default) are spawned as background subagents via the Task tool. Commands with `execution-mode: foreground` execute inline. Users can override with `--foreground` or `--background` flags. See `_infrastructure/dispatcher/result-template.md` for result format.

### Execution Mode Frontmatter

All command markdown files include delegation metadata in their YAML frontmatter:

```yaml
---
execution-mode: background    # background | foreground
result-format: summary        # summary | full
---
```

- `background` (92 commands): Spawned as a background subagent. Main session stays free.
- `foreground` (3 commands): Executed inline in the main session. Used for interactive/guided wizards.
- `summary`: Subagent returns a structured result summary (500-1500 tokens).
- `full`: Subagent returns complete output.

Foreground commands: `setup/verify.md`, `savings/configure.md`, `setup/notion-cli.md`.

User flag overrides: `--foreground` forces inline, `--background` forces delegation.

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

## Notion HQ Template

The Founder OS HQ is a consolidated Notion workspace template with 22 interconnected databases. CRM Companies is the central hub — all client-facing databases relate back to it.

### Workspace Structure
```
Founder OS HQ
├── Command Center (Dashboard)
├── CRM: Companies, Contacts, Deals, Communications
├── Operations: Tasks, Meetings, Finance
├── Intelligence: Briefings, Knowledge Base, Research, Reports
├── Content & Deliverables: Content, Deliverables, Prompts
└── Growth & Meta: Goals, Milestones, Learnings, Weekly Insights, Workflows, Activity Log, Memory
```

### Database Consolidation Map

| Consolidated DB | Merges From | Type Values |
|----------------|-------------|-------------|
| Companies | P10 Health Scores + P20 Dossiers (absorbed as properties) | — |
| Tasks | P01 Action Items + P04 Tasks + P06 Follow-Ups | Email Task, Action Item, Follow-Up |
| Meetings | P03 Prep Notes + P07 Analyses (shared Event ID) | — |
| Finance | P11 Invoices + P16 Expenses | Invoice, Expense |
| Briefings | P02 Daily + P05 Weekly + P19 Slack + P22 Morning | Daily Briefing, Weekly Review, Slack Digest, Morning Sync |
| Knowledge Base | P23 Sources + Queries | Source, Query |
| Research | P08 Newsletter + P15 Competitive | Newsletter Research, Competitive Analysis |
| Reports | P09 Business + P16 Expense + P25 ROI | Business Report, Expense Report, ROI Report |
| Content | P01 Drafts + P08 Newsletters + P24 LinkedIn | Email Draft, Newsletter, LinkedIn Post |
| Deliverables | P12 Proposals + P13 Contracts + P14 SOWs | Proposal, Contract, SOW |
| Workflows | P27 Executions + P28 SOPs | Execution, SOP |

### Key Files
- Design doc: `docs/plans/2026-03-07-notion-hq-consolidation-design.md`
- Dashboard spec: `_infrastructure/notion-hq/command-center-dashboard.md`
- Install guide: `_infrastructure/notion-hq/INSTALL.md`
- Migration guide: `_infrastructure/notion-hq/MIGRATION.md`
- Manifest: `_infrastructure/notion-db-templates/founder-os-hq-manifest.json`
- Templates: `_infrastructure/notion-db-templates/hq-*.json`
