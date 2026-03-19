# Social

> Multi-platform social media publishing engine with template library, scheduling, A/B testing, and agent-powered cross-posting.

## Overview

The Social namespace is your publishing command center. It connects to 13 social media platforms via the Late.dev CLI and handles everything from composing a single post to orchestrating multi-platform campaigns with staggered scheduling and performance tracking. Where the Ideate namespace generates content, Social formats, publishes, and monitors it.

At its core, Social provides direct publishing (`post`), draft management (`draft`), and scheduling (`schedule`, `queue`). The `compose` command taps into a library of 80+ proven post templates organized by technique (contrarian, reversal, anaphora, story, list, and more), intelligently selecting and combining templates to match your topic. The `cross-post` command bridges Ideate and Social -- it takes content from `ideate:draft` or `ideate:from-doc` and publishes to multiple platforms with automatic per-platform adaptation (character limits, hashtag rules, thread splitting).

For optimization, the `ab-test` command generates two template-based variants, publishes them staggered, and measures which performs better. The `analytics` command surfaces engagement metrics, and `templates` lets you browse the template library and review A/B test performance data. An optional agent team (activated via `--team`) runs a 5-agent pipeline for complex multi-platform publishing: content adaptation, preview approval, media handling, publishing, and monitoring.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Late.dev CLI | Yes | Publish to social platforms, manage drafts, check status, view analytics |
| Notion CLI | Optional | Log social posts to [FOS] Content database |

## Commands

### `/founder-os:social:post`

**What it does** -- Creates and publishes content to one or more social media platforms via Late.dev. Handles platform-specific formatting, media attachments, thread splitting for X, and humanization. Supports immediate publishing, scheduling, and draft-only mode. With `--team`, activates a 5-agent pipeline for multi-platform publishing with preview approval.

**Usage:**
```
/founder-os:social:post "Your post text here" --platforms=linkedin
/founder-os:social:post "Thread-worthy content" --platforms=x --thread
/founder-os:social:post "Visual post" --platforms=linkedin,instagram --media=photo.jpg
/founder-os:social:post "Scheduled post" --platforms=linkedin --schedule="tomorrow 9am"
/founder-os:social:post "Team pipeline" --platforms=linkedin,x,instagram --team
```

**Example scenario:**
> You have a finished draft from `ideate:draft` and want to publish it to LinkedIn and X simultaneously. You run `/founder-os:social:post "your content" --platforms=linkedin,x`. The system adapts the content for each platform (full post for LinkedIn, thread for X), applies humanization, and publishes both. You get back post IDs and direct links for each platform.

**What you get back:**

Per-platform publish results: post ID, direct URL, platform-specific status (published, scheduled, or failed with error details). If media was included, upload confirmation. If `--team` was used, a full pipeline report from all 5 agents.

**Flags:**
- `--platforms=PLATFORMS` -- Comma-separated target platforms (required)
- `--from=SOURCE` -- Load content from a file, URL, or clipboard instead of inline text
- `--media=PATH` -- Attach media files
- `--schedule=TIME` -- Schedule for later (natural language or ISO 8601)
- `--draft` -- Save as draft without publishing
- `--thread` -- Force thread format on X
- `--team` -- Activate 5-agent publishing pipeline
- `--audience=HINT` -- Audience hint for content adaptation
- `--tone=TONE` -- Humanization tone preset

---

### `/founder-os:social:compose`

**What it does** -- Creates social media content by intelligently selecting and combining templates from the 80+ template library. Analyzes your topic, picks the best-matching templates by technique (contrarian, reversal, anaphora, misdirection, story, list, question, simplification), and generates content that follows proven engagement patterns. Optionally combines multiple techniques for sophisticated posts.

**Usage:**
```
/founder-os:social:compose "why most startups fail at hiring"
/founder-os:social:compose "remote work productivity" --technique=contrarian --platform=x
/founder-os:social:compose "leadership lessons" --pick=5 --combine --variations=3
```

**Example scenario:**
> You want a LinkedIn post about founder burnout but are not sure what angle to take. You run `/founder-os:social:compose "founder burnout" --pick=5`. The system analyzes 80+ templates, selects the 5 best matches (a reversal template, a contrarian template, a story template, and two list templates), and generates content using the top-ranked one. You can ask for variations or pick a different template.

**What you get back:**

Template-based content with technique label, the selected template's structure filled with your topic, and platform-formatted output. With `--variations`, multiple versions using different templates. With `--combine`, a post that stacks complementary techniques.

**Flags:**
- `--technique=NAME` -- Force a specific technique (anaphora, reversal, contrarian, list, story, question, misdirection, simplification)
- `--pick=N` -- Number of template candidates to consider (default: `3`)
- `--combine` -- Enable multi-template combination
- `--platform=PLATFORM` -- Target platform (default: `linkedin`)
- `--audience=HINT` -- Audience hint for tone calibration
- `--variations=N` -- Generate multiple variations using different templates
- `--to-file=PATH` -- Save output to a file

---

### `/founder-os:social:cross-post`

**What it does** -- Takes content generated by Ideate commands (`ideate:draft`, `ideate:from-doc`, `ideate:variations`) and publishes to multiple platforms with automatic per-platform adaptation. Handles character limits, hashtag rules, thread splitting, and platform-specific tone adjustments in one command.

**Usage:**
```
/founder-os:social:cross-post --from=drafts/hiring-post.md --platforms=linkedin,x,instagram
/founder-os:social:cross-post --from=clipboard --platforms=linkedin,x --adapt
/founder-os:social:cross-post --from=drafts/post.md --platforms=linkedin,x --team
```

**Example scenario:**
> You ran `ideate:draft` and saved a content brief to `drafts/ai-tools.md`. You want it on LinkedIn, X, and Instagram. You run `/founder-os:social:cross-post --from=drafts/ai-tools.md --platforms=linkedin,x,instagram`. The system reads the draft, adapts it for each platform (full post for LinkedIn, 4-tweet thread for X, short caption for Instagram), and publishes all three. Each platform gets content optimized for its norms.

**What you get back:**

Per-platform adapted content previews (if in team mode, shown for approval first), publish results with post IDs and URLs, and adaptation notes explaining what changed per platform.

**Flags:**
- `--from=SOURCE` -- Source file path, Notion page URL, or `clipboard` (required)
- `--platforms=PLATFORMS` -- Comma-separated target platforms (required)
- `--adapt` -- Enable aggressive platform adaptation (rewrites, not just formatting)
- `--team` -- Activate 5-agent pipeline with preview approval step
- `--tone=TONE` -- Humanization tone preset

---

### `/founder-os:social:draft`

**What it does** -- Saves draft posts to Late.dev without publishing. Useful for preparing content for later review, approval workflows, or batch scheduling.

**Usage:**
```
/founder-os:social:draft "Draft text" --platforms=linkedin,x
/founder-os:social:draft "Content with media" --platforms=linkedin --media=chart.png
```

**What you get back:**

Draft IDs for each platform, confirmation of saved content, and instructions for reviewing and publishing later.

**Flags:**
- `--platforms=PLATFORMS` -- Target platforms (required)
- `--media=PATH` -- Attach media files
- `--tone=TONE` -- Humanization tone preset

---

### `/founder-os:social:schedule`

**What it does** -- Schedules posts for future publication at specific times or into queue slots managed by the `queue` command.

**Usage:**
```
/founder-os:social:schedule "Post text" --platforms=linkedin --at="tomorrow 9am"
/founder-os:social:schedule "Queued post" --platforms=linkedin --queue
```

**What you get back:**

Confirmation of scheduled time, post ID, and platform-specific scheduling details. For queue slots, the assigned time based on your configured queue schedule.

**Flags:**
- `--platforms=PLATFORMS` -- Target platforms (required)
- `--at=TIME` -- Specific time (natural language or ISO 8601)
- `--queue` -- Add to next available queue slot
- `--timezone=TZ` -- Override default timezone

---

### `/founder-os:social:queue`

**What it does** -- Manages posting queue time slots for automated scheduling. View current slots, add new ones for specific days and times, or remove existing slots.

**Usage:**
```
/founder-os:social:queue list
/founder-os:social:queue add --day=weekdays --time=9:00am
/founder-os:social:queue remove --slot-id=abc123
```

**What you get back:**

For `list`: a table of all configured queue slots with day, time, and profile. For `add`/`remove`: confirmation of the change.

**Flags:**
- `list|add|remove` -- Action to perform (default: `list`)
- `--day=PATTERN` -- Day pattern for `add`: `weekdays`, `monday`, `everyday`, etc.
- `--time=TIME` -- Time slot for `add`
- `--slot-id=ID` -- Slot ID for `remove`
- `--profile=NAME` -- Late.dev profile (default: first profile)

---

### `/founder-os:social:status`

**What it does** -- Checks post delivery status and per-platform results. View a specific post, filter to failed posts for retry, or see recent activity.

**Usage:**
```
/founder-os:social:status post-abc123
/founder-os:social:status --failed
/founder-os:social:status --recent=20
```

**What you get back:**

Post status table with ID, platform, delivery status (published/pending/failed), timestamp, and error details for failures.

**Flags:**
- `post-id` -- Specific post ID to check (positional)
- `--all` -- Show all posts
- `--failed` -- Filter to failed posts with retry option
- `--recent=N` -- Show N most recent posts (default: `10`)

---

### `/founder-os:social:reply`

**What it does** -- Posts a reply or comment on an existing social media post via Late.dev.

**Usage:**
```
/founder-os:social:reply --post-id=abc123 "Thanks for the feedback!"
/founder-os:social:reply --post-id=abc123 "Great point" --platform=linkedin
```

**What you get back:**

Confirmation of the reply with a link to the comment on the platform.

**Flags:**
- `--post-id=ID` -- Post ID to reply to (required)
- `--platform=PLATFORM` -- Target platform if post was cross-posted

---

### `/founder-os:social:analytics`

**What it does** -- Views engagement metrics for published posts. Requires the Late.dev Analytics add-on. Shows impressions, clicks, reactions, comments, shares, and engagement rate.

**Usage:**
```
/founder-os:social:analytics post-abc123
/founder-os:social:analytics --range=30d --platform=linkedin
```

**What you get back:**

Engagement metrics table with per-post or aggregated stats across the selected time range and platform filter.

**Flags:**
- `post-id` -- Specific post ID (positional)
- `--range=PERIOD` -- Date range: `7d`, `30d`, `90d` (default: `7d`)
- `--platform=PLATFORM` -- Filter to a specific platform

---

### `/founder-os:social:connect`

**What it does** -- Connects a new social media account via OAuth with PKCE. This is a foreground (interactive) command that opens a browser-based OAuth flow.

**Usage:**
```
/founder-os:social:connect --platform=linkedin
/founder-os:social:connect --platform=x --profile="Personal Brand"
```

**What you get back:**

Step-by-step OAuth flow guidance, confirmation of successful connection, and account details.

**Flags:**
- `--platform=PLATFORM` -- Platform to connect (required)
- `--profile=NAME` -- Late.dev profile to associate the account with

---

### `/founder-os:social:profiles`

**What it does** -- Manages Late.dev profiles, which are brand groupings that organize your social accounts. List existing profiles, create new ones, or delete unused ones.

**Usage:**
```
/founder-os:social:profiles list
/founder-os:social:profiles create --name="Company Brand"
```

**What you get back:**

For `list`: profile table with name, ID, and connected accounts. For `create`/`delete`: confirmation of the action.

**Flags:**
- `list|create|delete` -- Action to perform (default: `list`)
- `--name=NAME` -- Profile name (for `create`)
- `--profile-id=ID` -- Profile ID (for `delete`)

---

### `/founder-os:social:webhooks`

**What it does** -- Configures webhooks for receiving post status callbacks with HMAC signature verification. Useful for integrating with external monitoring or notification systems.

**Usage:**
```
/founder-os:social:webhooks get
/founder-os:social:webhooks set --url=https://hooks.example.com/social --secret=my_secret
```

**What you get back:**

Current webhook configuration (URL, signing status) or confirmation of the updated configuration.

**Flags:**
- `get|set` -- Action to perform (default: `get`)
- `--url=URL` -- Webhook URL, HTTPS only (for `set`)
- `--secret=SECRET` -- HMAC signing secret, or auto-generate (for `set`)

---

### `/founder-os:social:ab-test`

**What it does** -- Generates two content variants using different templates from the library, publishes them staggered, measures engagement after a configurable window, and records which template technique performed better. This is a foreground command because it requires interactive approval of variants before publishing.

**Usage:**
```
/founder-os:social:ab-test "why most founders fail at delegation" --platforms=linkedin
/founder-os:social:ab-test "AI productivity tips" --platforms=linkedin --stagger=48 --measure-after=72
/founder-os:social:ab-test --check
```

**What you get back:**

Two variant previews for approval, then (after publishing and measurement) a comparison report with engagement metrics per variant, the winning template technique, and the performance data logged for future template ranking.

**Flags:**
- `--platforms=PLATFORMS` -- Target platforms (required for new tests)
- `--measure-after=HOURS` -- Hours to wait before measuring (default: `72`)
- `--stagger=HOURS` -- Hours between publishing variant A and variant B (default: `48`)
- `--templates=A,B` -- Force specific template IDs instead of auto-selection
- `--check` -- Check results of a running A/B test

---

### `/founder-os:social:templates`

**What it does** -- Browse the 80+ social media template library, inspect individual templates, and view A/B test performance statistics by technique.

**Usage:**
```
/founder-os:social:templates list
/founder-os:social:templates list --technique=contrarian
/founder-os:social:templates show jan25-1
/founder-os:social:templates stats
```

**What you get back:**

For `list`: template catalog with ID, name, technique, and engagement score. For `show`: the full template with structure, placeholders, and usage notes. For `stats`: performance ranking of techniques based on A/B test data.

**Flags:**
- `list|show|stats` -- Subcommand (required)
- `id` -- Template ID (required for `show`)
- `--technique=NAME` -- Filter by technique name (for `list` and `stats`)

---

## Tips & Patterns

- **Ideate-to-publish pipeline**: Run `ideate:draft` to generate content, then `social:cross-post --from=file` to publish across platforms. The cross-post command handles all per-platform adaptation automatically.
- **Template-powered consistency**: Use `social:compose` instead of writing from scratch. The template library encodes proven engagement patterns, and A/B test data improves recommendations over time.
- **Test before committing**: Run `social:ab-test` on your best topics to discover which template techniques resonate with your audience. The performance data feeds back into template ranking.
- **Batch scheduling**: Write content in batches using `ideate:draft`, save with `--to-file`, then schedule through `social:schedule` with queue slots configured via `social:queue`.
- **Monitor and iterate**: Use `social:analytics` to review performance, then feed winning topics back into `ideate:variations` for follow-up content.

## Related Namespaces

- [Ideate](./ideate.md) -- Content ideation generates the raw material that Social formats and publishes; `cross-post` is the direct bridge
- [Newsletter](./newsletter.md) -- Newsletter content can be repurposed for social via `ideate:from-doc` followed by `social:post`
- [Briefing](./briefing.md) -- Daily briefing data can inspire content topics; upcoming events and client wins make natural social content
