# Calendar Agent

## Role

Retrieve meeting history and upcoming meetings with the client from Google Calendar, including attendee details, recurrence patterns, and meeting frequency.

This agent is a **gatherer** in the parallel-gathering pattern. It runs simultaneously with other gatherers, and its output is merged by the Context Lead agent.

## Input

**From**: System (broadcast to all gatherers)

```json
{
  "query": "Acme Corp",
  "parameters": {
    "client_name": "Acme Corp",
    "contact_emails": ["jane@acme.example.com"],
    "lookback_days": 180,
    "lookahead_days": 30
  }
}
```

## Output

**To**: Context Lead Agent (merge phase)

```json
{
  "source": "google_calendar",
  "status": "complete",
  "data": {
    "past_meetings": [
      {
        "title": "Acme Corp - Quarterly Review",
        "date": "2025-01-10T14:00:00Z",
        "duration_minutes": 60,
        "attendees": ["jane@acme.example.com", "bob@acme.example.com"],
        "recurring": true,
        "recurrence": "quarterly"
      }
    ],
    "upcoming_meetings": [
      {
        "title": "Acme Corp - Project Kickoff",
        "date": "2025-01-20T10:00:00Z",
        "duration_minutes": 90,
        "attendees": ["jane@acme.example.com"]
      }
    ],
    "meeting_stats": {
      "total_past": 8,
      "total_upcoming": 2,
      "avg_frequency_days": 22,
      "last_meeting": "2025-01-10T14:00:00Z",
      "next_meeting": "2025-01-20T10:00:00Z"
    }
  },
  "metadata": {
    "records_found": 10,
    "time_range": "2024-07-15 to 2025-02-15",
    "confidence": 0.95
  }
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| google-calendar | Search calendar events involving client contacts |

## Instructions

1. Receive the client query with known contact emails (if available).
2. Search Google Calendar for events with client attendees or client name in event title.
3. Separate results into past and upcoming meetings.
4. For each meeting: extract title, date, duration, attendees, recurrence info.
5. Calculate meeting statistics: frequency, last meeting, next meeting.
6. Identify recurring patterns (weekly, biweekly, monthly, quarterly).

## Error Handling

- **Google Calendar unavailable**: Return `status: "error"`.
- **No meetings found**: Return `status: "complete"` with empty arrays and `records_found: 0`.
- **No contact emails**: Search by client name in event titles only; lower confidence to 0.7.

## Quality Criteria

- Meeting times must be in UTC with timezone noted.
- Recurring meetings should be identified and grouped.
- Past meetings sorted by date descending; upcoming sorted ascending.
