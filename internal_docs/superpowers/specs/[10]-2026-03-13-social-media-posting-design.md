# Social Media Posting — Design Specification

**Date**: 2026-03-13
**Status**: Draft
**Namespace**: `social`
**Integration**: Late.dev API (https://docs.getlate.dev)
**Relation**: Compose+publish pipeline with P24 LinkedIn namespace

## Overview

A unified `social` namespace that handles publishing, scheduling, interactions, and account management across social media platforms via the Late.dev API. LinkedIn and X/Twitter are the V1 platforms, with the architecture supporting all 13 Late.dev platforms.

The `ideate` namespace ([16]) handles content **creation** (draft, from-doc, variations, research, outline, facts). The new `social` namespace handles **publishing** — taking generated content and posting it to one or more platforms with platform-specific adaptations.

## Architecture

### Components

```
scripts/late-tool.mjs                          # CLI wrapper (mirrors notion-tool.mjs)
_infrastructure/late-skills/                   # Shared Late.dev integration skills
  ├── late-common/SKILL.md                     # Auth, errors, rate limits, conventions
  ├── late-publish/SKILL.md                    # Write operations (create, schedule, retry)
  ├── late-status/SKILL.md                     # Read operations (list, status, analytics)
  ├── late-media/SKILL.md                      # Media upload workflows
  └── late-accounts/SKILL.md                   # OAuth flows, account health, profiles
skills/infrastructure/                         # Mirror copies for plugin discovery
  ├── late-common/SKILL.md
  ├── late-publish/SKILL.md
  ├── late-status/SKILL.md
  ├── late-media/SKILL.md
  └── late-accounts/SKILL.md
commands/social/                               # 11 commands
  ├── post.md                                  # Create + publish (immediate or scheduled)
  ├── cross-post.md                            # Multi-platform publish from P24 output
  ├── schedule.md                              # Future scheduling with queue management
  ├── draft.md                                 # Save drafts without publishing
  ├── status.md                                # Check post/publish status
  ├── reply.md                                 # Comment/reply on posts
  ├── analytics.md                             # View post metrics
  ├── queue.md                                 # Manage posting queue/time slots
  ├── connect.md                               # Add new social accounts (OAuth flow)
  ├── profiles.md                              # Manage Late.dev profiles
  └── webhooks.md                              # Configure status callbacks
skills/social/                                 # Domain skills
  ├── platform-adaptation/SKILL.md             # Per-platform content rules & limits
  │   └── references/platform-constraints.md   # Detailed per-platform limits
  ├── cross-posting/SKILL.md                   # Multi-platform adaptation + engagement
  └── posting-cadence/SKILL.md                 # Optimal posting times, queue management
agents/social/                                 # Pipeline agent team
  ├── config.json                              # Pipeline configuration
  ├── content-adapter-agent.md                 # Adapts content per platform constraints
  ├── preview-agent.md                         # Shows adaptations for user approval
  ├── media-handler-agent.md                   # Uploads, resizes, validates media
  ├── publisher-agent.md                       # Posts via late-tool.mjs
  └── monitor-agent.md                         # Tracks status, engagement, retries
```

**Note on 11-command scope**: This is the largest namespace by command count. The management commands (`connect`, `profiles`, `webhooks`) were considered for consolidation into a single `social:manage` but kept separate for discoverability and tab-completion ergonomics.

### Data Flow

```
P24 ideate:draft → generates content brief
         ↓
social:cross-post --from=<file|notion-url> --platforms=linkedin,x
         ↓
  [Load skills] → [Adapt per platform] → [Preview for approval]
         ↓
  [Upload media] → [Publish via late-tool.mjs] → [Monitor status]
         ↓
  Content DB (Type="Social Post") + status tracking
```

## CLI Wrapper: `scripts/late-tool.mjs`

Node.js executable mirroring `scripts/notion-tool.mjs` patterns.

### Authentication

- Reads `LATE_API_KEY` from environment variable or `.env` file (walks up 5 directories)
- `.env` parsing MUST strip surrounding quotes (single and double) from values
- API key format: `sk_` prefix + 64 hex characters
- Base URL: `https://getlate.dev/api/v1`
- Diagnostic mode: `--diagnostic` tests auth + lists profiles/accounts
- `--validate-only` flag: lightweight auth check (format + single API call, no side effects) for CI/CD

### Security: Token Handling

- NEVER log, echo, or include the API key in error messages
- NEVER write the API key to any output file or Notion DB
- Mask the key in diagnostic output (`sk_****...last4`)
- Validate key format before making API calls (fail fast on malformed keys)
- Rate limit: respect `X-RateLimit-Remaining` headers, exponential backoff on 429
- All API calls use HTTPS only (enforce via URL validation)
- Do NOT retry 401 (auth failed) responses — fail immediately with `LATE_AUTH_FAILED`
- Only retry 429 and 5xx responses (transient errors)
- Sanitize API error response bodies before including in error output — strip any reflected input
- Warn if `.env` file has overly permissive permissions (not `600` or `400`)
- Presigned URLs: treat as bearer tokens, never persist to logs or DB, use shortest practical TTL
- Content-type validation: verify claimed MIME type matches actual file magic bytes before upload

### Shared Auth Utility

Both `notion-tool.mjs` and `late-tool.mjs` share the same `.env` walk-up pattern. Extract into `_infrastructure/auth/resolve-env.mjs`:
- Environment variable lookup
- `.env` file walk-up with quote stripping
- Permission checking (warn on world-readable)
- Key format validation (pluggable: `sk_` for Late, `secret_` for Notion)
- Masking utility (`maskKey(key, showLast=4)`)

### Subcommands

| Command | Description | Key Params |
|---------|-------------|------------|
| `profiles list` | List Late.dev profiles | — |
| `profiles create` | Create a new profile | `--name` |
| `accounts list` | List connected social accounts | `--profile` |
| `accounts health` | Check account token validity | `--account-id` |
| `accounts connect` | Start OAuth flow for platform | `--platform`, `--profile` |
| `accounts disconnect` | Remove account | `--account-id` |
| `media presign` | Get presigned upload URL | `--filename`, `--content-type` |
| `posts create` | Create and publish/schedule/draft | `--accounts`, `--text`, `--media`, `--schedule`, `--draft` |
| `posts list` | List posts with filters | `--status`, `--profile`, `--limit` |
| `posts status` | Get post status + per-platform results | `--post-id` |
| `posts retry` | Retry failed platform publishes | `--post-id` |
| `analytics get` | Fetch post metrics | `--post-id`, `--account-id`, `--date-range` |
| `queue list` | List queue time slots | `--profile` |
| `queue add` | Add queue time slot | `--profile`, `--day`, `--time` |
| `queue remove` | Remove queue time slot | `--profile`, `--slot-id` |
| `webhooks get` | Get webhook config | — |
| `webhooks set` | Set webhook URL + signing secret | `--url`, `--secret` |

### Platform-Specific Options

Passed as JSON via `--platform-options`:

**LinkedIn**:
- `orgs`: Array of organization IDs for multi-org posting
- `firstComment`: Text for automated first comment
- `linkPreview`: Boolean to control link preview generation
- `document`: Path to PDF for document posts (max 300 pages, 100MB)

**X/Twitter**:
- `threadItems`: Array of `{ text, mediaItems? }` for multi-tweet threads
- `replyTo`: Tweet ID for reply chains

### Error Handling

Structured error codes mirroring notion-tool.mjs:

| Code | Meaning | Retry? |
|------|---------|--------|
| `LATE_AUTH_FAILED` | Invalid or missing API key | NO — fail immediately |
| `LATE_RATE_LIMIT` | 429 — auto-retry with exponential backoff | YES — up to 3x |
| `LATE_PLATFORM_ERROR` | Platform-specific publish failure | NO — surface to user |
| `LATE_MEDIA_ERROR` | Media upload/validation failure | NO — surface to user |
| `LATE_NOT_FOUND` | Resource not found | NO |
| `LATE_NETWORK_ERROR` | Connection failure | YES — up to 3x |
| `LATE_SERVER_ERROR` | 5xx server error | YES — up to 3x |

Auto-retry: up to 3 retries with exponential backoff (1s, 2s, 4s) for retryable errors only.

**Error classification for commands** (matches inbox:triage pattern):
- **Transient**: Rate limits, network errors, 5xx → auto-retry
- **Recoverable**: Platform-specific failures → offer retry via `social:status --failed`
- **Degradable**: Analytics unavailable (no add-on) → continue without metrics
- **Fatal**: Auth failure, invalid key → halt with fix instructions

### Media Upload Flow

```bash
# Step 1: Get presigned URL (short TTL, treat as bearer token)
late-tool.mjs media presign --filename=photo.jpg --content-type=image/jpeg
# → { "publicUrl": "https://..." }
# Note: uploadUrl is used internally only, never logged

# Step 2: Upload file (handled internally by CLI)
# CLI validates content-type matches file magic bytes before upload

# Step 3: Reference in post
late-tool.mjs posts create \
  --accounts='["acc_123"]' \
  --text="Check this out!" \
  --media='[{"publicUrl":"https://...","type":"image"}]'
```

**Platform constraints** (enforced by CLI validation):

| Platform | Images | Video | Other |
|----------|--------|-------|-------|
| LinkedIn | JPEG/PNG/GIF | MP4/MOV | PDF docs (100MB, 300pp max) |
| X/Twitter | 4 images max OR 1 video | MP4/MOV | — |

### OAuth Security (`accounts connect`)

The OAuth flow for connecting social accounts MUST implement:

- **PKCE** (Proof Key for Code Exchange): Required for CLI/public clients per OAuth 2.1
- **State parameter**: Generate cryptographic random state, validate on callback to prevent CSRF
- **Redirect URI allowlisting**: Use Late.dev's headless mode or a localhost callback with random port
- **Authorization code exchange**: Performed server-side by Late.dev (our CLI only initiates the flow)
- **Audit logging**: Log connect/disconnect events to local audit file (no credentials in log)

Flow:
1. CLI generates PKCE code verifier + challenge
2. Opens browser to Late.dev OAuth URL with state + challenge
3. Late.dev handles the full OAuth exchange
4. CLI receives confirmation via headless mode callback
5. Account appears in `accounts list`

### Webhook Security (`webhooks set`)

Webhook configuration MUST implement:

- **Signing secret**: Generate or accept HMAC signing secret for payload verification
- **Signature verification**: Document that webhook receivers must validate `X-Late-Signature` header
- **URL validation**: HTTPS only, validate URL format, warn on non-standard ports
- **Secret storage**: Store webhook secret in `.env` as `LATE_WEBHOOK_SECRET`, never in Notion DB

## Commands

All command `.md` files MUST include standard YAML frontmatter:

```yaml
---
description: Short command description
argument-hint: "[arg] [--flag=value]"
allowed-tools: ["Read", "Write", "Bash"]
---
```

### Universal Command Execution Flow

Every command in the `social` namespace follows this execution pattern (matching existing conventions from `inbox:triage`, `ideate:draft`, etc.):

1. **Load Skills**: Read required skill files
2. **Business Context** (Optional): Check `_infrastructure/context/active/` for personalization
3. **Step 0: Memory Context**: Read `_infrastructure/memory/context-injection/SKILL.md`, query memory store, inject relevant memories
4. **Intelligence: Apply Learned Patterns**: Check for learned optimizations from past runs
5. **Phase 1–N**: Command-specific execution phases
6. **Self-Healing: Error Recovery**: Classify errors (transient/recoverable/degradable/fatal), apply recovery
7. **Output**: Write to file, Notion DB, display in chat
8. **Final Step: Observation Logging**: Record observations via `_infrastructure/memory/pattern-detection/SKILL.md`
9. **Intelligence: Post-Command**: Log execution metrics for future optimization

### Publishing Commands

#### `social:post`

Create and publish content to one or more platforms.

```
/founder-os:social:post "Post text" --platforms=linkedin,x \
  [--from=file.md|notion-url] [--media=path1,path2] \
  [--schedule="2026-03-15 9:00am"] [--draft] [--thread] [--team] \
  [--format=table|json|markdown]
```

**Arguments**:
- `text` (positional): Post text. Omit if using `--from`.
- `--platforms` (required): Comma-separated list of target platforms.
- `--from`: Source file path or Notion page URL (reads content from P24 output).
- `--media`: Comma-separated file paths for images/videos/documents.
- `--schedule`: Schedule for future time (natural language or ISO 8601).
- `--draft`: Save as draft without publishing.
- `--thread`: Enable thread mode (X threads, LinkedIn carousel from long-form).
- `--team`: Activate full agent pipeline.
- `--audience`: Target audience hint for content adaptation.
- `--format`: Output format (default: table).

#### `social:cross-post`

Multi-platform publish from P24 output with automatic adaptation.

```
/founder-os:social:cross-post --from=<file.md|notion-url|clipboard> \
  --platforms=linkedin,x [--adapt] [--team] [--format=table|json|markdown]
```

**This is the P24 bridge command.** Takes content generated by `ideate:draft`, `ideate:from-doc`, or `ideate:variations` and publishes to multiple platforms.

**Execution flow**:
1. Load source content (detect format: markdown, plain text, rich text)
2. Detect content type (long-form article, short post, listicle, thread)
3. For each target platform: adapt length, formatting, hashtags, media
4. Preview all adaptations side-by-side for user approval
5. User can edit individual variants inline before confirming
6. Publish all simultaneously via Late.dev cross-post API
7. Record all variants in Content DB with shared Cross-Post Group ID

**With `--team` flag**: Activates the full agent pipeline (Content Adapter → Preview → Media Handler → Publisher → Monitor).

#### `social:schedule`

Schedule posts for optimal times or queue slots.

```
/founder-os:social:schedule "Post text" --platforms=linkedin \
  --at="tomorrow 9am" [--queue] [--timezone=America/New_York] [--format=table|json|markdown]
```

- `--at`: Specific time (natural language or ISO 8601)
- `--queue`: Add to next available queue slot instead of specific time
- `--timezone`: Override default timezone

#### `social:draft`

Save drafts without publishing.

```
/founder-os:social:draft "Draft text" --platforms=linkedin,x [--media=path]
```

Saves to Late.dev as draft + records in Content DB (Status="Draft").

#### `social:status`

Check post status and per-platform results.

```
/founder-os:social:status [post-id] [--all] [--failed] [--recent=10] [--format=table|json|markdown]
```

- Shows published/partial/failed status per platform
- `--failed`: Filter to failed posts with retry option
- `--recent`: Show N most recent posts

### Interaction Commands

#### `social:reply`

Reply or comment on posts.

```
/founder-os:social:reply --post-id=xxx "Reply text" [--platform=linkedin]
```

#### `social:analytics`

View engagement metrics (requires Late.dev Analytics add-on).

```
/founder-os:social:analytics [post-id] [--range=7d|30d|90d] [--platform=linkedin] [--format=table|json|markdown]
```

Shows: likes, comments, shares, impressions, reach, clicks per platform.
Degrades gracefully if Analytics add-on not available — shows message with upgrade URL.

#### `social:queue`

Manage posting queue time slots.

```
/founder-os:social:queue [list|add|remove] [--day=weekdays] [--time="9:00am"] [--format=table|json|markdown]
```

### Management Commands

#### `social:connect`

Connect a new social account via OAuth with PKCE.

```
/founder-os:social:connect --platform=linkedin [--profile=default]
```

Initiates secure OAuth flow (see OAuth Security section). Provides authorization URL for user to complete in browser. Logs connect event to local audit file.

#### `social:profiles`

Manage Late.dev profiles (brand groupings).

```
/founder-os:social:profiles [list|create|delete] [--name="My Brand"]
```

#### `social:webhooks`

Configure post status webhooks with signature verification.

```
/founder-os:social:webhooks [get|set] [--url=https://...] [--secret=hmac_secret]
```

Sets webhook URL and HMAC signing secret. See Webhook Security section.

### Scheduling Support (`--schedule` flag)

Following the 9 existing scheduled namespaces (briefing, review, followup, etc.), the `social` namespace supports the `--schedule` flag for recurring social posts:

```
/founder-os:social:post "Weekly roundup" --platforms=linkedin --schedule "mondays 9:00am"
/founder-os:social:cross-post --from=weekly-content.md --platforms=linkedin,x --schedule "weekdays 10:00am"
/founder-os:social:schedule --schedule status
/founder-os:social:schedule --schedule disable
```

**Supported expressions**:
- Natural language: `"weekdays 9:00am"`, `"mondays 10:00am"`, `"every friday 3pm"`
- 5-field cron: `"0 9 * * 1-5"`
- `--persistent`: OS-level cron instead of session-scoped
- `--schedule status`: Show current schedule
- `--schedule disable`: Remove schedule

Generates P27 Workflow YAML automatically per the `_infrastructure/scheduling/SKILL.md` pattern.

**Default suggestion**: "weekdays 10:00am" for LinkedIn, "weekdays 12:00pm, 5:00pm" for X (dual posting slots for higher engagement).

## Agent Team: Pipeline Pattern

### Configuration (`agents/social/config.json`)

```json
{
  "pattern": "pipeline",
  "description": "Multi-platform social media publishing pipeline with preview approval. Activated via --team flag on post or cross-post commands.",
  "execution": "sequential",
  "agents": [
    {
      "name": "content-adapter-agent",
      "role": "Adapt source content for each target platform's constraints and culture",
      "file": "content-adapter-agent.md",
      "order": 1,
      "tools": ["Read"],
      "skills": ["platform-adaptation", "cross-posting"]
    },
    {
      "name": "preview-agent",
      "role": "Show adapted content side-by-side for user approval before publishing",
      "file": "preview-agent.md",
      "order": 2,
      "tools": ["Read"],
      "skills": []
    },
    {
      "name": "media-handler-agent",
      "role": "Upload, resize, and validate media per platform limits",
      "file": "media-handler-agent.md",
      "order": 3,
      "tools": ["Read", "Bash"],
      "skills": ["late-media"]
    },
    {
      "name": "publisher-agent",
      "role": "Execute late-tool.mjs posts create for each platform",
      "file": "publisher-agent.md",
      "order": 4,
      "tools": ["Bash"],
      "skills": ["late-publish"]
    },
    {
      "name": "monitor-agent",
      "role": "Track publish status, retry failures, update Notion DB",
      "file": "monitor-agent.md",
      "order": 5,
      "tools": ["Read", "Bash"],
      "skills": ["late-status"]
    }
  ],
  "coordination": {
    "timeout_per_agent": "45s",
    "error_handling": "continue_on_partial_failure",
    "handoff": "output_of_previous_is_input_of_next",
    "data_format": "structured_json"
  },
  "observability": {
    "log_level": "info",
    "report_on_complete": true,
    "track_per_platform_status": true
  }
}
```

### Agent: content-adapter-agent.md

```yaml
---
name: content-adapter-agent
description: Adapts source content for each target platform's constraints and culture
tools: ["Read"]
color: blue
---
```

**Role**: Adapt source content for each target platform.

**Input**: Source content + target platforms list.

**Behavior**:
- Reads `platform-adaptation` skill for per-platform rules
- LinkedIn: preserves full text (up to 3000 chars), adds hashtags, formats with line breaks
- X/Twitter: if content > 280 chars, splits into thread items (each ≤ 280 chars)
  - Thread splitting rules: split at paragraph boundaries, then sentence boundaries
  - Each thread item should be standalone-readable
  - First item gets the hook, last item gets the CTA
  - Number threads with (1/N) suffix
- Adjusts tone per platform (LinkedIn: professional, X: conversational)
- Handles hashtag adaptation (LinkedIn: 3-5 at end, X: 1-2 inline)
- Sanitizes content before output (strip potential injection payloads for Notion DB safety)

**Output**: JSON array of `{ platform, text, threadItems?, mediaItems?, platformOptions }`.

### Agent: preview-agent.md

```yaml
---
name: preview-agent
description: Shows adapted content for user approval before publishing
tools: ["Read"]
color: cyan
---
```

**Role**: Show adapted content for user approval before publishing.

**Input**: Adapted content variants from content-adapter-agent.

**Behavior**:
- Formats each platform variant in a clear side-by-side display
- Shows character count vs limit for each variant
- Highlights media attachments and platform-specific settings
- Lists any warnings (e.g., "LinkedIn post is 2847/3000 chars")
- Asks user to approve, edit, or cancel
- User can edit individual variants inline
- If user edits, validates against platform constraints

**Output**: Approved (potentially edited) content variants.

### Agent: media-handler-agent.md

```yaml
---
name: media-handler-agent
description: Uploads, resizes, and validates media per platform limits
tools: ["Read", "Bash"]
color: yellow
---
```

**Role**: Upload, resize, and validate media per platform limits.

**Input**: Media file paths + platform constraints.

**Behavior**:
- Reads `late-media` skill for upload workflow
- Validates file types and sizes per platform
- Validates content-type matches actual file magic bytes
- Uses `late-tool.mjs media presign` for each file
- Uploads via presigned URLs (treats URLs as bearer tokens — no logging)
- For Bluesky (future): auto-compresses images to 1MB limit
- Returns public URLs mapped to each platform's post

**Output**: JSON map of `{ platform: [{ publicUrl, type }] }`.

### Agent: publisher-agent.md

```yaml
---
name: publisher-agent
description: Executes late-tool.mjs posts create for each platform
tools: ["Bash"]
color: green
---
```

**Role**: Execute `late-tool.mjs posts create` for each platform.

**Input**: Adapted content + media URLs.

**Behavior**:
- Calls `late-tool.mjs posts create` with per-platform parameters
- Handles cross-posting (single API call with multiple accounts)
- Manages partial failures (some platforms succeed, others fail)
- Stores post IDs for monitoring

**Output**: `{ postId, perPlatformStatus: [{ platform, status, url?, error? }] }`.

### Agent: monitor-agent.md

```yaml
---
name: monitor-agent
description: Tracks publish status, retries failures, updates Notion DB
tools: ["Read", "Bash"]
color: magenta
---
```

**Role**: Track publish status, retry failures, update Notion.

**Input**: Post IDs from publisher-agent.

**Behavior**:
- Checks `late-tool.mjs posts status` for each post
- Retries failed platforms up to 2x with `late-tool.mjs posts retry`
- Updates Content DB with final status and published URLs
- Generates summary report for user
- Logs audit event for each publish/retry action

**Output**: Final status report with published URLs and engagement data.

## Skills

### Skill Frontmatter Convention

All skill SKILL.md files MUST include YAML frontmatter:

```yaml
---
name: skill-name
description: "Activates when [trigger condition]. Provides [capability]."
globs: ["commands/social/*.md"]  # Domain skills only
---
```

Infrastructure skills use plain description (no "Activates when..." pattern).
Domain skills include `globs` for automatic activation.

### Infrastructure Skills (`_infrastructure/late-skills/`)

Each infrastructure skill has a mirror copy at `skills/infrastructure/<skill-name>/SKILL.md` for plugin discovery.

#### `late-common/SKILL.md`

```yaml
---
name: late-common
description: "Core Late.dev CLI conventions, authentication, error handling, and rate limiting for all social media operations"
---
```

Conventions for all Late.dev operations:

- **Auth**: Read `LATE_API_KEY` from env via shared `resolve-env.mjs`. Never expose in output.
- **Output format**: JSON-only responses from CLI (all subcommands output JSON).
- **Graceful degradation**: If Late.dev unavailable, set `status: "unavailable"` and continue.
- **Rate limits**: Respect per-plan limits (Free: 60/min, Build: 120/min, etc.). Insert 100ms delays between rapid calls.
- **Error handling**: Map all errors to structured codes. Auto-retry 429 and 5xx only. NEVER retry 401.
- **Security**: HTTPS only. Validate API key format before calls. Mask key in all output. Sanitize error bodies.

#### `late-publish/SKILL.md`

```yaml
---
name: late-publish
description: "Late.dev publishing patterns for creating, scheduling, and cross-posting social media content"
---
```

Write-side publishing patterns:

- **Immediate**: Set `publishNow: true` in posts create call.
- **Scheduled**: Set `scheduledAt` with ISO 8601 timestamp + timezone.
- **Draft**: Omit both `publishNow` and `scheduledAt`.
- **Cross-post**: Single API call with multiple account IDs. Late.dev handles per-platform adaptation at the API level, but our Content Adapter agent provides higher-quality adaptation before the API call.
- **Retry**: Use `posts retry` for failed platform publishes within a partial post.

#### `late-status/SKILL.md`

```yaml
---
name: late-status
description: "Late.dev read operations for checking post status, listing posts, and fetching analytics"
---
```

Read-side operations:

- **Status tracking**: Poll `posts status` until terminal state (published/failed). Partial = some platforms succeeded.
- **Listing**: Filter by status, profile, date range.
- **Analytics**: Requires Analytics add-on. Degrade gracefully if unavailable.

#### `late-media/SKILL.md`

```yaml
---
name: late-media
description: "Late.dev media upload workflow with presigned URLs, validation, and platform-specific constraints"
---
```

Media upload workflow:

1. Validate file exists and check type/size against platform limits
2. Validate content-type matches actual file magic bytes (security)
3. Call `late-tool.mjs media presign` to get upload URL
4. Upload file to presigned URL via PUT
5. Include `publicUrl` in post's `mediaItems` array
6. Max 5GB per file. Platform-specific: X max 4 images OR 1 video; LinkedIn allows PDF docs.
7. Presigned URLs have short TTL — use immediately, never persist. TTL is Late.dev-controlled (typically 15 minutes). If the API allows configuring TTL, request 5 minutes maximum

#### `late-accounts/SKILL.md`

```yaml
---
name: late-accounts
description: "Late.dev account management covering OAuth flows, account health checks, and profile management"
---
```

Account management patterns:

- **OAuth connect**: PKCE flow with state parameter, localhost redirect or headless mode
- **Health checks**: Validate token validity and permissions via `accounts health`
- **Profile management**: CRUD operations on Late.dev profiles (brand groupings)
- **Disconnect**: Clean disconnect with audit logging
- **Error handling**: Distinguish expired tokens (reconnect) from revoked tokens (re-authorize)

### Domain Skills (`skills/social/`)

#### `platform-adaptation/SKILL.md`

```yaml
---
name: platform-adaptation
description: "Activates when adapting content for social media platforms. Provides per-platform content rules, character limits, media constraints, and formatting guidelines for LinkedIn and X/Twitter."
globs: ["commands/social/*.md"]
---
```

Per-platform content rules for V1 platforms:

**LinkedIn**:
- Max 3000 characters
- Supports: text, images (multiple), video, PDF documents
- First comment: use for links/promotional content to boost algorithm
- Multi-org: can post to company pages if authorized
- Formatting: line breaks, bold (**text**), italic (*text*)
- Hashtags: 3-5 at end of post, industry-relevant

**X/Twitter**:
- Max 280 characters per tweet
- Threads: array of `threadItems`, each ≤ 280 chars
- Supports: 4 images OR 1 video per tweet
- Reply chains via `replyTo` parameter
- Hashtags: 1-2 inline, trending awareness
- No text formatting (plain text only)

Reference file `references/platform-constraints.md` contains exact API field mappings and validation rules per platform.

#### `cross-posting/SKILL.md`

```yaml
---
name: cross-posting
description: "Activates when publishing content to multiple platforms. Provides adaptation strategies, tone shifting, and engagement patterns for multi-platform content."
globs: ["commands/social/cross-post.md", "commands/social/reply.md"]
---
```

Multi-platform content adaptation strategies:

- **Long-form → Thread**: Content > 280 chars for X gets split into threads. Split at paragraph boundaries first, then sentence boundaries. Each item standalone-readable.
- **Tone shift**: LinkedIn = professional/insightful, X = conversational/punchy.
- **Hashtag strategy**: LinkedIn gets 3-5 targeted hashtags appended. X gets 1-2 inline.
- **Media handling**: Same media goes to all platforms but may need resizing per platform constraints.
- **CTA adaptation**: LinkedIn CTAs are professional ("Learn more in comments"), X CTAs are casual ("Thoughts?").
- **Cross-Post Group**: All variants share a UUID for tracking in Content DB.

**Engagement patterns** (merged from former standalone engagement skill):
- Reply tone should match the platform's culture
- Quote retweets on X: add commentary, not just reshare
- LinkedIn comments: professional, add value, ask follow-up questions
- Engagement metrics interpretation: benchmarks per platform (LinkedIn: 2-5% engagement good, X: 1-3%)

#### `posting-cadence/SKILL.md`

```yaml
---
name: posting-cadence
description: "Activates when scheduling posts or managing queue. Provides optimal posting times, frequency recommendations, and content calendar management per platform."
globs: ["commands/social/schedule.md", "commands/social/queue.md"]
---
```

Optimal posting times and queue management:

- LinkedIn: Tuesday-Thursday, 8-10am and 12-1pm (business hours, user's timezone)
- X/Twitter: Weekdays 12-1pm and 5-6pm; weekends 9-10am
- Frequency: LinkedIn 3-5x/week, X 3-5x/day
- Queue slots: pre-configured recurring time slots for auto-scheduling
- Content calendar alignment: check for conflicts with existing scheduled posts

## Notion DB Changes

Extend the **Content** database (`[FOS] Content`) with new properties:

| Property | Type | Values/Description |
|----------|------|-------------------|
| Platform | Multi-select | LinkedIn, X, Instagram, Facebook, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business, Telegram, Snapchat |
| Post ID | Text | Late.dev post ID (e.g., `post_abc123`) |
| Published URL | URL | Direct link to live post on platform |
| Schedule Time | Date | Scheduled publish time (if not immediate) |
| Engagement | Number | Total engagement score (likes + comments + shares) |
| Cross-Post Group | Text | UUID linking related cross-posts together |
| Publish Status | Select | Pending, Published, Partial, Failed, Draft |
| Late Profile | Text | Late.dev profile name/ID used |

**New Type values** added to Content DB:
- `Social Post` — Single-platform post (LinkedIn, etc.)
- `X Post` — X/Twitter post (follows `LinkedIn Post` naming pattern)
- `X Thread` — Multi-part X thread
- `LinkedIn Thread` — Multi-part LinkedIn carousel/series
- `Cross-Post` — Parent record linking cross-post variants

**Status vs Publish Status**: The existing `Status` property tracks the **content lifecycle** (Draft → To Review → Approved → Published). The new `Publish Status` property tracks **platform delivery state** (Pending → Published → Partial → Failed). Both are needed: content can be "Approved" (content lifecycle) but "Failed" (delivery). Content `Status` moves to "Published" only after `Publish Status` confirms successful delivery.

**DB template update**: `_infrastructure/notion-db-templates/hq-content.json` updated with new properties.

**Migration note**: Existing HQ users need the new properties added to their live Content database. Add a migration step to the setup command or document manual property addition.

**Input sanitization**: All content written to Notion DB MUST be sanitized to prevent formula injection or markdown injection. Strip or escape characters that could be interpreted as Notion formulas.

**`.gitignore` update**: Add `.late/` to `.gitignore` (audit logs, local state). Follows `.memory/` precedent.

## Preflight Integration

**Note**: The preflight infrastructure (`_infrastructure/preflight/`) is currently in planning phase (superpower [7]). The entries below are prepared for when that infrastructure ships. In the interim, commands should include a manual Late.dev availability check (similar to `inbox:triage`'s inline `which gws` check):

```
# Interim check (until preflight [7] ships)
Verify: $LATE_API_KEY is set and matches sk_ format
Probe: node scripts/late-tool.mjs --validate-only
If failed: show fix instructions inline
```

### Dependency Registry

Add to `_infrastructure/preflight/dependency-registry.json` (when available):

```json
{
  "social": {
    "required": ["late"],
    "optional": ["notion", "filesystem"]
  }
}
```

### Check Method for Late.dev

| Dependency | Check Method |
|-----------|--------------|
| `late` | Validate `$LATE_API_KEY` env var exists + format check (`sk_` prefix) + probe `late-tool.mjs --validate-only` for auth confirmation |

### Fix Message

Add to `_infrastructure/preflight/references/fix-messages.md` (when available):

```
## late

**Required by**: social

**How to fix**:
1. Sign up at https://getlate.dev
2. Go to Settings → API Keys → Create Key
3. Add to your environment:
   export LATE_API_KEY="sk_your_key_here"
   Or add to your .env file (ensure chmod 600).
4. Verify: node scripts/late-tool.mjs --diagnostic
```

## Scheduling Infrastructure Integration

The `social` namespace joins the 9 existing scheduled namespaces. Commands `post`, `cross-post`, and `schedule` accept the `--schedule` flag:

```
--schedule "weekdays 10:00am"        # Natural language
--schedule "0 10 * * 1-5"           # 5-field cron
--schedule disable                   # Remove schedule
--schedule status                    # Show current schedule
--persistent                         # OS-level cron
```

Generates P27 Workflow YAML per `_infrastructure/scheduling/SKILL.md`.

**Suggested defaults**: LinkedIn "weekdays 10:00am", X "weekdays 12:00pm".

## CLAUDE.md Updates

When implemented, add to the namespace quick reference table:

```
| 33 | Social Media | `social` | post, cross-post, schedule, draft, status, reply, analytics, queue, connect, profiles, webhooks | Late.dev | Content (Social Post, X Post, X Thread, LinkedIn Thread, Cross-Post) |
```

Update the project overview paragraph to reflect the new namespace count (33 namespaces).

And add to the MCP Servers & External Tools section:

```
6. **Late.dev** CLI (`scripts/late-tool.mjs`, 1 namespace) - Social media publishing across 13 platforms. Run `/founder-os:social:connect` to add accounts.
```

## Audit Logging

Sensitive operations MUST be logged to a local audit file (`.late/audit.log`, gitignored):

| Event | Logged Data |
|-------|-------------|
| `account.connect` | Timestamp, platform, profile, success/failure |
| `account.disconnect` | Timestamp, platform, account ID |
| `webhook.set` | Timestamp, URL (masked after domain), success/failure |
| `auth.failure` | Timestamp, error code (NO key material) |
| `post.publish` | Timestamp, post ID, platforms, status |
| `post.retry` | Timestamp, post ID, platform, attempt number |

## Development Plan: Subagent-Driven with Claude-Flow Swarm

### Swarm Configuration

```bash
npx @claude-flow/cli@latest swarm init \
  --topology hierarchical \
  --max-agents 6 \
  --strategy specialized
```

### Agent Groups (4-6 parallel subagents)

| Group | Agent | Deliverables |
|-------|-------|-------------|
| 1 — Infrastructure | CLI Wrapper Agent | `scripts/late-tool.mjs`, `_infrastructure/auth/resolve-env.mjs`, `_infrastructure/late-skills/` (5 skills), `skills/infrastructure/` mirrors, preflight entries |
| 2 — Core Commands | Publishing Agent | `commands/social/post.md`, `cross-post.md`, `schedule.md`, `draft.md`, `status.md` (all with frontmatter, business context, memory injection, intelligence, observation logging) |
| 3 — Interaction Commands | Engagement Agent | `commands/social/reply.md`, `analytics.md`, `queue.md` (same universal flow) |
| 4 — Management Commands | Platform Agent | `commands/social/connect.md`, `profiles.md`, `webhooks.md` (OAuth/PKCE, webhook signing) |
| 5 — Agent Team | Pipeline Agent | `agents/social/config.json` + 5 agent markdown files (with frontmatter) |
| 6 — Skills + DB | Knowledge Agent | `skills/social/` (3 domain skills with frontmatter + globs), Notion DB template updates, scheduling integration, CLAUDE.md updates |

### Dependencies

```
Group 1 (Infrastructure) blocks Groups 2, 3, 4, 5
Group 6 (Skills) blocks Groups 2, 3, 5
Groups 2, 3, 4 are independent of each other
Group 5 (Agent Team) depends on Groups 2 and 6
```

### Implementation Sequence

**Wave 1** (parallel): Groups 1 + 6
**Wave 2** (parallel): Groups 2 + 3 + 4
**Wave 3**: Group 5 (agent team, depends on commands + skills)

## Platform Extensibility

V1 ships with LinkedIn and X/Twitter. The architecture supports adding any of Late.dev's 13 platforms by:

1. Adding platform entry to `skills/social/platform-adaptation/references/platform-constraints.md`
2. Adding platform-specific options to the CLI wrapper
3. No command changes needed — `--platforms` flag already accepts any platform name

Future platforms: Instagram, Facebook, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business, Telegram, Snapchat.

## Open Questions

1. **Late.dev pricing tier**: Which plan should we design for? Free (20 posts/mo) vs Build ($19, 120 posts) vs Accelerate ($49, unlimited). Affects rate limit handling and feature availability (analytics requires add-on).
2. **Webhook endpoint**: For status callbacks, does the user have a server to receive webhooks, or should we poll instead?
3. **Keychain integration**: Should we support macOS Keychain / Linux Secret Service for API key storage instead of `.env` files? (Enhancement for security-conscious users.)
