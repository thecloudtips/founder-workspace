# Briefing

> Generate a structured daily briefing from your calendar, email, tasks, and Slack.

## Overview

The Briefing namespace pulls data from up to four sources -- Google Calendar, Gmail, Notion tasks, and Slack -- and assembles everything into a single, structured Notion page. The result is a daily briefing with your schedule (including meeting prep notes), priority emails, task deadlines, and team activity. It is designed to be the first thing you look at each morning.

In default mode, a single agent gathers data from each source sequentially and builds the briefing page. In team mode (`--team`), four specialized gatherer agents -- Calendar, Gmail, Notion, and Slack -- fetch data in parallel, and a Briefing Lead agent synthesizes everything into the final output with a "day complexity" score (Low/Medium/High/Critical). The briefing is saved to the **[FOS] Briefings** database with `Type = "Daily Briefing"`.

The namespace also includes a review command that checks for changes since the morning briefing was generated and appends an "Updates Since Morning" section to the existing Notion page -- keeping your briefing current throughout the day without generating a new one.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | Create/update briefing pages in [FOS] Briefings |
| gws CLI (Calendar) | Yes* | Fetch today's calendar events |
| gws CLI (Gmail) | Yes* | Scan unread emails for priority highlights |
| Slack MCP | Optional | Fetch mentions and DMs |

*At least 2 data sources must be available to generate a meaningful briefing.

## Commands

### `/founder-os:briefing:briefing`

**What it does** -- Generates a comprehensive daily briefing by pulling calendar events, unread emails, Notion tasks, and optionally Slack activity. Classifies meetings (internal, external, focus block, recurring standup, personal), generates prep notes for key meetings, scores email priority, groups tasks by project, and assembles everything into a structured Notion page. If a briefing already exists for the target date, it updates it in place rather than creating a duplicate.

**Usage:**
```
/founder-os:briefing:briefing
/founder-os:briefing:briefing --team
/founder-os:briefing:briefing --hours=24
/founder-os:briefing:briefing --team --date=2026-03-18
/founder-os:briefing:briefing --date=2026-03-20
/founder-os:briefing:briefing --schedule="30 7 * * 1-5"
```

**Example scenario:**
> It's 7:30am on a Tuesday. You run `/founder-os:briefing:briefing --team` and within 30 seconds, four agents have scanned your calendar (6 meetings today, including a board call), your Gmail (3 priority emails from investors), your Notion tasks (8 due today, 2 overdue), and your Slack (a DM from your co-founder). The Briefing Lead merges everything into a Notion page, scores your day as "High" complexity, and gives you a direct link. You know exactly what to tackle first.

**What you get back:**

A Notion page URL and a chat summary including: schedule overview with prep notes, top priority emails, tasks grouped by project (with overdue flags), Slack activity (if available), and quick stats. In team mode, you also get a pipeline execution table showing each agent's status, duration, and items found, plus a day complexity score.

**Flags:**
- `--team` -- Activate the full 5-agent parallel pipeline (Calendar, Gmail, Notion, Slack gatherers + Briefing Lead)
- `--hours=N` -- Email lookback window in hours (default: 12)
- `--date=YYYY-MM-DD` -- Date to generate the briefing for (default: today)
- `--schedule="CRON"` -- Set up recurring execution (default suggestion: weekdays at 7:30am)
- `--persistent` -- Keep the schedule active across sessions (used with `--schedule`)

---

### `/founder-os:briefing:review`

**What it does** -- Finds an existing daily briefing for the specified date, checks all sources (calendar, email, tasks) for changes since the briefing was generated, and appends an "Updates Since Morning" section to the Notion page. Only surfaces meaningful changes: new or cancelled meetings, high-priority new emails (Q1/Q2 quadrant only), completed tasks, new overdue items, and newly assigned tasks. If nothing has changed, it reports that and leaves the page untouched.

**Usage:**
```
/founder-os:briefing:review
/founder-os:briefing:review --date=2026-03-18
```

**Example scenario:**
> You generated your briefing at 7:30am. At 2pm, you run `/founder-os:briefing:review` to catch up. It finds that a client meeting was rescheduled, 2 new urgent emails arrived from your lead investor, and 3 tasks were completed. It appends this update to your Notion briefing page with a timestamp, updates the metrics in the database row, and gives you a quick summary in chat.

**What you get back:**

When updates are found: a summary of changes by source (schedule changes, new priority emails, task updates) with a link to the updated Notion page. When no changes are found: a confirmation that everything is on track since the morning briefing.

**Flags:**
- `--date=YYYY-MM-DD` -- Date of the briefing to review (default: today)

---

## Tips & Patterns

- **Morning routine**: Run `/founder-os:inbox:triage --team` first to process your inbox, then `/founder-os:briefing:briefing --team` to generate a briefing that includes those results.
- **Midday check-in**: Run `/founder-os:briefing:review` after lunch to catch schedule changes and new priority items without regenerating the entire briefing.
- **Schedule it**: Use `--schedule="30 7 * * 1-5"` to have your briefing generated automatically every weekday at 7:30am.
- **Pre-plan tomorrow**: Run `/founder-os:briefing:briefing --date=2026-03-20` the evening before to see what's coming and prepare.
- **Pair with prep**: After seeing your briefing's schedule section, run `/founder-os:prep:prep` for any meetings that need deeper preparation.

## Related Namespaces

- [Inbox](./inbox.md) -- Triage your email before generating a briefing so the email section reflects your latest processed state
- [Prep](./prep.md) -- Deep-dive meeting preparation for specific events flagged in your briefing's schedule section
- [Actions](./actions.md) -- Extract action items from meeting notes referenced in your briefing
- [Review](./review.md) -- Your weekly review aggregates daily briefing data into a broader retrospective
