# Founder OS Single Plugin Restructure — Design Spec

> **Status:** Approved
> **Date:** 2026-03-11
> **Goal:** Restructure Founder OS from 33 separate plugins into a single Claude Code plugin with proper discovery of all commands, skills, and agents.

## Problem

The current architecture has 33 separate `founder-os-*` plugin directories. The install.sh creates symlinks to `.claude/plugins/`, but Claude Code does not discover local plugins via symlinks — that directory is a cache for marketplace-installed plugins only. As a result, no slash commands, skills, or agents are visible to users after installation.

## Solution

Restructure the repository so it IS a single Claude Code plugin. The repo root contains `.claude-plugin/plugin.json`, and all commands/skills/agents live in the standard directories Claude Code scans. No symlinks needed.

## Directory Structure

```
founder-os/                              # repo root = plugin root
├── .claude-plugin/
│   └── plugin.json                      # single manifest
├── .mcp.json                            # all MCP servers (Notion, Filesystem)
├── commands/                            # 94 commands, grouped by namespace
│   ├── setup/                           # P00 — /founder-os:setup:*
│   │   ├── notion-hq.md
│   │   └── verify.md
│   ├── inbox/                           # P01 — /founder-os:inbox:*
│   │   ├── triage.md
│   │   └── drafts-approved.md
│   ├── briefing/                        # P02 — /founder-os:briefing:*
│   │   ├── daily.md
│   │   └── review.md
│   ├── prep/                            # P03 — /founder-os:prep:*
│   │   ├── today.md
│   │   └── meeting.md
│   ├── actions/                         # P04 — /founder-os:actions:*
│   │   ├── extract.md
│   │   └── extract-file.md
│   ├── review/                          # P05 — /founder-os:review:*
│   │   └── weekly.md
│   ├── followup/                        # P06 — /founder-os:followup:*
│   │   ├── check.md
│   │   ├── nudge.md
│   │   └── remind.md
│   ├── meeting/                         # P07 — /founder-os:meeting:*
│   │   ├── analyze.md
│   │   └── intel.md
│   ├── newsletter/                      # P08 — /founder-os:newsletter:*
│   │   ├── draft.md
│   │   ├── outline.md
│   │   └── research.md
│   ├── report/                          # P09 — /founder-os:report:*
│   │   ├── generate.md
│   │   └── from-template.md
│   ├── health/                          # P10 — /founder-os:health:*
│   │   ├── scan.md
│   │   └── report.md
│   ├── invoice/                         # P11 — /founder-os:invoice:*
│   │   ├── process.md
│   │   └── batch.md
│   ├── proposal/                        # P12 — /founder-os:proposal:*
│   │   ├── create.md
│   │   └── from-brief.md
│   ├── contract/                        # P13 — /founder-os:contract:*
│   │   ├── analyze.md
│   │   └── compare.md
│   ├── sow/                             # P14 — /founder-os:sow:*
│   │   ├── generate.md
│   │   └── from-brief.md
│   ├── compete/                         # P15 — /founder-os:compete:*
│   │   ├── research.md
│   │   └── matrix.md
│   ├── expense/                         # P16 — /founder-os:expense:*
│   │   ├── report.md
│   │   └── summary.md
│   ├── notion/                          # P17 — /founder-os:notion:*
│   │   ├── create.md
│   │   ├── query.md
│   │   ├── template.md
│   │   └── update.md
│   ├── drive/                           # P18 — /founder-os:drive:*
│   │   ├── search.md
│   │   ├── ask.md
│   │   ├── organize.md
│   │   └── summarize.md
│   ├── slack/                           # P19 — /founder-os:slack:*
│   │   ├── digest.md
│   │   └── catch-up.md
│   ├── client/                          # P20 — /founder-os:client:*
│   │   ├── load.md
│   │   └── brief.md
│   ├── crm/                             # P21 — /founder-os:crm:*
│   │   ├── sync-email.md
│   │   ├── sync-meeting.md
│   │   └── context.md
│   ├── morning/                         # P22 — /founder-os:morning:*
│   │   ├── sync.md
│   │   └── quick.md
│   ├── kb/                              # P23 — /founder-os:kb:*
│   │   ├── ask.md
│   │   ├── find.md
│   │   └── index.md
│   ├── linkedin/                        # P24 — /founder-os:linkedin:*
│   │   ├── post.md
│   │   ├── from-doc.md
│   │   └── variations.md
│   ├── savings/                         # P25 — /founder-os:savings:*
│   │   ├── quick.md
│   │   ├── weekly.md
│   │   ├── monthly-roi.md
│   │   └── configure.md
│   ├── prompt/                          # P26 — /founder-os:prompt:*
│   │   ├── list.md
│   │   ├── get.md
│   │   ├── add.md
│   │   ├── optimize.md
│   │   └── share.md
│   ├── workflow/                        # P27 — /founder-os:workflow:*
│   │   ├── create.md
│   │   ├── run.md
│   │   ├── list.md
│   │   ├── edit.md
│   │   ├── status.md
│   │   └── schedule.md
│   ├── workflow-doc/                    # P28 — /founder-os:workflow-doc:*
│   │   ├── document.md
│   │   └── diagram.md
│   ├── learn/                           # P29 — /founder-os:learn:*
│   │   ├── log.md
│   │   ├── search.md
│   │   └── weekly.md
│   ├── goal/                            # P30 — /founder-os:goal:*
│   │   ├── create.md
│   │   ├── update.md
│   │   ├── check.md
│   │   ├── close.md
│   │   └── report.md
│   ├── memory/                          # P31 — /founder-os:memory:*
│   │   ├── show.md
│   │   ├── teach.md
│   │   ├── forget.md
│   │   └── sync.md
│   └── intel/                           # P32 — /founder-os:intel:*
│       ├── status.md
│       ├── patterns.md
│       ├── healing.md
│       ├── config.md
│       ├── approve.md
│       └── reset.md
├── skills/                              # 77 skills, grouped by namespace
│   ├── inbox/
│   │   ├── email-triage/SKILL.md
│   │   └── email-drafting/SKILL.md
│   ├── briefing/
│   │   ├── daily-briefing/SKILL.md
│   │   └── ...
│   ├── ... (mirrors command namespaces)
│   └── infrastructure/                  # shared skills from _infrastructure
│       ├── memory-api/SKILL.md
│       ├── context-injection/SKILL.md
│       └── pattern-detection/SKILL.md
├── agents/                              # 36 agents, grouped by namespace
│   ├── inbox/
│   │   ├── config.json
│   │   ├── triage-agent.md
│   │   └── draft-agent.md
│   ├── briefing/
│   │   ├── config.json
│   │   ├── calendar-agent.md
│   │   └── gmail-agent.md
│   └── ... (only P01, P02, P03, P11, P14 have agents)
├── _infrastructure/                     # shared resources (kept as-is)
│   ├── gws-skills/
│   ├── memory/
│   ├── intelligence/
│   ├── notion-db-templates/
│   ├── notion-hq/
│   ├── context/
│   ├── scheduling/
│   ├── mcp-configs/
│   └── automation-audit/
├── docs/
│   └── getting-started/
│       ├── SETUP-GUIDE.md
│       ├── FAQ.md
│       └── TROUBLESHOOTING.md
├── install.sh
├── .env.example
├── .mcp.json.example
├── CLAUDE.md
└── README.md
```

## Plugin Manifest

Single manifest at `.claude-plugin/plugin.json`:

```json
{
  "name": "founder-os",
  "version": "1.0.0",
  "description": "32-plugin AI automation ecosystem for SMB founders. Email triage, meeting prep, report generation, CRM sync, and 28 more tools — all powered by Claude Code.",
  "platform": "claude-code",
  "author": {
    "name": "Founder OS",
    "email": "contact@founderos.dev"
  }
}
```

## Command Naming Convention

Commands resolve via: `/{plugin-name}:{directory}:{filename}`

| User types | File path |
|------------|-----------|
| `/founder-os:inbox:triage` | `commands/inbox/triage.md` |
| `/founder-os:report:generate` | `commands/report/generate.md` |
| `/founder-os:setup:verify` | `commands/setup/verify.md` |
| `/founder-os:goal:create` | `commands/goal/create.md` |
| `/founder-os:workflow:run` | `commands/workflow/run.md` |

## Namespace Mapping

| Namespace | Plugin Origin | Commands |
|-----------|--------------|----------|
| `setup` | P00 Setup | notion-hq, verify |
| `inbox` | P01 Inbox Zero | triage, drafts-approved |
| `briefing` | P02 Daily Briefing | daily, review |
| `prep` | P03 Meeting Prep | today, meeting |
| `actions` | P04 Action Items | extract, extract-file |
| `review` | P05 Weekly Review | weekly |
| `followup` | P06 Follow-Up | check, nudge, remind |
| `meeting` | P07 Meeting Intel | analyze, intel |
| `newsletter` | P08 Newsletter | draft, outline, research |
| `report` | P09 Report Gen | generate, from-template |
| `health` | P10 Client Health | scan, report |
| `invoice` | P11 Invoice | process, batch |
| `proposal` | P12 Proposal | create, from-brief |
| `contract` | P13 Contract | analyze, compare |
| `sow` | P14 SOW | generate, from-brief |
| `compete` | P15 Competitive Intel | research, matrix |
| `expense` | P16 Expense | report, summary |
| `notion` | P17 Notion Command Center | create, query, template, update |
| `drive` | P18 Drive Brain | search, ask, organize, summarize |
| `slack` | P19 Slack Digest | digest, catch-up |
| `client` | P20 Client Context | load, brief |
| `crm` | P21 CRM Sync | sync-email, sync-meeting, context |
| `morning` | P22 Morning Sync | sync, quick |
| `kb` | P23 Knowledge Base | ask, find, index |
| `linkedin` | P24 LinkedIn Post | post, from-doc, variations |
| `savings` | P25 Time Savings | quick, weekly, monthly-roi, configure |
| `prompt` | P26 Prompt Library | list, get, add, optimize, share |
| `workflow` | P27 Workflow Automator | create, run, list, edit, status, schedule |
| `workflow-doc` | P28 Workflow Documenter | document, diagram |
| `learn` | P29 Learning Log | log, search, weekly |
| `goal` | P30 Goal Tracker | create, update, check, close, report |
| `memory` | P31 Memory Hub | show, teach, forget, sync |
| `intel` | P32 Adaptive Intel | status, patterns, healing, config, approve, reset |

## MCP Configuration

Single `.mcp.json` at repo root with all required servers:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": { "NOTION_API_KEY": "${NOTION_API_KEY}" }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${WORKSPACE_DIR}"],
      "env": {}
    }
  }
}
```

## install.sh Changes

Simplified — no more symlink phase:

1. **Phase 1**: Prerequisites check (python3, Node 18+, npx, Claude Code, gws)
2. **Phase 2**: Environment setup (.env loading, Notion API validation, workspace dir)
3. **Phase 3**: Google auth via gws CLI
4. **Phase 4**: MCP config (merge Notion + Filesystem into .mcp.json — no symlinks)
5. **Phase 5**: Notion HQ setup (create 22 databases)
6. **Phase 6**: Verification (Notion connectivity, gws auth, MCP config, workspace, env vars)

The `--reset` flag now only needs to clean `.mcp.json` entries (no symlinks to remove).

## Release Script Changes

`scripts/release.sh` copies the repo to the dist location, excluding dev-only content:
- `.beads/`, `.swarm/`, `.dolt/` — dev tracking
- `docs/specs/`, `docs/plans/`, `docs/superpowers/` — dev docs
- `_templates/` — dev scaffolding templates
- `social/` — blog posts and welcome gifts
- `scripts/` — dev-only scripts (release.sh itself, generate-user-claude-md.sh)
- `docs/agent-specs/`, `docs/reference/`, `docs/reports/` — dev reference docs

The dist repo gets a generated user-facing `CLAUDE.md` (no beads/dev references).

## Command File Migration

Each command file needs two changes when migrating:

1. **Rename**: Strip namespace prefix from filename (e.g., `inbox-triage.md` → `triage.md`)
2. **Update internal references**: Any `${CLAUDE_PLUGIN_ROOT}` paths need to reference the new skill/agent locations

Example — `inbox-triage.md` references the email-triage skill:
- Before: `Load the email-triage skill from this plugin`
- After: `Load the inbox/email-triage skill` (path relative to `skills/`)

## Adding New Features

To add a new feature (e.g., P33 "Calendar Planner"):

1. `mkdir commands/calendar` — add command `.md` files
2. `mkdir -p skills/calendar/calendar-planning` — add SKILL.md
3. Optionally `mkdir agents/calendar` — add agent team
4. Done — Claude discovers everything automatically

No manifest updates, no install script changes, no configuration.

## What Gets Removed

- All 33 `founder-os-*/` plugin directories
- `.claude/plugins/` symlink mechanism
- Per-plugin `.claude-plugin/plugin.json` manifests (33 files → 1)
- Per-plugin `.mcp.json` files (33 files → 1)
- Per-plugin `README.md`, `INSTALL.md`, `QUICKSTART.md` (99 files → root-level docs)
- Per-plugin `tests/integration-test-plan.md` (consolidate into single test plan)
