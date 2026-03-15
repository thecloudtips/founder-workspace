# P03 Meeting Prep Autopilot -- Technical Specification

## 1. Overview

The Meeting Prep Autopilot is a LangGraph agent service that generates comprehensive meeting preparation documents by aggregating data from four independent sources (Google Calendar, Gmail, Notion CRM, Google Drive) into a structured prep dossier with framework-based talking points. It uses a parallel-gathering pattern: four gatherer nodes execute concurrently, a synthesis node merges their outputs into a discussion guide, and post-processing nodes handle caching and persistence.

**Service boundary:** Receives an event_id (or date for batch prep), returns a structured JSON meeting prep document with attendee profiles, open items, related documents, and a framework-selected discussion guide.

**Key design constraints:**
- Calendar gatherer is MANDATORY -- pipeline fails without it
- Minimum 2 gatherers must succeed: calendar + at least 1 of email/crm (Drive does not count toward minimum)
- 30-second timeout per gatherer node
- 1-hour cache TTL (prep documents are time-sensitive, unlike P20's 24h)
- Redis (prod) / SQLite (dev) for prep cache; Notion for persistent human-readable storage
- Claude API for synthesis; Z.ai GLM-5 for gatherer extraction tasks
- Dual-mode operation: single event prep and batch prep-today

---

## 2. Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Python | 3.12+ | Service runtime |
| Orchestration | LangGraph | >=0.2 | Graph-based agent orchestration |
| API Framework | FastAPI | >=0.110 | REST endpoint layer |
| Validation | Pydantic | v2 | State schema, request/response models |
| Cache (prod) | Redis | >=7.0 | Primary prep cache, 1h TTL |
| Cache (dev) | SQLite | stdlib | Local dev cache fallback |
| Notion SDK | notion-client | >=2.0 | Notion API (CRM, prep notes, pages) |
| Google APIs | google-api-python-client | >=2.100 | Calendar, Gmail, Drive |
| Google Auth | google-auth-oauthlib | >=1.0 | OAuth2 credential management |
| LLM (primary) | anthropic | >=0.30 | Claude API for synthesis |
| LLM (fallback) | openai-compatible | -- | Z.ai GLM-5 via OpenAI-compatible endpoint |
| Observability | langsmith | >=0.1 | Tracing, per-node timing |
| Logging | structlog | >=23.0 | Structured JSON logging |

---

## 3. State Schema

All models use Pydantic v2 with strict validation. The top-level `MeetingPrepState` is the LangGraph state object passed through every node.

### 3.1 Input Models

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class MeetingPrepRequest(BaseModel):
    """Inbound API request."""
    event_id: Optional[str] = Field(None, description="Google Calendar event ID. If None, triggers discovery mode.")
    date: Optional[str] = Field(None, description="Date for batch prep (YYYY-MM-DD). Defaults to today.")
    refresh: bool = Field(False, description="Bypass cache and force fresh gathering")
    hours: Optional[int] = Field(None, description="Override email lookback window (hours, default 2160 = 90 days)")
    output: Literal["notion", "chat", "both"] = Field("both", description="Output destination")
    skip_internal: bool = Field(False, description="Skip internal-sync meetings in batch mode")
    team_mode: bool = Field(False, description="Use full agent pipeline (vs fast single-agent)")


class BatchPrepRequest(BaseModel):
    """Batch prep-today request."""
    date: Optional[str] = Field(None, description="Date for batch prep (YYYY-MM-DD). Defaults to today.")
    skip_internal: bool = Field(False, description="Skip internal-sync meetings")
    output: Literal["notion", "chat", "both"] = Field("both", description="Output destination")
    refresh: bool = Field(False, description="Bypass cache for all meetings")
```

### 3.2 Enum Types

```python
class MeetingType(str, Enum):
    """Meeting classification. Applied in specificity order."""
    EXTERNAL_CLIENT = "external-client"
    ONE_ON_ONE = "one-on-one"
    AD_HOC = "ad-hoc"
    RECURRING = "recurring"
    GROUP_MEETING = "group-meeting"
    INTERNAL_SYNC = "internal-sync"


class RSVPStatus(str, Enum):
    ACCEPTED = "accepted"
    TENTATIVE = "tentative"
    DECLINED = "declined"
    NEEDS_ACTION = "needsAction"


class GathererStatus(str, Enum):
    """Status of a gatherer node execution."""
    COMPLETE = "complete"
    UNAVAILABLE = "unavailable"
    ERROR = "error"
    TIMEOUT = "timeout"


class RelationshipStatus(str, Enum):
    ACTIVE = "Active"       # < 30 days since last interaction
    COOLING = "Cooling"     # 30-90 days
    DORMANT = "Dormant"     # > 90 days
    NEW = "New"             # No prior interactions


class TalkingPointFramework(str, Enum):
    SPIN = "SPIN"                           # external-client
    GROW = "GROW"                           # one-on-one
    SBI = "SBI"                             # internal-sync
    CONTEXT_GATHERING = "Context-Gathering" # ad-hoc
    DELTA_BASED = "Delta-Based"             # recurring
    CONTRIBUTION_MAPPING = "Contribution Mapping"  # group-meeting
```

### 3.3 Calendar Gatherer Models

```python
class Organizer(BaseModel):
    """Event organizer."""
    name: str = Field(..., description="Organizer display name")
    email: str = Field(..., description="Organizer email address")


class ImportanceFactor(BaseModel):
    """Single importance scoring factor."""
    score: int = Field(..., ge=1, le=5, description="Factor score 1-5")
    reason: str = Field(..., description="Human-readable justification")


class ImportanceFactors(BaseModel):
    """Breakdown of the four weighted importance factors."""
    attendee_seniority: ImportanceFactor = Field(..., description="Weight 0.30: C-suite=5, Director=4, Manager=3, IC=2, Unknown=1")
    external_internal: ImportanceFactor = Field(..., description="Weight 0.25: External client=5, Cross-team=3, Same-team=1")
    new_recurring: ImportanceFactor = Field(..., description="Weight 0.25: First meeting=5, Ad-hoc known=3, Recurring=1")
    deal_proximity: ImportanceFactor = Field(..., description="Weight 0.20: Negotiation/Proposal=5, Qualified/Lead=3, No deal=1")


class Conflict(BaseModel):
    """Scheduling conflict with another event."""
    title: str = Field(..., description="Conflicting event title")
    time: str = Field(..., description="Conflicting event time range (HH:MM-HH:MM)")


class AttendeeChanges(BaseModel):
    """Changes in attendee list for recurring meetings."""
    added: list[str] = Field(default_factory=list, description="Newly added attendees: 'Name (email)'")
    removed: list[str] = Field(default_factory=list, description="Removed attendees: 'Name (email)'")


class Attendee(BaseModel):
    """Calendar event attendee."""
    name: str = Field(..., description="Display name from calendar")
    email: str = Field(..., description="Email address")
    rsvp: RSVPStatus = Field(..., description="RSVP status")
    internal: bool = Field(..., description="True if email domain matches user's org domain")
    is_organizer: bool = Field(False, description="True if this attendee is the event organizer")
    profile_priority: Literal["full", "minimal"] = Field(
        "full",
        description="'full' for top 5 attendees needing deep profiling, 'minimal' for the rest"
    )


class CalendarEvent(BaseModel):
    """Structured calendar event from the calendar gatherer."""
    event_id: str = Field(..., description="Google Calendar event ID")
    title: str = Field("[No Title]", description="Event summary")
    start_time: datetime = Field(..., description="Event start datetime with timezone")
    end_time: Optional[datetime] = Field(None, description="Event end datetime. Fallback: start + 30min")
    duration_minutes: int = Field(..., ge=0, description="Computed from start and end")
    end_estimated: bool = Field(False, description="True when end_time was inferred")
    location: str = Field("Not specified", description="Conference link, room name, or 'Not specified'")
    description: str = Field("", description="Event body text")
    recurrence: Optional[str] = Field(None, description="RRULE or recurringEventId")
    organizer: Organizer = Field(..., description="Event organizer")
    meeting_type: MeetingType = Field(..., description="Classified meeting type")
    importance_score: int = Field(..., ge=1, le=5, description="Weighted importance score")
    importance_factors: ImportanceFactors = Field(..., description="Breakdown of scoring factors")
    priority: bool = Field(False, description="True when importance_score >= 4")
    tentative: bool = Field(False, description="True if user's RSVP is tentative")
    past_event: bool = Field(False, description="True if event has already occurred")
    declined_warning: Optional[str] = Field(None, description="Warning string if user declined")
    attendees: list[Attendee] = Field(default_factory=list, description="All event attendees")
    inferred_agenda: list[str] = Field(default_factory=list, description="Agenda items; inferred items prefixed '[Inferred]'")
    conflicts: Optional[list[Conflict]] = Field(None, description="Overlapping events, or None")
    attendee_changes: Optional[AttendeeChanges] = Field(None, description="Recurring meeting attendee deltas")
    context_note: Optional[str] = Field(None, description="Degradation note, or None")
```

### 3.4 Gmail Gatherer Models

```python
class LastInteraction(BaseModel):
    """Most recent email interaction with an attendee."""
    date: datetime = Field(..., description="ISO-8601 datetime of last interaction")
    summary: str = Field(..., max_length=100, description="One-line summary, max 100 chars")


class UnansweredEmail(BaseModel):
    """Email thread where attendee is awaiting user's reply."""
    subject: str = Field(..., description="Thread subject line")
    date: datetime = Field(..., description="Date attendee sent last message")
    days_waiting: int = Field(..., ge=0, description="Calendar days since email was sent")


class SentimentIndicator(BaseModel):
    """Email thread containing a negative-signal keyword."""
    subject: str = Field(..., description="Thread subject line")
    date: datetime = Field(..., description="Date of the flagged thread")
    keyword: str = Field(..., description="Matched keyword: urgent, disappointed, escalation, overdue, issue, problem, concerned")


class GmailAttendeeContext(BaseModel):
    """Per-attendee email context from Gmail."""
    email: str = Field(..., description="Attendee email address")
    name: str = Field(..., description="Attendee display name")
    thread_count: int = Field(0, ge=0, description="Total threads in lookback window")
    last_interaction: Optional[LastInteraction] = Field(None, description="Most recent thread summary")
    unanswered_emails: list[UnansweredEmail] = Field(default_factory=list, description="Threads awaiting user reply")
    recent_topics: list[str] = Field(default_factory=list, description="Subject lines of 3 most recent threads, newest first")
    sentiment_indicators: list[SentimentIndicator] = Field(default_factory=list, description="Negative-signal threads from last 30 days")


class GmailSummaryStats(BaseModel):
    """Aggregate email stats across all attendees."""
    total_attendees_processed: int = Field(0)
    attendees_with_history: int = Field(0)
    attendees_without_history: int = Field(0)
    total_threads_found: int = Field(0)
    total_unanswered: int = Field(0)


class GmailData(BaseModel):
    """Structured output from the email gatherer."""
    attendees: list[GmailAttendeeContext] = Field(default_factory=list, description="Per-attendee email context")
    summary_stats: GmailSummaryStats = Field(default_factory=GmailSummaryStats)


class GmailMetadata(BaseModel):
    """Metadata about the Gmail search."""
    lookback_hours: int = Field(2160, description="Lookback window in hours (default 90 days)")
    records_found: int = Field(0, description="Total threads found")
    scan_date: Optional[str] = Field(None, description="Date of scan (YYYY-MM-DD)")
    partial: bool = Field(False, description="True if rate-limited mid-processing")
```

### 3.5 Notion CRM Gatherer Models

```python
class CRMInteraction(BaseModel):
    """Most recent CRM communication record."""
    date: str = Field(..., description="Interaction date (YYYY-MM-DD)")
    type: str = Field(..., description="Interaction type: Email, Call, Meeting, Note")
    summary: str = Field(..., description="Brief description of interaction")


class Deal(BaseModel):
    """Active deal from CRM Pro Deals database."""
    name: str = Field(..., description="Deal name")
    stage: str = Field(..., description="Pipeline stage: Lead, Qualified, Proposal, Negotiation, Closed Won")
    value: Optional[float] = Field(None, ge=0, description="Deal monetary value")
    close_date: Optional[str] = Field(None, description="Expected close date (YYYY-MM-DD)")


class CRMProfile(BaseModel):
    """CRM contact profile from Notion."""
    role: str = Field(..., description="Job title or role")
    company: str = Field(..., description="Company name")
    company_status: str = Field(..., description="Company status: Active, Prospect, Churned, Partner")
    industry: Optional[str] = Field(None, description="Industry classification")
    contact_type: Optional[str] = Field(
        None,
        description="Contact type: Decision Maker, Champion, User, Influencer, Blocker"
    )
    relationship_status: RelationshipStatus = Field(..., description="Computed from last interaction date")
    last_interaction: Optional[CRMInteraction] = Field(None, description="Most recent CRM communication")
    communication_depth: int = Field(0, ge=0, description="Total communication records count")
    deals: list[Deal] = Field(default_factory=list, description="Active deals (excludes Closed Lost)")


class PastMeetingActionItem(BaseModel):
    """Action item from a past meeting note."""
    item: str = Field(..., description="Action item text")
    status: str = Field(..., description="Status: open or closed")
    owner: str = Field(..., description="Assigned owner")


class PastMeeting(BaseModel):
    """Summary of a past meeting note from Notion."""
    title: str = Field(..., description="Meeting note title")
    date: str = Field(..., description="Meeting date (YYYY-MM-DD)")
    action_items: list[PastMeetingActionItem] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list, description="Key decisions made")
    outcomes: list[str] = Field(default_factory=list, description="Follow-ups or outcomes noted")


class NotionAttendeeContext(BaseModel):
    """Per-attendee CRM and meeting note context from Notion."""
    name: str = Field(..., description="Attendee display name")
    email: str = Field(..., description="Attendee email address")
    match_type: Literal["exact", "name", "company", "none"] = Field(
        ..., description="CRM match confidence"
    )
    crm: Optional[CRMProfile] = Field(None, description="CRM profile; None if no match")
    past_meetings: list[PastMeeting] = Field(
        default_factory=list, description="3 most recent meeting notes, newest first"
    )
    open_commitments: list[str] = Field(
        default_factory=list, description="Open commitments user made to this attendee"
    )


class NotionOpenItems(BaseModel):
    """Categorized open items from Notion task/action-item databases."""
    you_owe: list[dict] = Field(
        default_factory=list,
        description="Open items assigned to user relating to attendees. Keys: title, assignee, due_date, status, source, related_attendee"
    )
    owed_to_you: list[dict] = Field(
        default_factory=list,
        description="Open items assigned to attendees the user is waiting on"
    )
    shared: list[dict] = Field(
        default_factory=list,
        description="Items with ambiguous or shared ownership"
    )


class NotionData(BaseModel):
    """Structured output from the Notion CRM gatherer."""
    attendees: list[NotionAttendeeContext] = Field(default_factory=list)
    open_items: NotionOpenItems = Field(default_factory=NotionOpenItems)
    prep_notes_db_id: Optional[str] = Field(None, description="Discovered/created Prep Notes DB ID")


class NotionMetadata(BaseModel):
    """Metadata about the Notion search."""
    records_found: int = Field(0)
    attendees_processed: int = Field(0)
    attendees_matched: int = Field(0)
    databases_discovered: dict[str, Optional[str]] = Field(
        default_factory=dict,
        description="IDs of discovered databases: contacts, companies, deals, communications, meeting_notes, action_items, prep_notes"
    )
    past_meeting_notes_found: int = Field(0)
    open_items_found: int = Field(0)
    warnings: list[str] = Field(default_factory=list)
```

### 3.6 Drive Gatherer Models

```python
class DriveDocument(BaseModel):
    """Relevant document from Google Drive."""
    file_name: str = Field(..., description="Document title")
    file_type: Literal["Doc", "Sheet", "Slides", "PDF", "Other"] = Field(
        ..., description="Normalized file type"
    )
    last_modified: datetime = Field(..., description="Last modification timestamp")
    url: str = Field(..., description="Direct Drive link")
    relevance: str = Field(..., max_length=120, description="One-sentence relevance explanation")


class DriveData(BaseModel):
    """Structured output from the Drive gatherer."""
    document_count: int = Field(0, ge=0, description="Number of documents returned")
    documents: list[DriveDocument] = Field(
        default_factory=list, description="Top 3 relevant documents"
    )


class DriveMetadata(BaseModel):
    """Metadata about the Drive search."""
    search_queries_used: list[str] = Field(default_factory=list)
    lookback_months: int = Field(6)
    total_results_found: int = Field(0)
    results_returned: int = Field(0)
    truncated: bool = Field(False)
```

### 3.7 Gatherer Result Envelope

```python
class GathererResult(BaseModel):
    """Envelope wrapping every gatherer's output."""
    source: str = Field(
        ...,
        description="Source identifier: google_calendar, gmail, notion, drive"
    )
    status: GathererStatus = Field(..., description="Execution status")
    data: Optional[CalendarEvent | GmailData | NotionData | DriveData] = Field(
        None, description="Typed gatherer output; None when status is unavailable/error/timeout"
    )
    metadata: Optional[dict] = Field(
        None, description="Gatherer-specific metadata"
    )
    error_message: Optional[str] = Field(None, description="Error details when status is error or timeout")
    duration_ms: Optional[int] = Field(None, ge=0, description="Node execution time in milliseconds")
```

### 3.8 Synthesis Output Models

```python
class AttendeeProfile(BaseModel):
    """Merged attendee profile from all gatherer outputs."""
    name: str = Field(..., description="Display name")
    email: str = Field(..., description="Email address")
    rsvp: RSVPStatus = Field(...)
    internal: bool = Field(...)
    is_organizer: bool = Field(False)
    # CRM data (from notion gatherer)
    match_type: Literal["exact", "name", "company", "none"] = Field("none")
    role: Optional[str] = Field(None)
    company: Optional[str] = Field(None)
    company_status: Optional[str] = Field(None)
    contact_type: Optional[str] = Field(None)
    relationship_status: Optional[RelationshipStatus] = Field(None)
    # Email data (from gmail gatherer)
    thread_count: int = Field(0)
    last_interaction_date: Optional[datetime] = Field(None)
    last_interaction_summary: Optional[str] = Field(None)
    sentiment_flags: list[str] = Field(default_factory=list)
    # CRM deals
    active_deals: list[Deal] = Field(default_factory=list)
    # Prior meetings
    past_meetings_count: int = Field(0)
    past_meetings: list[PastMeeting] = Field(default_factory=list)
    # Pending items
    unanswered_emails: list[UnansweredEmail] = Field(default_factory=list)
    open_commitments: list[str] = Field(default_factory=list)


class AgendaItem(BaseModel):
    """Single agenda item."""
    text: str = Field(..., description="Agenda item text")
    source: Literal["explicit", "inferred", "delta"] = Field(
        ..., description="How this item was derived"
    )


class OpenItem(BaseModel):
    """Single open item in any category."""
    description: str = Field(..., description="Item description")
    person: str = Field(..., description="Related attendee name")
    days_waiting: Optional[int] = Field(None, description="Days since item was created/promised")
    source: str = Field(..., description="Source: gmail, notion, or both")


class OpenItems(BaseModel):
    """Categorized open items across all sources, deduplicated."""
    you_owe: list[OpenItem] = Field(default_factory=list)
    owed_to_you: list[OpenItem] = Field(default_factory=list)
    shared: list[OpenItem] = Field(default_factory=list)
    resolved: list[OpenItem] = Field(
        default_factory=list,
        description="Resolved since last meeting (recurring meetings only, limit 5)"
    )


class TalkingPoint(BaseModel):
    """Single talking point in the discussion guide."""
    number: int = Field(..., ge=1, le=5, description="Priority order")
    action_verb: str = Field(..., description="Leading action verb: Confirm, Review, Discuss, Propose, Ask, etc.")
    topic: str = Field(..., description="Topic headline")
    context: str = Field(..., description="1-2 sentence context and rationale")


class DoNotMentionItem(BaseModel):
    """Item to avoid discussing in this meeting."""
    topic: str = Field(..., description="Topic to avoid")
    rationale: str = Field(..., description="Why this should not be mentioned")


class NextStep(BaseModel):
    """Proposed next step for meeting close."""
    action: str = Field(..., description="Verb + object")
    owner: str = Field(..., description="Named owner (not 'someone')")
    deadline: str = Field(..., description="Specific date or 'by next [cadence]'")


class DiscussionGuide(BaseModel):
    """Framework-based discussion guide for the meeting."""
    framework: TalkingPointFramework = Field(..., description="Selected framework")
    meeting_type: MeetingType = Field(..., description="Meeting type driving framework selection")
    opener: str = Field(..., description="1-2 sentence suggested opener")
    talking_points: list[TalkingPoint] = Field(..., min_length=2, max_length=5, description="3-5 talking points (2 for <=15 min meetings)")
    do_not_mention: list[DoNotMentionItem] = Field(
        default_factory=list,
        description="Topics to avoid. Omit section entirely if empty."
    )
    proposed_next_steps: list[NextStep] = Field(..., min_length=2, max_length=3, description="2-3 concrete next steps")
    close: str = Field(..., description="1-sentence meeting close")


class PipelineExecution(BaseModel):
    """Pipeline execution metadata for team mode."""
    total_duration_ms: int = Field(..., description="Total pipeline duration")
    node_timings: dict[str, int] = Field(default_factory=dict, description="Per-node execution time in ms")
    sources_used: list[str] = Field(default_factory=list)
    sources_failed: list[str] = Field(default_factory=list)
    sources_unavailable: list[str] = Field(default_factory=list)
    gatherer_success_rate: float = Field(0.0, description="Fraction of gatherers that returned data")
    cache_hit: bool = Field(False)
    cache_written: bool = Field(False)
    errors: list[str] = Field(default_factory=list)
```

### 3.9 Top-Level Response Model

```python
class MeetingPrepResult(BaseModel):
    """Top-level API response: the complete meeting prep document."""
    event: CalendarEvent = Field(..., description="Calendar event with classification and scoring")
    attendee_profiles: list[AttendeeProfile] = Field(
        default_factory=list,
        description="Merged profiles ordered: external first, then internal; seniority desc, then alpha"
    )
    agenda: list[AgendaItem] = Field(default_factory=list, description="Explicit + inferred agenda items")
    open_items: OpenItems = Field(default_factory=OpenItems, description="Categorized, deduplicated open items")
    related_documents: list[DriveDocument] = Field(default_factory=list, description="Top 3 Drive docs")
    discussion_guide: DiscussionGuide = Field(..., description="Framework-based talking points and structure")
    prep_recommendations: list[str] = Field(
        default_factory=list,
        description="3-5 tailored preparation recommendations based on meeting type"
    )
    sources_used: list[str] = Field(default_factory=list, description="Sources that returned data")
    generated_at: datetime = Field(..., description="Timestamp of generation")
    notion_page_url: Optional[str] = Field(None, description="URL of created/updated Notion prep page")
    pipeline_execution: Optional[PipelineExecution] = Field(
        None, description="Execution metadata (team mode only)"
    )
```

### 3.10 Cache and State Models

```python
class CacheInfo(BaseModel):
    """Cache status for the current prep."""
    from_cache: bool = Field(False, description="Whether result was served from cache")
    cache_key: Optional[str] = Field(None, description="Redis key or Notion page ID")
    cached_at: Optional[datetime] = Field(None, description="When cache entry was written")
    ttl_seconds: int = Field(3600, description="Cache TTL in seconds (1 hour)")
    cache_source: Optional[str] = Field(None, description="Cache backend: redis, notion, sqlite")


class MeetingPrepState(BaseModel):
    """
    LangGraph state object. Flows through all nodes.
    Each node reads and writes specific fields.
    """

    # --- Input (set by API handler before graph invocation) ---
    event_id: Optional[str] = Field(None, description="Target calendar event ID")
    date: Optional[str] = Field(None, description="Target date for discovery/batch mode")
    refresh: bool = Field(False, description="Bypass cache")
    lookback_hours: int = Field(2160, description="Email lookback window in hours (default 90 days)")
    output: Literal["notion", "chat", "both"] = Field("both", description="Output destination")
    skip_internal: bool = Field(False, description="Skip internal-sync in batch mode")

    # --- Validation results (set by validate_input node) ---
    mode: Literal["single", "discovery", "batch"] = Field("single", description="Resolved operation mode")
    resolved_event_ids: list[str] = Field(default_factory=list, description="Event IDs to process")

    # --- Cache check results (set by check_cache node) ---
    cache_hit: bool = Field(False, description="Whether a fresh cache entry was found")
    cached_prep: Optional[MeetingPrepResult] = Field(None, description="Cached prep if cache_hit is True")
    cache_info: CacheInfo = Field(default_factory=CacheInfo)

    # --- Gatherer results (each set by its respective gather_* node) ---
    calendar_result: Optional[GathererResult] = Field(None, description="Calendar agent output")
    email_result: Optional[GathererResult] = Field(None, description="Gmail agent output")
    crm_result: Optional[GathererResult] = Field(None, description="Notion CRM agent output")
    drive_result: Optional[GathererResult] = Field(None, description="Drive agent output")

    # --- Synthesis output (set by synthesize_prep node) ---
    prep_result: Optional[MeetingPrepResult] = Field(None, description="Assembled meeting prep document")

    # --- Post-processing metadata ---
    cache_written: bool = Field(False, description="Whether cache was updated")
    notion_page_url: Optional[str] = Field(None, description="Created/updated Notion page URL")

    # --- Pipeline metadata ---
    sources_used: list[str] = Field(default_factory=list, description="Sources that returned data")
    sources_failed: list[str] = Field(default_factory=list, description="Sources that errored")
    sources_unavailable: list[str] = Field(default_factory=list, description="Sources not configured")
    started_at: Optional[datetime] = Field(None, description="Pipeline start time")
    completed_at: Optional[datetime] = Field(None, description="Pipeline completion time")
    total_duration_ms: Optional[int] = Field(None, description="Total pipeline duration")
    node_timings: dict[str, int] = Field(default_factory=dict, description="Per-node execution time in ms")
    errors: list[str] = Field(default_factory=list, description="Non-fatal errors encountered")
```

---

## 4. LangGraph Node Definitions

### 4.1 `validate_input`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Validate request params, resolve event_id, determine operation mode |
| **Input fields read** | `event_id`, `date`, `skip_internal` |
| **Output fields written** | `mode`, `resolved_event_ids`, `started_at`, `date` |
| **Tools used** | `CalendarClient.get_event`, `CalendarClient.list_events` |
| **LLM used** | None |
| **Timeout** | 10s |

Logic:
1. Record `started_at = datetime.utcnow()`.
2. If `event_id` is provided: set `mode="single"`, `resolved_event_ids=[event_id]`.
3. If `event_id` is None and `date` is provided: set `mode="batch"`.
   - Fetch all events for the given date using `CalendarClient.list_events`.
   - Apply event filtering rules: exclude cancelled, declined (batch mode), focus/OOO blocks, solo events, past events.
   - If `skip_internal=True`, exclude events where all attendees share the user's org domain and the event is recurring.
   - Set `resolved_event_ids` to the filtered list of event IDs.
4. If neither `event_id` nor `date` is provided: set `mode="discovery"`, `date=today`.
   - Fetch remaining events for today using `CalendarClient.list_events` with `time_min=now`.
   - Apply same filtering rules as batch mode.
   - Set `resolved_event_ids` to the filtered list.
5. If no events found after filtering, set `resolved_event_ids=[]` and append an info message to `errors`.

### 4.2 `check_cache`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Check Redis (then Notion) for an existing fresh prep before dispatching gatherers |
| **Input fields read** | `resolved_event_ids`, `refresh`, `date` |
| **Output fields written** | `cache_hit`, `cached_prep`, `cache_info` |
| **Tools used** | `RedisClient.get`, `NotionClient.query_database` |
| **LLM used** | None |
| **Timeout** | 5s |

Logic:
1. If `refresh=True`, skip cache and set `cache_hit=False`.
2. For the first event in `resolved_event_ids` (single mode), build cache key: `meeting_prep:{event_id}:{date}`.
3. Try Redis: `GET meeting_prep:{event_id}:{date}`. If found and age < 1h, deserialize into `cached_prep`, set `cache_hit=True`, `cache_info.cache_source="redis"`.
4. If Redis miss, try Notion: query "Meeting Prep Autopilot - Prep Notes" DB for matching Event ID. If found and `Generated At` < 1h, set `cache_hit=True`, `cache_info.cache_source="notion"`.
5. If no cache hit, set `cache_hit=False`.
6. For batch mode, cache check runs per-event inside the batch orchestration loop (Section 5.4).

### 4.3 `gather_calendar`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Fetch event details, classify meeting type, score importance, extract attendees |
| **Input fields read** | `resolved_event_ids` (first entry), `mode` |
| **Output fields written** | `calendar_result` |
| **Tools used** | `CalendarClient.get_event`, `CalendarClient.list_events` |
| **LLM used** | Z.ai GLM-5 (meeting type classification, agenda inference) |
| **Timeout** | 30s |

Logic:
1. Check if Calendar API credentials are configured. If not, return `GathererResult(source="google_calendar", status="unavailable")`.
2. Fetch the target event by event_id via `CalendarClient.get_event`.
3. Apply Event Identity Resolution per the meeting-context skill:
   - Extract all required fields: event_id, title (fallback "[No Title]"), start_time (abort if missing), end_time (fallback start+30min with `end_estimated=True`), duration_minutes, attendees, location, description, recurrence, organizer.
4. Apply Event Filtering Rules: reject cancelled events, warn on declined, flag tentative, skip focus/OOO blocks, skip solo events, flag past events.
5. Classify meeting type using specificity order: external-client > one-on-one > ad-hoc > recurring > group-meeting > internal-sync. Use GLM-5 for ambiguous cases.
6. Score importance (1-5) via four weighted factors:
   - Attendee seniority (0.30): 5=C-suite/VP, 4=Director, 3=Manager, 2=IC, 1=Unknown.
   - External vs internal (0.25): 5=External client, 3=Cross-team, 1=Same-team.
   - New vs recurring (0.25): 5=First meeting, 3=Ad-hoc known contacts, 1=Recurring.
   - Deal proximity (0.20): 5=Negotiation/Proposal, 3=Qualified/Lead, 1=No deal.
   - Set `priority=True` when score >= 4.
7. Extract attendee identities: name, email, RSVP, internal/external, is_organizer. For 10+ attendees, set `profile_priority="full"` on top 5 (external first, then organizer, then alpha), `"minimal"` on rest.
8. Infer agenda from title and description. Mark inferred items with "[Inferred]". For recurring meetings, add "[Inferred] Review items from last occurrence".
9. Detect scheduling conflicts by checking adjacent events.
10. For recurring meetings, detect attendee changes vs series definition.
11. Package into `GathererResult(source="google_calendar", status="complete", data=CalendarEvent(...))`.

### 4.4 `gather_email`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Search Gmail threads per attendee, extract per-attendee email context |
| **Input fields read** | `calendar_result` (for attendee list), `lookback_hours` |
| **Output fields written** | `email_result` |
| **Tools used** | `GmailClient.search_threads`, `GmailClient.get_thread` |
| **LLM used** | Z.ai GLM-5 (thread summarization, sentiment signal extraction) |
| **Timeout** | 30s |

Logic:
1. Check if Gmail API credentials are configured. If not, return `GathererResult(source="gmail", status="unavailable")`.
2. Extract attendee list from `calendar_result.data.attendees` if available. If no attendees, return empty result.
3. Calculate lookback window from `lookback_hours` (default 2160h = 90 days).
4. For each attendee, search Gmail using `from:{email} OR to:{email}`:
   - Extract thread_count, last_interaction (date + 100-char summary via GLM-5), unanswered_emails (threads where attendee sent last message), recent_topics (3 most recent subjects), sentiment_indicators (keyword matches: urgent, disappointed, escalation, overdue, issue, problem, concerned in last 30 days).
5. Deduplicate threads: represent each thread once using the most recent message.
6. Compile summary_stats: total processed, with/without history, total threads, total unanswered.
7. Package into `GathererResult(source="gmail", status="complete", data=GmailData(...))`.

**Note on dependency:** `gather_email` reads `calendar_result` for the attendee list. In the parallel dispatch via Send(), the calendar gatherer result is available because all gatherers read from shared state. If `calendar_result` is None at execution time (calendar still running), the email gatherer retries once after a 2s delay, then falls back to an empty attendee list.

### 4.5 `gather_crm`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Search Notion CRM for attendee profiles, past meeting notes, open action items |
| **Input fields read** | `calendar_result` (for attendee list) |
| **Output fields written** | `crm_result` |
| **Tools used** | `NotionClient.search_databases`, `NotionClient.query_database`, `NotionClient.get_page` |
| **LLM used** | Z.ai GLM-5 (decision/open-item extraction from unstructured meeting notes) |
| **Timeout** | 30s |

Logic:
1. Check if Notion API is configured. If not, return `GathererResult(source="notion", status="unavailable")`.
2. Discover CRM databases by searching Notion for "Contacts", "Companies", "Deals", "Communications", "Meeting Notes", "Action Items" titles.
3. For each attendee from `calendar_result.data.attendees`:
   - **CRM Contact Lookup**: Search Contacts by email (exact) -> display name (case-insensitive partial) -> email domain against Companies. Record match confidence: exact/name/company/none.
   - If contact match found: extract role, company (follow relation), contact_type, relationship_status (computed from last interaction: Active <30d, Cooling 30-90d, Dormant >90d, New), deals (active only), last CRM interaction, communication_depth.
   - **Past Meeting Notes**: Search Notion pages for attendee name, company, deal names. Extract 3 most recent meeting notes with action items, decisions, outcomes. Compile open commitments.
4. **Open Action Items**: Search task databases for items involving any attendee. Categorize into you_owe / owed_to_you / shared.
5. **Lazy-create Prep Notes DB** if not found: "Meeting Prep Autopilot - Prep Notes" with schema: Event ID (title), Meeting Title (rich_text), Date (date), Attendees (rich_text), Sources Used (multi_select), Prep Page (url), Generated At (date), Meeting Type (select), Importance Score (number).
6. Package into `GathererResult(source="notion", status="complete", data=NotionData(...))`.

### 4.6 `gather_drive`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Search Google Drive for documents relevant to the meeting (optional gatherer) |
| **Input fields read** | `calendar_result` (for meeting title, attendee companies) |
| **Output fields written** | `drive_result` |
| **Tools used** | `DriveClient.search_files` |
| **LLM used** | Z.ai GLM-5 (relevance scoring, relevance sentence generation) |
| **Timeout** | 30s |

Logic:
1. Check if Drive API credentials are configured. If not, return `GathererResult(source="drive", status="unavailable")`.
2. Build 2-3 search queries from meeting context:
   - Key phrases from meeting title (strip generic words: meeting, sync, call, weekly, monthly).
   - Attendee company names from email domains or CRM context.
   - Deal or project names if available from CRM data.
3. Search Drive for each query, filtered to files modified within last 6 months, excluding Trash.
4. Deduplicate results across queries (by file ID), rank by: multiple query matches > last modified date > attendee-shared.
5. Select top 3 results. For each: extract file_name, file_type (Doc/Sheet/Slides/PDF/Other), last_modified, url.
6. Generate per-document relevance sentence (max 120 chars) using GLM-5.
7. Package into `GathererResult(source="drive", status="complete", data=DriveData(...))`.

### 4.7 `synthesize_prep`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Merge all gatherer outputs into the meeting prep document with framework-based talking points |
| **Input fields read** | `calendar_result`, `email_result`, `crm_result`, `drive_result` |
| **Output fields written** | `prep_result`, `sources_used`, `sources_failed`, `sources_unavailable` |
| **Tools used** | None (pure computation + LLM synthesis) |
| **LLM used** | Claude API (primary) -- handles nuanced synthesis, framework selection, talking point generation, conflict resolution |
| **Timeout** | 45s |

Logic:
1. **Classify gatherer results** into sources_used / sources_failed / sources_unavailable.
2. **Enforce minimum threshold:**
   - Calendar MUST have succeeded. If not, set `prep_result=None`, append error "Calendar data is required", return.
   - At least 1 of email or crm must have succeeded (Drive does not count). If only calendar + drive, set `prep_result=None`, append error "Calendar + 1 enrichment source required", return.
3. **Build attendee profiles** by merging:
   - Calendar: name, email, RSVP, internal/external, organizer status.
   - CRM (if available): role, company, contact_type, relationship_status, deals, past meetings.
   - Gmail (if available): thread_count, last_interaction, unanswered_emails, sentiment_indicators.
   - Order: external attendees first, then internal. Within each group: by seniority desc, then alpha.
   - For 10+ attendees: full profiles for top 5, rest as summary.
4. **Build agenda** from:
   - Explicit items from event description.
   - Inferred items from email threads and Notion notes (marked "[Inferred]").
   - For recurring meetings: delta items marked "[New since last meeting]".
5. **Compile open items** into four categories (you_owe, owed_to_you, shared, resolved).
   - Deduplicate across Gmail and Notion by matching action verb + subject phrase.
   - When item appears in both sources, keep richer version, note both sources.
6. **Select talking point framework** based on meeting type:
   - external-client -> SPIN, one-on-one -> GROW, internal-sync -> SBI, ad-hoc -> Context-Gathering, recurring -> Delta-Based, group-meeting -> Contribution Mapping.
   - When no context data available, fall back to Context-Gathering regardless of type.
7. **Generate discussion guide** via Claude API:
   - Generate opener tailored to meeting type and relationship status.
   - Generate 3-5 talking points (2 for meetings <= 15 min). Each starts with action verb.
   - Apply deal stage adjustments, relationship status adjustments, unanswered item escalation.
   - Generate "Do NOT Mention" items when applicable (active negotiation, unconfirmed info, sensitive personnel, premature announcements, cooling/dormant relationships, lost deals).
   - Generate 2-3 proposed next steps with owner and deadline.
   - Generate 1-sentence meeting close.
8. **Generate prep recommendations** (3-5) tailored to meeting type.
9. **Assemble `MeetingPrepResult`** with all sections.

**Decision matrix for partial data:**

| Scenario | Action |
|----------|--------|
| All 4 gatherers succeed | Full prep document |
| Calendar + Gmail + CRM succeed, Drive fails | Full document, "Drive not connected" note |
| Calendar + Gmail succeed, CRM + Drive fail | Partial: email-based profiles, email-based open items |
| Calendar + CRM succeed, Gmail + Drive fail | Partial: CRM-based profiles, Notion-based open items |
| Calendar + Drive only | **Fail.** Minimum enrichment not met |
| Calendar only | **Fail.** Minimum enrichment not met |
| Calendar fails | **Fail.** Calendar is mandatory |

### 4.8 `cache_result`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Persist the synthesized prep to Redis and Notion for future cache hits |
| **Input fields read** | `prep_result`, `cache_hit`, `output` |
| **Output fields written** | `cache_written`, `cache_info`, `notion_page_url` |
| **Tools used** | `RedisClient.setex`, `NotionClient.create_page`, `NotionClient.update_page` |
| **LLM used** | None |
| **Timeout** | 10s |

Logic:
1. Skip if `cache_hit=True` (prep was served from cache).
2. Skip if `prep_result` is None (pipeline failed).
3. Serialize prep to JSON.
4. Write to Redis: `SETEX meeting_prep:{event_id}:{date} 3600 {json}` (1h TTL).
5. If `output` is "notion" or "both":
   - Create (or update) a Notion page with the full prep document content.
   - Write (or update) a row in "Meeting Prep Autopilot - Prep Notes" tracking database.
   - Deduplication: query by Event ID (title). If exists, update. If not, create.
   - Set `notion_page_url` to the page URL.
6. Set `cache_written=True`, update `cache_info`.
7. On failure: set `cache_written=False`, append error to `errors`. Do not fail pipeline.

### 4.9 `format_response`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Build the final API response, add pipeline execution metadata |
| **Input fields read** | `prep_result`, `cached_prep`, `cache_hit`, `cache_info`, `node_timings`, all pipeline metadata |
| **Output fields written** | `completed_at`, `total_duration_ms` |
| **Tools used** | None |
| **LLM used** | None |
| **Timeout** | 5s |

Logic:
1. Record `completed_at = datetime.utcnow()`.
2. Calculate `total_duration_ms`.
3. If `cache_hit`, return `cached_prep` directly.
4. If `prep_result` is not None:
   - Attach `pipeline_execution` metadata.
   - Attach `notion_page_url` from cache_result.
   - Return the complete `MeetingPrepResult`.
5. If `prep_result` is None (pipeline failed):
   - Return error response with `errors` list and troubleshooting guidance.

---

## 5. Edge Topology

### 5.1 Graph Structure

```
START
  |
  v
validate_input
  |
  v
check_cache
  |
  +-- [cache_hit=True] --------------------------------> format_response --> END
  |
  +-- [cache_hit=False]
        |
        v
    fan_out (via Send)
        |
        +-- gather_calendar ---+
        +-- gather_email ------+  (4 parallel branches)
        +-- gather_crm --------+
        +-- gather_drive ------+
                               |
                               v
                     [evaluate_gatherers]
                               |
          +--------------------+-------------------+
          |                                        |
    [minimum met]                         [minimum NOT met]
          |                                        |
          v                                        v
    synthesize_prep                          format_response
          |                                   (error state)
          v                                        |
    cache_result                                   v
          |                                       END
          v
    format_response
          |
          v
         END
```

### 5.2 Conditional Edge Logic

```python
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send


def route_after_cache(state: MeetingPrepState) -> str | list[Send]:
    """Conditional edge after check_cache."""
    if state.cache_hit:
        return "format_response"

    # Fan out to all 4 gatherers in parallel via Send()
    return [
        Send("gather_calendar", state),
        Send("gather_email", state),
        Send("gather_crm", state),
        Send("gather_drive", state),
    ]


def route_after_gatherers(state: MeetingPrepState) -> str:
    """
    Conditional edge after all gatherers complete.
    Enforces: calendar MUST succeed + min 1 of email/crm.
    """
    cal = state.calendar_result
    email = state.email_result
    crm = state.crm_result

    # Calendar is mandatory
    if cal is None or cal.status != GathererStatus.COMPLETE:
        state.errors.append(
            "Calendar data is required. Check Google Calendar API credentials."
        )
        return "format_response"

    # At least 1 enrichment source (email or crm) must succeed
    email_ok = email is not None and email.status == GathererStatus.COMPLETE
    crm_ok = crm is not None and crm.status == GathererStatus.COMPLETE

    if not email_ok and not crm_ok:
        state.errors.append(
            "Calendar + at least 1 enrichment source (Gmail or Notion) required. "
            "Check MCP server configuration."
        )
        return "format_response"

    return "synthesize_prep"


def build_graph() -> StateGraph:
    graph = StateGraph(MeetingPrepState)

    # Add nodes
    graph.add_node("validate_input", validate_input_node)
    graph.add_node("check_cache", check_cache_node)
    graph.add_node("gather_calendar", gather_calendar_node)
    graph.add_node("gather_email", gather_email_node)
    graph.add_node("gather_crm", gather_crm_node)
    graph.add_node("gather_drive", gather_drive_node)
    graph.add_node("synthesize_prep", synthesize_prep_node)
    graph.add_node("cache_result", cache_result_node)
    graph.add_node("format_response", format_response_node)

    # Edges
    graph.add_edge(START, "validate_input")
    graph.add_edge("validate_input", "check_cache")
    graph.add_conditional_edges("check_cache", route_after_cache)

    # All gatherers converge to evaluation
    graph.add_conditional_edges("gather_calendar", route_after_gatherers)
    graph.add_conditional_edges("gather_email", route_after_gatherers)
    graph.add_conditional_edges("gather_crm", route_after_gatherers)
    graph.add_conditional_edges("gather_drive", route_after_gatherers)

    # Post-synthesis pipeline
    graph.add_edge("synthesize_prep", "cache_result")
    graph.add_edge("cache_result", "format_response")
    graph.add_edge("format_response", END)

    return graph.compile()
```

### 5.3 Parallel Gatherer Join Behavior

LangGraph's `Send()` dispatches all four gatherers concurrently. The conditional edge `route_after_gatherers` executes only after all four `Send` branches complete (or time out). Each gatherer writes to its own state field (`calendar_result`, `email_result`, `crm_result`, `drive_result`), so there are no write conflicts.

If a gatherer times out (30s), its result field remains `None`. The `route_after_gatherers` function treats `None` as a failed gatherer when evaluating the minimum threshold.

### 5.4 Batch Mode Orchestration

For batch prep-today mode, the outer API handler iterates over `resolved_event_ids` and invokes the graph once per event. Per-event results are collected into a `BatchPrepResponse`:

```python
class BatchPrepResponse(BaseModel):
    """Response for prep-today batch mode."""
    date: str = Field(..., description="Date processed")
    total_events: int = Field(0)
    events_prepped: int = Field(0)
    events_skipped: int = Field(0, description="Skipped due to filtering or errors")
    events_cached: int = Field(0, description="Served from cache")
    preps: list[MeetingPrepResult] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
```

Batch mode reuses attendee context across events when the same attendee appears in multiple meetings (attendee cache keyed by email, valid for the batch run duration).

---

## 6. Tool Definitions

Native Python SDK wrappers. These are NOT MCP tools; they are thin service clients initialized with credentials at startup.

### 6.1 CalendarClient

```python
class CalendarClient:
    """Wrapper around Google Calendar API."""

    def __init__(self, credentials: Credentials): ...

    async def get_event(
        self,
        event_id: str,
        *,
        calendar_id: str = "primary",
    ) -> dict:
        """
        Retrieve a single calendar event by ID.
        Returns event object: id, summary, start, end, attendees,
        recurrence, organizer, location, description, conferenceData.
        """
        ...

    async def list_events(
        self,
        *,
        calendar_id: str = "primary",
        time_min: str | None = None,
        time_max: str | None = None,
        q: str | None = None,
        max_results: int = 250,
        single_events: bool = True,
        order_by: str = "startTime",
    ) -> list[dict]:
        """
        List events from a calendar within a time range.
        Used for discovery mode and conflict detection.
        Returns list of event objects sorted by start time.
        """
        ...
```

### 6.2 GmailClient

```python
class GmailClient:
    """Wrapper around Google Gmail API."""

    def __init__(self, credentials: Credentials): ...

    async def search_threads(
        self,
        query: str,
        *,
        max_results: int = 50,
        after: str | None = None,
        before: str | None = None,
    ) -> list[dict]:
        """
        Search Gmail threads matching the query.
        Query uses Gmail search syntax: from:, to:, subject:, after:, before:.
        Returns list of thread metadata: id, snippet, historyId.
        """
        ...

    async def get_thread(
        self, thread_id: str, *, format: str = "metadata"
    ) -> dict:
        """
        Retrieve a full thread by ID.
        format: 'minimal', 'metadata', or 'full'.
        Returns messages array with headers, labels, dates.
        """
        ...

    async def get_message(
        self, message_id: str, *, format: str = "full"
    ) -> dict:
        """
        Retrieve a single message by ID.
        Returns headers, body, attachments metadata.
        """
        ...
```

### 6.3 NotionClient

```python
class NotionClient:
    """Wrapper around notion-client SDK for CRM and prep note operations."""

    def __init__(self, auth_token: str): ...

    async def search_databases(
        self, query: str, *, filter_type: str = "database"
    ) -> list[dict]:
        """
        Search Notion for databases matching the query string.
        Used for dynamic CRM database discovery and Prep Notes DB lookup.
        Returns list of database objects with id, title, properties.
        """
        ...

    async def query_database(
        self,
        database_id: str,
        *,
        filter: dict | None = None,
        sorts: list[dict] | None = None,
        page_size: int = 100,
        start_cursor: str | None = None,
    ) -> dict:
        """
        Query a Notion database with optional filter and sort.
        Returns paginated results with 'results' and 'next_cursor'.
        """
        ...

    async def search_pages(
        self, query: str, *, filter_type: str = "page"
    ) -> list[dict]:
        """
        Search Notion pages by text content.
        Used for finding meeting notes mentioning attendees.
        """
        ...

    async def get_page(
        self, page_id: str, *, include_children: bool = False
    ) -> dict:
        """
        Retrieve a Notion page by ID. Optionally fetches child blocks
        for extracting meeting note content.
        """
        ...

    async def create_database(
        self,
        parent_page_id: str,
        title: str,
        properties: dict,
    ) -> dict:
        """
        Create a new Notion database under the given parent page.
        Used for lazy-creating the Prep Notes DB.
        """
        ...

    async def create_page(
        self,
        database_id: str,
        properties: dict,
        *,
        children: list[dict] | None = None,
    ) -> dict:
        """
        Create a new page in a Notion database.
        Used for creating prep document pages and tracking entries.
        """
        ...

    async def update_page(
        self, page_id: str, properties: dict
    ) -> dict:
        """
        Update properties on an existing Notion page.
        Used for idempotent prep updates on re-runs.
        """
        ...
```

### 6.4 DriveClient

```python
class DriveClient:
    """Wrapper around Google Drive API."""

    def __init__(self, credentials: Credentials): ...

    async def search_files(
        self,
        query: str,
        *,
        max_results: int = 50,
        fields: str = "files(id,name,mimeType,modifiedTime,owners,permissions,webViewLink)",
    ) -> list[dict]:
        """
        Search Drive files using Drive API query syntax.
        query: e.g. "name contains 'Acme Corp' and modifiedTime > '2025-09-01T00:00:00'"
        Returns list of file metadata objects.
        """
        ...
```

### 6.5 RedisClient

```python
class RedisClient:
    """Async Redis wrapper for prep caching."""

    def __init__(self, url: str = "redis://localhost:6379/0"): ...

    async def get(self, key: str) -> str | None:
        """Get a cached value by key. Returns None if not found or expired."""
        ...

    async def setex(self, key: str, ttl_seconds: int, value: str) -> bool:
        """Set a key with expiration. Returns True on success."""
        ...

    async def delete(self, key: str) -> bool:
        """Delete a cache key. Returns True if key existed."""
        ...
```

---

## 7. Multi-Provider LLM Configuration

### 7.1 Provider Allocation

| Node | Provider | Model | Rationale |
|------|----------|-------|-----------|
| `validate_input` | None | -- | No LLM needed |
| `check_cache` | None | -- | No LLM needed |
| `gather_calendar` | Z.ai | GLM-5 | Meeting type classification, agenda inference |
| `gather_email` | Z.ai | GLM-5 | Thread summarization, sentiment signal extraction |
| `gather_crm` | Z.ai | GLM-5 | Decision/open-item extraction from unstructured notes, fuzzy name matching |
| `gather_drive` | Z.ai | GLM-5 | Relevance scoring, relevance sentence generation |
| `synthesize_prep` | Claude | claude-sonnet-4-20250514 | Complex multi-source synthesis, framework-based talking point generation, conflict resolution, discussion guide assembly |
| `cache_result` | None | -- | No LLM needed |
| `format_response` | None | -- | No LLM needed |

### 7.2 LLM Client Configuration

```python
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI


class LLMRouter:
    """Routes LLM calls to the appropriate provider with fallback."""

    def __init__(
        self,
        claude_api_key: str,
        zai_api_key: str,
        zai_base_url: str,
    ):
        self.claude = AsyncAnthropic(api_key=claude_api_key)
        self.zai = AsyncOpenAI(api_key=zai_api_key, base_url=zai_base_url)

    async def call_synthesis(self, messages: list[dict], **kwargs) -> str:
        """Claude for synthesis tasks. Falls back to Z.ai on 429/500."""
        try:
            response = await self.claude.messages.create(
                model="claude-sonnet-4-20250514",
                messages=messages,
                max_tokens=4096,
                **kwargs,
            )
            return response.content[0].text
        except Exception as e:
            if _is_retriable(e):
                return await self._zai_fallback(messages, **kwargs)
            raise

    async def call_extraction(self, messages: list[dict], **kwargs) -> str:
        """Z.ai GLM-5 for extraction tasks. Falls back to Claude on 429/500."""
        try:
            response = await self.zai.chat.completions.create(
                model="glm-5",
                messages=messages,
                max_tokens=2048,
                **kwargs,
            )
            return response.choices[0].message.content
        except Exception as e:
            if _is_retriable(e):
                return await self._claude_fallback(messages, **kwargs)
            raise

    async def _zai_fallback(self, messages, **kwargs) -> str:
        """Fallback: use Z.ai when Claude is unavailable."""
        response = await self.zai.chat.completions.create(
            model="glm-5", messages=messages, max_tokens=4096, **kwargs
        )
        return response.choices[0].message.content

    async def _claude_fallback(self, messages, **kwargs) -> str:
        """Fallback: use Claude when Z.ai is unavailable."""
        response = await self.claude.messages.create(
            model="claude-sonnet-4-20250514",
            messages=_convert_openai_to_anthropic(messages),
            max_tokens=2048,
            **kwargs,
        )
        return response.content[0].text


def _is_retriable(error: Exception) -> bool:
    """Check if error is a 429 (rate limit) or 5xx (server error)."""
    status = getattr(error, "status_code", None) or getattr(error, "status", None)
    if status is None:
        return False
    return status == 429 or (500 <= status < 600)
```

### 7.3 Temperature and Token Settings

| Task Type | Temperature | Max Tokens |
|-----------|-------------|------------|
| Extraction / classification (GLM-5) | 0.0 | 2048 |
| Thread summarization (GLM-5) | 0.2 | 1024 |
| Discussion guide synthesis (Claude) | 0.3 | 4096 |
| Talking point generation (Claude) | 0.3 | 2048 |
| Agenda inference (GLM-5) | 0.1 | 1024 |

---

## 8. Caching Strategy

### 8.1 Cache Key Design

```
Pattern:    meeting_prep:{event_id}:{date}
Example:    meeting_prep:abc123xyz:2026-03-05
Normalize:  event_id is used as-is (Calendar IDs are stable), date is YYYY-MM-DD
```

The compound key `{event_id}:{date}` ensures that recurring event instances on different dates get separate cache entries, while re-runs of the same event on the same date hit cache.

### 8.2 Three-Tier Cache Architecture

| Tier | Backend | TTL | Serialization | Use Case |
|------|---------|-----|---------------|----------|
| L1 | Redis | 1h (3600s) | JSON via `MeetingPrepResult.model_dump_json()` | Production primary cache |
| L2 | Notion "Prep Notes" DB | Permanent (no TTL, checked by Generated At) | Notion page with structured content | Human-readable archive, shared visibility |
| L3 | SQLite | 1h | JSON in `cache` table | Local development fallback |

### 8.3 Cache Read Flow

```
1. Check Redis (L1)
   +-- Hit + fresh (< 1h) --> return cached prep
   +-- Miss
        |
2. Check Notion (L2)
   +-- Hit + fresh (Generated At < 1h) --> return, backfill Redis
   +-- Miss or stale
        |
3. Cache miss --> proceed to gatherer fan-out
```

### 8.4 Cache Write Flow (post-synthesis)

```
1. Write to Redis (L1): SETEX with 3600s TTL
2. Write to Notion (L2):
   +-- Existing entry (Event ID match) --> update Prep Page, Sources Used, Generated At
   +-- New event --> create page with all properties
3. (Dev only) Write to SQLite (L3)
```

### 8.5 Cache Invalidation

- **TTL-based:** Redis keys expire after 1h automatically. Notion entries are considered stale when `Generated At` is older than 1h (checked at read time).
- **Explicit refresh:** `refresh=True` flag bypasses all caches and triggers a full re-gather. After synthesis, overwrites existing cache entries.
- **Event-specific:** Cache keys include event_id, so updating prep for one meeting does not affect others.

### 8.6 SQLite Schema (dev)

```sql
CREATE TABLE IF NOT EXISTS prep_cache (
    cache_key     TEXT PRIMARY KEY,       -- meeting_prep:{event_id}:{date}
    prep_json     TEXT NOT NULL,
    created_at    TEXT NOT NULL,           -- ISO-8601
    expires_at    TEXT NOT NULL            -- ISO-8601
);
```

### 8.7 Batch Mode Cache Behavior

In batch prep-today mode, each event is checked and cached independently. Additionally, attendee context (email threads, CRM profiles) is cached in-memory for the duration of the batch run to avoid redundant API calls when the same attendee appears in multiple meetings.

```python
class AttendeeCache:
    """In-memory attendee context cache for batch runs."""

    def __init__(self):
        self._email_context: dict[str, GmailAttendeeContext] = {}
        self._crm_context: dict[str, NotionAttendeeContext] = {}

    def get_email(self, email: str) -> GmailAttendeeContext | None:
        return self._email_context.get(email)

    def set_email(self, email: str, ctx: GmailAttendeeContext) -> None:
        self._email_context[email] = ctx

    def get_crm(self, email: str) -> NotionAttendeeContext | None:
        return self._crm_context.get(email)

    def set_crm(self, email: str, ctx: NotionAttendeeContext) -> None:
        self._crm_context[email] = ctx
```

---

## 9. Error Handling

### 9.1 Per-Node Timeout Enforcement

| Node | Timeout | On Timeout Behavior |
|------|---------|---------------------|
| `validate_input` | 10s | Return error: "Failed to resolve calendar events" |
| `check_cache` | 5s | Treat as cache miss, proceed to fan-out |
| `gather_calendar` | 30s | Set `calendar_result = GathererResult(status="timeout")` |
| `gather_email` | 30s | Set `email_result = GathererResult(status="timeout")` |
| `gather_crm` | 30s | Set `crm_result = GathererResult(status="timeout")` |
| `gather_drive` | 30s | Set `drive_result = GathererResult(status="timeout")` |
| `synthesize_prep` | 45s | Return partial prep with available data, note timeout in errors |
| `cache_result` | 10s | Set `cache_written=False`, log error, continue |
| `format_response` | 5s | Return raw prep_result without formatting metadata |

Timeouts are enforced via `asyncio.wait_for()` wrapping each node's execution.

### 9.2 Calendar Failure (Mandatory Source)

When the calendar gatherer fails, the entire pipeline short-circuits to `format_response` with an error:

```python
{
    "error": "Meeting prep generation failed",
    "reason": "Calendar data is required. The calendar event could not be retrieved.",
    "troubleshooting": [
        "Verify Google Calendar API credentials are configured",
        "Check that the event_id is valid and not cancelled",
        "Ensure OAuth2 token has calendar.readonly scope",
        "Re-run with --refresh flag after resolving"
    ],
    "sources_attempted": {
        "google_calendar": "error",
        "gmail": "complete",
        "notion": "complete",
        "drive": "unavailable"
    }
}
```

### 9.3 Minimum Enrichment Threshold Not Met

When calendar succeeds but neither Gmail nor Notion CRM succeeds:

```python
{
    "error": "Insufficient data for meeting prep",
    "reason": "Calendar + at least 1 enrichment source (Gmail or Notion) is required.",
    "sources_attempted": {
        "google_calendar": "complete",
        "gmail": "timeout",
        "notion": "unavailable",
        "drive": "complete"
    },
    "troubleshooting": [
        "Verify Gmail API credentials",
        "Verify Notion API token",
        "Check network connectivity",
        "Re-run with --refresh flag after resolving"
    ]
}
```

### 9.4 Gatherer Unavailability (Optional Sources)

When a gatherer detects its backing service is not configured:

```python
return GathererResult(
    source="drive",
    status=GathererStatus.UNAVAILABLE,
    data=None,
    metadata=None,
    error_message="Google Drive credentials not configured",
)
```

The `synthesize_prep` node records these in `sources_unavailable` and includes notes in the relevant prep sections (e.g., "Drive not connected -- document search skipped"). It distinguishes "unavailable" (service not configured) from "no data found" (service available but returned empty results).

### 9.5 Notion Page Write Failures

- **Prep page creation fails:** Fall back to outputting full prep document as formatted JSON/Markdown to the API response. Append: "Notion was unavailable. Prep returned in response body."
- **Tracking entry (Prep Notes DB) fails:** Still return the prep page URL (if page was created). Append warning: "Tracking entry could not be saved."
- **Lazy DB creation fails (permissions):** Continue pipeline. Set `prep_notes_db_id=None`, add warning to metadata.

### 9.6 Idempotent Re-runs

When prep is generated for an event that already has a Notion page and tracking entry:
- Update the existing page rather than creating a duplicate.
- Update the existing tracking entry.
- Note in output: "Updated existing prep for this meeting."

### 9.7 Partial Data Handling in Synthesis

The `synthesize_prep` node gracefully handles partial data at the section level:

| Section | Gmail Unavailable | Notion CRM Unavailable | Drive Unavailable |
|---------|-------------------|------------------------|-------------------|
| Attendees | No email history, thread counts, sentiment | No CRM profiles, deals, contact types | No impact |
| Agenda | Fewer inferred items | No Notion-based inferences | No impact |
| Open Items | Email-based items missing | Notion-based items missing | No impact |
| Related Documents | No impact | No impact | "Drive not connected" |
| Discussion Guide | Less context for talking points | Less context for talking points | No impact |
| Prep Recommendations | Less context | Less context | No impact |

For each missing source, the relevant section includes a note: "Warning: [Source Name] data unavailable. Check [API/MCP] configuration."

---

## 10. Observability

### 10.1 LangSmith Tracing

Every graph invocation is traced as a single LangSmith run with child spans per node.

```python
from langsmith import traceable

@traceable(name="P03-meeting-prep-autopilot", run_type="chain")
async def run_pipeline(request: MeetingPrepRequest) -> MeetingPrepState:
    graph = build_graph()
    state = MeetingPrepState(
        event_id=request.event_id,
        date=request.date,
        refresh=request.refresh,
        lookback_hours=request.hours or 2160,
        output=request.output,
        skip_internal=request.skip_internal,
    )
    return await graph.ainvoke(state)
```

Each node function is decorated with `@traceable(run_type="tool")` to create child spans. LLM calls within nodes are automatically traced by the anthropic and openai SDK integrations.

### 10.2 Structured Logging

All log entries use structlog with these standard fields:

```python
import structlog

logger = structlog.get_logger()

# Per-node logging pattern:
logger.info(
    "node_started",
    node="gather_calendar",
    event_id=state.event_id,
    trace_id=trace_id,
)

logger.info(
    "node_completed",
    node="gather_calendar",
    event_id=state.event_id,
    status="complete",
    meeting_type="external-client",
    importance_score=5,
    attendee_count=4,
    duration_ms=1234,
    trace_id=trace_id,
)

logger.warning(
    "node_failed",
    node="gather_drive",
    event_id=state.event_id,
    status="unavailable",
    reason="Google Drive credentials not configured",
    trace_id=trace_id,
)

logger.info(
    "minimum_threshold_check",
    calendar_ok=True,
    email_ok=True,
    crm_ok=False,
    drive_ok=False,
    minimum_met=True,
    trace_id=trace_id,
)

logger.info(
    "framework_selected",
    meeting_type="external-client",
    framework="SPIN",
    talking_points_count=4,
    do_not_mention_count=2,
    trace_id=trace_id,
)
```

### 10.3 Per-Node Timing

Every node records its execution time in `state.node_timings`:

```python
import time

async def timed_node(node_name: str, fn, state: MeetingPrepState):
    start = time.monotonic()
    try:
        result = await asyncio.wait_for(fn(state), timeout=TIMEOUTS[node_name])
    except asyncio.TimeoutError:
        result = handle_timeout(node_name, state)
    elapsed_ms = int((time.monotonic() - start) * 1000)
    state.node_timings[node_name] = elapsed_ms
    return result
```

### 10.4 Pipeline Metrics

The final response includes a complete metrics summary:

```python
{
    "pipeline_execution": {
        "total_duration_ms": 5832,
        "node_timings": {
            "validate_input": 120,
            "check_cache": 35,
            "gather_calendar": 1456,
            "gather_email": 2341,
            "gather_crm": 1987,
            "gather_drive": 0,
            "synthesize_prep": 3512,
            "cache_result": 287,
            "format_response": 12
        },
        "sources_used": ["google_calendar", "gmail", "notion"],
        "sources_failed": [],
        "sources_unavailable": ["drive"],
        "gatherer_success_rate": 0.75,
        "cache_hit": false,
        "cache_written": true,
        "errors": []
    }
}
```

### 10.5 FastAPI Endpoints

```python
from fastapi import FastAPI

app = FastAPI(title="P03 Meeting Prep Autopilot", version="1.0.0")

@app.post("/api/v1/meeting/prep", response_model=MeetingPrepResult)
async def prep_meeting(request: MeetingPrepRequest):
    """Single meeting prep pipeline."""
    ...

@app.post("/api/v1/meeting/prep-today", response_model=BatchPrepResponse)
async def prep_today(request: BatchPrepRequest):
    """Batch prep for all remaining meetings today."""
    ...

@app.get("/api/v1/meeting/cache/{event_id}", response_model=CacheInfo)
async def check_cache_status(event_id: str, date: str | None = None):
    """Check if a cached prep exists and its freshness."""
    ...

@app.delete("/api/v1/meeting/cache/{event_id}")
async def invalidate_cache(event_id: str, date: str | None = None):
    """Manually invalidate a cached prep."""
    ...

@app.get("/api/v1/health")
async def health_check():
    """Service health check including Calendar, Gmail, Notion, Drive, Redis connectivity."""
    ...
```
