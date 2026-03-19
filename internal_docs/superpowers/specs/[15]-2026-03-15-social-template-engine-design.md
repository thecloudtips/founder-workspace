# Social Content Template Engine — Design Specification

**Date**: 2026-03-15
**Status**: Draft
**Namespace**: `social`
**Spec Number**: [15]
**Depends On**: [10] Social Media Posting (existing social namespace)

## Overview

A template-driven content composition system for the `social` namespace. Provides persistent local storage of ~90 social media post templates (imported from a private Notion DB), intelligent template selection and combination, and automated A/B testing with engagement tracking.

The system adds three new commands (`compose`, `ab-test`, `templates`) to the existing social namespace without modifying any of the 11 existing commands. Templates are static `.md` files distributed with the plugin — no runtime Notion dependency.

## Goals

1. **Token-efficient**: Agent reads a lightweight YAML index (~3KB) first, loads full templates only on demand
2. **Fast execution**: No external API calls for template retrieval — local file reads only
3. **Learning loop**: A/B test results accumulate in a performance file, biasing future template selection
4. **Native format**: `.md` files with YAML frontmatter — consistent with Founder OS conventions
5. **Zero new dependencies**: Uses existing Late.dev integration for posting/analytics

## Architecture

### Components

```
skills/social/templates/                    # Template library (~90 files)
  ├── _index.yaml                           # Technique/audience/combination lookup
  ├── _performance.yaml                     # A/B test results and technique scores
  ├── anaphora-pattern.md                   # Individual template files
  ├── surprise-reversal.md
  ├── contrarian-take.md
  ├── cliche-flip.md
  ├── more-vs-less-mirror.md
  └── ...
skills/social/template-engine/SKILL.md      # Template selection, combination, ranking logic
commands/social/compose.md                  # Template-based content creation
commands/social/ab-test.md                  # A/B testing workflow
commands/social/templates.md                # Template library browsing/stats
```

### Data Flow

```
/social:compose "topic" --technique=reversal --platform=linkedin
    → Read _index.yaml (~3KB, technique/audience lookup)
    → Match templates by technique, platform, audience
    → Consult _performance.yaml for historical winners
    → Load matching template .md files (1-3 files, ~2KB each)
    → Agent fills template with topic content
    → Output: post text ready for /social:post or clipboard

/social:ab-test "topic" --platforms=linkedin       (Invocation 1: create + publish)
    → Pick 2 compatible templates (or use --templates=a,b)
    → Generate variant A + variant B
    → Show both for user approval
    → Post variant A immediately via /social:post
    → Schedule variant B +48h via /social:schedule
    → Record pending test in _performance.yaml (pending_tests section)

/social:ab-test --check                            (Invocation 2: measure + learn)
    → Read pending_tests from _performance.yaml
    → Fetch Late.dev analytics (or ask user for manual input)
    → Calculate scores, determine winner
    → Move from pending_tests to completed tests
    → Update technique_scores for future selection bias
```

## Template File Format

Each template is a `.md` file with structured YAML frontmatter:

```markdown
---
id: jan25-1
name: Anaphora Pattern
technique: anaphora
platforms: [linkedin, x]
tags: [repetition, rhythm, easy-read, mobile-optimized]
source_month: "2025-01"
---

## Why It Works

Repetitive structure (No—No—No, Want—Want—Want) makes reading effortless
and creates rhythm that pulls the reader through. The anaphora technique
uses repeated phrase openings to create a cadence that feels natural on
mobile screens where short, punchy lines dominate.

## Template

[Industry/Field/Area] has [transformative verb].
You don't need [traditional barrier] anymore.

No [gatekeeper 1] to [limiting action].
No [gatekeeper 2] to [blocking action].
No [traditional system] to [restrictive process].

[Disruptive force] has [empowering action] [opportunity/access].

Want to [goal 1]? [encouraging response 1].
Want to [goal 2]? [encouraging response 2].
Want to [goal 3]? [encouraging response 3].

The [resource 1] are [positive state 1].
The [resource 2] are [positive state 2].
The [resource 3] are [positive state 3].

Stop [limiting behavior 1].
Stop [limiting behavior 2].
Stop [limiting behavior 3].

Just start [key action] through [platform/medium/method].

Remember — the only thing holding you back...
Is [reflection point].

## Example

Personal development has evolved.
You don't need expensive certifications anymore.

No self-help gurus to validate your journey.
No institutions to grant permission.
No rigid programs to follow step-by-step.

Digital transformation has democratized personal growth.

Want to transform your life? Start where you are.
Want to help others grow? Share your story.
Want to make an impact? Take action today.

The tools are accessible.
The community is supportive.
The opportunities are endless.

Stop waiting for credentials.
Stop doubting your experience.
Stop comparing your chapter 1 to someone's chapter 20.

Just start serving others through authentic connection.

Remember — the only validation you need...
Is the lives you're already changing.
```

### YAML Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., `jan25-1`, `aug24-3`) |
| `name` | string | Yes | Human-readable template name |
| `technique` | string | Yes | Primary rhetorical technique (see Technique Taxonomy) |
| `platforms` | list | Yes | Target platforms (`linkedin`, `x`, or both) |
| `tags` | list | No | Searchable tags for template characteristics |
| `source_month` | string | No | Original source month (`YYYY-MM`) |

### Technique Taxonomy

Templates are categorized by primary rhetorical technique:

| Technique | Description | Example Templates |
|-----------|-------------|-------------------|
| `anaphora` | Repeated phrase openings creating rhythm | Anaphora Pattern, More vs Less Mirror |
| `reversal` | Surprise flip of expectations or clichés | Surprise Reversal, Cliché Flip |
| `contrarian` | Challenge conventional wisdom | Contrarian Take, Unlearning List |
| `list` | Numbered or bulleted actionable items | Daily Routine, Numbered Listicle |
| `story` | Narrative arc with transformation | Story Arc, Before/After |
| `question` | Rhetorical or challenge questions as hooks | Rhetorical Hook, Challenge Question |
| `misdirection` | Lead reader one way, then pivot | Misdirection Pivot, Polarizing Setup |
| `simplification` | Break overwhelming task into simple steps | Simple Exercise, 3-Step Framework |

## Index File: `_index.yaml`

Lightweight lookup file (~3KB) that the agent reads first before loading any full templates:

```yaml
# Template index for fast lookup
# Agent reads this first, then loads specific .md files on demand

techniques:
  anaphora:
    - anaphora-pattern
    - more-vs-less-mirror
  reversal:
    - surprise-reversal
    - cliche-flip
    - dont-build-a
  contrarian:
    - contrarian-take
    - unlearning-list
    - unsuccessful-vs-successful
  list:
    - daily-routine
    - numbered-listicle
    - simple-activities
  story:
    - story-arc
    - sacrifice-question
  question:
    - rhetorical-hook
    - challenge-question
  misdirection:
    - misdirection-pivot
    - polarizing-setup
  simplification:
    - simple-exercise
    - three-step-framework

# Which templates work well as specific post sections
combinations:
  hooks:
    - contrarian-take
    - rhetorical-hook
    - surprise-reversal
    - misdirection-pivot
    - polarizing-setup
  bodies:
    - anaphora-pattern
    - numbered-listicle
    - story-arc
    - unlearning-list
    - simple-exercise
  closers:
    - challenge-question
    - simple-close
    - dont-build-a

# Platform suitability
platform_affinity:
  linkedin_preferred:
    - anaphora-pattern
    - story-arc
    - numbered-listicle
    - sacrifice-question
  x_preferred:
    - surprise-reversal
    - cliche-flip
    - dont-build-a
    - misdirection-pivot
  both:
    - contrarian-take
    - rhetorical-hook
    - polarizing-setup
```

## Performance File: `_performance.yaml`

Stores A/B test results and cumulative technique scores. **Ships empty** — the example below shows the schema after data accumulates. The initial file committed to the repo contains only empty stubs:

```yaml
# Initial _performance.yaml (shipped in repo):
# tests: []
# pending_tests: []
# technique_scores: {}
```

**Schema example** (after A/B tests have been run — NOT the initial file content):

```yaml
# Auto-generated by /social:ab-test. Do not edit manually.
# Used by /social:compose for performance-biased template selection.

pending_tests:
  - created: "2026-03-20"
    topic: "freelancing vs employment"
    platform: linkedin
    variant_a: { template: surprise-reversal, post_id: "post_abc123" }
    variant_b: { template: anaphora-pattern, post_id: "post_def456" }
    measure_after: "2026-03-23T00:00:00Z"

tests:
  - date: "2026-03-20"
    topic: "freelancing vs employment"
    platform: linkedin
    variant_a:
      template: surprise-reversal
      post_id: "post_abc123"
      engagement:
        likes: 142
        comments: 23
        shares: 8
        impressions: 4200
      score: 173
      source: "late_analytics"   # or "manual"
    variant_b:
      template: anaphora-pattern
      post_id: "post_def456"
      engagement:
        likes: 89
        comments: 45
        shares: 12
        impressions: 3800
      score: 215
      source: "late_analytics"
    winner: variant_b
    insight: "Anaphora pattern drove 2x comments despite fewer impressions"

technique_scores:
  anaphora:
    wins: 3
    losses: 1
    avg_score: 198
    best_topics: [productivity, mindset, personal-growth]
  reversal:
    wins: 2
    losses: 2
    avg_score: 165
    best_topics: [career, entrepreneurship]

# Engagement score formula:
# score = likes + (comments * 2) + (shares * 3)
# Comments weighted 2x (signal deeper engagement)
# Shares weighted 3x (signal content worth amplifying)
```

## Commands

All commands follow the universal execution flow from the existing social namespace spec ([10]).

### `/social:compose`

**Template-driven content creation.**

```yaml
---
description: Create social media content using template library with intelligent selection and combination
argument-hint: '"topic" [--technique=name] [--pick=N] [--combine] [--platform=linkedin|x]'
allowed-tools: ["Read"]
execution-mode: background
result-format: full
---
```

**Arguments:**

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `topic` | Yes | — | Topic or idea for the post (positional) |
| `--technique` | No | auto | Specific technique to use (from taxonomy) |
| `--pick` | No | 1 | Number of templates to consider |
| `--combine` | No | false | Combine multiple templates (technique stacking or section assembly) |
| `--platform` | No | linkedin | Target platform for length/format optimization |
| `--audience` | No | auto | Target audience hint for example adaptation |
| `--variations` | No | 1 | Generate N different versions |
| `--to-file` | No | — | Save output to file path |

**Note on `--to-post` omission**: Since `compose` runs as a background subagent, it cannot directly invoke `/social:post`. Instead, the result returned to the main session includes the generated post text formatted for easy copy-paste or follow-up with `/social:post`. The dispatcher result template includes a "Next step" suggestion: `Run /social:post "..." --platforms=<platform> to publish`.

**Execution flow:**

1. **Load Skills**: Read `template-engine/SKILL.md`
2. **Business Context**: Check `_infrastructure/context/active/` for brand voice
3. **Memory Context**: Inject relevant memories
4. **Phase 1 — Template Selection**:
   - Read `_index.yaml` for technique/platform lookup
   - Read `_performance.yaml` for historical winners (if exists)
   - Match templates by: technique (if specified), platform affinity, topic relevance
   - Apply performance bias: favor techniques with higher win rates for similar topics
   - If `--pick=N`: select top N candidates
5. **Phase 2 — Template Loading**:
   - Read selected template .md files (1-3 files, ~2KB each)
   - Parse frontmatter + template structure + "why it works" explanation
6. **Phase 3 — Content Generation**:
   - If single template: fill placeholders with topic-relevant content
   - If `--combine`:
     - **Technique stacking**: merge 2-3 rhetorical techniques into one post (e.g., Anaphora opening + Reversal close). Use "why it works" to judge compatibility.
     - **Section assembly**: pick hook from `combinations.hooks`, body from `combinations.bodies`, closer from `combinations.closers`. Build a composite post.
     - Agent uses judgment to decide which approach works better for the topic.
   - Adapt length and formatting for target `--platform`
   - If `--audience` specified, tailor language and examples to that audience
7. **Phase 4 — Output**:
   - Display generated post(s) with template attribution
   - Show character count vs platform limit
   - If `--to-file`: write to specified path
   - Include "Next step" suggestion in result for easy follow-up with `/social:post`
   - If `--variations=N`: show all N versions numbered
8. **Observation Logging**: Log template usage + topic

### `/social:ab-test`

**Automated A/B testing with engagement tracking.**

```yaml
---
description: Generate and test two content variants using different templates, track engagement, log results
argument-hint: '"topic" --platforms=linkedin [--measure-after=72] [--stagger=48]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---
```

**Arguments:**

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `topic` | Yes | — | Topic for A/B test (positional) |
| `--platforms` | Yes | — | Target platform(s) |
| `--templates` | No | auto | Specific template IDs for A and B (comma-separated) |
| `--measure-after` | No | 72 | Hours to wait before comparing engagement |
| `--stagger` | No | 48 | Hours between posting variant A and B |
| `--check` | No | false | Measure pending A/B tests and log results (Invocation 2) |

**Execution flow (two-invocation model):**

1. **Phase 1 — Variant Generation**:
   - Select 2 templates (from `--templates` or agent picks based on topic fit)
   - Generate variant A and variant B
   - Display both side-by-side for user approval
   - User can edit either variant before confirming
2. **Phase 2 — Staggered Publishing**:
   - Post variant A immediately via existing `/social:post` pipeline
   - Schedule variant B for `--stagger` hours later via existing `/social:schedule`
   - Record both post IDs
3. **Phase 3 — Measurement** (after `--measure-after` hours):
   - Attempt to fetch engagement via `late-tool.mjs analytics get` for both post IDs
   - **If Late.dev Analytics add-on available**: auto-fetch likes, comments, shares, impressions
   - **If not available (graceful degradation)**: ask user to provide engagement numbers manually from LinkedIn/X native dashboards
   - Calculate engagement score: `likes + (comments * 2) + (shares * 3)`
4. **Phase 4 — Results & Learning**:
   - Determine winner (higher engagement score)
   - Generate insight (what drove the difference)
   - Append result to `_performance.yaml`
   - Update `technique_scores` aggregates
   - Display summary to user

**Two-invocation model**: Phases 1-2 run on first invocation (create + publish). The user runs `/social:ab-test --check` separately after the measurement window passes (typically 72h). Phase 3-4 then execute, reading pending test metadata from `_performance.yaml`. This avoids persistent background jobs or cron.

### `/social:templates`

**Template library browsing and performance stats.**

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

| Subcommand | Description |
|------------|-------------|
| `list` | List all templates with optional `--technique` filter |
| `show <id>` | Display full template content |
| `stats` | Show technique win/loss rates from `_performance.yaml` |

## Skill: `template-engine/SKILL.md`

```yaml
---
name: template-engine
description: "Activates when creating content from templates. Provides template selection logic, combination strategies, and performance-based ranking."
globs: ["commands/social/compose.md", "commands/social/ab-test.md"]
---
```

Core logic for the template system:

### Template Selection Algorithm

1. **Filter by platform**: Use `platform_affinity` from `_index.yaml`
2. **Filter by technique**: If `--technique` specified, narrow to that technique group
3. **Topic matching**: Score each template's tags against topic keywords
4. **Performance bias**: If `_performance.yaml` exists, boost templates from techniques with higher win rates for similar topic categories
5. **Rank and select**: Return top N candidates

### Combination Strategies

**Technique stacking** (2-3 techniques in one post):
- Read "why it works" from each template
- Check for compatibility (e.g., Anaphora + List works well; Reversal + Misdirection may clash)
- Merge structures: use the strongest structural element from each
- Maintain consistent tone throughout

**Section assembly** (hook + body + closer):
- Pick hook template from `combinations.hooks`
- Pick body template from `combinations.bodies`
- Pick closer template from `combinations.closers`
- Adapt transitions between sections for smooth flow

**Agent judgment criteria**:
- Short posts (< 500 chars): prefer technique stacking (tighter integration)
- Long posts (> 1000 chars): prefer section assembly (more structured)
- X/Twitter: always technique stacking (280 char limit demands tight integration)
- LinkedIn: either approach works

### Performance-Based Ranking

When `_performance.yaml` has data:
- Calculate technique affinity for the current topic by comparing topic keywords against `best_topics` lists
- Weight: 60% topic match, 40% overall win rate
- New templates (no performance data) get a neutral score — not penalized, not boosted
- Minimum 3 A/B tests per technique before performance data influences ranking (avoid premature conclusions from small samples)

## Template Import Process

**Dev-time only** — not part of the distributed plugin.

The import process reads the private Notion DB (18 monthly pages, ~5 templates each) and converts to structured .md files:

1. Fetch each page from the Notion DB
2. Parse the content structure: "Template #N" headers → individual templates
3. Extract: name, "why it works", template body, example, linked post URL
4. Classify technique (from "why it works" explanation)
5. Determine platform affinity (from linked post URLs — linkedin.com vs x.com)
6. Write `.md` file with YAML frontmatter
7. Build `_index.yaml` from all templates
8. Initialize empty `_performance.yaml`

This import runs once during development. The resulting .md files are committed to the founderOS repo and included in the dist package.

## Integration Points

### Existing Commands (unchanged)

The compose command output feeds into existing commands:

```
/social:compose "topic" --platform=linkedin
    → generates post text with "Next step" suggestion:
      Run /social:post "..." --platforms=linkedin to publish

/social:compose "topic" --variations=2
    → generates 2 versions numbered
    → user copies preferred version
    → runs /social:post manually
```

### Existing Skills (unchanged)

- `platform-adaptation/SKILL.md`: Used by compose to respect platform constraints
- `cross-posting/SKILL.md`: Used when compose output goes to cross-post
- `posting-cadence/SKILL.md`: Used by ab-test for optimal stagger timing

### Memory Integration

The template engine participates in the existing memory system:
- **Context injection**: Memories about brand voice, audience preferences, and past successful posts are injected during compose
- **Observation logging**: Template selections and outcomes are logged as observations for the memory engine

### CLAUDE.md Updates

Add three new commands to the social namespace row in the namespace table:

```
| 33 | Social Media | `social` | post, cross-post, schedule, draft, status, reply, analytics, queue, connect, profiles, webhooks, compose, ab-test, templates | Late.dev | Content (...) |
```

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `skills/social/templates/_index.yaml` | Technique/platform/combination lookup index |
| `skills/social/templates/_performance.yaml` | A/B test results and technique scores (starts empty) |
| `skills/social/templates/*.md` (~90 files) | Individual template files with YAML frontmatter |
| `skills/social/template-engine/SKILL.md` | Selection, combination, and ranking logic |
| `commands/social/compose.md` | Template-based content creation command |
| `commands/social/ab-test.md` | A/B testing workflow command |
| `commands/social/templates.md` | Template browsing and stats command |

### Modified Files

| File | Change |
|------|--------|
| `CLAUDE.md` | Add compose, ab-test, templates to social namespace row |
| `skills/social/posting-cadence/SKILL.md` | Add `commands/social/ab-test.md` to `globs` array (ab-test uses posting cadence for stagger timing) |

### Unchanged

All 11 existing social commands, 3 existing social skills, agent team pipeline, Late.dev integration, Notion DB templates.

## Development Plan

### Wave 1: Template Library (parallel subagents)
- **Agent A**: Import templates from Notion DB → .md files with frontmatter
- **Agent B**: Build `_index.yaml` with technique taxonomy and combination maps
- **Agent C**: Create `template-engine/SKILL.md` with selection and combination logic

### Wave 2: Commands (parallel subagents, depends on Wave 1)
- **Agent D**: `commands/social/compose.md` — full command with frontmatter and execution flow
- **Agent E**: `commands/social/ab-test.md` — A/B workflow with measurement and performance logging
- **Agent F**: `commands/social/templates.md` — browsing and stats command

### Wave 3: Integration (sequential, depends on Wave 2)
- Update CLAUDE.md namespace table
- Verify compose → post pipeline works
- Initialize empty `_performance.yaml`

## Related Specs

- **[16] LinkedIn Content Ideation Refactor** (stub): Refactors the `linkedin` namespace into a pure content ideation layer, removing publishing overlap with `social`. The target pipeline is: `linkedin` (ideation) → `social:compose` (template composition) → `social:post` (publishing). Spec [16] depends on [15] being implemented first.

## Open Questions

None — all design decisions resolved during brainstorming.
