---
name: intelligence-routing
description: "Routes incoming observations to the correct intelligence subsystem (learning, self-healing, or hooks) based on pattern type and confidence score. Use this skill when implementing intelligence pipeline routing or debugging why a pattern isn't being processed."
---

## Overview

The routing module makes cross-plugin decisions based on accumulated intelligence patterns. It determines which patterns should be promoted to the Memory Engine for cross-plugin availability and routes context-specific knowledge to the right plugins at the right time.

## Routing Decisions

### Pattern Promotion to Memory Engine

When a pattern is generalizable beyond a single plugin, it gets promoted to the Memory Engine for cross-plugin availability.

| Intelligence pattern_type | Has Company/Contact context? | Action | Memory category | Confidence conversion |
|---|---|---|---|---|
| taste | Yes | Promote | `preference` | `round(confidence * 100)` |
| taste | No | Stay in Intelligence DB | -- | -- |
| workflow | Any | Promote | `workflow` | `round(confidence * 100)` |
| autonomy | Yes | Promote | `pattern` | `round(confidence * 100)` |
| autonomy | No | Stay in Intelligence DB | -- | -- |

### Promotion Trigger

Patterns are evaluated for promotion when:
1. Status transitions to `active` or `approved`
2. Confidence crosses 0.7 threshold
3. User explicitly runs `/founder-os:intel:approve` on the pattern

### Promotion Process

1. Check if the pattern references a Company or Contact entity (search description and instruction fields)
2. If promotable, create or update a Memory Engine entry:
   - `memory.key`: `intel:{pattern_type}:{pattern_id}`
   - `memory.category`: mapped from table above
   - `memory.confidence`: `round(intelligence.confidence * 100)`
   - `memory.source`: `"intelligence-engine"`
   - `memory.times_confirmed`: `intelligence.confirmations`
3. Tag the Intelligence pattern with `promoted_to_memory = true` to prevent duplicate promotion

## Context Injection Routing

Before a plugin command runs, the routing module determines which patterns to inject:

### Selection Algorithm

```
1. Query patterns WHERE status IN ('active', 'approved')
2. Filter by plugin match:
   a. Exact match: pattern.plugin = current_plugin AND pattern.command = current_command
   b. Plugin-wide: pattern.plugin = current_plugin AND pattern.command IS NULL
   c. Cross-plugin: pattern.plugin IS NULL
3. If current command has Company/Contact context:
   a. Also query Memory Engine for relevant cross-plugin preferences
   b. Merge with Intelligence patterns (Intelligence takes precedence on conflicts)
4. Sort by: approved first, then by confidence DESC
5. Inject top 5 patterns as context instructions
```

### Injection Format

Each injected pattern is formatted as:

```
[Intel] Applying: "{description}" (confidence: {confidence}, source: {source})
```

Where `source` is one of:
- `taste-learning` — output preference pattern
- `workflow-optimization` — chain detection pattern
- `confidence-gating` — autonomy decision pattern
- `memory-engine` — cross-plugin pattern from Memory Engine

## Conflict Resolution

When multiple patterns apply to the same decision:

1. **Approved > Active**: User-approved patterns always take precedence
2. **Specific > General**: Plugin+command patterns override plugin-wide patterns, which override cross-plugin patterns
3. **Higher confidence wins**: Among same-specificity patterns, higher confidence wins
4. **Latest update wins**: If confidence is equal, most recently updated pattern wins
5. **Memory Engine as tiebreaker**: If Intelligence patterns conflict, check Memory Engine for corroborating evidence

## Routing Metrics

The routing module tracks its own effectiveness:

| Metric | Query | Purpose |
|---|---|---|
| Patterns injected per command | Count of patterns applied per session | Detect over-injection |
| Pattern acceptance rate | Confirmations / (confirmations + rejections) per route | Measure routing accuracy |
| Memory promotion rate | Promoted patterns / total eligible patterns | Track cross-plugin knowledge flow |
| Injection latency | Time to select and format patterns | Performance monitoring |

## Integration Points

- **Hooks module**: Reads events to evaluate pattern promotion timing
- **Learning module**: Reads patterns from all three tiers to decide what to inject
- **Self-healing module**: Routes healing patterns the same way — inject relevant recovery knowledge before commands that have historically errored
- **Memory Engine**: Bidirectional — promotes patterns to Memory, reads cross-plugin context from Memory
