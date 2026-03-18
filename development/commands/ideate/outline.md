---
description: Generate a structured content outline from a topic or brief
argument-hint: "[topic-or-brief] [--framework=story|listicle|contrarian|howto|lesson|insight|question] [--platform=linkedin|x|meta|tiktok] [--depth=skeleton|detailed]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:ideate:outline

Generate a structured content outline from a topic or brief, selecting the best framework and adapting structure to the target platform.

## Load Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/skills/ideate/content-writing/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/ideate/hook-creation/SKILL.md`

## Parse Arguments

Extract the topic and optional flags from the user's command:

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `topic-or-brief` | Yes | -- | The topic, question, or brief to outline (positional) |
| `--framework` | No | `auto` | Content framework: `story`, `listicle`, `contrarian`, `howto`, `lesson`, `insight`, `question` |
| `--platform` | No | `linkedin` | Target platform: `linkedin`, `x`, `meta`, `tiktok` |
| `--depth` | No | `skeleton` | Outline depth: `skeleton` (quick scaffold) or `detailed` (beat-by-beat) |

If no topic-or-brief is provided, prompt the user:

> Please provide a topic or brief. Example: `/founder-os:ideate:outline "why founders should learn to code"`

Then stop and wait for user input.

## Business Context (Optional)

Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., align with brand voice, prioritize relevant angles, use correct terminology). If files don't exist, skip silently.

## Preflight Check

Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `ideate` namespace.
No external tool dependencies are required for this command — preflight passes trivially.
If the check returns `blocked` for any reason, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context

Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (topic keywords, content frameworks used, platform preferences, past outline patterns).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start

Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `ideate`
- Command: `ideate-outline`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters (topic, framework, platform, depth), context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns

Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'ideate' OR plugin IS NULL) AND (command = 'ideate-outline' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context for this execution
3. Notify: `[Intel] Applying learned preference: "{description}"` for each pattern applied
4. If the Intelligence database does not exist, skip silently and continue execution

## Self-Healing: Error Recovery

If any error occurs during this command:
1. Classify the error using rules from `_infrastructure/intelligence/self-healing/SKILL.md`
2. Check if healing is enabled: query `SELECT value FROM config WHERE key = 'healing.enabled'` from Intelligence DB
3. For transient errors: retry with exponential backoff (2s, 5s, 15s)
4. For recoverable errors: look up fix in healing_patterns table, apply if found
5. For degradable errors: consult fallback registry in `_infrastructure/intelligence/self-healing/fallback-registry/SKILL.md`, execute fallback path
6. For fatal errors: stop and present error with suggested fix
7. Always notify: `[Heal] {description of what happened and what was done}`
8. Record error event to Intelligence DB with recovery_attempted field
9. If Intelligence DB is unavailable, fall back to existing error handling (no self-healing)

## Phase 1/3 — Structure Selection

If `--framework=auto` (the default), analyze the topic and select the best-fit framework:

| Framework | Best For |
|-----------|----------|
| `story` | Personal experiences, founder journeys, narrative-driven topics |
| `listicle` | Tips, tools, resources, step collections |
| `contrarian` | Challenging conventional wisdom, hot takes, myth-busting |
| `howto` | Tutorials, processes, actionable guides |
| `lesson` | Failures, learnings, retrospectives |
| `insight` | Data-driven observations, trends, analysis |
| `question` | Thought-provoking explorations, audience engagement hooks |

Consider platform when selecting:
- **X**: Favor tighter frameworks (`listicle`, `contrarian`, `insight`) — thread structure demands punchy, self-contained beats.
- **TikTok**: Emphasize frameworks with strong opening hooks and clear CTAs (`story`, `contrarian`, `howto`) — first 3 seconds determine retention.
- **LinkedIn**: All frameworks work well — longer-form tolerance allows nuance.
- **Meta**: Favor visual-friendly structures (`listicle`, `howto`, `story`) — pair outline with image/carousel guidance.

If the user specified a framework explicitly, use it and skip auto-selection. Note the selected framework in output.

## Phase 2/3 — Outline Generation

Generate the outline based on the selected `--depth`:

### Skeleton Mode (default)

Produce a quick structural scaffold:

1. **Hook Options**: 2-3 candidate hooks (one-liner each), labeled by hook type from the hook-creation skill.
2. **Body Sections**: Section headings with a one-line description of what each section covers. Number of sections adapts to platform:
   - LinkedIn: 3-5 sections
   - X: 3-7 thread beats (each must stand alone)
   - Meta: 3-4 sections (visual-friendly)
   - TikTok: 3-4 beats (tight, punchy)
3. **Closer Options**: 2-3 candidate closers (CTA, reflection, or callback to hook).

### Detailed Mode

Produce a full beat-by-beat outline:

1. **Hook Candidates**: 3+ hook options with hook type labels, each written as a full opening sentence or two. Include rationale for why each hook works.
2. **Body Sections**: For each section:
   - Section heading
   - 2-4 bullet points per beat describing the key points, examples, or data to include
   - Transition note: how to bridge from the previous section
   - Estimated word count or thread-beat count per section
3. **Closer Options**: 3+ closer variants:
   - CTA closer (drive action)
   - Reflection closer (leave the reader thinking)
   - Callback closer (tie back to the hook)
   - Audience-specific variants where relevant (e.g., founder vs. operator vs. IC)

## Phase 3/3 — Output

Present the outline in the following format:

```
## Content Outline

**Topic**: [topic-or-brief]
**Framework**: [selected framework] [auto-selected | user-specified]
**Platform**: [target platform]
**Depth**: [skeleton | detailed]

---

### Hook Options
1. [Hook type]: [hook text]
2. [Hook type]: [hook text]
3. [Hook type]: [hook text] (detailed mode only)

### Body

#### Section 1: [Title]
[one-line description OR bullet points depending on depth]

#### Section 2: [Title]
[one-line description OR bullet points depending on depth]

[...repeat for all sections...]

### Closer Options
1. [Closer type]: [closer text]
2. [Closer type]: [closer text]
3. [Closer type]: [closer text] (detailed mode only)

---

**Platform notes**: [any platform-specific guidance — character limits, thread structure, visual pairing suggestions]

**Next step**: Run `/founder-os:ideate:draft` using this outline as the topic to generate full content.
```

After displaying, wait for user feedback. The user may ask to change the framework, adjust sections, swap hooks, or refine before proceeding to the draft step.

## Observation: End

After execution completes, record a post_command event to the Intelligence event store:
- Event type: `post_command`
- Use the same session_id from the start observation
- Outcome: `success` | `failure` | `degraded`
- Payload: { outcome summary, framework selected, platform, depth, sections generated }
- Duration: milliseconds elapsed since pre_command event
- If any errors occurred during execution, also record an error event with the error type, message, and whether recovery was attempted

## Final: Memory Update

Read the pattern-detection skill at `_infrastructure/memory/pattern-detection/SKILL.md`.
Log this execution as an observation with: plugin name (`ideate`), primary action performed (`outline`), key entities (topic keywords, framework, platform), and output summary.
Check for emerging patterns per the detection rules (e.g., user always picks `contrarian` framework, user always targets X). If a memory reaches the adaptation threshold, append the notification to the output.

## Usage Examples

- `/founder-os:ideate:outline "why founders should learn to code"` — Auto-select framework, LinkedIn, skeleton depth
- `/founder-os:ideate:outline "hiring your first engineer" --framework=howto --platform=linkedin --depth=detailed` — Detailed how-to outline for LinkedIn
- `/founder-os:ideate:outline "AI replacing jobs myth" --framework=contrarian --platform=x` — Contrarian thread outline for X
- `/founder-os:ideate:outline "content creation workflow" --depth=skeleton` — Quick skeleton outline, auto framework, LinkedIn default
