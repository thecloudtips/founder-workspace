# Prep

> Deep meeting preparation with attendee profiles, open items, and framework-based talking points.

## Overview

The Prep namespace generates comprehensive meeting preparation documents by pulling data from Google Calendar, Gmail, Notion CRM and notes, and optionally Google Drive. For each meeting, it builds detailed attendee profiles (role, company, relationship status, pending items), compiles open action items across sources, surfaces relevant documents, and generates framework-based talking points tailored to the meeting type. The result is a Notion page you can review in the five minutes before any meeting.

In default mode, a single agent works through each data source sequentially. In team mode (`--team`), four gatherer agents -- Calendar, Gmail, Notion, and Drive -- fetch data in parallel, and a Prep Lead agent synthesizes everything including a tailored discussion guide. Prep documents are saved to the **[FOS] Meetings** database, and if a record already exists for that calendar event (for example, created by the Meeting Intelligence namespace), Prep updates only its own fields without overwriting analysis data.

The namespace includes two commands: `prep` for a single meeting and `today` for batch-preparing all of today's qualifying meetings in one run. The batch command builds a shared attendee cache to avoid redundant lookups when the same person appears in multiple meetings.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | CRM contact lookup, past meeting notes, task storage in [FOS] Meetings |
| gws CLI (Calendar) | Yes | Fetch calendar event details and attendee lists |
| gws CLI (Gmail) | Optional | Search email threads with attendees for context and open items |
| gws CLI (Drive) | Optional | Search for documents relevant to the meeting topic |

## Commands

### `/founder-os:prep:prep`

**What it does** -- Generates a comprehensive meeting preparation document for a specific calendar event. Fetches the event details, builds attendee profiles by cross-referencing Gmail threads, Notion CRM records, and past meeting notes, compiles open action items (what you owe, what's owed to you), searches Drive for relevant documents, and generates a discussion guide with framework-based talking points. If no event ID is provided, it shows a numbered list of today's remaining meetings for you to pick from.

**Usage:**
```
/founder-os:prep:prep
/founder-os:prep:prep abc123def
/founder-os:prep:prep --team
/founder-os:prep:prep abc123def --team
/founder-os:prep:prep abc123def --hours=720
/founder-os:prep:prep abc123def --output=notion
/founder-os:prep:prep abc123def --output=chat
/founder-os:prep:prep --team --output=both
```

**Example scenario:**
> You have a board meeting at 2pm with three external directors. You run `/founder-os:prep:prep --team` and select the board meeting from the list. The Calendar Agent pulls the event details, the Gmail Agent finds 14 email threads with attendees over the past 90 days (including 2 unanswered emails to a director), the Notion Agent retrieves CRM profiles and 3 open action items from the last board meeting, and the Drive Agent surfaces the Q4 financial deck. The Prep Lead assembles attendee profiles with relationship status indicators, flags the unanswered emails under "You owe," selects the Strategic Review framework for talking points, and publishes the prep document to Notion. You walk into the meeting knowing exactly what to discuss and what to avoid.

**What you get back:**

A full prep document with: meeting metadata (time, type, importance score), attendee table (name, role, relationship status, last contact, pending items), agenda (explicit + inferred items), open items grouped by ownership, recent interaction context, relevant documents from Drive, and a discussion guide with framework-based talking points, a suggested opener, proposed next steps, and a meeting close line. If applicable, includes a "Do NOT Mention" list for sensitive topics.

**Flags:**
- `--team` -- Activate the full 5-agent parallel pipeline (Calendar, Gmail, Notion, Drive gatherers + Prep Lead)
- `--hours=N` -- Email lookback window in hours for attendee correspondence (default: 2160, which is 90 days)
- `--output=VALUE` -- Where to deliver the prep document: `notion`, `chat`, or `both` (default: `both`)

---

### `/founder-os:prep:today`

**What it does** -- Generates meeting prep documents for every qualifying calendar meeting today, in chronological order. Fetches all events, filters out focus blocks, cancelled events, and solo events (no other attendees), then runs the full prep logic for each meeting. Builds a shared attendee cache so that when the same person appears in multiple meetings, their profile is looked up only once. Handles back-to-back meeting deduplication so open items and talking points are assigned to the most appropriate meeting context.

**Usage:**
```
/founder-os:prep:today
/founder-os:prep:today --yes
/founder-os:prep:today --team
/founder-os:prep:today --skip-internal
/founder-os:prep:today --team --skip-internal
/founder-os:prep:today --hours=720 --yes
/founder-os:prep:today --team --skip-internal --hours=2160 --yes
```

**Example scenario:**
> You have 6 meetings today: a team standup, two client calls, a board check-in, a 1:1 with your co-founder, and a focus block. You run `/founder-os:prep:today --team --skip-internal --yes`. It filters out the standup and focus block (4 meetings remain), builds an attendee cache for 12 unique attendees, and runs the full parallel pipeline for each meeting. Two of the client calls share an attendee -- the cache avoids duplicate lookups, and back-to-back deduplication ensures open items appear in the right meeting's prep. You get a summary table with links to 4 Notion prep pages.

**What you get back:**

A confirmation table showing qualifying meetings before processing (unless `--yes` is passed), then per-meeting progress with inline summaries (meeting type, importance score, attendee count, talking point count, Notion link). At the end, a final summary table with all results, skipped events with reasons, any errors encountered, and total prep time. In team mode, an additional pipeline execution table shows per-agent timing for each meeting.

**Flags:**
- `--team` -- Activate the full parallel pipeline for each meeting
- `--hours=N` -- Email lookback window in hours (default: 2160 / 90 days)
- `--skip-internal` -- Skip meetings classified as internal sync or group meeting (all attendees share your org domain)
- `--yes` -- Auto-proceed without showing the confirmation prompt

---

## Tips & Patterns

- **After your briefing**: Your daily briefing's schedule section shows all meetings with classifications. For any meeting marked as external or high-importance, run `/founder-os:prep:prep` for a deep dive.
- **Batch prep early**: Run `/founder-os:prep:today --team --skip-internal --yes` right after your morning briefing to prep all client-facing meetings in one shot.
- **Adjust lookback for new relationships**: For a first meeting with a new contact, the default 90-day lookback is fine. For a long-standing client, try `--hours=4320` (180 days) to capture more history.
- **Chat-only for quick preps**: Use `--output=chat` for informal meetings where you don't need a persistent Notion page.
- **Combine with actions**: After the meeting, paste your notes into `/founder-os:actions:extract` to capture follow-ups and link them back to the same [FOS] Meetings record.

## Related Namespaces

- [Briefing](./briefing.md) -- Your daily briefing includes a schedule overview with meeting classifications; prep goes deeper for individual meetings
- [Inbox](./inbox.md) -- Inbox triage surfaces urgent emails that may relate to upcoming meetings; prep searches email history with specific attendees
- [Actions](./actions.md) -- After meetings, extract action items from your notes and link them to the meeting record
- [Review](./review.md) -- Weekly review includes meeting counts and outcomes; prep documents feed into that retrospective
