---
description: Save draft posts without publishing
argument-hint: '"Draft text" --platforms=linkedin,x [--media=path] [--tone=professional|friendly|casual|authoritative|conversational] [--format=table|json|markdown]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# social:draft

Save drafts to Late.dev without publishing. Useful for preparing content for later review and publishing.

## Skills

1. Read `../../../.founderOS/infrastructure/late-skills/late-common/SKILL.md`
2. Read `../../../.founderOS/infrastructure/late-skills/late-publish/SKILL.md`
3. Read `skills/social/platform-adaptation/SKILL.md`
4. Read `../../../.founderOS/infrastructure/humanize-content/SKILL.md`
5. Read `../../../.founderOS/infrastructure/humanize-content/references/social-humanization.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `text` | Yes | Draft text (positional) |
| `--platforms` | Yes | Target platforms |
| `--media` | No | File paths for media attachments |
| `--tone` | No | Humanization tone: professional (default), friendly, casual, authoritative, conversational |
| `--format` | No | Output format |

## Business Context (Optional)

Check `../../../.founderOS/infrastructure/context/active/`.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `drafts`, `content planning`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:draft` runs.

## Phase 1/2: Content Preparation

1. Parse text input
2. If multi-platform: adapt content per platform rules
3. If `--media`: validate files per platform constraints

## Phase 2/2: Save Draft

```bash
node ../../../.founderOS/scripts/late-tool.mjs posts create \
  --accounts='["<account_id>"]' \
  --text="<text>" \
  --draft
```

## Output

| Platform | Draft ID | Status |
|----------|----------|--------|
| LinkedIn | post_abc | Draft saved |

## Notion DB Logging (Optional)

Create entry with Type: "Social Post", Publish Status: "Draft", Status: "Draft".

## Final Step: Observation Logging

Record: platforms, draft saved status.

## Intelligence: Post-Command

Log execution metrics for future optimization.
