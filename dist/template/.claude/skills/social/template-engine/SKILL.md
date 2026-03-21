---
name: template-engine
description: "Activates when creating content from templates. Provides template selection logic, combination strategies, and performance-based ranking."
globs: ["commands/social/compose.md", "commands/social/ab-test.md"]
---

# Template Engine

Template selection, combination, and performance-based ranking for social content generation. Used by the `social:compose` and `social:ab-test` commands.

## 1. Template Selection Algorithm

**Step 1: Load the template index**

Read `skills/social/templates/_index.yaml` to get the full list of available templates with their metadata.

**Step 2: Filter by platform**

Use the `platform_affinity` section in `_index.yaml` to narrow the candidate list to templates suited for the target platform (e.g., `linkedin`, `twitter`).

**Step 3: Filter by technique (if specified)**

If the user passed `--technique <name>`, narrow candidates further to that technique group using the `techniques` section in `_index.yaml`. Skip this step if no technique is specified.

**Step 4: Score by topic relevance**

Score each remaining candidate's tags against the topic keywords using fuzzy matching. Higher overlap = higher base score.

**Step 5: Apply performance bias (if data available)**

Read `skills/social/templates/_performance.yaml`. If the file exists and is non-empty:
- Find technique scores for similar topic categories using `best_topics` lists in `technique_scores`.
- Boost templates from techniques with higher win rates.
- Only apply this bias after a minimum of 3 A/B tests per technique. Techniques with fewer than 3 tests are excluded from the boost calculation.

**Step 6: Rank and select candidates**

Rank all scored candidates and select the top N (N determined by command context, e.g., number of variations requested for A/B testing).

**Step 7: Load selected templates**

Read each selected template's full content from `skills/social/templates/{name}.md`.

## 2. Combination Strategies

### Technique Stacking (2–3 techniques in one post)

1. Read the "Why It Works" section from each selected template to understand the psychological mechanism.
2. Check compatibility before combining:
   - Compatible example: Anaphora + List (repetition reinforces structure).
   - Potentially clashing example: Reversal + Misdirection (both redirect attention; may dilute each other).
3. Merge structures: identify the strongest structural element from each technique and combine them.
4. Maintain a consistent tone throughout the merged post.

### Section Assembly (hook + body + closer)

1. Pick a hook template from `combinations.hooks` in `_index.yaml`.
2. Pick a body template from `combinations.bodies`.
3. Pick a closer template from `combinations.closers`.
4. Adapt transitions between sections to ensure smooth, natural flow.

### Agent Judgment Criteria

Use the following rules to choose between stacking and assembly:

| Condition | Preferred Strategy |
|-----------|-------------------|
| Post < 500 characters | Technique stacking (tight integration) |
| Post > 1000 characters | Section assembly (more structured) |
| Platform = X/Twitter | Always technique stacking (280 char limit demands tight integration) |
| Platform = LinkedIn | Either approach works |

## 3. Performance-Based Ranking

- **Weight formula**: 60% topic match score + 40% overall win rate.
- **New templates** (no performance data): receive a neutral score — not penalized, not boosted.
- **Minimum test threshold**: A technique must have at least 3 completed A/B tests before its win rate influences ranking.
- **Topic matching**: Compare the post's topic keywords against `best_topics` lists in `technique_scores` within `_performance.yaml`.

## 4. Engagement Score Formula

When calculating engagement for A/B test results and performance tracking, use:

```
score = likes + (comments × 2) + (shares × 3)
```

- **Comments** are weighted 2× because they represent deeper engagement than a passive like.
- **Shares** are weighted 3× because they signal the content is worth amplifying to new audiences.

This score feeds back into `_performance.yaml` to influence future template selection via the performance bias in Step 5.
