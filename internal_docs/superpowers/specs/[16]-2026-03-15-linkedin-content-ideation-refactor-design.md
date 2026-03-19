# Content Ideation Namespace Refactor — Design Specification

**Date**: 2026-03-15
**Status**: Draft
**Namespace**: `ideate` (replacing `linkedin`)
**Spec Number**: [16]
**Depends On**: [10] Social Media Posting, [15] Social Content Template Engine
**Related**: This spec refactors the `linkedin` namespace (P24) into a broadened `ideate` namespace for multi-platform content ideation, removing publishing responsibility to the `social` namespace.

## Overview

Rename the `linkedin` namespace to `ideate` and broaden it from LinkedIn-only content generation to multi-platform ideation covering LinkedIn, X/Twitter, Meta (Facebook + Instagram), and TikTok. Publishing, formatting, and platform-specific adaptation move entirely to the `social` namespace ([10], [15]).

The `ideate` namespace becomes a pure **content ideation layer**: raw content generation, topic research, document extraction, structured outlines, and fact gathering. Its output feeds into `social:compose` for template application and `social:post` for publishing.

## Goals

1. **Clean separation**: Ideation (thinking) vs composition (formatting) vs publishing (posting) are three distinct layers
2. **Multi-platform**: Ideation output is platform-aware but not platform-formatted — guidance on what works where, without locking into a specific format
3. **Composable pipeline**: Each command is independently useful; users can enter at any point
4. **Zero publishing dependency**: No Late.dev API calls, no Notion Content DB writes from this namespace
5. **Skill reuse**: Generalized skills serve all platforms from a single source of truth

## Architecture

### Layer Separation

| Layer | Namespace | Responsibility |
|-------|-----------|---------------|
| **Ideation & Research** | `ideate` | Raw content generation, topic research, document extraction, outlines, fact gathering, angle variations |
| **Composition** | `social` | Template-driven formatting, technique application, A/B testing, platform-specific adaptation |
| **Publishing** | `social` | Posting, scheduling, monitoring, analytics via Late.dev |

### Components

```
commands/ideate/                               # 6 commands
  ├── draft.md                                 # Raw content brief from topic (was linkedin:post)
  ├── from-doc.md                              # Extract content angles from documents
  ├── variations.md                            # Generate angle variations
  ├── research.md                              # Topic research with web search
  ├── outline.md                               # Structural content outlines
  └── facts.md                                 # Fact/stat extraction from documents/URLs
skills/ideate/                                 # 3 generalized skills
  ├── content-writing/SKILL.md                 # Multi-platform writing guidance
  │   └── references/post-frameworks.md        # Framework templates (all platforms)
  ├── hook-creation/SKILL.md                   # Multi-platform hook formulas
  │   └── references/hook-templates.md         # Hook examples (all platforms)
  └── founder-voice/SKILL.md                   # Platform-calibrated voice
      └── references/voice-examples.md         # Before/after examples (all platforms)
```

### Data Flow (Target State)

```
ideate:research "freelancing" --platforms=linkedin,x
    → web search for trends, stats, competitor angles
    → outputs research brief with 3-5 ranked angles

ideate:facts quarterly-report.pdf
    → extracts stats, quotes, data points
    → outputs classified fact list (hook-worthy, supporting, credibility)

ideate:outline "freelancing vs employment" --framework=contrarian --platform=linkedin
    → generates skeleton: hook options, body beats, closer options

ideate:draft "freelancing vs employment" --platform=linkedin --framework=contrarian
    → uses founder voice, content-writing skill
    → outputs content brief (not platform-formatted)

social:compose "content brief" --technique=reversal --platform=linkedin
    → applies template from [15] engine, formats for platform
    → outputs ready-to-post content

social:post "content" --platforms=linkedin,x
    → publishes via Late.dev
```

Each step is independent — users can enter at any point. `ideate:research` into `ideate:draft` is a natural flow but not required.

## Commands

All commands follow the universal execution flow from the existing namespace conventions. All command `.md` files include standard YAML frontmatter per Founder OS conventions.

### Universal Execution Flow (all ideate commands)

Every command in the `ideate` namespace wraps its command-specific phases in this standard flow:

1. **Load Skills**: Read required skill files from `skills/ideate/`
2. **Business Context** (Optional): Check `_infrastructure/context/active/` for personalization
3. **Preflight Check**: Read `_infrastructure/preflight/SKILL.md`, run check for `ideate` namespace. If `blocked`, stop. If `degraded`, note unavailable sources.
4. **Step 0: Memory Context**: Read `_infrastructure/memory/context-injection/SKILL.md`, query for relevant memories, inject into working context
5. **Observation: Start**: Record `pre_command` event to Intelligence event store with session_id
6. **Intelligence: Apply Learned Patterns**: Query Intelligence DB for active patterns matching plugin/command
7. **Phase 1–N**: Command-specific execution phases (see each command below)
8. **Self-Healing: Error Recovery**: Classify errors (transient/recoverable/degradable/fatal), apply recovery per `_infrastructure/intelligence/self-healing/SKILL.md`
9. **Output**: Display results in chat (and optionally write to file)
10. **Observation: End**: Record `post_command` event with outcome, duration, payload
11. **Final: Memory Update**: Read `_infrastructure/memory/pattern-detection/SKILL.md`, log observation, check for emerging patterns

### Modified Commands

#### `ideate:draft` (was `linkedin:post`)

Generate raw content from a topic with framework selection, audience targeting, and founder voice.

```yaml
---
description: Generate raw content from a topic with framework selection, audience targeting, and founder voice
argument-hint: "[topic] [--platform=linkedin|x|meta|tiktok] [--audience=founder|technical|marketer|cxo] [--framework=story|listicle|contrarian|howto|lesson|insight|question] [--length=short|medium|long] [--to-file=PATH]"
allowed-tools: ["Read", "Write"]
execution-mode: background
result-format: summary
---
```

**Arguments:**

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `topic` | Yes | — | Topic or idea for the content (positional) |
| `--platform` | No | linkedin | Target platform for length/style calibration |
| `--audience` | No | founder | Target reader segment |
| `--framework` | No | auto | Post structure framework (story, listicle, contrarian, howto, lesson, insight, question) |
| `--length` | No | medium | Content length mode (short, medium, long) |
| `--to-file` | No | — | Save output to file path (otherwise ephemeral in chat) |
| `--tone` | No | professional | Humanization tone preset |

**Key changes from `linkedin:post`:**
- Removes Notion Content DB integration (no more upsert to `[FOS] Content`)
- Removes default file output to `linkedin-posts/` directory (ephemeral by default, `--to-file` optional)
- Adds `--platform` flag (linkedin, x, meta, tiktok) to calibrate length/style guidance
- Output is a **content brief** — structured text with framework, key points, hook candidates, and body text — not a platform-formatted post
- Keeps the 3-phase structure (Ideation, Draft, Validate) but Phase 3 drops platform formatting checks and hashtag generation
- Skills loaded: `content-writing`, `hook-creation`, `founder-voice` (generalized versions from `skills/ideate/`)

**Execution flow:**

1. **Phase 1 — Ideation**: Framework selection (same logic as linkedin:post), hook generation (3 candidates), key points identification, audience calibration. Platform awareness influences framework selection (e.g., TikTok favors pattern-interrupt, X favors contrarian).
2. **Phase 2 — Draft**: Write content brief using selected framework structure. Apply founder voice. Platform-aware length guidance but no platform-specific formatting (no hashtags, no character limit enforcement beyond reasonable bounds).
3. **Phase 3 — Validate and Output**: Quality checklist from content-writing skill (generalized). Display content brief with metadata. Include "Next step" suggestion: `Run /social:compose "..." --platform=<platform> to format and publish`.

**Output format:**

```
## Content Brief

- **Topic**: [topic]
- **Framework**: [selected framework]
- **Audience**: [target segment]
- **Platform hint**: [platform]
- **Length**: [mode] ([character count] characters)

### Hook Candidates
1. [hook] ← selected
2. [hook]
3. [hook]

### Content

[Raw content body in founder voice — structured by framework but not platform-formatted]

---
Next step: Run /social:compose "..." --platform=<platform> to format and publish.
```

#### `ideate:from-doc` (modified from `linkedin:from-doc`)

Extract content angles from documents for multi-platform ideation.

```yaml
---
description: Extract key points from a document and generate content angles for social media
argument-hint: "[file-path-or-paste] [--platforms=linkedin,x,meta,tiktok] [--audience=founder|technical|marketer|cxo] [--framework=auto|story|listicle|contrarian|howto|lesson|insight|question] [--to-file=PATH]"
allowed-tools: ["Read", "Write"]
execution-mode: background
result-format: summary
---
```

**Arguments:**

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `source` | Yes | — | File path or pasted text (positional). Supports `.md`, `.txt`, `.pdf`. |
| `--platforms` | No | linkedin | Target platforms for angle scoring and recommendations (comma-separated) |
| `--audience` | No | founder | Target reader segment |
| `--framework` | No | auto | Post structure framework |
| `--to-file` | No | — | Save output to file path (otherwise ephemeral) |

**Key changes from `linkedin:from-doc`:**
- Same extraction pipeline (Phase 1) but output is ideation material, not a formatted post
- Adds `--platforms` flag for platform-aware angle selection (TikTok favors visual/action angles, X favors punchy contrarian takes, Meta favors storytelling). Supports multiple platforms in one pass.
- Removes Notion logging and default file output
- Phase 2 generates a content brief, not a finished post
- No hashtag generation

**Execution flow:**

1. **Phase 1 — Extract**: Read source, identify document type, extract 3-7 key points with supporting details, identify strongest angle. Platform awareness influences angle ranking (e.g., data-heavy angles rank higher for LinkedIn, visual/action angles for TikTok).
2. **Phase 2 — Draft**: Generate content brief using the strongest angle. If `--platforms` specified, generate separate angle recommendations per platform.
3. **Phase 3 — Output**: Display content brief with source attribution. Suggest next step.

#### `ideate:variations` (modified from `linkedin:variations`)

Generate multiple angle variations from a topic or existing draft.

```yaml
---
description: Generate multiple content angle variations with different hooks, frameworks, and tones
argument-hint: "[draft-or-topic] [--platform=linkedin|x|meta|tiktok] [--audience=founder|technical|marketer|cxo] [--count=3]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---
```

**Arguments:**

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `draft-or-topic` | Yes | — | Topic string, pasted draft text, or prior command output (positional) |
| `--platform` | No | linkedin | Target platform for style calibration |
| `--audience` | No | founder | Target reader segment (inherited from prior post if available) |
| `--count` | No | 3 | Number of variations to generate (max 5) |

**Key changes from `linkedin:variations`:**
- Adds `--platform` to vary output style guidance per platform
- Variations are ideation-level (different angles, hooks, frameworks) not platform-formatted posts
- Can generate cross-platform variations when used with different `--platform` values
- Remains ephemeral (no file output, no Notion) — unchanged from original

**Execution flow:** Same as `linkedin:variations` but outputs content briefs instead of formatted posts. Each variation uses a different framework + hook formula + tone shift. For each variation, change at least TWO of: hook style, framework, tone. Display comparison table at end.

### New Commands

#### `ideate:research`

Research a topic for content angles using web search, trend analysis, and competitor content analysis.

```yaml
---
description: Research a topic for content angles — web search, trend analysis, competitor content
argument-hint: "[topic] [--platforms=linkedin,x,meta,tiktok] [--depth=quick|deep]"
allowed-tools: ["Read", "WebSearch", "WebFetch"]
execution-mode: background
result-format: full
---
```

**Arguments:**

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `topic` | Yes | — | Topic to research (positional) |
| `--platforms` | No | linkedin | Target platforms for angle scoring |
| `--depth` | No | quick | Research depth: quick (3-5 searches) or deep (8-12 searches + competitor analysis) |

**Execution flow:**

1. **Phase 1 — Topic Analysis**: Break topic into searchable dimensions — industry angle, contrarian angle, data angle, trend angle, personal experience angle.
2. **Phase 2 — Web Research**: Search for recent articles, statistics, competitor posts, trending discussions on the topic. Quick mode: 3-5 targeted searches. Deep mode: 8-12 searches across different dimensions + competitor content analysis.
3. **Phase 3 — Angle Generation**: Synthesize 3-5 content angles from research. For each angle: hook idea, 2-3 supporting data points, platform fit score (which platforms this angle works best on), framework recommendation.
4. **Phase 4 — Output**: Structured research brief with angles ranked by engagement potential per platform. Include source URLs for fact-checking.

**Output format:**

```
## Research Brief: [topic]

**Depth**: [quick|deep]
**Sources consulted**: [count]

### Angle 1: [title] ★ Best for: LinkedIn, X
**Hook idea**: [one-line hook]
**Supporting data**:
- [stat or fact with source]
- [stat or fact with source]
**Framework**: [recommended framework]
**Why it works**: [one sentence]

### Angle 2: [title] ★ Best for: TikTok, Meta
...

---
Next step: Run /ideate:draft "[selected angle]" --platform=<platform> to generate content.
```

#### `ideate:outline`

Generate a structured content outline from a topic or brief.

```yaml
---
description: Generate a structured content outline from a topic or brief
argument-hint: "[topic-or-brief] [--framework=story|listicle|contrarian|howto|lesson|insight|question] [--platform=linkedin|x|meta|tiktok] [--depth=skeleton|detailed]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---
```

**Arguments:**

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `topic-or-brief` | Yes | — | Topic, research brief output, or pasted text (positional) |
| `--framework` | No | auto | Structure framework |
| `--platform` | No | linkedin | Platform for length/structure guidance |
| `--depth` | No | skeleton | Outline depth: skeleton (headings + one-liners) or detailed (full beat-by-beat) |

**Execution flow:**

1. **Phase 1 — Structure Selection**: If `--framework=auto`, analyze topic and select best framework. Consider platform — X outlines are tighter (thread structure), TikTok outlines emphasize opening hook and CTA.
2. **Phase 2 — Outline Generation**:
   - **Skeleton mode**: Hook options (2-3), body section headings with one-line descriptions, closer options (2-3).
   - **Detailed mode**: Full beat-by-beat outline with: multiple hook candidates, body sections with bullet points per beat, transition notes between sections, closer options with audience-specific variants.
3. **Phase 3 — Output**: Display outline with framework label and platform guidance notes.

#### `ideate:facts`

Extract facts, statistics, and quotable data from documents or URLs for content backing.

```yaml
---
description: Extract facts, statistics, and quotable data from documents or URLs for content backing
argument-hint: "[file-path-or-url] [--format=bullets|table] [--max=10]"
allowed-tools: ["Read", "WebFetch"]
execution-mode: background
result-format: full
---
```

**Arguments:**

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `source` | Yes | — | File path or URL (positional) |
| `--format` | No | bullets | Output format: bullets or table |
| `--max` | No | 10 | Maximum facts to extract |

**Execution flow:**

1. **Phase 1 — Source Loading**: Read document file or fetch URL content. Supported: `.md`, `.txt`, `.pdf` (via Read tool), URLs (via WebFetch).
2. **Phase 2 — Fact Extraction**: Pull out statistics with sources, quotable statements, data points, trend indicators, counterintuitive findings.
3. **Phase 3 — Classification**: Tag each fact by content role:
   - **Hook-worthy**: Surprising stats or counterintuitive findings that could open a post
   - **Body-supporting**: Evidence and examples that back up a claim
   - **Credibility-building**: Authoritative sources, named studies, expert quotes
4. **Phase 4 — Output**: Structured list with source attribution, classification tags, and suggested use context. Ready to inject into `ideate:draft` or `social:compose`.

## Skills

### Skill Migration

| New Skill | From | Scope Change |
|-----------|------|-------------|
| `skills/ideate/content-writing/SKILL.md` | `skills/linkedin/linkedin-writing/SKILL.md` | Add platform sections for X, Meta (FB + IG), TikTok. Keep LinkedIn section intact. Generalize framework selection logic. |
| `skills/ideate/hook-creation/SKILL.md` | `skills/linkedin/hook-creation/SKILL.md` | Add platform-specific hook guidance for X, Meta, TikTok. Keep LinkedIn hook rules intact. |
| `skills/ideate/founder-voice/SKILL.md` | `skills/linkedin/founder-voice/SKILL.md` | Add platform tone calibration notes. Core voice principles unchanged. |

### Platform Coverage in Skills

Each generalized skill gets platform-specific sections:

| Platform | Content-Writing Focus | Hook Focus | Voice Calibration |
|----------|----------------------|------------|-------------------|
| **LinkedIn** | 3000 char, line breaks, no markdown, 3-5 hashtags at end, professional formatting | 210 char fold, curiosity gap, 6 proven formulas | Professional-conversational, opinionated |
| **X/Twitter** | 280 char per tweet, thread structure, 1-2 inline hashtags, plain text only | < 50 char punchy, pattern interrupt, contrarian lead | Casual-punchy, contrarian, direct |
| **Meta (FB)** | 500 char sweet spot, visual-first, link in comments, storytelling format | Emotional resonance, identification, visual context hooks | Warm-personal, storytelling, relatable |
| **Meta (IG)** | 2200 char caption, visual context required, 20-30 hashtags in comment, first line = scroll-stop | Visual hook reference, first line critical, behind-the-scenes tone | Authentic, behind-the-scenes, lifestyle |
| **TikTok** | 150 char caption, trend hooks, CTA in caption, hashtag challenges | Pattern interrupt, trend reference, first 3 words decisive | Direct, trend-aware, Gen-Z adaptable, high energy |

### Skill Frontmatter Updates

All three skills update their `globs` to target the new namespace:

```yaml
---
globs:
  - "commands/ideate/*.md"
---
```

### Reference Files

Each skill's `references/` directory is carried over from the linkedin skills and expanded:

- `content-writing/references/post-frameworks.md` — Framework templates expanded with platform-specific variants (e.g., X thread structure for Listicle, TikTok script structure for How-To)
- `hook-creation/references/hook-templates.md` — Hook examples expanded with X, Meta, TikTok examples alongside LinkedIn
- `founder-voice/references/voice-examples.md` — Before/after rewrite examples expanded to show platform tone shifts

## Removed Responsibilities

The `ideate` namespace does NOT:

- Call Late.dev API (no publishing, scheduling, or status tracking)
- Write to Notion Content DB (no `[FOS] Content` upsert)
- Apply platform-specific formatting (no hashtags, no character limit enforcement, no thread splitting)
- Handle media upload
- Generate default file output (ephemeral unless `--to-file` specified)

These responsibilities belong to the `social` namespace.

## Migration

### Clean Break

The `linkedin` namespace is removed entirely. No deprecation aliases, no redirect commands. Users adopt the new `ideate` namespace and `social` pipeline.

### Deleted Files

| Path | Reason |
|------|--------|
| `commands/linkedin/post.md` | Replaced by `commands/ideate/draft.md` |
| `commands/linkedin/from-doc.md` | Replaced by `commands/ideate/from-doc.md` |
| `commands/linkedin/variations.md` | Replaced by `commands/ideate/variations.md` |
| `skills/linkedin/linkedin-writing/SKILL.md` | Replaced by `skills/ideate/content-writing/SKILL.md` |
| `skills/linkedin/linkedin-writing/references/post-frameworks.md` | Moves to `skills/ideate/content-writing/references/` |
| `skills/linkedin/hook-creation/SKILL.md` | Replaced by `skills/ideate/hook-creation/SKILL.md` |
| `skills/linkedin/hook-creation/references/hook-templates.md` | Moves to `skills/ideate/hook-creation/references/` |
| `skills/linkedin/founder-voice/SKILL.md` | Replaced by `skills/ideate/founder-voice/SKILL.md` |
| `skills/linkedin/founder-voice/references/voice-examples.md` | Moves to `skills/ideate/founder-voice/references/` |

### New Files

| Path | Purpose |
|------|---------|
| `commands/ideate/draft.md` | Content brief generation (replaces linkedin:post) |
| `commands/ideate/from-doc.md` | Document-to-content extraction |
| `commands/ideate/variations.md` | Angle variations |
| `commands/ideate/research.md` | Topic research with web search |
| `commands/ideate/outline.md` | Structural outlines |
| `commands/ideate/facts.md` | Fact/stat extraction |
| `skills/ideate/content-writing/SKILL.md` | Generalized writing skill (LinkedIn + X + Meta + TikTok) |
| `skills/ideate/content-writing/references/post-frameworks.md` | Framework templates (all platforms) |
| `skills/ideate/hook-creation/SKILL.md` | Generalized hook skill |
| `skills/ideate/hook-creation/references/hook-templates.md` | Hook templates (all platforms) |
| `skills/ideate/founder-voice/SKILL.md` | Generalized voice skill |
| `skills/ideate/founder-voice/references/voice-examples.md` | Voice examples (all platforms) |

### Modified Files

| Path | Change |
|------|--------|
| `CLAUDE.md` | Replace `linkedin` row (#24) with `ideate` — 6 commands, WebSearch (research only), no HQ DB. Update namespace count. Remove linkedin from dependency notes. |

### CLAUDE.md Namespace Table Update

Replace row #24:

```
| 24 | Content Ideation | `ideate` | draft, from-doc, variations, research, outline, facts | WebSearch (research only) | — |
```

The total namespace count remains **33** — `ideate` replaces `linkedin` at the same row number. No HQ DB dependency — ideation output is ephemeral or piped to `social:compose`.

No entries in the Namespace Dependencies section reference `linkedin` directly, so no dependency note changes are needed.

### Preflight Check

The `ideate` namespace has minimal external dependencies:

| Dependency | Required By | Check |
|-----------|-------------|-------|
| WebSearch | `research` only | Optional — if unavailable, research runs without web data and notes the limitation |

All other commands (`draft`, `from-doc`, `variations`, `outline`, `facts`) require only the Read tool and have no external dependencies. All six commands still run the preflight step per convention (even if the check passes trivially with no dependencies to validate).

Add to `_infrastructure/preflight/dependency-registry.json`:

```json
{
  "ideate": {
    "required": [],
    "optional": ["websearch"]
  }
}
```

## Development Plan

### Wave 1 (parallel subagents)

| Agent | Deliverables |
|-------|-------------|
| **Agent A — Skills** | Create 3 generalized skills from existing LinkedIn skills: `content-writing/SKILL.md`, `hook-creation/SKILL.md`, `founder-voice/SKILL.md` with platform sections for LinkedIn, X, Meta (FB + IG), TikTok. Migrate and expand reference files. |
| **Agent B — Modified Commands** | Create `commands/ideate/draft.md`, `from-doc.md`, `variations.md` adapted from linkedin originals. Remove Notion integration, add `--platform` flag, output content briefs instead of formatted posts. |

### Wave 2 (parallel subagents, after Wave 1)

| Agent | Deliverables |
|-------|-------------|
| **Agent C — New Commands** | Create `commands/ideate/research.md`, `outline.md`, `facts.md` following universal command execution flow. |
| **Agent D — Integration** | Update `CLAUDE.md` namespace table. Update [10] spec (`docs/superpowers/specs/[10]-*.md`) to replace stale `linkedin:post`/`linkedin:from-doc`/`linkedin:variations` references with `ideate:*`. Update `_infrastructure/preflight/dependency-registry.json`. Verify no other files reference old `linkedin` namespace paths. |

### Wave 3 (sequential, after Wave 2)

- Delete `commands/linkedin/` directory (3 files)
- Delete `skills/linkedin/` directory (3 skills + 3 reference files)
- Final verification: grep for `linkedin:post`, `linkedin:from-doc`, `linkedin:variations`, `skills/linkedin/`, `commands/linkedin/` across the entire codebase including `docs/superpowers/specs/`, `CLAUDE.md`, and `_infrastructure/`

### Dependencies

```
Wave 1 (Skills + Modified Commands) — independent, parallel
Wave 2 (New Commands + Integration) — depends on Wave 1 skills existing
Wave 3 (Cleanup) — depends on all new files being in place
```

## Integration Points

### With Social Namespace ([10])

The ideate output feeds naturally into social commands:

```
ideate:draft "topic" → social:compose "content" → social:post → Late.dev
ideate:from-doc doc.pdf → social:compose "content" → social:cross-post
ideate:research "topic" → ideate:draft "angle" → social:compose → social:post
```

The user passes the **Content section** of the ideate output (the raw body text) as the `topic` argument to `social:compose` — not the full structured brief with metadata headers. `social:compose` treats its positional `topic` argument as a content seed and applies template techniques to it. The hook candidates and framework metadata from ideate output inform the user's choice but are not passed programmatically.

### With Template Engine ([15])

`social:compose` uses the template engine to apply rhetorical techniques. Ideate output provides the raw content that compose formats using templates:

```
ideate:draft "topic" --framework=contrarian
    → outputs raw contrarian content brief

social:compose "content brief" --technique=reversal --platform=linkedin
    → selects reversal template from [15] library
    → applies template structure to the content brief
    → formats for LinkedIn (3000 char, hashtags, line breaks)
```

### With Memory Engine

The ideate namespace participates in the existing memory system:
- **Context injection** (Step 0): Memories about brand voice, audience preferences, and past content topics are injected during ideation
- **Observation logging** (Final step): Topic selections, framework choices, and platform usage are logged as observations

## Open Questions

None — all design decisions resolved during brainstorming.
