---
name: Humanize Content
description: "Makes AI-generated content sound human by targeting burstiness, perplexity, and voice injection. Loaded by content-writing commands in linkedin, newsletter, and social namespaces. Provides 5 tone presets and a post-processing validation checklist."
---

# Humanize Content

## Overview

The Humanize Content skill is shared infrastructure for improving the natural quality of AI-generated content. It is a content quality tool — not a detector-evasion tool. The goal is more engaging, more readable, and more effective writing. The output should sound like a thoughtful human wrote it on the second pass, not a first draft and not a polished AI product.

**Quality improvement positioning**: This skill targets two measurable dimensions of natural writing:

- **Burstiness**: natural variation in sentence length and rhythm. Human writing alternates between short punchy sentences and longer flowing ones. AI tends toward uniform sentence length.
- **Perplexity**: unpredictability of word choice. Human writers use unexpected phrasing, fragments, and colloquial transitions. AI tends toward predictable, safe vocabulary.

**Two-phase pipeline**:

- **Phase A (generation-time)**: Rules loaded into context that guide content generation from the start. These run simultaneously with namespace-specific skills.
- **Phase B (post-processing)**: A validation checklist applied after generation. Issues are fixed surgically — only flagged sentences are rewritten. Maximum 2 iterations.

**Loading pattern**: This skill is loaded via explicit `Read` calls by 8 content-writing commands in the `linkedin`, `newsletter`, and `social` namespaces. Each command loads this SKILL.md plus one namespace-specific reference file from `references/`.

**Relationship to namespace skills**: This skill works alongside existing namespace skills (`founder-voice`, `linkedin-writing`, etc.). It does not replace them. Namespace-specific rules take precedence when they conflict with generic rules here (e.g., newsletter burstiness SD > 4 instead of > 5).

---

## How This Skill Is Used

When a content-writing command is invoked:

1. The command loads this SKILL.md into context via `Read`
2. The command loads the namespace-specific reference file (e.g., `references/linkedin-humanization.md`) via `Read`
3. All skills — namespace-specific skills and this humanizer — are in context before generation begins
4. The `--tone` flag on the command selects the tone preset from `references/tone-presets.md`. Default: Professional
5. Phase A rules from this skill apply during generation alongside all other loaded skill rules
6. After generation, Phase B validation runs inline
7. The quality summary is appended to the dispatcher result

**Loading order matters**: All skill files must be read before generation begins. Do not generate content, then load this skill afterward.

**Flag passthrough**: If the user provides `--tone Conversational`, pass that tone name to the tone-loading step. Treat unrecognized tone names as Professional with a warning.

---

## Phase A: Generation-Time Guidance

When this skill is loaded into context, the following rules guide content generation. These rules are active during the generation step, not applied afterward.

### 1. Tone Loading

Read `references/tone-presets.md`. Identify the active tone preset (from the `--tone` flag, or Professional if none provided). Apply:

- The formality level (formal / semi-formal / casual / direct / warm)
- The warmth target (low / medium / high)
- The rhythm target (even / mixed / punchy)
- Any Tier 2 vocabulary override rules for the active tone

If the tone preset file is unavailable, default to Professional tone behavior: semi-formal, medium warmth, mixed rhythm, no contractions in formal contexts.

### 2. Structural Guidance

**Sentence length variation**: Target a standard deviation of more than 5 words across all sentences in the piece. Do not write all sentences at similar lengths. Actively mix:

- Very short sentences (under 8 words): used for emphasis or contrast
- Medium sentences (14-22 words): the base register
- Long sentences (over 25 words): used to develop a thought, build context, or connect ideas

**Sentence type variety**: Mix declarative, interrogative, and fragment sentences. A question mid-paragraph changes the reader's pace. A fragment adds punch. Not every sentence needs a subject and verb.

**Avoid parallel constructions**: Do not use the same syntactic pattern for three or more consecutive sentences. See `references/structural-anti-patterns.md` for the full list of patterns to avoid.

**Natural transitions**: Replace AI transition words with human connectors. Avoid: "Furthermore", "Moreover", "Additionally", "In conclusion", "It is worth noting that". Use instead: "But here's the thing", "And yet", "Which means", "That said", "The short version:", "Worth noting:", "Here's why this matters".

### 3. Vocabulary Constraints

**Tier 1 banned words**: Never use any word from the Tier 1 list in `references/banned-vocabulary.md`. These are universal bans regardless of tone. Examples include "utilize", "leverage" (as a verb), "synergy", "game-changer", "seamless", "robust", "empower".

**Tier 2 banned words**: Apply Tier 2 filtering based on the active tone's override rules (defined in `references/tone-presets.md`). Some tones relax specific Tier 2 restrictions (e.g., Conversational tone may allow "awesome" where Professional tone does not).

**Claude tells**: Avoid the vocabulary patterns flagged in the Claude tells section of `references/banned-vocabulary.md`. These are phrases and constructions that are statistically associated with AI-generated text.

**Anglo-Saxon preference**: Choose shorter, simpler, Anglo-Saxon-rooted words over Latinate equivalents where the meaning is equivalent:

| Avoid | Prefer |
|-------|--------|
| utilize | use |
| facilitate | help |
| endeavor | try |
| commence | start |
| demonstrate | show |
| obtain | get |
| implement | do / run / set up |
| prioritize | focus on / put first |
| ascertain | find out / check |
| subsequently | then / after that |

### 4. Voice Markers

**Contractions**: Use them. "I'm" not "I am", "don't" not "do not", "it's" not "it is", "we're" not "we are". Exception: avoid contractions in formal headers, legal content, or when the active tone explicitly requires formal register.

**Active voice**: Use active voice strictly. "We shipped the update" not "The update was shipped by us." "This saves you time" not "Time savings are achieved."

**First-person (where appropriate)**: Use "I" and "we" where the content warrants it and the active tone supports it. Thought leadership content on LinkedIn benefits from first-person. Newsletters often use "I" for editorial voice.

**Second-draft register**: Write as if this is a thoughtful second pass — not a rough first attempt and not an over-polished final product. Some natural imperfection is good. Avoid content that sounds like it was optimized for perfection.

---

## Phase B: Post-Processing Validation

After content generation is complete, run this validation checklist inline. No external scripts, no Bash calls, no file execution. Evaluate each check by reading the generated content directly.

### Validation Checklist

| # | Check | What to Look For | Action |
|---|-------|-----------------|--------|
| 1 | Em dashes | Any `—` character in the content | Replace with `, ` or `. ` or parentheses — choose the replacement that preserves the intended meaning |
| 2 | Tier 1 banned words | Any word from the Tier 1 list in `references/banned-vocabulary.md` | Rewrite the sentence using a natural alternative; do not just swap one word for another if the whole sentence is stiff |
| 3 | Tier 2 banned words | Words from Tier 2 in `references/banned-vocabulary.md`, filtered by the active tone's override rules | Rewrite unless the active tone explicitly allows the word |
| 4 | Burstiness | Check if most sentences fall in the 14-22 word range with few outliers | Add 2-3 short sentences (under 8 words) and 1-2 longer ones (over 25 words) where they fit naturally |
| 5 | AI transitions | "Furthermore", "Moreover", "Additionally", "In conclusion", "It is worth noting", "It is important to note" | Replace with a natural connector from Phase A §2 |
| 6 | Vocabulary diversity | The same unusual or distinctive word appears 3 or more times | Vary word choice; use a synonym or rephrase to reduce repetition |
| 7 | Platform length | Content exceeds the platform's character or word limit after rewrites | Trim to fit; prioritize cutting filler sentences over cutting substantive content |

**Short-form adjustment**: For content under 100 words (e.g., a short social post), skip checks 4 and 6. Length variation and vocabulary diversity checks are not meaningful at that scale.

**Check 1 note**: Em dashes (`—`) are a strong AI signal. Replace every instance. The replacement depends on context: a parenthetical aside becomes parentheses, a list intro becomes a colon, a pause becomes a period or comma. Read the sentence before choosing.

**Check 2 note**: Tier 1 bans are absolute. If a Tier 1 word appears, the sentence must be rewritten, not just the word swapped. Many banned words appear in sentences that are structurally stiff — the whole sentence needs revision.

### Auto-Fix Loop

```
1. Generate content (Phase A rules applied during generation)
2. Run validation checklist (all 7 checks, or 5 for short-form)
3. If all checks pass → done; output content with quality summary
4. If issues found → rewrite ONLY flagged sentences (surgical replacement, not full rewrite)
5. Re-run validation checklist on the revised content
6. If passing OR second iteration complete → output content with quality summary
```

Maximum 2 iterations. Never rewrite the entire piece after generation — only fix the flagged sentences. Preserve the structure, flow, and core ideas of the original output.

**What counts as a flagged sentence**: A sentence that fails one or more checks. If a sentence contains both a Tier 1 banned word (check 2) and an em dash (check 1), that sentence is flagged once and fixed in a single rewrite pass.

**When to stop**: If after two iterations a check still fails, proceed to output. Note the outstanding issue in the quality summary as `checks_warned` rather than `checks_passed`. Do not loop indefinitely.

### Quality Summary

Append to the `Key Data` field of the dispatcher result. Use the existing plain-text format from `_infrastructure/dispatcher/result-template.md`:

```
Key Data:
  - [content output reference]
  - Humanization: tone=Professional, iterations=1, checks_passed=7/7, checks_warned=0
```

**Field definitions**:

| Field | Values | Notes |
|-------|--------|-------|
| `tone` | Professional / Friendly / Casual / Authoritative / Conversational | From the active tone preset |
| `iterations` | 1 or 2 | Number of auto-fix loops completed |
| `checks_passed` | e.g., 7/7 or 6/7 | Number of checks that passed (including short-form skips as passed) |
| `checks_warned` | e.g., 0 or 1 | Checks that still had issues after max iterations |

Do not report detector scores. Do not report "AI detection" metrics. Report writing quality metrics only.

---

## Namespace-Specific Rules

Each content-writing command loads one namespace reference file alongside this skill. These namespace rules refine and sometimes override the generic rules above.

| Namespace | Reference File | Key Overrides |
|-----------|---------------|---------------|
| LinkedIn | `references/linkedin-humanization.md` | Hook preservation (lines 1-2 protected from rewrites), 3,000 character limit, high burstiness target (SD > 5) |
| Newsletter | `references/newsletter-humanization.md` | Heading preservation (headings never modified by Phase B), paragraph word targets (150-300 words), burstiness SD > 4 instead of > 5 |
| Social | `references/social-humanization.md` | Short-form relaxation (under 100 words), platform character limits (X: 280 single / 25K thread, LinkedIn: 3K), checks 4 and 6 skipped for short-form |

**Override precedence**: When a namespace reference file defines a rule that conflicts with a rule in this SKILL.md, the namespace rule wins. For example, if `references/newsletter-humanization.md` sets burstiness SD > 4, apply SD > 4 for newsletter content even though this file says SD > 5.

**Loading both files**: Always load both this SKILL.md and the namespace reference file before generation. Do not apply only the namespace file — the generic rules here still apply for anything the namespace file does not address.

---

## Tone Presets Reference

The 5 tone presets are fully defined in `references/tone-presets.md`. Summary:

| Preset | Formality | Warmth | Rhythm | Typical Use |
|--------|-----------|--------|--------|-------------|
| Professional *(default)* | High | Neutral | Moderate variation, avg 15-20 words | LinkedIn posts, business newsletters |
| Friendly | Medium | High | High variation, short sentences frequent | Community updates, welcome emails |
| Casual | Low | High | Very high variation, fragments common | Social media, informal updates |
| Authoritative | High | Low | Longer sentences, deliberate pacing | Thought leadership, industry analysis |
| Conversational | Low | Medium | Very high variation, questions frequent | Blog posts, social engagement |

Each preset includes Tier 2 vocabulary override rules. Load the full preset definition from `references/tone-presets.md` — do not rely on this summary alone.

---

## Ethical Framing

This skill is a content quality tool. The purpose is to produce writing that is more engaging, natural, and effective.

**Why this matters**: LinkedIn's algorithm deprioritizes content that reads as AI-generated, resulting in approximately 30% reduced organic reach. More importantly, readers respond better to content that sounds like a human wrote it. Authentic voice builds trust; polished-AI voice does not.

**What this skill does not do**:
- No detector score targeting
- No claims about "undetectable" output
- No gaming of specific detection systems
- No reporting of AI detection probability

**What the quality summary reports**: Writing metrics — tone used, iteration count, checks passed. These reflect content quality, not detector performance.

The goal is better writing. Detector scores are a by-product, not the objective.

---

## Integration Pattern

Commands that load this skill follow this pattern in their markdown files:

~~~markdown
## Step N: Humanize Content

Read `_infrastructure/humanize-content/SKILL.md` for the full humanization pipeline.
Read `_infrastructure/humanize-content/references/[namespace]-humanization.md` for namespace-specific rules.

Apply Phase A rules during content generation below.
Run Phase B validation after generation is complete.
Append the humanization quality summary to Key Data in the dispatcher result.
~~~

Commands pass the `--tone` flag value (or "Professional" if absent) into the tone-loading step.

---

## Error Handling

| Situation | Behavior |
|-----------|----------|
| `references/tone-presets.md` unavailable | Default to Professional tone; note in quality summary |
| `references/banned-vocabulary.md` unavailable | Skip Tier 1 and Tier 2 checks; note checks_warned for those checks |
| `references/structural-anti-patterns.md` unavailable | Skip parallel construction check; proceed with other Phase A rules |
| Namespace reference file unavailable | Apply generic rules only; note in quality summary |
| Unrecognized `--tone` value | Default to Professional; warn user: "Tone '[value]' not recognized, using Professional" |
| Content under 100 words | Apply short-form adjustment: skip checks 4 and 6 |
| After 2 iterations, checks still failing | Output content; report remaining failures as `checks_warned` |

The humanizer must never block content output. If the pipeline encounters an error, degrade gracefully: output the content with a note in the quality summary about what could not be validated.
