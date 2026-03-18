---
name: adaptive-intelligence
description: Master reference for the Adaptive Intelligence Engine. Describes the four modules (hooks, learning, self-healing, routing), how plugins integrate, and the relationship to the Memory Engine.
---

## Overview

The Adaptive Intelligence Engine is a behavioral layer that observes, learns from, and improves Founder OS plugin execution. It sits on top of the Memory Engine (storage) and provides:

1. **Hooks** — structured event capture from every plugin execution
2. **Learning** — pattern detection and preference learning across three tiers
3. **Self-Healing** — error classification, retry, and graceful degradation
4. **Routing** — cross-plugin pattern routing and Memory Engine promotion

## Architecture

```
Memory Engine (storage) ← Intelligence Layer (behavior) ← Adaptive Intel plugin (user commands)
                              ↑
                         All 30 plugins (emit events via convention)
```

- **Infrastructure**: `_infrastructure/intelligence/` — SKILL.md files, SQL schema. No commands.
- **Commands**: `commands/intel/` — 6 slash commands for user control (`status`, `patterns`, `approve`, `reset`, `healing`, `config`)
- **Database**: Own SQLite DB (`intelligence.db`), separate from Memory Engine

## Plugin Integration

Every plugin command file adds observation blocks to emit events. See `_infrastructure/intelligence/hooks/SKILL.md` for the full convention and annotation templates.

**Minimum integration** (all plugins):
- Pre-command observation block (~5 lines at top of command)
- Post-command observation block (~5 lines at bottom of command)

**Enhanced integration** (plugins with complex logic):
- MCP call annotations before significant external calls
- Decision point annotations at key branching logic

## Modules

| Module | Location | Ships In |
|---|---|---|
| Hooks | `hooks/SKILL.md` | Chunk 1 |
| Taste Learning | `learning/taste-learning/SKILL.md` | Chunk 2 |
| Self-Healing | `self-healing/SKILL.md` | Chunk 3 |
| Workflow Optimization | `learning/workflow-optimization/SKILL.md` | Chunk 5 |
| Confidence Gating | `learning/confidence-gating/SKILL.md` | Chunk 6 |
| Routing | `routing/SKILL.md` | Chunk 7 |
| Evals | `evals/eval-runner.mjs` + `evals/db.mjs` + `evals/checks/` | Phase 1 |

## Cross-Plugin Knowledge Boundary

Patterns that reference a Company or Contact are promoted to the Memory Engine for cross-plugin availability. Plugin-specific output preferences stay in the Intelligence DB. See the design spec for the full mapping table.

**Confidence scale conversion**: Intelligence uses 0.0-1.0; Memory Engine uses 0-100. Convert with `round(confidence * 100)`.

## Routing Integration

The routing module operates at two integration points in the execution flow:

### Pre-Command: Context Injection

Before a plugin command runs, routing selects the top 5 applicable patterns:

1. Exact match: `pattern.plugin = current_plugin AND pattern.command = current_command`
2. Plugin-wide: `pattern.plugin = current_plugin AND pattern.command IS NULL`
3. Cross-plugin: `pattern.plugin IS NULL`
4. Memory Engine query: if the command has Company/Contact context, also query Memory Engine for cross-plugin preferences
5. Sort by: approved first, then confidence DESC; inject top 5

Conflict resolution: approved > active, specific > general, higher confidence wins, latest update as tiebreaker.

### Post-Command: Pattern Promotion

After pattern status transitions to `active` or `approved`, or confidence crosses 0.8 with 3+ confirmations:

1. Evaluate promotability based on pattern type and entity context (see `routing/SKILL.md` promotion table)
2. Convert confidence: `round(intelligence_confidence * 100)` for Memory Engine's 0-100 scale
3. Create or update Memory Engine entry with source = `"intelligence-engine"`
4. Tag Intelligence pattern with `promoted_to_memory = true` to prevent duplicate promotion

See `routing/SKILL.md` for the full selection algorithm, promotion mapping table, and routing metrics.

## Evals Integration

The evals module is a sub-module of the Intelligence Engine that measures command output quality.

### Components

- **Eval Runner** (`evals/eval-runner.mjs`): Main entry point called by hooks. Orchestrates Tier 0 (telemetry) → Tier 1 (format checks) → sampling decision.
- **DB Module** (`evals/db.mjs`): SQLite helpers for eval tables in `intelligence.db`. Handles EWMA computation.
- **Tier 0 Checks** (`evals/checks/telemetry.mjs`): Token counts, duration, SHA-256 hashes.
- **Tier 1 Checks** (`evals/checks/format.mjs`, `evals/checks/schema.mjs`): Required sections, word count bounds, forbidden patterns, JSON validation.
- **Sampler** (`evals/sampler.mjs`): Determines whether to send output to Tier 2 LLM judge.
- **Rubrics** (`evals/rubrics/`): JSON rubric files — `universal.json` + per-namespace overrides.
- **Eval Judge Agent** (`agents/intel/eval-judge.md`): Background Haiku agent for Tier 2 Boolean scoring.

### Data Flow

```
command output → post-task hook → eval-runner.mjs
  → Tier 0 (telemetry → exec_log INSERT)
  → Tier 1 (format + schema → exec_log UPDATE)
  → sampler → if sampled → spawn eval-judge agent
                         → Tier 2 (Boolean rubric → eval_results INSERT + EWMA update)
```

### Regression Detection

The pre-task hook calls `eval-runner.mjs --check-regression` before each command. If the namespace EWMA drops below 0.65, a warning is shown once per session.

### Column Naming

The eval tables use `namespace` where existing intelligence tables use `plugin`. Both refer to the same concept (the 32 Founder OS command namespaces). When joining: `eval_results.namespace = patterns.plugin`.
