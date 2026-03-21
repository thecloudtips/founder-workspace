---
description: Schedule posts for optimal times or queue slots
argument-hint: '"Post text" --platforms=linkedin [--at="tomorrow 9am"] [--queue] [--timezone=America/New_York] [--format=table|json|markdown]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# social:schedule

Schedule posts for future publication at specific times or into queue slots.

## Skills

1. Read `../../../.founderOS/infrastructure/late-skills/late-common/SKILL.md`
2. Read `../../../.founderOS/infrastructure/late-skills/late-publish/SKILL.md`
3. Read `skills/social/posting-cadence/SKILL.md`
4. Read `skills/social/platform-adaptation/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `text` | Yes | Post text (positional) |
| `--platforms` | Yes | Target platforms |
| `--at` | No | Specific time (natural language or ISO 8601) |
| `--queue` | No | Add to next available queue slot |
| `--timezone` | No | Override default timezone |
| `--format` | No | Output format |

If neither `--at` nor `--queue`, suggest optimal times from posting-cadence skill.

## Business Context (Optional)

Check `../../../.founderOS/infrastructure/context/active/`.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `scheduling`, `posting times`, `queue management`.

## Phase 1/3: Content Preparation

Same as `social:post` Phase 1.

## Phase 2/3: Schedule Resolution

1. If `--at`: convert natural language to ISO 8601 with timezone
2. If `--queue`: fetch queue slots via `late-tool.mjs queue list`, find next available
3. If neither: suggest optimal times per posting-cadence skill
4. Check for conflicts with existing scheduled posts

## Phase 3/3: Create Scheduled Post

```bash
node ../../../.founderOS/scripts/late-tool.mjs posts create \
  --accounts='["<account_id>"]' \
  --text="<text>" \
  --schedule="<iso_timestamp>"
```

## Output

| Platform | Scheduled For | Post ID | Queue Slot |
|----------|--------------|---------|------------|

## Notion DB Logging (Optional)

Create entry with Publish Status: "Pending", Schedule Time set.

## Scheduling Support (`--schedule` flag)

For recurring scheduled posts:
```
--schedule "weekdays 10:00am"    # Natural language
--schedule "0 10 * * 1-5"       # Cron
--schedule status                # Show current
--schedule disable               # Remove
```

Generates P27 Workflow YAML per `_infrastructure/scheduling/SKILL.md`.

## Final Step: Observation Logging

Record: scheduled time, platform, queue slot used.
