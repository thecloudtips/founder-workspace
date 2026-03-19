# Social Content Template Engine — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. Use `/skill-creator:skill-creator` for all skill files and `/plugin-dev:command-development` for all command files.

**Goal:** Add template-driven content composition with A/B testing to the social namespace — ~90 imported templates, 3 new commands, 1 new skill.

**Architecture:** Static .md template files with YAML frontmatter stored in `skills/social/templates/`, a YAML index for fast lookup, and a performance tracking file for A/B learning. Three new commands (`compose`, `ab-test`, `templates`) integrate with the existing social namespace without modifying existing files.

**Tech Stack:** Markdown files, YAML, Notion MCP (import only), Claude Code plugin format (commands, skills)

**Spec:** `docs/superpowers/specs/[15]-2026-03-15-social-template-engine-design.md`

**Reference files to read before starting any task:**
- `commands/social/post.md` — canonical command pattern (frontmatter, skills loading, phases, observation logging)
- `commands/social/draft.md` — simpler command example
- `skills/social/platform-adaptation/SKILL.md` — canonical skill pattern (frontmatter with globs)
- `skills/social/posting-cadence/SKILL.md` — skill with globs to be modified

---

## Chunk 1: Template Import from Notion

Import ~90 templates from the private Notion DB into structured .md files. This is a dev-time task — the resulting files are committed to the repo.

### Task 1: Import templates from Notion DB

**Files:**
- Create: `founderOS/skills/social/templates/*.md` (~90 files)

**Context:** The Notion DB at `https://www.notion.so/2592776a246180669cb0ffa20b84b4ed` contains 18 monthly pages (Sep 2023 - Feb 2025). Each page has ~5 templates structured as:
- `### 📃 Template #N` header
- `**Why it works:**` explanation
- `**The template:**` with `[PLACEHOLDER]` slots
- `**Example:**` with filled content
- `**Link to post**` with LinkedIn/X URL

**Technique classification** — assign based on "why it works" content:
- `anaphora` — mentions repetition, repeated phrases, rhythm (No—No—No, Want—Want—Want)
- `reversal` — mentions surprise, flip, reverse, opposite, misdirection of expectation
- `contrarian` — mentions challenging conventional wisdom, unlearning, opposite of what people think
- `list` — numbered items, daily activities, listicle, N things
- `story` — narrative arc, storytelling, before/after, transformation
- `question` — rhetorical question, challenge question, asks the reader
- `misdirection` — lead one way then pivot, polarizing words, bait and switch
- `simplification` — breaks down overwhelming task, X-minute exercise, simple steps

**Platform classification** — determine from the linked post URL:
- URL contains `linkedin.com` → platforms includes `linkedin`
- URL contains `x.com` or `twitter.com` → platforms includes `x`
- Both URLs present → platforms: `[linkedin, x]`
- No URL → platforms: `[linkedin, x]` (default both)

- [ ] **Step 1: Fetch all 18 monthly pages from Notion DB**

Use the Notion MCP tools to fetch the database and each page:

```
Database ID: 2592776a246180669cb0ffa20b84b4ed
Data source: collection://2592776a-2461-80bb-b984-000b434a112c
```

Fetch each of the 18 pages listed in the database. Record page IDs and titles.

- [ ] **Step 2: Parse each page into individual templates**

For each monthly page, split on `### 📃 **Template #N**` or `### 📃 Template #N` headers. Extract:
1. Template name (derive from technique + distinguishing detail)
2. "Why it works" section text
3. Template body (the part with `[PLACEHOLDER]` slots)
4. Example (the filled version)
5. Post link URL(s)

- [ ] **Step 3: Classify each template's technique and platform**

Using the classification rules above, assign `technique` and `platforms` to each template.

Generate a unique `id` per template: `{mon}{yy}-{N}` format (e.g., `jan25-1`, `aug24-3`).

Generate a filename: kebab-case from the template name (e.g., `anaphora-pattern.md`, `surprise-reversal.md`). If duplicate names occur, append the source month (e.g., `contrarian-take-jan25.md`).

- [ ] **Step 4: Write each template as a .md file**

Create each file at `founderOS/skills/social/templates/{filename}.md` with this structure:

```markdown
---
id: {id}
name: {Human Readable Name}
technique: {technique}
platforms: [{platforms}]
tags: [{relevant tags from content analysis}]
source_month: "{YYYY-MM}"
---

## Why It Works

{why it works text, cleaned up}

## Template

{template body with [PLACEHOLDER] slots}

## Example

{filled example text}
```

Tags should be 3-5 descriptive words derived from the "why it works" text (e.g., `repetition`, `mobile-optimized`, `easy-read`, `contrarian`, `hook`).

- [ ] **Step 5: Verify template count and quality**

```bash
ls founderOS/skills/social/templates/*.md | wc -l
```

Expected: ~90 files (18 months × ~5 templates each). Spot-check 5 random files for correct frontmatter format.

- [ ] **Step 6: Commit templates**

```bash
cd founderOS
git add skills/social/templates/*.md
git commit -m "feat: import ~90 social media post templates from Notion DB

Each template has YAML frontmatter (id, name, technique, platforms, tags)
with Why It Works explanation, template body with placeholders, and
filled example. Imported from private Notion DB as dev-time task.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Chunk 2: Index, Performance File, and Template Engine Skill

Build the lookup infrastructure and the core skill that drives template selection.

### Task 2: Create `_index.yaml`

**Files:**
- Create: `founderOS/skills/social/templates/_index.yaml`

**Depends on:** Task 1 (need to know actual template filenames)

- [ ] **Step 1: Build the index from imported templates**

Scan all template .md files from Task 1. Group by `technique` frontmatter field. Determine section suitability (hooks/bodies/closers) and platform affinity.

Write `founderOS/skills/social/templates/_index.yaml`:

```yaml
# Template index for fast lookup
# Agent reads this first (~3KB), then loads specific .md files on demand
# Generated from imported templates — update if templates change

techniques:
  anaphora:
    - {actual filenames from import, without .md extension}
  reversal:
    - ...
  contrarian:
    - ...
  list:
    - ...
  story:
    - ...
  question:
    - ...
  misdirection:
    - ...
  simplification:
    - ...

# Which templates work well as specific post sections
# Classify based on template structure:
# - hooks: templates with strong opening lines (contrarian, question, reversal)
# - bodies: templates with rich middle structure (anaphora, list, story)
# - closers: templates with strong CTA or closing (question, simplification)
combinations:
  hooks:
    - {templates that have strong openers}
  bodies:
    - {templates with rich middle structure}
  closers:
    - {templates with strong CTAs or closings}

# ID-to-filename map for fast lookup by /social:templates show <id>
id_map:
  jan25-1: anaphora-pattern
  jan25-2: {actual filename}
  aug24-1: {actual filename}
  # ... one entry per template

# Platform suitability based on platforms field in frontmatter
platform_affinity:
  linkedin_preferred:
    - {templates with platforms: [linkedin] or long-form structure}
  x_preferred:
    - {templates with platforms: [x] or short-form structure}
  both:
    - {templates with platforms: [linkedin, x]}
```

- [ ] **Step 2: Verify index references valid files**

For each template name in `_index.yaml`, confirm the corresponding `.md` file exists in `skills/social/templates/`.

- [ ] **Step 3: Commit index**

```bash
cd founderOS
git add skills/social/templates/_index.yaml
git commit -m "feat: add template index for fast technique/platform lookup

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

### Task 3: Create empty `_performance.yaml`

**Files:**
- Create: `founderOS/skills/social/templates/_performance.yaml`

- [ ] **Step 1: Write the empty performance file**

```yaml
# Auto-generated by /social:ab-test. Do not edit manually.
# Used by /social:compose for performance-biased template selection.
# Engagement score formula: likes + (comments * 2) + (shares * 3)

pending_tests: []
tests: []
technique_scores: {}
```

- [ ] **Step 2: Commit**

```bash
cd founderOS
git add skills/social/templates/_performance.yaml
git commit -m "feat: initialize empty performance tracking file

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

### Task 4: Create `template-engine/SKILL.md`

**Files:**
- Create: `founderOS/skills/social/template-engine/SKILL.md`

**Use:** `/skill-creator:skill-creator` to create this skill file.

**Reference:** Read `skills/social/platform-adaptation/SKILL.md` for the canonical skill format (YAML frontmatter with `name`, `description`, `globs`).

- [ ] **Step 1: Create the skill file using /skill-creator**

Invoke `/skill-creator:skill-creator` with these requirements:

**Skill metadata:**
```yaml
---
name: template-engine
description: "Activates when creating content from templates. Provides template selection logic, combination strategies, and performance-based ranking."
globs: ["commands/social/compose.md", "commands/social/ab-test.md"]
---
```

**Skill content must cover these sections:**

**1. Template Selection Algorithm:**
- Step 1: Read `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/_index.yaml`
- Step 2: Filter by platform using `platform_affinity` section
- Step 3: If `--technique` specified, narrow to that technique group from `techniques` section
- Step 4: Score each template's tags against topic keywords (fuzzy match)
- Step 5: Read `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/_performance.yaml` — if exists and non-empty, boost templates from techniques with higher win rates for similar topic categories. Only apply performance bias after minimum 3 A/B tests per technique.
- Step 6: Rank and select top N candidates
- Step 7: Read selected template .md files from `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/{name}.md`

**2. Combination Strategies:**

*Technique stacking (2-3 techniques in one post):*
- Read "Why It Works" from each selected template
- Check compatibility: Anaphora + List works well; Reversal + Misdirection may clash (both redirect attention)
- Merge structures: use the strongest structural element from each
- Maintain consistent tone throughout

*Section assembly (hook + body + closer):*
- Pick hook template from `combinations.hooks` in `_index.yaml`
- Pick body template from `combinations.bodies`
- Pick closer template from `combinations.closers`
- Adapt transitions between sections for smooth flow

*Agent judgment criteria:*
- Short posts (< 500 chars): prefer technique stacking (tighter integration)
- Long posts (> 1000 chars): prefer section assembly (more structured)
- X/Twitter: always technique stacking (280 char limit demands tight integration)
- LinkedIn: either approach works

**3. Performance-Based Ranking:**
- Weight formula: 60% topic match, 40% overall win rate
- New templates (no data) get neutral score — not penalized, not boosted
- Minimum 3 tests per technique before influencing ranking
- Compare topic keywords against `best_topics` lists in `technique_scores`

**4. Engagement Score Formula:**
- `score = likes + (comments × 2) + (shares × 3)`
- Comments weighted 2x (deeper engagement signal)
- Shares weighted 3x (content worth amplifying)

- [ ] **Step 2: Verify the skill file has correct frontmatter and globs**

Confirm the file at `founderOS/skills/social/template-engine/SKILL.md` has:
- YAML frontmatter with `name`, `description`, `globs`
- `globs` includes both `commands/social/compose.md` and `commands/social/ab-test.md`
- All file paths use `${CLAUDE_PLUGIN_ROOT}` prefix

**Note:** The command files referenced in globs (`compose.md`, `ab-test.md`) will be created in Wave 2. Globs are path patterns for skill auto-injection — the referenced files do not need to exist at creation time.

- [ ] **Step 3: Commit**

```bash
cd founderOS
git add skills/social/template-engine/SKILL.md
git commit -m "feat: add template-engine skill with selection and combination logic

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Chunk 3: Commands

Three new command .md files following the existing social namespace conventions.

### Task 5: Create `commands/social/compose.md`

**Files:**
- Create: `founderOS/commands/social/compose.md`

**Use:** `/plugin-dev:command-development` to create this command file.

**Reference:** Read `commands/social/post.md` for the canonical command pattern:
- YAML frontmatter (`description`, `argument-hint`, `allowed-tools`, `execution-mode`, `result-format`)
- Skills loading section (numbered list of skill files to read)
- Business Context check
- Preflight Check
- Step 0: Memory Context
- Intelligence: Apply Learned Patterns
- Phased execution
- Output
- Notion DB Logging (Optional)
- Self-Healing: Error Recovery
- Final Step: Observation Logging
- Intelligence: Post-Command

- [ ] **Step 1: Create the command file using /plugin-dev:command-development**

The command file must have:

**Frontmatter:**
```yaml
---
description: Create social media content using template library with intelligent selection and combination
argument-hint: '"topic" [--technique=name] [--pick=N] [--combine] [--platform=linkedin|x] [--audience=hint] [--variations=N] [--to-file=path]'
allowed-tools: ["Read"]
execution-mode: background
result-format: full
---
```

**Skills section (numbered):**
1. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/template-engine/SKILL.md` — template selection, combination, ranking
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/platform-adaptation/SKILL.md` — per-platform rules
3. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
4. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/social-humanization.md`

**Arguments table:** (from spec — topic, --technique, --pick, --combine, --platform, --audience, --variations, --to-file)

**Note on --to-post omission:** Include the note from the spec explaining that background subagents cannot invoke other commands. The dispatcher result includes a "Next step" suggestion.

**Execution phases:**
- Phase 1/3: Template Selection — read `_index.yaml`, read `_performance.yaml`, match by technique/platform/topic, apply performance bias
- Phase 2/3: Template Loading & Generation — read selected .md files, fill placeholders (single or combine mode), adapt for platform
- Phase 3/3: Output — display post(s) with template attribution, character count, "Next step" suggestion

**Output format:** Show generated post text, template(s) used, character count vs platform limit, and "Next step: Run `/social:post \"...\" --platforms=<platform>` to publish"

- [ ] **Step 2: Verify command follows conventions**

Check against `commands/social/post.md`:
- [ ] Has Business Context section
- [ ] Has Preflight Check section (for compose: skip `late` check since Read-only, but include section for convention)
- [ ] Has Step 0: Memory Context
- [ ] Has Intelligence: Apply Learned Patterns
- [ ] Has Self-Healing: Error Recovery
- [ ] Has Final Step: Observation Logging
- [ ] Has Intelligence: Post-Command
- [ ] All file paths use `${CLAUDE_PLUGIN_ROOT}`

- [ ] **Step 3: Commit**

```bash
cd founderOS
git add commands/social/compose.md
git commit -m "feat: add /social:compose command for template-based content creation

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

### Task 6: Create `commands/social/ab-test.md`

**Files:**
- Create: `founderOS/commands/social/ab-test.md`

**Use:** `/plugin-dev:command-development`

- [ ] **Step 1: Create the command file**

**Frontmatter:**
```yaml
---
description: Generate and test two content variants using different templates, track engagement, log results
argument-hint: '"topic" --platforms=linkedin [--measure-after=72] [--stagger=48] [--templates=a,b] [--check]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---
```

**Why foreground:** This is an intentional exception to the background convention. The ab-test command has an interactive user approval step (Phase 1: approve variants before publishing) that cannot be delegated to a background subagent. Only 3 other commands use foreground (`setup/verify.md`, `savings/configure.md`, `setup/notion-cli.md`).

**Skills section:**
1. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/template-engine/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/platform-adaptation/SKILL.md`
3. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/posting-cadence/SKILL.md` — for stagger timing
4. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
5. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-publish/SKILL.md`
6. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-status/SKILL.md` — for analytics
7. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
8. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/social-humanization.md`

**Two-invocation model:** Document clearly that this is a two-step process:

*Invocation 1 (without --check):*
- Phase 1/2: Generate variant A and B using different templates, display side-by-side for approval
- Phase 2/2: Post variant A via `social:post` pipeline, schedule variant B +stagger hours, write pending test to `_performance.yaml` pending_tests section

*Invocation 2 (with --check):*
- Phase 1/2: Read pending_tests from `_performance.yaml`, fetch analytics via `late-tool.mjs analytics get` for both post IDs. If Late.dev Analytics unavailable, ask user for manual engagement numbers.
- Phase 2/2: Calculate scores, determine winner, move from pending_tests to tests, update technique_scores, display summary

**Graceful degradation:** When Late.dev analytics add-on is not available, ask user to provide likes, comments, shares from their native LinkedIn/X analytics dashboard.

- [ ] **Step 2: Verify command follows conventions** (same checklist as Task 5 Step 2)

- [ ] **Step 3: Commit**

```bash
cd founderOS
git add commands/social/ab-test.md
git commit -m "feat: add /social:ab-test command for template A/B testing

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

### Task 7: Create `commands/social/templates.md`

**Files:**
- Create: `founderOS/commands/social/templates.md`

**Use:** `/plugin-dev:command-development`

- [ ] **Step 1: Create the command file**

**Frontmatter:**
```yaml
---
description: Browse template library, view individual templates, and check A/B test performance stats
argument-hint: "list|show|stats [--technique=name]"
allowed-tools: ["Read"]
execution-mode: foreground
result-format: full
---
```

**Subcommands:**
- `list [--technique=name]` — read `_index.yaml`, display all templates grouped by technique. If `--technique` specified, filter to that technique group.
- `show <id>` — look up filename from `_index.yaml` `id_map` section, then read the matching .md file. No need to scan all template files.
- `stats` — read `_performance.yaml`, display technique win/loss rates, best topics, recent test results.

This is the simplest command — read-only, no external API calls, no publishing.

- [ ] **Step 2: Verify command follows conventions**

- [ ] **Step 3: Commit**

```bash
cd founderOS
git add commands/social/templates.md
git commit -m "feat: add /social:templates command for library browsing and stats

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Chunk 4: Integration and Finalization

### Task 8: Update `posting-cadence/SKILL.md` globs

**Files:**
- Modify: `founderOS/skills/social/posting-cadence/SKILL.md:4`

- [ ] **Step 1: Read current globs**

```bash
head -5 founderOS/skills/social/posting-cadence/SKILL.md
```

Current: `globs: ["commands/social/schedule.md", "commands/social/queue.md"]`

- [ ] **Step 2: Add ab-test.md to globs**

Change line 4 to:
```yaml
globs: ["commands/social/schedule.md", "commands/social/queue.md", "commands/social/ab-test.md"]
```

- [ ] **Step 3: Commit**

```bash
cd founderOS
git add skills/social/posting-cadence/SKILL.md
git commit -m "fix: add ab-test to posting-cadence skill globs

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

### Task 9: Update CLAUDE.md namespace table

**Files:**
- Modify: `founderOS/CLAUDE.md` (namespace table row for social)

- [ ] **Step 1: Find the social namespace row in the table**

Search for `| 33 | Social Media | \`social\`` in `founderOS/CLAUDE.md`.

- [ ] **Step 2: Add compose, ab-test, templates to the command list**

Update the commands column to include the 3 new commands:
```
post, cross-post, schedule, draft, status, reply, analytics, queue, connect, profiles, webhooks, compose, ab-test, templates
```

- [ ] **Step 3: Commit**

```bash
cd founderOS
git add CLAUDE.md
git commit -m "docs: add compose, ab-test, templates to social namespace

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

### Task 10: Push founderOS, update workspace root

- [ ] **Step 1: Push founderOS submodule**

```bash
cd founderOS
git push
```

- [ ] **Step 2: Update workspace root submodule pointer**

```bash
cd /Users/lhalicki/coding_projects/founder-workspace
git add founderOS
git commit -m "feat: update founderOS submodule (social template engine implementation)

Adds ~90 post templates, template-engine skill, and 3 new commands
(compose, ab-test, templates) to the social namespace per spec [15].

Co-Authored-By: claude-flow <ruv@ruv.net>"
git push
```

---

## Subagent Execution Strategy

This plan uses `/superpowers:subagent-driven-development` with the following waves:

**Wave 1 (parallel subagents):**
- Subagent A: Task 1 (import templates from Notion — this is the heaviest task)
- Subagent B: Task 4 (create template-engine skill using /skill-creator)

**Wave 2 (parallel subagents, depends on Wave 1):**
- Subagent C: Task 2 (build _index.yaml — needs Task 1 filenames)
- Subagent D: Task 3 (create empty _performance.yaml — trivial, can run alongside)
- Subagent E: Task 5 (compose command using /plugin-dev:command-development)
- Subagent F: Task 6 (ab-test command using /plugin-dev:command-development)
- Subagent G: Task 7 (templates command using /plugin-dev:command-development)

Note: Tasks 5-7 only need to reference the skill by path (they don't need the actual content to exist yet, since commands just reference skill paths with `${CLAUDE_PLUGIN_ROOT}`). So they can run in Wave 2 alongside index creation.

**Wave 3 (sequential):**
- Task 8 (update posting-cadence globs)
- Task 9 (update CLAUDE.md)
- Task 10 (push and update submodule)
