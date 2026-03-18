---
name: confidence-gating
description: Tier 3 learning — graduated autonomy engine that escalates from asking to autonomous action as per-decision confidence grows.
---

## Overview

Confidence-gated autonomy tracks repeated decisions across sessions and gradually increases the system's autonomy for those specific decisions. It starts by asking the user for every choice and progresses through suggestion, notification, and silent execution as confidence grows.

## Escalation Ladder

| Level | Trigger | Behavior | User Experience |
|---|---|---|---|
| **Ask** (default) | Always | Present decision, wait for confirmation | "Should I classify this as urgent? [yes/no]" |
| **Suggest** | conf >= 0.6, 5+ observations | Pre-fill the choice, user confirms | "Classifying as urgent (based on VIP sender). [confirm/change]" |
| **Act + Notify** | conf >= 0.8, 10+ observations OR user-approved | Execute and notify | "[Intel] Classified as urgent (learned: VIP senders are always urgent)" |
| **Silent** | User-approved only (never auto-promoted) | Execute without notification | (No output — decision made silently) |

## How It Works

1. **Decision-point hooks** capture repeated choices (e.g., email priority classification, tone selection)
2. **Cross-session tracking**: Group decision_point events by a normalized decision signature
3. **Consistency detection**: If the same decision is made the same way 5+ times, create an autonomy pattern
4. **Gradual escalation**: Move through the ladder as confidence increases
5. **Instant demotion**: Any rejection at any level drops back to "Ask"

## Decision Signatures

A decision signature normalizes decision_point events into comparable patterns:

```
{plugin}:{command}:{decision_description_normalized}
```

For example:
- `inbox:triage:email_priority_classification`
- `briefing:briefing:section_ordering`
- `report:generate:tone_selection`

## Autonomy Patterns

Autonomy patterns use the `patterns` table with `pattern_type = 'autonomy'`:

| Field | Value |
|---|---|
| `pattern_type` | `autonomy` |
| `plugin` | The plugin where decisions occur |
| `command` | The command (or null for cross-command decisions) |
| `description` | Human-readable: "classify VIP sender emails as urgent" |
| `instruction` | JSON: `{"decision": "email_priority", "default_choice": "urgent", "condition": "sender in VIP list", "autonomy_level": "suggest"}` |
| `confidence` | Standard formula: `confirmations / max(1, confirmations + rejections * 2)` |

## Autonomy Level Tracking

The `instruction` JSON field includes an `autonomy_level` key that tracks the current level:

```json
{
  "decision": "email_priority_classification",
  "default_choice": "urgent",
  "condition": "sender domain matches VIP client",
  "autonomy_level": "suggest",
  "last_promoted": "2026-03-15T10:30:00Z",
  "last_demoted": null
}
```

### Promotion Rules

```
Ask → Suggest:     confidence >= 0.6 AND observations >= 5
Suggest → Notify:  confidence >= 0.8 AND observations >= 10
Notify → Silent:   ONLY via /intel:approve (never automatic)
```

### Demotion Rules

```
Any level → Ask:   Single rejection at any level
Silent → removed:  User runs /intel:reset on this pattern
```

## Max Autonomy Cap

The `learning.autonomy.max_level` config key (default: "notify") caps the maximum autonomy level:

- If set to "ask": System always asks (learning disabled for autonomy)
- If set to "suggest": System suggests but never auto-executes
- If set to "notify": System can auto-execute with notification but never silently
- If set to "silent": Full autonomy ladder enabled (requires explicit user opt-in)

The cap applies globally. Individual patterns cannot exceed the configured cap regardless of their confidence level.

## Safety Guarantees

1. **No silent execution by default** — the "silent" level requires explicit `/intel:approve` per pattern
2. **Instant demotion** — a single rejection drops any pattern back to "ask" level
3. **Global cap** — `learning.autonomy.max_level` provides a hard ceiling
4. **Audit trail** — every autonomy decision is logged as an event, whether asked or auto-executed
5. **User override always wins** — if the user makes a different choice, the pattern records a rejection

## Notification Format

```
[Intel:Ask]     How should I classify this email? Options: urgent, normal, low
[Intel:Suggest] Classifying as urgent (VIP sender pattern, conf: 0.72). Confirm? [y/n]
[Intel:Auto]    Classified as urgent (learned: VIP sender → urgent, conf: 0.85)
```
