---
description: Manage posting queue time slots
argument-hint: "[list|add|remove] [--day=weekdays] [--time=9:00am] [--profile=default] [--format=table|json|markdown]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:queue

Manage posting queue time slots for automated scheduling.

## Skills

1. Read `../../../.founderOS/infrastructure/late-skills/late-common/SKILL.md`
2. Read `skills/social/posting-cadence/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `action` | No | `list` (default), `add`, or `remove` (positional) |
| `--day` | For `add` | Day pattern: `weekdays`, `monday`, `everyday`, etc. |
| `--time` | For `add` | Time slot (e.g., `9:00am`, `14:00`) |
| `--profile` | No | Late.dev profile (default: first profile) |
| `--slot-id` | For `remove` | Slot ID to remove |
| `--format` | No | Output format |

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `queue management`, `posting schedule`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:queue` runs.

## Execution

### List Queue Slots

```bash
node ../../../.founderOS/scripts/late-tool.mjs queue list [--profile=<profile>]
```

Display:

| Day | Time | Slot ID | Next Post |
|-----|------|---------|-----------|
| Mon-Fri | 10:00am | slot_123 | (empty) |
| Mon-Fri | 5:00pm | slot_456 | "Post about..." |

### Add Queue Slot

```bash
node ../../../.founderOS/scripts/late-tool.mjs queue add \
  --profile=<profile> --day=<day> --time=<time>
```

If no slots exist, suggest defaults from posting-cadence skill:
- LinkedIn: weekdays 10:00am
- X: weekdays 12:00pm, 5:00pm

### Remove Queue Slot

```bash
node ../../../.founderOS/scripts/late-tool.mjs queue remove --slot-id=<slot-id>
```

## Final Step: Observation Logging

Record: queue action taken, slots configured.

## Intelligence: Post-Command

Log execution metrics for future optimization.
