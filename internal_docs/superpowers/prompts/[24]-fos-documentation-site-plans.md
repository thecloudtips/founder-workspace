# Execution Prompt: [24] FOS Documentation Site Content

## Objective

Create two implementation plans from the spec at `docs/superpowers/specs/[24]-2026-03-18-fos-documentation-site-design.md` — one for the landing pages and one for the full documentation. Then execute both plans using subagents for parallel content generation.

## What to Do

### Step 1: Read the Spec

Read `docs/superpowers/specs/[24]-2026-03-18-fos-documentation-site-design.md` in full. This contains:
- Complete file structure (62 markdown files)
- Page templates for commands, agents, deep dives
- Tone guidelines
- 4-wave subagent generation strategy with source material per agent

### Step 2: Write Two Plans

Use `superpowers:writing-plans` to create:

**Plan A: Landing Pages**
- Path: `docs/superpowers/plans/[24a]-2026-03-19-fos-landing-pages.md`
- Scope: 5 files in `docs/site/landing/`
- Tasks: one per page (index, how-it-works, use-cases, getting-started, about)
- Each task should list: the page template from the spec, source material to read, output path

**Plan B: Documentation**
- Path: `docs/superpowers/plans/[24b]-2026-03-19-fos-documentation.md`
- Scope: 57 files in `docs/site/docs/`
- Tasks grouped by wave (Wave 2: deep dives, Wave 3: command reference, Wave 4a: agents + extending, Wave 4b: indexes)
- Each task should list: the template, source material paths, output path

### Step 3: Execute Plans

Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute.

**Execution order:**
1. Plan A (Wave 1) — 5 landing pages in parallel
2. Plan B Wave 2 — 5 deep dive pages in parallel
3. Plan B Wave 3 — 7 command reference agents in parallel (~5 namespaces each)
4. Plan B Wave 4a — 3 agents (agent teams + extending) in parallel
5. Plan B Wave 4b — 1 agent (index pages, after 4a completes)

### Source Material Locations

| Content Area | Source Path (from repo root) |
|---|---|
| Project overview | `development/CLAUDE.md` |
| Command files | `development/commands/<namespace>/<action>.md` |
| Skill files | `development/skills/<namespace>/*/SKILL.md` |
| Agent definitions | `development/agents/<namespace>/*.md` |
| Agent configs | `development/agents/<namespace>/config.json` |
| Memory engine | `development/_infrastructure/memory/` |
| Intelligence engine | `development/_infrastructure/intelligence/` |
| Dispatcher | `development/_infrastructure/dispatcher/SKILL.md` |
| Evals | `development/_infrastructure/intelligence/evals/` |
| Hooks | `dist/template/.founderOS/scripts/hooks/*.mjs` |
| Hook registry | `dist/template/.founderOS/infrastructure/hooks/hook-registry.json` |
| Settings merge | `dist/lib/settings-json.js` |
| Preflight | `development/_infrastructure/preflight/` |
| Context | `development/_infrastructure/context/` |
| Scheduling | `development/_infrastructure/scheduling/` |
| Scout | `development/commands/scout/*.md`, `development/skills/scout/` |
| Workflows | `development/commands/workflow/*.md`, `development/skills/workflow/` |
| DB templates | `development/_infrastructure/notion-db-templates/` |
| Roadmap stubs | `docs/superpowers/specs/[19]` through `[23]` |

### Subagent Instructions Template

Each content-generating subagent receives:

```
You are writing content for the Founder OS documentation site (fos.naluforge.com).

**Audience:** Founders evaluating Founder OS for adoption.
**Tone:** Professional polish with founder-friendly warmth. Authoritative and structured, but empathetic and outcome-focused. Use concrete examples. Avoid jargon — explain technical concepts for non-technical founders.

**Your assignment:** Write [PAGE_NAME]
**Output path:** docs/site/[PATH]
**Template:** [PASTE RELEVANT TEMPLATE FROM SPEC]

**Source material to read:**
[LIST OF FILES]

**Rules:**
- Write complete, publication-ready content — not stubs or placeholders
- Use real FOS commands in all examples (not placeholder names)
- Cross-reference related pages using relative markdown links
- Follow the template structure exactly
- Every command example should include a real-world scenario
- Keep the page self-contained — a reader shouldn't need to look at source code
```

### Quality Gates

After each wave completes:
- [ ] All files exist at expected paths in `docs/site/`
- [ ] No placeholder text (TODO, TBD, [insert here])
- [ ] All command examples use real `/founder-os:*` commands
- [ ] Tone is consistent with guidelines
- [ ] Cross-references use correct relative paths

### Completion

After all waves:
- [ ] 62 markdown files in `docs/site/`
- [ ] Commit all content
- [ ] Push to remote
- [ ] Report file count and any gaps
