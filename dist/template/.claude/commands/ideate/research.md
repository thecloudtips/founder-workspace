---
description: Research a topic for content angles — web search, trend analysis, competitor content
argument-hint: "[topic] [--platforms=linkedin,x,meta,tiktok] [--depth=quick|deep]"
allowed-tools: ["Read", "WebSearch", "WebFetch"]
execution-mode: background
result-format: full
---

# /founder-os:ideate:research

Research a topic to discover content angles, supporting data, and platform-specific hooks.

## Skills

Read these skill files before proceeding:

1. Read `skills/ideate/content-writing/SKILL.md` — platform knowledge, content frameworks, audience patterns

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `topic` | Yes | The topic to research (positional) |
| `--platforms` | No | Comma-separated target platforms (default: `linkedin`) |
| `--depth` | No | Research depth: `quick` (default) or `deep` |

## Business Context (Optional)

Check `../../../.founderOS/infrastructure/context/active/` for `.md` files. If present, read them to personalize research angles toward the user's brand, industry, and audience.

## Preflight Check

Run `../../../.founderOS/infrastructure/preflight/SKILL.md` for namespace `ideate`.
- Required: none
- Optional: `websearch` (for live web research)

If WebSearch is unavailable, degrade gracefully:
> **Note**: Research will be based on general knowledge only. For richer results, ensure WebSearch MCP is available.

## Step 0: Memory Context

Read `../../../.founderOS/infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `content ideation`, `research`, topic keywords, user's brand voice, past content performance.
Inject top 5 relevant memories.

## Observation: Start

Record observation via `../../../.founderOS/infrastructure/memory/pattern-detection/SKILL.md`:
- plugin: `ideate`
- command: `ideate-research`
- event: `start`
- metadata: topic, platforms, depth

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past runs:
- Read `../../../.founderOS/infrastructure/intelligence/SKILL.md`
- Query for plugin `ideate`, command `ideate-research`
- Apply any confirmed patterns (e.g., preferred angle types, successful frameworks, platform biases)

## Self-Healing: Error Recovery

- **Transient** (network timeouts, search failures): Retry up to 3x with backoff
- **Recoverable** (partial search results): Continue with available data, note gaps
- **Degradable** (WebSearch unavailable): Fall back to general knowledge, warn user
- **Fatal** (no topic provided): Halt with usage instructions

## Phase 1 — Topic Analysis

Display: `Phase 1: Analyzing topic dimensions...`

Break the topic into 4-5 searchable dimensions:

| Dimension | Description |
|-----------|-------------|
| **Industry** | Sector-specific angles, market context |
| **Contrarian** | Against-the-grain takes, myth-busting opportunities |
| **Data** | Statistics, benchmarks, quantifiable claims |
| **Trend** | Emerging shifts, timeline narratives, what's changing |
| **Personal Experience** | Relatable stories, founder lessons, behind-the-scenes |

Display the identified dimensions before proceeding.

## Phase 2 — Web Research

Display: `Phase 2: Researching...`

**Quick mode** (`--depth=quick`): 3-5 targeted searches across the most relevant dimensions.

**Deep mode** (`--depth=deep`): 8-12 searches spanning all dimensions plus:
- Competitor content analysis (top 3-5 creators in the space)
- Recent news and data sources
- Platform-specific trending content on the target platforms

For each search:
1. Execute the query via WebSearch
2. Extract key findings: stats, quotes, angles, frameworks used
3. Note the source for attribution

If WebSearch is unavailable, skip this phase with:
> **Degraded mode**: WebSearch unavailable — angles are based on general knowledge. Run again with WebSearch enabled for data-backed results.

## Phase 3 — Angle Generation

Display: `Phase 3: Generating content angles...`

Synthesize 3-5 content angles from the research. For each angle, produce:

- **Hook idea**: A single compelling opening line
- **Supporting data**: 2-3 data points, stats, or facts (with sources when available)
- **Platform fit score**: Rate fit for each requested platform (★★★ strong, ★★ good, ★ possible)
- **Framework recommendation**: Best content framework (e.g., listicle, story arc, hot take, how-to, myth vs reality)

Rank angles by overall strength (combination of data quality, hook appeal, and platform fit).

## Phase 4 — Output

Display the research brief in the following format:

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
**Hook idea**: [one-line hook]
**Supporting data**:
- [stat or fact with source]
- [stat or fact with source]
**Framework**: [recommended framework]
**Why it works**: [one sentence]

### Angle 3: [title] ★ Best for: LinkedIn
**Hook idea**: [one-line hook]
**Supporting data**:
- [stat or fact with source]
- [stat or fact with source]
**Framework**: [recommended framework]
**Why it works**: [one sentence]

---
Next step: Run /ideate:draft "[selected angle]" --platform=<platform> to generate content.
```

## Observation: End

Record observation via `../../../.founderOS/infrastructure/memory/pattern-detection/SKILL.md`:
- plugin: `ideate`
- command: `ideate-research`
- event: `end`
- metadata: topic, platforms, depth, angles_generated, sources_consulted, websearch_available

## Final Step: Memory Update

Record execution results for future optimization:
- Topic and dimensions explored
- Number of angles generated
- Which platforms were targeted
- Research depth used
- Whether WebSearch was available
- Any user selections or feedback (for pattern learning)

## Usage Examples

```
/founder-os:ideate:research "freelancing vs employment"
/founder-os:ideate:research "AI tools for small teams" --platforms=linkedin,x --depth=deep
/founder-os:ideate:research "remote work trends 2026" --depth=quick
```
