---
name: Banned Vocabulary Reference
description: "Tiered vocabulary ban list for the humanize-content skill. Tier 1 words are universally banned across all tones. Tier 2 words are filtered per active tone preset. Also lists Claude-specific tells to eliminate."
---

# Banned Vocabulary Reference

## Tier 1 — Universal Bans

These words are eliminated regardless of tone, context, or content type. No exceptions.

| Banned Word | Natural Replacement(s) |
|-------------|------------------------|
| delve | explore, look into, dig into, examine |
| landscape | field, space, market, environment, world |
| leverage | use, apply, draw on, make use of |
| tapestry | mix, blend, combination, picture |
| multifaceted | complex, layered, many-sided, varied |
| paramount | critical, essential, top priority, most important |
| foster | build, grow, encourage, support, develop |
| facilitate | help, enable, make easier, support |
| navigate | handle, manage, work through, deal with |
| embark | start, begin, set out, take on |
| elevate | raise, improve, lift, strengthen |
| holistic | whole, complete, end-to-end, integrated |
| robust | strong, solid, reliable, thorough |
| seamless | smooth, easy, frictionless, simple |
| cutting-edge | latest, advanced, new, modern |
| groundbreaking | new, original, first-of-its-kind, novel |
| pivotal | key, critical, central, decisive |
| testament | proof, sign, evidence, demonstration |
| realm | area, world, field, domain |
| plethora | many, a lot of, a range of, numerous |
| myriad | many, countless, a wide range of |
| meticulous | careful, thorough, precise, detailed |
| underscore | highlight, show, point to, emphasize |

---

## Tier 2 — Contextual Bans

These are filtered based on the active tone preset. Each category notes which tones may allow exceptions.

### Transition Phrases

Overused connective tissue that signals formulaic writing.

| Phrase | Preferred Alternative | Tone Exceptions |
|--------|-----------------------|-----------------|
| furthermore | also, and, on top of that | None |
| moreover | and, beyond that, what's more | None |
| additionally | also, and, plus | None |
| consequently | so, as a result, which means | Authoritative (formal context only) |
| nevertheless | still, even so, that said | Authoritative, Academic |

### Filler Phrases

Phrases that add length without adding meaning.

| Phrase | Notes | Tone Exceptions |
|--------|-------|-----------------|
| "in today's rapidly evolving world" | Throat-clearing opener — cut entirely | None |
| "it's worth noting" | Just say the thing | None |
| "actionable insights" | Say what the action or insight is | Authoritative allows "insights" alone |
| "paradigm shift" | Describe the actual change | Authoritative, Academic |
| "best practices" | Name the actual practice | Authoritative, Instructional |
| "stakeholders" | Name the actual people (users, investors, team) | Authoritative (corporate context only) |
| "unlock the potential" | Say what becomes possible and how | None |

### Structural Patterns

Patterns that create artificial rhythm or padding.

| Pattern | Issue | Tone Exceptions |
|---------|-------|-----------------|
| "It's not about X, it's about Y" constructions | Rhetorical padding; sounds like a TED talk | None |
| Lists with exactly 3 or 5 items | Signals manufactured completeness | Instructional (when count is genuine) |
| Every paragraph opening with a topic sentence | Mechanical structure; flattens voice | Academic, Instructional |
| "Let's dive in" openers | Filler; cuts directly to the content instead | None |
| "In conclusion" closings | States the obvious; remove or rephrase | Academic (formal writing only) |

---

## Claude-Specific Tells

These are patterns that signal AI-generated text. Eliminate them in all tones.

### Em Dashes (`—`)

Claude overuses em dashes as a syntactic crutch. Replace with:
- A comma, when the pause is light
- A period, when two thoughts can stand alone
- Parentheses, when the content is genuinely parenthetical
- Nothing, when the sentence can be restructured

**Before:** "The product solves a real problem — one that founders face every day."
**After:** "The product solves a real problem founders face every day."

### Meta-Commentary

Phrases where Claude narrates its own response rather than just giving it.

- "I should note that..." — delete and state the point directly
- "It's important to mention..." — delete and state the point directly
- "I want to be clear that..." — delete and state the point directly
- "To put it simply..." — delete; just be simple

### Reflexive Hedging After Assertions

The pattern of making a claim, then immediately softening it unprompted. Hedges are fine when uncertainty is genuine. Remove them when the assertion is solid.

**Before:** "This approach works well, though of course results may vary depending on many factors."
**After:** "This approach works well."

### Scope Inflation

Generating more content than requested. If asked for three bullet points, write three. If asked for a paragraph, write one paragraph. Do not add summaries, closing remarks, or bonus sections unless instructed.

### Uniform Prose Rhythm

All sentences running to similar length and structure. Mix short punchy sentences with longer ones. Let rhythm vary naturally. A sentence can be two words.
