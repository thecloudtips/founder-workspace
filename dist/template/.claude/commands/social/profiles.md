---
description: Manage Late.dev profiles (brand groupings)
argument-hint: "[list|create|delete] [--name='My Brand'] [--format=table|json|markdown]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:profiles

Manage Late.dev profiles — brand groupings that organize social accounts.

## Skills

1. Read `../../../.founderOS/infrastructure/late-skills/late-common/SKILL.md`
2. Read `../../../.founderOS/infrastructure/late-skills/late-accounts/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `action` | No | `list` (default), `create`, or `delete` (positional) |
| `--name` | For `create` | Profile name |
| `--profile-id` | For `delete` | Profile ID to delete |
| `--format` | No | Output format |

## Business Context (Optional)

Check `../../../.founderOS/infrastructure/context/active/` for `.md` files.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `profile management`, `brand groupings`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:profiles` runs.

## Execution

### List Profiles

```bash
node ../../../.founderOS/scripts/late-tool.mjs profiles list
```

| Profile | ID | Accounts |
|---------|-----|----------|
| Default | prof_123 | LinkedIn (acc_abc), X (acc_def) |

### Create Profile

```bash
node ../../../.founderOS/scripts/late-tool.mjs profiles create --name="<name>"
```

### Delete Profile

Confirm with user before deleting. Warn if profile has connected accounts.

## Final Step: Observation Logging

Record: profile action taken.

## Intelligence: Post-Command

Log execution metrics for future optimization.
