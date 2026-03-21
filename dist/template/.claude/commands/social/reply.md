---
description: Reply or comment on social media posts
argument-hint: '--post-id=xxx "Reply text" [--platform=linkedin] [--format=table|json|markdown]'
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:reply

Reply or comment on existing social media posts.

## Skills

1. Read `../../../.founderOS/infrastructure/late-skills/late-common/SKILL.md`
2. Read `../../../.founderOS/infrastructure/late-skills/late-publish/SKILL.md`
3. Read `skills/social/cross-posting/SKILL.md` — engagement patterns section

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--post-id` | Yes | Post ID to reply to |
| `text` | Yes | Reply text (positional) |
| `--platform` | No | Target platform (if post is cross-posted) |
| `--format` | No | Output format |

## Business Context (Optional)

Check `../../../.founderOS/infrastructure/context/active/`.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `replies`, `engagement`, `comment style`.

## Phase 1/2: Prepare Reply

1. Fetch post details to understand context:
   ```bash
   node ../../../.founderOS/scripts/late-tool.mjs posts status --post-id=<post-id>
   ```
2. Apply engagement patterns from cross-posting skill:
   - LinkedIn: professional, add value, ask follow-up questions
   - X: conversational, brief, can use humor
3. Validate reply length against platform limits

## Phase 2/2: Post Reply

For LinkedIn (first comment pattern):
```bash
node ../../../.founderOS/scripts/late-tool.mjs posts create \
  --accounts='["<account_id>"]' \
  --text="<reply_text>" \
  --platform-options='{"replyTo":"<post-id>"}'
```

## Output

| Platform | Status | Reply URL |
|----------|--------|-----------|

## Final Step: Observation Logging

Record: reply posted, platform, engagement context.
