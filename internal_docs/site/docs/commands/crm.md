# CRM Sync

> Sync emails and meetings to your Notion CRM, and pull client context on demand.

## Overview

CRM Sync bridges the gap between where client interactions happen (your inbox and calendar) and where they need to live (your CRM). Most founders know they should log client activities -- but the manual effort of copying meeting details, writing summaries, and linking records means it rarely gets done consistently. This namespace automates the entire process.

Three commands cover the CRM workflow. Sync-email scans your sent folder and logs email conversations to the Notion Communications database with AI-generated summaries, sentiment classification, and automatic client matching. Sync-meeting does the same for calendar events -- pulling attendees, generating summaries from event details, and linking to the right CRM records. Context provides a fast, read-only CRM view of any client: their profile, contacts, recent activities, open deals, and health indicators.

Every sync operation uses a 5-step progressive matching algorithm to link activities to the right client. It starts with exact email matches against your CRM contacts, falls through domain matching, and ends with fuzzy name matching -- each step producing a confidence score so you know how reliable the match is. All writes are idempotent: re-running a sync updates existing records rather than creating duplicates.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | CRM databases (Companies, Contacts, Deals, Communications) |
| gws CLI (Gmail) | For `sync-email` | Email thread retrieval and sent folder scanning |
| gws CLI (Calendar) | For `sync-meeting` | Calendar event retrieval and batch scanning |
| Business Context | No | Personalizes matching with your company context |

## Commands

### `/founder-os:crm:context`

**What it does** -- Load a lightweight, CRM-focused view of a client's data. Pulls the company profile, key contacts, recent activities, open deals, and quick health indicators -- all from your Notion CRM databases. This is a read-only command; it never writes to the CRM.

**Usage:**
```
/founder-os:crm:context [client] [--days=N] [--full]
```

**Example scenario:**
> Before a call, you want a quick snapshot of your relationship with Acme Corp. You run `/founder-os:crm:context "Acme Corp"` and get their company profile, a table of key contacts with roles and last-contact dates, the 5 most recent activities with sentiment indicators, 2 open deals worth a combined $85,000, and health indicators showing "Good" contact recency (3 days) and "Active" engagement (8 activities in the last month).

**What you get back:**
- **Company profile** -- industry, size, status, website
- **Key Contacts table** -- name, role, type (Decision Maker, Champion, etc.), email, last contact date
- **Recent Activity table** -- date, type, summary, and sentiment for each interaction
- **Open Deals table** -- deal name, value, stage, close date, probability
- **Health Indicators** -- contact recency (Good/Warning/Alert), engagement level (Active/Moderate/Low), pipeline value, and sentiment trend

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--days=N` | `30` | Activity lookback period in days |
| `--full` | Off | Show full activity summaries instead of titles only |

---

### `/founder-os:crm:sync-meeting`

**What it does** -- Sync calendar meetings to the CRM Communications database. Supports single-event sync by event ID or batch mode that scans your recent calendar. Each meeting gets an AI-generated summary, sentiment classification, and automatic client matching based on attendee emails.

**Usage:**
```
/founder-os:crm:sync-meeting [event_id] [--since=7d] [--client=NAME] [--dry-run] [--upcoming]
```

**Example scenario:**
> It is Friday afternoon and you want to log all client meetings from the past week. You run `/founder-os:crm:sync-meeting --since=7d` and the batch processor finds 8 external meetings, matches 6 to existing CRM clients (skipping 2 internal-only meetings and 1 canceled event), generates summaries for each, and writes them to the Communications database. The report shows: 5 synced (new), 1 updated (existing), and 2 unmatched participants for your review.

**What you get back:**
- **Single mode**: meeting details, matched client (with confidence tier), AI summary, sentiment, and Notion record link
- **Batch mode**: a status report table showing synced (new), updated (existing), skipped (already synced), unmatched (needs review), and failed counts -- plus a list of unmatched attendees for manual assignment
- **Dry run**: full preview of what would be synced, without writing anything

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `[event_id]` | -- | Google Calendar event ID for single-event sync |
| `--since=Nd` | `7d` | Batch mode lookback window (e.g., `7d`, `2w`, `1m`, or ISO date) |
| `--client=NAME` | -- | Skip matching; assign directly to the named client |
| `--dry-run` | Off | Preview sync results without writing to Notion |
| `--upcoming` | Off | Include future meetings (logged as "Meeting Scheduled") |

---

### `/founder-os:crm:sync-email`

**What it does** -- Sync email conversations from Gmail to the CRM Communications database. Supports single-thread sync by thread ID or batch mode that scans your sent folder. Each email gets an AI-generated summary, sentiment classification, and automatic client matching based on participant email addresses.

**Usage:**
```
/founder-os:crm:sync-email [thread_id] [--since=7d] [--client=NAME] [--dry-run]
```

**Example scenario:**
> You want to make sure all your recent client correspondence is captured in the CRM. You run `/founder-os:crm:sync-email --since=14d` and the batch processor scans 14 days of sent emails, filters out internal messages and automated notifications, and logs 12 client-related threads to the Communications database. Each gets a 2-3 sentence AI summary and sentiment tag. Three threads are flagged as unmatched -- you review the participant list and assign them to the correct clients.

**What you get back:**
- **Single mode**: email thread details, matched client (with confidence tier), AI summary, sentiment, and Notion record link
- **Batch mode**: a status report table showing synced (new), updated (existing), skipped (already synced), unmatched (needs review), and failed counts -- plus unmatched participant list with emails and domains
- **Dry run**: full preview of what would be synced, without writing anything

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `[thread_id]` | -- | Gmail thread ID for single-thread sync |
| `--since=Nd` | `7d` | Batch mode lookback window (e.g., `7d`, `2w`, `1m`, or ISO date) |
| `--client=NAME` | -- | Skip matching; assign directly to the named client |
| `--dry-run` | Off | Preview sync results without writing to Notion |
| `--schedule=EXPR` | -- | Schedule recurring syncs (e.g., weekdays at 9 AM and 2 PM) |

---

## Tips & Patterns

- **Start with dry run.** On your first sync, use `--dry-run` to preview what will be logged before committing. This lets you verify client matching accuracy and tune your CRM contacts.
- **Sync weekly, not daily.** A weekly `--since=7d` batch catches everything with minimal overhead. Use `--since=14d` after vacation.
- **Use `--client` when you know the answer.** If you are syncing a specific thread and know exactly which client it belongs to, skip the matching algorithm with `--client="Acme Corp"`.
- **Review unmatched items promptly.** Unmatched participants often indicate new contacts that should be added to your CRM. Adding them improves future matching accuracy.
- **Pair with client context.** After syncing, run `/founder-os:crm:context` to see how the new activities affect health indicators and engagement trends.
- **Schedule email sync for consistency.** Set up `/founder-os:crm:sync-email --schedule="0 9,14 * * 1-5"` to sync twice daily on weekdays and keep your CRM current without thinking about it.
- **Context for quick lookups.** Use `/founder-os:crm:context` when you just need CRM data. Use `/founder-os:client:load` when you need the full multi-source dossier.

## Related Namespaces

- **[Client](/commands/client)** -- Client Context reads from the same CRM databases that CRM Sync populates; load after sync for the freshest dossier
- **[Notion](/commands/notion)** -- Query and update the CRM databases directly when you need ad-hoc changes
- **[Drive](/commands/drive)** -- Client documents in Drive complement the communication history in CRM
- **[Slack](/commands/slack)** -- Team decisions about clients from Slack can inform your CRM activity context
