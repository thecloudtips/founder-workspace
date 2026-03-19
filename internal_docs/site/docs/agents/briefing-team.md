# Daily Briefing Agent Team

> Parallel gathering: Collect calendar, email, task, and Slack data simultaneously, then compile into a structured daily briefing

## Overview

The Daily Briefing agent team assembles your morning briefing by pulling data from four sources at once -- Google Calendar, Gmail, Notion tasks, and Slack -- then merging everything into a single, scannable Notion page. Instead of checking four apps every morning, you get one consolidated view of your day: meetings with prep notes, priority emails, tasks due today, and overnight Slack activity.

By default, `/founder-os:briefing:briefing` runs in single-agent mode and builds a lighter briefing from whichever sources are available. When you add `--team`, five agents activate: four gatherers fetch data in parallel (cutting wall-clock time significantly), and a lead agent synthesizes everything into a polished 5-section briefing page in Notion. The lead agent also records briefing metadata in the "[FOS] Briefings" database for tracking over time.

The parallel gathering pattern means one slow source does not block the others. If Slack times out but Calendar and Gmail succeed, the briefing still ships -- minus the Slack section. A minimum of 2 out of 3 required sources (Calendar, Gmail, Notion) must succeed. Slack is always optional.

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| calendar-agent | Gatherer | Fetches today's calendar events via `gws` CLI, classifies each meeting type, scores importance (1-5) using weighted factors, generates prep notes with attendee context from Gmail and Notion cross-references |
| gmail-agent | Gatherer | Scans unread emails within the lookback window (default 12 hours), applies the Eisenhower priority matrix, classifies into quadrants (Q1-Q4), extracts top 10 highlights with action-needed flags |
| notion-agent | Gatherer | Discovers task databases in Notion dynamically, pulls tasks due today and overdue items, normalizes priority schemes to P0-P4, groups by project |
| slack-agent | Gatherer (optional) | Fetches overnight Slack mentions, DMs, and high-activity channel threads, ranks by tier (mentions > DMs > highlights), caps at 20 items |
| briefing-lead | Lead | Validates minimum data threshold, assembles 5-section briefing (Schedule, Priority Emails, Tasks, Slack Highlights, Quick Stats), creates/updates Notion page, records tracking entry in "[FOS] Briefings" with Type="Daily Briefing" |

## Data Flow

```
[Calendar Agent] ──┐
[Gmail Agent]   ───┤
[Notion Agent]  ───┼──→ [Briefing Lead: synthesize → Notion page + tracking entry]
[Slack Agent]   ───┘
```

All four gatherers run simultaneously. Each returns a structured JSON payload with a `status` field ("complete", "unavailable", or "error"). The briefing-lead collects all results, checks the minimum threshold, and assembles the briefing. Failed optional sources are omitted silently; failed required sources produce a warning in the relevant section.

## When to Use --team

The `--team` flag is ideal for your daily morning routine, when you want the richest possible picture of your day ahead. Specific scenarios:

- **Start-of-day ritual.** Run it first thing to get a consolidated view of meetings, emails, tasks, and Slack activity before you open any of those apps individually.
- **After a long weekend.** Use `--hours=48` to widen the email and Slack lookback windows and catch up on everything you missed.
- **Before a busy day with back-to-back meetings.** The calendar agent's importance scoring and prep notes help you prioritize which meetings need real preparation versus which are routine syncs.

Single-agent mode is fine when you just want a quick schedule overview or when only one or two sources are configured.

## Example

```
/founder-os:briefing:briefing --team
```

Here is what happens step by step:

1. **Four gatherers launch in parallel.** Calendar agent fetches 6 meetings for today via `gws calendar`. Gmail agent scans 23 unread emails from the last 12 hours. Notion agent discovers 2 task databases and finds 8 tasks due today (2 overdue). Slack agent pulls 5 mentions and 2 DMs from overnight.
2. **Briefing lead receives all results** (all 4 returned `status: "complete"`). It validates the minimum threshold (met: 3 of 3 required sources plus optional Slack).
3. **Schedule Overview** lists 6 meetings in chronological order with prep notes in toggle blocks. Two meetings score 4+ importance and are flagged as priority.
4. **Priority Emails** shows the top 10 emails ranked by quadrant. Q1 (urgent + important) emails appear first, with callout blocks for items requiring a response.
5. **Tasks Due Today** groups 8 tasks across 2 projects, with 2 overdue items highlighted in callout blocks.
6. **Slack Highlights** surfaces 3 direct mentions requiring response, 2 DMs, and 1 high-activity channel thread.
7. **Quick Stats** summarizes: 6 meetings, 4 priority emails, 8 tasks (2 overdue), 5 Slack mentions, all 4 sources used.
8. The briefing is published as a Notion page titled "Daily Briefing -- 2026-03-19" and a tracking entry is written to "[FOS] Briefings" with Type="Daily Briefing".

Running the command again on the same day updates the existing page and tracking entry rather than creating duplicates.

## Related

- [Briefing Commands](../commands/briefing.md) -- command reference for briefing and review
