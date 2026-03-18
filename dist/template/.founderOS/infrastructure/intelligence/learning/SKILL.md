---
name: intelligence-learning
description: Learning cycle for the Adaptive Intelligence Engine. Implements the Observe-Retrieve-Judge-Distill-Consolidate-Apply cycle for detecting and applying user preference patterns.
---

## Overview

The learning system detects patterns in user behavior and plugin outcomes, then injects learned preferences into future plugin runs. It operates in three tiers shipped sequentially:

1. **Taste Learning** (Tier 1) — output preference detection
2. **Workflow Optimization** (Tier 2) — plugin chain detection
3. **Confidence-Gated Autonomy** (Tier 3) — graduated trust

## The Cycle

```
OBSERVE → RETRIEVE → JUDGE → DISTILL → CONSOLIDATE → APPLY
   ↑                                                    │
   └────────────────── feedback ─────────────────────────┘
```

| Stage | What Happens | When |
|---|---|---|
| **Observe** | Hooks capture events | During command run |
| **Retrieve** | Pull relevant past patterns | Before next run |
| **Judge** | Compare outcome to patterns | After post_command |
| **Distill** | Extract generalizable insight | After 3+ observations |
| **Consolidate** | Store with confidence score | After distillation |
| **Apply** | Inject as instruction | Before next matching run |

## Confidence Mechanics

- Formula: `confirmations / max(1, confirmations + rejections * 2)`
- New patterns start at confidence 0.0 (candidate)
- Applied when confidence >= threshold AND observations >= 3
- Rejections weigh double to prevent bad patterns from persisting

## Pattern Lifecycle

```
candidate (conf < 0.5) → active (conf >= 0.5, auto-applied with notice)
                       → approved (user /intel:approve, conf locked at 1.0)
                       → rejected (user rejected or conf < 0.3)
```

## Applying Patterns

When a plugin command runs:
1. Query patterns table for matching plugin + command (or cross-plugin patterns)
2. Filter to status IN ('active', 'approved')
3. For each matching pattern, inject its `instruction` text into the command context
4. Notify user: `[Intel] Applying learned preference: "{description}"`

## Cross-Plugin Promotion

Patterns referencing a Company or Contact are promoted to the Memory Engine:
- taste + company → Memory Engine category `preference`
- workflow → Memory Engine category `workflow`
- Confidence conversion: `round(confidence * 100)`

## Tier 2: Workflow Optimization Integration

After each `post_command` event with outcome `success`, the learning cycle extends to chain detection:

1. **Detect**: Query recent sessions for commands executed within 5 minutes of the current command (see `learning/workflow-optimization/SKILL.md` for the detection query)
2. **Accumulate**: When the same A → B sequence has been observed 3+ times, create a `workflow` pattern as candidate
3. **Suggest**: At confidence >= `learning.workflow.suggest_threshold` (default 0.5), notify: `[Intel] You typically run /founder-os:{next_plugin}:{next_command} after this. Run it now?`
4. **Auto-trigger**: At confidence >= `learning.workflow.trigger_threshold` (default 0.8) or user-approved, auto-execute the next command: `[Intel] Auto-running /founder-os:{next_plugin}:{next_command} (learned workflow)`
5. **Rejection handling**: Declining a suggestion or cancelling an auto-trigger counts as a rejection; 3 consecutive rejections set the pattern to `rejected`

Multi-step chains (A → B → C) compose from pair patterns using the minimum confidence of constituent pairs, capped at 4 commands. See `learning/workflow-optimization/SKILL.md` for the full specification.

## Tier 3: Confidence-Gated Autonomy Integration

Before each command's main logic runs, the learning cycle checks for autonomy patterns on decision points:

1. **Aggregate**: Group `decision_point` events by normalized signature `{plugin}:{command}:{decision_normalized}`
2. **Escalate**: Move through the autonomy ladder as confidence and observations grow:
   - Ask (default) → Suggest (conf >= 0.6, 5+ obs) → Act+Notify (conf >= 0.8, 10+ obs OR approved) → Silent (approved only)
3. **Inject**: For patterns at Suggest level or above, pre-fill the decision choice and adjust the notification format per the escalation level
4. **Demote**: Any single user rejection at any level drops the pattern back to Ask
5. **Cap**: The `learning.autonomy.max_level` config key (default: "notify") sets a hard ceiling — individual patterns cannot exceed the configured cap

See `learning/confidence-gating/SKILL.md` for the full escalation ladder, decision signatures, and safety guarantees.
