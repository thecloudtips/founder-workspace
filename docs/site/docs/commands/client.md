# Client Context

> Load a complete client dossier from CRM, email, calendar, documents, and notes in one command.

## Overview

Client Context is your preparation shortcut. Before any client call, meeting, or portfolio review, you need to know the relationship history, open items, sentiment, and upcoming commitments -- but that information lives scattered across your CRM, inbox, calendar, Drive, and meeting notes. This namespace pulls it all together into a single, structured dossier.

Two commands cover the full spectrum of client preparation. Load assembles a comprehensive dossier by searching across every connected data source, scoring completeness, and caching the result for reuse. Brief generates a concise, printable 1-page executive summary from cached dossier data, optimized for scanning in the 5 minutes before a call.

The load command offers two modes. The default single-agent mode runs a fast CRM-plus-email lookup suitable for most situations. The `--team` mode activates a 6-agent parallel pipeline -- five gatherer agents (CRM, Email, Docs, Calendar, Notes) pull data simultaneously, and a lead agent merges everything into the unified dossier with health scoring and CRM enrichments. Either way, results are cached on the Notion Companies page so subsequent loads are near-instant.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | CRM data (Companies, Contacts, Deals, Communications databases) |
| gws CLI (Gmail) | Yes | Email communication history and response patterns |
| gws CLI (Calendar) | No | Meeting history and upcoming commitments (used in `--team` mode) |
| gws CLI (Drive) | No | Shared documents and collaboration artifacts (used in `--team` mode) |
| Business Context | No | Personalizes output with your company terminology |

## Commands

### `/founder-os:client:load`

**What it does** -- Load comprehensive client data from all connected sources into a unified dossier. Searches CRM, email, calendar, documents, and notes; assembles a structured profile with relationship history, open items, sentiment, and key documents; caches the result to Notion for fast reuse.

**Usage:**
```
/founder-os:client:load [name] [--team] [--refresh] [--hours=N]
```

**Example scenario:**
> You have a quarterly business review with Acme Corp tomorrow. You run `/founder-os:client:load "Acme Corp" --team` and the 6-agent pipeline fires: the CRM agent pulls their company profile and deal status, the email agent scans the last 6 months of correspondence, the calendar agent finds 12 meetings in that period, the docs agent locates 3 shared proposals in Drive, and the notes agent pulls internal decision records. The context lead merges everything into a dossier with a health score of 78/100 and flags one risk: response times have increased from 4 hours to 18 hours over the last month.

**What you get back:**
- **Profile** -- company details, primary contact, active deals, relationship tenure
- **Relationship History** -- total interactions by type, engagement trend, average response time
- **Recent Activity** -- last 5 interactions across all sources with dates and summaries
- **Open Items** -- outstanding action items with age and source
- **Upcoming** -- scheduled meetings and approaching milestones
- **Sentiment & Risk** -- sentiment direction, engagement level, risk flags
- **Key Documents** -- most relevant shared documents with categories and dates
- **Health Score** -- composite score (0-100) based on contact recency, response patterns, task completion, payment history, and sentiment
- **Completeness Score** -- indicates how much data was available across all sources

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--team` | Off | Activate the full 6-agent parallel-gathering pipeline |
| `--refresh` | Off | Bypass the 24-hour cache and force fresh data gathering |
| `--hours=N` | `4320` (180 days) | Lookback window in hours for email and calendar searches |

---

### `/founder-os:client:brief`

**What it does** -- Generate a concise 1-page executive brief for a client, designed for quick pre-meeting scanning or portfolio review. Draws from cached dossier data and includes health score, recent activity, open items, sentiment, and risk flags -- all under 500 words.

**Usage:**
```
/founder-os:client:brief [name]
```

**Example scenario:**
> You have 5 minutes before a client call with Acme Corp. You run `/founder-os:client:brief "Acme Corp"` and get a scannable brief showing: health score 78/100 (Good), primary contact Sarah Chen (VP Operations), 2 open action items, 1 risk flag (declining response time), and the next scheduled meeting is Thursday at 2 PM. You walk into the call fully prepared.

**What you get back:**
- **Profile** -- company name, industry, size, status, primary contact, relationship owner, active deals
- **Recent Activity** -- last 5 interactions with relative dates and type labels
- **Open Items** -- outstanding action items with source attribution
- **Upcoming** -- next meetings and deadlines
- **Sentiment & Risk** -- current sentiment, engagement level, and flagged risks with severity
- **Key Documents** -- top 3 most relevant documents
- Staleness warning if the underlying dossier data is older than 24 hours

**Flags:**

No flags. The brief command always operates in single-agent mode for speed. If the cached dossier is stale or missing, it will suggest running `/founder-os:client:load` first.

---

## The Agent Team

When you use `--team` mode on the load command, Founder OS deploys a 6-agent parallel pipeline:

| Agent | Source | What It Gathers |
|-------|--------|-----------------|
| CRM Agent | Notion CRM | Company profile, contacts, deals, communications records |
| Email Agent | Gmail | Email threads, response patterns, tone analysis |
| Docs Agent | Google Drive | Shared proposals, contracts, collaboration documents |
| Calendar Agent | Google Calendar | Meeting history, frequency, upcoming commitments |
| Notes Agent | Notion Pages | Internal meeting notes, decisions, action items |
| Context Lead | All of the above | Merges data, calculates health score, writes enrichments back to CRM |

The five gatherer agents run simultaneously. Once all complete (or timeout after 30 seconds each), the Context Lead synthesizes everything into the unified dossier. If any gatherer fails, the pipeline continues with partial results -- the completeness score reflects which sources contributed.

## Tips & Patterns

- **Load once, brief many times.** Run `/founder-os:client:load` at the start of your week for each active client. Then use `/founder-os:client:brief` before individual calls -- it pulls from cache instantly.
- **Use `--team` for important meetings.** The 6-agent pipeline takes a bit longer but provides Drive documents and calendar patterns that the default mode skips.
- **Watch the health score.** A score below 50 means something needs attention -- check the risk flags section for specifics.
- **Refresh before critical conversations.** If a lot has happened since the last dossier was generated, use `--refresh` to ensure you have the latest data.
- **Let completeness guide your setup.** A low completeness score often means a data source is not connected. The dossier will tell you which sources contributed and which were unavailable.

## Related Namespaces

- **[CRM](/commands/crm)** -- The CRM namespace syncs emails and meetings into the same Notion databases that Client Context reads from
- **[Notion](/commands/notion)** -- Query and update the CRM databases that power client dossiers
- **[Drive](/commands/drive)** -- The Docs Agent uses Drive Brain skills to find client-related documents
- **[Slack](/commands/slack)** -- Client-related Slack mentions can surface in your broader context
