---
name: late-publish
description: "Late.dev publishing patterns for creating, scheduling, and cross-posting social media content"
---

# Late.dev Publishing Patterns

## Immediate Publish

```bash
node ../../../../.founderOS/scripts/late-tool.mjs posts create \
  --accounts='["acc_123"]' \
  --text="Post content here"
```

The CLI sets `publishNow: true` when neither `--schedule` nor `--draft` is provided.

## Scheduled Publish

```bash
node ../../../../.founderOS/scripts/late-tool.mjs posts create \
  --accounts='["acc_123"]' \
  --text="Scheduled post" \
  --schedule="2026-03-15T09:00:00-05:00"
```

Always use ISO 8601 with timezone offset. Convert natural language times to ISO 8601 before calling the CLI.

## Draft

```bash
node ../../../../.founderOS/scripts/late-tool.mjs posts create \
  --accounts='["acc_123"]' \
  --text="Draft content" \
  --draft
```

## Cross-Post (Multiple Accounts)

Single API call with multiple account IDs:

```bash
node ../../../../.founderOS/scripts/late-tool.mjs posts create \
  --accounts='["acc_linkedin_123","acc_twitter_456"]' \
  --text="Cross-platform post"
```

Late.dev handles per-platform delivery. For higher-quality adaptation, the Content Adapter agent adapts content per platform *before* the API call, using separate `posts create` calls per platform.

## Platform-Specific Options

Pass as JSON via `--platform-options`:

```bash
# LinkedIn: first comment + org posting
--platform-options='{"orgs":["org_123"],"firstComment":"Link: https://..."}'

# X/Twitter: thread
--platform-options='{"threadItems":[{"text":"Tweet 1"},{"text":"Tweet 2"}]}'
```

## Retry Failed Platforms

When a cross-post partially fails (some platforms succeed, others fail):

```bash
node ../../../../.founderOS/scripts/late-tool.mjs posts retry --post-id=post_abc123
```

This retries only the failed platform deliveries within the post.

## Post Response Format

```json
{
  "id": "post_abc123",
  "status": "published|partial|failed|scheduled|draft",
  "platforms": [
    { "accountId": "acc_123", "platform": "linkedin", "status": "published", "url": "https://..." },
    { "accountId": "acc_456", "platform": "twitter", "status": "failed", "error": "..." }
  ]
}
```
