---
description: View engagement metrics for social media posts
argument-hint: "[post-id] [--range=7d|30d|90d] [--platform=linkedin] [--format=table|json|markdown]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:analytics

View engagement metrics for posts. Requires Late.dev Analytics add-on.

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-status/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `post-id` | No | Specific post ID (positional) |
| `--range` | No | Date range: 7d, 30d, 90d (default: 7d) |
| `--platform` | No | Filter to specific platform |
| `--format` | No | Output format |

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `analytics`, `engagement metrics`, `post performance`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:analytics` runs.

## Phase 1/1: Fetch & Display Analytics

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs analytics get \
  [--post-id=<post-id>] \
  [--account-id=<account-id>] \
  [--date-range=<range>]
```

### Graceful Degradation

If Analytics add-on not available (API returns 403/feature-not-available):
- Display: "Analytics requires the Late.dev Analytics add-on. Upgrade at https://getlate.dev/pricing"
- Do NOT fail the command — return gracefully with status message

### Display Metrics

| Metric | LinkedIn | X |
|--------|----------|---|
| Likes | 45 | 123 |
| Comments | 12 | 34 |
| Shares/Retweets | 8 | 56 |
| Impressions | 2,340 | 8,901 |
| Reach | 1,890 | 6,543 |
| Clicks | 67 | 234 |

Show engagement rate comparison against benchmarks (from cross-posting skill).

## Notion DB Update (Optional)

Update Engagement property on matching Content DB entries.

## Final Step: Observation Logging

Record: analytics fetched, engagement metrics, platform performance.

## Intelligence: Post-Command

Log execution metrics for future optimization.
