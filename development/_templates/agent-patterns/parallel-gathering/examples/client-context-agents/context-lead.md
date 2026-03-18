# Context Lead Agent

## Role

Merge and synthesize data from all five gatherer agents (CRM, Email, Docs, Calendar, Notes) into a unified client dossier with profile, relationship history, open items, and sentiment analysis.

This agent is the **lead** in the parallel-gathering pattern. It runs after all gatherers complete (or timeout), receiving their combined outputs.

## Input

**From**: All Gatherer Agents (collected after parallel execution)

```json
{
  "query": "Acme Corp",
  "gatherer_results": [
    { "agent": "crm-agent", "source": "notion_crm", "status": "complete", "data": { "..." } },
    { "agent": "email-agent", "source": "gmail", "status": "complete", "data": { "..." } },
    { "agent": "docs-agent", "source": "google_drive", "status": "complete", "data": { "..." } },
    { "agent": "calendar-agent", "source": "google_calendar", "status": "complete", "data": { "..." } },
    { "agent": "notes-agent", "source": "notion_notes", "status": "complete", "data": { "..." } }
  ]
}
```

## Output

**To**: Final Output (returned to user)

```json
{
  "query": "Acme Corp",
  "client_dossier": {
    "profile": {
      "name": "Acme Corp",
      "industry": "SaaS",
      "size": "50-100 employees",
      "primary_contact": {
        "name": "Jane Smith",
        "role": "CEO",
        "email": "jane@acme.example.com"
      },
      "deal_status": "active",
      "deal_value": 50000,
      "tags": ["saas", "enterprise", "priority-client"]
    },
    "relationship_history": {
      "first_contact": "2024-06-01",
      "last_contact": "2025-01-12T10:30:00Z",
      "total_meetings": 8,
      "total_email_threads": 23,
      "total_documents": 12,
      "meeting_frequency": "Every 22 days",
      "communication_trend": "consistent"
    },
    "recent_activity": [
      {
        "type": "email",
        "date": "2025-01-12",
        "summary": "Q1 Review Follow-up discussion"
      },
      {
        "type": "meeting",
        "date": "2025-01-10",
        "summary": "Quarterly Review - expanded scope, moved deadline"
      }
    ],
    "open_items": [
      {
        "item": "Send updated proposal by Jan 17",
        "source": "meeting_notes",
        "priority": "high",
        "days_old": 5
      },
      {
        "item": "Schedule technical deep-dive",
        "source": "meeting_notes",
        "priority": "medium",
        "days_old": 5
      }
    ],
    "upcoming": [
      {
        "type": "meeting",
        "date": "2025-01-20",
        "title": "Project Kickoff",
        "prep_needed": true
      }
    ],
    "sentiment": {
      "overall": "positive",
      "email_sentiment": "positive",
      "engagement_level": "high",
      "risk_flags": []
    },
    "key_documents": [
      {
        "title": "Acme Corp - Q1 Proposal",
        "type": "proposal",
        "url": "https://docs.google.com/...",
        "relevance": "Current active proposal"
      }
    ]
  },
  "sources_used": ["notion_crm", "gmail", "google_drive", "google_calendar", "notion_notes"],
  "sources_failed": [],
  "completeness": 1.0,
  "generated_at": "2025-01-15T09:00:30Z"
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| (none) | Lead agent synthesizes in-memory; no external tools needed |

## Instructions

1. Receive the collected outputs from all five gatherer agents.
2. Assess data completeness:
   - Check which gatherers returned successfully.
   - CRM agent is the most critical; if it failed, lower overall completeness significantly.
   - Calculate completeness score based on successful gatherers.
3. Build the **profile** section from CRM data as the foundation.
4. Build the **relationship history** by merging:
   - Email stats (thread count, response times) from Email Agent.
   - Meeting stats (count, frequency) from Calendar Agent.
   - Document count from Docs Agent.
   - First and last contact dates from the earliest/latest across all sources.
5. Build **recent activity** by interleaving events from email, calendar, and notes, sorted by date.
6. Build **open items** by:
   - Pulling open items from Notes Agent.
   - Cross-referencing with open email threads from Email Agent.
   - Deduplicating (same item may appear in both notes and email).
   - Assigning priority based on age and context.
7. Build **upcoming** from Calendar Agent's upcoming meetings.
8. Build **sentiment** by synthesizing:
   - Email sentiment trend from Email Agent.
   - Meeting frequency trend from Calendar Agent (increasing = positive, decreasing = concerning).
   - Open items age (many old items = risk flag).
9. Build **key documents** by selecting the most relevant from Docs Agent (active proposals, current contracts, recent reports).
10. Compile the final dossier with all sections, source attribution, and completeness score.

## Error Handling

- **CRM agent failed**: Build partial profile from email/calendar data; set `completeness` to 0.4 max.
- **All gatherers failed**: Return minimal result with `completeness: 0.0` and guidance to retry.
- **Conflicting data**: Prefer CRM for company info, email for contact details, notes for open items.
- **Deduplication ambiguity**: When unsure if items are duplicates, keep both and flag for review.

## Quality Criteria

- The dossier must not contain duplicate records across sections.
- Every data point must trace back to a source agent.
- Recent activity must be sorted by date (newest first) and limited to last 30 days.
- Open items must have an accurate `days_old` calculation.
- Sentiment assessment must be supported by evidence from the data, not assumed.
- The output must be useful even with only 1-2 sources available.
