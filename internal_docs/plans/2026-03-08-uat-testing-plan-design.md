# Founder OS UAT Testing Plan — Design

**Date**: 2026-03-08
**Status**: Approved
**Scope**: All 30 plugins, pillar-by-pillar with go/no-go gates

## Overview

A self-contained `/uat-testing` subdirectory acting as a Claude Code / Cowork project with all 30 plugins installed. Testing runs pillar-by-pillar using **claude-flow swarms** for orchestration. Results are written to a **[FOS] Test Results** Notion database for dogfooding the Notion integration.

## MCP & Tool Environment

| Tool | Status | Usage |
|------|--------|-------|
| Notion (MCP) | Full credentials | All 21 Notion-dependent plugins |
| gws CLI (Gmail) | Authenticated, gmail.readonly + gmail.insert + gmail.send scopes | P01, P02, P05, P06, P10, P20, P21, P22 |
| gws CLI (Calendar) | Authenticated, calendar.events + calendar.readonly scopes | P02, P03, P05, P06, P10, P20, P21, P22 |
| gws CLI (Drive) | Authenticated, drive.readonly scope | P03, P04, P09, P11-P14, P16, P18, P20, P23 |
| Slack (MCP) | Skipped | P19 tested via degradation path |
| Web Search (MCP) | Skipped | P08, P15 tested via degradation path |
| Filesystem (MCP) | Local fixtures | P07-P16, P24-P28 use `/uat-testing/fixtures/` |

> **Note**: Google MCP servers were replaced by the `gws` CLI tool in March 2026. Drive is **no longer skipped** — gws CLI provides reliable Drive access without MCP server overhead.

## Directory Structure

```
/uat-testing/
├── .claude-plugin/           # Makes this a Claude Code project
│   └── plugin.json           # UAT test runner manifest
├── .mcp.json                 # Notion (full) + Filesystem — gws CLI handles Gmail/Calendar/Drive
├── CLAUDE.md                 # Test runner instructions & conventions
├── swarms/
│   ├── pillar-1-daily-work.yaml
│   ├── pillar-2-code-without-coding.yaml
│   ├── pillar-3-integrations.yaml
│   ├── pillar-4-meta-growth.yaml
│   ├── cross-plugin-chains.yaml
│   └── stress-test.yaml
├── fixtures/
│   ├── emails/               # Test email templates for Gmail seeding
│   │   ├── action-required/  # Emails needing response/action
│   │   ├── fyi/              # Informational emails
│   │   ├── newsletter/       # Newsletter-style emails
│   │   ├── vip/              # From known VIP senders
│   │   └── edge-cases/       # Malformed, Unicode, empty subject
│   ├── calendar-events/      # Test meeting data (JSON)
│   │   ├── standard/         # Normal 1:1 and group meetings
│   │   ├── recurring/        # Weekly/monthly recurring events
│   │   └── edge-cases/       # Cancelled, all-day, no-attendees
│   ├── documents/            # Sample business documents
│   │   ├── invoices/         # PDF invoices (valid + malformed)
│   │   ├── contracts/        # DOCX contracts for analysis
│   │   ├── proposals/        # Proposal templates
│   │   ├── csv-data/         # Data files for report generation
│   │   └── sow-templates/    # SOW input documents
│   └── edge-cases/           # Cross-cutting edge case fixtures
│       ├── empty-files/      # Zero-byte files
│       ├── malformed-json/   # Invalid JSON structures
│       ├── large-files/      # 10MB+ documents
│       └── unicode-heavy/    # Multilingual, emoji-heavy content
├── validators/
│   ├── notion-db-validator.md        # Verify DB writes
│   ├── output-schema-validator.md    # Validate JSON output structures
│   └── degradation-validator.md      # Verify graceful failures
├── results/                  # Local JSON backup of test runs
├── scripts/
│   ├── seed-test-emails.sh           # Gmail test account seeding
│   ├── seed-calendar-events.sh       # Calendar test event creation
│   ├── reset-notion-test-data.sh     # Wipe & re-seed HQ databases
│   └── validate-environment.sh       # Pre-flight MCP + data checks
└── commands/
    ├── run-pillar.md         # /uat:run-pillar <N>
    ├── run-all.md            # /uat:run-all
    ├── run-stress.md         # /uat:stress
    ├── report.md             # /uat:report
    └── reset.md              # /uat:reset
```

## Swarm Architecture

Each pillar runs as a **claude-flow swarm** with this agent topology:

```
Swarm Coordinator (1 per pillar)
├── Test Data Prep Agent     → Seeds/validates fixture data for this pillar
├── Plugin Test Agent × N    → One per plugin, runs integration test plan
├── Validation Agent         → Checks Notion DB state after each plugin
└── Reporter Agent           → Writes results to [FOS] Test Results DB
```

### Execution Flow Per Pillar

1. **Pre-flight** — `validate-environment.sh` checks MCP connections, gws CLI availability, DB access, fixture availability
2. **Prep phase** — Data prep agent verifies existing test data, seeds any missing fixtures
3. **Execute phase** — Plugin test agents run in parallel (respecting dependency order)
4. **Validate phase** — Validation agent checks:
   - DB writes have correct Type column values
   - Company/Contact relations populated correctly
   - No duplicate records created (idempotency)
   - Graceful degradation for unavailable tools (gws CLI, optional MCPs)
5. **Report phase** — Reporter writes pass/fail/skip to Notion + local JSON
6. **Gate decision** — Coordinator checks: ≥90% pass rate → proceed to next pillar. <90% → stop, report blockers.

## Pillar Execution Order

| Phase | Pillar | Plugins | Dependency | Gate Criteria |
|-------|--------|---------|------------|--------------|
| 1 | Daily Work | P01-P08 (8) | None | ≥90% pass, no critical failures |
| 2 | Code Without Coding | P09-P16 (8) | P01 for email drafts | ≥90% pass, no critical failures |
| 3 | MCP & Integrations | P17-P24 (8) | P01-P16 outputs exist | ≥90% pass, no critical failures |
| 4 | Meta & Growth | P25-P30 (6) | P01-P24 outputs exist | ≥90% pass |
| 5 | Cross-Plugin Chains | 6 chains | All pillars pass | All chains pass |
| 6 | Stress Test | Volume + edge | All chains pass | No crashes, degradation works |

### Within-Pillar Dependency Order

**Pillar 1**: P04 (no deps) → P01 (Gmail) → P06 (needs P01 output) → P02, P03, P05, P07, P08 (parallel)
**Pillar 2**: P09, P11, P12, P13, P15 (parallel) → P14 (needs P12) → P16 (needs P11) → P08 (if not done)
**Pillar 3**: P17, P18, P19, P23 (parallel) → P21 (CRM sync) → P20 (needs P21) → P22, P24 (parallel)
**Pillar 4**: P26, P29, P30 (parallel) → P25 (needs P11 finance data) → P27, P28 (parallel)

## Test Categories Per Plugin

Each plugin test agent executes these test types (sourced from existing `integration-test-plan.md` files):

| # | Category | What It Tests | Pass Criteria |
|---|----------|---------------|---------------|
| 1 | Happy path | Default command, expected output | Correct output structure, status: "complete" |
| 2 | HQ DB discovery | 3-step fallback (HQ → legacy → skip/create) | Finds correct DB at each level |
| 3 | Type column enforcement | Correct Type value in merged DBs | Exact match (e.g., "Email Task" not "email_task") |
| 4 | Idempotency | Run command twice with same input | No duplicate records, updated timestamps |
| 5 | Company relation | Relations populated from context | Relation set when client match found |
| 6 | Graceful degradation | gws CLI unavailable or auth expired, missing optional MCPs | Warning + neutral defaults, no crash |
| 7 | Edge cases | Empty input, malformed data, Unicode | Handled without crash, meaningful error |

## Cross-Plugin Chain Tests (Phase 5)

| Chain | Flow | Test Scenario |
|-------|------|---------------|
| Email→Follow-Up | P01 → P06 | Triage email → detect promise → create follow-up task |
| Invoice→Expense→ROI | P11 → P16 → P25 | Process invoice → expense report → ROI calculation |
| Meeting Prep+Intel | P03 + P07 | Prep before meeting → analyze after → no data overwrite |
| CRM Ecosystem | P20 ↔ P21 ↔ P10 | Sync comms → load context → score health |
| Proposal→SOW | P12 → P14 | Generate proposal → convert to SOW |
| Briefing Storm | P02 + P05 + P19 + P22 | All 4 briefing types to same DB, no conflicts |

## Stress Test Scenarios (Phase 6)

| Scenario | Target | Volume | Success Criteria |
|----------|--------|--------|-----------------|
| Inbox flood | P01 | 200 emails in single triage | Completes without timeout, correct categorization |
| Meeting marathon | P03 | 15 meetings in one day | All prepped, no duplicates |
| Invoice batch | P11 | 50 invoices processed | All categorized, Finance DB integrity |
| Client overload | P10 | 20+ clients health scan | All scored, no relation errors |
| Briefing storm | P02+P05+P19+P22 | All 4 types simultaneously | No Type conflicts in Briefings DB |
| Chain cascade | P20→P21→P10 | Full CRM with 10 clients | End-to-end data consistency |

## Notion [FOS] Test Results Database Schema

```
[FOS] Test Results
├── Test ID (title)              # e.g., "P01-HP-001" (Plugin-Category-Seq)
├── Plugin (select)              # P01 through P30
├── Pillar (select)              # 1, 2, 3, 4, Cross-Plugin, Stress
├── Category (select)            # Happy Path, DB Discovery, Type Column, Idempotency, Company Relation, Degradation, Edge Case
├── Status (select)              # Pass, Fail, Skip, Error
├── Error Detail (rich text)     # Stack trace / failure description
├── Expected (rich text)         # What should have happened
├── Actual (rich text)           # What actually happened
├── Duration (number)            # Seconds
├── Run ID (text)                # Timestamp-based batch ID
├── Agent (text)                 # Which swarm agent ran it
├── Timestamp (created_time)     # When the test ran
├── Company (relation)           # Link to Companies DB for client-specific tests
```

## Test Data Requirements

### Existing Data (224 records in HQ — already seeded)

Per the completed test data prep plan (2026-03-07):
- 8 companies (Acme=green, Meridian=yellow, RetailCo=red, + 5 scenario-specific)
- 15 contacts with company relations
- 6 deals at various stages
- 12 communications with sentiment data
- 30 tasks across 3 plugin types
- 12 meetings with cross-plugin fields
- 25 finance records (invoices + expenses)
- 8 deliverables (proposals, contracts, SOWs)
- Plus briefings, content, knowledge base, goals, workflows entries

### Additional Data to Create (UAT-specific)

**Gmail Test Account Seeding** (50+ emails):
- 15 action-required emails (meeting requests, approvals, questions)
- 10 FYI/informational (status updates, announcements)
- 5 newsletters (marketing, industry, internal)
- 5 VIP sender emails (mapped to Acme Corp, Meridian contacts)
- 5 follow-up candidates (unanswered threads, promises made)
- 5 edge cases (empty subject, attachment-only, non-English, very long thread)
- 5 spam-like (promotional, cold outreach)

**Calendar Test Events** (15+ events):
- 5 standard 1:1 meetings (with known contacts from CRM)
- 3 group meetings (3+ attendees)
- 2 recurring meetings (weekly standup, monthly review)
- 2 all-day events (offsite, deadline)
- 1 cancelled meeting (test handling)
- 1 past meeting (for Meeting Intel analysis)
- 1 meeting with no attendees (edge case)

**Filesystem Fixtures**:
- 5 sample invoices (PDF) — valid amounts, various formats
- 3 contracts (DOCX) — different clause structures
- 3 proposals — varying complexity
- 5 CSV data files — sales data, time tracking, expenses
- 2 malformed invoices — missing fields, corrupt PDF
- 2 oversized documents — 5MB+, 10MB+
- Unicode-heavy documents — multilingual content

### Data Preparation Scripts

All seeding scripts live in `/uat-testing/scripts/` and are idempotent:

1. `validate-environment.sh` — Pre-flight: check MCP connections, verify `which gws` + gws auth status, verify HQ DB access, confirm fixture files exist
2. `seed-test-emails.sh` — Insert test emails into Gmail inbox using `gws gmail users messages insert` (GWS CLI with `gmail.insert` scope, base64url-encoded .eml files via `--json '{"raw": "...", "labelIds": ["INBOX", "UNREAD"]}'`)
3. `seed-calendar-events.sh` — Create test events using `gws calendar +insert` or `gws calendar events insert`
4. `reset-notion-test-data.sh` — Delete all test-generated records (preserving seed data), re-run HQ seeding phases 1-12
5. Each script outputs a JSON manifest of created resources for test reference

## Setup Preparation Checklist

### One-Time Setup

1. [ ] Create `/uat-testing/` directory structure
2. [ ] Configure `.mcp.json` with Notion + Filesystem; verify gws CLI is authenticated (`gws auth login`)
3. [ ] Create `CLAUDE.md` with test runner conventions
4. [ ] Create `[FOS] Test Results` Notion database in HQ workspace
5. [ ] Write all 6 swarm YAML configurations
6. [ ] Create fixture files (emails, calendar events, documents)
7. [ ] Write seeding scripts
8. [ ] Write validation agent instructions
9. [ ] Install all 30 plugins in the UAT project
10. [ ] Run `validate-environment.sh` to confirm setup

### Per-Run Setup

1. [ ] Run `reset-notion-test-data.sh` (clean slate)
2. [ ] Run `seed-test-emails.sh` (fresh inbox)
3. [ ] Run `seed-calendar-events.sh` (upcoming meetings)
4. [ ] Run `validate-environment.sh` (pre-flight check)
5. [ ] Execute pillar swarms in order

## Success Criteria for Launch

- **All 30 plugins pass** happy path tests
- **All merged DB writes** have correct Type column values
- **All 6 cross-plugin chains** complete end-to-end
- **Zero data corruption** — no duplicate records, no broken relations
- **Graceful degradation works** for Slack, Web Search (skipped MCPs) and gws CLI unavailability
- **Stress tests complete** without crashes or timeouts
- **Overall pass rate ≥ 95%** across all test categories
