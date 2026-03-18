# Follow-Up Tracker

> Never lose track of an unanswered email again -- scan your sent folder, detect promises, score urgency, and nudge the right people at the right time.

## Overview

The Follow-Up Tracker namespace turns your Gmail sent folder into an intelligent accountability system. It scans for emails awaiting replies, detects bidirectional promises (commitments you made and commitments others made to you), and assigns a 1-5 priority score based on how long the email has been waiting, relationship importance, and promise urgency.

When a follow-up is due, the tracker drafts a professional nudge email calibrated to the right tone -- gentle for a first touch, firm for a second, urgent for a third -- and creates it as a Gmail draft for your review. It never sends anything automatically. You can also set Google Calendar reminders for pending follow-ups so nothing slips through the cracks on a busy week.

The namespace connects to **Gmail** (for scanning sent mail and creating drafts), **Google Calendar** (for reminder events), and **Notion** (for persistent tracking in the **[FOS] Tasks** database with `Type = "Follow-Up"`). Gmail is required; Calendar and Notion are optional and the tracker degrades gracefully without them.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| gws CLI (Gmail) | Yes | Scan sent folder, read threads, create draft emails |
| gws CLI (Calendar) | No | Create follow-up reminder events |
| Notion CLI | No | Persist follow-up records in [FOS] Tasks database |

## Commands

### `/founder-os:followup:check`

**What it does** -- Scans your Gmail sent folder for emails that have not received a reply, detects promises in both directions, scores each follow-up by urgency, and presents a prioritized list. Optionally syncs results to the Notion [FOS] Tasks database for persistent tracking.

**Usage:**

```
/founder-os:followup:check [--days=N] [--priority=high|all] [--limit=N] [--schedule="expression"]
```

**Example scenario:**

> It is Monday morning and you want to know who owes you a response. You run `/founder-os:followup:check --days=14 --priority=high` and get back a table showing that your investor follow-up from 10 days ago is now Priority 4 (Urgent), while a vendor invoice request from last week is Priority 3 (Firm). Each row includes a suggested next action.

**What you get back:**

A prioritized table of pending follow-ups with subject, recipient, days waiting, priority score (1-5), promise type (Awaiting Response, Promise Made, or Promise Received), and a suggested action. Includes summary stats: total scanned, found, promises detected, and Notion sync counts. Threads that received a reply since the last scan are automatically marked as resolved.

**Flags:**

- `--days=N` -- Number of days to look back in the sent folder (default: 30)
- `--priority=high|all` -- Filter to high-priority items only (3-5) or show all (default: all)
- `--limit=N` -- Cap the number of results displayed (default: 20)
- `--schedule "expression"` -- Set up recurring scans (e.g., `"0 10 * * 1-5"` for weekday mornings)

---

### `/founder-os:followup:nudge`

**What it does** -- Drafts a professional follow-up email for a specific thread that has gone unanswered, then creates it as a Gmail draft for your review. The nudge is calibrated by escalation level (gentle, firm, or urgent) and relationship type (client, colleague, or vendor), with anti-pattern checks to avoid passive-aggressive phrasing.

**Usage:**

```
/founder-os:followup:nudge [thread_id_or_keyword] [--tone=gentle|firm|urgent]
```

**Example scenario:**

> You sent a proposal to a client 12 days ago with no response. You run `/founder-os:followup:nudge "project proposal"` and get back a Level 2 (Firm) nudge draft that references the specific deliverable, proposes a concrete next step, and sets a soft deadline -- all in a warm, client-appropriate tone. The draft appears in your Gmail ready to review and send.

**What you get back:**

A preview of the nudge email showing recipient, subject line, escalation level, and relationship type, followed by the full email body. A Gmail draft is created automatically (never sent). If Notion tracking is active, the nudge count is incremented on the follow-up record.

**Flags:**

- `--tone=gentle|firm|urgent` -- Override the auto-detected escalation level

---

### `/founder-os:followup:remind`

**What it does** -- Creates Google Calendar reminder events for pending follow-ups so you get a notification when it is time to act. Supports single-thread reminders or batch creation for all pending follow-ups from a recent check. Reminder timing is auto-calculated by priority, or you can set an explicit delay.

**Usage:**

```
/founder-os:followup:remind [thread_id_or_keyword] [--all] [--in=Nd]
```

**Example scenario:**

> After running a check, you have 6 pending follow-ups but only want to act on the top 3 today. You run `/founder-os:followup:remind --all` and Calendar events appear for each one -- high-priority items get reminders tomorrow morning, lower-priority items are spaced out across the week. Each event description includes the thread context and a tip to run the nudge command when the reminder fires.

**What you get back:**

For a single reminder: an event summary with the follow-up subject, reminder date and time, priority level, and recipient. For batch mode: a table of all created reminders with staggered times. Each Calendar event includes a 30-minute advance notification and thread context in the description.

**Flags:**

- `--all` -- Create reminders for all pending follow-ups with priority >= 2
- `--in=Nd` -- Set an explicit reminder delay in days (e.g., `--in=3d` for 3 days from today)

---

## Tips & Patterns

**Start with check, then act.** The typical workflow is: run `check` to see the landscape, then `nudge` or `remind` for specific items. The commands chain naturally -- if you run `nudge` without specifying a thread, it will use your most recent `check` results.

**Use scheduling for hands-free monitoring.** Run `/founder-os:followup:check --schedule "0 10 * * 1-5"` to get an automatic weekday scan at 10am. This ensures nothing ages past the firm follow-up window without your knowledge.

**Trust the escalation levels.** The auto-detected tone is based on proven nudge-writing patterns: gentle for 3-7 days with zero prior nudges, firm for 7-14 days or one prior nudge, urgent for 14+ days or two-plus prior nudges. Override with `--tone` only when the relationship context demands it.

**Promise detection catches what simple reply-checking misses.** The tracker does not just look for unreplied threads -- it also detects when someone told you they would do something ("I'll send the report by Friday") and when you promised something to someone else. These bidirectional promises appear as separate entries with their own priority scores.

**Notion tracking is optional but valuable.** When connected, the tracker maintains a persistent record of every follow-up, nudge count, and resolution status. This means your second scan updates existing records rather than creating duplicates, and resolved threads are automatically marked as Done.

## Related Namespaces

- **[Inbox Zero](/commands/inbox)** -- Triage incoming email; items categorized as "waiting on" feed into follow-up detection
- **[Meeting Intel](/commands/meeting)** -- Follow-up commitments extracted from meeting transcripts are formatted for compatibility with this tracker
- **[Action Items](/commands/actions)** -- Extract action items from documents and conversations for task tracking in Notion
