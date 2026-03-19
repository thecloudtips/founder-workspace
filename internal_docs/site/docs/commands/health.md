# Client Health Dashboard

> Score every client relationship on a 0-100 scale using five weighted metrics, flag at-risk accounts, and surface the clients who need your attention right now.

## Overview

The Client Health Dashboard connects to your Notion CRM, Gmail, Google Calendar, and invoice records to compute a composite health score for each active client. Five metrics -- Last Contact, Response Time, Open Tasks, Payment Status, and Sentiment -- are weighted and combined into a single 0-100 score, then classified into a RAG tier: Green (healthy), Yellow (needs attention), or Red (at risk).

The dashboard is designed to answer one question every founder asks: "Which clients need my attention today?" Results are sorted worst-first so the most urgent relationships appear at the top. Risk flags like "No contact in 30+ days" or "3 overdue invoices" surface the specific reason a score is low, and recommended actions tell you what to do about it.

Health scores are cached directly on Company pages in your Notion CRM with a 24-hour TTL. Subsequent scans reuse cached scores unless you force a refresh, making daily health checks fast. The system degrades gracefully when data sources are unavailable -- Gmail offline means contact metrics use neutral defaults, but the scan still completes with what it has.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | CRM database discovery, client list retrieval, health score caching |
| gws CLI (Gmail) | No | Email history for Last Contact, Response Time, and Sentiment metrics |
| gws CLI (Calendar) | No | Meeting history to supplement contact and sentiment analysis |
| Finance DB (Notion) | No | Invoice payment history for Payment Status metric |

## Commands

### `/founder-os:health:scan`

**What it does** -- Scans all active clients in your Notion CRM and computes a 5-metric health score for each one. Classifies every client into a Red, Yellow, or Green tier, detects risk flags, and presents an at-risk-first dashboard. Scores are cached on Company pages in Notion for fast lookups.

**Usage:**

```
/founder-os:health:scan [--client=NAME] [--status=red|yellow|green] [--limit=N] [--refresh] [--schedule="expression"]
```

**Example scenario:**

> It is Monday morning and you want to know which clients need immediate outreach. Run `/founder-os:health:scan --status=red --limit=5` to see your five most at-risk relationships. One client has a score of 28 with the flag "No contact in 30+ days" -- you know exactly where to start your week.

**What you get back:**

A dashboard with three sections -- At-Risk Clients (Red), Needs Attention (Yellow), and Healthy (Green) -- each showing the client name, composite score, health status, active risk flags, and the top issue for at-risk clients. A source availability summary shows which data sources contributed to the scan.

**Flags:**

- `--client=NAME` -- Scan only this client (fuzzy match against CRM)
- `--status=red|yellow|green` -- Filter dashboard to show only one RAG tier
- `--limit=N` -- Show only the top N at-risk clients (sorted by score ascending)
- `--refresh` -- Bypass the 24-hour cache and recompute all scores from fresh data
- `--schedule "expression"` -- Set up recurring scans (e.g., `"30 9 * * 1-5"` for weekdays at 9:30am)

---

### `/founder-os:health:report`

**What it does** -- Generates a deep-dive health report for a single client, showing the overall score, per-metric breakdowns with scoring details, active risk flags, recommended actions, and a recent activity timeline of emails and meetings. This is the command to run when you need to understand exactly why a client's health score is what it is.

**Usage:**

```
/founder-os:health:report [client_name]
```

**Example scenario:**

> Your health scan flagged Acme Corp as Red with a score of 34. Run `/founder-os:health:report "Acme Corp"` and you see that Payment Status is at 20 (two overdue invoices), Sentiment is at 15 (frustration language detected in recent emails), and the last five emails show a pattern of increasingly formal tone. The recommended actions are clear: follow up on the overdue invoices and schedule a relationship check-in call.

**What you get back:**

A detailed report with the overall score and RAG classification, a metric breakdown table showing each of the five metrics with their score, weight, and supporting details (e.g., "Last contact: 12 days ago via email"), active risk flags with trigger conditions, prioritized recommended actions, and a recent activity timeline showing the last five emails and three meetings with this client.

**Flags:**

- If no client name is provided, you see a list of your first 10 active clients and are prompted to choose.

---

## The Five Health Metrics

| Metric | Weight | What It Measures | Data Sources |
|--------|--------|------------------|--------------|
| Last Contact | 0.25 | Days since last email or meeting with the client | Gmail, Google Calendar |
| Response Time | 0.20 | Average hours to reply to the client's emails | Gmail |
| Open Tasks | 0.20 | Ratio of overdue tasks to total active tasks | Notion CRM, Client Dossiers |
| Payment Status | 0.20 | Invoice payment reliability and overdue count | Notion Finance DB |
| Sentiment | 0.15 | Tone analysis of email and meeting communication | Gmail, Google Calendar |

Scores use exponential decay curves (Last Contact, Response Time) and ratio-based formulas (Open Tasks, Payment Status) to produce values from 0-100. The composite score is the weighted sum, classified as Green (80-100), Yellow (50-79), or Red (0-49).

## Risk Flags

The system evaluates eight risk conditions after scoring:

| Flag | Trigger |
|------|---------|
| No Recent Contact | Last Contact score below 20 (~30+ days since contact) |
| Slow Response | Response Time score below 30 (~40+ hour average reply time) |
| Overdue Tasks | Open Tasks score below 50 (more than half of tasks overdue) |
| Payment Issues | Payment score below 40 (2+ overdue invoices) |
| Negative Sentiment | Sentiment score below 40 |
| Meeting Cancellations | 2+ cancelled meetings in the last 30 days |
| Escalation Language | Detected phrases like "disappointed" or "considering alternatives" in recent emails |
| New Client | Client in CRM for less than 30 days (informational, not punitive) |

## Tips & Patterns

- **Schedule a daily scan** with `--schedule "30 9 * * 1-5"` to get a health dashboard every weekday morning before your first call.
- **Pair with the Client Context loader** (`/founder-os:client:load`) to get a full dossier on any flagged client before reaching out.
- **Use `--refresh` sparingly** -- the 24-hour cache exists to keep scans fast. Force a refresh only when you know data has changed significantly since the last scan.
- **New clients get a floor score of 40** on the Last Contact metric, preventing them from appearing as "At Risk" before you have had a chance to establish communication patterns.
- When Gmail or Calendar are unavailable, scores use neutral defaults (50) rather than failing. The output clearly notes which sources contributed.

## Related Namespaces

- **[Report](/docs/commands/report)** -- Health scan results can feed into broader business reports for quarterly client portfolio reviews.
- **[Invoice](/docs/commands/invoice)** -- The Payment Status metric reads from the same Finance database that the Invoice Processor writes to. Processing invoices keeps health scores accurate.
- **[Proposal](/docs/commands/proposal)** and **[Contract](/docs/commands/contract)** -- When a client's health score drops, reviewing the original proposal scope and contract terms helps contextualize the relationship.
