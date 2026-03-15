# P12 Proposal Automator — Design Document

**Date**: 2026-03-05
**Status**: Planning
**Platform**: Claude Code (built as Claude Code plugin despite Cowork spec designation)
**Pattern**: Standalone (no Agent Teams)

## Overview

The Proposal Automator generates professional client proposals from a brief, scope notes, and pricing parameters. It outputs Markdown proposals with 7 sections and 3 pricing packages, and produces a structured brief file compatible with #14 SOW Generator's `/sow:from-brief` command.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform | Claude Code | All completed plugins use this format |
| Output format | Markdown (.md) | Consistent with ecosystem; DOCX via Pandoc |
| Pricing tiers | 3 fixed packages | Starter / Professional / Enterprise |
| SOW compatibility | Shared brief file | `brief-[slug]-[date].md` consumable by `/sow:from-brief` |
| CRM integration | Auto-search Notion CRM Pro | Graceful degradation if unavailable |
| Proposal tracking | Lazy-created Notion DB | "Proposal Automator - Proposals" |
| Sections | 7 sections | Cover Letter, Exec Summary, Understanding & Approach, Scope, Timeline & Milestones, Pricing, Terms |

## File Structure

```
founder-os-proposal-automator/
├── .claude-plugin/
│   └── plugin.json
├── .mcp.json
├── commands/
│   ├── proposal-create.md           # /proposal:create [client]
│   └── proposal-from-brief.md       # /proposal:from-brief [file-or-url]
├── skills/
│   ├── proposal-writing/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── section-templates.md
│   └── pricing-strategy/
│       ├── SKILL.md
│       └── references/
│           └── pricing-models.md
├── templates/
│   └── proposal-template.md         # Proposal scaffold
├── tests/
│   └── integration-test-plan.md
├── README.md
├── QUICKSTART.md
└── INSTALL.md
```

## Commands

### /proposal:create [client]

**Purpose**: Generate a complete proposal from user input or CRM context.

**Arguments**:
- `[client]` (string, optional) — Client name. If not provided, ask interactively.
- `--output=PATH` (string, default: `./proposals/`) — Output directory.
- `--brief=FILE` (string, optional) — Path to existing brief file to use as input.

**Flow**:
1. Read both skills (proposal-writing, pricing-strategy)
2. Resolve client context:
   - If Notion available: search CRM Pro (Companies, Contacts, Deals) for client data
   - Summarize any found context (industry, past projects, relationship history)
3. Collect brief (interactively or from `--brief` file):
   - Project description and goals
   - Key deliverables or features
   - Target timeline
   - Budget range (if known)
   - Special requirements
4. Generate 7-section proposal with 3 pricing packages
5. Save proposal: `proposals/proposal-[client-slug]-[YYYY-MM-DD].md`
6. Save SOW-compatible brief: `proposals/brief-[client-slug]-[YYYY-MM-DD].md`
7. If Notion available: create/update tracking record in lazy-created DB
8. Present summary to user

**Output summary format**:
```
## Proposal Generated

**Client**: [Client Name]
**Output**: [proposal file path]
**SOW Brief**: [brief file path] (use with /sow:from-brief)

### Package Summary
| Package | Timeline | Price | Scope |
|---------|----------|-------|-------|
| Starter | N weeks | $XX,XXX | Core deliverables |
| **Professional ✓** | N weeks | $XX,XXX | Core + enhancements |
| Enterprise | N weeks | $XX,XXX | Full vision |

_Recommended: Professional package_
```

### /proposal:from-brief [file-or-url]

**Purpose**: Generate a proposal from an existing brief file or Notion page.

**Arguments**:
- `[file-or-url]` (string, required) — Path to local .md/.txt file OR Notion page URL.
- `--client=NAME` (string, optional) — Override client name from brief.
- `--output=PATH` (string, default: `./proposals/`) — Output directory.

**Flow**:
1. Load brief from file (Read tool) or Notion page (notion-fetch)
2. Extract: client name, project description, deliverables, constraints
3. Proceed with same generation logic as /proposal:create from step 3

## Skills

### proposal-writing (SKILL.md)

**Trigger phrases**: "create a proposal", "write a proposal", "generate proposal", "proposal for client", "client proposal"

**Content areas**:
- 7-section proposal structure with rules for each section
- Cover letter format (personalized, 3-4 paragraphs)
- Executive summary rules (1 page max, problem-solution-value)
- Understanding & Approach section (demonstrate client understanding)
- Scope of Work section (deliverables table, milestones, exclusions)
- Timeline & Milestones section (Gantt-style table, phase breakdown)
- Pricing section (3-package comparison table, what's included/excluded per tier)
- Terms & Conditions section (payment terms, change control, IP, confidentiality)
- Formatting rules (professional markdown, consistent headings, tables)
- Anti-patterns (don't oversell, don't be vague on scope, don't omit exclusions)

**Progressive disclosure**: `references/section-templates.md` with detailed examples for each section

### pricing-strategy (SKILL.md)

**Trigger phrases**: "price a proposal", "pricing tiers", "create pricing packages", "package pricing", "proposal pricing"

**Content areas**:
- 3-tier pricing philosophy (good-better-best)
- Package naming conventions (client-friendly, avoid "basic/pro/enterprise" clichés)
- Pricing calculation framework:
  - Effort-based: hours × rate with margin
  - Value-based: price anchored to client ROI
  - Competitive: market-rate positioning
- Scope differentiation rules per tier:
  - Starter: core deliverables only, minimal customization
  - Professional: core + key enhancements, moderate customization
  - Enterprise: full vision, premium support, maximum customization
- ROI framing: connect pricing to business outcomes
- Comparison table layout rules
- Payment terms patterns (milestone-based, monthly, upfront discount)
- Anti-patterns (don't anchor too low, don't make tiers too similar, don't hide costs)

**Progressive disclosure**: `references/pricing-models.md` with pricing calculation examples

## SOW Compatibility

The proposal generates a `brief-[client-slug]-[date].md` file with structured content:

```markdown
# Project Brief: [Project Title]

## Client
- **Name**: [Client Name]
- **Industry**: [Industry]
- **Contact**: [Contact Info]

## Project Overview
[Project description from proposal]

## Deliverables
[Deliverables list from proposal scope section]

## Constraints
- **Budget**: [Amount or "Not specified"]
- **Timeline**: [Weeks or "Not specified"]
- **Priorities**: [e.g., quality, speed, cost]

## Selected Package
[Which package the client selected, if known — defaults to Professional]

## Additional Context
[CRM context, past project history, special requirements]
```

This format is directly loadable by `/sow:from-brief [path]`.

## Notion Database

**Name**: "Proposal Automator - Proposals"
**Created**: Lazy, on first `/proposal:create` run with Notion available.
**Idempotent**: Upsert by Client Name + Project Title.

**Properties** (10):
| Property | Type | Purpose |
|----------|------|---------|
| Project Title | title | Proposal project name |
| Client Name | select | Client identifier |
| Status | select | Draft / Sent / Won / Lost |
| Package Selected | select | Starter / Professional / Enterprise / None |
| Total Amount | number | Price of selected package |
| Proposal File | rich_text | Local file path |
| Brief File | rich_text | SOW-compatible brief path |
| Generated At | date | Creation timestamp |
| Sources Used | multi_select | CRM / Brief File / Interactive |
| Notes | rich_text | Free-form notes |

## MCP Requirements

| Server | Package | Required | Purpose |
|--------|---------|----------|---------|
| Filesystem | @modelcontextprotocol/server-filesystem | Yes | Read briefs, write proposals |
| Notion | @modelcontextprotocol/server-notion | No | CRM context, proposal tracking |
| Google Drive | @anthropic/mcp-server-google-drive | No | Store proposals in Drive |

## Integration Points

- **#14 SOW Generator**: Produces brief files consumable by `/sow:from-brief`
- **#20 Client Context Loader**: Reads CRM Pro databases for client context (same pattern)
- **#21 CRM Sync Hub**: Uses same CRM Pro Companies/Contacts/Deals databases
- **#13 Contract Analyzer**: Proposal terms section can reference standard terms from #13
