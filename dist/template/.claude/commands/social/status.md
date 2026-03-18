---
description: Check post status and per-platform results
argument-hint: "[post-id] [--all] [--failed] [--recent=10] [--format=table|json|markdown]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:status

Check post status and per-platform delivery results.

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-status/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `post-id` | No | Specific post ID to check (positional) |
| `--all` | No | Show all posts |
| `--failed` | No | Filter to failed posts with retry option |
| `--recent` | No | Show N most recent posts (default: 10) |
| `--format` | No | Output format |

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `post status`, `publishing issues`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:status` runs.

## Phase 1/2: Fetch Status

1. If `post-id` provided:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts status --post-id=<post-id>
   ```
2. If `--failed`:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts list --status=failed --limit=20
   ```
3. If `--recent` or `--all`:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts list --limit=<N>
   ```

## Phase 2/2: Display & Actions

Show per-platform breakdown:

| Platform | Status | URL | Error |
|----------|--------|-----|-------|
| LinkedIn | Published | https://... | — |
| X | Failed | — | Rate limit exceeded |

If any failed: offer `Retry failed platforms? (y/n)`

If yes:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts retry --post-id=<post-id>
```

## Final Step: Observation Logging

Record: status check results, retry actions taken.

## Intelligence: Post-Command

Log execution metrics for future optimization.
