# P03 Meeting Prep Autopilot Agent Service PRD

**Version**: 1.0
**Date**: 2026-03-05
**Status**: Draft
**Plugin Source**: `founder-os-meeting-prep-autopilot/`
**Architecture Pattern**: Parallel Gathering (4 gatherers + 1 lead)

---

## 1. Problem Statement

The P03 Meeting Prep Autopilot exists as a Cowork plugin -- a collection of markdown skill files, agent definitions, and slash commands executed within the Cowork IDE environment. This architecture has fundamental limitations:

1. **No external API access.** Other services, dashboards, and automations cannot call the plugin. A calendar webhook, a Slack bot, or a daily cron job cannot trigger meeting prep programmatically. The P20 Client Context Loader (once converted) cannot call P03 to attach meeting-specific context to client dossiers.
2. **No webhook triggers.** Events like "meeting starting in 15 minutes" or "new external client meeting added to calendar" cannot automatically generate a prep document. Users must manually invoke `/meeting:prep` inside the IDE.
3. **No observability.** There is no structured logging, latency tracking, trace correlation, or per-gatherer success rate monitoring. Pipeline failures are silent -- if the gmail-agent times out, the user sees degraded output but no telemetry captures the pattern.
4. **No batch orchestration.** The `/meeting:prep-today` command processes meetings sequentially within a single IDE session. There is no way to parallelize across meetings, resume after failure, or schedule overnight prep for the next day's meetings.
5. **No shared attendee cache across sessions.** The plugin builds an in-memory attendee cache for `/meeting:prep-today` batch runs, but this cache evaporates when the session ends. Repeated preps for the same attendees across days re-fetch identical CRM and email data.
6. **Tight MCP coupling.** Data access flows through MCP server processes (Node.js child processes for Notion, Gmail, Calendar, Drive), adding latency and limiting deployment flexibility. Each MCP server is a separate process with its own startup time and failure modes.
7. **No cross-service integration.** P03 generates meeting prep documents but cannot expose its attendee context, talking points, or open items as structured data for other services (e.g., P20 Client Context Loader, P10 Client Health Dashboard, or a future meeting assistant bot).

This PRD defines the conversion of P03 into a standalone LangGraph-based API service that exposes REST endpoints, runs as a deployable container, and replaces MCP servers with native Python SDKs.

---

## 2. Goals and Non-Goals

### Goals

- **G1**: Expose `/meeting:prep` and `/meeting:prep-today` as authenticated REST API endpoints with full request/response contracts.
- **G2**: Preserve the exact 5-agent parallel gathering architecture (calendar-agent, gmail-agent, notion-agent, drive-agent gatherers + prep-lead synthesis) as a LangGraph state graph.
- **G3**: Replace all MCP server dependencies with native Python SDK calls (google-api-python-client for Calendar/Gmail/Drive, notion-client for Notion).
- **G4**: Implement a Redis-backed attendee context cache (or SQLite in dev) to avoid redundant CRM and email lookups across requests and batch runs.
- **G5**: Achieve < 45s response time for single meeting prep and < 3 minutes for a full day's batch (5 meetings).
- **G6**: Support partial failure tolerance -- the pipeline must produce a prep document if calendar-agent succeeds plus at least 1 of gmail-agent or notion-agent (matching `minimum_gatherers_required: 2` from config.json, where calendar is mandatory and drive is optional).
- **G7**: Provide full LangSmith tracing for every graph execution, with per-node timing, intermediate state visibility, and framework selection tracking.
- **G8**: Deploy as a Docker container to Railway, with LangSmith Deployment as an alternative target.
- **G9**: Preserve all 6 meeting type classifications, 6 talking-point frameworks, 4-factor importance scoring, and "Do NOT Mention" generation logic from the plugin's skill files.

### Non-Goals

- **NG1**: Building a web UI or dashboard. This service is API-only.
- **NG2**: Supporting real-time streaming/SSE of partial prep results. The response is returned when the full pipeline completes.
- **NG3**: Implementing authentication/authorization beyond API key validation. OAuth, RBAC, and multi-tenant isolation are deferred.
- **NG4**: Converting other Founder OS plugins. This PRD covers P03 only.
- **NG5**: Migrating existing Notion "Meeting Prep Autopilot - Prep Notes" data. The service creates new entries; legacy entries remain readable.
- **NG6**: Interactive event selection. The plugin's interactive picker (show today's meetings, ask user to choose) is replaced by explicit `event_id` parameters or the batch endpoint. The API is non-interactive.
- **NG7**: Voice/audio integration. Whisper transcription or real-time meeting assistance is not in scope.
- **NG8**: Implementing the back-to-back deduplication logic in v1.0. Cross-meeting talking point deduplication for shared attendees is deferred to v1.1 to reduce complexity.

---

## 3. User Stories

### US-1: API Consumer (Internal Service)

> As an internal service (e.g., a daily automation or the P20 Client Context Loader), I want to call `POST /api/v1/meeting/prep` with a calendar event ID and receive a structured JSON prep document so that I can embed meeting context into other workflows without depending on the Cowork IDE.

**Acceptance Criteria:**
- Request with `event_id` returns a complete prep document JSON within 45s.
- Partial failures (e.g., Google Drive unavailable) do not prevent a response.
- Response includes `metadata.sources_used` and `metadata.importance_score` so the caller can assess data quality and priority.
- The discussion guide includes framework name, talking points, and "Do NOT Mention" items as structured data.

### US-2: Calendar Webhook Trigger

> As a calendar webhook handler, I want to trigger meeting prep generation 15 minutes before a meeting starts so that prep is ready before I join the call.

**Acceptance Criteria:**
- `POST /api/v1/meeting/prep` with an `event_id` returns a full prep document.
- The webhook handler receives a 200 with the full prep document for sync processing.
- If the event has already been prepped today, the response updates the existing Notion entry (idempotent re-run) and returns the refreshed prep.

### US-3: Daily Batch Automation

> As a cron job running at 7 AM, I want to call `POST /api/v1/meeting/prep-today` and receive prep documents for all qualifying meetings today so that I start my day fully prepared without manual intervention.

**Acceptance Criteria:**
- Batch endpoint returns prep documents for all qualifying meetings within 3 minutes (for up to 5 meetings).
- Internal-sync and group meetings can be excluded via `skip_internal: true`.
- Failed individual meetings do not abort the batch; they appear with `status: "failed"` in the results array.
- The response includes a shared attendee cache hit count showing lookup savings.
- Each meeting's prep is independently saved to Notion.

### US-4: DevOps Monitoring

> As a DevOps engineer, I want to monitor the health of the meeting prep service -- latency percentiles, error rates, per-gatherer success rates, and framework distribution -- so that I can detect degradation before users notice.

**Acceptance Criteria:**
- `GET /health` returns service status, uptime, and dependency connectivity.
- LangSmith traces are emitted for every request with per-node timing.
- Structured logs include `request_id`, `event_id`, `meeting_type`, `duration_ms`, `gatherer_statuses`, and `framework_selected`.

---

## 4. Functional Requirements

### 4.1 Endpoint Mapping

| Plugin Command | API Endpoint | Method | Auth |
|---|---|---|---|
| `/meeting:prep [event_id]` | `/api/v1/meeting/prep` | POST | API Key |
| `/meeting:prep-today` | `/api/v1/meeting/prep-today` | POST | API Key |
| (new) | `/health` | GET | None |

### 4.2 Endpoint Specifications

#### POST /api/v1/meeting/prep

Runs the full meeting prep pipeline for a single calendar event.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `event_id` | string | Yes | -- | Google Calendar event ID to prep for |
| `team_mode` | boolean | No | `false` | When `true`, runs the full 5-agent parallel pipeline. When `false`, runs a lightweight single-pass. |
| `lookback_hours` | integer | No | `2160` (90 days) | Email lookback window in hours for attendee correspondence search |
| `output` | string | No | `"both"` | One of: `"notion"`, `"json"`, `"both"`. Controls whether the prep is saved to Notion, returned as JSON only, or both. |

**Behavior:**

1. Validate request parameters. Return 422 if `event_id` is missing or empty.
2. Fetch the calendar event by `event_id` using Google Calendar API. Return 404 if the event does not exist.
3. Apply event validation rules from the meeting-context skill: reject cancelled events (422), warn on declined events (include `declined_warning` in response), flag tentative RSVP, flag past events.
4. Apply event filtering: reject solo events (no attendees besides user) with 422.
5. Execute the LangGraph pipeline:
   - **Phase 1 (Parallel):** Launch all 4 gatherer nodes concurrently with a 30s per-node timeout.
   - **Phase 2 (Synthesis):** Run the prep-lead node to merge gatherer outputs, select the talking-points framework, and generate the discussion guide.
6. Validate minimum gatherer threshold: calendar-agent must succeed, plus at least 1 of gmail-agent or notion-agent. Drive-agent is optional and does not count toward the minimum. If threshold not met, return 500 with details.
7. If `output` includes `"notion"`: create or update the Notion page and tracking database entry (lazy-create DB if needed). Idempotent by Event ID -- update existing, never duplicate.
8. Return the assembled prep document as structured JSON.

**team_mode behavior:**
- `false` (default): Single-pass execution. One LLM call queries Calendar, Gmail, and Notion sequentially, assembles a lightweight prep, and scores importance. No parallel gathering. Faster but less thorough -- suitable for internal syncs and recurring meetings.
- `true`: Full LangGraph parallel pipeline with all 5 agent nodes. More thorough, higher latency -- recommended for external-client and high-importance meetings.

#### POST /api/v1/meeting/prep-today

Batch-generates meeting prep documents for all qualifying calendar meetings today.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `team_mode` | boolean | No | `false` | Use full parallel pipeline for each meeting |
| `lookback_hours` | integer | No | `2160` (90 days) | Email lookback window |
| `skip_internal` | boolean | No | `false` | Skip meetings classified as `internal-sync` or `group-meeting` |
| `output` | string | No | `"both"` | One of: `"notion"`, `"json"`, `"both"` |

**Behavior:**

1. Fetch all calendar events for today (midnight to midnight, user's timezone).
2. Sort events by start time ascending.
3. Apply event filtering rules from the meeting-context skill:
   - Exclude declined, cancelled, focus/OOO blocks, solo events, past events.
   - If `skip_internal` is `true`, further exclude `internal-sync` and `group-meeting` types.
4. If zero events remain after filtering, return 200 with empty `meetings` array and a `skipped_events` summary.
5. Build a shared attendee context cache: collect all unique attendee emails across qualifying meetings, perform CRM and Gmail lookups once per unique attendee, store results keyed by email.
6. Process each meeting sequentially (to respect API rate limits), running the full prep pipeline for each. Use cached attendee data to avoid redundant lookups.
7. For each meeting: on success, include the prep document in results. On failure, record the error and continue to the next meeting.
8. Return the batch results with per-meeting status and a summary.

#### GET /health

**Response:** Service health, uptime, and dependency connectivity status.

### 4.3 LangGraph State Graph

The pipeline is modeled as a LangGraph `StateGraph` with the following nodes and edges:

```
                    +---> calendar_gatherer ---+
                    |                          |
                    +---> gmail_gatherer ------+
                    |                          |
START --> router -->+---> notion_gatherer -----+--> prep_lead --> END
                    |                          |
                    +---> drive_gatherer ------+
```

**Nodes:**

| Node | Maps to Agent | Timeout | Required | LLM |
|---|---|---|---|---|
| `router` | (new) | 2s | Yes | None (logic only) |
| `calendar_gatherer` | calendar-agent | 30s | Yes (Calendar) | None (API calls + logic) |
| `gmail_gatherer` | gmail-agent | 30s | Yes* (Gmail) | None (API calls + logic) |
| `notion_gatherer` | notion-agent | 30s | Yes* (Notion) | Fallback LLM |
| `drive_gatherer` | drive-agent | 30s | No (Drive) | None (API calls + logic) |
| `prep_lead` | prep-lead | 60s | Yes | Primary LLM (Claude) |

*At least 1 of gmail_gatherer or notion_gatherer must succeed (in addition to calendar_gatherer).

**State Schema:**

```python
class MeetingPrepState(TypedDict):
    # Input
    event_id: str
    lookback_hours: int
    team_mode: bool
    output: str  # "notion" | "json" | "both"

    # Shared context (populated by router or pre-populated for batch)
    attendee_cache: dict[str, AttendeeContext]  # email -> cached context

    # Gatherer outputs (populated in parallel)
    calendar_result: GathererOutput    # from calendar_gatherer
    gmail_result: GathererOutput       # from gmail_gatherer
    notion_result: GathererOutput      # from notion_gatherer
    drive_result: GathererOutput       # from drive_gatherer

    # Final output (populated by prep_lead)
    prep_document: PrepDocument
    metadata: PrepMetadata
    error: Optional[str]
```

**GathererOutput schema** (matches plugin agent output format):

```python
class GathererOutput(TypedDict):
    source: str                          # "google_calendar" | "gmail" | "notion" | "google_drive"
    status: Literal["complete", "error", "unavailable"]
    data: dict                           # Source-specific data (see Section 5)
    metadata: dict                       # records_found, timing, etc.
```

### 4.4 Meeting Classification

The service preserves the plugin's 6-type classification system, applied in specificity order:

| Type | Detection Signals | Talking Points Framework |
|---|---|---|
| `external-client` | Attendee domain differs from user's org AND appears in CRM | SPIN |
| `one-on-one` | Exactly 2 attendees (user + 1) | GROW |
| `ad-hoc` | No recurrence; first-time attendee set | Context-Gathering |
| `recurring` | Has RRULE; occurred 2+ times | Delta-Based |
| `group-meeting` | 4+ attendees | Contribution Mapping |
| `internal-sync` | All attendees share org domain; recurring | SBI |

Precedence order: external-client > one-on-one > ad-hoc > recurring > group-meeting > internal-sync.

### 4.5 Importance Scoring

4-factor weighted importance score (1-5), computed by the calendar_gatherer:

| Factor | Weight | 5 | 3 | 1 |
|---|---|---|---|---|
| Attendee seniority | 0.30 | C-suite/VP | Manager | Unknown |
| External vs internal | 0.25 | External client | Cross-team | Same-team |
| New vs recurring | 0.25 | First meeting | Ad-hoc, known contacts | Recurring |
| Deal proximity | 0.20 | Negotiation/Proposal stage | Qualified/Lead | No deal or Closed |

Meetings scoring 4-5 are flagged as `priority: true`.

### 4.6 Event Filtering Rules

Applied to all events before processing:

| Condition | Action |
|---|---|
| Cancelled | Reject (422 for single, skip in batch) |
| Declined | Include with `declined_warning` (single), exclude (batch) |
| Tentative | Include, flag `tentative: true` |
| All-day | Include only if has attendees |
| Focus/OOO titles | Skip ("Focus", "Block", "OOO", "Out of Office", "Do Not Book", "No Meetings") |
| Solo events | Reject (422 for single, skip in batch) |
| Past events | Include with `past_event: true` (single), exclude (batch) |

### 4.7 Attendee Cache Architecture

| Layer | Technology | TTL | Purpose |
|---|---|---|---|
| L1 | Redis (prod) / SQLite (dev) | 4 hours | Fast lookup for same-day batch runs and repeated attendees |
| L2 | In-memory (per-request) | Request lifetime | Shared across meetings in a `/prep-today` batch call |

**Cache key**: `attendee:{normalized_email}:{lookback_hours}`

**Cache scope**: Attendee context (CRM profile, email threads, sentiment indicators). Not meeting-specific data.

**Write flow**: On fresh attendee lookup, write to L1. Batch endpoint populates L2 from L1 at the start of the run.

**Read flow**: Check L2 (in-memory) first. On L2 miss, check L1 (Redis). On both miss, perform fresh lookup and populate both layers.

### 4.8 Notion Database Management

The service lazy-creates the "Meeting Prep Autopilot - Prep Notes" database if it does not exist, with this schema:

| Property | Type | Details |
|---|---|---|
| Event ID | title | Calendar event ID as primary key |
| Meeting Title | rich_text | Event summary |
| Date | date | Meeting date and time |
| Attendees | rich_text | Comma-separated attendee names |
| Sources Used | multi_select | Options: Calendar, Gmail, Notion, Drive |
| Prep Page | url | Link to generated Notion prep page |
| Generated At | date | ISO-8601 timestamp |
| Meeting Type | select | Options: external-client, one-on-one, ad-hoc, recurring, group-meeting, internal-sync |
| Importance Score | number | Weighted importance score (1-5) |

**Deduplication**: Query for existing entry by Event ID (title). Update in place if found; create new if not.

---

## 5. API Contract

### 5.1 POST /api/v1/meeting/prep

#### Request

```json
{
  "event_id": "abc123xyz",
  "team_mode": true,
  "lookback_hours": 2160,
  "output": "both"
}
```

#### Success Response (200 OK)

```json
{
  "event_id": "abc123xyz",
  "meeting": {
    "title": "Q1 Strategy Review with Acme Corp",
    "start_time": "2026-03-05T14:00:00-08:00",
    "end_time": "2026-03-05T15:00:00-08:00",
    "duration_minutes": 60,
    "location": "https://zoom.us/j/123456789",
    "meeting_type": "external-client",
    "importance_score": 5,
    "importance_factors": {
      "attendee_seniority": { "score": 5, "reason": "VP-level attendee" },
      "external_internal": { "score": 5, "reason": "External client" },
      "new_recurring": { "score": 3, "reason": "Ad-hoc with known contacts" },
      "deal_proximity": { "score": 5, "reason": "Active deal in Proposal stage" }
    },
    "priority": true,
    "tentative": false,
    "past_event": false,
    "declined_warning": null,
    "recurrence": null,
    "organizer": {
      "name": "Jane Smith",
      "email": "jane@acme.com"
    },
    "inferred_agenda": [
      "Review Q1 deliverables",
      "Discuss renewal timeline",
      "[Inferred] Address open action items from last interaction"
    ],
    "conflicts": null,
    "attendee_changes": null
  },
  "attendees": [
    {
      "name": "Jane Smith",
      "email": "jane@acme.com",
      "rsvp": "accepted",
      "internal": false,
      "is_organizer": true,
      "profile_priority": "full",
      "match_type": "exact",
      "crm": {
        "role": "VP of Engineering",
        "company": "Acme Corp",
        "company_status": "Active",
        "industry": "SaaS",
        "contact_type": "Decision Maker",
        "relationship_status": "Active",
        "last_interaction": {
          "date": "2026-02-20",
          "type": "Meeting",
          "summary": "Discussed Q1 roadmap priorities"
        },
        "communication_depth": 24,
        "deals": [
          {
            "name": "Acme Platform Upgrade",
            "stage": "Proposal",
            "value": 75000,
            "close_date": "2026-03-15"
          }
        ]
      },
      "email_context": {
        "thread_count": 12,
        "last_interaction": {
          "date": "2026-02-20T14:30:00Z",
          "summary": "Discussed Q1 deliverable timeline and resource allocation"
        },
        "unanswered_emails": [
          {
            "subject": "RE: Updated project scope",
            "date": "2026-02-18T09:15:00Z",
            "days_waiting": 15
          }
        ],
        "recent_topics": [
          "RE: Q1 deliverable timeline",
          "Updated project scope",
          "Kickoff meeting follow-up"
        ],
        "sentiment_indicators": [
          {
            "subject": "RE: Overdue invoice #4521",
            "date": "2026-02-10T11:00:00Z",
            "keyword": "overdue"
          }
        ]
      },
      "past_meetings": [
        {
          "title": "Acme Q1 Planning",
          "date": "2026-02-10",
          "action_items": [
            { "item": "Send revised timeline", "status": "open", "owner": "user" },
            { "item": "Review SOW draft", "status": "closed", "owner": "Jane Smith" }
          ],
          "decisions": ["Agreed on phased rollout approach"],
          "outcomes": ["Follow-up scheduled for Feb 20"]
        }
      ],
      "open_commitments": [
        "Send revised timeline (promised 2026-02-12, 21 days overdue)"
      ]
    },
    {
      "name": "Bob Johnson",
      "email": "bob@acme.com",
      "rsvp": "accepted",
      "internal": false,
      "is_organizer": false,
      "profile_priority": "full",
      "match_type": "none",
      "crm": null,
      "email_context": {
        "thread_count": 0,
        "last_interaction": null,
        "unanswered_emails": [],
        "recent_topics": [],
        "sentiment_indicators": []
      },
      "past_meetings": [],
      "open_commitments": []
    }
  ],
  "open_items": {
    "you_owe": [
      {
        "item": "Send revised timeline to Acme",
        "person": "Jane Smith",
        "days_waiting": 21,
        "source": "Notion Action Items + Email thread",
        "overdue": true
      }
    ],
    "owed_to_you": [
      {
        "item": "Provide budget approval",
        "person": "Jane Smith",
        "due_date": "2026-02-25",
        "days_waiting": 8,
        "source": "Notion Action Items"
      }
    ],
    "shared": [],
    "resolved_since_last": []
  },
  "relevant_documents": [
    {
      "file_name": "Acme Corp - Q1 Proposal v2",
      "file_type": "Doc",
      "last_modified": "2026-02-10T14:22:00Z",
      "url": "https://docs.google.com/document/d/abc123/edit",
      "relevance": "Latest proposal sent to Acme Corp covering Q1 deliverables and pricing."
    }
  ],
  "discussion_guide": {
    "framework": "SPIN",
    "meeting_type": "external-client",
    "opener": "Thanks for making time today, Jane. Congratulations on the Phase 1 launch last month -- the team did great work. I want to make sure we're aligned on the Q1 deliverables and renewal timeline.",
    "talking_points": [
      {
        "position": 1,
        "action_verb": "Address",
        "topic": "the overdue revised timeline",
        "context": "You committed to sending the revised timeline on Feb 12 and it remains outstanding. Jane flagged this in her last email. Proactively acknowledge the delay and present the updated timeline.",
        "framework_phase": "Situation"
      },
      {
        "position": 2,
        "action_verb": "Confirm",
        "topic": "Q1 deliverable status and any blockers",
        "context": "The phased rollout was agreed at the Feb 10 planning session. Verify progress against the original milestones and surface any resource constraints before they become blockers.",
        "framework_phase": "Problem"
      },
      {
        "position": 3,
        "action_verb": "Discuss",
        "topic": "impact of timeline slip on the Proposal-stage deal",
        "context": "The $75K Platform Upgrade deal has a Mar 15 expected close. If deliverable delays erode confidence, the close date may slip. Frame the conversation around mutual risk.",
        "framework_phase": "Implication"
      },
      {
        "position": 4,
        "action_verb": "Propose",
        "topic": "accelerated review cycle to recover lost time",
        "context": "Offer to compress the next review cycle from 2 weeks to 1 week to demonstrate commitment and recover the timeline gap.",
        "framework_phase": "Need-payoff"
      }
    ],
    "do_not_mention": [
      {
        "item": "Internal cost structure or discount thresholds",
        "rationale": "Deal is in Proposal stage -- active negotiation territory"
      },
      {
        "item": "The overdue invoice #4521 flagged in email sentiment",
        "rationale": "Finance should handle billing disputes separately. Raising it here conflates project delivery with accounts receivable."
      }
    ],
    "proposed_next_steps": [
      {
        "action": "Send the revised timeline document",
        "owner": "user",
        "deadline": "2026-03-06"
      },
      {
        "action": "Confirm budget approval for Phase 2",
        "owner": "Jane Smith",
        "deadline": "2026-03-12"
      },
      {
        "action": "Schedule technical deep-dive for mobile architecture",
        "owner": "user",
        "deadline": "2026-03-10"
      }
    ],
    "close": "Let's lock in the revised timeline by tomorrow and reconvene for the technical deep-dive next week. I'll send a calendar invite for the follow-up."
  },
  "prep_recommendations": [
    "Review the Q1 Proposal v2 document before the meeting -- Jane may reference specific deliverable milestones.",
    "Prepare the revised timeline document so you can share it during or immediately after the call.",
    "Check the invoice #4521 status with finance so you're prepared if Jane raises it, even though you should not bring it up.",
    "Review the phased rollout agreement from the Feb 10 meeting notes to confirm milestone dates."
  ],
  "notion_page_url": "https://notion.so/meeting-prep-q1-strategy-review-acme-20260305",
  "metadata": {
    "sources_used": ["google_calendar", "gmail", "notion", "google_drive"],
    "sources_failed": [],
    "sources_unavailable": [],
    "meeting_type": "external-client",
    "importance_score": 5,
    "framework_selected": "SPIN",
    "attendee_count": 3,
    "attendees_profiled": 2,
    "open_items_count": 2,
    "talking_points_count": 4,
    "from_cache": false,
    "generated_at": "2026-03-05T13:45:00Z",
    "pipeline_timing": {
      "total_ms": 18200,
      "calendar_gatherer_ms": 2100,
      "gmail_gatherer_ms": 4500,
      "notion_gatherer_ms": 5200,
      "drive_gatherer_ms": 3100,
      "prep_lead_ms": 8400
    }
  }
}
```

### 5.2 POST /api/v1/meeting/prep-today

#### Request

```json
{
  "team_mode": false,
  "lookback_hours": 2160,
  "skip_internal": true,
  "output": "both"
}
```

#### Success Response (200 OK)

```json
{
  "date": "2026-03-05",
  "mode": "single-agent",
  "meetings_found": 6,
  "meetings_filtered": 2,
  "meetings_prepped": 4,
  "meetings_failed": 0,
  "attendee_cache": {
    "unique_attendees": 9,
    "cache_hits": 3,
    "lookups_saved": 3
  },
  "meetings": [
    {
      "event_id": "abc123xyz",
      "title": "Q1 Strategy Review with Acme Corp",
      "start_time": "2026-03-05T09:00:00-08:00",
      "end_time": "2026-03-05T10:00:00-08:00",
      "meeting_type": "external-client",
      "importance_score": 5,
      "framework": "SPIN",
      "status": "success",
      "attendee_count": 3,
      "talking_points_count": 4,
      "open_items_count": 2,
      "notion_page_url": "https://notion.so/prep-abc123",
      "prep_document": { "...": "full prep document as in 5.1" }
    },
    {
      "event_id": "def456uvw",
      "title": "1:1 with Sarah Chen",
      "start_time": "2026-03-05T11:00:00-08:00",
      "end_time": "2026-03-05T11:30:00-08:00",
      "meeting_type": "one-on-one",
      "importance_score": 3,
      "framework": "GROW",
      "status": "success",
      "attendee_count": 2,
      "talking_points_count": 3,
      "open_items_count": 1,
      "notion_page_url": "https://notion.so/prep-def456",
      "prep_document": { "...": "full prep document" }
    }
  ],
  "skipped_events": [
    {
      "title": "Focus Time",
      "start_time": "2026-03-05T13:00:00-08:00",
      "reason": "Focus/OOO block"
    },
    {
      "title": "Team Standup",
      "start_time": "2026-03-05T16:00:00-08:00",
      "reason": "Skipped (--skip-internal: internal-sync)"
    }
  ],
  "errors": [],
  "metadata": {
    "total_prep_time_ms": 42000,
    "per_meeting_timing": [
      { "event_id": "abc123xyz", "duration_ms": 18200 },
      { "event_id": "def456uvw", "duration_ms": 9800 }
    ],
    "generated_at": "2026-03-05T07:05:00Z"
  }
}
```

### 5.3 GET /health

#### Response (200 OK)

```json
{
  "status": "healthy",
  "uptime_seconds": 86420,
  "version": "1.0.0",
  "dependencies": {
    "google_calendar": { "status": "connected", "latency_ms": 88 },
    "gmail": { "status": "connected", "latency_ms": 95 },
    "notion": { "status": "connected", "latency_ms": 120 },
    "google_drive": { "status": "connected", "latency_ms": 102 },
    "redis": { "status": "connected", "latency_ms": 2 },
    "claude_api": { "status": "connected", "latency_ms": 450 }
  }
}
```

### 5.4 Error Response Schemas

#### 422 Validation Error

```json
{
  "error": "validation_error",
  "message": "event_id is required and must be a non-empty string",
  "details": {
    "field": "event_id",
    "constraint": "required"
  }
}
```

#### 422 Event Rejected

```json
{
  "error": "event_rejected",
  "message": "This event has been cancelled. No prep document generated.",
  "event_id": "abc123xyz",
  "reason": "cancelled"
}
```

#### 404 Event Not Found

```json
{
  "error": "event_not_found",
  "message": "No calendar event found for event_id 'abc123xyz'",
  "event_id": "abc123xyz"
}
```

#### 500 Pipeline Error

```json
{
  "error": "pipeline_error",
  "message": "Minimum gatherer threshold not met. Calendar succeeded but neither Gmail nor Notion returned data.",
  "request_id": "req_abc123",
  "event_id": "abc123xyz",
  "details": {
    "calendar_gatherer": "complete",
    "gmail_gatherer": "Gmail API authentication expired",
    "notion_gatherer": "Notion API timeout after 30s",
    "drive_gatherer": "unavailable",
    "threshold": "calendar + 1 of (gmail, notion)",
    "met": false
  }
}
```

#### 503 Service Unavailable

```json
{
  "error": "service_unavailable",
  "message": "Required dependency 'google_calendar' is not reachable",
  "retry_after_seconds": 30
}
```

---

## 6. Non-Functional Requirements

### 6.1 Latency

| Scenario | Target | Hard Limit |
|---|---|---|
| Single prep (team_mode=false) | < 20s | 45s |
| Single prep (team_mode=true) | < 35s | 60s |
| Batch prep-today (5 meetings, team_mode=false) | < 90s | 180s |
| Batch prep-today (5 meetings, team_mode=true) | < 150s | 300s |
| Health check | < 500ms | 2s |

### 6.2 Partial Failure Tolerance

- The pipeline must produce a prep document if **calendar_gatherer succeeds** plus **at least 1 of gmail_gatherer or notion_gatherer** returns `status: "complete"`.
- Drive_gatherer is optional and does not count toward the minimum threshold.
- Each gatherer node has an independent 30s timeout. A timed-out gatherer returns `status: "error"` with a timeout message; the pipeline continues.
- Optional sources (Google Drive) return `status: "unavailable"` when their SDK credentials are not configured. This is not an error.
- The prep_lead node must distinguish between "unavailable" (no credentials), "error" (credentials exist but call failed), and "no data found" (call succeeded, zero results).
- In batch mode, a single meeting failure does not abort the batch. The failed meeting appears with `status: "failed"` in the results array.

### 6.3 Rate Limits and Quotas

| Service | Relevant Limit | Mitigation |
|---|---|---|
| Google Calendar API | 500 requests/100s per user | Single `events.get` call per meeting; `events.list` for prep-today. No pagination expected. |
| Gmail API | 250 quota units/second per user | Per-attendee `messages.list` + selective `messages.get`. Limit to 50 most recent threads per attendee. Batch mode processes meetings sequentially to spread load. |
| Notion API | 3 requests/second per integration | Sequential Notion calls within notion_gatherer. CRM lookups batched where possible. Attendee cache reduces repeated lookups. |
| Google Drive API | 1000 requests/100s per project | 2-3 `files.list` calls per meeting with query filters. |
| Claude API | Tier-dependent TPM | Primary LLM used only for prep_lead synthesis. Estimated 1 call per meeting, ~6K input tokens, ~3K output tokens. |

### 6.4 Concurrency

- The service must handle at least 5 concurrent requests.
- Each request spawns up to 4 parallel gatherer tasks (in team_mode). Total concurrent external API calls per request: up to 4.
- Batch requests process meetings sequentially within the request to respect per-user API rate limits, but gatherers within each meeting run in parallel.
- Redis operations are atomic and non-blocking.
- Notion page creation/update is fire-and-forget when `output` is `"json"` (does not block response).

### 6.5 Security

- All endpoints (except `/health`) require an `Authorization: Bearer <API_KEY>` header.
- API keys are stored as environment variables, not in code.
- External service credentials (Notion API key, Google OAuth tokens) are stored as environment variables.
- No PII is logged. Attendee names and email addresses are redacted in structured logs (replaced with hashes).
- Notion and Google API calls use the minimum required OAuth scopes.

---

## 7. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| p50 latency (single prep, team_mode=false) | < 15s | LangSmith trace duration |
| p95 latency (single prep, team_mode=false) | < 35s | LangSmith trace duration |
| p50 latency (single prep, team_mode=true) | < 30s | LangSmith trace duration |
| p95 latency (single prep, team_mode=true) | < 50s | LangSmith trace duration |
| p50 latency (batch, 5 meetings) | < 80s | LangSmith trace duration |
| Gatherer success rate (per source) | > 95% when credentials configured | Per-node status counter |
| Trace completeness | 100% of requests have a LangSmith trace | LangSmith project dashboard |
| Error rate (5xx) | < 1% of requests | Application error counter |
| Partial prep rate | < 10% of non-failed requests | Requests where any gatherer returned "error" |
| Batch completion rate | > 95% of meetings in batch succeed | Per-meeting status in batch responses |
| Attendee cache hit rate (batch) | > 30% after 7 days of use | Cache hit counter in batch responses |
| Framework distribution accuracy | 100% of meetings use the correct framework per classification | Framework vs meeting_type audit in LangSmith |
| Notion write success rate | > 99% when Notion credentials configured | Notion create/update success counter |

---

## 8. Dependencies and Risks

### 8.1 External Services

| Service | Purpose | SDK | Auth Method |
|---|---|---|---|
| Google Calendar | Event details, attendee lists, scheduling conflicts | `google-api-python-client` (Calendar API v3) | OAuth 2.0 user token (env: `GOOGLE_CREDENTIALS_JSON`) |
| Gmail | Attendee email history, unanswered threads, sentiment signals | `google-api-python-client` (Gmail API v1) | OAuth 2.0 (shared credentials with Calendar) |
| Notion | CRM data (Companies, Contacts, Deals, Communications), meeting notes, action items, prep page output, tracking DB | `notion-client` (Python) | Integration token (env: `NOTION_API_KEY`) |
| Google Drive | Relevant documents for meeting context | `google-api-python-client` (Drive API v3) | OAuth 2.0 (shared credentials with Calendar) |
| Redis | Attendee context cache (L1) | `redis-py` | Connection string (env: `REDIS_URL`) |

### 8.2 LLM Providers

| Provider | Role | Model | Usage |
|---|---|---|---|
| Anthropic Claude API | Primary LLM | claude-sonnet-4-20250514 (or latest) | Prep-lead synthesis: merging gatherer outputs, selecting framework, generating talking points, building discussion guide, writing prep recommendations, generating "Do NOT Mention" items. Estimated 1 call per meeting, ~6K input tokens, ~3K output tokens. |
| Fallback LLM (optional) | Structured extraction | TBD | Notion-agent: extracting action items from meeting notes, summarizing communication history. Used when structured extraction is sufficient. Estimated 1-2 calls per meeting. |

### 8.3 Infrastructure

| Component | Technology | Purpose |
|---|---|---|
| API Framework | FastAPI | REST endpoints, request validation, OpenAPI docs |
| Graph Engine | LangGraph | State graph orchestration, parallel node execution |
| Observability | LangSmith | Trace collection, latency tracking, per-node debugging |
| Deployment (primary) | Railway (Docker) | Container hosting, env management, auto-deploy |
| Deployment (alt) | LangSmith Deployment | LangGraph-native deployment with built-in tracing |
| Dev Cache | SQLite | Local development replacement for Redis |

### 8.4 Python Dependencies (Key Packages)

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | >= 0.115 | HTTP framework |
| `uvicorn` | >= 0.34 | ASGI server |
| `langgraph` | >= 0.3 | State graph engine |
| `langsmith` | >= 0.2 | Tracing client |
| `langchain-anthropic` | >= 0.3 | Claude API integration |
| `notion-client` | >= 2.2 | Notion API SDK |
| `google-api-python-client` | >= 2.150 | Google APIs (Calendar, Gmail, Drive) |
| `google-auth` | >= 2.35 | Google OAuth |
| `redis` | >= 5.2 | Redis client |
| `pydantic` | >= 2.9 | Request/response models, state validation |

### 8.5 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Google OAuth token expiry during batch processing | Medium | Single meeting fails, batch continues | Implement token refresh before each meeting in batch; detect 401 early and refresh |
| Notion API rate limit (3 req/s) exceeded during notion_gatherer with many attendees | Medium | Timeout or partial CRM data | Sequential Notion calls; attendee cache reduces repeated lookups; limit CRM queries to top-5 attendees for 10+ meetings |
| LLM latency variance causes prep_lead to exceed 60s timeout | Low | Pipeline timeout; degraded output | Implement prompt caching for framework templates; set `max_tokens` ceiling; fallback to abbreviated prep if timeout approaches |
| Gmail returns excessive thread volume for frequent correspondents (100+ threads) | Medium | gmail_gatherer timeout | Cap at 50 most recent threads per attendee; use `maxResults` parameter in Gmail API |
| CRM databases not found in Notion workspace | Medium | No CRM enrichment; partial prep | Dynamic database discovery with fallback title patterns; clear error message with setup guidance |
| Calendar event lacks attendee list (e.g., forwarded invites, imported events) | Low | Solo-event rejection or minimal prep | Fallback to description parsing and organizer profiling; warn user about limited context |
| Cross-plugin dependency: P21 CRM Sync Hub not deployed, CRM data stale | Medium | Outdated CRM context in attendee profiles | Document dependency; prep metadata includes `crm_data_freshness` field; recommend P21 sync before prep |
| Back-to-back dedup deferred to v1.1: batch may produce redundant talking points for shared attendees | Medium | Lower prep quality for consecutive meetings | Accept in v1.0; document as known limitation; v1.1 adds cross-meeting dedup in prep_lead |

---

## 9. Out of Scope

The following items are explicitly excluded from this PRD and v1.0 implementation:

1. **Back-to-back meeting deduplication.** The plugin's logic for deduplicating talking points and open items across consecutive meetings sharing attendees is deferred to v1.1. In v1.0, each meeting is prepped independently.

2. **Interactive event selection.** The plugin's interactive picker (list today's meetings, ask user to pick) is replaced by explicit `event_id` parameters. The API is non-interactive.

3. **WebSocket or SSE streaming.** Partial prep results are not streamed as gatherers complete. The response waits for full pipeline completion.

4. **Multi-tenant support.** The service assumes a single set of Google/Notion credentials. Supporting multiple users with separate credentials requires tenant isolation, credential vaulting, and per-tenant rate limiting.

5. **Custom framework configuration.** The 6 talking-point frameworks and their mapping to meeting types are fixed. Users cannot add custom frameworks or override the mapping via the API.

6. **Historical prep versioning.** Only the latest prep for each event is stored. Previous versions are overwritten. A prep history/diff feature is not included.

7. **Notion database creation for CRM.** The service assumes CRM Pro databases (Companies, Contacts, Deals, Communications) already exist. It discovers them by title but does not create them. Only the "Meeting Prep Autopilot - Prep Notes" tracking database is lazy-created.

8. **Cross-service integration with P20.** Using P20 Client Context Loader dossiers to enrich attendee profiles (instead of directly querying CRM) is not implemented in v1.0. Each service operates independently.

9. **UI or admin panel.** No web interface for viewing prep documents, managing the prep database, or configuring the service.

10. **Load testing and capacity planning.** Performance targets are defined but formal load testing methodology and infrastructure sizing are not specified here.

11. **Voice transcription integration.** Using Whisper or other transcription services to feed meeting transcripts into the prep pipeline is not in scope. See P07 Meeting Intelligence Hub for that capability.
