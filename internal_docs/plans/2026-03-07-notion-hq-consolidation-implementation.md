# Notion HQ Consolidation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate 32+ Founder OS plugin Notion databases into ~18 interconnected databases shipped as a single "Founder OS HQ" Notion workspace template, with CRM Companies as the central hub.

**Architecture:** Create a master template JSON defining all consolidated databases, their properties, relations, and select options. Then update each plugin's skills, commands, tests, and docs to reference the new consolidated DB names, write Type columns, and populate Company relations. Remove lazy creation logic and replace with discovery-only + fallback.

**Tech Stack:** Notion MCP, JSON database templates, Markdown plugin definitions (skills/commands/agents)

**Design Doc:** `docs/plans/2026-03-07-notion-hq-consolidation-design.md`

---

## Phase 1: Master Template Foundation

### Task 1: Create CRM Core DB Templates

The CRM Pro core tables (Companies, Contacts, Deals) have no template JSONs yet. Create them.

**Files:**
- Create: `_infrastructure/notion-db-templates/hq-companies.json`
- Create: `_infrastructure/notion-db-templates/hq-contacts.json`
- Create: `_infrastructure/notion-db-templates/hq-deals.json`

**Step 1: Create Companies DB template**

Create `_infrastructure/notion-db-templates/hq-companies.json` with the enhanced schema from the design doc Section 4.1. Include all original CRM Pro properties PLUS absorbed properties from P10 (Health Score, Health Status, Risk Flags, Last Scanned) and P20 (Dossier, Dossier Completeness, Dossier Generated At, Dossier Stale). Follow the exact JSON format used by existing templates (see `crm-sync-hub-communications.json` for reference).

Key fields:
- `title`: "Founder OS HQ - Companies"
- `description`: Explain this is the CRM core enhanced with health scoring and dossier caching
- `plugin`: "founder-os-hq" (new)
- All 17 properties from design doc Section 4.1 Companies DB
- Relations to: Contacts, Deals, Communications (use `relation_database` field)
- Default values: Health Status = "Yellow", Dossier Stale = false

**Step 2: Create Contacts DB template**

Create `_infrastructure/notion-db-templates/hq-contacts.json`:
- `title`: "Founder OS HQ - Contacts"
- 8 properties from design doc Section 4.1 Contacts DB
- Relation to Companies

**Step 3: Create Deals DB template**

Create `_infrastructure/notion-db-templates/hq-deals.json`:
- `title`: "Founder OS HQ - Deals"
- 8 properties from design doc Section 4.1 Deals DB
- Relations to Companies, Deliverables

**Step 4: Commit**

```bash
git add _infrastructure/notion-db-templates/hq-companies.json _infrastructure/notion-db-templates/hq-contacts.json _infrastructure/notion-db-templates/hq-deals.json
git commit -m "feat(hq): add CRM core database templates (Companies, Contacts, Deals)"
```

---

### Task 2: Create Consolidated Operations DB Templates

**Files:**
- Create: `_infrastructure/notion-db-templates/hq-tasks.json`
- Create: `_infrastructure/notion-db-templates/hq-meetings.json`
- Create: `_infrastructure/notion-db-templates/hq-finance.json`

**Step 1: Create Tasks DB template**

Merges P01 Action Items + P04 Tasks + P06 Follow-Ups. Schema from design doc Section 4.2 Tasks DB. 16 properties including Type select (Action Item, Follow-Up, Email Task), Source Plugin select, Company/Contact relations. Title: "Founder OS HQ - Tasks".

**Step 2: Create Meetings DB template**

Merges P03 Prep Notes + P07 Analyses. Schema from design doc Section 4.2 Meetings DB. 17 properties including both prep (Prep Notes, Talking Points, Importance Score) and analysis (Summary, Decisions, Follow-Ups, Topics) fields. Title: "Founder OS HQ - Meetings".

**Step 3: Create Finance DB template**

Merges P11 Invoices + P16 Expenses. Schema from design doc Section 4.2 Finance DB. 16 properties including Type select (Invoice, Expense), Company relation. Title: "Founder OS HQ - Finance".

**Step 4: Commit**

```bash
git add _infrastructure/notion-db-templates/hq-tasks.json _infrastructure/notion-db-templates/hq-meetings.json _infrastructure/notion-db-templates/hq-finance.json
git commit -m "feat(hq): add Operations database templates (Tasks, Meetings, Finance)"
```

---

### Task 3: Create Consolidated Intelligence DB Templates

**Files:**
- Create: `_infrastructure/notion-db-templates/hq-briefings.json`
- Create: `_infrastructure/notion-db-templates/hq-knowledge-base.json`
- Create: `_infrastructure/notion-db-templates/hq-research.json`
- Create: `_infrastructure/notion-db-templates/hq-reports.json`

**Step 1: Create Briefings DB template**

Merges P02 + P05 + P19 + P22. Schema from design doc Section 4.3 Briefings DB. 16 properties with Type select (Daily Briefing, Weekly Review, Slack Digest, Morning Sync). Title: "Founder OS HQ - Briefings".

**Step 2: Create Knowledge Base DB template**

Merges P23 Sources + Queries. Schema from design doc Section 4.3 Knowledge Base DB. 14 properties with Type select (Source, Query). Title: "Founder OS HQ - Knowledge Base".

**Step 3: Create Research DB template**

Merges P08 Research + P15 Competitive Intel. Schema from design doc Section 4.3 Research DB. 16 properties with Type select (Newsletter Research, Competitive Analysis), Company relation. Title: "Founder OS HQ - Research".

**Step 4: Create Reports DB template**

Merges P09 + P25. Schema from design doc Section 4.3 Reports DB. 14 properties with Type select (Business Report, ROI Report). Title: "Founder OS HQ - Reports".

**Step 5: Commit**

```bash
git add _infrastructure/notion-db-templates/hq-briefings.json _infrastructure/notion-db-templates/hq-knowledge-base.json _infrastructure/notion-db-templates/hq-research.json _infrastructure/notion-db-templates/hq-reports.json
git commit -m "feat(hq): add Intelligence database templates (Briefings, Knowledge Base, Research, Reports)"
```

---

### Task 4: Create Consolidated Content & Deliverables DB Templates

**Files:**
- Create: `_infrastructure/notion-db-templates/hq-content.json`
- Create: `_infrastructure/notion-db-templates/hq-deliverables.json`

**Step 1: Create Content DB template**

Merges P08 Newsletters + P24 LinkedIn + P01 Drafts. Schema from design doc Section 4.4 Content DB. 12 properties with Type select (Newsletter, LinkedIn Post, Email Draft), Company relation. Title: "Founder OS HQ - Content".

**Step 2: Create Deliverables DB template**

Merges P12 Proposals + P13 Contracts + P14 SOWs. Schema from design doc Section 4.4 Deliverables DB. 15 properties with Type select (Proposal, Contract, SOW), Company + Deal relations. Title: "Founder OS HQ - Deliverables".

**Step 3: Commit**

```bash
git add _infrastructure/notion-db-templates/hq-content.json _infrastructure/notion-db-templates/hq-deliverables.json
git commit -m "feat(hq): add Content & Deliverables database templates"
```

---

### Task 5: Create Consolidated Growth & Meta DB Templates

**Files:**
- Create: `_infrastructure/notion-db-templates/hq-workflows.json`

Note: Goals, Milestones, Learnings, Weekly Insights, Prompts, Activity Log are unchanged — their existing templates just need to be included in the master template. Only Workflows (P27+P28 merge) needs a new template.

**Step 1: Create Workflows DB template**

Merges P27 Executions + P28 SOPs. Schema from design doc Section 4.5 Workflows DB. 21 properties with Type select (Execution, SOP). Title: "Founder OS HQ - Workflows".

**Step 2: Commit**

```bash
git add _infrastructure/notion-db-templates/hq-workflows.json
git commit -m "feat(hq): add Workflows database template (merges P27+P28)"
```

---

### Task 6: Create Master HQ Template Manifest

A single JSON file that references all 18 databases in the correct creation order (respecting relation dependencies), defines the workspace page structure, and specifies dashboard view configurations.

**Files:**
- Create: `_infrastructure/notion-db-templates/founder-os-hq-manifest.json`

**Step 1: Create the manifest**

Structure:
```json
{
  "name": "Founder OS HQ",
  "version": "1.0.0",
  "description": "Complete Notion workspace template for Founder OS",
  "sections": [
    {
      "name": "CRM",
      "icon": "building",
      "databases": ["hq-companies", "hq-contacts", "hq-deals", "crm-sync-hub-communications"]
    },
    ...
  ],
  "creation_order": [
    "hq-companies", "hq-contacts", "hq-deals",
    "crm-sync-hub-communications",
    "hq-tasks", "hq-meetings", "hq-finance",
    "hq-briefings", "hq-knowledge-base", "hq-research", "hq-reports",
    "hq-content", "hq-deliverables", "team-prompt-library-prompts",
    "goal-progress-tracker-goals", "goal-progress-tracker-milestones",
    "learning-log-tracker-learnings", "learning-log-tracker-weekly-insights",
    "hq-workflows", "google-drive-brain-activity"
  ],
  "relations": [ ... ],
  "dashboard": {
    "widgets": [ ... 8 widget definitions from design doc Section 6 ... ]
  }
}
```

Creation order matters because relation targets must exist before the relation source is created. Companies/Contacts/Deals must be created first, then databases that relate to them.

**Step 2: Commit**

```bash
git add _infrastructure/notion-db-templates/founder-os-hq-manifest.json
git commit -m "feat(hq): add master workspace manifest with creation order and dashboard spec"
```

---

## Phase 2: High-Impact Plugin Updates

These plugins have schema changes — they write to entirely different databases with new Type columns and relations.

### Task 7: Update P10 Client Health Dashboard (Health Scores -> Companies)

The most fundamental change: P10 stops writing to its own "Health Scores" DB and instead writes health properties directly to the Companies DB.

**Files:**
- Modify: `founder-os-client-health-dashboard/skills/client-health-scoring/SKILL.md`
- Modify: `founder-os-client-health-dashboard/commands/client-health-scan.md`
- Modify: `founder-os-client-health-dashboard/commands/client-health-report.md`
- Modify: `founder-os-client-health-dashboard/tests/integration-test-plan.md`
- Modify: `founder-os-client-health-dashboard/INSTALL.md`
- Modify: `founder-os-client-health-dashboard/README.md`

**Step 1: Update SKILL.md**

In `client-health-scoring/SKILL.md`:
- Replace all references to "Client Health Dashboard - Health Scores" database with "Founder OS HQ - Companies" (or "Companies")
- Change the DB discovery section: instead of searching for a dedicated health scores DB, search for the Companies DB
- Change the write logic: instead of creating a new page in the Health Scores DB, UPDATE an existing Companies page with the health properties (Health Score, Health Status, Risk Flags, Last Scanned, Notes)
- Keep the 24h cache TTL logic but use the "Last Scanned" property on Companies
- Add fallback: if "Founder OS HQ - Companies" not found, try "Companies", then fall back to creating "Client Health Dashboard - Health Scores" (backward compat)

**Step 2: Update commands**

In `commands/client-health-scan.md`:
- Update the Notion DB section to reference Companies DB
- Change "creates pages in Health Scores DB" to "updates Companies pages"
- Remove lazy DB creation instructions (Companies is pre-created)
- Add fallback note for non-HQ users

In `commands/client-health-report.md`:
- Update DB reads to query Companies DB with Health Status filter

**Step 3: Update tests and docs**

In `tests/integration-test-plan.md`:
- Update test cases that verify lazy DB creation — now verify Companies DB discovery
- Update test cases that verify page creation — now verify page UPDATE on Companies
- Add test case: verify fallback to standalone Health Scores DB

In `INSTALL.md` and `README.md`:
- Update to mention Founder OS HQ template (recommended) or standalone mode (fallback)

**Step 4: Commit**

```bash
git add founder-os-client-health-dashboard/
git commit -m "feat(P10): write health scores to Companies DB instead of standalone Health Scores DB"
```

---

### Task 8: Update P20 Client Context Loader (Dossiers -> Companies)

Similar to P10 — P20 stops writing to "Client Dossiers" DB and instead writes dossier properties to Companies DB.

**Files:**
- Modify: `founder-os-client-context-loader/skills/client-context/SKILL.md`
- Modify: `founder-os-client-context-loader/skills/relationship-summary/SKILL.md`
- Modify: `founder-os-client-context-loader/teams/agents/context-lead.md`
- Modify: `founder-os-client-context-loader/commands/load-client.md`
- Modify: `founder-os-client-context-loader/commands/client-brief.md`
- Modify: `founder-os-client-context-loader/tests/integration-test-plan.md`
- Modify: `founder-os-client-context-loader/INSTALL.md`
- Modify: `founder-os-client-context-loader/README.md`

**Step 1: Update client-context SKILL.md**

- Replace "Client Dossiers" DB references with Companies DB
- Change write logic: update Companies page with Dossier (rich_text), Dossier Completeness, Dossier Generated At, Dossier Stale properties
- Keep 24h TTL logic using Dossier Generated At + Dossier Stale fields on Companies
- CRM enrichment writeback (health score, risk level) now goes to the SAME Companies page
- Add fallback: if Companies DB not found, fall back to creating "Client Dossiers" DB

**Step 2: Update context-lead agent**

In `teams/agents/context-lead.md`:
- Update output target from Client Dossiers DB to Companies DB
- Change "create page" to "update page"

**Step 3: Update commands, tests, docs**

Same pattern as Task 7 — update DB references, remove lazy creation, add fallback.

**Step 4: Commit**

```bash
git add founder-os-client-context-loader/
git commit -m "feat(P20): write dossiers to Companies DB instead of standalone Client Dossiers DB"
```

---

### Task 9: Update P01 Inbox Zero (Action Items -> Tasks, Drafts -> Content)

P01 splits across two consolidated DBs.

**Files:**
- Modify: `founder-os-inbox-zero/teams/agents/action-agent.md`
- Modify: `founder-os-inbox-zero/teams/agents/response-agent.md`
- Modify: `founder-os-inbox-zero/skills/action-extraction/SKILL.md`
- Modify: `founder-os-inbox-zero/skills/response-drafting/SKILL.md`
- Modify: `founder-os-inbox-zero/commands/inbox-triage.md`
- Modify: `founder-os-inbox-zero/commands/inbox-drafts-approved.md`
- Modify: `founder-os-inbox-zero/tests/integration-test-plan.md`
- Modify: `founder-os-inbox-zero/INSTALL.md`
- Modify: `founder-os-inbox-zero/README.md`

**Step 1: Update action-agent and action-extraction skill**

- Replace "Inbox Zero - Action Items" with "Founder OS HQ - Tasks" (or "Tasks")
- Add Type="Email Task" and Source Plugin="Inbox Zero" to every page creation
- Add Company/Contact relation population when email domain maps to a CRM client
- Remove lazy DB creation; add fallback to "Inbox Zero - Action Items"

**Step 2: Update response-agent and response-drafting skill**

- Replace "Inbox Zero - Drafts" with "Founder OS HQ - Content" (or "Content")
- Add Type="Email Draft" and Source Plugin="Inbox Zero" to every page creation
- Status values map: To Review -> To Review, Approved -> Approved, Sent to Gmail -> Sent to Gmail (unchanged, already in Content DB schema)
- Remove lazy DB creation; add fallback

**Step 3: Update commands, tests, docs**

- `inbox-triage.md`: update DB references for both Tasks and Content
- `inbox-drafts-approved.md`: update to query Content DB with Type="Email Draft" filter
- Tests: update all DB name assertions, add Type column verification
- INSTALL/README: mention HQ template

**Step 4: Commit**

```bash
git add founder-os-inbox-zero/
git commit -m "feat(P01): write to consolidated Tasks and Content DBs"
```

---

### Task 10: Update P04 Action Item Extractor (Tasks -> Tasks)

**Files:**
- Modify: `founder-os-action-item-extractor/skills/action-extraction/SKILL.md`
- Modify: `founder-os-action-item-extractor/commands/actions-extract.md`
- Modify: `founder-os-action-item-extractor/commands/actions-extract-file.md`
- Modify: `founder-os-action-item-extractor/tests/integration-test-plan.md`
- Modify: `founder-os-action-item-extractor/INSTALL.md`
- Modify: `founder-os-action-item-extractor/README.md`

**Step 1: Update SKILL.md**

- Replace "Action Item Extractor - Tasks" with "Founder OS HQ - Tasks"
- Add Type="Action Item" and Source Plugin="Action Extractor" to page creation
- Add Company/Contact relation when owner can be matched via CRM lookup
- Remove lazy DB creation; add fallback
- Update duplicate detection: now checks across all task Types in the Tasks DB, but only deduplicates within Type="Action Item" to avoid false positives with Follow-Ups

**Step 2: Update commands**

Both `actions-extract.md` and `actions-extract-file.md`:
- Update DB name references
- Remove lazy creation blocks
- Add Type column to page creation instructions

**Step 3: Update tests and docs**

**Step 4: Commit**

```bash
git add founder-os-action-item-extractor/
git commit -m "feat(P04): write to consolidated Tasks DB with Type=Action Item"
```

---

### Task 11: Update P06 Follow-Up Tracker (Follow-Ups -> Tasks)

**Files:**
- Modify: `founder-os-follow-up-tracker/skills/follow-up-detection/SKILL.md`
- Modify: `founder-os-follow-up-tracker/skills/nudge-writing/SKILL.md`
- Modify: `founder-os-follow-up-tracker/commands/followup-check.md`
- Modify: `founder-os-follow-up-tracker/commands/followup-nudge.md`
- Modify: `founder-os-follow-up-tracker/commands/followup-remind.md`
- Modify: `founder-os-follow-up-tracker/tests/integration-test-plan.md`
- Modify: `founder-os-follow-up-tracker/INSTALL.md`
- Modify: `founder-os-follow-up-tracker/README.md`

**Step 1: Update follow-up-detection SKILL.md**

- Replace "Follow-Up Tracker - Follow-Ups" with "Founder OS HQ - Tasks"
- Add Type="Follow-Up" and Source Plugin="Follow-Up Tracker" to page creation
- Map existing fields: Thread ID, Subject -> Title, Recipient -> Contact relation, Days Waiting, Promise Type, Nudge Count, Last Nudge Date
- Status mapping: the follow-up "Status" values (Pending, Nudged, Resolved, Ignored) map to Tasks Status via: Pending -> Waiting, Nudged -> Waiting, Resolved -> Done, Ignored -> Done
- Add Company relation when recipient domain matches CRM
- Query filter: when reading follow-ups, always filter by Type="Follow-Up"
- Remove lazy DB creation; add fallback

**Step 2: Update nudge-writing SKILL.md**

- Update DB read references to Tasks DB with Type="Follow-Up" filter

**Step 3: Update commands, tests, docs**

**Step 4: Commit**

```bash
git add founder-os-follow-up-tracker/
git commit -m "feat(P06): write to consolidated Tasks DB with Type=Follow-Up"
```

---

### Task 12: Update P11 Invoice Processor (Invoices -> Finance)

**Files:**
- Modify: `founder-os-invoice-processor/skills/invoice-extraction/SKILL.md`
- Modify: `founder-os-invoice-processor/skills/expense-categorization/SKILL.md`
- Modify: `founder-os-invoice-processor/teams/agents/*.md` (5 agents)
- Modify: `founder-os-invoice-processor/commands/invoice-process.md`
- Modify: `founder-os-invoice-processor/commands/invoice-batch.md`
- Modify: `founder-os-invoice-processor/tests/integration-test-plan.md`
- Modify: `founder-os-invoice-processor/INSTALL.md`
- Modify: `founder-os-invoice-processor/README.md`

**Step 1: Update skills**

- Replace "Invoice Processor - Invoices" with "Founder OS HQ - Finance"
- Add Type="Invoice" to all page creation
- Add Company relation for vendor (match vendor name against Companies DB)
- Remove lazy DB creation; add fallback

**Step 2: Update agents**

All 5 agents that reference the Invoices DB:
- extraction-agent: output target -> Finance DB
- validation-agent: reads from Finance DB
- categorization-agent: updates Finance DB pages
- approval-agent: updates Finance DB pages
- integration-agent: creates records in Finance DB

**Step 3: Update commands, tests, docs**

**Step 4: Commit**

```bash
git add founder-os-invoice-processor/
git commit -m "feat(P11): write to consolidated Finance DB with Type=Invoice"
```

---

### Task 13: Update P16 Expense Report Builder (Reports -> Finance + reads Finance)

**Files:**
- Modify: `founder-os-expense-report-builder/skills/expense-categorization/SKILL.md`
- Modify: `founder-os-expense-report-builder/skills/expense-reporting/SKILL.md`
- Modify: `founder-os-expense-report-builder/commands/expense-report.md`
- Modify: `founder-os-expense-report-builder/commands/expense-summary.md`
- Modify: `founder-os-expense-report-builder/tests/integration-test-plan.md`
- Modify: `founder-os-expense-report-builder/INSTALL.md`
- Modify: `founder-os-expense-report-builder/README.md`

**Step 1: Update skills**

- Replace "Expense Report Builder - Reports" output DB with "Founder OS HQ - Reports" with Type="Expense Report" (note: this is the Reports DB, NOT the Finance DB — P16 generates report documents, it doesn't create invoice/expense records)
- Replace P11 data source "Invoice Processor - Invoices" with "Founder OS HQ - Finance" filtered by Type="Invoice"
- Add Company relation from invoice vendor data
- Remove lazy DB creation; add fallback

**Step 2: Update commands, tests, docs**

- expense-report.md: update both read source (Finance DB) and write target (Reports DB)
- expense-summary.md: update read source only (Finance DB)

**Step 3: Commit**

```bash
git add founder-os-expense-report-builder/
git commit -m "feat(P16): read from Finance DB, write reports to Reports DB"
```

---

### Task 14: Update P12 Proposal Automator (Proposals -> Deliverables)

**Files:**
- Modify: `founder-os-proposal-automator/skills/proposal-writing/SKILL.md`
- Modify: `founder-os-proposal-automator/skills/pricing-strategy/SKILL.md`
- Modify: `founder-os-proposal-automator/commands/proposal-create.md`
- Modify: `founder-os-proposal-automator/commands/proposal-from-brief.md`
- Modify: `founder-os-proposal-automator/tests/integration-test-plan.md`
- Modify: `founder-os-proposal-automator/INSTALL.md`
- Modify: `founder-os-proposal-automator/README.md`

**Step 1: Update skills and commands**

- Replace "Proposal Automator - Proposals" with "Founder OS HQ - Deliverables"
- Add Type="Proposal" to all page creation
- Add Company relation (from client name -> Companies DB lookup)
- Add Deal relation when proposal is associated with a deal
- Remove lazy DB creation; add fallback

**Step 2: Update tests and docs**

**Step 3: Commit**

```bash
git add founder-os-proposal-automator/
git commit -m "feat(P12): write to consolidated Deliverables DB with Type=Proposal"
```

---

### Task 15: Update P13 Contract Analyzer (Analyses -> Deliverables)

**Files:**
- Modify: `founder-os-contract-analyzer/skills/contract-analysis/SKILL.md`
- Modify: `founder-os-contract-analyzer/skills/legal-risk-detection/SKILL.md`
- Modify: `founder-os-contract-analyzer/commands/contract-analyze.md`
- Modify: `founder-os-contract-analyzer/commands/contract-compare.md`
- Modify: `founder-os-contract-analyzer/tests/integration-test-plan.md`
- Modify: `founder-os-contract-analyzer/INSTALL.md`
- Modify: `founder-os-contract-analyzer/README.md`

**Step 1: Update skills and commands**

- Replace "Contract Analyzer - Analyses" with "Founder OS HQ - Deliverables"
- Add Type="Contract" to all page creation
- Map fields: Contract Name -> Title, Risk Level maps directly, Contract Type -> Contract Type select
- Add Company relation when contract parties match CRM
- Remove lazy DB creation; add fallback

**Step 2: Update tests and docs**

**Step 3: Commit**

```bash
git add founder-os-contract-analyzer/
git commit -m "feat(P13): write to consolidated Deliverables DB with Type=Contract"
```

---

### Task 16: Update P14 SOW Generator (Output -> Deliverables)

**Files:**
- Modify: `founder-os-sow-generator/skills/scope-definition/SKILL.md`
- Modify: `founder-os-sow-generator/skills/sow-writing/SKILL.md`
- Modify: `founder-os-sow-generator/skills/risk-assessment/SKILL.md`
- Modify: `founder-os-sow-generator/teams/agents/*.md` (6 agents)
- Modify: `founder-os-sow-generator/commands/sow-generate.md`
- Modify: `founder-os-sow-generator/commands/sow-from-brief.md`
- Modify: `founder-os-sow-generator/tests/integration-test-plan.md`
- Modify: `founder-os-sow-generator/INSTALL.md`
- Modify: `founder-os-sow-generator/README.md`

**Step 1: Update skills, agents, and commands**

- Target DB: "Founder OS HQ - Deliverables" with Type="SOW"
- Add Company + Deal relations
- SOW-lead agent output goes to Deliverables DB
- Remove lazy DB creation; add fallback

**Step 2: Update tests and docs**

**Step 3: Commit**

```bash
git add founder-os-sow-generator/
git commit -m "feat(P14): write to consolidated Deliverables DB with Type=SOW"
```

---

## Phase 3: Medium-Impact Plugin Updates

DB name changes + Type column additions. These are more mechanical — same pattern repeated.

### Task 17: Update Briefings Plugins (P02, P05, P19, P22)

All four write to "Founder OS HQ - Briefings" with different Type values.

**Files (per plugin):**
- P02: `founder-os-daily-briefing-generator/` — skills, agents, commands, tests, docs
- P05: `founder-os-weekly-review-compiler/` — skills, commands, tests, docs
- P19: `founder-os-slack-digest-engine/` — skills, commands, tests, docs
- P22: `founder-os-multi-tool-morning-sync/` — skills, commands, tests, docs

**Step 1: Update P02 Daily Briefing Generator**

- Replace "Daily Briefing Generator - Briefings" with "Founder OS HQ - Briefings"
- Add Type="Daily Briefing" to page creation
- Map properties: Date, Briefing -> Content, Meeting Count, Email Count, Task Count, Overdue Tasks, Sources Used, Generated At
- Idempotent upsert key: Date + Type="Daily Briefing"
- Update briefing-lead agent output target
- Remove lazy DB creation; add fallback

**Step 2: Update P05 Weekly Review Compiler**

- Replace "Weekly Review Compiler - Reviews" with "Founder OS HQ - Briefings"
- Add Type="Weekly Review" to page creation
- Map properties: Week Ending, Executive Summary -> Content, Wins/Blockers/Carryover/Next Week as their respective fields
- Idempotent upsert key: Week Ending + Type="Weekly Review"
- Remove lazy DB creation; add fallback

**Step 3: Update P19 Slack Digest Engine**

- Replace "Slack Digest Engine - Digests" with "Founder OS HQ - Briefings"
- Add Type="Slack Digest" to page creation
- Map: Digest Title -> Title, Channel(s), Time Window, Messages Analyzed, Digest Content -> Content
- Idempotent upsert key: Date + Type="Slack Digest"
- Remove lazy DB creation; add fallback

**Step 4: Update P22 Multi-Tool Morning Sync**

- Replace "Morning Sync - Briefings" with "Founder OS HQ - Briefings"
- Add Type="Morning Sync" to page creation
- Map: existing properties align well (Email Count, Meeting Count, Task Count, Sources Used)
- Idempotent upsert key: Date + Type="Morning Sync"
- Remove lazy DB creation; add fallback

**Step 5: Commit**

```bash
git add founder-os-daily-briefing-generator/ founder-os-weekly-review-compiler/ founder-os-slack-digest-engine/ founder-os-multi-tool-morning-sync/
git commit -m "feat(P02,P05,P19,P22): write to consolidated Briefings DB with Type column"
```

---

### Task 18: Update Meetings Plugins (P03, P07)

Both write to "Founder OS HQ - Meetings" — P03 writes prep fields, P07 writes analysis fields.

**Files:**
- P03: `founder-os-meeting-prep-autopilot/` — skills, agents, commands, tests, docs
- P07: `founder-os-meeting-intelligence-hub/` — skills, commands, tests, docs

**Step 1: Update P03 Meeting Prep Autopilot**

- Replace "Meeting Prep Autopilot - Prep Notes" with "Founder OS HQ - Meetings"
- Write prep-specific fields: Prep Notes, Talking Points, Importance Score, Sources Used
- Use Event ID as idempotent key (shared with P07)
- Add Company relation when meeting is with a known client
- When P07 has already created the Meetings record (Event ID exists), UPDATE it with prep fields instead of creating new
- Remove lazy DB creation; add fallback

**Step 2: Update P07 Meeting Intelligence Hub**

- Replace "Meeting Intelligence Hub - Analyses" with "Founder OS HQ - Meetings"
- Write analysis-specific fields: Source Type, Transcript File, Summary, Decisions, Follow-Ups, Topics, Duration
- Use Event ID or (Meeting Title + Date) as idempotent key
- When P03 has already created the Meetings record, UPDATE it with analysis fields
- Add Company relation from attendee matching
- Remove lazy DB creation; add fallback

**Step 3: Update tests and docs for both**

**Step 4: Commit**

```bash
git add founder-os-meeting-prep-autopilot/ founder-os-meeting-intelligence-hub/
git commit -m "feat(P03,P07): write to consolidated Meetings DB (prep + analysis fields)"
```

---

### Task 19: Update Content Plugins (P08, P24)

P08 writes to both Research DB and Content DB. P24 writes to Content DB.

**Files:**
- P08: `founder-os-newsletter-draft-engine/` — skills, commands, tests, docs
- P24: `founder-os-linkedin-post-generator/` — skills, commands, tests, docs

**Step 1: Update P08 Newsletter Draft Engine**

- Research output: Replace "Newsletter Engine - Research" with "Founder OS HQ - Research" with Type="Newsletter Research"
- Draft output: Newsletters go to "Founder OS HQ - Content" with Type="Newsletter"
- Remove lazy DB creation; add fallback for both DBs

**Step 2: Update P24 LinkedIn Post Generator**

- Replace "LinkedIn Post Generator - Posts" with "Founder OS HQ - Content"
- Add Type="LinkedIn Post" to page creation
- Map fields: Post Topic -> Title, Post Content -> Content, Framework, Audience, Length, Hashtags, Style Notes, Output File
- Remove lazy DB creation; add fallback

**Step 3: Update tests and docs for both**

**Step 4: Commit**

```bash
git add founder-os-newsletter-draft-engine/ founder-os-linkedin-post-generator/
git commit -m "feat(P08,P24): write to consolidated Research and Content DBs"
```

---

### Task 20: Update P15 Competitive Intel (Research -> Research)

**Files:**
- Modify: `founder-os-competitive-intel-compiler/` — skills, commands, tests, docs

**Step 1: Update skills and commands**

- Replace "Competitive Intel Compiler - Research" with "Founder OS HQ - Research"
- Add Type="Competitive Analysis" to page creation
- Add Company relation (create/find company in Companies DB for each competitor)
- Remove lazy DB creation; add fallback

**Step 2: Commit**

```bash
git add founder-os-competitive-intel-compiler/
git commit -m "feat(P15): write to consolidated Research DB with Type=Competitive Analysis"
```

---

### Task 21: Update Workflow Plugins (P27, P28)

Both write to "Founder OS HQ - Workflows" with different Type values.

**Files:**
- P27: `founder-os-workflow-automator/` — skills, commands, tests, docs
- P28: `founder-os-workflow-documenter/` — skills, commands, tests, docs

**Step 1: Update P27 Workflow Automator**

- Replace "Workflow Automator - Executions" with "Founder OS HQ - Workflows"
- Add Type="Execution" to page creation
- Remove lazy DB creation; add fallback

**Step 2: Update P28 Workflow Documenter**

- Replace "Workflow Documenter - SOPs" with "Founder OS HQ - Workflows"
- Add Type="SOP" to page creation
- Remove lazy DB creation; add fallback

**Step 3: Commit**

```bash
git add founder-os-workflow-automator/ founder-os-workflow-documenter/
git commit -m "feat(P27,P28): write to consolidated Workflows DB with Type column"
```

---

## Phase 4: Low-Impact Plugin Updates

### Task 22: Update P09, P23, P25 (Reports + Knowledge Base)

**Files:**
- P09: `founder-os-report-generator/` — skills, agents, commands, tests, docs
- P23: `founder-os-knowledge-base-qa/` — skills, commands, tests, docs
- P25: `founder-os-time-savings-calculator/` — skills, commands, tests, docs

**Step 1: Update P09 Report Generator**

- Replace "Report Generator - Reports" with "Founder OS HQ - Reports"
- Add Type="Business Report" to page creation
- Remove lazy DB creation; add fallback

**Step 2: Update P23 Knowledge Base Q&A**

- Merge "Knowledge Base Q&A - Sources" and "Knowledge Base Q&A - Queries" into single "Founder OS HQ - Knowledge Base"
- Sources get Type="Source", Queries get Type="Query"
- Update /kb:index to write Type="Source"
- Update /kb:ask to write Type="Query"
- Update /kb:find to read with appropriate Type filters
- Remove lazy DB creation for both old DBs; add fallback

**Step 3: Update P25 Time Savings Calculator**

- Replace "Time Savings Calculator - Reports" with "Founder OS HQ - Reports" with Type="ROI Report"
- **Critical change:** P25's cross-plugin scanning logic currently searches 24 separate DB names. Update the scan list to use consolidated DB names:
  - "Inbox Zero - Action Items" -> "Founder OS HQ - Tasks" (filter Type="Email Task")
  - "Action Item Extractor - Tasks" -> "Founder OS HQ - Tasks" (filter Type="Action Item")
  - "Follow-Up Tracker - Follow-Ups" -> "Founder OS HQ - Tasks" (filter Type="Follow-Up")
  - And so on for all 24 categories
- Update `config/task-estimates.json` if it references old DB names
- Add fallback: try consolidated names first, then old names
- Remove lazy DB creation; add fallback

**Step 4: Commit**

```bash
git add founder-os-report-generator/ founder-os-knowledge-base-qa/ founder-os-time-savings-calculator/
git commit -m "feat(P09,P23,P25): write to consolidated Reports and Knowledge Base DBs"
```

---

### Task 23: Update Remaining Low-Impact Plugins (P17, P18, P21, P26, P29, P30)

These plugins either have no DB changes or just need minor name standardization.

**Step 1: P17 Notion Command Center**

No changes needed — operates directly on user workspace, no plugin-specific DB.

**Step 2: P18 Google Drive Brain**

- Update "Google Drive Brain - Activity" to "Founder OS HQ - Activity Log" in skills, commands, tests, docs
- Add fallback to old name

**Step 3: P21 CRM Sync Hub**

- "CRM Pro - Communications" already aligns with the HQ Communications DB. Verify the DB discovery name includes "Founder OS HQ - Communications" as an accepted alias.
- Minor: add "Founder OS HQ - Communications" to the discovery search list in `skills/crm-sync/SKILL.md`

**Step 4: P26 Team Prompt Library**

- Update "Team Prompt Library - Prompts" to "Founder OS HQ - Prompts" in skills, commands, tests, docs
- Add fallback to old name

**Step 5: P29 Learning Log Tracker**

- Update "Learning Log Tracker - Learnings" to "Founder OS HQ - Learnings"
- Update "Learning Log Tracker - Weekly Insights" to "Founder OS HQ - Weekly Insights"
- Add fallback to old names

**Step 6: P30 Goal Progress Tracker**

- Update "Goal Progress Tracker - Goals" to "Founder OS HQ - Goals"
- Update "Goal Progress Tracker - Milestones" to "Founder OS HQ - Milestones"
- Add fallback to old names

**Step 7: Commit**

```bash
git add founder-os-google-drive-brain/ founder-os-crm-sync-hub/ founder-os-team-prompt-library/ founder-os-learning-log-tracker/ founder-os-goal-progress-tracker/
git commit -m "feat(P18,P21,P26,P29,P30): standardize DB names to Founder OS HQ prefix"
```

---

## Phase 5: Command Center Dashboard & Documentation

### Task 24: Create Command Center Dashboard Specification

**Files:**
- Create: `_infrastructure/notion-hq/command-center-dashboard.md`

**Step 1: Write the dashboard specification**

Document the 8 linked database views from design doc Section 6:
1. Today's Priorities — Tasks DB, filter: Due Today OR Overdue, Status != Done, sort Priority asc
2. Client Health — Companies DB, filter: Health Status in (Yellow, Red), sort Health Score asc
3. Upcoming Meetings — Meetings DB, filter: Date in next 48h, sort Date asc
4. Recent Activity — Communications DB, filter: Date > 7 days ago, sort Date desc
5. Pipeline — Deals DB, filter: Stage not in (Closed Won, Closed Lost), board view by Stage
6. Open Follow-Ups — Tasks DB, filter: Type="Follow-Up" AND Status="Waiting", sort Days Waiting desc
7. Active Goals — Goals DB, filter: Status="In Progress", table with progress column
8. Latest Briefing — Briefings DB, filter: most recent, single card view

Each widget spec includes: title, source DB, filter expression, sort, view type, visible columns.

**Step 2: Commit**

```bash
git add _infrastructure/notion-hq/
git commit -m "docs(hq): add Command Center dashboard specification"
```

---

### Task 25: Create Workspace Setup & Installation Guide

**Files:**
- Create: `_infrastructure/notion-hq/INSTALL.md`
- Create: `_infrastructure/notion-hq/MIGRATION.md`

**Step 1: Write INSTALL.md**

For new users:
1. Duplicate the Founder OS HQ template (link TBD)
2. Verify all 18 databases were created
3. Configure MCP servers (Notion API key)
4. Install desired plugins
5. Test with `/notion:query "Show all databases"`

**Step 2: Write MIGRATION.md**

For existing users with old plugin DBs:
1. Install the HQ template alongside existing DBs
2. Plugins with fallback will auto-detect consolidated DBs
3. Optional: manually copy records from old DBs to consolidated DBs
4. Archive old plugin-specific DBs once satisfied

**Step 3: Commit**

```bash
git add _infrastructure/notion-hq/
git commit -m "docs(hq): add installation and migration guides"
```

---

### Task 26: Update CLAUDE.md with HQ Architecture

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md**

Add a new section "Notion HQ Template" after the existing "Conventions" section:
- Workspace structure overview (5 sections, 18 DBs)
- DB discovery convention: search "Founder OS HQ - [Name]" first, fall back to plugin-specific name
- Type column convention: every merged DB requires Type value on write
- Company relation convention: populate when client context available
- Link to design doc and dashboard spec

Update each plugin's reference implementation entry to note the new target DB names.

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with Notion HQ architecture and conventions"
```

---

## Phase 6: Template Packaging

### Task 27: Create the Consolidated Template JSON

**Files:**
- Create: `_infrastructure/notion-hq/founder-os-hq-template.json`

**Step 1: Assemble the master template**

Combine all `hq-*.json` templates plus unchanged plugin templates into a single comprehensive JSON file. Structure:

```json
{
  "name": "Founder OS HQ",
  "version": "1.0.0",
  "workspace": {
    "pages": [
      { "title": "Founder OS HQ", "icon": "rocket", "children": [...] }
    ]
  },
  "databases": { ... all 18 DB schemas ... },
  "relations": { ... all cross-DB relations ... },
  "dashboard": { ... Command Center view definitions ... }
}
```

This is the single artifact that represents the entire Notion workspace template.

**Step 2: Commit**

```bash
git add _infrastructure/notion-hq/founder-os-hq-template.json
git commit -m "feat(hq): assemble master Notion HQ workspace template"
```

---

### Task 28: Final Validation Pass

**Step 1: Verify all plugin DB references are updated**

Search across all plugin directories for old DB names that should have been updated:

```bash
# Should return no results (or only fallback references):
grep -r "Inbox Zero - Action Items" founder-os-*/skills/ founder-os-*/commands/
grep -r "Action Item Extractor - Tasks" founder-os-*/skills/ founder-os-*/commands/
grep -r "Follow-Up Tracker - Follow-Ups" founder-os-*/skills/ founder-os-*/commands/
# ... repeat for all old DB names
```

**Step 2: Verify all merged DBs have Type column instructions**

```bash
grep -r "Type=" founder-os-*/skills/ founder-os-*/commands/ | grep -c "Type="
# Should find Type= references in all plugins that write to merged DBs
```

**Step 3: Verify Company relation instructions exist**

```bash
grep -r "Company.*relation\|relation.*Companies" founder-os-*/skills/ | head -20
# Should find Company relation references in client-facing plugins
```

**Step 4: Fix any gaps found**

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix(hq): address validation gaps in plugin DB references"
```

---

## Summary

| Phase | Tasks | Plugins Touched | Estimated Scope |
|-------|-------|-----------------|-----------------|
| 1. Template Foundation | Tasks 1-6 | 0 (infrastructure only) | 11 new JSON files + 1 manifest |
| 2. High-Impact Updates | Tasks 7-16 | P01, P04, P06, P10, P11, P12, P13, P14, P16, P20 | ~60 files modified |
| 3. Medium-Impact Updates | Tasks 17-21 | P02, P03, P05, P07, P08, P15, P19, P22, P24, P27, P28 | ~55 files modified |
| 4. Low-Impact Updates | Tasks 22-23 | P09, P17, P18, P21, P23, P25, P26, P29, P30 | ~30 files modified |
| 5. Dashboard & Docs | Tasks 24-26 | 0 (docs only) | 4 new files + CLAUDE.md update |
| 6. Template Packaging | Tasks 27-28 | All (validation) | 1 master template + validation |

**Parallelization notes:**
- Tasks 1-5 (Phase 1) can be parallelized — each creates independent template files
- Tasks 7-16 (Phase 2) can be parallelized — each updates a different plugin
- Tasks 17-21 (Phase 3) can be parallelized — each updates different plugins
- Phase 2 depends on Phase 1 (templates must exist as reference)
- Phase 4-6 depend on Phase 2-3 (plugins must be updated before validation)
