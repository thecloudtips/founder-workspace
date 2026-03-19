# Meeting Prep Agent Team

> Parallel gathering: Gather calendar event details, attendee email history, CRM context, and relevant documents simultaneously, then synthesize into a comprehensive meeting prep doc with talking points

## Overview

The Meeting Prep agent team builds a complete preparation dossier for any upcoming meeting. Five agents work together -- four gathering data in parallel from Calendar, Gmail, Notion CRM, and Google Drive -- and a lead agent that synthesizes everything into a structured prep document with attendee profiles, open items, and framework-based talking points. The result is a Notion page you can review in under 3 minutes before walking into any meeting.

By default, `/founder-os:prep:prep` runs in single-agent mode and produces a lighter meeting summary. When you add `--team`, the full parallel gathering pipeline activates: the calendar agent fetches event details and classifies the meeting type, the Gmail agent pulls email history with each attendee, the Notion agent retrieves CRM profiles and past meeting notes, and the Drive agent finds relevant documents. The prep-lead then merges all of this into a 7-section dossier with a framework-specific discussion guide.

The pipeline requires the calendar agent to succeed (it provides the event anchor), plus at least one of Gmail or Notion for enrichment context. The Drive agent is always optional. When sources are missing, the prep document adapts -- noting data gaps and adjusting recommendations to use context-gathering questions instead of data-driven talking points.

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| calendar-agent | Gatherer | Fetches the target calendar event (or lists today's remaining meetings in discovery mode), extracts attendee identities with RSVP status, classifies meeting type (external-client, one-on-one, ad-hoc, recurring, group, internal-sync), scores importance via 4 weighted factors, detects scheduling conflicts and recurring attendee changes |
| gmail-agent | Gatherer | Searches Gmail for email history with each attendee over the last 90 days, extracts per-attendee context: thread count, last interaction, unanswered emails, recent topics, and sentiment indicators (negative-signal keyword matches) |
| notion-agent | Gatherer | Searches Notion CRM for contact records (email > name > domain matching), retrieves company profiles with deal data, cross-references past meeting notes for action items and decisions, compiles open commitments categorized as you_owe/owed_to_you/shared, discovers the Meetings tracking database |
| drive-agent | Gatherer (optional) | Searches Google Drive for documents matching meeting title keywords, attendee company names, and deal names from the last 6 months, returns the top 3 most relevant documents with metadata and relevance notes |
| prep-lead | Lead | Validates minimum data threshold (calendar + 1 enrichment source), classifies meeting type, selects the appropriate talking-points framework (SPIN, GROW, SBI, Delta-Based, Context-Gathering, or Contribution Mapping), assembles the 7-section prep document, creates/updates Notion page, writes tracking entry to "[FOS] Meetings" |

## Data Flow

```
[Calendar Agent] ──┐
[Gmail Agent]   ───┤
[Notion Agent]  ───┼──→ [Prep Lead: classify + synthesize → Notion page + tracking entry]
[Drive Agent]   ───┘
```

The four gatherers run simultaneously. Calendar provides the event anchor and attendee list. Gmail and Notion provide enrichment context for each attendee. Drive contributes relevant documents. The prep-lead receives all results and assembles the dossier in 7 sections: Meeting Header, Attendees, Agenda, Related Documents, Open Items, Discussion Guide (talking points), and Prep Recommendations.

## When to Use --team

Use `--team` when you need thorough preparation for a meeting that matters. The full pipeline adds the most value in these scenarios:

- **Client meetings.** External-client meetings get SPIN-framework talking points, CRM deal context, and sentiment indicators from recent email exchanges. Walking in unprepared to a client meeting is a risk that the team eliminates.
- **First meetings with new contacts.** When the calendar shows attendees you have never met, the team surfaces whatever context exists -- CRM profiles, company background, relevant documents -- so you are not starting cold.
- **Recurring meetings with accumulated open items.** For weekly or biweekly syncs, the team compiles all outstanding action items, flags overdue commitments, and generates delta-based talking points focused on what has changed since last time.
- **High-importance meetings (score 4-5).** When the importance score is high (C-suite attendees, active deals in negotiation, external stakeholders), the extra enrichment from the full pipeline is worth the processing time.

Single-agent mode is sufficient for low-stakes internal syncs, daily standups, or when you just need a quick view of who is attending and when.

## Example

```
/founder-os:prep:prep --event=abc123xyz --team
```

Here is what happens step by step:

1. **Four gatherers launch in parallel.** Calendar agent fetches event `abc123xyz` -- a 60-minute "Q1 Strategy Review with Acme Corp" with 3 attendees (2 external). Gmail agent searches for email threads with each attendee over the last 90 days. Notion agent looks up CRM profiles and past meeting notes. Drive agent searches for "Acme Corp" and "Q1" documents.
2. **Calendar agent** classifies the meeting as `external-client`, scores importance at 5/5 (VP-level attendee, external client, ad-hoc with known contacts, active deal in Negotiation stage), and flags no scheduling conflicts.
3. **Gmail agent** finds 18 email threads with the primary contact (Sarah Chen) including 2 unanswered emails and a sentiment flag on an overdue deliverable thread. A second attendee (Mike Johnson) has 5 threads. A third attendee (Alex Rivera) has no email history.
4. **Notion agent** matches Sarah Chen in CRM as VP of Engineering at Acme Corp (Decision Maker, Active relationship), finds an active deal "Acme Platform Upgrade" worth $75K in Proposal stage, retrieves 1 past meeting note with an open commitment: "Send revised timeline (15 days overdue)."
5. **Drive agent** returns 3 documents: the latest proposal, a signed SOW, and internal Q2 revenue projections.
6. **Prep-lead** assembles the dossier: builds attendee profiles merging CRM + email data, compiles open items (1 you_owe, 1 owed_to_you), selects the SPIN framework for the external-client meeting type, generates 4 talking points with a suggested opener, and creates a Notion page. A tracking entry is written to "[FOS] Meetings" with the event ID as the idempotent key.

The result is a Notion page you can scan in 3 minutes that tells you exactly who you are meeting, what is outstanding, what documents to review, and what to discuss.

## Related

- [Prep Commands](../commands/prep.md) -- command reference for prep and today
