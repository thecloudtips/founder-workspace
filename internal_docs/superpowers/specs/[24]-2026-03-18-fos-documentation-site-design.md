# [24] Founder OS Documentation Site Design

> **Status:** Approved — pending implementation plan

## Overview

Content design for fos.naluforge.com — the Founder OS documentation and marketing site. This spec covers the content architecture, page templates, tone guidelines, and generation strategy. Frontend design and development are out of scope — only markdown content files are produced.

**Audience:** Founders evaluating Founder OS for adoption.
**Tone:** Professional polish with founder-friendly warmth. Authoritative and structured, but empathetic and outcome-focused where appropriate.
**Positioning:** Product with open core — lead with outcomes and polish, mention open-source as a trust signal. NaluForge is the company behind it.

## Site Structure

Two content zones: marketing landing pages and documentation reference.

```
docs/site/
├── landing/
│   ├── index.md              # Homepage (hero, pillars, CTA)
│   ├── how-it-works.md       # Install → configure → automate
│   ├── use-cases.md          # 4-5 founder personas
│   ├── getting-started.md    # Quick start guide
│   └── about.md              # NaluForge + open-core story
├── docs/
│   ├── index.md              # Docs home / overview
│   ├── installation.md       # Detailed install + config
│   ├── commands/
│   │   ├── index.md          # Command reference overview + pillar map
│   │   ├── inbox.md          # /founder-os:inbox:* (all commands)
│   │   ├── briefing.md
│   │   ├── prep.md
│   │   ├── actions.md
│   │   ├── review.md
│   │   ├── followup.md
│   │   ├── meeting.md
│   │   ├── newsletter.md
│   │   ├── report.md
│   │   ├── health.md
│   │   ├── invoice.md
│   │   ├── proposal.md
│   │   ├── contract.md
│   │   ├── sow.md
│   │   ├── compete.md
│   │   ├── expense.md
│   │   ├── notion.md
│   │   ├── drive.md
│   │   ├── slack.md
│   │   ├── client.md
│   │   ├── crm.md
│   │   ├── morning.md
│   │   ├── kb.md
│   │   ├── ideate.md
│   │   ├── social.md
│   │   ├── savings.md
│   │   ├── prompt.md
│   │   ├── workflow.md
│   │   ├── workflow-doc.md
│   │   ├── learn.md
│   │   ├── goal.md
│   │   ├── memory.md
│   │   ├── intel.md
│   │   ├── scout.md
│   │   └── setup.md
│   ├── agents/
│   │   ├── index.md          # Agent teams overview + patterns
│   │   ├── inbox-team.md
│   │   ├── briefing-team.md
│   │   ├── prep-team.md
│   │   ├── client-team.md
│   │   ├── report-team.md
│   │   ├── invoice-team.md
│   │   ├── sow-team.md
│   │   ├── intel-team.md
│   │   ├── scout-team.md
│   │   └── social-team.md
│   ├── deep-dives/
│   │   ├── memory-engine.md
│   │   ├── intelligence-engine.md
│   │   ├── evals-framework.md
│   │   ├── dispatcher.md
│   │   └── hooks-system.md
│   └── extending/
│       ├── custom-namespaces.md
│       ├── workflows.md
│       └── scout.md
```

**Total files:** 62 markdown files.

---

## Zone 1: Landing Pages

### Homepage (`landing/index.md`)

| Section | Content | Length |
|---------|---------|--------|
| Hero | Headline + subheadline + install CTA | 3-4 lines |
| Problem statement | 3-4 founder pain points (email overload, meeting chaos, scattered tools, no time for strategy) | 100-150 words |
| Four Pillars grid | Daily Work, Code Without Coding, Integrations, Meta & Growth — each with icon suggestion, 2-3 sentence description, 2 example commands | 200-300 words |
| Numbers bar | 35 namespaces, 120 commands, 10 agent teams, integrations | 1 line |
| How it works | 3-step: Install → Configure → Automate, one sentence each | 50 words |
| Feature highlights | 6 cards: Memory Engine, Intelligence Engine, Background Execution, Agent Teams, Scout Discovery, Workflow Automation | 300 words |
| Use case teasers | 2-3 real scenarios, before/after FOS framing | 200 words |
| CTA footer | Installation command + link to getting started | 3-4 lines |

### How It Works (`landing/how-it-works.md`)

Five steps, each with:
- Step title and one-liner
- 2-3 paragraph explanation
- Concrete example (command + what happens)

1. **Install** — npx command, 30 seconds, what gets created
2. **Configure** — Notion API key, gws auth, env vars
3. **Use** — First commands: `/inbox triage`, `/briefing`, `/prep`
4. **Learn** — Memory + intelligence adapt over time, auto-adaptations
5. **Extend** — Scout finds new capabilities, workflows chain commands

### Use Cases (`landing/use-cases.md`)

Four founder personas, each with:
- Persona description (role, company size, pain points)
- A "day in the life" scenario using 4-6 FOS commands
- Before/after comparison (time spent, cognitive load)
- Which namespaces are most relevant

| Persona | Key Namespaces | Story Arc |
|---------|---------------|-----------|
| Solopreneur | morning, inbox, briefing, health, review | Morning routine automation |
| Agency founder | client, sow, invoice, crm, report | Client lifecycle management |
| Consultant | prep, proposal, contract, expense, followup | Engagement workflow |
| SaaS founder | compete, newsletter, goal, learn, ideate | Growth and strategy |

### Getting Started (`landing/getting-started.md`)

- Prerequisites (Claude Code, Node 18+, Notion account optional)
- Installation walkthrough with expected output
- First 5 commands to try (with what to expect)
- Configuration deep dive (env vars, MCP servers, business context setup)
- Troubleshooting common issues

### About (`landing/about.md`)

- NaluForge company mission
- Open-core philosophy: free tool, own your data, extend freely
- Technology choices: why Claude Code, why Notion, why SQLite
- Builder story (focus on the indie builder persona, not a corporate team page)
- Roadmap teaser: Obsidian integration, Remotion video, Landing Pages, Ads management

---

## Zone 2: Documentation

### Command Reference Template

Every namespace page (`docs/commands/<namespace>.md`) follows this structure:

```markdown
# <Namespace Name>

> <One-line description>

## Overview

<2-3 paragraphs: what this namespace does, when to use it, what external
tools it connects to, which Notion HQ databases it reads/writes.>

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | Read/write to [DB name] |
| gws (Gmail) | Optional | Fetch recent emails |

## Commands

### `/founder-os:<ns>:<action>`

**What it does** — <2-3 sentences>

**Usage:**
```
/founder-os:<ns>:<action> [arguments]
```

**Example scenario:**
> <Real-world use case in 2-3 sentences, written as a story>

**What you get back:**
<Description of output format and content>

**Flags:**
- `--team` — Use full agent pipeline instead of single-agent mode
- `--schedule "expression"` — Run on a recurring schedule (if supported)

---

<Repeat for each command in the namespace>

## Tips & Patterns

- <Common workflow combining this namespace with others>
- <Pro tips from real usage>
- <Integration points with other namespaces>

## Related Namespaces

- <Link to related namespace> — <why they work together>
```

### Agent Team Template

Every agent team page (`docs/agents/<team>.md`) follows:

```markdown
# <Team Name> Agent Team

> <Pattern type>: <one-line description>

## Overview

<How this team works, when to use --team flag vs default mode>

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| <name> | Lead / Worker | <responsibility> |

## Data Flow

```
Input → [Agent A: task] → [Agent B: task] → Output
```

## When to Use --team

<Guidance on when the full pipeline adds value vs single-agent default>

## Example

```
/founder-os:<ns>:<action> --team
```

<Walk through what happens step by step>
```

### Deep Dive Pages

**Memory Engine** (`docs/deep-dives/memory-engine.md`)
- Architecture: SQLite + HNSW vector index at `.memory/memory.db`
- The lifecycle: observation → pattern detection → memory promotion
- Confidence scoring and decay (daily, 30-day inactive threshold)
- Cross-namespace injection: top 5 relevant memories at command start
- User commands: teach, forget, show, sync
- Notion sync: bidirectional with [FOS] Memory database
- Schema overview (memories, observations, adaptations tables)

**Intelligence Engine** (`docs/deep-dives/intelligence-engine.md`)
- Architecture: SQLite at `.founderOS/infrastructure/intelligence/.data/intelligence.db`
- Pattern detection: how the system identifies recurring behaviors
- Approval workflow: patterns start as candidates, user approves/dismisses
- Auto-adaptations: apply after 3+ confirmations
- The intelligence database schema (patterns, events, adaptations tables)
- PostToolUse hook: how observations are logged
- User commands: status, patterns, approve, config, reset, healing

**Evals Framework** (`docs/deep-dives/evals-framework.md`)
- Purpose: validate command outputs meet quality standards
- Rubric-based scoring: universal rubric + namespace overrides
- The eval pipeline: eval-runner → checks (telemetry, format, schema) → score
- How to create custom rubrics
- Integration with intelligence engine

**Dispatcher** (`docs/deep-dives/dispatcher.md`)
- Background vs foreground execution model
- SessionStart hook: how dispatcher rules are injected
- Command frontmatter: `execution-mode`, `result-format`
- UserPromptSubmit hook: preflight dependency checks
- The dispatch flow: parse → preflight → spawn subagent → format result
- User override flags: `--foreground`, `--background`

**Hooks System** (`docs/deep-dives/hooks-system.md`)
- The 4 lifecycle hooks: SessionStart, UserPromptSubmit, PostToolUse, Stop
- What each hook does and when it fires
- Kill switch: `FOUNDER_OS_HOOKS=0`
- How hooks are registered in `.claude/settings.json`
- The hook registry at `.founderOS/infrastructure/hooks/hook-registry.json`
- Extending with custom hooks

### Extending Pages

**Custom Namespaces** (`docs/extending/custom-namespaces.md`)
- Directory structure: commands/, skills/, agents/
- Command file format (YAML frontmatter + markdown body)
- Skill file format (SKILL.md)
- Agent team setup (config.json + agent .md files)
- Conventions to follow (naming, Type column, HQ DB discovery)
- Testing your namespace

**Workflows** (`docs/extending/workflows.md`)
- What workflows are: chained namespace execution
- Creating a workflow: `/founder-os:workflow:create`
- Scheduling: `--schedule "expression"` flag
- Workflow SOPs: documenting with `/founder-os:workflow-doc:document`
- Example: morning automation workflow

**Scout** (`docs/extending/scout.md`)
- What scout does: discovers and installs new capabilities from external sources
- How it differs from the command reference: this page focuses on the discovery workflow, not individual commands
- The discovery pipeline: search → review → install → promote
- Source management: adding/removing capability sources
- Community contributions: how to share namespaces you've built
- Example: finding and installing a new namespace end-to-end
- Commands used: find, install, catalog, review, promote, remove, sources

---

## Content Generation Strategy

### Wave 1 — Landing Pages (5 parallel subagents)

| Agent | File | Source Material |
|-------|------|----------------|
| A1 | `landing/index.md` | Project CLAUDE.md, namespace list, pillar breakdown |
| A2 | `landing/how-it-works.md` | Installation flow, first-run experience |
| A3 | `landing/use-cases.md` | Namespace capabilities, command examples |
| A4 | `landing/getting-started.md` | dist/bin/founder-os.js, install flow, env setup |
| A5 | `landing/about.md` | Company context, tech choices, roadmap stubs [19-23] |

### Wave 2 — Deep Dives (5 parallel subagents)

| Agent | File | Source Material |
|-------|------|----------------|
| B1 | `docs/deep-dives/memory-engine.md` | `_infrastructure/memory/`, schema files, SKILL.md |
| B2 | `docs/deep-dives/intelligence-engine.md` | `_infrastructure/intelligence/`, schema, hooks |
| B3 | `docs/deep-dives/evals-framework.md` | `_infrastructure/intelligence/evals/`, rubrics |
| B4 | `docs/deep-dives/dispatcher.md` | `_infrastructure/dispatcher/SKILL.md`, hooks |
| B5 | `docs/deep-dives/hooks-system.md` | `dist/template/.founderOS/scripts/hooks/*.mjs`, `dist/template/.founderOS/infrastructure/hooks/hook-registry.json`, `dist/lib/settings-json.js`, `_infrastructure/dispatcher/SKILL.md` |

### Wave 3 — Command Reference (7 parallel subagents, ~5 namespaces each)

| Agent | Namespaces | Source |
|-------|-----------|--------|
| C1 | inbox, briefing, prep, actions, review | commands/<ns>/*.md + skills/<ns>/ |
| C2 | followup, meeting, newsletter | commands/<ns>/*.md + skills/<ns>/ |
| C3 | report, health, invoice, proposal, contract | commands/<ns>/*.md + skills/<ns>/ |
| C4 | sow, compete, expense | commands/<ns>/*.md + skills/<ns>/ |
| C5 | notion, drive, slack, client, crm | commands/<ns>/*.md + skills/<ns>/ |
| C6 | morning, kb, ideate, social | commands/<ns>/*.md + skills/<ns>/ |
| C7 | savings, prompt, workflow, workflow-doc, learn, goal, memory, intel, scout, setup | commands/<ns>/*.md + skills/<ns>/ |

### Wave 4a — Agent Teams + Extending (3 parallel subagents)

| Agent | Files | Source |
|-------|-------|--------|
| D1 | 5 agent team pages (inbox, briefing, prep, client, report) | agents/<ns>/*.md + config.json |
| D2 | 5 agent team pages (invoice, sow, intel, scout, social) | agents/<ns>/*.md + config.json |
| D3 | 3 extending pages (custom-namespaces, workflows, scout) | conventions from CLAUDE.md |

### Wave 4b — Index Pages (1 subagent, after 4a completes)

| Agent | Files | Source |
|-------|-------|--------|
| D4 | 4 index pages (docs home, commands index, agents index, installation) | All generated content from Waves 1-4a |

**Sequencing:** D4 runs after D1-D3 complete because index pages reference content from all other pages.

### Subagent Instructions

Each subagent receives:
1. The page template from this spec (relevant section)
2. Source files to read (listed per agent above)
3. Project CLAUDE.md for overall context
4. Tone guidance: "Professional polish with founder-friendly warmth. Authoritative and structured. Use concrete examples. Avoid jargon — explain technical concepts for non-technical founders."
5. Output path: write to `docs/site/<path>` as specified

---

## Tone Guidelines

| Aspect | Guideline |
|--------|-----------|
| Voice | Confident, direct, knowledgeable |
| Jargon | Explain on first use, then use freely |
| Examples | Real-world scenarios, not abstract |
| Length | Thorough but not verbose — every sentence earns its place |
| Structure | Headers, tables, code blocks for scannability |
| Personality | Light touches of warmth, not sterile |
| CTAs | Action-oriented, specific ("Try `/inbox triage` now") |

### Landing pages
- Lead with outcomes ("Save 2 hours every morning")
- Use before/after framing
- Social proof where possible
- Clear, prominent CTAs

### Documentation
- Lead with "what it does" before "how it works"
- Every command gets a real-world example scenario
- Cross-reference related namespaces
- Include tips and common patterns

---

## Success Criteria

- [ ] All ~60 markdown files generated and committed to `docs/site/`
- [ ] Every namespace has a guide-level reference page with all commands documented
- [ ] All 10 agent teams documented with pattern explanation and data flow
- [ ] 5 deep dive pages covering memory, intelligence, evals, dispatcher, hooks
- [ ] 3 extending pages covering custom namespaces, workflows, scout
- [ ] 5 landing pages with persuasive, professional copy
- [ ] Consistent tone across all pages
- [ ] All code examples use real FOS commands (not placeholder)
- [ ] Cross-references between related pages work
- [ ] Content is self-contained — a founder can understand FOS without reading source code
