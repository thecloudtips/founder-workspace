# FOS Documentation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate 57 documentation files for the Founder OS docs site at `docs/site/docs/`, covering command references, agent teams, deep dives, extending guides, and index pages.

**Architecture:** Content generated in 4 waves. Waves 2-3 have no inter-dependencies. Wave 4a depends on Wave 3. Wave 4b depends on all prior waves. Within each wave, all subagents run in parallel.

**Tech Stack:** Markdown content files — no code, no tests.

**Spec:** `docs/superpowers/specs/[24]-2026-03-18-fos-documentation-site-design.md`

**Subagent template (apply to all tasks):**
```
You are writing content for the Founder OS documentation site (fos.naluforge.com).

Audience: Founders evaluating Founder OS for adoption.
Tone: Professional polish with founder-friendly warmth. Authoritative and structured, but empathetic and outcome-focused. Use concrete examples. Avoid jargon — explain technical concepts for non-technical founders.

Rules:
- Write complete, publication-ready content — not stubs or placeholders
- Use real FOS commands in all examples (not placeholder names)
- Cross-reference related pages using relative markdown links
- Follow the template structure exactly
- Every command example should include a real-world scenario
- Keep the page self-contained — a reader shouldn't need to look at source code
```

**Command Reference Template (for all Wave 3 tasks):**
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
/founder-os:<ns>:<action> [arguments]

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

## Related Namespaces

- <Link to related namespace> — <why they work together>
```

**Agent Team Template (for Wave 4a tasks):**
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

Input → [Agent A: task] → [Agent B: task] → Output

## When to Use --team

<Guidance on when the full pipeline adds value vs single-agent default>

## Example

/founder-os:<ns>:<action> --team

<Walk through what happens step by step>
```

---

## Chunk 1: Deep Dives (Wave 2)

5 subagents in parallel. Each produces one deep dive page about FOS infrastructure.

### Task 1: Memory Engine Deep Dive

**Files:**
- Create: `docs/site/docs/deep-dives/memory-engine.md`

**Source material to read:**
- `development/_infrastructure/memory/` (all files)
- `development/skills/memory/` (SKILL.md and related)
- `development/commands/memory/` (all command files)

**Content outline:**
- Architecture: SQLite + HNSW vector index at `.memory/memory.db`
- The lifecycle: observation → pattern detection → memory promotion
- Confidence scoring and decay (daily, 30-day inactive threshold)
- Cross-namespace injection: top 5 relevant memories at command start
- User commands: teach, forget, show, sync
- Notion sync: bidirectional with [FOS] Memory database
- Schema overview (memories, observations, adaptations tables)

- [ ] **Step 1:** Read all files in `development/_infrastructure/memory/`
- [ ] **Step 2:** Read `development/commands/memory/` for user-facing commands
- [ ] **Step 3:** Write `docs/site/docs/deep-dives/memory-engine.md`
- [ ] **Step 4:** Verify technical accuracy against source material

---

### Task 2: Intelligence Engine Deep Dive

**Files:**
- Create: `docs/site/docs/deep-dives/intelligence-engine.md`

**Source material to read:**
- `development/_infrastructure/intelligence/` (all files except evals/)
- `development/commands/intel/` (all command files)
- `development/skills/infrastructure/intelligence/` (if exists)

**Content outline:**
- Architecture: SQLite at `.founderOS/infrastructure/intelligence/.data/intelligence.db`
- Pattern detection: how the system identifies recurring behaviors
- Approval workflow: patterns start as candidates, user approves/dismisses
- Auto-adaptations: apply after 3+ confirmations
- The intelligence database schema (patterns, events, adaptations tables)
- PostToolUse hook: how observations are logged
- User commands: status, patterns, approve, config, reset, healing

- [ ] **Step 1:** Read all files in `development/_infrastructure/intelligence/` (excluding evals/)
- [ ] **Step 2:** Read `development/commands/intel/` for user-facing commands
- [ ] **Step 3:** Write `docs/site/docs/deep-dives/intelligence-engine.md`
- [ ] **Step 4:** Verify technical accuracy against source material

---

### Task 3: Evals Framework Deep Dive

**Files:**
- Create: `docs/site/docs/deep-dives/evals-framework.md`

**Source material to read:**
- `development/_infrastructure/intelligence/evals/` (all files)
- `development/skills/infrastructure/intelligence/evals/` (if exists)

**Content outline:**
- Purpose: validate command outputs meet quality standards
- Rubric-based scoring: universal rubric + namespace overrides
- The eval pipeline: eval-runner → checks (telemetry, format, schema) → score
- How to create custom rubrics
- Integration with intelligence engine

- [ ] **Step 1:** Read all files in `development/_infrastructure/intelligence/evals/`
- [ ] **Step 2:** Write `docs/site/docs/deep-dives/evals-framework.md`
- [ ] **Step 3:** Verify technical accuracy against source material

---

### Task 4: Dispatcher Deep Dive

**Files:**
- Create: `docs/site/docs/deep-dives/dispatcher.md`

**Source material to read:**
- `development/_infrastructure/dispatcher/SKILL.md`
- `development/_infrastructure/preflight/` (all files)
- `development/_infrastructure/scheduling/` (all files)

**Content outline:**
- Background vs foreground execution model
- SessionStart hook: how dispatcher rules are injected
- Command frontmatter: `execution-mode`, `result-format`
- UserPromptSubmit hook: preflight dependency checks
- The dispatch flow: parse → preflight → spawn subagent → format result
- User override flags: `--foreground`, `--background`

- [ ] **Step 1:** Read `development/_infrastructure/dispatcher/SKILL.md`
- [ ] **Step 2:** Read files in `development/_infrastructure/preflight/`
- [ ] **Step 3:** Write `docs/site/docs/deep-dives/dispatcher.md`
- [ ] **Step 4:** Verify technical accuracy against source material

---

### Task 5: Hooks System Deep Dive

**Files:**
- Create: `docs/site/docs/deep-dives/hooks-system.md`

**Source material to read:**
- `dist/template/.founderOS/scripts/hooks/` (all .mjs files)
- `dist/template/.founderOS/infrastructure/hooks/hook-registry.json`
- `dist/lib/settings-json.js`
- `development/_infrastructure/dispatcher/SKILL.md` (hooks context)

**Content outline:**
- The 4 lifecycle hooks: SessionStart, UserPromptSubmit, PostToolUse, Stop
- What each hook does and when it fires
- Kill switch: `FOUNDER_OS_HOOKS=0`
- How hooks are registered in `.claude/settings.json`
- The hook registry at `.founderOS/infrastructure/hooks/hook-registry.json`
- Extending with custom hooks

- [ ] **Step 1:** Read all .mjs files in `dist/template/.founderOS/scripts/hooks/`
- [ ] **Step 2:** Read `dist/template/.founderOS/infrastructure/hooks/hook-registry.json`
- [ ] **Step 3:** Read `dist/lib/settings-json.js` (hook merge logic)
- [ ] **Step 4:** Write `docs/site/docs/deep-dives/hooks-system.md`
- [ ] **Step 5:** Verify technical accuracy against source material

---

## Chunk 2: Command References — Part 1 (Wave 3, agents C1-C4)

7 subagents in parallel. Each writes ~5 namespace reference pages using the Command Reference Template above. All source material is at `development/commands/<ns>/*.md` and `development/skills/<ns>/`.

### Task 6: Command References — C1 (inbox, briefing, prep, actions, review)

**Files:**
- Create: `docs/site/docs/commands/inbox.md`
- Create: `docs/site/docs/commands/briefing.md`
- Create: `docs/site/docs/commands/prep.md`
- Create: `docs/site/docs/commands/actions.md`
- Create: `docs/site/docs/commands/review.md`

**Source material to read (for each namespace):**
- `development/commands/<ns>/` — all .md files (one per command action)
- `development/skills/<ns>/` — SKILL.md and related files
- `development/agents/<ns>/` — if exists, agent team info (inbox, briefing, prep have agents)

- [ ] **Step 1:** For each of the 5 namespaces, read all command .md files and the skill SKILL.md
- [ ] **Step 2:** Write each namespace page using the Command Reference Template
- [ ] **Step 3:** Include cross-references between these related namespaces (they form the Daily Work pillar)
- [ ] **Step 4:** Verify every command in the source has a corresponding entry in the output

---

### Task 7: Command References — C2 (followup, meeting, newsletter)

**Files:**
- Create: `docs/site/docs/commands/followup.md`
- Create: `docs/site/docs/commands/meeting.md`
- Create: `docs/site/docs/commands/newsletter.md`

**Source material to read:**
- `development/commands/followup/` — all .md files
- `development/commands/meeting/` — all .md files
- `development/commands/newsletter/` — all .md files
- `development/skills/followup/`, `development/skills/meeting/`, `development/skills/newsletter/`

- [ ] **Step 1:** Read all command and skill files for the 3 namespaces
- [ ] **Step 2:** Write each namespace page using the Command Reference Template
- [ ] **Step 3:** Include cross-references between related namespaces
- [ ] **Step 4:** Verify every command in the source has a corresponding entry

---

### Task 8: Command References — C3 (report, health, invoice, proposal, contract)

**Files:**
- Create: `docs/site/docs/commands/report.md`
- Create: `docs/site/docs/commands/health.md`
- Create: `docs/site/docs/commands/invoice.md`
- Create: `docs/site/docs/commands/proposal.md`
- Create: `docs/site/docs/commands/contract.md`

**Source material to read:**
- `development/commands/<ns>/` for each namespace — all .md files
- `development/skills/<ns>/` for each namespace
- `development/agents/report/`, `development/agents/invoice/` (agent teams)

- [ ] **Step 1:** Read all command and skill files for the 5 namespaces
- [ ] **Step 2:** Write each namespace page using the Command Reference Template
- [ ] **Step 3:** Cross-reference report↔health, invoice↔proposal↔contract
- [ ] **Step 4:** Verify every command in the source has a corresponding entry

---

### Task 9: Command References — C4 (sow, compete, expense)

**Files:**
- Create: `docs/site/docs/commands/sow.md`
- Create: `docs/site/docs/commands/compete.md`
- Create: `docs/site/docs/commands/expense.md`

**Source material to read:**
- `development/commands/sow/` — all .md files
- `development/commands/compete/` — all .md files
- `development/commands/expense/` — all .md files
- `development/skills/sow/`, `development/skills/compete/`, `development/skills/expense/`
- `development/agents/sow/` (agent team)

- [ ] **Step 1:** Read all command and skill files for the 3 namespaces
- [ ] **Step 2:** Write each namespace page using the Command Reference Template
- [ ] **Step 3:** Cross-reference sow↔invoice↔contract, compete↔intel
- [ ] **Step 4:** Verify every command in the source has a corresponding entry

---

## Chunk 3: Command References — Part 2 (Wave 3, agents C5-C7)

### Task 10: Command References — C5 (notion, drive, slack, client, crm)

**Files:**
- Create: `docs/site/docs/commands/notion.md`
- Create: `docs/site/docs/commands/drive.md`
- Create: `docs/site/docs/commands/slack.md`
- Create: `docs/site/docs/commands/client.md`
- Create: `docs/site/docs/commands/crm.md`

**Source material to read:**
- `development/commands/<ns>/` for each namespace — all .md files
- `development/skills/<ns>/` for each namespace
- `development/agents/client/` (agent team)
- `development/_infrastructure/mcp-configs/` (MCP server configs for integrations)

- [ ] **Step 1:** Read all command and skill files for the 5 namespaces
- [ ] **Step 2:** Read MCP configs for integration context
- [ ] **Step 3:** Write each namespace page using the Command Reference Template
- [ ] **Step 4:** Cross-reference notion↔drive↔slack (integrations pillar), client↔crm
- [ ] **Step 5:** Verify every command in the source has a corresponding entry

---

### Task 11: Command References — C6 (morning, kb, ideate, social)

**Files:**
- Create: `docs/site/docs/commands/morning.md`
- Create: `docs/site/docs/commands/kb.md`
- Create: `docs/site/docs/commands/ideate.md`
- Create: `docs/site/docs/commands/social.md`

**Source material to read:**
- `development/commands/<ns>/` for each namespace — all .md files
- `development/skills/<ns>/` for each namespace
- `development/agents/social/` (agent team)

- [ ] **Step 1:** Read all command and skill files for the 4 namespaces
- [ ] **Step 2:** Write each namespace page using the Command Reference Template
- [ ] **Step 3:** Cross-reference morning→inbox+briefing, social↔newsletter, ideate↔kb
- [ ] **Step 4:** Verify every command in the source has a corresponding entry

---

### Task 12: Command References — C7 (savings, prompt, workflow, workflow-doc, learn, goal, memory, intel, scout, setup)

**Files:**
- Create: `docs/site/docs/commands/savings.md`
- Create: `docs/site/docs/commands/prompt.md`
- Create: `docs/site/docs/commands/workflow.md`
- Create: `docs/site/docs/commands/workflow-doc.md`
- Create: `docs/site/docs/commands/learn.md`
- Create: `docs/site/docs/commands/goal.md`
- Create: `docs/site/docs/commands/memory.md`
- Create: `docs/site/docs/commands/intel.md`
- Create: `docs/site/docs/commands/scout.md`
- Create: `docs/site/docs/commands/setup.md`

**Source material to read:**
- `development/commands/<ns>/` for each of the 10 namespaces — all .md files
- `development/skills/<ns>/` for each namespace
- `development/agents/intel/`, `development/agents/scout/` (agent teams)
- `development/_infrastructure/memory/` (memory command context)
- `development/_infrastructure/intelligence/` (intel command context)

- [ ] **Step 1:** Read all command and skill files for all 10 namespaces
- [ ] **Step 2:** Write each namespace page using the Command Reference Template
- [ ] **Step 3:** Cross-reference: workflow↔workflow-doc, memory↔intel, scout↔setup, learn↔goal
- [ ] **Step 4:** Verify every command in the source has a corresponding entry

---

## Chunk 4: Agent Teams + Extending (Wave 4a)

3 subagents in parallel. Depends on Wave 3 completing (for cross-references to command pages).

### Task 13: Agent Teams — D1 (inbox, briefing, prep, client, report)

**Files:**
- Create: `docs/site/docs/agents/inbox-team.md`
- Create: `docs/site/docs/agents/briefing-team.md`
- Create: `docs/site/docs/agents/prep-team.md`
- Create: `docs/site/docs/agents/client-team.md`
- Create: `docs/site/docs/agents/report-team.md`

**Source material to read:**
- `development/agents/inbox/` — all .md agent files + config.json
- `development/agents/briefing/` — all .md agent files + config.json
- `development/agents/prep/` — all .md agent files + config.json
- `development/agents/client/` — all .md agent files + config.json
- `development/agents/report/` — all .md agent files + config.json

- [ ] **Step 1:** For each team, read config.json and all agent .md files
- [ ] **Step 2:** Write each agent team page using the Agent Team Template
- [ ] **Step 3:** Include data flow diagrams showing agent coordination
- [ ] **Step 4:** Link to corresponding command reference pages

---

### Task 14: Agent Teams — D2 (invoice, sow, intel, scout, social)

**Files:**
- Create: `docs/site/docs/agents/invoice-team.md`
- Create: `docs/site/docs/agents/sow-team.md`
- Create: `docs/site/docs/agents/intel-team.md`
- Create: `docs/site/docs/agents/scout-team.md`
- Create: `docs/site/docs/agents/social-team.md`

**Source material to read:**
- `development/agents/invoice/` — all .md agent files + config.json
- `development/agents/sow/` — all .md agent files + config.json
- `development/agents/intel/` — all .md agent files + config.json
- `development/agents/scout/` — all .md agent files + config.json
- `development/agents/social/` — all .md agent files + config.json

- [ ] **Step 1:** For each team, read config.json and all agent .md files
- [ ] **Step 2:** Write each agent team page using the Agent Team Template
- [ ] **Step 3:** Include data flow diagrams showing agent coordination
- [ ] **Step 4:** Link to corresponding command reference pages

---

### Task 15: Extending Pages — D3 (custom-namespaces, workflows, scout)

**Files:**
- Create: `docs/site/docs/extending/custom-namespaces.md`
- Create: `docs/site/docs/extending/workflows.md`
- Create: `docs/site/docs/extending/scout.md`

**Source material to read:**
- `development/CLAUDE.md` (conventions for command/skill/agent structure)
- `development/commands/workflow/` (workflow commands)
- `development/commands/workflow-doc/` (workflow documentation commands)
- `development/skills/workflow/` (workflow skills)
- `development/commands/scout/` (scout commands)
- `development/skills/scout/` (scout skills)
- Example command files from any namespace (for structure reference)

**Content outlines:**

**custom-namespaces.md:**
- Directory structure: commands/, skills/, agents/
- Command file format (YAML frontmatter + markdown body)
- Skill file format (SKILL.md)
- Agent team setup (config.json + agent .md files)
- Conventions (naming, Type column, HQ DB discovery)
- Testing your namespace

**workflows.md:**
- What workflows are: chained namespace execution
- Creating a workflow: `/founder-os:workflow:create`
- Scheduling: `--schedule "expression"` flag
- Workflow SOPs: documenting with `/founder-os:workflow-doc:document`
- Example: morning automation workflow

**scout.md:**
- What scout does: discovers and installs new capabilities
- How it differs from command reference (workflow focus, not command syntax)
- Discovery pipeline: search → review → install → promote
- Source management: adding/removing capability sources
- End-to-end example: finding and installing a new namespace
- Commands used: find, install, catalog, review, promote, remove, sources

- [ ] **Step 1:** Read source material for all 3 extending pages
- [ ] **Step 2:** Write `docs/site/docs/extending/custom-namespaces.md`
- [ ] **Step 3:** Write `docs/site/docs/extending/workflows.md`
- [ ] **Step 4:** Write `docs/site/docs/extending/scout.md`
- [ ] **Step 5:** Verify cross-references to command pages and deep dives

---

## Chunk 5: Index Pages (Wave 4b)

1 subagent, runs after all prior waves complete. Index pages summarize and link to generated content.

### Task 16: Index Pages — D4 (docs home, commands index, agents index, installation)

**Files:**
- Create: `docs/site/docs/index.md`
- Create: `docs/site/docs/commands/index.md`
- Create: `docs/site/docs/agents/index.md`
- Create: `docs/site/docs/installation.md`

**Source material to read:**
- All generated content from Waves 1-4a (scan `docs/site/` for file listing)
- `development/CLAUDE.md` (project overview)
- `dist/package.json` (package name, version for installation page)

**Content:**

**docs/index.md** — Docs home / overview:
- Welcome message, what FOS is
- Quick navigation: Commands, Agents, Deep Dives, Extending
- Links to all major sections

**commands/index.md** — Command reference overview:
- The 4 pillars: Daily Work, Code Without Coding, Integrations, Meta & Growth
- Namespace table: all 35 namespaces with one-liner and link
- How to read command pages

**agents/index.md** — Agent teams overview:
- What agent teams are and when to use `--team`
- Table of all 10 teams with pattern type and link
- Common team patterns (pipeline, fan-out, lead-worker)

**installation.md** — Detailed install + config:
- Full installation walkthrough
- Configuration guide (env vars, MCP servers, Notion setup)
- Verifying the installation
- Upgrading

- [ ] **Step 1:** Scan all generated files in `docs/site/` for cross-reference links
- [ ] **Step 2:** Write `docs/site/docs/index.md` (docs home)
- [ ] **Step 3:** Write `docs/site/docs/commands/index.md` (command index with all 35 namespaces)
- [ ] **Step 4:** Write `docs/site/docs/agents/index.md` (agent teams index)
- [ ] **Step 5:** Write `docs/site/docs/installation.md` (detailed installation)
- [ ] **Step 6:** Verify all cross-reference links point to existing files

---

## Quality Gates

**After Wave 2 (Deep Dives):**
- [ ] 5 files exist in `docs/site/docs/deep-dives/`
- [ ] No placeholder text
- [ ] Technical accuracy verified against source

**After Wave 3 (Commands):**
- [ ] 35 files exist in `docs/site/docs/commands/` (34 namespaces + 1 index later)
- [ ] Every namespace from `development/commands/` has a corresponding page
- [ ] Every command action in source has an entry in its namespace page

**After Wave 4a (Agents + Extending):**
- [ ] 10 files exist in `docs/site/docs/agents/` (10 teams + 1 index later)
- [ ] 3 files exist in `docs/site/docs/extending/`
- [ ] Agent data flow diagrams included

**After Wave 4b (Indexes):**
- [ ] 4 index files exist (docs home, commands index, agents index, installation)
- [ ] All cross-reference links resolve to real files

**Final:**
- [ ] 57 total files in `docs/site/docs/`
- [ ] Combined with Plan A: 62 total files in `docs/site/`
- [ ] Commit all content
- [ ] Push to remote
