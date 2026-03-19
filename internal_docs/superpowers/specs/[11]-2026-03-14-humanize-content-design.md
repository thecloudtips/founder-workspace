# Humanize Content Skill — Design Specification

**Date:** 2026-03-14
**Status:** Draft
**Research basis:** `docs/specs/humanizer-research.md`

---

## Overview

A shared infrastructure skill that makes AI-generated content sound human across Founder OS content-writing namespaces. It works in two phases: inline generation-time guidance (tone, vocabulary, structure rules) and a post-processing validation pass with auto-fix. The skill targets two core metrics — burstiness (sentence-length variance) and perplexity (word-level unpredictability) — combined with tone-aware voice injection.

**Positioning:** This is a quality improvement tool, not a detector-evasion tool. It produces more engaging, natural, effective content. The ethical framing matters — see Section 7.

## Scope

### In scope
- Shared humanization skill loaded by content-writing commands
- 5 tone presets: Professional, Friendly, Casual, Authoritative, Conversational
- `--tone` flag on integrated commands (default: Professional)
- Inline validation checklist for post-processing checks (LLM-driven, no external script dependency)
- Auto-fix loop (max 2 iterations) for remaining AI markers
- Integration with 3 namespaces: LinkedIn, Newsletter, Social

### Out of scope
- Polish language support
- n8n webhook integration / batch API processing
- Email namespace (`inbox/`) — already has tone-matching skill
- Replacing existing `founder-voice` skills — this layers on top
- AI detector score targeting — we optimize for quality, not evasion metrics

---

## 1. Skill Architecture & Location

The humanizer is a shared infrastructure skill, not tied to any single namespace. This mirrors how `_infrastructure/memory/`, `_infrastructure/context/`, and `_infrastructure/preflight/` work.

### Directory structure

```
_infrastructure/humanize-content/
├── SKILL.md                              # Core humanization pipeline (~400 lines)
└── references/
    ├── banned-vocabulary.md              # Tier 1 universal bans + Tier 2 per-tone overrides
    ├── structural-anti-patterns.md       # AI structural tells to detect and break
    ├── tone-presets.md                   # 5 preset definitions with dimension values
    ├── linkedin-humanization.md          # LinkedIn-specific humanization rules
    ├── newsletter-humanization.md        # Newsletter-specific humanization rules
    └── social-humanization.md            # Social media platform-specific rules
```

### SKILL.md frontmatter

```yaml
---
name: Humanize Content
description: "Makes AI-generated content sound human by targeting burstiness, perplexity, and voice injection. Loaded by content-writing commands in linkedin, newsletter, and social namespaces. Provides 5 tone presets and a post-processing validation checklist."
---
```

### Integration point

Content-writing commands explicitly add two `Read` calls to their "Load Skills" section — one for the core skill, one for the namespace-specific reference file:

```
Read ${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md
Read ${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/linkedin-humanization.md
```

There is no auto-load mechanism. Each command specifies exactly which files to read, consistent with how all other skills in the project are loaded.

---

## 2. The Humanization Pipeline

All skills (namespace-specific + humanizer) are read into context before any generation begins. "Load order" means read order — all loaded skills are available simultaneously during content generation. The humanizer's Phase A rules apply during generation because they are in context alongside the namespace skills.

### Phase A: Generation-Time Guidance (Inline)

When a content command loads the humanizer skill, these rules are injected into the generation context **before** content is written:

1. **Tone loading** — Read the selected tone preset (default: Professional). Sets formality, warmth, sentence rhythm targets, and vocabulary preferences.
2. **Structural guidance** — Vary sentence lengths (target standard deviation > 5 words). Mix declarative, interrogative, and fragment sentence types. Avoid parallel constructions. Use natural transitions ("But here's the thing") instead of AI transitions ("Furthermore", "Moreover").
3. **Vocabulary constraints** — Tier 1 words are never generated. Tier 2 words filtered per active tone. Prefer Anglo-Saxon over Latinate vocabulary ("use" not "utilize", "help" not "facilitate").
4. **Voice markers** — Use contractions ("I'm", "don't", "it's"). Active voice strictly. Occasional first-person where appropriate. Apply the "second draft" framing: not a rough first attempt, not perfectly polished either.

This gets first-output quality to approximately 80%, matching research findings on generation-time voice injection.

### Phase B: Post-Processing Pass (Auto-fix)

After content generation, the LLM performs an inline validation checklist (no external script required — all checks are defined in SKILL.md as rules the LLM evaluates directly). This keeps the skill compatible with all command execution contexts regardless of `allowed-tools`.

**Validation checklist (LLM self-check):**

1. **Scan for em dashes** (`—`) — replace with commas, periods, or parentheses
2. **Scan for Tier 1 banned words** — rewrite any sentence containing one
3. **Scan for Tier 2 banned words** — filter per active tone, rewrite if needed
4. **Evaluate burstiness** — check for sentence-length variety. If most sentences are 14-22 words, mix in short fragments (under 8 words) and longer sentences (over 25 words)
5. **Scan for AI transitions** — replace "Furthermore", "Moreover", "Additionally" with natural connectors
6. **Check vocabulary diversity** — flag if the same unusual word appears more than twice

**The auto-fix loop:**
1. Generate content (Phase A inline rules applied)
2. Run the validation checklist — if all checks pass, done
3. If issues found, rewrite only flagged sentences (surgical replacement, not full rewrite)
4. Re-run checklist. If passing or second iteration complete, output content with quality summary

**Output quality summary** (appended to the `Key Data` field of the dispatcher result template):

```
Key Data:
  - [content output reference]
  - Humanization: tone=Professional, iterations=1, checks_passed=5/6, checks_warned=0
```

This uses the existing plain-text dispatcher result format from `_infrastructure/dispatcher/result-template.md` without requiring format extensions.

---

## 3. Tone Presets

Five presets accessible via `--tone` flag. Default is Professional.

| Preset | Formality | Warmth | Sentence Rhythm | Best For |
|--------|-----------|--------|-----------------|----------|
| **Professional** | High | Neutral | Moderate variation, avg 15-20 words | LinkedIn posts, business newsletters |
| **Friendly** | Medium | High | High variation, short sentences frequent | Community updates, welcome emails |
| **Casual** | Low | High | Very high variation, fragments common | Social media, informal updates |
| **Authoritative** | High | Low | Longer sentences, deliberate pacing | Thought leadership, industry analysis |
| **Conversational** | Low | Medium | Very high variation, questions frequent | Blog posts, social engagement |

### Tone-specific vocabulary overrides (Tier 2)

- **Authoritative** allows: "best practices", "stakeholders", "paradigm" (appropriate in expert contexts)
- **Casual** bans extra: formal connectors ("however", "nevertheless"), any sentence over 25 words flagged
- **Conversational** encourages: rhetorical questions, direct reader address ("you"), sentence fragments
- **Professional** and **Friendly** use the standard Tier 2 ban list without overrides

### Tone in commands

```bash
/founder-os:linkedin:post "AI trends in 2026" --tone friendly
/founder-os:newsletter:draft --tone authoritative
/founder-os:social:post "Launch day!" --tone casual
```

If no `--tone` flag is passed, the command defaults to Professional.

---

## 4. Banned Vocabulary

### Tier 1 — Universal bans (always eliminated, all tones)

These words are AI fingerprints with no legitimate use case in natural writing:

delve, landscape, leverage, tapestry, multifaceted, paramount, foster, facilitate, navigate, embark, elevate, holistic, robust, seamless, cutting-edge, groundbreaking, pivotal, testament, realm, plethora, myriad, meticulous, underscore

### Tier 2 — Contextual bans (filtered per tone)

These words may be appropriate in specific tones but are generally AI tells:

- **Transition phrases:** furthermore, moreover, additionally, consequently, nevertheless
- **Filler phrases:** "in today's rapidly evolving world", "it's worth noting", "actionable insights", "paradigm shift", "best practices", "stakeholders", "unlock the potential"
- **Structural patterns to break:** "It's not about X, it's about Y" constructions, lists with exactly 3 or 5 items, every paragraph starting with a topic sentence, "Let's dive in" openers, "In conclusion" closings

### Claude-specific tells (always eliminated)

- Em dashes (`—`) — Claude's primary detection signal. Replace with commas, periods, or parentheses.
- Meta-commentary: "I should note that...", "It's important to mention..."
- Reflexive hedging after assertions
- Scope inflation (generating more content than requested)
- Uniform prose rhythm (all sentences same length)

---

## 5. Validation Approach

### Why inline LLM checks instead of an external script

The target namespaces run as background subagents via the dispatcher. LinkedIn and Newsletter commands have restricted `allowed-tools` (Read/Write only, no Bash). An external `validate.mjs` script would require updating `allowed-tools` across multiple commands. Instead, the validation rules are encoded directly in SKILL.md as a self-check checklist the LLM applies after generation. This is consistent with how the existing `linkedin-writing` quality checklist works (Phase 3 of `linkedin/post.md`).

### Checks performed (inline)

| Check | What to look for | Action |
|-------|-----------------|--------|
| Em dashes | Any `—` character | Replace with `, ` or `. ` or parentheses |
| Tier 1 banned words | Any word from the Tier 1 list | Rewrite the sentence with a natural alternative |
| Tier 2 banned words | Words from Tier 2, filtered by active tone | Rewrite unless tone allows it |
| Burstiness | Most sentences between 14-22 words | Add 2-3 short sentences (under 8 words) and 1-2 longer ones (over 25 words) |
| AI transitions | "Furthermore", "Moreover", "Additionally", etc. | Replace with natural connectors ("But", "The catch is", "Here's what matters") |
| Vocabulary diversity | Same unusual word repeated 3+ times | Vary word choice |
| Platform length limits | Content exceeds platform limits after rewrites | Trim to fit (3K for LinkedIn, 280 for X, etc.) |

### Short-form content adjustment

For posts under 100 words (X posts, short social updates), the burstiness and vocabulary diversity checks are relaxed. Short content naturally has less room for variation, and applying long-form thresholds would produce unnatural results.

---

## 6. Namespace Integration

### How commands load the skill

Each content-writing command adds the humanizer to its existing "Load Skills" section via explicit `Read` calls. The humanizer is read **after** namespace-specific skills. Since all skills are loaded into context before generation begins, they all apply simultaneously during content creation.

### LinkedIn (`commands/linkedin/post.md`, `from-doc.md`, `variations.md`)

- **Read calls added:**
  - `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
  - `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/linkedin-humanization.md`
- **Read after:** linkedin-writing, hook-creation, founder-voice
- **Post-process:** Validates against linkedin-specific checks. Hook-in-first-two-lines is preserved. 3K character limit respected after any rewrites.
- **Flag:** `--tone` added to all 3 commands

### Newsletter (`commands/newsletter/draft.md`, `newsletter.md`)

- **Read calls added:**
  - `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
  - `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/newsletter-humanization.md`
- **Read after:** newsletter-writing, founder-voice
- **Post-process:** Newsletter-specific checks. H2/H3 heading structure preserved. Paragraph targets (150-300 words) maintained after rewrites.
- **Flag:** `--tone` added to both commands
- **Excluded:** `outline.md` does not load the humanizer — it generates structure (section titles and bullet points), not prose

### Social (`commands/social/post.md`, `draft.md`, `cross-post.md`)

- **Read calls added:**
  - `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
  - `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/social-humanization.md`
- **Read after:** platform-adaptation
- **Post-process:** Platform-aware validation with relaxed thresholds for short-form content (X posts)
- **Flag:** `--tone` added to `post`, `draft`, `cross-post`
- **Excluded:** `schedule.md` does not load the humanizer — it takes pre-written content and schedules it for later publishing, so generation-time guidance would be a no-op

### Flag interaction note

The `--tone` flag controls humanization tone (formality, warmth, rhythm). It does not conflict with the existing `--audience` flag on social commands, which provides a hint for content topic adaptation. They operate on different axes: `--audience` affects *what* to say, `--tone` affects *how* it sounds.

### Frontmatter updates required

Each integrated command's YAML frontmatter `argument-hint` must be updated to include the `--tone` flag for discoverability:

```yaml
argument-hint: "[existing flags] [--tone=professional|friendly|casual|authoritative|conversational]"
```

### What doesn't change

- Existing `founder-voice` skills remain untouched — they handle what the voice sounds like
- Existing `tone-matching` in inbox stays separate — email is out of scope
- No changes to agent pipeline configs — humanization runs within the command execution, not as a separate agent step
- No changes to Notion DB schemas — humanization is transparent to storage
- No changes to `allowed-tools` in any command frontmatter

---

## 7. Ethical Framing

This skill is positioned as a **content quality tool**, not a detector-evasion tool.

- The goal is more engaging, natural, effective content — not fooling AI detectors
- LinkedIn's algorithm penalizes AI-sounding content with 30% reduced reach and 55% lower engagement. Humanization directly improves business outcomes.
- The research shows AI detectors have significant bias against non-native English speakers (up to 70% false positive rates). Humanization helps produce natural-sounding content regardless of the author's background.
- No detector score targeting, no claims about "undetectable" output
- The quality summary shows writing metrics (burstiness, diversity), not detector scores

---

## 8. Future Extensions (Not in scope now)

- **Email namespace:** Add inbox/triage integration once the core skill proves out
- **Custom voice profiles:** Allow users to provide writing samples for style matching (Voice DNA from research)
- **Additional tones:** User-defined presets beyond the initial 5
- **Multi-language:** Polish and other language support with language-specific anti-pattern detection
- **Memory integration:** Track which tone settings produce the best engagement per platform over time
- **External validation script:** If inline LLM checks prove insufficient, add `validate.mjs` as an optional enhancement for commands that have Bash access
