# FOS Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate 5 publication-ready marketing pages for the Founder OS documentation site at `docs/site/landing/`.

**Architecture:** Each page is an independent markdown file written by a parallel subagent. All 5 tasks can run concurrently with no dependencies between them.

**Tech Stack:** Markdown content files — no code, no tests. Quality is measured by completeness, tone, and use of real FOS commands.

**Spec:** `docs/superpowers/specs/[24]-2026-03-18-fos-documentation-site-design.md`

**Subagent template (apply to all tasks):**
```
You are writing content for the Founder OS documentation site (fos.naluforge.com).

Audience: Founders evaluating Founder OS for adoption.
Tone: Professional polish with founder-friendly warmth. Authoritative and structured, but empathetic and outcome-focused. Use concrete examples. Avoid jargon — explain technical concepts for non-technical founders.

Rules:
- Write complete, publication-ready content — not stubs or placeholders
- Use real FOS commands in all examples (not placeholder names)
- Cross-reference related pages using relative markdown links (e.g., ../docs/commands/inbox.md)
- Follow the template structure exactly
- Every command example should include a real-world scenario
- Keep the page self-contained — a reader shouldn't need to look at source code
```

---

## Chunk 1: Landing Pages (Wave 1)

All 5 tasks run in parallel. Each subagent reads its source material, then writes a single markdown file.

### Task 1: Homepage

**Files:**
- Create: `docs/site/landing/index.md`

**Source material to read:**
- `development/CLAUDE.md` (project overview, namespace list, pillar breakdown)
- `development/commands/` (scan directory listing for namespace count)
- `development/agents/` (scan directory listing for team count)

**Template from spec — sections to include:**

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

- [ ] **Step 1:** Read source material listed above
- [ ] **Step 2:** Write `docs/site/landing/index.md` following the template exactly
- [ ] **Step 3:** Verify no placeholder text (TODO, TBD, [insert])
- [ ] **Step 4:** Verify all commands use real `/founder-os:*` syntax

---

### Task 2: How It Works

**Files:**
- Create: `docs/site/landing/how-it-works.md`

**Source material to read:**
- `development/CLAUDE.md` (installation flow, first-run experience)
- `development/commands/inbox/triage.md` (first command example)
- `development/commands/briefing/` (first command example)
- `development/commands/prep/` (first command example)
- `development/commands/scout/` (extend step example)
- `development/commands/workflow/` (extend step example)
- `development/_infrastructure/memory/` (learn step example)
- `development/_infrastructure/intelligence/` (learn step example)

**Template — 5 steps, each with title, one-liner, 2-3 paragraph explanation, concrete command + what happens:**

1. **Install** — npx command, 30 seconds, what gets created
2. **Configure** — Notion API key, gws auth, env vars
3. **Use** — First commands: `/inbox triage`, `/briefing`, `/prep`
4. **Learn** — Memory + intelligence adapt over time, auto-adaptations
5. **Extend** — Scout finds new capabilities, workflows chain commands

- [ ] **Step 1:** Read source material listed above
- [ ] **Step 2:** Write `docs/site/landing/how-it-works.md` following the 5-step template
- [ ] **Step 3:** Verify each step has a real command example with output description
- [ ] **Step 4:** Verify no placeholder text

---

### Task 3: Use Cases

**Files:**
- Create: `docs/site/landing/use-cases.md`

**Source material to read:**
- `development/commands/morning/` (solopreneur persona)
- `development/commands/inbox/` (solopreneur persona)
- `development/commands/briefing/` (solopreneur persona)
- `development/commands/health/` (solopreneur persona)
- `development/commands/review/` (solopreneur persona)
- `development/commands/client/` (agency persona)
- `development/commands/sow/` (agency persona)
- `development/commands/invoice/` (agency persona)
- `development/commands/crm/` (agency persona)
- `development/commands/report/` (agency persona)
- `development/commands/prep/` (consultant persona)
- `development/commands/proposal/` (consultant persona)
- `development/commands/contract/` (consultant persona)
- `development/commands/expense/` (consultant persona)
- `development/commands/followup/` (consultant persona)
- `development/commands/compete/` (SaaS persona)
- `development/commands/newsletter/` (SaaS persona)
- `development/commands/goal/` (SaaS persona)
- `development/commands/learn/` (SaaS persona)
- `development/commands/ideate/` (SaaS persona)

**Template — 4 founder personas, each with:**
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

- [ ] **Step 1:** Read source material for all 4 personas (scan command files for capabilities)
- [ ] **Step 2:** Write `docs/site/landing/use-cases.md` with all 4 personas
- [ ] **Step 3:** Verify each persona uses real FOS commands in their scenario
- [ ] **Step 4:** Verify before/after framing is concrete (specific time savings, not vague)

---

### Task 4: Getting Started

**Files:**
- Create: `docs/site/landing/getting-started.md`

**Source material to read:**
- `dist/bin/founder-os.js` (CLI entry point)
- `dist/lib/installer.js` or `development/install.sh` (installation flow)
- `development/CLAUDE.md` (project overview)
- `development/_infrastructure/preflight/` (dependency checks)
- `development/commands/inbox/triage.md` (first command to try)
- `development/commands/briefing/` (second command to try)
- `development/commands/morning/` (morning routine)
- `development/commands/setup/` (setup commands)

**Template sections:**
- Prerequisites (Claude Code, Node 18+, Notion account optional)
- Installation walkthrough with expected output
- First 5 commands to try (with what to expect)
- Configuration deep dive (env vars, MCP servers, business context setup)
- Troubleshooting common issues

- [ ] **Step 1:** Read source material listed above
- [ ] **Step 2:** Write `docs/site/landing/getting-started.md` following the template
- [ ] **Step 3:** Verify installation commands are accurate (check dist/package.json for package name)
- [ ] **Step 4:** Verify first 5 commands are real and produce described output

---

### Task 5: About

**Files:**
- Create: `docs/site/landing/about.md`

**Source material to read:**
- `development/CLAUDE.md` (project context)
- `docs/superpowers/specs/[19]-2026-03-18-obsidian-integration-design.md` (roadmap)
- `docs/superpowers/specs/[20]-2026-03-18-remotion-skill-design.md` (roadmap)
- `docs/superpowers/specs/[21]-2026-03-18-landing-page-builder-design.md` (roadmap)
- `docs/superpowers/specs/[22]-2026-03-18-meta-ads-campaign-design.md` (roadmap)
- `docs/superpowers/specs/[23]-2026-03-18-google-ads-campaign-design.md` (roadmap)

**Template sections:**
- NaluForge company mission
- Open-core philosophy: free tool, own your data, extend freely
- Technology choices: why Claude Code, why Notion, why SQLite
- Builder story (focus on the indie builder persona, not a corporate team page)
- Roadmap teaser: Obsidian integration, Remotion video, Landing Pages, Ads management

- [ ] **Step 1:** Read source material listed above (including all 5 roadmap spec stubs)
- [ ] **Step 2:** Write `docs/site/landing/about.md` following the template
- [ ] **Step 3:** Verify builder story is indie/founder-focused, not corporate
- [ ] **Step 4:** Verify roadmap teasers reference real planned features from specs

---

## Quality Gate (after all 5 tasks complete)

- [ ] All 5 files exist at `docs/site/landing/`
- [ ] No placeholder text (TODO, TBD, [insert here])
- [ ] All command examples use real `/founder-os:*` commands
- [ ] Tone is consistent: professional warmth, outcome-focused
- [ ] Cross-references use correct relative paths
- [ ] Commit all 5 files
