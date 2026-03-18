---
name: intelligence-learning-workflow-optimization
description: "Detects and optimizes multi-plugin workflow chains based on usage patterns. Use this skill when implementing plugin chain detection, understanding workflow optimization suggestions, or debugging why a workflow shortcut was or wasn't proposed."
---

## Overview

Workflow optimization detects when a user repeatedly runs the same sequence of plugin commands, then suggests or auto-triggers the next command in the chain. This builds on the hooks observation data to identify workflow patterns.

## Chain Detection

### How It Works

1. **Session tracking**: Hooks capture `pre_command` and `post_command` events with timestamps and session IDs
2. **Sequence analysis**: After each command completes, query recent sessions for commands that typically follow
3. **Pattern formation**: When the same A → B sequence is observed 3+ times, create a candidate workflow pattern
4. **Graduated response**: Suggest at low confidence, auto-trigger at high confidence

### Detection Rules

- Commands within **5 minutes** of each other in the same session count as a chain
- Minimum **3 observations** before suggesting
- Cross-plugin chains are supported (e.g., `/founder-os:crm:sync` → `/founder-os:health:scan`)
- Maximum chain length: **4 commands** (prevents runaway automation)
- Only `post_command` events with outcome = `success` count toward chain detection

### Detection Query

```sql
-- Find command pairs that commonly run in sequence
SELECT
  e1.plugin AS from_plugin,
  e1.command AS from_command,
  e2.plugin AS to_plugin,
  e2.command AS to_command,
  COUNT(*) AS pair_count
FROM events e1
JOIN events e2
  ON e1.session_id = e2.session_id
  AND e2.timestamp > e1.timestamp
  AND (julianday(e2.timestamp) - julianday(e1.timestamp)) * 86400 <= 300  -- within 5 minutes
  AND e2.event_type = 'pre_command'
WHERE e1.event_type = 'post_command'
  AND e1.outcome = 'success'
  AND e1.timestamp > datetime('now', '-30 days')
GROUP BY e1.plugin, e1.command, e2.plugin, e2.command
HAVING pair_count >= 3
ORDER BY pair_count DESC
```

## Workflow Patterns

Workflow patterns use the same `patterns` table with `pattern_type = 'workflow'`:

| Field | Value |
|---|---|
| `pattern_type` | `workflow` |
| `plugin` | The "from" plugin (trigger command) |
| `command` | The "from" command |
| `description` | Human-readable: "after crm-sync, user typically runs health-scan" |
| `instruction` | JSON: `{"next_plugin": "health", "next_command": "scan", "chain_length": 2}` |
| `confidence` | Calculated from confirmations/rejections |

## Suggestion vs Auto-Trigger

| Confidence Level | Behavior | User Experience |
|---|---|---|
| < `learning.workflow.suggest_threshold` (default 0.5) | Silent — pattern is learning | No notification |
| >= suggest_threshold | **Suggest** the next command | `[Intel] You typically run /founder-os:health:scan after this. Run it now?` |
| >= `learning.workflow.trigger_threshold` (default 0.8) OR user-approved | **Auto-trigger** the chain | `[Intel] Auto-running /founder-os:health:scan (learned workflow)` |

## Confirmation and Rejection

- **Confirmation**: User accepts suggestion or allows auto-trigger to complete without cancellation
- **Rejection**: User declines suggestion, cancels auto-trigger, or runs a different command instead
- Any rejection of an auto-triggered chain drops it back to suggestion level
- 3 consecutive rejections set the pattern to `rejected` status

## Multi-Step Chains

Chains longer than 2 commands are built by composing pair patterns:

```
A → B (observed 5x, confidence 0.8)
B → C (observed 4x, confidence 0.7)
→ Composite chain: A → B → C (min confidence: 0.7)
```

- Composite chains use the **minimum confidence** of their constituent pairs
- Maximum chain length is 4 (configurable, but hard-capped for safety)
- Each step in a chain runs only after the previous step completes successfully

## Integration with Workflow Automator (P27)

When a workflow pattern reaches `approved` status, it can optionally be promoted to a P27 Workflow:

1. User runs `/founder-os:intel:approve <pattern-id>` on a workflow pattern
2. System asks: "Create a reusable workflow from this pattern?"
3. If yes, generates a P27 workflow definition that can be scheduled or shared
