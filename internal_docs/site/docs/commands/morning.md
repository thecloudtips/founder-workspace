# Morning

> Cross-source morning briefing that synthesizes Gmail, Calendar, Notion, Slack, and Drive into prioritized action items.

## Overview

The Morning namespace is your daily launchpad. It connects to up to five data sources -- Gmail, Google Calendar, Notion tasks, Slack, and Google Drive -- gathers everything that happened overnight, and synthesizes it into a ranked priority list with actionable next steps. Instead of opening five apps and mentally piecing together your day, you get one structured view of what matters most.

Morning offers two modes. The full sync (`morning:sync`) runs the complete pipeline: gather data from all sources, score and rank every item using a unified 0-100 priority system, deduplicate across sources, assemble a detailed briefing, save it to your Notion **[FOS] Briefings** database (with `Type = "Morning Sync"`), and display a chat summary. The quick check (`morning:quick`) runs a lightweight version optimized for speed -- counts, top priorities, and a glance at today's schedule, with no Notion storage.

Both commands degrade gracefully. Gmail, Calendar, and Notion are required sources; Slack and Drive are optional. If an optional source is unavailable, its section is silently omitted. If one required source goes down, you still get a partial briefing with a warning. The system never blocks your morning because one integration hiccuped.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| gws CLI (Gmail) | Yes | Fetch unread emails within the overnight window |
| gws CLI (Calendar) | Yes | Fetch today's meetings, classify types, score importance |
| Notion CLI | Yes | Query task databases for items due today and overdue |
| Slack MCP | Optional | Surface overnight @mentions and high-signal messages |
| gws CLI (Drive) | Optional | Surface shared files and documents modified overnight |

## Commands

### `/founder-os:morning:sync`

**What it does** -- Runs the full morning briefing pipeline: gathers overnight data from all configured sources, applies cross-source priority scoring with deduplication, creates or updates a Notion briefing page, and presents a structured chat summary. This is the comprehensive command for starting your day with complete situational awareness.

**Usage:**
```
/founder-os:morning:sync
/founder-os:morning:sync --since=8h
/founder-os:morning:sync --date=2026-03-15
/founder-os:morning:sync --output=chat
/founder-os:morning:sync --schedule="0 8 * * 1-5"
```

**Example scenario:**
> It's 7:30 AM on a Tuesday. You run `/founder-os:morning:sync`. The system scans the last 12 hours of email and finds 14 unread messages -- 2 urgent from a key client, 3 requiring action, the rest informational. Calendar shows 5 meetings today, including an external client call in 90 minutes with no prep doc found. Notion surfaces 2 overdue tasks and 4 due today. Slack has 3 @mentions from the engineering channel. The briefing ranks "Prepare for client call at 9:00 AM -- no prep doc found" as priority #1, saves a full briefing page to Notion, and shows you the top 5 actions in chat.

**What you get back:**

A structured briefing with five sections: Top Priorities (ranked 1-5 with action statements and time sensitivity), Schedule Overview (today's meetings by importance), Email Highlights (urgent and important emails with action indicators), Tasks & Deadlines (overdue first, then due today), and optional Slack/Drive sections. Quick Stats at the bottom summarize counts across all sources. If Notion output is enabled, a link to the full briefing page is included.

**Flags:**
- `--since=TIMEFRAME` -- Override the overnight window (default: `12h`). Accepts `Nh` format or ISO datetime
- `--date=YYYY-MM-DD` -- Generate a briefing for a specific date instead of today
- `--output=MODE` -- Output destination: `notion`, `chat`, or `both` (default: `both`)
- `--schedule=EXPR` -- Set up recurring execution (e.g., `"0 8 * * 1-5"` for weekdays at 8 AM)
- `--persistent` -- Keep scheduled briefings running across sessions (use with `--schedule`)

---

### `/founder-os:morning:quick`

**What it does** -- Runs a lightweight morning check-in across all configured sources. Produces a concise chat-only summary with your top 5 priorities and today's key numbers. No Notion page is created -- this is ephemeral by design, optimized to be read in under 30 seconds.

**Usage:**
```
/founder-os:morning:quick
/founder-os:morning:quick --since=8h
```

**Example scenario:**
> You have 10 minutes before your first meeting and just want to know what's waiting. You run `/founder-os:morning:quick`. In seconds, you see: 3 meetings today (1 high-priority), 8 emails needing attention, 2 overdue tasks, and a ranked list of your top 5 actions. No Notion page, no detailed sections -- just the essentials.

**What you get back:**

A compact summary: Top 5 Priorities as imperative action statements with source icons and time sensitivity, followed by a "Today at a Glance" section with meeting count, email count, task counts, and optional Slack/Drive numbers. The entire output fits in a single screen.

**Flags:**
- `--since=TIMEFRAME` -- Override the overnight window (default: `12h`). Accepts `Nh` format or ISO datetime

---

## Tips & Patterns

- **Start every day the same way**: Run `/founder-os:morning:sync` as your first command. It replaces the habit of checking Gmail, then Calendar, then Slack, then Notion separately.
- **Quick check for meeting gaps**: Between meetings, run `/founder-os:morning:quick` to see if anything urgent came in without generating a full briefing.
- **Automate with scheduling**: Use `--schedule="0 8 * * 1-5"` to have a briefing waiting for you every weekday morning. Combine with `--persistent` to keep it running across sessions.
- **Narrow the window for afternoon catch-ups**: Run `/founder-os:morning:sync --since=4h --output=chat` after lunch to see what happened while you were in meetings.
- **Client-focused days**: When your briefing is dominated by one client (50%+ of items), the system automatically links the Notion record to that client's Company page for CRM context.

## Related Namespaces

- [Inbox](./inbox.md) -- Deeper email triage with draft generation; Morning Sync uses the same email prioritization scoring for its email highlights section
- [Briefing](./briefing.md) -- The original Daily Briefing generator; Morning Sync is the consolidated successor that adds Slack and Drive sources
- [Review](./review.md) -- Weekly review aggregates daily briefing data to spot trends across the week
- [Prep](./prep.md) -- Meeting prep complements morning sync by generating detailed preparation notes for today's high-priority meetings
