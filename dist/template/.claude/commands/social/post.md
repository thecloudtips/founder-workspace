---
description: Create and publish content to one or more social media platforms
argument-hint: '"Post text" --platforms=linkedin,x [--from=file|url] [--media=path] [--schedule=time] [--draft] [--thread] [--team] [--audience=hint] [--tone=professional|friendly|casual|authoritative|conversational] [--format=table|json|markdown]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# social:post

Create and publish content to one or more platforms via Late.dev.

## Skills

Read these skill files before proceeding:

1. Read `../../../.founderOS/infrastructure/late-skills/late-common/SKILL.md` — auth, errors, conventions
2. Read `../../../.founderOS/infrastructure/late-skills/late-publish/SKILL.md` — publishing patterns
3. Read `skills/social/platform-adaptation/SKILL.md` — per-platform rules
4. Read `../../../.founderOS/infrastructure/humanize-content/SKILL.md`
5. Read `../../../.founderOS/infrastructure/humanize-content/references/social-humanization.md`
6. If `--schedule` provided: Read `skills/social/posting-cadence/SKILL.md`
7. If `--media` provided: Read `../../../.founderOS/infrastructure/late-skills/late-media/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `text` | Yes (unless `--from`) | Post text (positional) |
| `--platforms` | Yes | Comma-separated target platforms (e.g., `linkedin,x`) |
| `--from` | No | Source file path or Notion page URL |
| `--media` | No | Comma-separated file paths for images/videos/documents |
| `--schedule` | No | Schedule for future time (natural language or ISO 8601) |
| `--draft` | No | Save as draft without publishing |
| `--thread` | No | Enable thread mode (X threads, LinkedIn carousel) |
| `--team` | No | Activate full agent pipeline |
| `--audience` | No | Target audience hint for content adaptation |
| `--tone` | No | Humanization tone: professional (default), friendly, casual, authoritative, conversational |
| `--format` | No | Output format: table (default), json, markdown |

## Business Context (Optional)

Check `../../../.founderOS/infrastructure/context/active/` for `.md` files. If present, read them to personalize tone, voice, and brand.

## Preflight Check

Run `../../../.founderOS/infrastructure/preflight/SKILL.md` for namespace `social`.
- Required: `late` (validate `$LATE_API_KEY` + probe `late-tool.mjs --validate-only`)
- Optional: `notion` (for Content DB logging), `filesystem` (for `--from` file source)

**Interim check** (until preflight ships):
```bash
node ../../../.founderOS/scripts/late-tool.mjs --validate-only
```
If failed: show fix instructions from `_infrastructure/preflight/references/fix-messages.md` > `late`.

## Step 0: Memory Context

Read `../../../.founderOS/infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `social posting`, `linkedin`, `content publishing`, user's brand voice.
Inject top 5 relevant memories.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:post` runs.

## Phase 1/3: Content Preparation

Display: `Phase 1/3: Preparing content...`

1. **Parse source content**:
   - If `--from` is a file path: read the file
   - If `--from` is a Notion URL: fetch page content via `notion-tool.mjs`
   - If positional `text`: use directly
2. **Detect content type**: short post, long-form, listicle, thread-candidate
3. **Apply audience hint** if `--audience` provided

## Phase 2/3: Platform Adaptation

Display: `Phase 2/3: Adapting for platforms...`

For each platform in `--platforms`:
1. Apply platform-adaptation skill rules (character limits, tone, hashtags)
2. If `--thread` and content > 280 chars for X: split into thread items
3. Validate content against platform constraints
4. If `--media`: validate files per platform media rules

Show preview of adapted content per platform with character counts.

If multi-platform: show side-by-side comparison.

## Phase 3/3: Publishing

Display: `Phase 3/3: Publishing...`

1. If `--media`: upload each file via `late-tool.mjs media presign`, collect public URLs
2. For each platform:
   ```bash
   node ../../../.founderOS/scripts/late-tool.mjs posts create \
     --accounts='["<account_id>"]' \
     --text="<adapted_text>" \
     --media='[<media_items>]' \
     [--schedule="<iso_timestamp>"] \
     [--draft] \
     [--platform-options='<json>']
   ```
3. Collect post IDs and per-platform status

## Output

Display results in `--format` (default: table):

| Platform | Status | URL | Post ID |
|----------|--------|-----|---------|
| LinkedIn | Published | https://... | post_abc |
| X | Published | https://... | post_def |

## Notion DB Logging (Optional)

If Notion available, create/update entry in `[FOS] Content`:
- **Title**: First 50 chars of post text
- **Type**: "Social Post" (single platform) or "Cross-Post" (multi-platform)
- **Platform**: Selected platforms
- **Post ID**: Late.dev post ID
- **Published URL**: Direct link to live post
- **Schedule Time**: If scheduled
- **Publish Status**: Pending/Published/Failed/Draft
- **Status**: Published (content lifecycle)
- **Late Profile**: Profile name used

## Self-Healing: Error Recovery

- **Transient** (rate limits, network): Auto-retried by CLI (up to 3x)
- **Recoverable** (platform failure): Show error, suggest `social:status --failed` for retry
- **Degradable** (Notion unavailable): Skip DB logging, warn user
- **Fatal** (auth failure): Halt with fix instructions

## Final Step: Observation Logging

Record observation via `../../../.founderOS/infrastructure/memory/pattern-detection/SKILL.md`:
- Platforms used, success/failure per platform
- Content length and type
- Whether media was included
- Scheduling vs immediate

## Intelligence: Post-Command

Log execution metrics for future optimization.
