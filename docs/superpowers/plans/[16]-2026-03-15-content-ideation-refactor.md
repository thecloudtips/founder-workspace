# Content Ideation Namespace Refactor — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `linkedin` namespace with a broadened `ideate` namespace covering LinkedIn, X, Meta (FB+IG), and TikTok for multi-platform content ideation.

**Architecture:** 6 commands + 3 generalized skills + 3 reference files. All markdown prompt files — no executable code. Skills are generalized from existing LinkedIn-specific skills by adding platform sections. Commands adapted from existing linkedin commands by removing Notion/publishing integration and adding `--platform` awareness.

**Tech Stack:** Markdown with YAML frontmatter (Founder OS plugin format)

**Spec:** `docs/superpowers/specs/[16]-2026-03-15-linkedin-content-ideation-refactor-design.md`

---

## Chunk 1: Skills (Wave 1A)

Create the 3 generalized skills from existing LinkedIn skills. These must exist before commands, since commands reference them via `${CLAUDE_PLUGIN_ROOT}/skills/ideate/`.

### Task 1: Create content-writing skill

**Files:**
- Read: `founderOS/skills/linkedin/linkedin-writing/SKILL.md` (source — copy and generalize)
- Read: `founderOS/skills/linkedin/linkedin-writing/references/post-frameworks.md` (source reference)
- Create: `founderOS/skills/ideate/content-writing/SKILL.md`
- Create: `founderOS/skills/ideate/content-writing/references/post-frameworks.md`

- [ ] **Step 1: Read the source skill file**

Read `founderOS/skills/linkedin/linkedin-writing/SKILL.md` in full. This is the canonical source — you will preserve all LinkedIn content and add platform sections.

- [ ] **Step 2: Create the generalized content-writing skill**

Create `founderOS/skills/ideate/content-writing/SKILL.md`. Start from the linkedin-writing source and make these changes:

1. **Frontmatter**: Change `name` to `content-writing`, update `description` to mention multi-platform, change `globs` to `["commands/ideate/*.md"]`
2. **Title**: Change from "LinkedIn Writing" to "Content Writing"
3. **Purpose and Context**: Generalize to mention all platforms. Change command references from `linkedin:post` etc to `ideate:draft`, `ideate:variations`, `ideate:from-doc`.
4. **Keep all LinkedIn sections intact** — do not modify existing LinkedIn rules, lengths, formatting, hashtags, audience segments, quality checklist
5. **Add new platform sections** after the LinkedIn content. For each platform, add:

   **X/Twitter Section:**
   - Post length: 280 char per tweet, thread structure for longer content
   - Thread rules: split at paragraph boundaries, each tweet standalone-readable, (1/N) suffix, first tweet = hook, last = CTA
   - Formatting: plain text only, no markdown, no bold, 1-2 inline hashtags max
   - Length modes: Short (<280 chars, single tweet), Medium (2-3 tweet thread), Long (4-7 tweet thread)
   - Hashtag rules: 1-2 inline, trending-aware, no hashtag-only tweets

   **Meta (Facebook) Section:**
   - Post length: 500 char sweet spot for engagement, max ~63k chars
   - Formatting: visual-first, link in comments for reach, storytelling format
   - Length modes: Short (<200 chars), Medium (300-500 chars), Long (500-1000 chars)
   - Hashtag rules: 1-3 max, less critical than other platforms

   **Meta (Instagram) Section:**
   - Caption length: 2200 char max, first line = scroll-stop (truncated at ~125 chars)
   - Formatting: visual context required (caption supports content, not standalone)
   - Hashtag rules: 20-30 hashtags in first comment (not caption), mix broad + niche
   - Length modes: Short (<125 chars), Medium (300-800 chars), Long (1000-2200 chars)

   **TikTok Section:**
   - Caption length: 150 char max (was 300, reduced in 2025)
   - Formatting: trend hooks, CTA in caption, hashtag challenges
   - Hashtag rules: 3-5 relevant hashtags including trending ones
   - Length modes: only Short applies (150 char limit)
   - Script notes: if used for video script ideation, structure as hook (3 sec) → body (15-45 sec) → CTA (5 sec)

6. **Generalize the Quality Checklist** at the end — add a note that platform-specific formatting (hashtags, character limits) is handled by `social:compose`, not by the ideate commands. The ideate-level checklist focuses on content quality, not platform formatting.

- [ ] **Step 3: Create the reference file**

Read `founderOS/skills/linkedin/linkedin-writing/references/post-frameworks.md` in full. Create `founderOS/skills/ideate/content-writing/references/post-frameworks.md` by copying the LinkedIn frameworks and adding platform-specific variant notes for each framework:

For each of the 7 frameworks (Story, Listicle, Contrarian, How-To, Personal Lesson, Industry Insight, Question-Led), add a subsection:

```markdown
### Platform Variants

**X/Twitter**: [how this framework adapts to thread format]
**Meta (FB)**: [visual-first adaptation notes]
**Meta (IG)**: [caption-as-supplement adaptation]
**TikTok**: [script structure adaptation for short-form]
```

- [ ] **Step 4: Verify file structure**

Run: `ls -la founderOS/skills/ideate/content-writing/` and `ls -la founderOS/skills/ideate/content-writing/references/`

Expected: `SKILL.md` exists, `references/post-frameworks.md` exists.

Verify frontmatter: grep for `name: content-writing` and `globs:` in SKILL.md.

- [ ] **Step 5: Commit**

```bash
git add founderOS/skills/ideate/content-writing/
git commit -m "feat(ideate): create content-writing skill generalized from linkedin-writing

Adds platform sections for X/Twitter, Meta (FB+IG), and TikTok
alongside existing LinkedIn content. Part of [16] namespace refactor."
```

### Task 2: Create hook-creation skill

**Files:**
- Read: `founderOS/skills/linkedin/hook-creation/SKILL.md` (source)
- Read: `founderOS/skills/linkedin/hook-creation/references/hook-templates.md` (source reference)
- Create: `founderOS/skills/ideate/hook-creation/SKILL.md`
- Create: `founderOS/skills/ideate/hook-creation/references/hook-templates.md`

- [ ] **Step 1: Read the source skill file**

Read `founderOS/skills/linkedin/hook-creation/SKILL.md` in full.

- [ ] **Step 2: Create the generalized hook-creation skill**

Create `founderOS/skills/ideate/hook-creation/SKILL.md`. Start from the linkedin source and make these changes:

1. **Frontmatter**: Change `description` to mention multi-platform hooks, change `globs` to `["commands/ideate/*.md"]`
2. **Title/Purpose**: Generalize references from LinkedIn-only to multi-platform. Change command references to `ideate:draft`, `ideate:variations`.
3. **Keep all 6 hook formulas intact** (Stat-Led, Question, Story, Contrarian, Bold Claim, Pattern Interrupt)
4. **Keep Hook Length Rules** for LinkedIn but add a new section **Platform-Specific Hook Constraints**:

   ```markdown
   ## Platform-Specific Hook Constraints

   ### LinkedIn
   - Maximum 210 characters above the "see more" fold
   - 1-3 lines, curiosity gap must land before fold
   - (All existing LinkedIn rules apply — see above)

   ### X/Twitter
   - Entire first tweet IS the hook (280 chars max)
   - Under 50 characters ideal for maximum retweet potential
   - Pattern interrupt and contrarian formulas work best
   - No fold — the hook must also deliver value standalone

   ### Meta (Facebook)
   - First ~100 chars visible in feed before "See more"
   - Emotional resonance and identification triggers work best
   - Visual context hooks: reference the image/video that accompanies
   - Storytelling hooks outperform stat-led on FB

   ### Meta (Instagram)
   - First line of caption (~125 chars) is all that shows
   - Hook must reference or complement the visual
   - Behind-the-scenes and authenticity hooks outperform corporate
   - Question hooks drive comment engagement

   ### TikTok
   - First 3 words are decisive (scrolling speed)
   - Pattern interrupt is the dominant hook formula
   - Trend reference hooks: tie to current sounds/challenges
   - Direct address ("You need to stop...") outperforms third-person
   ```

5. **Keep Framework-Specific Hook Guidance table** and **Audience-Specific Hook Adjustments** — these are already platform-agnostic.
6. **Keep Engagement Triggers, Anti-Patterns, Hook Quality Checklist** sections unchanged.

- [ ] **Step 3: Create the reference file**

Read `founderOS/skills/linkedin/hook-creation/references/hook-templates.md`. Create `founderOS/skills/ideate/hook-creation/references/hook-templates.md` by copying LinkedIn examples and adding 2-3 examples per hook formula for each new platform (X, Meta FB, Meta IG, TikTok).

- [ ] **Step 4: Verify and commit**

```bash
ls -la founderOS/skills/ideate/hook-creation/references/
grep -n "name: hook-creation" founderOS/skills/ideate/hook-creation/SKILL.md
grep -n "globs:" founderOS/skills/ideate/hook-creation/SKILL.md
git add founderOS/skills/ideate/hook-creation/
git commit -m "feat(ideate): create hook-creation skill with multi-platform hooks

Adds platform-specific hook constraints for X, Meta (FB+IG), and
TikTok. All 6 hook formulas preserved. Part of [16] namespace refactor."
```

### Task 3: Create founder-voice skill

**Files:**
- Read: `founderOS/skills/linkedin/founder-voice/SKILL.md` (source)
- Read: `founderOS/skills/linkedin/founder-voice/references/voice-examples.md` (source reference)
- Create: `founderOS/skills/ideate/founder-voice/SKILL.md`
- Create: `founderOS/skills/ideate/founder-voice/references/voice-examples.md`

- [ ] **Step 1: Read the source skill file**

Read `founderOS/skills/linkedin/founder-voice/SKILL.md` in full.

- [ ] **Step 2: Create the generalized founder-voice skill**

Create `founderOS/skills/ideate/founder-voice/SKILL.md`. This skill is already mostly platform-agnostic (tone, rhythm, opinion patterns). Changes:

1. **Frontmatter**: Update `description` to mention multi-platform, change `globs` to `["commands/ideate/*.md"]`
2. **Title/Purpose**: Generalize from "LinkedIn post content" to "social media content". Update command references.
3. **Keep ALL existing sections unchanged**: Tone Profile, Tone Boundaries, Sentence Patterns, Opinion Injection, Practical Framing, Storytelling Patterns, Anti-Patterns, Voice Reference Examples
4. **Add one new section** — **Platform Tone Calibration** — after Anti-Patterns:

   ```markdown
   ## Platform Tone Calibration

   The founder voice core (professional, conversational, opinionated) applies everywhere. Calibrate these dials per platform:

   ### LinkedIn
   - Baseline founder voice — no adjustments needed
   - Professional-conversational, opinionated, evidence-backed
   - Sentence patterns and rhythm rules apply as written above

   ### X/Twitter
   - Dial up: directness, punch, contrarian edge
   - Dial down: sentence length (max 20 words), setup length
   - Tone shift: more casual contractions, shorter paragraphs
   - OK to be more provocative — X rewards bold takes
   - Thread rhythm: each tweet should hit like a headline

   ### Meta (Facebook)
   - Dial up: warmth, personal storytelling, relatability
   - Dial down: corporate authority, data-heavy arguments
   - Tone shift: more "talking to friends" than "talking to peers"
   - Vulnerability and authenticity outperform authority on FB
   - Visual references encouraged ("see this photo...")

   ### Meta (Instagram)
   - Dial up: authenticity, behind-the-scenes, lifestyle integration
   - Dial down: formal business language, lengthy arguments
   - Tone shift: intimate, personal, visually grounded
   - Caption supports the visual — not standalone content
   - Short sentences work even better than on LinkedIn

   ### TikTok
   - Dial up: energy, directness, trend awareness
   - Dial down: formality, lengthy explanations
   - Tone shift: fast-paced, "talking to camera" energy
   - Gen-Z adaptable: comfortable with internet culture references
   - High energy first 3 seconds, steady value delivery after
   ```

- [ ] **Step 3: Create the reference file**

Read `founderOS/skills/linkedin/founder-voice/references/voice-examples.md`. Create `founderOS/skills/ideate/founder-voice/references/voice-examples.md` by copying LinkedIn examples and adding platform-specific before/after rewrites showing tone shifts for X, Meta, and TikTok.

- [ ] **Step 4: Verify and commit**

```bash
ls -la founderOS/skills/ideate/founder-voice/references/
grep -n "name:" founderOS/skills/ideate/founder-voice/SKILL.md
git add founderOS/skills/ideate/founder-voice/
git commit -m "feat(ideate): create founder-voice skill with platform calibration

Adds Platform Tone Calibration section for X, Meta (FB+IG), and
TikTok. Core voice principles unchanged. Part of [16] namespace refactor."
```

---

## Chunk 2: Modified Commands (Wave 1B — after Chunk 1)

Adapt the 3 existing linkedin commands into ideate commands. These commands reference the skills from Chunk 1 via `${CLAUDE_PLUGIN_ROOT}/skills/ideate/` paths. **Execute after Chunk 1 is committed** — the verification steps in each task grep for stale references which requires the skill files to exist at their new paths.

### Task 4: Create ideate:draft command (from linkedin:post)

**Files:**
- Read: `founderOS/commands/linkedin/post.md` (source — adapt)
- Read: `docs/superpowers/specs/[16]-2026-03-15-linkedin-content-ideation-refactor-design.md` (spec sections: `ideate:draft`, Universal Execution Flow)
- Create: `founderOS/commands/ideate/draft.md`

- [ ] **Step 1: Read the source command**

Read `founderOS/commands/linkedin/post.md` in full. Understand the 3-phase structure and all sections.

- [ ] **Step 2: Read the spec for ideate:draft**

Read the spec file, specifically the `ideate:draft` section (lines 103-165) and Universal Execution Flow (lines 85-99).

- [ ] **Step 3: Create ideate:draft command**

Create `founderOS/commands/ideate/draft.md`. Adapt from `linkedin:post` with these specific changes:

**Frontmatter:**
```yaml
---
description: Generate raw content from a topic with framework selection, audience targeting, and founder voice
argument-hint: "[topic] [--platform=linkedin|x|meta|tiktok] [--audience=founder|technical|marketer|cxo] [--framework=story|listicle|contrarian|howto|lesson|insight|question] [--length=short|medium|long] [--to-file=PATH]"
allowed-tools: ["Read", "Write"]
execution-mode: background
result-format: summary
---
```

**Load Skills section**: Change paths from `skills/linkedin/` to `skills/ideate/`:
- `${CLAUDE_PLUGIN_ROOT}/skills/ideate/content-writing/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/ideate/hook-creation/SKILL.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/ideate/founder-voice/SKILL.md`
- Keep `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
- Keep `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/linkedin-humanization.md`

**Parse Arguments**: Add `--platform` flag (linkedin|x|meta|tiktok, default: linkedin). Replace `--output` with `--to-file` (optional, no default path).

**Business Context, Preflight, Memory, Intelligence sections**: Keep same structure. Change `plugin` references from `linkedin-post` to `ideate` and `command` from `linkedin-post` to `ideate-draft`.

**Phase 1 — Ideation**: Keep same logic. Add platform awareness note: "Consider platform when selecting framework — TikTok favors pattern-interrupt, X favors contrarian, Meta favors story."

**Phase 2 — Draft**: Keep same writing logic. Remove: character limit enforcement per linkedin, hashtag generation. Add: "Platform-aware length guidance but no platform-specific formatting."

**Phase 3 — Validate and Output**: Replace the formatted LinkedIn output with the content brief format from spec (lines 145-165). Remove hashtag block. Remove "File saved" line (only if `--to-file`). Add "Next step" suggestion.

**REMOVE entirely**: Notion Integration section, Graceful Degradation section (about Notion), the default file output to `linkedin-posts/` directory.

**Keep**: Self-Healing, Observation Start/End, Final Memory Update sections (adapt plugin/command names).

- [ ] **Step 4: Verify structure**

Check that the file has all required sections in order:
1. Frontmatter (yaml)
2. Load Skills
3. Parse Arguments
4. Business Context
5. Preflight Check
6. Step 0: Memory Context
7. Observation: Start
8. Intelligence: Apply Learned Patterns
9. Self-Healing
10. Phase 1 — Ideation
11. Phase 2 — Draft
12. Phase 3 — Validate and Output
13. Observation: End
14. Final: Memory Update
15. Usage Examples

Verify NO references to Notion, `[FOS] Content`, `linkedin-posts/`, Late.dev, or `linkedin:` commands remain.

- [ ] **Step 5: Commit**

```bash
git add founderOS/commands/ideate/draft.md
git commit -m "feat(ideate): create draft command adapted from linkedin:post

Removes Notion/publishing integration, adds --platform flag,
outputs content briefs. Part of [16] namespace refactor."
```

### Task 5: Create ideate:from-doc command (from linkedin:from-doc)

**Files:**
- Read: `founderOS/commands/linkedin/from-doc.md` (source)
- Read: spec file, `ideate:from-doc` section (lines 167-202)
- Create: `founderOS/commands/ideate/from-doc.md`

- [ ] **Step 1: Read source and spec**

Read `founderOS/commands/linkedin/from-doc.md` and the spec section.

- [ ] **Step 2: Create ideate:from-doc command**

Create `founderOS/commands/ideate/from-doc.md`. Same adaptation pattern as Task 4:

- Update frontmatter: change description, use `--platforms` (plural, comma-separated), add `--to-file`, remove `--output`
- Update skill paths to `skills/ideate/`
- Update plugin/command names in Intelligence and Observation sections to `ideate`/`ideate-from-doc`
- Add platform awareness to Phase 1 extraction: "Platform awareness influences angle ranking — data-heavy angles rank higher for LinkedIn, visual/action angles for TikTok"
- Phase 2: if `--platforms` specified, generate separate angle recommendations per platform
- Phase 3: output content brief with source attribution, not formatted post
- REMOVE: Notion Integration, Graceful Degradation (Notion), default file output, hashtag generation

- [ ] **Step 3: Verify no stale references**

```bash
grep -n "Notion\|FOS\] Content\|linkedin-posts/\|Late.dev\|linkedin:" founderOS/commands/ideate/from-doc.md
```

Expected: zero results. If any remain, fix them.

- [ ] **Step 4: Commit**

```bash
git add founderOS/commands/ideate/from-doc.md
git commit -m "feat(ideate): create from-doc command adapted from linkedin:from-doc

Multi-platform angle extraction, no Notion/publishing.
Part of [16] namespace refactor."
```

### Task 6: Create ideate:variations command (from linkedin:variations)

**Files:**
- Read: `founderOS/commands/linkedin/variations.md` (source)
- Read: spec file, `ideate:variations` section (lines 204-233)
- Create: `founderOS/commands/ideate/variations.md`

- [ ] **Step 1: Read source and spec**

Read `founderOS/commands/linkedin/variations.md` and the spec section.

- [ ] **Step 2: Create ideate:variations command**

Create `founderOS/commands/ideate/variations.md`. Adapt:

- Update frontmatter: add `--platform` flag
- Update skill paths to `skills/ideate/`
- Update plugin/command names to `ideate`/`ideate-variations`
- Add `--platform` to Parse Arguments section
- Variations output content briefs, not formatted posts
- Output comparison table includes platform fit notes
- Keep ephemeral behavior (no file, no Notion) — this was already the case
- REMOVE any linkedin-specific references

- [ ] **Step 3: Verify no stale references**

```bash
grep -n "Notion\|FOS\] Content\|linkedin-posts/\|Late.dev\|linkedin:" founderOS/commands/ideate/variations.md
```

Expected: zero results. If any remain, fix them.

- [ ] **Step 4: Commit**

```bash
git add founderOS/commands/ideate/variations.md
git commit -m "feat(ideate): create variations command adapted from linkedin:variations

Platform-aware angle variations. Part of [16] namespace refactor."
```

---

## Chunk 3: New Commands (Wave 2A)

Create the 3 new commands. These follow the universal execution flow from the spec and reference the skills created in Chunk 1.

### Task 7: Create ideate:research command

**Files:**
- Read: `founderOS/commands/social/post.md` (reference for universal execution flow structure)
- Read: spec file, `ideate:research` section (lines 237-287)
- Create: `founderOS/commands/ideate/research.md`

- [ ] **Step 1: Read reference and spec**

Read `founderOS/commands/social/post.md` for the canonical command structure (frontmatter, Load Skills, Parse Arguments, Business Context, Preflight, Memory, Intelligence, Phases, Self-Healing, Observation, Memory Update). Read the spec section for research-specific content.

- [ ] **Step 2: Create ideate:research command**

Create `founderOS/commands/ideate/research.md` with the full universal execution flow:

**Frontmatter:**
```yaml
---
description: Research a topic for content angles — web search, trend analysis, competitor content
argument-hint: "[topic] [--platforms=linkedin,x,meta,tiktok] [--depth=quick|deep]"
allowed-tools: ["Read", "WebSearch", "WebFetch"]
execution-mode: background
result-format: full
---
```

**Full sections** (in order):
1. Title: `# /founder-os:ideate:research`
2. Load Skills: Read `content-writing/SKILL.md` (for platform knowledge)
3. Parse Arguments: topic (required), --platforms (default: linkedin), --depth (default: quick)
4. Business Context: standard check
5. Preflight Check: standard. Note WebSearch is optional — if unavailable, degrade gracefully: "Research will be based on general knowledge only. For richer results, ensure WebSearch MCP is available."
6. Step 0: Memory Context
7. Observation: Start (plugin: `ideate`, command: `ideate-research`)
8. Intelligence: Apply Learned Patterns
9. Self-Healing
10. Phase 1 — Topic Analysis: Break topic into 4-5 searchable dimensions (industry, contrarian, data, trend, personal experience). Display dimensions.
11. Phase 2 — Web Research: Quick mode: 3-5 searches. Deep mode: 8-12 searches + competitor analysis. For each search, extract key findings. If WebSearch unavailable, skip with degradation note.
12. Phase 3 — Angle Generation: Synthesize 3-5 content angles. For each: hook idea, supporting data (2-3 points), platform fit score, framework recommendation.
13. Phase 4 — Output: Research brief in the format from spec (lines 268-287). Include source URLs.
14. Observation: End
15. Final: Memory Update
16. Usage Examples

- [ ] **Step 3: Verify and commit**

```bash
git add founderOS/commands/ideate/research.md
git commit -m "feat(ideate): create research command for topic angle discovery

Web search, trend analysis, competitor content. Graceful degradation
without WebSearch MCP. Part of [16] namespace refactor."
```

### Task 8: Create ideate:outline command

**Files:**
- Read: spec file, `ideate:outline` section (lines 289-318)
- Create: `founderOS/commands/ideate/outline.md`

- [ ] **Step 1: Read spec section**

Read the spec for outline command details.

- [ ] **Step 2: Create ideate:outline command**

Create `founderOS/commands/ideate/outline.md` with full universal execution flow.

**Frontmatter:**
```yaml
---
description: Generate a structured content outline from a topic or brief
argument-hint: "[topic-or-brief] [--framework=story|listicle|contrarian|howto|lesson|insight|question] [--platform=linkedin|x|meta|tiktok] [--depth=skeleton|detailed]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---
```

**Command-specific phases:**
- Phase 1 — Structure Selection: auto-select framework if not specified. Platform-aware: X outlines are tighter (thread structure), TikTok outlines emphasize hook + CTA.
- Phase 2 — Outline Generation: Skeleton mode (hook options, body headings, closer options) vs Detailed mode (full beat-by-beat with transitions).
- Phase 3 — Output: outline with framework label and platform guidance notes. "Next step" suggestion.

No external tool dependencies. Preflight passes trivially.

- [ ] **Step 3: Verify and commit**

```bash
git add founderOS/commands/ideate/outline.md
git commit -m "feat(ideate): create outline command for structured content skeletons

Skeleton and detailed modes, platform-aware structure.
Part of [16] namespace refactor."
```

### Task 9: Create ideate:facts command

**Files:**
- Read: spec file, `ideate:facts` section (lines 320-350)
- Create: `founderOS/commands/ideate/facts.md`

- [ ] **Step 1: Read spec section**

Read the spec for facts command details.

- [ ] **Step 2: Create ideate:facts command**

Create `founderOS/commands/ideate/facts.md` with full universal execution flow.

**Frontmatter:**
```yaml
---
description: Extract facts, statistics, and quotable data from documents or URLs for content backing
argument-hint: "[file-path-or-url] [--format=bullets|table] [--max=10]"
allowed-tools: ["Read", "WebFetch"]
execution-mode: background
result-format: full
---
```

**Command-specific phases:**
- Phase 1 — Source Loading: detect file vs URL. Supported: `.md`, `.txt`, `.pdf` (Read tool), URLs (WebFetch). If file not found, display error and stop.
- Phase 2 — Fact Extraction: pull out statistics with sources, quotable statements, data points, trend indicators, counterintuitive findings.
- Phase 3 — Classification: tag each fact as hook-worthy, body-supporting, or credibility-building.
- Phase 4 — Output: structured list in --format (bullets or table), max --max items, with source attribution and classification tags.

WebFetch is optional — if not available, only file sources work. Note this in Preflight.

- [ ] **Step 3: Verify and commit**

```bash
git add founderOS/commands/ideate/facts.md
git commit -m "feat(ideate): create facts command for data extraction from docs/URLs

Extracts stats, quotes, data points with classification tags.
Part of [16] namespace refactor."
```

---

## Chunk 4: Integration & Cleanup (Wave 2B + Wave 3)

### Task 10: Update CLAUDE.md

**Files:**
- Modify: `founderOS/CLAUDE.md` (namespace table row #24)

- [ ] **Step 1: Read current CLAUDE.md**

Read `founderOS/CLAUDE.md`. Find the namespace table row for #24 (LinkedIn Post).

- [ ] **Step 2: Replace row #24**

Find the line:
```
| 24 | LinkedIn Post | `linkedin` | from-doc, post, variations | Filesystem | Content (LinkedIn Post) |
```

Replace with:
```
| 24 | Content Ideation | `ideate` | draft, from-doc, variations, research, outline, facts | WebSearch (research only) | — |
```

Verify the namespace count comment still says 33 (ideate replaces linkedin, no net change).

- [ ] **Step 3: Grep for remaining linkedin references**

```bash
grep -n "linkedin" founderOS/CLAUDE.md
```

Check results: the Namespace Dependencies section should have no `linkedin` references. If any remain in the table or elsewhere, update them to `ideate`.

- [ ] **Step 4: Commit**

```bash
git add founderOS/CLAUDE.md
git commit -m "feat(ideate): update CLAUDE.md namespace table for ideate refactor

Replace linkedin (#24) with ideate. Count stays 33.
Part of [16] namespace refactor."
```

### Task 11: Update [10] spec references

**Files:**
- Modify: `docs/superpowers/specs/[10]-2026-03-13-social-media-posting-design.md`

- [ ] **Step 1: Read [10] spec and find stale references**

Read the spec file. Search for `linkedin:post`, `linkedin:from-doc`, `linkedin:variations`, `P24 linkedin`. These are stale references that need updating.

- [ ] **Step 2: Replace stale references**

Replace all occurrences:
- `linkedin:post` → `ideate:draft`
- `linkedin:from-doc` → `ideate:from-doc`
- `linkedin:variations` → `ideate:variations`
- `P24 linkedin` → `P24 ideate` (or just `ideate namespace`)
- `the existing P24 linkedin namespace` → `the ideate namespace ([16])`

Preserve the meaning — just update the namespace references.

- [ ] **Step 3: Commit**

```bash
git add "docs/superpowers/specs/[10]-2026-03-13-social-media-posting-design.md"
git commit -m "fix: update [10] spec to reference ideate namespace instead of linkedin

Stale linkedin:* references replaced with ideate:*.
Part of [16] namespace refactor."
```

### Task 12: Update preflight dependency registry

**Files:**
- Modify: `founderOS/_infrastructure/preflight/dependency-registry.json` (if exists)

- [ ] **Step 1: Read or create registry**

Check if `founderOS/_infrastructure/preflight/dependency-registry.json` exists. If it does, read it. If it does not exist, create it with an empty JSON object `{}` as the starting content.

- [ ] **Step 2: Add ideate entry, remove linkedin entry**

Add the ideate namespace entry to the JSON:
```json
"ideate": {
  "required": [],
  "optional": ["websearch"]
}
```

If a `linkedin` entry exists, remove it. Save the file.

- [ ] **Step 3: Commit**

```bash
git add founderOS/_infrastructure/preflight/dependency-registry.json
git commit -m "feat(ideate): add ideate to preflight dependency registry

Optional websearch dependency for research command.
Part of [16] namespace refactor."
```

### Task 13: Delete old linkedin namespace

**Files:**
- Delete: `founderOS/commands/linkedin/post.md`
- Delete: `founderOS/commands/linkedin/from-doc.md`
- Delete: `founderOS/commands/linkedin/variations.md`
- Delete: `founderOS/skills/linkedin/linkedin-writing/SKILL.md`
- Delete: `founderOS/skills/linkedin/linkedin-writing/references/post-frameworks.md`
- Delete: `founderOS/skills/linkedin/hook-creation/SKILL.md`
- Delete: `founderOS/skills/linkedin/hook-creation/references/hook-templates.md`
- Delete: `founderOS/skills/linkedin/founder-voice/SKILL.md`
- Delete: `founderOS/skills/linkedin/founder-voice/references/voice-examples.md`

- [ ] **Step 1: Verify new files exist first**

Before deleting anything, verify all replacement files exist:

```bash
ls founderOS/commands/ideate/draft.md
ls founderOS/commands/ideate/from-doc.md
ls founderOS/commands/ideate/variations.md
ls founderOS/commands/ideate/research.md
ls founderOS/commands/ideate/outline.md
ls founderOS/commands/ideate/facts.md
ls founderOS/skills/ideate/content-writing/SKILL.md
ls founderOS/skills/ideate/hook-creation/SKILL.md
ls founderOS/skills/ideate/founder-voice/SKILL.md
```

All 9 files must exist before proceeding.

- [ ] **Step 2: Verify linkedin directory contents before deletion**

List all files to confirm only expected files will be deleted:

```bash
find founderOS/skills/linkedin/ -type f
find founderOS/commands/linkedin/ -type f
```

Expected files in `skills/linkedin/`:
- `linkedin-writing/SKILL.md`, `linkedin-writing/references/post-frameworks.md`
- `hook-creation/SKILL.md`, `hook-creation/references/hook-templates.md`
- `founder-voice/SKILL.md`, `founder-voice/references/voice-examples.md`

Expected files in `commands/linkedin/`:
- `post.md`, `from-doc.md`, `variations.md`

If ANY unexpected files appear, investigate before proceeding. Do not delete files not listed in the spec.

- [ ] **Step 3: Delete old files**

```bash
git rm founderOS/commands/linkedin/post.md
git rm founderOS/commands/linkedin/from-doc.md
git rm founderOS/commands/linkedin/variations.md
git rm founderOS/skills/linkedin/linkedin-writing/SKILL.md
git rm founderOS/skills/linkedin/linkedin-writing/references/post-frameworks.md
git rm founderOS/skills/linkedin/hook-creation/SKILL.md
git rm founderOS/skills/linkedin/hook-creation/references/hook-templates.md
git rm founderOS/skills/linkedin/founder-voice/SKILL.md
git rm founderOS/skills/linkedin/founder-voice/references/voice-examples.md
```

- [ ] **Step 4: Final grep verification**

Search the plugin codebase for stale references:

```bash
grep -r "linkedin:post\|linkedin:from-doc\|linkedin:variations\|skills/linkedin/\|commands/linkedin/" founderOS/
```

Expected: zero results. If any remain, fix them before committing.

Note: `docs/superpowers/specs/[16]-*.md` intentionally references old paths in its Deleted Files table — this is expected and should not be "fixed".

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(ideate): remove old linkedin namespace

Commands and skills replaced by ideate namespace.
Part of [16] namespace refactor."
```

### Task 14: Update submodule reference

- [ ] **Step 1: Update founderOS submodule pointer**

From the workspace root:

```bash
cd /Users/lhalicki/coding_projects/founder-workspace
git add founderOS
git commit -m "feat: update founderOS submodule (content ideation namespace refactor [16])"
```

- [ ] **Step 2: Verify clean state**

```bash
git status
```

Expected: clean working tree with all changes committed.
