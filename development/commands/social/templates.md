---
description: Browse template library, view individual templates, and check A/B test performance stats
argument-hint: "list|show|stats [--technique=name]"
allowed-tools: ["Read"]
execution-mode: foreground
result-format: full
---

# social:templates

Browse the social media template library, inspect individual templates, and view A/B test performance stats.

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/template-engine/SKILL.md` — for engagement score formula and ranking context

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `subcommand` | Yes | One of: `list`, `show`, `stats` (positional) |
| `id` | For `show` | Template ID (e.g., `jan25-1`) — required with `show` subcommand |
| `--technique` | No | Filter by technique name (for `list` and `stats`) |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files. If present, read them to provide personalized context when displaying templates.

## Preflight Check

This is a read-only command with no external API dependencies. No preflight validation is required — `social:templates` does not call Late.dev or any external service. Skip the `late` check.

## Step 0: Memory Context

Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `social templates`, `template library`, `A/B test`, `technique performance`.
Inject top 5 relevant memories.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:templates` runs.

## Phase 1/1: Execute Subcommand

### `list [--technique=name]`

1. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/_index.yaml`
2. Display all templates grouped by technique
3. If `--technique` specified, filter to that technique group only
4. Show for each template: ID, name, technique, platforms

Example output:

```
Technique: anaphora
  jan25-1  | The Rule of Three Opener       | linkedin, x
  jan25-2  | Parallel Structure Builder     | linkedin

Technique: reversal
  feb25-1  | The Unexpected Turn            | linkedin, x
  feb25-3  | Flip the Assumption            | x
```

If `--technique` is specified and no templates match: display "No templates found for technique: `<name>`. Run `/social:templates list` to see all available techniques."

### `show <id>`

1. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/_index.yaml`
2. Look up filename from `id_map` section using the provided ID
3. If ID not found: display "Template ID `<id>` not found. Run `/social:templates list` to see all template IDs."
4. Read the matching file from `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/{filename}.md`
5. Display full template: name, technique, platforms, tags, Why It Works, Template body, Example

Example output:

```
Template: The Rule of Three Opener
ID: jan25-1 | Technique: anaphora | Platforms: linkedin, x
Tags: hook, structure, rhythm

--- Why It Works ---
[content from template file]

--- Template ---
[template body from template file]

--- Example ---
[example from template file]
```

### `stats [--technique=name]`

1. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/_performance.yaml`
2. If file is empty or has no test data: display "No A/B tests have been run yet. Use `/social:ab-test` to start testing."
3. If data exists:
   - Display technique win/loss rates from `technique_scores`
   - Show best topics per technique
   - List recent test results
4. If `--technique` specified, filter to that technique only

Example output:

```
Technique Performance
─────────────────────
anaphora     Win rate: 68%  Tests: 12  Best topic: productivity
reversal     Win rate: 55%  Tests: 8   Best topic: hiring
contrarian   Win rate: 72%  Tests: 5   Best topic: AI trends

Recent A/B Tests
─────────────────────
2026-03-10  anaphora vs reversal  → anaphora won  (topic: burnout)
2026-03-08  list vs story         → story won      (topic: scaling)
```

If `--technique` is specified and no stats exist for it: display "No test data for technique: `<name>`. Use `/social:ab-test` to start testing."

## Output

All output is displayed inline in the main session. This is a foreground command — no subagent is spawned.

## Self-Healing: Error Recovery

- **`_index.yaml` not found**: Display "Template index not found at expected path. Verify `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/_index.yaml` exists."
- **`_performance.yaml` not found**: Treat as empty — display "No A/B tests have been run yet. Use `/social:ab-test` to start testing."
- **Template `.md` file not found** (during `show`): Display "Template file missing for ID `<id>`. The index references a file that does not exist. Run `/social:templates list` to verify available templates."
- **Missing subcommand**: Display usage hint — "Usage: `/social:templates list|show|stats [--technique=name]`"
- **`show` without ID**: Display "The `show` subcommand requires a template ID. Example: `/social:templates show jan25-1`"

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Subcommand used (`list`, `show`, or `stats`)
- Technique filter applied (if any)
- Template ID viewed (for `show`)
- Whether stats data was present (for `stats`)

## Intelligence: Post-Command

Log execution metrics for future optimization.
