# Client Context Agent Team

> Parallel gathering: Collect client data from all sources simultaneously, merge into a unified dossier with health scoring

## Overview

The Client Context agent team builds a comprehensive dossier for any client by pulling data from five sources in parallel -- Notion CRM, Gmail, Google Drive, Google Calendar, and Notion meeting notes -- then merging everything into a unified seven-section profile with relationship health scoring. Instead of manually checking CRM records, searching email, and reviewing meeting notes before a client interaction, you get a single document that tells you everything you need to know about the relationship.

By default, `/founder-os:client:load` and `/founder-os:client:brief` run in single-agent mode for a quick context pull. When you add `--team`, six agents activate: five gatherers fetch data from every connected source simultaneously, and a lead agent synthesizes the results into a structured dossier with completeness scoring, sentiment analysis, and a composite health score (0-100). The dossier is cached on the Companies page in Notion with a 24-hour TTL, so subsequent requests return instantly if fresh data already exists.

This team has the most generous minimum threshold of any pipeline -- only 1 of the 5 gatherers needs to succeed. Even with just CRM data or just email history, the context-lead produces a useful (if incomplete) dossier and clearly reports what data is missing.

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| crm-agent | Gatherer | Searches Notion CRM Companies database using fuzzy name matching, follows relations to retrieve linked Contacts (with roles and types), active Deals (stage, value, close date), and Communications (last 180 days), calculates relationship tenure and interaction counts by type |
| email-agent | Gatherer | Searches Gmail for threads involving the client's contacts and domain via `gws` CLI, extracts thread summaries and statuses, calculates communication statistics (frequency, response times, thread lengths), assesses sentiment trend from recent messages, identifies open threads awaiting reply |
| calendar-agent | Gatherer | Retrieves past meetings (180-day lookback) and upcoming meetings (30-day lookahead) with client attendees via `gws` CLI, calculates meeting frequency and engagement trend (increasing, stable, or declining), identifies recurrence patterns |
| docs-agent | Gatherer | Searches Google Drive for documents containing the client name via `gws` CLI, categorizes each by type (Proposal, Contract, Presentation, Report, Spreadsheet), flags recently active documents (modified in last 30 days) |
| notes-agent | Gatherer | Searches Notion pages and the CRM Communications database for meeting notes mentioning the client, extracts key decisions and open items using pattern detection, compiles a deduplicated master open items list with source tracking |
| context-lead | Lead | Checks Notion cache for a fresh dossier (within 24h TTL), synthesizes gatherer outputs into a 7-section dossier (Profile, Relationship History, Recent Activity, Open Items, Upcoming, Sentiment and Health, Key Documents), scores completeness, calculates composite health score (0-100), caches the dossier on the Companies page, writes enrichment data (health score, risk level, sentiment) back to CRM databases |

## Data Flow

```
[CRM Agent]      ──┐
[Email Agent]    ───┤
[Calendar Agent] ───┼──→ [Context Lead: synthesize → dossier + cache + CRM enrichment]
[Docs Agent]     ───┤
[Notes Agent]    ───┘
```

All five gatherers run simultaneously. Each returns structured data with a status indicator. The context-lead first checks the Notion cache -- if a dossier exists for this client that is less than 24 hours old, it returns the cached version immediately. Otherwise, it merges all gatherer outputs following a data source hierarchy (CRM > Email > Calendar > Docs > Notes) for conflict resolution, deduplicates open items across sources, and calculates the composite health score using weighted sentiment (email 40%, meeting 35%, deal 25%).

## When to Use --team

The full pipeline produces the richest client intelligence and is worth running before any significant client interaction. Key scenarios:

- **Before a client call or meeting.** Run `/founder-os:client:load "Acme Corp" --team` to get a complete picture: deal status, recent communications, open items, sentiment trend, and relevant documents. Review the dossier and walk into the meeting fully informed.
- **Quarterly business reviews.** When preparing for a QBR, the dossier gives you relationship history, engagement trends, and health metrics that feed directly into your review deck.
- **When a client goes quiet.** If engagement is declining, the health score and risk flags surface the problem before it becomes a churn event. The team calculates engagement trend from meeting frequency and flags "Cooling" or "Dormant" relationship statuses.
- **Onboarding a new team member.** When someone on your team needs to get up to speed on a client, the dossier provides a complete relationship snapshot they can read in minutes.

Single-agent mode is fine for a quick CRM lookup or when you just need the client's basic profile and deal status.

## Example

```
/founder-os:client:load "Acme Corp" --team
```

Here is what happens step by step:

1. **Context-lead checks the cache.** It finds the "[FOS] Companies" page for Acme Corp in Notion but the dossier was generated 36 hours ago -- stale. It marks `Dossier Stale = true` and proceeds with fresh synthesis.
2. **Five gatherers launch in parallel.** CRM agent searches Notion for the "Acme Corp" company record. Email agent searches Gmail for threads with `@acmecorp.com`. Calendar agent pulls meetings with Acme attendees over the last 180 days and next 30 days. Docs agent searches Drive for "Acme Corp" documents. Notes agent searches Notion for meeting notes mentioning Acme.
3. **CRM agent** finds the company record (Active status, SaaS industry), 3 contacts (including a Decision Maker), 1 active deal in Proposal stage worth $75K, and 24 communication entries over the last 180 days. Relationship tenure: 365 days.
4. **Email agent** finds 23 threads with 87 total messages. Average response time: 4.2 hours from client, 2.1 hours from you. Sentiment trend: positive (7 positive signals, 1 negative). 3 open threads awaiting reply.
5. **Calendar agent** finds 8 past meetings and 2 upcoming. Meeting frequency averages 22 days apart. Engagement trend: stable.
6. **Docs agent** finds 12 documents including 3 proposals, 2 contracts, and 4 reports. 3 documents were modified in the last 30 days.
7. **Notes agent** finds 5 meeting notes with 2 key decisions and 3 open items.
8. **Context-lead synthesizes** the dossier with a completeness score of 0.92 (all sources returned data) and a health score of 82/100 (Excellent). It updates the Companies page with the fresh dossier, sets `Dossier Stale = false`, and writes the health score. The active deal's risk level is set to "Low" (not stalled, engagement stable). The most recent Communication entry gets an "[Auto] Positive" sentiment tag.

The output includes the full 7-section dossier plus metadata showing which sources contributed and the completeness breakdown by component.

## Related

- [Client Commands](../commands/client.md) -- command reference for load and brief
