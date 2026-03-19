# AIOS Enrichment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich Founder OS with 3 AIOS-inspired capabilities: context files, automation audit scorecard, and `--schedule` flag on 9 plugins.

**Architecture:** Three sequential phases building shared infrastructure skills under `_infrastructure/`. Phase 1 establishes the infrastructure-command pattern, Phase 2 follows it for audit, Phase 3 bridges plugin commands to P27 scheduling. No new plugins — all infrastructure-level.

**Tech Stack:** Markdown command files, JSON registry, P27 YAML workflow templates, .gitignore additions

**Spec:** `docs/superpowers/specs/2026-03-11-aios-enrichment-design.md`

---

## Chunk 1: Phase 1 — Context Files Infrastructure

### Task 1: Create context file templates

**Files:**
- Create: `_infrastructure/context/templates/business-info.md`
- Create: `_infrastructure/context/templates/strategy.md`
- Create: `_infrastructure/context/templates/current-data.md`
- Create: `_infrastructure/context/active/.gitkeep`

- [ ] **Step 1: Create business-info template**

```markdown
# Business Information

## Company Overview
- **Company Name:**
- **What we do:** (one-sentence description)
- **Founded:** (year)
- **Location(s):**

## Business Model
- **Revenue model:** (SaaS, services, products, etc.)
- **Typical deal size:**
- **Sales cycle length:**

## Clients & Verticals
- **Target market:** (SMB, mid-market, enterprise)
- **Primary verticals:** (list 2-5 industries)
- **Total active clients:**

## Team
- **Team size:** (FTEs + contractors)
- **Key roles:** (list team members and their functions)

## Tools & Stack
- **Project management:**
- **CRM:**
- **Communication:** (Slack, email, etc.)
- **File storage:**
- **Accounting/invoicing:**
- **Other key tools:**
```

Write to `_infrastructure/context/templates/business-info.md`.

- [ ] **Step 2: Create strategy template**

```markdown
# Current Strategy

## This Quarter's Priorities
1.
2.
3.

## Key Constraints
- **Budget:**
- **Timeline pressures:**
- **Resource limitations:**

## Opportunities
-

## Key Decisions Pending
-

## What Success Looks Like This Quarter
-
```

Write to `_infrastructure/context/templates/strategy.md`.

- [ ] **Step 3: Create current-data template**

```markdown
# Current Data

## Active Clients
| Client | Status | Key Contact | Notes |
|--------|--------|-------------|-------|
| | | | |

## Key Metrics
- **Monthly revenue:**
- **Active projects:**
- **Pipeline value:**
- **Team utilization:**

## Notion Database IDs
- **Companies DB:** (page ID or "not configured")
- **Tasks DB:** (page ID or "not configured")
- **Other key DBs:**

## Recent Changes
- (notable changes since last update)

## Last Updated
- **Date:**
```

Write to `_infrastructure/context/templates/current-data.md`.

- [ ] **Step 4: Create active directory with .gitkeep**

Create empty file at `_infrastructure/context/active/.gitkeep`.

- [ ] **Step 5: Create import directory for document-based setup**

Create empty file at `_infrastructure/context/import/.gitkeep`. This directory is used by `/context:setup --from-files` to import business documents.

- [ ] **Step 6: Add active/ to .gitignore**

Add to `.gitignore`:
```
# Business context files (sensitive)
_infrastructure/context/active/*.md
```

Keep `.gitkeep` tracked (the glob only matches .md files).

- [ ] **Step 7: Commit**

```bash
git add _infrastructure/context/templates/ _infrastructure/context/active/.gitkeep _infrastructure/context/import/.gitkeep .gitignore
git commit -m "feat(context): add business context file templates, active and import directories"
```

---

### Task 2: Create context SKILL.md reference doc

**Files:**
- Create: `_infrastructure/context/SKILL.md`

- [ ] **Step 1: Write the SKILL.md**

```markdown
---
name: business-context
description: "Loads structured business context files into plugin execution context. Activates at the start of any plugin command to provide business knowledge, current strategy, and operational data. Plugins inline the loading logic directly (same pattern as gws CLI usage)."
---

## Overview

Founder OS plugins can load structured business context files to personalize their output. Context files live at `_infrastructure/context/active/` and contain business information, current strategy, and operational data maintained by the user.

## Context Files

| File | Purpose | Update Frequency |
|------|---------|-----------------|
| `business-info.md` | Company overview, team, tools, clients | Quarterly or when business changes |
| `strategy.md` | Current priorities, constraints, opportunities | Monthly or at quarter boundaries |
| `current-data.md` | Active clients, key metrics, Notion DB IDs | Weekly or as data changes |

## Loading Pattern (for plugin command files)

Add this section near the top of any plugin command, AFTER skill loading but BEFORE main logic:

~~~markdown
## Step 0: Business Context
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read:
- `_infrastructure/context/active/business-info.md`
- `_infrastructure/context/active/strategy.md`
- `_infrastructure/context/active/current-data.md`
Inject their contents into your working memory for this execution. Use this context to personalize output (e.g., prioritize known VIP clients, use correct company terminology, align recommendations with current strategy).
If files don't exist or directory is empty, skip silently and proceed without business context (graceful degradation).
~~~

## How Context Improves Plugin Output

- **P01 Inbox Zero**: Knows which clients are VIP, prioritizes their emails
- **P02 Daily Briefing**: Aligns briefing sections with current strategic priorities
- **P10 Client Health**: Uses active client list instead of requiring manual input
- **P12 Proposal Automator**: Pre-fills company info, aligns with current positioning
- **P20 Client Context**: Cross-references with known client data

## Setup

Run `/context:setup` to create context files via guided interview. Or copy templates from `_infrastructure/context/templates/` to `_infrastructure/context/active/` and fill them in manually.

## Relationship to Memory Engine

These context files are Phase 0 of the Founder OS Memory Engine (spec: `docs/superpowers/specs/2026-03-11-memory-engine-design.md`). When the full Memory Engine ships (SQLite+HNSW), it will:
1. Read these files as seed data on first run
2. The memory context-injection skill will supersede this simple file-loading approach
3. Context files can continue to exist as a human-editable layer alongside the database
```

Write to `_infrastructure/context/SKILL.md`.

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/context/SKILL.md
git commit -m "feat(context): add business-context SKILL.md reference documentation"
```

---

### Task 3: Create /context:setup command

**Files:**
- Create: `_infrastructure/context/commands/context-setup.md`

- [ ] **Step 1: Write the command file**

```markdown
---
description: Set up business context files through a guided conversational interview
argument-hint: "[--from-files] [--reset]"
allowed-tools: ["Read", "Write", "AskUserQuestion", "Glob"]
---

# /context:setup

Create or update the 3 business context files that personalize all Founder OS plugins.

## Parse Arguments

- `--from-files` (optional) — Import context from existing documents (business plans, pitch decks, etc.) found in `_infrastructure/context/import/` directory
- `--reset` (optional) — Delete existing context files and start fresh

## Prerequisites

Check if context files already exist at `_infrastructure/context/active/`:
- If they exist and `--reset` is NOT set: inform user that files exist, offer to update specific sections or `--reset` to start over
- If `--reset`: delete existing .md files in active/, proceed with fresh interview

## Workflow

### Step 1: Check for importable documents

If `--from-files` is set:
1. Scan `_infrastructure/context/import/` for any documents (.md, .txt, .pdf, .docx)
2. Read and analyze each document
3. Extract relevant business information to pre-fill the interview
4. Inform user: "Found [N] documents. I'll use these to pre-fill your context. You can correct anything during the interview."

### Step 2: Business Information Interview

Ask the user conversationally about their business. Use AskUserQuestion for each topic, one at a time:

1. "What's your company name and what do you do? (one sentence)"
2. "What's your business model? (SaaS, services, consulting, products, etc.)"
3. "Who are your typical clients? (industry, size, any key names)"
4. "How big is your team? (list key roles if small team)"
5. "What tools do you use daily? (project mgmt, CRM, comms, etc.)"

Generate `_infrastructure/context/active/business-info.md` from the template at `_infrastructure/context/templates/business-info.md`, filled with their answers.

### Step 3: Strategy Interview

1. "What are your top 3 priorities this quarter?"
2. "Any constraints I should know about? (budget, timeline, resources)"
3. "What does success look like for you this quarter?"

Generate `_infrastructure/context/active/strategy.md` from the template.

### Step 4: Current Data Interview

1. "Who are your active clients right now? (name as many as you'd like)"
2. "Any key metrics you track? (revenue, pipeline, projects, etc.)"
3. "Have you set up any Notion databases for Founder OS yet? (I can auto-detect these)"

If user mentions Notion, attempt to query for [FOS] databases and populate Notion DB IDs automatically.

Generate `_infrastructure/context/active/current-data.md` from the template.

### Step 5: Confirmation

Display summary:
```
Context files created:
  _infrastructure/context/active/business-info.md
  _infrastructure/context/active/strategy.md
  _infrastructure/context/active/current-data.md

These files are gitignored (they contain business-sensitive data).
All 30 Founder OS plugins will now use this context to personalize their output.

To update later: edit the files directly, or re-run /context:setup --reset
```

## Graceful Degradation

- If user declines to answer a question: leave that section as "[Not provided]" in the generated file
- If Notion query fails: skip DB ID population, note as "not configured"
- If no import documents found with `--from-files`: proceed with normal interview
```

Write to `_infrastructure/context/commands/context-setup.md`.

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/context/commands/context-setup.md
git commit -m "feat(context): add /context:setup interactive interview command"
```

---

### Task 4: Register infrastructure commands in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add Infrastructure Commands section to CLAUDE.md**

Find the `## Conventions` section in CLAUDE.md. Insert a new section BEFORE it:

```markdown
## Infrastructure Commands

Shared commands that live outside plugins, under `_infrastructure/`. Discovered via this section (not via plugin manifests).

| Command | File | Description |
|---------|------|-------------|
| `/context:setup` | `_infrastructure/context/commands/context-setup.md` | Set up business context files via guided interview |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "feat(context): register /context:setup as infrastructure command in CLAUDE.md"
```

---

### Task 5: Add context loading to all 30 plugin commands

**Files:**
- Modify: All 81 command files under `founder-os-*/commands/*.md`

This is a bulk operation. For each command file, insert the "Step 0: Business Context" block after skill loading but before the main logic section.

- [ ] **Step 1: Identify insertion point pattern**

Read 3 representative command files to identify the common pattern:
- `founder-os-inbox-zero/commands/inbox-triage.md`
- `founder-os-daily-briefing-generator/commands/daily-briefing.md`
- `founder-os-report-generator/commands/report-generate.md`

Look for where "## Load Skills" or "## Prerequisites" sections end and main workflow begins. The context block goes between them.

- [ ] **Step 2: Define the standard block to insert**

**Important:** Adapt the block to each file's existing structure. If a command starts at "Step 1", add the context block as a standalone section (don't renumber existing steps). If a command has a "Prerequisites" section, place the context block after it. Some commands may have unusual layouts — read each file before inserting.

The text to add:

```markdown
## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.
```

- [ ] **Step 3: Add context block to Pillar 1 plugins (P01-P08)**

Add the block to all command files in:
- `founder-os-inbox-zero/commands/` (2 files)
- `founder-os-daily-briefing-generator/commands/` (2 files)
- `founder-os-meeting-prep-autopilot/commands/` (2 files)
- `founder-os-action-item-extractor/commands/` (2 files)
- `founder-os-weekly-review-compiler/commands/` (1 file)
- `founder-os-follow-up-tracker/commands/` (3 files)
- `founder-os-meeting-intelligence-hub/commands/` (2 files)
- `founder-os-newsletter-draft-engine/commands/` (4 files)

Total: 18 files.

- [ ] **Step 4: Commit Pillar 1**

```bash
git add founder-os-inbox-zero/ founder-os-daily-briefing-generator/ founder-os-meeting-prep-autopilot/ founder-os-action-item-extractor/ founder-os-weekly-review-compiler/ founder-os-follow-up-tracker/ founder-os-meeting-intelligence-hub/ founder-os-newsletter-draft-engine/
git commit -m "feat(context): add business context loading to Pillar 1 plugin commands"
```

- [ ] **Step 5: Add context block to Pillar 2 plugins (P09-P16)**

Add the block to all command files in:
- `founder-os-report-generator/commands/` (2 files)
- `founder-os-client-health-dashboard/commands/` (2 files)
- `founder-os-invoice-processor/commands/` (2 files)
- `founder-os-proposal-automator/commands/` (2 files)
- `founder-os-contract-analyzer/commands/` (2 files)
- `founder-os-sow-generator/commands/` (2 files)
- `founder-os-competitive-intel-compiler/commands/` (2 files)
- `founder-os-expense-report-builder/commands/` (2 files)

Total: 16 files.

- [ ] **Step 6: Commit Pillar 2**

```bash
git add founder-os-report-generator/ founder-os-client-health-dashboard/ founder-os-invoice-processor/ founder-os-proposal-automator/ founder-os-contract-analyzer/ founder-os-sow-generator/ founder-os-competitive-intel-compiler/ founder-os-expense-report-builder/
git commit -m "feat(context): add business context loading to Pillar 2 plugin commands"
```

- [ ] **Step 7: Add context block to Pillar 3 plugins (P17-P24)**

Add the block to all command files in:
- `founder-os-notion-command-center/commands/` (4 files)
- `founder-os-google-drive-brain/commands/` (4 files)
- `founder-os-slack-digest-engine/commands/` (2 files)
- `founder-os-client-context-loader/commands/` (2 files)
- `founder-os-crm-sync-hub/commands/` (3 files)
- `founder-os-multi-tool-morning-sync/commands/` (2 files)
- `founder-os-knowledge-base-qa/commands/` (3 files)
- `founder-os-linkedin-post-generator/commands/` (3 files)

Total: 23 files.

- [ ] **Step 8: Commit Pillar 3**

```bash
git add founder-os-notion-command-center/ founder-os-google-drive-brain/ founder-os-slack-digest-engine/ founder-os-client-context-loader/ founder-os-crm-sync-hub/ founder-os-multi-tool-morning-sync/ founder-os-knowledge-base-qa/ founder-os-linkedin-post-generator/
git commit -m "feat(context): add business context loading to Pillar 3 plugin commands"
```

- [ ] **Step 9: Add context block to Pillar 4 plugins (P25-P30)**

Add the block to all command files in:
- `founder-os-time-savings-calculator/commands/` (4 files)
- `founder-os-team-prompt-library/commands/` (5 files)
- `founder-os-workflow-automator/commands/` (6 files)
- `founder-os-workflow-documenter/commands/` (2 files)
- `founder-os-learning-log-tracker/commands/` (3 files)
- `founder-os-goal-progress-tracker/commands/` (5 files: goal-check, goal-close, goal-create, goal-report, goal-update)

Total: 25 files.

- [ ] **Step 10: Commit Pillar 4**

```bash
git add founder-os-time-savings-calculator/ founder-os-team-prompt-library/ founder-os-workflow-automator/ founder-os-workflow-documenter/ founder-os-learning-log-tracker/ founder-os-goal-progress-tracker/
git commit -m "feat(context): add business context loading to Pillar 4 plugin commands"
```

---

## Chunk 2: Phase 2 — Automation Audit Infrastructure

### Task 6: Create audit registry JSON

**Files:**
- Create: `_infrastructure/automation-audit/schema/audit-registry.json`

- [ ] **Step 1: Write the registry**

The registry maps all 30 plugins to business areas with detection info and coverage weights. Structure:

```json
{
  "version": "1.0.0",
  "business_areas": [
    "Operations", "Finance", "Sales/CRM", "Marketing",
    "Content", "HR/People", "Client Delivery", "Product/Dev", "Admin"
  ],
  "plugins": [
    {
      "id": "P01",
      "name": "Inbox Zero",
      "directory": "founder-os-inbox-zero",
      "areas": ["Operations"],
      "automates": ["Email triage and prioritization", "Draft reply generation", "Action item extraction from emails"],
      "detection": {
        "directory": "founder-os-inbox-zero/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Tasks",
        "notion_type": "Email Task"
      },
      "coverage_weight": { "Operations": 15 }
    },
    {
      "id": "P02",
      "name": "Daily Briefing",
      "directory": "founder-os-daily-briefing-generator",
      "areas": ["Operations"],
      "automates": ["Morning briefing synthesis from email, calendar, and Notion"],
      "detection": {
        "directory": "founder-os-daily-briefing-generator/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Briefings",
        "notion_type": "Daily Briefing"
      },
      "coverage_weight": { "Operations": 10 }
    },
    {
      "id": "P03",
      "name": "Meeting Prep",
      "directory": "founder-os-meeting-prep-autopilot",
      "areas": ["Operations", "Client Delivery"],
      "automates": ["Pre-meeting research and preparation notes"],
      "detection": {
        "directory": "founder-os-meeting-prep-autopilot/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Meetings"
      },
      "coverage_weight": { "Operations": 10, "Client Delivery": 5 }
    },
    {
      "id": "P04",
      "name": "Action Items",
      "directory": "founder-os-action-item-extractor",
      "areas": ["Operations"],
      "automates": ["Extract action items from meeting notes and documents"],
      "detection": {
        "directory": "founder-os-action-item-extractor/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Tasks",
        "notion_type": "Action Item"
      },
      "coverage_weight": { "Operations": 10 }
    },
    {
      "id": "P05",
      "name": "Weekly Review",
      "directory": "founder-os-weekly-review-compiler",
      "areas": ["Operations", "Admin"],
      "automates": ["Weekly review compilation from all data sources"],
      "detection": {
        "directory": "founder-os-weekly-review-compiler/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Briefings",
        "notion_type": "Weekly Review"
      },
      "coverage_weight": { "Operations": 10, "Admin": 5 }
    },
    {
      "id": "P06",
      "name": "Follow-Up Tracker",
      "directory": "founder-os-follow-up-tracker",
      "areas": ["Operations", "Sales/CRM"],
      "automates": ["Follow-up detection and reminders from email threads"],
      "detection": {
        "directory": "founder-os-follow-up-tracker/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Tasks",
        "notion_type": "Follow-Up"
      },
      "coverage_weight": { "Operations": 10, "Sales/CRM": 10 }
    },
    {
      "id": "P07",
      "name": "Meeting Intel",
      "directory": "founder-os-meeting-intelligence-hub",
      "areas": ["Operations", "Client Delivery"],
      "automates": ["Meeting transcript analysis and intelligence extraction"],
      "detection": {
        "directory": "founder-os-meeting-intelligence-hub/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Meetings"
      },
      "coverage_weight": { "Operations": 5, "Client Delivery": 10 }
    },
    {
      "id": "P08",
      "name": "Newsletter Engine",
      "directory": "founder-os-newsletter-draft-engine",
      "areas": ["Content", "Marketing"],
      "automates": ["Newsletter research, drafting, and outline generation"],
      "detection": {
        "directory": "founder-os-newsletter-draft-engine/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Content",
        "notion_type": "Newsletter"
      },
      "coverage_weight": { "Content": 15, "Marketing": 10 }
    },
    {
      "id": "P09",
      "name": "Report Generator",
      "directory": "founder-os-report-generator",
      "areas": ["Client Delivery", "Admin"],
      "automates": ["Business report generation from templates and data"],
      "detection": {
        "directory": "founder-os-report-generator/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Reports",
        "notion_type": "Business Report"
      },
      "coverage_weight": { "Client Delivery": 15, "Admin": 5 }
    },
    {
      "id": "P10",
      "name": "Client Health",
      "directory": "founder-os-client-health-dashboard",
      "areas": ["Sales/CRM", "Client Delivery"],
      "automates": ["Client health scoring across 5 dimensions"],
      "detection": {
        "directory": "founder-os-client-health-dashboard/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Companies"
      },
      "coverage_weight": { "Sales/CRM": 15, "Client Delivery": 10 }
    },
    {
      "id": "P11",
      "name": "Invoice Processor",
      "directory": "founder-os-invoice-processor",
      "areas": ["Finance"],
      "automates": ["Invoice extraction, validation, and Notion logging"],
      "detection": {
        "directory": "founder-os-invoice-processor/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Finance",
        "notion_type": "Invoice"
      },
      "coverage_weight": { "Finance": 20 }
    },
    {
      "id": "P12",
      "name": "Proposal Automator",
      "directory": "founder-os-proposal-automator",
      "areas": ["Sales/CRM", "Client Delivery"],
      "automates": ["Proposal generation from briefs and templates"],
      "detection": {
        "directory": "founder-os-proposal-automator/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Deliverables",
        "notion_type": "Proposal"
      },
      "coverage_weight": { "Sales/CRM": 15, "Client Delivery": 10 }
    },
    {
      "id": "P13",
      "name": "Contract Analyzer",
      "directory": "founder-os-contract-analyzer",
      "areas": ["Finance", "Admin"],
      "automates": ["Contract clause analysis, risk identification, comparison"],
      "detection": {
        "directory": "founder-os-contract-analyzer/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Deliverables",
        "notion_type": "Contract"
      },
      "coverage_weight": { "Finance": 10, "Admin": 10 }
    },
    {
      "id": "P14",
      "name": "SOW Generator",
      "directory": "founder-os-sow-generator",
      "areas": ["Client Delivery"],
      "automates": ["Statement of Work generation with competing hypotheses"],
      "detection": {
        "directory": "founder-os-sow-generator/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Deliverables",
        "notion_type": "SOW"
      },
      "coverage_weight": { "Client Delivery": 15 }
    },
    {
      "id": "P15",
      "name": "Competitive Intel",
      "directory": "founder-os-competitive-intel-compiler",
      "areas": ["Marketing", "Sales/CRM"],
      "automates": ["Competitive research and comparison matrices"],
      "detection": {
        "directory": "founder-os-competitive-intel-compiler/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Research",
        "notion_type": "Competitive Analysis"
      },
      "coverage_weight": { "Marketing": 15, "Sales/CRM": 5 }
    },
    {
      "id": "P16",
      "name": "Expense Report",
      "directory": "founder-os-expense-report-builder",
      "areas": ["Finance"],
      "automates": ["Expense report compilation and categorization"],
      "detection": {
        "directory": "founder-os-expense-report-builder/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Reports",
        "notion_type": "Expense Report"
      },
      "coverage_weight": { "Finance": 15 }
    },
    {
      "id": "P17",
      "name": "Notion Command Center",
      "directory": "founder-os-notion-command-center",
      "areas": ["Admin"],
      "automates": ["Notion database CRUD operations and template management"],
      "detection": {
        "directory": "founder-os-notion-command-center/.claude-plugin/plugin.json"
      },
      "coverage_weight": { "Admin": 15 }
    },
    {
      "id": "P18",
      "name": "Drive Brain",
      "directory": "founder-os-google-drive-brain",
      "areas": ["Admin", "Operations"],
      "automates": ["Google Drive search, organization, and summarization"],
      "detection": {
        "directory": "founder-os-google-drive-brain/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Activity Log"
      },
      "coverage_weight": { "Admin": 10, "Operations": 5 }
    },
    {
      "id": "P19",
      "name": "Slack Digest",
      "directory": "founder-os-slack-digest-engine",
      "areas": ["Operations"],
      "automates": ["Slack channel digest and catch-up summaries"],
      "detection": {
        "directory": "founder-os-slack-digest-engine/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Briefings",
        "notion_type": "Slack Digest"
      },
      "coverage_weight": { "Operations": 10 }
    },
    {
      "id": "P20",
      "name": "Client Context",
      "directory": "founder-os-client-context-loader",
      "areas": ["Sales/CRM", "Client Delivery"],
      "automates": ["Client context aggregation and dossier building"],
      "detection": {
        "directory": "founder-os-client-context-loader/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Companies"
      },
      "coverage_weight": { "Sales/CRM": 10, "Client Delivery": 10 }
    },
    {
      "id": "P21",
      "name": "CRM Sync",
      "directory": "founder-os-crm-sync-hub",
      "areas": ["Sales/CRM"],
      "automates": ["Email and meeting data sync to CRM communications log"],
      "detection": {
        "directory": "founder-os-crm-sync-hub/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Communications"
      },
      "coverage_weight": { "Sales/CRM": 15 }
    },
    {
      "id": "P22",
      "name": "Morning Sync",
      "directory": "founder-os-multi-tool-morning-sync",
      "areas": ["Operations"],
      "automates": ["Multi-source morning sync from Gmail, Calendar, Notion"],
      "detection": {
        "directory": "founder-os-multi-tool-morning-sync/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Briefings",
        "notion_type": "Morning Sync"
      },
      "coverage_weight": { "Operations": 10 }
    },
    {
      "id": "P23",
      "name": "Knowledge Base",
      "directory": "founder-os-knowledge-base-qa",
      "areas": ["Admin", "Client Delivery"],
      "automates": ["Knowledge base indexing, search, and Q&A"],
      "detection": {
        "directory": "founder-os-knowledge-base-qa/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Knowledge Base"
      },
      "coverage_weight": { "Admin": 10, "Client Delivery": 5 }
    },
    {
      "id": "P24",
      "name": "LinkedIn Post",
      "directory": "founder-os-linkedin-post-generator",
      "areas": ["Content", "Marketing"],
      "automates": ["LinkedIn post generation with variations and document-based content"],
      "detection": {
        "directory": "founder-os-linkedin-post-generator/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Content",
        "notion_type": "LinkedIn Post"
      },
      "coverage_weight": { "Content": 15, "Marketing": 10 }
    },
    {
      "id": "P25",
      "name": "Time Savings",
      "directory": "founder-os-time-savings-calculator",
      "areas": ["Admin"],
      "automates": ["ROI and time savings tracking across all plugins"],
      "detection": {
        "directory": "founder-os-time-savings-calculator/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Reports",
        "notion_type": "ROI Report"
      },
      "coverage_weight": { "Admin": 10 }
    },
    {
      "id": "P26",
      "name": "Prompt Library",
      "directory": "founder-os-team-prompt-library",
      "areas": ["Admin", "Product/Dev"],
      "automates": ["Team prompt storage, sharing, and optimization"],
      "detection": {
        "directory": "founder-os-team-prompt-library/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Prompts"
      },
      "coverage_weight": { "Admin": 5, "Product/Dev": 10 }
    },
    {
      "id": "P27",
      "name": "Workflow Automator",
      "directory": "founder-os-workflow-automator",
      "areas": ["Operations", "Admin"],
      "automates": ["Workflow creation, scheduling, and execution"],
      "detection": {
        "directory": "founder-os-workflow-automator/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Workflows",
        "notion_type": "Execution"
      },
      "coverage_weight": { "Operations": 10, "Admin": 10 }
    },
    {
      "id": "P28",
      "name": "Workflow Documenter",
      "directory": "founder-os-workflow-documenter",
      "areas": ["Admin"],
      "automates": ["SOP documentation and workflow diagramming"],
      "detection": {
        "directory": "founder-os-workflow-documenter/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Workflows",
        "notion_type": "SOP"
      },
      "coverage_weight": { "Admin": 10 }
    },
    {
      "id": "P29",
      "name": "Learning Log",
      "directory": "founder-os-learning-log-tracker",
      "areas": ["Admin"],
      "automates": ["Learning capture, search, and weekly insight compilation"],
      "detection": {
        "directory": "founder-os-learning-log-tracker/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Learnings"
      },
      "coverage_weight": { "Admin": 5 }
    },
    {
      "id": "P30",
      "name": "Goal Tracker",
      "directory": "founder-os-goal-progress-tracker",
      "areas": ["Admin"],
      "automates": ["Goal creation, progress tracking, and milestone management"],
      "detection": {
        "directory": "founder-os-goal-progress-tracker/.claude-plugin/plugin.json",
        "notion_db": "[FOS] Goals"
      },
      "coverage_weight": { "Admin": 10 }
    }
  ]
}
```

Write to `_infrastructure/automation-audit/schema/audit-registry.json`.

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/automation-audit/schema/audit-registry.json
git commit -m "feat(audit): add 30-plugin audit registry with business area mapping"
```

---

### Task 7: Create task categories reference and SKILL.md

**Files:**
- Create: `_infrastructure/automation-audit/references/task-categories.md`
- Create: `_infrastructure/automation-audit/SKILL.md`

- [ ] **Step 1: Write task categories reference**

```markdown
# Business Area Task Categories

## How Coverage Scoring Works

Each business area has a total possible score of 100. Each plugin contributes a `coverage_weight` to the areas it covers. The area coverage percentage = sum of installed plugin weights / total possible weight for that area.

## Areas and Their Plugins

### Operations (total weight: 100)
| Plugin | Weight | What It Automates |
|--------|--------|-------------------|
| P01 Inbox Zero | 15 | Email triage, draft replies, action extraction |
| P02 Daily Briefing | 10 | Morning synthesis from all sources |
| P03 Meeting Prep | 10 | Pre-meeting research notes |
| P04 Action Items | 10 | Action item extraction from documents |
| P05 Weekly Review | 10 | Weekly review compilation |
| P06 Follow-Up Tracker | 10 | Follow-up detection and reminders |
| P07 Meeting Intel | 5 | Meeting transcript analysis |
| P18 Drive Brain | 5 | Drive file management |
| P19 Slack Digest | 10 | Slack channel summaries |
| P22 Morning Sync | 10 | Multi-source morning sync |
| P27 Workflow Automator | 10 | Workflow scheduling and execution |

### Finance (total weight: 45)
| Plugin | Weight | What It Automates |
|--------|--------|-------------------|
| P11 Invoice Processor | 20 | Invoice extraction and logging |
| P13 Contract Analyzer | 10 | Contract analysis and risk ID |
| P16 Expense Report | 15 | Expense compilation |

### Sales/CRM (total weight: 70)
| Plugin | Weight | What It Automates |
|--------|--------|-------------------|
| P06 Follow-Up Tracker | 10 | Follow-up reminders |
| P10 Client Health | 15 | Client health scoring |
| P12 Proposal Automator | 15 | Proposal generation |
| P15 Competitive Intel | 5 | Competitive research |
| P20 Client Context | 10 | Client dossier building |
| P21 CRM Sync | 15 | Email/meeting sync to CRM |

### Marketing (total weight: 35)
| Plugin | Weight | What It Automates |
|--------|--------|-------------------|
| P08 Newsletter Engine | 10 | Newsletter drafting |
| P15 Competitive Intel | 15 | Competitive matrices |
| P24 LinkedIn Post | 10 | LinkedIn content generation |

### Content (total weight: 30)
| Plugin | Weight | What It Automates |
|--------|--------|-------------------|
| P08 Newsletter Engine | 15 | Newsletter content |
| P24 LinkedIn Post | 15 | LinkedIn posts |

### Client Delivery (total weight: 70)
| Plugin | Weight | What It Automates |
|--------|--------|-------------------|
| P03 Meeting Prep | 5 | Client meeting preparation |
| P07 Meeting Intel | 10 | Meeting analysis |
| P09 Report Generator | 15 | Business reports |
| P10 Client Health | 10 | Client health dashboard |
| P12 Proposal Automator | 10 | Proposals |
| P14 SOW Generator | 15 | Statements of work |
| P23 Knowledge Base | 5 | Knowledge Q&A |

### Product/Dev (total weight: 10)
| Plugin | Weight | What It Automates |
|--------|--------|-------------------|
| P26 Prompt Library | 10 | Team prompt management |

### Admin (total weight: 90)
| Plugin | Weight | What It Automates |
|--------|--------|-------------------|
| P05 Weekly Review | 5 | Review compilation |
| P09 Report Generator | 5 | Report generation |
| P13 Contract Analyzer | 10 | Contract management |
| P17 Notion Command Center | 15 | Notion CRUD |
| P18 Drive Brain | 10 | Drive management |
| P23 Knowledge Base | 10 | Knowledge management |
| P25 Time Savings | 10 | ROI tracking |
| P26 Prompt Library | 5 | Prompt management |
| P27 Workflow Automator | 10 | Workflow automation |
| P28 Workflow Documenter | 10 | SOP documentation |
| P29 Learning Log | 5 | Learning capture |
| P30 Goal Tracker | 10 | Goal tracking |

### HR/People (total weight: 0)
No plugins currently cover HR/People tasks. This area is fully manual.
```

Write to `_infrastructure/automation-audit/references/task-categories.md`.

- [ ] **Step 2: Write the SKILL.md**

```markdown
---
name: automation-audit
description: "Scans Founder OS plugin deployment, scores coverage by business area, and produces an actionable automation scorecard. Used by /audit:scan and /audit:report commands."
---

## Overview

The automation audit infrastructure detects which of the 30 Founder OS plugins are installed and actively configured, then scores coverage across 9 business areas using weighted metrics from the audit registry.

## Detection Logic

For each plugin in `schema/audit-registry.json`:

1. **Installed**: Check if `[directory]/.claude-plugin/plugin.json` exists on the filesystem
2. **Configured**: Check if required MCP servers are configured (via `.mcp.json` in plugin directory)
3. **Active**: (Optional, requires Notion) Query for the plugin's associated Notion database using HQ DB discovery pattern: search "[FOS] [DB Name]" first, fall back to "Founder OS HQ - [DB Name]"

### Scoring

- **Plugin Deployment %** = (installed plugins / 30) × 100
- **Area Coverage %** = for each area: (sum of installed plugin weights / total area weight) × 100
- **Overall Area Coverage** = weighted average across all 9 areas (weighted by area total weight to reflect importance)

## Scorecard Format

```
Founder OS Automation Scorecard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plugin Deployment: [X]% ([N]/30 plugins installed)
Area Coverage: [Y]% (weighted by business impact)

By Business Area:
  [Area Name]    [bar]  [%]  ([active plugins])
  ...

Top Gaps:
  1. [Area] at [%] — install [Plugin] for +[weight]% boost
  2. ...

Scheduled Plugins: [N]/[installed] (see /audit:report for details)
```

## Notion Output

Write audit results to Reports DB:
- Type: "Automation Audit"
- Title: "Automation Audit — [date]"
- Follow HQ DB discovery: search "[FOS] Reports" first
- Idempotent: if an audit for today's date exists, update it; don't duplicate

## References

- `schema/audit-registry.json` — Plugin-to-area mapping with coverage weights
- `references/task-categories.md` — Detailed breakdown of what each area covers
```

Write to `_infrastructure/automation-audit/SKILL.md`.

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/automation-audit/SKILL.md _infrastructure/automation-audit/references/task-categories.md
git commit -m "feat(audit): add SKILL.md and task categories reference"
```

---

### Task 8: Create /audit:scan and /audit:report commands

**Files:**
- Create: `_infrastructure/automation-audit/commands/audit-scan.md`
- Create: `_infrastructure/automation-audit/commands/audit-report.md`

- [ ] **Step 1: Write /audit:scan command**

```markdown
---
description: Scan which Founder OS plugins are installed and produce a deployment coverage report
argument-hint: "[--notion] [--json]"
allowed-tools: ["Read", "Glob", "Bash"]
---

# /audit:scan

Detect which of the 30 Founder OS plugins are installed and configured, then produce a coverage report.

## Load Skills

Read `_infrastructure/automation-audit/SKILL.md` for detection logic and scoring methodology.

## Parse Arguments

- `--notion` (optional) — Also check Notion for active database usage (requires Notion MCP)
- `--json` (optional) — Output raw JSON instead of formatted scorecard

## Steps

### Step 1: Load Registry

Read `_infrastructure/automation-audit/schema/audit-registry.json` to get the list of all 30 plugins and their detection criteria.

### Step 2: Scan Filesystem

For each plugin in the registry:
1. Use Glob to check if `[directory]/.claude-plugin/plugin.json` exists
2. Record status: "installed" or "not_found"

### Step 3: Check Configuration (for installed plugins)

For each installed plugin:
1. Check if `[directory]/.mcp.json` exists (if plugin requires MCP servers)
2. Record: "configured" or "installed_unconfigured"

### Step 4: Check Notion (if --notion)

For each installed plugin that has a `notion_db` in its detection config:
1. Search Notion for the database name using HQ discovery pattern
2. If found and has recent entries (last 30 days): "active"
3. If found but no recent entries: "configured"
4. If not found: keep current status

### Step 5: Calculate Scores

Per SKILL.md scoring methodology:
- Plugin Deployment %
- Per-area Coverage %
- Overall weighted Area Coverage %

### Step 6: Output

If `--json`: output raw JSON with all plugin statuses and scores.

Otherwise, display the formatted scorecard per SKILL.md format. Include:
- Deployment and coverage percentages
- Per-area bar chart
- Top 3 gap recommendations (areas with lowest coverage, suggesting specific plugins)

### Step 7: Save Results

Write results to `_infrastructure/automation-audit/last-scan.json` for use by `/audit:report`.

## Graceful Degradation

- If `--notion` but Notion MCP unavailable: skip Notion checks, warn user, continue with filesystem-only scan
- If a plugin directory exists but plugin.json is missing: count as "partial_install"
```

Write to `_infrastructure/automation-audit/commands/audit-scan.md`.

- [ ] **Step 2: Write /audit:report command**

```markdown
---
description: Generate a detailed automation scorecard with recommendations and Notion logging
argument-hint: "[--save-notion] [--compare]"
allowed-tools: ["Read", "Glob", "Bash"]
---

# /audit:report

Generate a detailed automation scorecard from the latest scan, with recommendations and optional Notion persistence.

## Load Skills

Read `_infrastructure/automation-audit/SKILL.md` for scorecard format and Notion output conventions.

## Parse Arguments

- `--save-notion` (optional) — Write report to Notion Reports DB (Type = "Automation Audit")
- `--compare` (optional) — Compare current scan with previous scan to show progress

## Prerequisites

Check if `_infrastructure/automation-audit/last-scan.json` exists. If not, inform user: "No scan data found. Run `/audit:scan` first."

## Steps

### Step 1: Load Scan Data

Read `_infrastructure/automation-audit/last-scan.json`.

### Step 2: Generate Detailed Report

Produce the full scorecard including:
- Header with Plugin Deployment % and Area Coverage %
- Per-area breakdown with progress bars
- Per-plugin status table (all 30 plugins with install/config/active status)
- Top gap recommendations
- Scheduling coverage (how many installed plugins have `--schedule` configured, links to Phase 3)

### Step 3: Compare (if --compare)

If a previous scan exists (check for `last-scan-previous.json`):
- Show delta for each metric (↑ or ↓)
- Highlight newly installed plugins since last scan
- Show area coverage changes

### Step 4: Save to Notion (if --save-notion)

Follow SKILL.md Notion output conventions:
1. Search for "[FOS] Reports" using HQ DB discovery
2. Check for existing "Automation Audit — [today's date]" entry
3. If exists: update it (idempotent)
4. If not: create new entry with Type = "Automation Audit"

### Step 5: Archive Current Scan

Copy `last-scan.json` to `last-scan-previous.json` for future comparisons.

## Output Format

```
Founder OS Automation Report — [date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY
  Plugin Deployment: [X]% ([N]/30) [delta if --compare]
  Area Coverage:     [Y]%          [delta if --compare]

COVERAGE BY AREA
  Operations    ████████░░  80%   P01,P02,P04,P05,P06,P19,P22,P27
  Finance       ██████░░░░  60%   P11,P13
  Sales/CRM     █████████░  90%   P06,P10,P12,P15,P20,P21
  Marketing     ███████░░░  70%   P08,P15,P24
  Content       ██████████  100%  P08,P24
  Client Dlvry  ████████░░  80%   P03,P07,P09,P10,P12,P14
  Product/Dev   ██████████  100%  P26
  Admin         ████████░░  80%   P05,P17,P18,P23,P25,P27,P28,P30
  HR/People     ░░░░░░░░░░  0%    (no plugins cover this area)

TOP GAPS
  1. HR/People (0%) — No plugins available. Consider custom workflow via P27.
  2. Finance (60%) — Install P16 Expense Report for +15% coverage.
  3. Operations (80%) — Install P03 Meeting Prep for +10% coverage.

SCHEDULING STATUS
  Scheduled: [N] plugins have active schedules
  Unscheduled: [list of installed schedulable plugins without schedules]
  Run /[command] --schedule "..." to enable scheduling.

ALL PLUGINS
  | # | Plugin | Status | Areas |
  |---|--------|--------|-------|
  (full 30-row table)
```

## Graceful Degradation

- If Notion unavailable for --save-notion: display report in terminal only, warn about Notion
- If no previous scan for --compare: skip comparison, note "first scan"
```

Write to `_infrastructure/automation-audit/commands/audit-report.md`.

- [ ] **Step 3: Register audit commands in CLAUDE.md**

Add to the "Infrastructure Commands" table in CLAUDE.md:

```markdown
| `/audit:scan` | `_infrastructure/automation-audit/commands/audit-scan.md` | Scan plugin deployment and coverage |
| `/audit:report` | `_infrastructure/automation-audit/commands/audit-report.md` | Generate detailed automation scorecard |
```

- [ ] **Step 4: Commit**

```bash
git add _infrastructure/automation-audit/commands/ CLAUDE.md
git commit -m "feat(audit): add /audit:scan and /audit:report commands, register in CLAUDE.md"
```

---

## Chunk 3: Phase 3 — Scheduling Bridge

### Task 9: Create scheduling infrastructure skill and template

**Files:**
- Create: `_infrastructure/scheduling/SKILL.md`
- Create: `_infrastructure/scheduling/references/schedule-flag-spec.md`
- Create: `_infrastructure/scheduling/templates/workflow-template.yaml`

- [ ] **Step 0: Verify P27 scheduling infrastructure exists**

Read `founder-os-workflow-automator/skills/workflow-scheduling/SKILL.md` and `founder-os-workflow-automator/skills/workflow-scheduling/references/os-cron-generation.md` to confirm:
- NL-to-cron conversion table exists
- OS-level cron generation (runner scripts, crontab entries) is documented
- Session-level scheduling via CronCreate is documented

If any of these are missing, the scheduling bridge cannot delegate to P27 and must be implemented differently. Proceed only if confirmed.

- [ ] **Step 1: Write the SKILL.md**

```markdown
---
name: scheduling-bridge
description: "Adds --schedule flag support to any Founder OS plugin command. Generates P27 Workflow Automator YAML files behind the scenes so users can schedule recurring plugin execution without knowing P27 exists."
---

## Overview

The scheduling bridge enables any plugin command to accept a `--schedule` flag that configures recurring execution. Behind the scenes, it generates a P27 Workflow Automator workflow YAML and registers it with P27's scheduling system.

## --schedule Flag Specification

Any plugin command that supports scheduling adds this flag to its argument parsing:

| Flag | Value | Behavior |
|------|-------|----------|
| `--schedule "expression"` | Natural language or 5-field cron | Generate workflow + register schedule |
| `--schedule disable` | literal "disable" | Remove schedule for this command |
| `--schedule status` | literal "status" | Show current schedule status |
| `--persistent` | (no value, used with --schedule) | Generate OS-level cron instead of session-level |

See `references/schedule-flag-spec.md` for full parsing rules.

## How It Works

When a user runs e.g. `/briefing:daily --schedule "weekdays 7:30am"`:

1. Parse the schedule expression (NL or cron)
2. Generate workflow YAML from template at `templates/workflow-template.yaml`
3. Write to `founder-os-workflow-automator/workflows/auto-[command-name].yaml`
4. Read P27's scheduling skill at `founder-os-workflow-automator/skills/workflow-scheduling/SKILL.md`
5. Register the schedule (session-level by default, OS-level if `--persistent`)
6. Display confirmation with next 3 run times
7. Exit without running the main command logic

## Plugin Integration

Add this section to any plugin command file that should support scheduling:

~~~markdown
## Scheduling Support

If `$ARGUMENTS` contains `--schedule`:
1. Extract the schedule value and any `--persistent` flag
2. Read `_infrastructure/scheduling/SKILL.md` for scheduling bridge logic
3. Read `_infrastructure/scheduling/references/schedule-flag-spec.md` for argument parsing
4. Handle the schedule operation (create/disable/status) per the spec
5. Exit after scheduling — do NOT continue to main command logic
~~~

## Natural Language to Cron

Use P27's existing NL-to-cron conversion table (from `founder-os-workflow-automator/skills/workflow-scheduling/SKILL.md`):

| Natural Language | Cron |
|-----------------|------|
| "weekdays 8am" | `0 8 * * 1-5` |
| "every morning" | `0 9 * * *` |
| "every Monday" | `0 9 * * 1` |
| "Fridays 5pm" | `0 17 * * 5` |
| "daily 6am" | `0 6 * * *` |
| "twice daily" | `0 9,17 * * *` |

Always confirm the converted expression with the user before applying.

## Default Schedule Suggestions

When a plugin supports scheduling, suggest a sensible default if user hasn't specified one:

| Command | Suggested Default |
|---------|-------------------|
| `/briefing:daily` | Weekdays 7:30am |
| `/sync:morning` (`morning-sync`) | Weekdays 8:00am |
| `/review:weekly` (`review`) | Fridays 5:00pm |
| `/crm:sync-email` | Weekdays 9:00am, 2:00pm |
| `/client:health-scan` (`health-scan`) | Weekdays 9:30am |
| `/followup:check` | Weekdays 10:00am |
| `/drive:search` (`drive-search`) | Daily 6:00am |
| `/slack:digest` | Weekdays 6:00pm |
| `/learn:weekly` | Fridays 4:00pm |
```

Write to `_infrastructure/scheduling/SKILL.md`.

- [ ] **Step 2: Write the schedule-flag-spec reference**

```markdown
# --schedule Flag Specification

## Argument Parsing

The `--schedule` flag is parsed from `$ARGUMENTS` before any other argument processing. If present, the command enters "scheduling mode" and does NOT execute its main logic.

### Patterns

1. **Create/update schedule**: `--schedule "expression"` where expression is:
   - Natural language: `"weekdays 8am"`, `"every Monday at 9am"`, `"daily 6am"`
   - Cron expression: `"0 8 * * 1-5"`, `"0 9 * * 1"` (detected by presence of numeric fields)
   - Detection rule: if expression contains only digits, spaces, asterisks, commas, hyphens, and slashes → treat as cron. Otherwise → treat as natural language.

2. **Disable schedule**: `--schedule disable`

3. **Check status**: `--schedule status`

4. **Persistent flag**: `--persistent` (only valid alongside `--schedule "expression"`)

### Validation

- Cron expressions must have exactly 5 space-separated fields
- Each field must be within valid range (see P27 cron-syntax reference)
- Natural language must convert to a valid cron expression
- Intervals shorter than 5 minutes: warn about excessive frequency
- Always confirm interpreted schedule with user before applying

## Workflow Generation

### File Location

Generated workflows are written to:
```
founder-os-workflow-automator/workflows/auto-[command-name].yaml
```

Where `[command-name]` is the kebab-case command name (e.g., `auto-daily-briefing.yaml`, `auto-morning-sync.yaml`).

### Template Substitution

Read `_infrastructure/scheduling/templates/workflow-template.yaml` and substitute:
- `{{WORKFLOW_NAME}}` → `auto-[command-name]`
- `{{WORKFLOW_DESCRIPTION}}` → `Auto-scheduled: [plugin-name] [command-name]`
- `{{CRON_EXPRESSION}}` → the validated cron expression
- `{{TIMEZONE}}` → system local timezone (or user-specified)
- `{{COMMAND}}` → the full slash command (e.g., `/briefing:daily`)
- `{{COMMAND_ARGS}}` → any default arguments for the command (empty by default)

### On Disable

1. Set `schedule.enabled: false` in the workflow YAML
2. If persistent: provide crontab removal instructions
3. Display: "Schedule disabled for [command]."

### On Status

1. Check if `auto-[command-name].yaml` exists
2. If exists and schedule.enabled=true: show cron, next 3 run times, mode (session/persistent)
3. If exists but disabled: show "Schedule exists but is disabled"
4. If not exists: show "No schedule configured. Use --schedule 'expression' to set one."

## Confirmation Display

```
Schedule configured: [command-name]

  Cron: [expression] ([human description])
  Timezone: [timezone]
  Mode: [Session | Persistent]

  Next runs:
    1. [datetime]
    2. [datetime]
    3. [datetime]

  Workflow: workflows/auto-[command-name].yaml
  Manage with: /workflow:schedule auto-[command-name] [--disable]
```
```

Write to `_infrastructure/scheduling/references/schedule-flag-spec.md`.

- [ ] **Step 3: Write the workflow template**

```yaml
# Auto-generated workflow — do not edit manually
# Created by --schedule flag on {{COMMAND}}
# To modify: re-run the command with --schedule "new expression"
# To disable: run the command with --schedule disable

workflow:
  name: "{{WORKFLOW_NAME}}"
  description: "{{WORKFLOW_DESCRIPTION}}"
  version: "1.0.0"
  tags: ["auto-scheduled"]

schedule:
  enabled: true
  cron: "{{CRON_EXPRESSION}}"
  timezone: "{{TIMEZONE}}"

defaults:
  stop_on_error: true
  timeout_seconds: 300
  output_format: "chat"

steps:
  - id: "run-command"
    name: "Execute {{COMMAND}}"
    command: "{{COMMAND}}"
    args: {{COMMAND_ARGS}}
    depends_on: []
```

Write to `_infrastructure/scheduling/templates/workflow-template.yaml`.

- [ ] **Step 4: Commit**

```bash
git add _infrastructure/scheduling/
git commit -m "feat(scheduling): add scheduling bridge infrastructure skill, spec, and workflow template"
```

---

### Task 10: Add --schedule to Tier 1 plugins (Daily Rituals)

**Files:**
- Modify: `founder-os-daily-briefing-generator/commands/daily-briefing.md`
- Modify: `founder-os-multi-tool-morning-sync/commands/morning-sync.md`
- Modify: `founder-os-weekly-review-compiler/commands/review.md`

- [ ] **Step 1: Read the 3 command files to find insertion points**

Read each file to identify:
- Where `argument-hint` is in the frontmatter (to add `--schedule`)
- Where argument parsing section is (to add schedule flag handling)
- The first step of main logic (to add scheduling gate before it)

- [ ] **Step 2: Add --schedule to daily-briefing.md**

In the frontmatter, append `[--schedule=EXPR] [--persistent]` to `argument-hint`.

After the "Parse Arguments" section, add:

```markdown
## Scheduling Support

If `$ARGUMENTS` contains `--schedule`:
1. Extract the schedule value and any `--persistent` flag
2. Read `_infrastructure/scheduling/SKILL.md` for scheduling bridge logic
3. Read `_infrastructure/scheduling/references/schedule-flag-spec.md` for argument parsing
4. Default suggestion if no expression given: `"30 7 * * 1-5"` (Weekdays 7:30am)
5. Handle the schedule operation (create/disable/status) per the spec
6. Exit after scheduling — do NOT continue to main command logic
```

- [ ] **Step 3: Add --schedule to morning-sync.md**

Same pattern as Step 2. Default suggestion: `"0 8 * * 1-5"` (Weekdays 8:00am).

- [ ] **Step 4: Add --schedule to review.md**

Same pattern. Default suggestion: `"0 17 * * 5"` (Fridays 5:00pm).

- [ ] **Step 5: Commit**

```bash
git add founder-os-daily-briefing-generator/commands/daily-briefing.md founder-os-multi-tool-morning-sync/commands/morning-sync.md founder-os-weekly-review-compiler/commands/review.md
git commit -m "feat(scheduling): add --schedule flag to Tier 1 daily ritual plugins (P02, P22, P05)"
```

---

### Task 11: Add --schedule to Tier 2 plugins (Data Freshness)

**Files:**
- Modify: `founder-os-crm-sync-hub/commands/crm-sync-email.md`
- Modify: `founder-os-client-health-dashboard/commands/health-scan.md`
- Modify: `founder-os-follow-up-tracker/commands/followup-check.md`

- [ ] **Step 1: Read the 3 command files**

Read each to find insertion points (same pattern as Task 10).

- [ ] **Step 2: Add --schedule to crm-sync-email.md**

Same pattern. Default suggestion: `"0 9,14 * * 1-5"` (Weekdays 9am and 2pm).

- [ ] **Step 3: Add --schedule to health-scan.md**

Same pattern. Default suggestion: `"30 9 * * 1-5"` (Weekdays 9:30am).

- [ ] **Step 4: Add --schedule to followup-check.md**

Same pattern. Default suggestion: `"0 10 * * 1-5"` (Weekdays 10:00am).

- [ ] **Step 5: Commit**

```bash
git add founder-os-crm-sync-hub/commands/crm-sync-email.md founder-os-client-health-dashboard/commands/health-scan.md founder-os-follow-up-tracker/commands/followup-check.md
git commit -m "feat(scheduling): add --schedule flag to Tier 2 data freshness plugins (P21, P10, P06)"
```

---

### Task 12: Add --schedule to Tier 3 plugins (Monitoring)

**Files:**
- Modify: `founder-os-google-drive-brain/commands/drive-search.md`
- Modify: `founder-os-slack-digest-engine/commands/slack-digest.md`
- Modify: `founder-os-learning-log-tracker/commands/learn-weekly.md`

- [ ] **Step 1: Read the 3 command files**

Read each to find insertion points.

- [ ] **Step 2: Add --schedule to drive-search.md**

Same pattern. Default suggestion: `"0 6 * * *"` (Daily 6:00am).

- [ ] **Step 3: Add --schedule to slack-digest.md**

Same pattern. Default suggestion: `"0 18 * * 1-5"` (Weekdays 6:00pm).

- [ ] **Step 4: Add --schedule to learn-weekly.md**

Same pattern. Default suggestion: `"0 16 * * 5"` (Fridays 4:00pm).

- [ ] **Step 5: Commit**

```bash
git add founder-os-google-drive-brain/commands/drive-search.md founder-os-slack-digest-engine/commands/slack-digest.md founder-os-learning-log-tracker/commands/learn-weekly.md
git commit -m "feat(scheduling): add --schedule flag to Tier 3 monitoring plugins (P18, P19, P29)"
```

---

### Task 13: Final integration — update CLAUDE.md and verify

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add scheduling documentation to CLAUDE.md**

Add to the "Conventions" section, under "Universal Plugin Patterns":

```markdown
- **Scheduling support** — 9 plugins accept `--schedule "expression"` flag for recurring execution. Generates P27 workflows automatically. Supported: P02, P05, P06, P10, P18, P19, P21, P22, P29. See `_infrastructure/scheduling/SKILL.md`.
```

- [ ] **Step 2: Add Autonomous Spectrum note to Architecture section**

After the "Agent Teams Patterns" table in CLAUDE.md, add:

```markdown
### Autonomous Spectrum

Plugins operate at different autonomy levels:

| Level | Trigger | Examples |
|-------|---------|---------|
| Interactive | User runs command | All 30 plugins (default) |
| Scheduled | Cron/timer | P02, P05, P06, P10, P18, P19, P21, P22, P29 (via `--schedule`) |
| Workflow | P27 orchestration | Any plugin via `/workflow:create` |
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: document scheduling support and autonomous spectrum in CLAUDE.md"
```

- [ ] **Step 4: Verify all infrastructure directories exist**

Run:
```bash
ls -la _infrastructure/context/ _infrastructure/automation-audit/ _infrastructure/scheduling/
```

Expected: all 3 directories with their files.

- [ ] **Step 5: Final commit — tag the release**

```bash
git tag -a aios-enrichment-v1.0 -m "AIOS Enrichment: context files, automation audit, scheduling bridge"
```
