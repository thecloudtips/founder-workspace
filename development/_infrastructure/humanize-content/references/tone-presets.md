---
name: Tone Presets Reference
description: "Five humanization tone presets with dimension values for formality, warmth, sentence rhythm, vocabulary preferences, and Tier 2 vocabulary overrides. Default preset is Professional. Used by the humanize-content skill to calibrate generation-time guidance."
---

# Tone Presets Reference

This document defines the five humanization tone presets used by the `humanize-content` skill. Each preset specifies calibration values across consistent dimensions. The **Professional** preset is the default when no preset is specified.

---

## Preset Summary

| Preset | Formality | Warmth | Sentence Rhythm | Best For |
|--------|-----------|--------|-----------------|----------|
| Professional *(default)* | High | Neutral | Moderate variation, avg 15–20 words | LinkedIn posts, business newsletters |
| Friendly | Medium | High | High variation, short sentences frequent | Community updates, welcome emails |
| Casual | Low | High | Very high variation, fragments common | Social media, informal updates |
| Authoritative | High | Low | Longer sentences, deliberate pacing | Thought leadership, industry analysis |
| Conversational | Low | Medium | Very high variation, questions frequent | Blog posts, social engagement |

---

## Preset Definitions

### 1. Professional *(Default)*

**Best For:** LinkedIn posts, business newsletters, client-facing communications

| Dimension | Value |
|-----------|-------|
| Formality | High |
| Warmth | Neutral |
| Sentence Rhythm | Moderate variation; target average 15–20 words per sentence |

**Vocabulary level:** Professional but accessible. Avoid jargon; prefer precise, commonly understood business vocabulary. No slang or colloquialisms.

**Contraction usage:** Sometimes — acceptable in lighter contexts ("we're", "it's") but avoid in formal statements or key claims.

**First-person usage:** Appropriate for personal perspective and direct statements ("I believe", "we found"). Avoid overuse; balance with third-person or passive constructions where objectivity is needed.

**Tier 2 overrides:** None. Apply standard Tier 2 banned word list without modification.

---

### 2. Friendly

**Best For:** Community updates, welcome emails, onboarding content, team announcements

| Dimension | Value |
|-----------|-------|
| Formality | Medium |
| Warmth | High |
| Sentence Rhythm | High variation; short sentences (under 12 words) should appear frequently |

**Vocabulary level:** Everyday language. Prefer simple, warm, approachable words. Avoid overly technical terms unless the audience is clearly technical.

**Contraction usage:** Always — contractions are expected and reinforce warmth ("you're", "we've", "it's").

**First-person usage:** Encouraged throughout. "We" creates community; "you" creates direct connection. Use both liberally.

**Tier 2 overrides:** None. Apply standard Tier 2 banned word list without modification.

---

### 3. Casual

**Best For:** Social media posts, informal updates, community forums, behind-the-scenes content

| Dimension | Value |
|-----------|-------|
| Formality | Low |
| Warmth | High |
| Sentence Rhythm | Very high variation; sentence fragments are common and acceptable |

**Vocabulary level:** Conversational and colloquial. Informal expressions welcome. Short, punchy words preferred. Avoid corporate or academic vocabulary entirely.

**Contraction usage:** Always — any hesitation to use contractions signals unnatural formality in this preset.

**First-person usage:** Heavy use encouraged. Speak directly and personally; "I" and "you" should appear frequently.

**Tier 2 overrides (additional bans beyond standard list):**
- Ban formal connectors: "however", "nevertheless", "furthermore", "moreover", "thus", "hence", "therefore" — replace with "but", "still", "so", "and", "also"
- Flag any sentence over 25 words for mandatory revision; break into two or more shorter sentences
- Avoid phrases that signal corporate hedging (e.g., "it is worth noting", "one might consider")

---

### 4. Authoritative

**Best For:** Thought leadership articles, industry analysis, white papers, expert opinion pieces

| Dimension | Value |
|-----------|-------|
| Formality | High |
| Warmth | Low |
| Sentence Rhythm | Longer sentences with deliberate pacing; complex sentence structures acceptable |

**Vocabulary level:** Sophisticated and precise. Technical and industry-specific vocabulary is appropriate. Vocabulary should signal expertise without becoming impenetrable.

**Contraction usage:** Rarely — contractions undercut the tone of authority. Use only when a human touch is intentional and deliberate.

**First-person usage:** Selective. First-person assertions of expertise are appropriate ("In my experience", "I have observed"). Avoid casual or emotive first-person ("I feel", "I think honestly").

**Tier 2 overrides (allowed exceptions to standard list):**
- "best practices" — permitted when citing established field norms
- "stakeholders" — permitted when referring to a defined group in a formal context
- "paradigm" — permitted when describing a genuine conceptual shift in the field

All other Tier 2 banned words remain prohibited.

---

### 5. Conversational

**Best For:** Blog posts, newsletters with engaged readership, social media engagement, thought-starters

| Dimension | Value |
|-----------|-------|
| Formality | Low |
| Warmth | Medium |
| Sentence Rhythm | Very high variation; rhetorical questions should appear frequently |

**Vocabulary level:** Plain and direct. Prefer everyday words. Avoid jargon. Vocabulary should feel like a smart friend talking, not a presenter presenting.

**Contraction usage:** Always — natural speech rhythm depends on contractions.

**First-person usage:** Encouraged. Direct reader address using "you" is a defining feature of this preset. Rhetorical questions that address the reader directly are expected ("Have you ever noticed…?", "What would you do if…?").

**Conversational-specific guidance:**
- Include at least one rhetorical question per 200 words in longer content
- Sentence fragments used for emphasis are intentional and acceptable ("Exactly.", "Simple.", "Not anymore.")
- Direct reader address ("you") should appear multiple times per section
- Transitions should feel spoken, not written ("Here's the thing", "And that's the point", "So what does that mean?")

**Tier 2 overrides:** None beyond standard list. However, formal connectors ("nevertheless", "furthermore") should be replaced with conversational equivalents ("but", "also", "and") as a style preference, not a hard ban.

---

## Applying Presets

When the `humanize-content` skill receives a tone preset parameter, it loads the corresponding dimension values and overrides from this file and applies them as generation-time guidance. The preset calibrates:

1. Sentence construction and target length
2. Vocabulary filter stringency
3. Contraction and first-person permissions
4. Tier 2 word list modifications (additions or exceptions)

If no preset is specified, **Professional** is used by default.
