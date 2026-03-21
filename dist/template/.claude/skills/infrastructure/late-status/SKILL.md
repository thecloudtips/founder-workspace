---
name: late-status
description: "Late.dev read operations for checking post status, listing posts, and fetching analytics"
---

# Late.dev Status & Read Operations

## Check Post Status

```bash
node ../../../../.founderOS/scripts/late-tool.mjs posts status --post-id=post_abc123
```

Returns per-platform delivery status. Terminal states: `published`, `failed`. Non-terminal: `pending`, `processing`.

## List Posts

```bash
# All recent posts
node ../../../../.founderOS/scripts/late-tool.mjs posts list --limit=10

# Filter by status
node ../../../../.founderOS/scripts/late-tool.mjs posts list --status=failed

# Filter by profile
node ../../../../.founderOS/scripts/late-tool.mjs posts list --profile=prof_123
```

## Analytics

Requires Late.dev Analytics add-on. If unavailable, returns error — degrade gracefully by showing message with upgrade URL.

```bash
# Post-level analytics
node ../../../../.founderOS/scripts/late-tool.mjs analytics get --post-id=post_abc123

# Account-level analytics
node ../../../../.founderOS/scripts/late-tool.mjs analytics get --account-id=acc_123 --date-range=7d
```

Analytics response includes: likes, comments, shares, impressions, reach, clicks.

## Partial Status Handling

A post with `status: "partial"` means some platforms succeeded and others failed. Show per-platform breakdown and offer retry for failed platforms.
