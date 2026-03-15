# AIOS Enrichment — Design Spec

**Date**: 2026-03-11
**Status**: Approved
**Origin**: Analysis of AIOS by Morning Side course materials — incorporating best patterns into Founder OS

## Overview

Three workstreams that enrich Founder OS with proven AIOS patterns: structured context files, automation audit scorecard, and autonomous scheduling for 9 plugins. Built sequentially (Phase 1 → 2 → 3), each independently shippable.

## Phase 1: Context Files (Phase 0 Memory)

### Problem
All 30 plugins start stateless — no knowledge of the user's business, strategy, or current metrics. Users repeat context every session.

### Solution
Simple markdown context files loaded at session start, following AIOS's proven pattern. Serves as Phase 0 before the full Memory Engine (SQLite+HNSW) ships.

### Location
`_infrastructure/context/`

### Structure
```
_infrastructure/context/
├── SKILL.md                    # Skill: how plugins load and use context (reference doc)
├── active/                     # User's actual context files (gitignored)
│   ├── .gitkeep
│   ├── business-info.md
│   ├── strategy.md
│   └── current-data.md
├── templates/
│   ├── business-info.md        # Template with guided sections
│   ├── strategy.md
│   └── current-data.md
└── commands/
    └── context-setup.md        # /context:setup — interactive interview command
```

### Context Files

**business-info.md** — Company name, what you do, clients/verticals, team size, tools used, revenue model
**strategy.md** — Current quarter priorities, constraints, opportunities, key decisions pending
**current-data.md** — Active clients list, key metrics, tool stack versions, Notion DB IDs

### How It Works
1. User runs `/context:setup` — command file lives at `_infrastructure/context/commands/context-setup.md`, registered in CLAUDE.md's command discovery section as a shared infrastructure command
2. Claude interviews conversationally, generates 3 files into `active/`
3. SKILL.md defines a "Load Context" step — serves as reference documentation (like gws-common), but plugins inline the loading logic directly
4. Each plugin command gets ~5-line addition: check for context files, read if present, skip if absent
5. `active/` is gitignored (business-sensitive), `.gitkeep` preserves structure
6. When Memory Engine ships, it reads these as seed data; context-injection skill supersedes this

### Infrastructure Command Discovery
This spec introduces a new pattern: **shared infrastructure commands** that live outside plugins. These are registered in CLAUDE.md under a new "Infrastructure Commands" section. Claude discovers them because CLAUDE.md is loaded every session. The pattern:
- Command file: `_infrastructure/[module]/commands/[command].md` (standard frontmatter format)
- Discovery: CLAUDE.md lists the command path and description
- Namespace: `/context:setup`, `/audit:scan`, `/audit:report` (infrastructure commands use their module name as namespace)

### Plugin Integration

Plugins inline context loading directly in their command files (same pattern as gws CLI — plugins don't reference `_infrastructure/gws-skills/` either; they inline gws usage). Each command gets a ~5-line addition:

```markdown
## Step 0: Business Context
Check if context files exist at `_infrastructure/context/active/`. If found, read:
- `_infrastructure/context/active/business-info.md`
- `_infrastructure/context/active/strategy.md`
- `_infrastructure/context/active/current-data.md`
Inject their contents into your working memory for this execution. If files don't exist, skip silently (graceful degradation).
```

Note: paths use repo-root-relative `_infrastructure/` paths, NOT `${CLAUDE_PLUGIN_ROOT}` (which resolves to the plugin's own directory). This is consistent with how CLAUDE.md already references `_infrastructure/` paths in documentation.

### Context Updates
Users edit context files directly in `_infrastructure/context/active/`. No separate update command needed — the files are plain markdown. `/context:setup` can be re-run anytime to regenerate from scratch.

### Why 3 Files Not 4
AIOS has `personal-info.md` — in Founder OS the user's role is implicit (founder running plugins). Three files avoids redundancy. `current-data.md` may split into `current-data.md` + `tool-config.md` if update frequencies diverge, but start simple.

---

## Phase 2: Automation Audit Infrastructure

### Problem
No way to measure which of the 30 plugins are deployed, which business areas are covered, or what the overall automation percentage is. Users can't see their progress.

### Solution
Shared infrastructure skill that scans plugin deployment, scores coverage by business area, and produces an actionable scorecard with Task Automation % KPI.

### Location
`_infrastructure/automation-audit/`

### Structure
```
_infrastructure/automation-audit/
├── SKILL.md                    # How to scan, score, and report
├── commands/
│   ├── audit-scan.md           # /audit:scan — detect installed plugins
│   └── audit-report.md         # /audit:report — generate scorecard
├── schema/
│   └── audit-registry.json     # Master registry: 30 plugins → business areas → status
└── references/
    └── task-categories.md      # 9 business areas with task breakdowns
```

### Registry Schema (audit-registry.json)
Maps each plugin to:
- Business area(s) it covers
- What it automates (task descriptions)
- Detection method (directory + plugin.json + optional Notion DB check)
- Default time savings estimate (links to P25 data)

### 9 Business Areas
Operations, Finance, Sales/CRM, Marketing, Content, HR/People, Client Delivery, Product/Dev, Admin

### Commands (shared infrastructure commands — see Phase 1 "Infrastructure Command Discovery")

Command files live at `_infrastructure/automation-audit/commands/`:
- `audit-scan.md` — `/audit:scan` — Auto-detect installed plugins, check Notion DBs, produce coverage report
- `audit-report.md` — `/audit:report` — Generate scorecard and recommendations

Both registered in CLAUDE.md under "Infrastructure Commands" section.

### Scorecard Output
```
Founder OS Automation Scorecard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plugin Deployment: 63% (19/30 plugins installed)
Area Coverage: 72% (weighted by business impact)

By Business Area:
  Operations    ████████░░  80%  (P01,P04,P06,P27 active)
  Finance       ██████░░░░  60%  (P11 active, P16 not installed)
  Sales/CRM     █████████░  90%  (P10,P20,P21 active)
  ...

Recommended Next:
  1. Install P16 Expense Report → covers Finance gap
  2. Install P26 Prompt Library → covers Content gap
```

Note: "Plugin Deployment" counts installed plugins. "Area Coverage" is a weighted score based on how many tasks per business area are covered — not a simple plugin count. The registry assigns each plugin a coverage weight per area.

### Detection Logic
1. Check filesystem for `founder-os-*/.claude-plugin/plugin.json`
2. Optionally query Notion for matching `[FOS]` databases to confirm active usage
3. Score: installed + configured + actively used = different weight levels
4. Idempotent: re-running `/audit:scan` updates existing results, never duplicates

### Notion Integration
Audit results are written to the Reports DB with `Type = "Automation Audit"`. Follows HQ DB discovery convention (search "[FOS] Reports" first). Historical tracking enables trend analysis across monthly audits.

### Integration with P25
`/savings:monthly-roi` can reference the registry to show ROI only for deployed plugins.

---

## Phase 3: Scheduling Bridge (Autonomous Spectrum)

### Problem
Plugins are interactive-only — user must trigger every command manually. No way to say "run my morning sync every weekday at 8am" without manually creating P27 workflows.

### Solution
`--schedule` flag on 9 key plugin commands. Generates P27 workflow YAML behind the scenes. Users don't need to know P27 exists.

### Location
`_infrastructure/scheduling/`

### Structure
```
_infrastructure/scheduling/
├── SKILL.md                    # Standard --schedule support for any plugin command
├── references/
│   └── schedule-flag-spec.md   # Flag behavior, argument parsing, validation
└── templates/
    └── workflow-template.yaml  # Template workflow YAML for auto-generation
```

### --schedule Flag Behavior
- `--schedule "weekdays 8am"` — natural language, generates workflow + registers schedule
- `--schedule "0 8 * * 1-5"` — cron expression, same flow
- `--schedule disable` — removes schedule
- `--schedule status` — shows current schedule
- `--schedule "..." --persistent` — generates persistent cron job via P27's existing os-cron-generation (crontab entry + runner script, consistent with P27's `workflow-schedule.md` implementation)

### Generated Workflow
Stored at `founder-os-workflow-automator/workflows/auto-[plugin-command].yaml` (inside P27's workflow directory, since P27 is the scheduling engine). The `auto-` prefix distinguishes from user-created workflows. Contains:
- Plugin command to execute
- Schedule configuration
- Default arguments (user can customize later via P27)

### Scheduling Conflicts
Multiple plugins can be scheduled at the same time — this is allowed (P27 already supports it). The `--schedule status` output shows all active schedules so users can see overlaps. No automatic conflict resolution — the user decides if they want staggered times.

### Why These 9 Plugins
Selected because they produce **time-sensitive output that benefits from recurring execution**: daily rituals (briefings/reviews that should be ready before the user starts work), data freshness (CRM/health data that goes stale if not refreshed), and monitoring (passive collection that's inherently recurring). Plugins like P12 Proposal Automator or P13 Contract Analyzer are demand-driven (triggered by specific client needs) and don't benefit from scheduling.

### 9 Plugins with --schedule Support

| Tier | Plugin | Command | Default Suggestion |
|------|--------|---------|-------------------|
| Daily rituals | P02 Daily Briefing | `/briefing:daily` (daily-briefing.md) | Weekdays 7:30am |
| | P22 Morning Sync | `/sync:morning` (morning-sync.md) | Weekdays 8:00am |
| | P05 Weekly Review | `/review` (review.md) | Fridays 5:00pm |
| Data freshness | P21 CRM Sync | `/crm:sync-email` (crm-sync-email.md) | Weekdays 9am, 2pm |
| | P10 Client Health | `/client:health-scan` (health-scan.md) | Weekdays 9:30am |
| | P06 Follow-Up Tracker | `/followup:check` (followup-check.md) | Weekdays 10:00am |
| Monitoring | P18 Drive Brain | `/drive:search` (drive-search.md) | Daily 6:00am |
| | P19 Slack Digest | `/slack:digest` (slack-digest.md) | Weekdays 6:00pm |
| | P29 Learning Log | `/learn:weekly` (learn-weekly.md) | Fridays 4:00pm |

### Per-Plugin Change
~10-line "Scheduling" section added to each command's .md file:
```markdown
## Scheduling Support
Read `_infrastructure/scheduling/SKILL.md`.
If `--schedule` is present in arguments, handle scheduling and exit (do not run main logic).
```

### Relationship to P27
- P27 remains the scheduling engine
- `--schedule` is syntactic sugar generating P27 workflows
- Complex multi-step scheduling still uses P27 directly
- `auto-` prefix distinguishes auto-generated from user-created workflows

---

## Build Order

1. **Phase 1: Context Files** — Foundation. Establishes infrastructure skill pattern.
2. **Phase 2: Audit Infrastructure** — Follows same pattern. Measures automation coverage.
3. **Phase 3: Scheduling Bridge** — Follows same pattern. Delivers autonomous spectrum.

Each phase is independently shippable. Each compounds on the pattern established by the previous.

## Non-Goals
- No changes to the Memory Engine spec (Phase 1 is additive, not replacement)
- No new plugins (all 3 workstreams are infrastructure skills + shared commands)
- No P27 refactoring (scheduling bridge generates P27-compatible artifacts)
- No Tier 2/3 scheduling expansion beyond the 9 listed plugins (pattern established, others follow trivially later)
