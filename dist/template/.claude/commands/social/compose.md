---
description: Create social media content using template library with intelligent selection and combination
argument-hint: '"topic" [--technique=name] [--pick=N] [--combine] [--platform=linkedin|x] [--audience=hint] [--variations=N] [--to-file=path]'
allowed-tools: ["Read"]
execution-mode: background
result-format: full
---

# social:compose

Create social media content by intelligently selecting and combining templates from the template library.

## Skills

Read these skill files before proceeding:

1. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/template-engine/SKILL.md` — template selection, combination, ranking
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/platform-adaptation/SKILL.md` — per-platform rules
3. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
4. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/social-humanization.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `topic` | Yes | Topic or content brief (positional) |
| `--technique` | No | Force specific technique (anaphora, reversal, contrarian, list, story, question, misdirection, simplification) |
| `--pick` | No | Number of template candidates to consider (default: 3) |
| `--combine` | No | Enable multi-template combination (technique stacking or section assembly) |
| `--platform` | No | Target platform: `linkedin` or `x` (default: linkedin) |
| `--audience` | No | Target audience hint for content adaptation |
| `--variations` | No | Generate N variations using different templates (default: 1) |
| `--to-file` | No | Write output to file path instead of displaying |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files. If present, read them to personalize tone, voice, and brand.

## Preflight Check

This is a read-only command with no external API dependencies. No preflight validation is required — `social:compose` does not call Late.dev or any external service. Skip the `late` check.

## Step 0: Memory Context

Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `social templates`, `content creation`, `compose`, user's brand voice.
Inject top 5 relevant memories.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:compose` runs.

## Phase 1/3: Template Selection

Display: `Phase 1/3: Selecting templates...`

1. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/_index.yaml`
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/_performance.yaml`
3. Filter by `--technique` if specified, otherwise consider all techniques
4. Filter by `--platform` using `platform_affinity` section
5. Score templates against topic keywords using tag fuzzy matching
6. Apply performance bias (per template-engine skill algorithm)
7. Select top `--pick` candidates (default: 3)

## Phase 2/3: Template Loading & Generation

Display: `Phase 2/3: Generating content...`

1. Read selected template `.md` files from `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/{name}.md`
2. If `--combine`: apply combination strategy from template-engine skill
3. Fill template placeholders with topic-relevant content
4. Apply platform adaptation rules from platform-adaptation skill
5. Apply humanization following the humanize-content skill
6. If `--variations` > 1: repeat with different template selections for each variation

## Phase 3/3: Output

Display: `Phase 3/3: Formatting output...`

Show for each variation:
- Generated post text
- Template(s) used (name, technique, id)
- Character count vs platform limit
- Next step suggestion: `Run '/social:post "..." --platforms=<platform>' to publish`

If `--to-file` is provided, write the full output to the specified file path instead of displaying.

## Output

For each variation, display:

```
--- Variation N ---
[Generated post text]

Template: <name> | Technique: <technique> | ID: <id>
Characters: <count> / <platform-limit>

Next step: Run '/social:post "<post text>" --platforms=<platform>' to publish
```

If `--variations=1` (default), omit the variation header.

## Note on --to-post

Background subagents cannot directly invoke other commands such as `/social:post`. Instead, this command displays a "Next step" suggestion with the exact command the user should run to publish the generated content. Copy the generated text and run `/social:post` manually.

## Self-Healing: Error Recovery

- **Template not found**: Skip missing template file, log warning, continue with remaining candidates
- **Insufficient candidates**: If fewer than `--pick` templates match filters, proceed with available matches and note the reduced selection
- **Combination failure**: If `--combine` strategy cannot be applied, fall back to single best-ranked template and warn user
- **File write failure** (for `--to-file`): Display output inline and report the write error with fix instructions

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Platform targeted and technique(s) used
- Number of templates considered vs selected
- Whether `--combine` was used
- Number of variations generated
- Topic keywords for future template affinity learning

## Intelligence: Post-Command

Log execution metrics for future optimization.
