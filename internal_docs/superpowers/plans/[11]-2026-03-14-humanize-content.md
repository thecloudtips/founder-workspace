# Humanize Content Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared infrastructure skill that makes AI-generated content sound human across LinkedIn, Newsletter, and Social namespaces via generation-time guidance and inline post-processing validation.

**Architecture:** Two-phase pipeline — Phase A injects tone, vocabulary, and structural guidance into context before generation; Phase B runs an inline LLM self-check validation checklist with a max-2-iteration auto-fix loop. All validation is inline (no external scripts) because target commands have restricted `allowed-tools`. The skill lives in `_infrastructure/humanize-content/` and is explicitly loaded by 8 content-writing commands via `Read` calls.

**Tech Stack:** Markdown skill files (YAML frontmatter + body), no scripts, no new dependencies.

**Tooling:**
- Use `/skill-creator` (skill-creator:skill-creator) for creating SKILL.md and all reference files (Tasks 1-5)
- Use `/plugin-dev` agents (plugin-dev:command-development) for command integration (Tasks 6-8)
- Use plugin-dev:skill-reviewer for the final review (Task 9)

---

## File Structure

### New files (create)

| File | Responsibility |
|------|---------------|
| `_infrastructure/humanize-content/SKILL.md` | Core humanization pipeline (~400 lines). Phase A generation-time rules + Phase B validation checklist + auto-fix loop. Tone loading, vocabulary constraints, structural guidance, voice markers. |
| `_infrastructure/humanize-content/references/banned-vocabulary.md` | Tier 1 universal bans (23 words) + Tier 2 per-tone contextual bans + Claude-specific tells |
| `_infrastructure/humanize-content/references/structural-anti-patterns.md` | AI structural tells to detect and break: uniform rhythm, parallel constructions, formulaic transitions, predictable patterns |
| `_infrastructure/humanize-content/references/tone-presets.md` | 5 preset definitions (Professional, Friendly, Casual, Authoritative, Conversational) with formality, warmth, sentence rhythm, vocabulary preferences, and Tier 2 overrides |
| `_infrastructure/humanize-content/references/linkedin-humanization.md` | LinkedIn-specific rules: hook preservation, 3K character limit, whitespace patterns, high burstiness targets |
| `_infrastructure/humanize-content/references/newsletter-humanization.md` | Newsletter-specific rules: H2/H3 heading structure preservation, 150-300 word paragraph targets, moderate burstiness |
| `_infrastructure/humanize-content/references/social-humanization.md` | Social platform-specific rules: short-form relaxation (< 100 words), platform character limits, cross-platform adaptation |

### Existing files (modify)

| File | Change |
|------|--------|
| `commands/linkedin/post.md` | Add 2 `Read` calls for humanizer + linkedin reference. Add `--tone` to argument-hint. |
| `commands/linkedin/from-doc.md` | Add 2 `Read` calls for humanizer + linkedin reference. Add `--tone` to argument-hint. |
| `commands/linkedin/variations.md` | Add 2 `Read` calls for humanizer + linkedin reference. Add `--tone` to argument-hint. |
| `commands/newsletter/draft.md` | Add 2 `Read` calls for humanizer + newsletter reference. Add `--tone` to argument-hint. |
| `commands/newsletter/newsletter.md` | Add 2 `Read` calls for humanizer + newsletter reference. Add `--tone` to argument-hint. |
| `commands/social/post.md` | Add 2 `Read` calls for humanizer + social reference. Add `--tone` to argument-hint. |
| `commands/social/draft.md` | Add 2 `Read` calls for humanizer + social reference. Add `--tone` to argument-hint. |
| `commands/social/cross-post.md` | Add 2 `Read` calls for humanizer + social reference. Add `--tone` to argument-hint. |
| `docs/superpowers/INDEX.md` | Move Humanize Content from pipeline to completed |

### Files NOT changed

- `commands/newsletter/outline.md` — generates structure, not prose
- `commands/social/schedule.md` — takes pre-written content, no generation
- All `founder-voice` skills — humanizer layers on top, doesn't replace
- `inbox/` tone-matching skill — email namespace is out of scope for this implementation
- All `allowed-tools` in command frontmatter — no changes needed
- Agent pipeline configs, Notion DB schemas
- n8n webhook integration, Polish language support — out of scope per spec

---

## Chunk 1: Reference Files (4 parallel agents)

Independent reference files with no cross-dependencies. All use `/skill-creator`.

### Task 1: Create banned-vocabulary.md

**Agent:** `/skill-creator` (skill-creator:skill-creator)
**Files:**
- Create: `_infrastructure/humanize-content/references/banned-vocabulary.md`

- [ ] **Step 1: Create the reference file**

Use `/skill-creator` to create the banned vocabulary reference at `_infrastructure/humanize-content/references/banned-vocabulary.md`.

The file needs YAML frontmatter:
```yaml
---
name: Banned Vocabulary Reference
description: "Tiered vocabulary ban list for the humanize-content skill. Tier 1 words are universally banned across all tones. Tier 2 words are filtered per active tone preset. Also lists Claude-specific tells to eliminate."
---
```

Body content must include these three sections:

**Tier 1 — Universal Bans (always eliminated, all tones):**
delve, landscape, leverage, tapestry, multifaceted, paramount, foster, facilitate, navigate, embark, elevate, holistic, robust, seamless, cutting-edge, groundbreaking, pivotal, testament, realm, plethora, myriad, meticulous, underscore

For each word, provide a natural replacement. Example: "leverage" → "use", "facilitate" → "help", "navigate" → "handle".

**Tier 2 — Contextual Bans (filtered per tone):**
- Transition phrases: furthermore, moreover, additionally, consequently, nevertheless
- Filler phrases: "in today's rapidly evolving world", "it's worth noting", "actionable insights", "paradigm shift", "best practices", "stakeholders", "unlock the potential"
- Structural patterns: "It's not about X, it's about Y" constructions, lists with exactly 3 or 5 items, every paragraph starting with a topic sentence, "Let's dive in" openers, "In conclusion" closings

For each, note which tones allow exceptions (e.g., Authoritative allows "best practices", "stakeholders", "paradigm").

**Claude-Specific Tells (always eliminated):**
- Em dashes (`—`) — replace with commas, periods, or parentheses
- Meta-commentary: "I should note that...", "It's important to mention..."
- Reflexive hedging after assertions
- Scope inflation (generating more content than requested)
- Uniform prose rhythm (all sentences same length)

- [ ] **Step 2: Verify file structure**

Confirm the file exists and has proper frontmatter + all three sections.

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/humanize-content/references/banned-vocabulary.md
git commit -m "feat(humanize): add banned vocabulary reference with tiered word lists"
```

**Acceptance criteria:**
- File has valid YAML frontmatter with name and description
- All 23 Tier 1 words listed with replacements
- Tier 2 words grouped by category with tone override notes
- Claude-specific tells section with replacement guidance
- No external script references

---

### Task 2: Create structural-anti-patterns.md

**Agent:** `/skill-creator` (skill-creator:skill-creator)
**Files:**
- Create: `_infrastructure/humanize-content/references/structural-anti-patterns.md`

- [ ] **Step 1: Create the reference file**

Use `/skill-creator` to create the structural anti-patterns reference at `_infrastructure/humanize-content/references/structural-anti-patterns.md`.

Frontmatter:
```yaml
---
name: Structural Anti-Patterns Reference
description: "AI structural tells to detect and break during humanization. Covers uniform rhythm, parallel constructions, formulaic transitions, and predictable content patterns. Used by the humanize-content skill's Phase B validation."
---
```

Body content must cover these categories:

**Rhythm Patterns (burstiness targets):**
- AI default: most sentences 14-22 words, standard deviation < 3 words
- Human target: standard deviation > 5 words
- Fix: mix short fragments (under 8 words) with longer sentences (over 25 words)
- Include 3 before/after examples showing rhythm correction

**Parallel Construction Tells:**
- Same sentence structure repeated across consecutive sentences
- Lists where every item follows identical grammar
- Fix: vary syntax — mix declarative, interrogative, imperative, fragments

**Formulaic Transitions:**
- AI transitions to eliminate: "Furthermore", "Moreover", "Additionally", "Consequently", "In addition"
- Natural replacements: "But here's the thing", "The catch is", "Here's what matters", "Look", "And yet"
- Include a replacement mapping table

**Predictable Patterns:**
- Topic sentence → supporting detail → conclusion in every paragraph
- Exactly 3 or 5 items in every list
- Perfectly balanced paragraph lengths
- Fix guidance for each pattern

- [ ] **Step 2: Verify file structure**

Confirm all four categories present with examples.

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/humanize-content/references/structural-anti-patterns.md
git commit -m "feat(humanize): add structural anti-patterns reference"
```

**Acceptance criteria:**
- Four anti-pattern categories with detection rules and fixes
- Before/after examples for rhythm correction
- Transition replacement mapping table
- Burstiness targets quantified (SD > 5 words)

---

### Task 3: Create tone-presets.md

**Agent:** `/skill-creator` (skill-creator:skill-creator)
**Files:**
- Create: `_infrastructure/humanize-content/references/tone-presets.md`

- [ ] **Step 1: Create the reference file**

Use `/skill-creator` to create the tone presets reference at `_infrastructure/humanize-content/references/tone-presets.md`.

Frontmatter:
```yaml
---
name: Tone Presets Reference
description: "Five humanization tone presets with dimension values for formality, warmth, sentence rhythm, vocabulary preferences, and Tier 2 vocabulary overrides. Default preset is Professional. Used by the humanize-content skill to calibrate generation-time guidance."
---
```

Body must define these 5 presets with consistent dimension format:

| Preset | Formality | Warmth | Sentence Rhythm | Best For |
|--------|-----------|--------|-----------------|----------|
| Professional | High | Neutral | Moderate variation, avg 15-20 words | LinkedIn posts, business newsletters |
| Friendly | Medium | High | High variation, short sentences frequent | Community updates, welcome emails |
| Casual | Low | High | Very high variation, fragments common | Social media, informal updates |
| Authoritative | High | Low | Longer sentences, deliberate pacing | Thought leadership, industry analysis |
| Conversational | Low | Medium | Very high variation, questions frequent | Blog posts, social engagement |

For each preset, include:
1. **Formality / Warmth / Rhythm** dimension values
2. **Vocabulary level** — word complexity preferences
3. **Contraction usage** — always/sometimes/rarely
4. **First-person usage** — when appropriate
5. **Tier 2 overrides** — which Tier 2 banned words this tone allows or additionally bans
   - Authoritative allows: "best practices", "stakeholders", "paradigm"
   - Casual additionally bans: formal connectors ("however", "nevertheless"), flags sentences over 25 words
   - Conversational encourages: rhetorical questions, direct reader address ("you"), sentence fragments
   - Professional and Friendly: standard Tier 2 list, no overrides

- [ ] **Step 2: Verify all 5 presets defined with complete dimensions**

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/humanize-content/references/tone-presets.md
git commit -m "feat(humanize): add 5 tone presets with dimension values"
```

**Acceptance criteria:**
- All 5 presets defined with identical dimension structure
- Tier 2 override rules explicit per preset
- Default preset (Professional) clearly marked
- Each preset has "Best For" guidance

---

### Task 4: Create namespace-specific reference files (3 files)

**Agent:** `/skill-creator` (skill-creator:skill-creator)
**Files:**
- Create: `_infrastructure/humanize-content/references/linkedin-humanization.md`
- Create: `_infrastructure/humanize-content/references/newsletter-humanization.md`
- Create: `_infrastructure/humanize-content/references/social-humanization.md`

- [ ] **Step 1: Create linkedin-humanization.md**

Use `/skill-creator`. Frontmatter:
```yaml
---
name: LinkedIn Humanization Rules
description: "LinkedIn-specific humanization rules for the humanize-content skill. Covers hook preservation, 3K character limit enforcement, whitespace patterns, and LinkedIn algorithm optimization."
---
```

Body must include:
- **Hook preservation** — first two lines are the hook (from hook-creation skill). Never modify hook content during Phase B validation. Rewrites start from line 3.
- **Character limit** — 3,000 character hard limit. After any Phase B rewrites, re-check total length. If over, trim from the least-critical paragraph (never the hook or CTA).
- **Whitespace patterns** — LinkedIn rewards visual spacing. Single-line paragraphs mixed with 2-3 sentence blocks. Generous line breaks between sections.
- **Burstiness target** — Very high. Short punchy lines (3-7 words) mixed with explanation sentences (15-25 words).
- **Emoji handling** — if emojis are enabled (via `--emojis` flag on the command), humanizer does not remove them. If emojis are not enabled, humanizer does not add them.
- **Hashtag rules** — do not humanize hashtag lines. Leave hashtag blocks at the end untouched.

- [ ] **Step 2: Create newsletter-humanization.md**

Use `/skill-creator`. Frontmatter:
```yaml
---
name: Newsletter Humanization Rules
description: "Newsletter-specific humanization rules for the humanize-content skill. Covers heading structure preservation, paragraph length targets, section transition handling, and long-form content burstiness."
---
```

Body must include:
- **Heading structure preservation** — H2/H3 headings are structural elements. Never modify heading text during Phase B validation. Rewrites apply to body paragraphs only.
- **Paragraph targets** — 150-300 words per section. After Phase B rewrites, verify sections haven't shrunk below 150 words or grown beyond 300. Adjust by splitting or merging sentences.
- **Burstiness target** — Moderate. Newsletters are long-form — rhythm variation matters but extreme fragments feel out of place. Target SD > 4 words (slightly lower than LinkedIn's > 5).
- **Section transitions** — natural connectors between sections. Avoid "Moving on to...", "Next, let's look at...", "Another important aspect is...". Prefer thematic bridges that connect the ending idea of one section to the opening idea of the next.
- **CTA preservation** — closing CTA block (typically the last paragraph or section) should not be rewritten for burstiness. It has its own rhythm rules.

- [ ] **Step 3: Create social-humanization.md**

Use `/skill-creator`. Frontmatter:
```yaml
---
name: Social Platform Humanization Rules
description: "Social media platform-specific humanization rules for the humanize-content skill. Covers short-form content relaxation, per-platform character limits, and cross-platform adaptation handling."
---
```

Body must include:
- **Short-form relaxation** — for posts under 100 words (X posts, short social updates), relax burstiness and vocabulary diversity checks. Short content naturally has less room for variation.
- **Platform character limits** — X: 280 chars (single post) / 25K (thread per post). LinkedIn: 3K. Other platforms per Late.dev constraints. After any Phase B rewrites, re-check against the target platform limit.
- **Thread handling** — for threaded content (`--thread` flag), apply humanization per-post within the thread, not across the entire thread as one block.
- **Cross-platform adaptation** — when `social:cross-post` adapts content for multiple platforms, humanization runs once on the source content. Platform adaptation happens after humanization, not before.
- **Hashtag and mention preservation** — never modify @mentions or #hashtags during validation. They are functional elements, not prose.

- [ ] **Step 4: Verify all 3 namespace files exist with proper frontmatter**

- [ ] **Step 5: Commit**

```bash
git add _infrastructure/humanize-content/references/linkedin-humanization.md \
        _infrastructure/humanize-content/references/newsletter-humanization.md \
        _infrastructure/humanize-content/references/social-humanization.md
git commit -m "feat(humanize): add namespace-specific humanization references (linkedin, newsletter, social)"
```

**Acceptance criteria:**
- Each file has valid frontmatter with name and description
- LinkedIn file covers hook preservation and 3K limit
- Newsletter file covers heading preservation and 150-300 word targets
- Social file covers short-form relaxation and platform limits
- No external script references in any file

---

## Chunk 2: Core SKILL.md (1 agent, depends on Chunk 1)

### Task 5: Create SKILL.md

**Depends on:** Tasks 1-4 (reference files must exist for cross-referencing paths)
**Agent:** `/skill-creator` (skill-creator:skill-creator)
**Files:**
- Create: `_infrastructure/humanize-content/SKILL.md`

- [ ] **Step 1: Create the core skill file**

Use `/skill-creator` to create the humanization pipeline skill at `_infrastructure/humanize-content/SKILL.md` (~400 lines).

Frontmatter:
```yaml
---
name: Humanize Content
description: "Makes AI-generated content sound human by targeting burstiness, perplexity, and voice injection. Loaded by content-writing commands in linkedin, newsletter, and social namespaces. Provides 5 tone presets and a post-processing validation checklist."
---
```

The body must contain these sections in this order:

**## Overview**
- Purpose: shared infrastructure skill for humanizing AI-generated content
- Quality improvement tool positioning (not detector-evasion)
- Two-phase pipeline: Phase A (generation-time) + Phase B (post-processing)
- Loaded via explicit `Read` calls by 8 content-writing commands
- Works alongside existing namespace skills (founder-voice, linkedin-writing, etc.) — does not replace them

**## How This Skill Is Used**
- Commands load this SKILL.md + one namespace-specific reference file
- All skills (namespace-specific + humanizer) are loaded before generation begins
- The `--tone` flag on the command selects the tone preset (default: Professional)
- This skill's rules apply simultaneously with other loaded skills during generation

**## Phase A: Generation-Time Guidance**

When loaded into context, these rules guide content generation:

1. **Tone Loading** — Read the selected tone preset from `references/tone-presets.md`. Apply formality, warmth, and rhythm targets. If no `--tone` flag, default to Professional.

2. **Structural Guidance:**
   - Vary sentence lengths (target standard deviation > 5 words)
   - Mix sentence types: declarative, interrogative, fragments
   - Avoid parallel constructions (see `references/structural-anti-patterns.md`)
   - Use natural transitions ("But here's the thing") not AI transitions ("Furthermore", "Moreover")

3. **Vocabulary Constraints:**
   - Never use Tier 1 banned words (see `references/banned-vocabulary.md`)
   - Filter Tier 2 words per active tone's override rules
   - Prefer Anglo-Saxon over Latinate: "use" not "utilize", "help" not "facilitate", "try" not "endeavor"

4. **Voice Markers:**
   - Use contractions: "I'm", "don't", "it's", "we're"
   - Active voice strictly
   - Occasional first-person where appropriate for the tone
   - Second-draft framing: not rough first attempt, not perfectly polished either

**## Phase B: Post-Processing Validation**

After content generation, perform this validation checklist. All checks are inline — evaluate them directly, no external script.

**### Validation Checklist**

| # | Check | What to Look For | Action |
|---|-------|-----------------|--------|
| 1 | Em dashes | Any `—` character | Replace with `, ` or `. ` or parentheses |
| 2 | Tier 1 banned words | Any word from the Tier 1 list | Rewrite the sentence with a natural alternative |
| 3 | Tier 2 banned words | Words from Tier 2, filtered by active tone | Rewrite unless tone allows it |
| 4 | Burstiness | Most sentences 14-22 words | Add 2-3 short sentences (under 8 words) and 1-2 longer ones (over 25 words) |
| 5 | AI transitions | "Furthermore", "Moreover", "Additionally", etc. | Replace with natural connectors |
| 6 | Vocabulary diversity | Same unusual word appears 3+ times | Vary word choice |
| 7 | Platform length | Content exceeds platform limits after rewrites | Trim to fit |

**Short-form adjustment:** For posts under 100 words, skip checks 4 and 6.

**### Auto-Fix Loop**

```
1. Generate content (Phase A rules applied during generation)
2. Run validation checklist
3. If all checks pass → done, output content with quality summary
4. If issues found → rewrite ONLY flagged sentences (surgical replacement, not full rewrite)
5. Re-run checklist
6. If passing OR second iteration complete → output content with quality summary
```

Maximum 2 iterations. Never rewrite the entire piece — only fix flagged sentences.

**### Quality Summary**

Append to the `Key Data` field of the dispatcher result (uses existing plain-text format from `_infrastructure/dispatcher/result-template.md`):

```
Key Data:
  - [content output reference]
  - Humanization: tone=Professional, iterations=1, checks_passed=6/7, checks_warned=0
```

**## Namespace-Specific Rules**

Each command also loads one namespace reference file alongside this skill:

| Namespace | Reference File | Key Rules |
|-----------|---------------|-----------|
| LinkedIn | `references/linkedin-humanization.md` | Hook preservation, 3K limit, high burstiness |
| Newsletter | `references/newsletter-humanization.md` | Heading preservation, 150-300 word paragraphs |
| Social | `references/social-humanization.md` | Short-form relaxation, platform limits |

These namespace rules override generic rules where they conflict (e.g., newsletter burstiness SD > 4 instead of > 5).

**## Ethical Framing**

This is a content quality tool. The goal is more engaging, natural, effective content.
- LinkedIn's algorithm penalizes AI-sounding content with 30% reduced reach
- No detector score targeting, no claims about "undetectable" output
- The quality summary reports writing metrics, not detector scores

- [ ] **Step 2: Verify the file is well-structured**

Read the created file. Check:
- Frontmatter has name and description
- Phase A has 4 numbered guidance sections
- Phase B has the 7-check validation table
- Auto-fix loop is clearly described with max 2 iterations
- Quality summary format matches dispatcher result template
- All reference file paths use `references/` relative paths
- File is approximately 300-500 lines
- No references to external scripts, Bash, or validate.mjs

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/humanize-content/SKILL.md
git commit -m "feat(humanize): add core humanization pipeline skill with two-phase architecture"
```

**Acceptance criteria:**
- File follows `_infrastructure/memory/SKILL.md` pattern (frontmatter + structured markdown)
- Phase A covers tone, structure, vocabulary, voice
- Phase B has 7-check validation table + auto-fix loop (max 2 iterations)
- Quality summary uses existing dispatcher result format
- All reference paths are correct relative paths
- No external scripts, no Bash, no validate.mjs
- ~300-500 lines

---

## Chunk 3: Command Integration (3 parallel agents, depends on Chunk 2)

Each agent handles one namespace. All use `/plugin-dev` (plugin-dev:command-development).

### Task 6: Integrate humanizer into LinkedIn commands (3 files)

**Depends on:** Task 5
**Agent:** `/plugin-dev` (plugin-dev:command-development)
**Files:**
- Modify: `commands/linkedin/post.md`
- Modify: `commands/linkedin/from-doc.md`
- Modify: `commands/linkedin/variations.md`

- [ ] **Step 1: Read all 3 LinkedIn command files**

Read each file fully to understand current structure.

- [ ] **Step 2: Add `--tone` to argument-hint in post.md**

In `commands/linkedin/post.md`, update the `argument-hint` frontmatter line. Change:
```yaml
argument-hint: "[topic] [--audience=founder|technical|marketer|cxo] [--framework=story|listicle|contrarian|howto|lesson|insight|question] [--length=short|medium|long] [--emojis] [--output=PATH]"
```
To:
```yaml
argument-hint: "[topic] [--audience=founder|technical|marketer|cxo] [--framework=story|listicle|contrarian|howto|lesson|insight|question] [--length=short|medium|long] [--emojis] [--output=PATH] [--tone=professional|friendly|casual|authoritative|conversational]"
```

- [ ] **Step 3: Add Read calls for humanizer in post.md**

In the `## Load All Skills` section of `commands/linkedin/post.md`, add two Read calls AFTER the existing 4 skill reads (lines 15-21). Add after line 21 (`4. ${CLAUDE_PLUGIN_ROOT}/templates/linkedin-post-template.md`):

```
5. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
6. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/linkedin-humanization.md`
```

Add a note after the skill list: "Apply humanize-content for natural-sounding prose. The `--tone` flag selects the humanization tone preset (default: Professional)."

- [ ] **Step 4: Add `--tone` parsing in post.md**

In the `## Parse Arguments` section, add `--tone` to the flag list:
```
- `--tone=professional|friendly|casual|authoritative|conversational` (optional) — humanization tone preset. Controls formality, warmth, and sentence rhythm. Default: `professional`.
```

- [ ] **Step 5: Apply same changes to from-doc.md**

Same pattern:
- Add `--tone` to `argument-hint` frontmatter
- Add 2 Read calls to `## Load Skills` section (after the existing 4 skill reads)
- Add `--tone` to `## Parse Arguments` flags

- [ ] **Step 6: Apply same changes to variations.md**

Same pattern:
- Add `--tone` to `argument-hint` frontmatter
- Add 2 Read calls to `## Load Skills` section (after the existing 3 skill reads — variations.md doesn't load the template)
- Add `--tone` to `## Parse Input` flags section

- [ ] **Step 7: Verify all 3 files**

For each file, confirm:
- `argument-hint` includes `--tone`
- Load Skills section has humanizer Read calls AFTER existing skills
- `--tone` flag documented in argument parsing section
- No other changes made (allowed-tools, execution-mode, etc. unchanged)

- [ ] **Step 8: Commit**

```bash
git add commands/linkedin/post.md commands/linkedin/from-doc.md commands/linkedin/variations.md
git commit -m "feat(humanize): integrate humanizer into linkedin commands (post, from-doc, variations)"
```

**Acceptance criteria:**
- All 3 files have `--tone` in argument-hint frontmatter
- All 3 files load humanizer AFTER existing namespace skills
- All 3 files document `--tone` flag in argument parsing
- No changes to allowed-tools, execution-mode, or other frontmatter
- Load order: linkedin-writing, hook-creation, founder-voice, template, THEN humanizer

---

### Task 7: Integrate humanizer into Newsletter commands (2 files)

**Depends on:** Task 5
**Agent:** `/plugin-dev` (plugin-dev:command-development)
**Files:**
- Modify: `commands/newsletter/draft.md`
- Modify: `commands/newsletter/newsletter.md`

- [ ] **Step 1: Read both newsletter command files**

- [ ] **Step 2: Add `--tone` to argument-hint in draft.md**

Change:
```yaml
argument-hint: "[--output=PATH]"
```
To:
```yaml
argument-hint: "[--output=PATH] [--tone=professional|friendly|casual|authoritative|conversational]"
```

- [ ] **Step 3: Add Read calls for humanizer in draft.md**

In the `## Load Skills` section, add after the existing skill reads (numbered list items):

```
4. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
5. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/newsletter-humanization.md`
```

Add a note: "Apply humanize-content for natural-sounding prose. The `--tone` flag selects the humanization tone preset (default: Professional)."

- [ ] **Step 4: Add `--tone` parsing in draft.md**

In the `## Parse Arguments` section:
```
- `--tone=professional|friendly|casual|authoritative|conversational` (optional) — humanization tone preset. Default: `professional`.
```

- [ ] **Step 5: Apply same changes to newsletter.md**

Same pattern:
- Add `--tone` to `argument-hint` frontmatter
- Add 2 Read calls to `## Load All Skills` section using numbered backtick format (after the existing 4 skill reads):
  ```
  5. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
  6. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/newsletter-humanization.md`
  ```
- Add `--tone` to `## Parse Arguments` flags

- [ ] **Step 6: Verify both files**

Confirm humanizer loads AFTER newsletter-writing, founder-voice, and template (where present).

- [ ] **Step 7: Commit**

```bash
git add commands/newsletter/draft.md commands/newsletter/newsletter.md
git commit -m "feat(humanize): integrate humanizer into newsletter commands (draft, newsletter)"
```

**Acceptance criteria:**
- Both files have `--tone` in argument-hint
- Both files load humanizer AFTER existing newsletter skills
- `commands/newsletter/outline.md` is NOT modified
- Load order: newsletter-writing, founder-voice, template, THEN humanizer

---

### Task 8: Integrate humanizer into Social commands (3 files)

**Depends on:** Task 5
**Agent:** `/plugin-dev` (plugin-dev:command-development)
**Files:**
- Modify: `commands/social/post.md`
- Modify: `commands/social/draft.md`
- Modify: `commands/social/cross-post.md`

- [ ] **Step 1: Read all 3 social command files**

- [ ] **Step 2: Add `--tone` to argument-hint in post.md**

Change:
```yaml
argument-hint: '"Post text" --platforms=linkedin,x [--from=file|url] [--media=path] [--schedule=time] [--draft] [--thread] [--team] [--audience=hint] [--format=table|json|markdown]'
```
To:
```yaml
argument-hint: '"Post text" --platforms=linkedin,x [--from=file|url] [--media=path] [--schedule=time] [--draft] [--thread] [--team] [--audience=hint] [--tone=professional|friendly|casual|authoritative|conversational] [--format=table|json|markdown]'
```

Note: `--tone` controls how the content sounds (formality, rhythm). `--audience` controls what the content addresses (topic adaptation). They operate on different axes and do not conflict.

- [ ] **Step 3: Add Read calls for humanizer in post.md**

In the `## Skills` section, add after the existing skill reads (after line for platform-adaptation):

```
6. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
7. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/social-humanization.md`
```

- [ ] **Step 4: Add `--tone` to Arguments table in post.md**

Add a row to the Arguments table:
```
| `--tone` | No | Humanization tone: professional (default), friendly, casual, authoritative, conversational |
```

- [ ] **Step 5: Apply same changes to draft.md**

Same pattern:
- Add `--tone` to `argument-hint`
- Add 2 Read calls to `## Skills` section (after platform-adaptation)
- Add `--tone` to Arguments table

- [ ] **Step 6: Apply same changes to cross-post.md**

Same pattern:
- Add `--tone` to `argument-hint`
- Add 2 Read calls to `## Skills` section (after cross-posting skill, before media conditional)
- Add `--tone` to Arguments table

- [ ] **Step 7: Verify all 3 files**

Confirm:
- humanizer loads AFTER platform-adaptation
- `--audience` flag unchanged (different axis)
- `commands/social/schedule.md` is NOT modified
- No changes to allowed-tools

- [ ] **Step 8: Commit**

```bash
git add commands/social/post.md commands/social/draft.md commands/social/cross-post.md
git commit -m "feat(humanize): integrate humanizer into social commands (post, draft, cross-post)"
```

**Acceptance criteria:**
- All 3 files have `--tone` in argument-hint
- All 3 files load humanizer AFTER platform-adaptation skill
- `--audience` flag preserved unchanged
- `commands/social/schedule.md` NOT modified
- Load order: late-common, late-publish, platform-adaptation, THEN humanizer

---

## Chunk 4: Review + INDEX Update (1 agent, depends on Chunk 3)

### Task 9: Review all changes

**Depends on:** Tasks 6-8
**Agent:** `/plugin-dev` (plugin-dev:skill-reviewer)

- [ ] **Step 1: Review infrastructure files**

Read all 7 files in `_infrastructure/humanize-content/` and verify:
- SKILL.md has Phase A (4 guidance sections) + Phase B (7-check validation table + auto-fix loop)
- All reference files have valid frontmatter
- No external script references anywhere
- Cross-references between files use correct relative paths
- banned-vocabulary.md has all 23 Tier 1 words
- tone-presets.md has all 5 presets with complete dimensions

- [ ] **Step 2: Review command integrations**

For each of the 8 modified command files, verify:
- `argument-hint` includes `--tone` flag
- Humanizer Read calls appear AFTER existing namespace skills
- `--tone` flag documented in argument parsing
- No other frontmatter changed (especially `allowed-tools`)
- Excluded commands NOT modified: `newsletter/outline.md`, `social/schedule.md`

- [ ] **Step 3: Fix any issues found**

If review finds issues, fix them and re-verify.

---

### Task 10: Update INDEX.md

**Depends on:** Task 9
**Agent:** current session (direct edit)
**Files:**
- Modify: `docs/superpowers/INDEX.md`

- [ ] **Step 1: Read current INDEX.md**

Read `docs/superpowers/INDEX.md` fully.

- [ ] **Step 2: Update progress overview**

Change the progress bar from `11/13` to `12/13`:
```
DONE █████████████████████████░░ 12/13 specs implemented
```

- [ ] **Step 3: Move Humanize Content from pipeline to completed**

In the **Completed** line, add "Humanize Content":
```
**Completed (11):** AIOS Enrichment, Memory Engine, Intelligence Engine, Installer, Single-Plugin Restructure, Notion CLI Migration, Preflight Checks, Subagent Delegation, Evals Framework, Social Media Posting, Humanize Content
```

Update **In pipeline** to remove it:
```
**In pipeline (2):** Scout Namespace (plan ready), Intel Plugin Package (low priority)
```

- [ ] **Step 4: Update spec status**

Change spec [11] status from `PLANNED` to `DONE`:
```
| 11 | DONE | `specs/[11]-2026-03-14-humanize-content-design.md` | AI content humanization skill |
```

- [ ] **Step 5: Update plan status**

Add plan [11] to the plans table:
```
| 11 | DONE | `plans/[11]-2026-03-14-humanize-content.md` | Humanize content — 7 infrastructure files, 8 command integrations |
```

- [ ] **Step 6: Update What's Next**

Remove Humanize Content from priority 1. Shift Scout Namespace to priority 1.

- [ ] **Step 7: Add to Recently Completed**

Add entry:
```
| 2026-03-14 | **[11] Humanize Content** | Built shared humanization infrastructure (SKILL.md + 6 reference files), integrated into 8 commands across linkedin, newsletter, social namespaces with --tone flag. |
```

- [ ] **Step 8: Update execution order**

Change:
```
**Execution order (remaining work):** [11] Humanize Content (needs plan) → [12] Scout Namespace (plan ready) → [13] Intelligence Plugin Package (low priority).
```
To:
```
**Execution order (remaining work):** [12] Scout Namespace (plan ready) → [13] Intelligence Plugin Package (low priority).
```

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/INDEX.md
git commit -m "docs: update superpowers INDEX — humanize content complete"
```

---

### Task 11: Final commit and push

**Depends on:** Task 10

- [ ] **Step 1: Verify git status**

```bash
git status
```

All changes should be committed. No untracked files except intentional ones.

- [ ] **Step 2: Push**

```bash
git push
```

---

## Parallel Execution Summary

```
Chunk 1 (parallel, 4 agents):     Tasks 1, 2, 3, 4
                                    ↓
Chunk 2 (sequential, 1 agent):    Task 5
                                    ↓
Chunk 3 (parallel, 3 agents):     Tasks 6, 7, 8
                                    ↓
Chunk 4 (sequential, 1 agent):    Tasks 9, 10, 11
```

**Total: 11 tasks, 7 new files, 9 modified files**
**Estimated parallel execution: 4 chunks (Chunk 1 and Chunk 3 are parallel internally)**
