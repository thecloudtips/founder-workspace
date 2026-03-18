---
name: Structural Anti-Patterns Reference
description: "AI structural tells to detect and break during humanization. Covers uniform rhythm, parallel constructions, formulaic transitions, and predictable content patterns. Used by the humanize-content skill's Phase B validation."
---

# Structural Anti-Patterns Reference

Patterns that mark content as AI-generated — not by word choice alone, but by rhythm, sentence architecture, and structural predictability. Phase B validation checks for these before clearing content as humanized.

---

## 1. Rhythm Patterns (Burstiness Targets)

### The Problem

AI-generated text clusters sentences in a narrow word-count band. Most sentences fall between 14 and 22 words. The standard deviation across a paragraph is typically under 3 words — nearly uniform. Humans don't write like this. Real writing lurches between terse and expansive.

### Detection Rule

Compute sentence lengths across a paragraph or section. If standard deviation is below 5 words, the rhythm is AI-flat and needs correction.

- **AI default**: most sentences 14–22 words, SD < 3 words
- **Human target**: SD > 5 words, with deliberate extremes
- **Fix**: introduce short fragments (under 8 words) and longer sentences (over 25 words) within the same block

### Before / After Examples

**Example 1 — Uniform rhythm corrected**

Before:
> The product launched in Q3 with strong initial metrics across the board. Customer acquisition cost dropped significantly compared to prior campaigns we ran. Retention numbers indicated users were finding consistent value in the platform. The team responded by doubling down on onboarding improvements over several weeks.

After:
> The product launched in Q3. Strong numbers across the board — CAC dropped, retention held. The team noticed. They spent the next six weeks rebuilding onboarding from scratch, which nobody wanted to do but everyone knew had to happen.

---

**Example 2 — Compressed topic made punchy**

Before:
> Building in public requires a certain tolerance for discomfort and public scrutiny over time. You expose your process before it is polished or complete in any meaningful sense. The feedback you receive can be harsh and sometimes not particularly useful or actionable. Many founders try it briefly and then return to working privately where it feels safer.

After:
> Building in public is uncomfortable. You ship half-formed ideas and people tell you exactly what they think — sometimes usefully, mostly not. Most founders try it for a month. Then they go back to working in private, which is fine, but it's not the same thing.

---

**Example 3 — Technical explanation with rhythm variation**

Before:
> The authentication flow begins when a user submits their credentials through the login form interface. These credentials are then validated against the stored hash in the database system. If the validation succeeds, a session token is generated and returned to the client application. The client stores this token and includes it in subsequent requests to protected endpoints.

After:
> Here's how auth works. User submits credentials. The server checks the submitted password against the stored hash — bcrypt comparison, takes a moment. Match found, session token generated and sent back. Every subsequent request to a protected endpoint includes that token in the header.

---

## 2. Parallel Construction Tells

### The Problem

AI defaults to parallel syntax — a kind of structural symmetry that feels organized but reads as mechanical. This appears in two main forms: consecutive sentences built on the same grammatical skeleton, and lists where every item follows identical grammar.

### Detection Rules

- Three or more consecutive sentences starting with the same part of speech or following the same Subject-Verb-Object pattern
- Lists where every item is a noun phrase, every item is a gerund, or every item has the same approximate length
- Paragraphs where clause length, punctuation frequency, and sentence type don't vary

### Examples of the Tell

Parallel consecutive sentences:
> The platform integrates with Slack for team communication. The platform connects to GitHub for code management. The platform syncs with Jira for project tracking. The platform links to Notion for documentation.

Parallel list items:
> Benefits include:
> - Reducing onboarding time by 40%
> - Improving user retention through better workflows
> - Decreasing support tickets with clearer documentation
> - Increasing team productivity across departments

Both feel written by a system optimizing for consistency. Humans don't naturally produce this.

### Fix

Vary syntax deliberately. Mix declarative, interrogative, imperative, and fragment forms within the same block. Break list parallelism by changing item length, adding a parenthetical in one item, or leading with a fragment.

Fixed parallel sentences:
> The platform connects to Slack, GitHub, Jira, Notion — basically anywhere your team already lives. You don't migrate your workflow to fit the tool. The tool finds you.

Fixed list:
> What this actually changes:
> - Onboarding drops from two weeks to three days (we've seen it happen repeatedly)
> - Support volume goes down — fewer confused users
> - Retention improves, though the mechanism isn't entirely clear yet
> - Team throughput, harder to measure, but people report it

---

## 3. Formulaic Transitions

### The Problem

AI models learned transitions from formal writing. They use connective tissue that signals logical flow in academic or professional prose but sounds unnatural in conversational or founder-facing content. These transitions are accurate — and that's exactly what makes them suspicious.

### Transitions to Eliminate

| AI Transition | Why It Flags |
|---------------|--------------|
| Furthermore | Academic, additive, over-formal |
| Moreover | Stronger version of "furthermore" — rarely used naturally |
| Additionally | Bureaucratic; implies a checklist |
| Consequently | Correct but stiff; over-announces causality |
| In addition | Wordy and clinical |
| Therefore | Fine in logic proofs, strange in product copy |
| Thus | Archaic feel; reads as AI immediately |
| It is worth noting that | Filler; remove or rephrase entirely |
| It is important to highlight | Same problem |
| As a result | Acceptable in moderation; watch for overuse |

### Natural Replacements

| AI Transition | Natural Replacement Options |
|---------------|-----------------------------|
| Furthermore | But here's the thing / And then there's / Plus |
| Moreover | Here's what makes it worse / On top of that |
| Additionally | Also / There's also the question of / And |
| Consequently | So / Which means / The result: |
| In addition | And / There's more |
| Therefore | So / That's why |
| Thus | Which is why / So |
| It is worth noting that | Worth saying: / One thing — / Note: |
| It is important to highlight | The real issue is / What matters here |
| As a result | So now / Which led to |

### Usage Note

Natural replacements can still be overused. Distribute them. "But here's the thing" landing every two paragraphs becomes its own tell. Vary, or cut the transition entirely — many sentences connect better without explicit connective tissue.

---

## 4. Predictable Structural Patterns

### The Problem

AI content defaults to predictable architectures at the paragraph and section level. These aren't wrong — they're just visible. Readers trained on human writing sense the template even if they can't name it.

### Pattern 1: Topic → Support → Conclusion in Every Paragraph

**Detection**: Every paragraph opens with a claim, expands it with evidence or explanation, then wraps with a conclusion sentence that restates or summarizes the claim.

**Why it flags**: Humans write paragraphs that open mid-thought, end before concluding, or run a single long sentence. Not every paragraph resolves.

**Fix**: Let some paragraphs end on the supporting detail. Let others open with the conclusion and work backward. Use single-sentence paragraphs when the point is that clear. Leave one paragraph that doesn't fully resolve — it creates forward pull.

---

### Pattern 2: Exactly 3 or 5 Items in Every List

**Detection**: All lists in a section have item counts of 3 or 5. No 2-item lists, no 4-item lists, no 7-item lists.

**Why it flags**: Humans don't count items before writing them. The number reflects what there is to say, not a structural preference for odd numbers.

**Fix**: Write the list, then count. If you have four things, publish four. If you have two, that's fine — two can be enough. If you have nine, consider whether they belong in a list or whether some should become prose. Don't add or cut items to hit a round number.

---

### Pattern 3: Perfectly Balanced Paragraph Lengths

**Detection**: All paragraphs in a section contain 3–5 sentences. No single-sentence paragraphs. No paragraphs over 6 sentences.

**Why it flags**: Real prose varies. Some points take one sentence. Others run eight. Uniformity signals optimization for readability scores, not actual writing.

**Fix**: Audit paragraph lengths across the section. Introduce at least one single-sentence paragraph. Allow one paragraph to run longer than feels comfortable if the content warrants it. Break a paragraph after a strong line to let it land alone.

---

### Pattern 4: Section Length Symmetry

**Detection**: All sections or subheadings in a document are approximately the same length (within 20% of each other).

**Why it flags**: In human writing, some topics need more space. Forcing symmetry compresses important sections and pads thin ones.

**Fix**: Let sections be the length they need to be. The most important section in a document can be the shortest. A complex explanation can be the longest. Readers adapt to asymmetry; they notice false balance.

---

## Quick Reference: Phase B Checklist

Run these checks before clearing content as humanized:

- [ ] Sentence length SD > 5 words across each paragraph
- [ ] At least one sentence under 8 words and one over 25 words per section
- [ ] No three consecutive sentences with identical grammatical structure
- [ ] No list where all items follow the same grammatical form
- [ ] Zero instances of: Furthermore, Moreover, Additionally, Consequently, In addition, Thus, "It is worth noting", "It is important to highlight"
- [ ] Not every paragraph follows topic → support → conclusion
- [ ] At least one list with an item count that isn't 3 or 5
- [ ] Paragraph lengths vary — at least one short, at least one longer
- [ ] Sections are not symmetrical in length
