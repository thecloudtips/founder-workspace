# P20 Client Context Loader -- Technical Specification

## 1. Overview

The Client Context Loader is a LangGraph agent service that aggregates client data from five independent sources (Notion CRM, Gmail, Google Drive, Google Calendar, Notion pages) into a unified client dossier. It uses a parallel-gathering pattern: five gatherer nodes execute concurrently, a synthesis node merges their outputs, and post-processing nodes handle caching and CRM enrichment.

**Service boundary:** Receives a client name (and optional flags), returns a structured JSON dossier with health scoring, sentiment analysis, and completeness metrics.

**Key design constraints:**
- Minimum 1 gatherer must succeed for a valid result (configured via `minimum_gatherers_required`)
- 30-second timeout per gatherer node
- 24-hour cache TTL (Redis primary, Notion secondary, SQLite for dev)
- CRM enrichment is best-effort; failures never block the pipeline
- Claude API for synthesis; Z.ai GLM-5 for gatherer extraction tasks

---

## 2. Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Python | 3.12+ | Service runtime |
| Orchestration | LangGraph | >=0.2 | Graph-based agent orchestration |
| API Framework | FastAPI | >=0.110 | REST endpoint layer |
| Validation | Pydantic | v2 | State schema, request/response models |
| Cache (prod) | Redis | >=7.0 | Primary dossier cache, 24h TTL |
| Cache (dev) | SQLite | stdlib | Local dev cache fallback |
| Notion SDK | notion-client | >=2.0 | Notion API (CRM, dossiers, notes) |
| Google APIs | google-api-python-client | >=2.100 | Gmail, Calendar, Drive |
| Google Auth | google-auth-oauthlib | >=1.0 | OAuth2 credential management |
| LLM (primary) | anthropic | >=0.30 | Claude API for synthesis |
| LLM (fallback) | openai-compatible | -- | Z.ai GLM-5 via OpenAI-compatible endpoint |
| Observability | langsmith | >=0.1 | Tracing, per-node timing |
| Logging | structlog | >=23.0 | Structured JSON logging |

---

## 3. State Schema

All models use Pydantic v2 with strict validation. The top-level `ClientContextState` is the LangGraph state object passed through every node.

### 3.1 Input Models

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ClientContextRequest(BaseModel):
    """Inbound API request."""
    client_name: str = Field(..., description="Client company name to look up")
    refresh: bool = Field(False, description="Bypass cache and force fresh gathering")
    hours: Optional[int] = Field(None, description="Override default lookback window (hours)")
    brief_only: bool = Field(False, description="Return executive brief instead of full dossier")
```

### 3.2 Gatherer Output Models

#### CRM Agent Models

```python
class CompanyProfile(BaseModel):
    """Company record from Notion CRM Pro."""
    name: str = Field(..., description="Company name from CRM")
    industry: Optional[str] = Field(None, description="Industry classification")
    size: Optional[str] = Field(None, description="Company size tier: Startup, SMB, Mid-Market, Enterprise")
    status: Optional[str] = Field(None, description="Relationship status: Active, Prospect, Churned, Partner")
    website: Optional[str] = Field(None, description="Company website URL")
    health_score: Optional[float] = Field(None, ge=0, le=100, description="Existing CRM health score (0-100)")
    notion_page_id: Optional[str] = Field(None, description="Notion page ID for the Companies record")


class Contact(BaseModel):
    """Contact record from CRM Pro Contacts database."""
    name: str = Field(..., description="Full contact name")
    email: Optional[str] = Field(None, description="Primary email address")
    phone: Optional[str] = Field(None, description="Phone number")
    role: Optional[str] = Field(None, description="Job title or role")
    contact_type: Optional[str] = Field(
        None,
        description="Contact type: Decision Maker, Champion, User, Influencer, Blocker"
    )
    last_contact: Optional[datetime] = Field(None, description="Most recent interaction date")
    primary: bool = Field(False, description="Whether this is the primary contact")
    notion_page_id: Optional[str] = Field(None, description="Notion page ID for the Contacts record")


class Deal(BaseModel):
    """Deal record from CRM Pro Deals database."""
    name: str = Field(..., description="Deal name")
    value: Optional[float] = Field(None, ge=0, description="Deal monetary value")
    stage: Optional[str] = Field(
        None,
        description="Pipeline stage: Lead, Qualified, Proposal, Negotiation, Closed Won, Closed Lost"
    )
    close_date: Optional[str] = Field(None, description="Expected or actual close date (YYYY-MM-DD)")
    probability: Optional[int] = Field(None, ge=0, le=100, description="Win probability percentage")
    risk_level: Optional[str] = Field(None, description="Risk level: Low, Medium, High")
    notion_page_id: Optional[str] = Field(None, description="Notion page ID for the Deals record")


class Communication(BaseModel):
    """Communication entry from CRM Pro Communications database."""
    title: str = Field(..., description="Communication summary title")
    comm_type: str = Field(..., description="Type: Email, Call, Meeting, Note")
    date: datetime = Field(..., description="When the communication occurred")
    summary: Optional[str] = Field(None, description="Brief description of interaction")
    sentiment: Optional[str] = Field(None, description="Sentiment: Positive, Neutral, Negative")
    notion_page_id: Optional[str] = Field(None, description="Notion page ID")


class InteractionCounts(BaseModel):
    """Interaction count breakdown by type."""
    email: int = Field(0, description="Total email interactions")
    call: int = Field(0, description="Total call interactions")
    meeting: int = Field(0, description="Total meeting interactions")
    note: int = Field(0, description="Total note interactions")


class DiscoveredDatabases(BaseModel):
    """Database IDs discovered via Notion search."""
    companies: Optional[str] = Field(None, description="Companies DB ID")
    contacts: Optional[str] = Field(None, description="Contacts DB ID")
    deals: Optional[str] = Field(None, description="Deals DB ID")
    communications: Optional[str] = Field(None, description="Communications DB ID")


class CrmData(BaseModel):
    """Structured output from the CRM gatherer agent."""
    company: Optional[CompanyProfile] = Field(None, description="Company profile record")
    contacts: list[Contact] = Field(default_factory=list, description="Linked contact records")
    deals: list[Deal] = Field(default_factory=list, description="Active deal records (excludes Closed Lost)")
    communications: list[Communication] = Field(
        default_factory=list,
        description="Communication entries from last 180 days, newest first"
    )
    relationship_tenure_days: Optional[int] = Field(
        None, description="Days since earliest communication"
    )
    interaction_counts: InteractionCounts = Field(
        default_factory=InteractionCounts,
        description="Interaction totals by type"
    )


class CrmMetadata(BaseModel):
    """Metadata about the CRM lookup."""
    records_found: int = Field(0, description="Number of company records matched")
    match_type: Optional[str] = Field(None, description="Match strategy used: exact, partial, abbreviation")
    match_confidence: float = Field(0.0, ge=0.0, le=1.0, description="Confidence of the client match")
    ambiguous: bool = Field(False, description="Whether multiple matches were found")
    alternative_names: list[str] = Field(
        default_factory=list, description="Other company names found during fuzzy match"
    )
    databases_discovered: DiscoveredDatabases = Field(
        default_factory=DiscoveredDatabases,
        description="IDs of discovered CRM Pro databases"
    )
```

#### Email Agent Models

```python
class EmailThread(BaseModel):
    """Single Gmail thread summary."""
    thread_id: str = Field(..., description="Gmail thread ID")
    subject: str = Field(..., description="Thread subject line")
    participants: list[str] = Field(default_factory=list, description="All email addresses in thread")
    last_message_date: datetime = Field(..., description="Most recent message timestamp")
    message_count: int = Field(1, ge=1, description="Total messages in thread")
    summary: str = Field(..., max_length=100, description="Brief topic summary, max 100 chars")
    status: str = Field(
        ...,
        description="Thread status: active, awaiting_reply_from_client, awaiting_reply_from_user, closed"
    )


class EmailStats(BaseModel):
    """Aggregated email communication statistics."""
    total_threads: int = Field(0, description="Total thread count in lookback window")
    total_messages: int = Field(0, description="Total message count across all threads")
    avg_response_time_hours_client: Optional[float] = Field(
        None, description="Avg hours for client to respond"
    )
    avg_response_time_hours_user: Optional[float] = Field(
        None, description="Avg hours for user to respond"
    )
    messages_per_month: Optional[float] = Field(None, description="Messages per month over lookback")
    last_contact: Optional[datetime] = Field(None, description="Most recent message date")
    avg_thread_length: Optional[float] = Field(None, description="Average messages per thread")


class EmailSentiment(BaseModel):
    """Sentiment assessment from email analysis."""
    trend: str = Field(..., description="Overall trend: positive, neutral, negative")
    positive_signals: int = Field(0, ge=0, description="Count of positive language indicators")
    negative_signals: int = Field(0, ge=0, description="Count of negative language indicators")
    net_score: int = Field(0, description="positive_signals minus negative_signals")


class EmailData(BaseModel):
    """Structured output from the email gatherer agent."""
    threads: list[EmailThread] = Field(default_factory=list, description="Thread summaries, newest first")
    communication_stats: EmailStats = Field(
        default_factory=EmailStats, description="Aggregated communication metrics"
    )
    sentiment: EmailSentiment = Field(
        default_factory=lambda: EmailSentiment(trend="neutral"),
        description="Sentiment analysis results"
    )
    recent_topics: list[str] = Field(
        default_factory=list, max_length=5, description="Top 3-5 recent discussion topics"
    )
    open_threads: int = Field(0, ge=0, description="Count of threads awaiting reply")


class EmailMetadata(BaseModel):
    """Metadata about the email search."""
    records_found: int = Field(0, description="Number of threads found")
    search_strategy: str = Field(
        "contact_email",
        description="Strategy used: contact_email, domain, name_fallback"
    )
    time_range: Optional[str] = Field(None, description="Date range searched (YYYY-MM-DD to YYYY-MM-DD)")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Search confidence score")
    truncated: bool = Field(False, description="Whether results were capped at 50 threads")
    total_available: Optional[int] = Field(None, description="Total threads available if truncated")
```

#### Docs Agent Models

```python
class DocumentRecord(BaseModel):
    """Single document from Google Drive."""
    title: str = Field(..., description="Document title")
    file_type: str = Field(..., description="File type: Google Docs, Sheets, Slides, PDF, etc.")
    category: str = Field(
        ...,
        description="Document category: Proposal, Contract, Presentation, Report, Spreadsheet, Other"
    )
    url: str = Field(..., description="Direct Google Drive link")
    last_modified: datetime = Field(..., description="Last modification timestamp")
    owner: Optional[str] = Field(None, description="File owner email")
    shared_with: list[str] = Field(default_factory=list, description="Shared email addresses")
    active: bool = Field(False, description="True if modified within last 30 days")


class DocumentCategoryStats(BaseModel):
    """Document count by category."""
    Proposal: int = Field(0)
    Contract: int = Field(0)
    Presentation: int = Field(0)
    Report: int = Field(0)
    Spreadsheet: int = Field(0)
    Other: int = Field(0)


class DocumentStats(BaseModel):
    """Aggregated document statistics."""
    total_documents: int = Field(0, description="Total documents found")
    active_documents: int = Field(0, description="Documents modified in last 30 days")
    by_category: DocumentCategoryStats = Field(
        default_factory=DocumentCategoryStats, description="Counts per category"
    )


class DocsData(BaseModel):
    """Structured output from the docs gatherer agent."""
    documents: list[DocumentRecord] = Field(
        default_factory=list, description="Documents sorted by last_modified desc"
    )
    document_stats: DocumentStats = Field(
        default_factory=DocumentStats, description="Aggregate statistics"
    )


class DocsMetadata(BaseModel):
    """Metadata about the Drive search."""
    records_found: int = Field(0, description="Number of documents found")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Search confidence")
    inaccessible_count: int = Field(0, description="Files found but not accessible")
```

#### Calendar Agent Models

```python
class MeetingRecord(BaseModel):
    """Single calendar event."""
    event_id: str = Field(..., description="Google Calendar event ID")
    title: str = Field(..., description="Event title")
    date: datetime = Field(..., description="Event date and time")
    duration_minutes: int = Field(..., ge=0, description="Duration in minutes")
    attendees: list[str] = Field(default_factory=list, description="Attendee email addresses")
    recurring: bool = Field(False, description="Whether this is a recurring event")
    recurrence: Optional[str] = Field(
        None, description="Recurrence pattern: weekly, biweekly, monthly, quarterly"
    )
    meeting_type: str = Field(
        ..., description="Meeting type: one-on-one, group, recurring_sync, ad_hoc"
    )


class MeetingStats(BaseModel):
    """Aggregated meeting statistics."""
    total_past: int = Field(0, description="Past meetings in lookback window")
    total_upcoming: int = Field(0, description="Upcoming meetings in lookahead window")
    avg_frequency_days: Optional[float] = Field(None, description="Average days between meetings")
    meetings_per_month: Optional[float] = Field(None, description="Meetings per month over last 90 days")
    last_meeting: Optional[datetime] = Field(None, description="Most recent past meeting date")
    next_meeting: Optional[datetime] = Field(None, description="Next upcoming meeting date")
    engagement_trend: str = Field(
        "stable",
        description="Trend over last 3 months: increasing, stable, declining"
    )


class CalendarData(BaseModel):
    """Structured output from the calendar gatherer agent."""
    past_meetings: list[MeetingRecord] = Field(
        default_factory=list, description="Past meetings, newest first"
    )
    upcoming_meetings: list[MeetingRecord] = Field(
        default_factory=list, description="Upcoming meetings, soonest first"
    )
    meeting_stats: MeetingStats = Field(
        default_factory=MeetingStats, description="Aggregate meeting metrics"
    )


class CalendarMetadata(BaseModel):
    """Metadata about the calendar search."""
    records_found: int = Field(0, description="Total events found")
    search_strategy: str = Field(
        "attendee_email", description="Strategy: attendee_email, event_title"
    )
    time_range: Optional[str] = Field(None, description="Search window")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Search confidence")
```

#### Notes Agent Models

```python
class NoteRecord(BaseModel):
    """Single meeting note from Notion."""
    title: str = Field(..., description="Page or entry title")
    date: datetime = Field(..., description="Created or last edited date")
    notion_url: Optional[str] = Field(None, description="Direct link to Notion page")
    key_decisions: list[str] = Field(
        default_factory=list, description="Decisions extracted from this note"
    )
    open_items: list[str] = Field(
        default_factory=list, description="Action items extracted from this note"
    )
    attendees: list[str] = Field(
        default_factory=list, description="Attendees mentioned in the note"
    )


class CommunicationsEntry(BaseModel):
    """Communication DB entry used by the notes agent."""
    title: str = Field(..., description="Communication title")
    comm_type: str = Field(..., description="Type: Note, Meeting")
    date: datetime = Field(..., description="Entry date")
    summary: Optional[str] = Field(None, description="Entry summary text")
    sentiment: Optional[str] = Field(None, description="Sentiment if set")


class OpenItem(BaseModel):
    """Deduplicated open item from notes and communications."""
    item: str = Field(..., description="Action item text")
    source: str = Field(..., description="Source page or entry title")
    date_created: datetime = Field(..., description="When the item was identified")
    status: str = Field("open", description="Item status: open, resolved")


class KeyDecision(BaseModel):
    """Extracted decision record."""
    decision: str = Field(..., max_length=100, description="Decision text, max 100 chars")
    date: datetime = Field(..., description="When the decision was made")
    source: str = Field(..., description="Source page or entry title")


class NotesData(BaseModel):
    """Structured output from the notes gatherer agent."""
    meeting_notes: list[NoteRecord] = Field(
        default_factory=list, description="Meeting notes, newest first"
    )
    communications_entries: list[CommunicationsEntry] = Field(
        default_factory=list, description="Relevant Communications DB entries"
    )
    all_open_items: list[OpenItem] = Field(
        default_factory=list, description="Deduplicated master open items list"
    )
    key_decisions: list[KeyDecision] = Field(
        default_factory=list, description="Extracted decisions, newest first"
    )


class NotesMetadata(BaseModel):
    """Metadata about the notes search."""
    records_found: int = Field(0, description="Total notes and entries found")
    pages_scanned: int = Field(0, description="Notion pages scanned")
    communications_entries_found: int = Field(0, description="Communications DB entries found")
    time_range: Optional[str] = Field(None, description="Search window")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Search confidence")
```

### 3.3 Gatherer Result Envelope

```python
class GathererStatus(str, Enum):
    """Status of a gatherer node execution."""
    COMPLETE = "complete"
    UNAVAILABLE = "unavailable"
    ERROR = "error"
    TIMEOUT = "timeout"


class GathererResult(BaseModel):
    """Envelope wrapping every gatherer's output."""
    source: str = Field(..., description="Source identifier: notion_crm, gmail, google_drive, google_calendar, notion_notes")
    status: GathererStatus = Field(..., description="Execution status")
    data: Optional[CrmData | EmailData | DocsData | CalendarData | NotesData] = Field(
        None, description="Typed gatherer output; None when status is unavailable/error/timeout"
    )
    metadata: Optional[CrmMetadata | EmailMetadata | DocsMetadata | CalendarMetadata | NotesMetadata] = Field(
        None, description="Gatherer-specific metadata"
    )
    error_message: Optional[str] = Field(None, description="Error details when status is error or timeout")
    duration_ms: Optional[int] = Field(None, ge=0, description="Node execution time in milliseconds")
```

### 3.4 Synthesis Output Models

```python
class DossierProfile(BaseModel):
    """Section 1: Client profile assembled from CRM + supplementary sources."""
    company_name: str = Field(..., description="Canonical company name")
    industry: Optional[str] = Field(None)
    size: Optional[str] = Field(None)
    status: Optional[str] = Field(None)
    website: Optional[str] = Field(None)
    relationship_owner: Optional[str] = Field(None, description="Internal owner of this relationship")
    tenure_months: Optional[int] = Field(None, description="Relationship duration in months")
    primary_contact: Optional[Contact] = Field(None, description="Primary contact record")
    all_contacts: list[Contact] = Field(default_factory=list, description="All known contacts")
    active_deals_count: int = Field(0)
    total_deal_value: Optional[float] = Field(None, description="Sum of active deal values")
    active_deals: list[Deal] = Field(default_factory=list)


class RelationshipHistory(BaseModel):
    """Section 2: Cross-source relationship timeline."""
    first_contact_date: Optional[datetime] = Field(
        None, description="Earliest interaction across all sources"
    )
    total_interactions_by_type: InteractionCounts = Field(default_factory=InteractionCounts)
    email_stats: Optional[EmailStats] = Field(None, description="From email gatherer")
    meeting_stats: Optional[MeetingStats] = Field(None, description="From calendar gatherer")
    document_count: int = Field(0, description="Total documents from docs gatherer")
    engagement_trend: Optional[str] = Field(
        None, description="Overall engagement trend: increasing, stable, declining"
    )
    key_milestones: list[str] = Field(
        default_factory=list, description="Notable relationship milestones"
    )


class RecentActivityItem(BaseModel):
    """Single entry in the recent activity timeline."""
    date: datetime = Field(..., description="Interaction date")
    activity_type: str = Field(..., description="Type: email, meeting, note, document")
    summary: str = Field(..., description="Brief interaction summary")
    source: str = Field(..., description="Source system that provided this record")


class UpcomingItem(BaseModel):
    """Upcoming meeting or deal milestone."""
    date: datetime = Field(..., description="Scheduled date")
    item_type: str = Field(..., description="Type: meeting, deal_milestone, deadline")
    description: str = Field(..., description="Event or milestone description")
    attendees: list[str] = Field(default_factory=list, description="Attendees if applicable")


class RiskFlag(BaseModel):
    """Individual risk flag from the risk assessment."""
    flag: str = Field(..., description="Risk flag name")
    severity: str = Field(..., description="Severity: Critical, Warning, Info")
    description: str = Field(..., description="Human-readable explanation")
    recommended_action: str = Field(..., description="Suggested remediation step")


class SentimentAndHealth(BaseModel):
    """Section 6: Sentiment analysis and health scoring."""
    overall_sentiment: str = Field(..., description="Combined sentiment: positive, neutral, negative")
    email_sentiment: Optional[str] = Field(None, description="Email-derived sentiment")
    meeting_sentiment: Optional[str] = Field(None, description="Calendar-derived sentiment")
    deal_sentiment: Optional[str] = Field(None, description="Deal-derived sentiment")
    engagement_level: str = Field("low", description="Engagement level: high, medium, low")
    engagement_trend: Optional[str] = Field(
        None, description="Trend direction: increasing, stable, declining"
    )
    risk_flags: list[RiskFlag] = Field(default_factory=list, description="Active risk flags")
    health_score: float = Field(0.0, ge=0, le=100, description="Composite health score 0-100")
    health_label: str = Field(
        "Critical",
        description="Score interpretation: Excellent, Good, Fair, At Risk, Critical"
    )
    health_components: Optional[dict[str, float]] = Field(
        None,
        description="Per-component scores: contact_recency, response_quality, engagement_level, deal_progress, task_completion, sentiment"
    )


class KeyDocument(BaseModel):
    """Document selected for the Key Documents section."""
    title: str = Field(..., description="Document title")
    category: str = Field(..., description="Document category")
    url: str = Field(..., description="Direct link")
    last_modified: datetime = Field(..., description="Last modification date")
    active: bool = Field(False, description="Modified in last 30 days")


class Dossier(BaseModel):
    """Complete 7-section client dossier."""
    profile: DossierProfile
    relationship_history: RelationshipHistory
    recent_activity: list[RecentActivityItem] = Field(
        default_factory=list, description="Last 5 interactions, newest first"
    )
    open_items: list[OpenItem] = Field(
        default_factory=list, description="Deduplicated action items across sources"
    )
    upcoming: list[UpcomingItem] = Field(
        default_factory=list, description="Next 30 days of events and milestones"
    )
    sentiment_and_health: SentimentAndHealth
    key_documents: list[KeyDocument] = Field(
        default_factory=list, description="Top 5 most relevant documents"
    )
```

### 3.5 Completeness and Cache Models

```python
class CompletenessBreakdown(BaseModel):
    """Per-component completeness scoring."""
    crm_profile: float = Field(0.0, ge=0.0, le=1.0, description="1.0 if >=5 props, 0.5 if <5, 0.0 if missing")
    contacts: float = Field(0.0, ge=0.0, le=1.0, description="1.0 if contact+email, 0.5 if no email, 0.0 if none")
    deal_status: float = Field(0.0, ge=0.0, le=1.0, description="1.0 if active deal, 0.5 if closed only, 0.0 if none")
    email_history: float = Field(0.0, ge=0.0, le=1.0, description="1.0 if >=10 threads, 0.5 if 1-9, 0.0 if none")
    calendar_data: float = Field(0.0, ge=0.0, le=1.0, description="1.0 if >=3 meetings, 0.5 if 1-2, 0.0 if none")
    documents: float = Field(0.0, ge=0.0, le=1.0, description="1.0 if >=3 docs, 0.5 if 1-2, 0.0 if none")
    notes_decisions: float = Field(0.0, ge=0.0, le=1.0, description="1.0 if >=2 decisions, 0.5 if 1, 0.0 if none")


class CacheInfo(BaseModel):
    """Cache status for the current dossier."""
    from_cache: bool = Field(False, description="Whether this result was served from cache")
    cache_key: Optional[str] = Field(None, description="Redis key or Notion page ID")
    cached_at: Optional[datetime] = Field(None, description="When the cache entry was written")
    ttl_hours: int = Field(24, description="Cache TTL in hours")
    cache_source: Optional[str] = Field(None, description="Cache backend used: redis, notion, sqlite")
```

### 3.6 Top-Level State

```python
from langgraph.graph import MessagesState


class ClientContextState(BaseModel):
    """
    LangGraph state object. Flows through all nodes.
    Each node reads and writes specific fields.
    """

    # --- Input (set by API handler before graph invocation) ---
    client_name: str = Field(..., description="Client company name to look up")
    refresh: bool = Field(False, description="Bypass cache")
    lookback_hours: Optional[int] = Field(None, description="Override lookback window")
    brief_only: bool = Field(False, description="Return brief instead of full dossier")

    # --- Cache check results (set by check_cache node) ---
    cache_hit: bool = Field(False, description="Whether a fresh cache entry was found")
    cached_dossier: Optional[Dossier] = Field(None, description="Cached dossier if cache_hit is True")
    cache_info: CacheInfo = Field(default_factory=CacheInfo)

    # --- Gatherer results (each set by its respective gather_* node) ---
    crm_result: Optional[GathererResult] = Field(None, description="CRM agent output")
    email_result: Optional[GathererResult] = Field(None, description="Email agent output")
    docs_result: Optional[GathererResult] = Field(None, description="Docs agent output")
    calendar_result: Optional[GathererResult] = Field(None, description="Calendar agent output")
    notes_result: Optional[GathererResult] = Field(None, description="Notes agent output")

    # --- Synthesis output (set by synthesize_dossier node) ---
    dossier: Optional[Dossier] = Field(None, description="Assembled 7-section dossier")
    completeness_score: float = Field(0.0, ge=0.0, le=1.0, description="Weighted completeness")
    completeness_breakdown: Optional[CompletenessBreakdown] = Field(None)
    executive_brief: Optional[str] = Field(None, description="Formatted brief text if brief_only")

    # --- Post-processing metadata (set by cache_result and enrich_crm nodes) ---
    cache_written: bool = Field(False, description="Whether cache was updated")
    enrichment_written: bool = Field(False, description="Whether CRM enrichment succeeded")
    enrichment_details: Optional[dict] = Field(None, description="What was written back to CRM")

    # --- Pipeline metadata ---
    sources_used: list[str] = Field(default_factory=list, description="Sources that returned data")
    sources_failed: list[str] = Field(default_factory=list, description="Sources that errored")
    sources_unavailable: list[str] = Field(default_factory=list, description="Sources not configured")
    match_confidence: float = Field(0.0, ge=0.0, le=1.0, description="Client match confidence")
    started_at: Optional[datetime] = Field(None, description="Pipeline start time")
    completed_at: Optional[datetime] = Field(None, description="Pipeline completion time")
    total_duration_ms: Optional[int] = Field(None, description="Total pipeline duration")
    node_timings: dict[str, int] = Field(
        default_factory=dict, description="Per-node execution time in ms"
    )
    errors: list[str] = Field(default_factory=list, description="Non-fatal errors encountered")
```

---

## 4. LangGraph Node Definitions

### 4.1 `check_cache`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Check Redis (then Notion) for a fresh cached dossier before dispatching gatherers |
| **Input fields read** | `client_name`, `refresh` |
| **Output fields written** | `cache_hit`, `cached_dossier`, `cache_info`, `started_at` |
| **Tools used** | `RedisClient.get`, `NotionClient.query_database` |
| **LLM used** | None |
| **Timeout** | 5s |

Logic:
1. Record `started_at = datetime.utcnow()`.
2. If `refresh=True`, skip cache and set `cache_hit=False`.
3. Try Redis: `GET client_context:{normalize(client_name)}`. If found and age < 24h, deserialize into `cached_dossier`, set `cache_hit=True`, `cache_info.cache_source="redis"`.
4. If Redis miss, try Notion: query "Client Dossiers" DB for matching Client Name. If found and `Generated At` < 24h and `Stale=False`, parse Dossier JSON from `Dossier` property, set `cache_hit=True`, `cache_info.cache_source="notion"`.
5. If no cache hit, set `cache_hit=False`.

### 4.2 `gather_crm`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Search Notion CRM Pro databases for client company, contacts, deals, communications |
| **Input fields read** | `client_name`, `lookback_hours` |
| **Output fields written** | `crm_result` |
| **Tools used** | `NotionClient.search_databases`, `NotionClient.query_database`, `NotionClient.get_page` |
| **LLM used** | Z.ai GLM-5 (extraction, fuzzy matching assistance) |
| **Timeout** | 30s |

Logic:
1. Discover CRM Pro databases by searching Notion for "Companies", "Contacts", "Deals", "Communications" titles.
2. Search Companies DB: exact match -> partial match -> abbreviation match.
3. Follow relations to Contacts, active Deals, Communications (last 180 days).
4. Calculate `relationship_tenure_days` and `interaction_counts`.
5. Identify primary contact (most recent communication or Decision Maker type).
6. Package into `GathererResult(source="notion_crm", status="complete", data=CrmData(...))`.

### 4.3 `gather_email`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Search Gmail for email threads with the client, compute communication stats and sentiment |
| **Input fields read** | `client_name`, `crm_result` (for contact emails), `lookback_hours` |
| **Output fields written** | `email_result` |
| **Tools used** | `GmailClient.search_threads`, `GmailClient.get_thread`, `GmailClient.get_message` |
| **LLM used** | Z.ai GLM-5 (sentiment extraction, thread summarization) |
| **Timeout** | 30s |

Logic:
1. Extract contact emails from `crm_result.data.contacts` if available.
2. Search Gmail by contact emails -> by domain -> by client name in subject/body.
3. Cap at 50 most recent threads, 180-day lookback.
4. For each thread: extract subject, participants, last_message_date, message_count, summary, status.
5. Calculate `EmailStats`: totals, response times (exclude weekends), messages_per_month.
6. Run sentiment analysis on last 10 messages using GLM-5 for signal extraction.
7. Identify 3 most recent topics and count open threads.

**Note on parallelism:** `gather_email` benefits from CRM contact data but does NOT strictly depend on it. When dispatched in parallel with `gather_crm`, it falls back to domain/name search. If the graph is configured to pass CRM results first (see Section 5 variant), it can use contact emails for higher-precision search.

### 4.4 `gather_docs`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Search Google Drive for client-related documents, categorize and extract metadata |
| **Input fields read** | `client_name` |
| **Output fields written** | `docs_result` |
| **Tools used** | `DriveClient.search_files`, `DriveClient.get_file_metadata` |
| **LLM used** | Z.ai GLM-5 (document categorization) |
| **Timeout** | 30s |

Logic:
1. Check if Drive credentials are configured. If not, return `GathererResult(status="unavailable")`.
2. Search Drive for files containing client name in title or content.
3. For each file: extract title, file_type, URL, last_modified, owner, shared_with.
4. Categorize via GLM-5: Proposal, Contract, Presentation, Report, Spreadsheet, Other.
5. Flag active documents (modified < 30 days).
6. Sort by last_modified desc, compile DocumentStats.

### 4.5 `gather_calendar`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Retrieve past and upcoming meetings with the client from Google Calendar |
| **Input fields read** | `client_name`, `crm_result` (for attendee emails) |
| **Output fields written** | `calendar_result` |
| **Tools used** | `CalendarClient.list_events` |
| **LLM used** | Z.ai GLM-5 (meeting type classification) |
| **Timeout** | 30s |

Logic:
1. Check if Calendar credentials are configured. If not, return `GathererResult(status="unavailable")`.
2. Search 180 days back + 30 days forward by attendee emails (from CRM) and client name in titles.
3. Separate into past_meetings and upcoming_meetings.
4. Classify meeting types: one-on-one (2 attendees), group (3+), recurring_sync, ad_hoc.
5. Calculate MeetingStats: frequency, meetings_per_month, engagement_trend (compare last 3 months with 20% threshold).

### 4.6 `gather_notes`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Search Notion pages and Communications DB for meeting notes, decisions, and open items |
| **Input fields read** | `client_name`, `crm_result` (for company relation lookup) |
| **Output fields written** | `notes_result` |
| **Tools used** | `NotionClient.search_databases`, `NotionClient.query_database`, `NotionClient.get_page` |
| **LLM used** | Z.ai GLM-5 (decision and open-item extraction from unstructured text) |
| **Timeout** | 30s |

Logic:
1. Search Notion pages for client name in titles and content (180-day lookback).
2. Discover and query Communications DB for entries linked to the client (Type = "Note" or "Meeting").
3. For each page: extract title, date, URL, scan for decision patterns ("decided", "agreed", "will proceed with") and open item patterns ("need to", "TODO", "follow up", "pending").
4. Use GLM-5 to extract decisions and open items from unstructured note content.
5. Compile master open items list, deduplicate by verb+noun similarity.
6. Sort decisions and notes by date desc.

### 4.7 `synthesize_dossier`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Merge all gatherer outputs into the 7-section dossier, calculate health score and completeness |
| **Input fields read** | `crm_result`, `email_result`, `docs_result`, `calendar_result`, `notes_result`, `client_name`, `brief_only` |
| **Output fields written** | `dossier`, `completeness_score`, `completeness_breakdown`, `sources_used`, `sources_failed`, `sources_unavailable`, `match_confidence`, `executive_brief` |
| **Tools used** | None (pure computation + LLM synthesis) |
| **LLM used** | Claude API (primary) -- handles nuanced synthesis, conflict resolution, risk flag assessment |
| **Timeout** | 45s |

Logic:
1. Classify each gatherer result into sources_used / sources_failed / sources_unavailable.
2. Enforce minimum_gatherers_required=1; if all failed, return minimal dossier with `completeness=0.0`.
3. Apply data source hierarchy (CRM > Email > Calendar > Docs > Notes) for conflicts.
4. Build 7 sections per the dossier structure (see context-lead agent spec for details).
5. Calculate health score using the 6-component weighted formula.
6. Calculate completeness using the 7-component weighted scoring table.
7. Assess risk flags (Critical, Warning, Info) per risk flag criteria.
8. If `brief_only=True`, generate executive brief from the assembled dossier.
9. Set `match_confidence` from CRM result metadata (or lower confidence from fallback sources).

**Health Score Calculation (implemented in this node):**

```python
def calculate_health_score(
    last_contact_days: int | None,
    avg_response_hours: float | None,
    engagement_level: str,
    deal_progress: str,
    overdue_items: int,
    sentiment: str,
) -> tuple[float, dict[str, float]]:
    """
    Returns (composite_score, component_scores_dict).

    Component weights:
      contact_recency:  0.25
      response_quality: 0.20
      engagement_level: 0.20
      deal_progress:    0.15
      task_completion:  0.10
      sentiment:        0.10
    """
    # Contact Recency (0-100)
    if last_contact_days is None:
        cr = 0
    elif last_contact_days <= 7:
        cr = 100
    elif last_contact_days <= 14:
        cr = 75
    elif last_contact_days <= 30:
        cr = 50
    elif last_contact_days <= 60:
        cr = 25
    else:
        cr = 0

    # Response Quality (0-100)
    if avg_response_hours is None:
        rq = 0
    elif avg_response_hours < 4:
        rq = 100
    elif avg_response_hours < 12:
        rq = 75
    elif avg_response_hours < 24:
        rq = 50
    elif avg_response_hours < 48:
        rq = 25
    else:
        rq = 0

    # Engagement Level (0-100)
    el = {"high": 100, "medium": 60, "low": 20}.get(engagement_level.lower(), 20)

    # Deal Progress (0-100)
    dp = {"advancing": 100, "stable": 60, "stalled": 20, "lost": 0, "none": 0}.get(
        deal_progress.lower(), 0
    )

    # Task Completion (0-100)
    if overdue_items == 0:
        tc = 100
    elif overdue_items == 1:
        tc = 75
    elif overdue_items == 2:
        tc = 50
    elif overdue_items <= 4:
        tc = 25
    else:
        tc = 0

    # Sentiment (0-100)
    se = {"positive": 100, "neutral": 60, "negative": 20}.get(sentiment.lower(), 60)

    components = {
        "contact_recency": cr,
        "response_quality": rq,
        "engagement_level": el,
        "deal_progress": dp,
        "task_completion": tc,
        "sentiment": se,
    }
    weights = {
        "contact_recency": 0.25,
        "response_quality": 0.20,
        "engagement_level": 0.20,
        "deal_progress": 0.15,
        "task_completion": 0.10,
        "sentiment": 0.10,
    }
    score = sum(components[k] * weights[k] for k in components)
    return score, components
```

**Health Label Mapping:**

| Score Range | Label |
|-------------|-------|
| 80--100 | Excellent |
| 60--79 | Good |
| 40--59 | Fair |
| 20--39 | At Risk |
| 0--19 | Critical |

### 4.8 `cache_result`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Persist the synthesized dossier to Redis and Notion for future cache hits |
| **Input fields read** | `dossier`, `client_name`, `completeness_score`, `sources_used`, `cache_hit` |
| **Output fields written** | `cache_written`, `cache_info` |
| **Tools used** | `RedisClient.setex`, `NotionClient.create_page`, `NotionClient.update_page` |
| **LLM used** | None |
| **Timeout** | 10s |

Logic:
1. Skip if `cache_hit=True` (dossier was served from cache, no need to re-write).
2. Serialize dossier to JSON.
3. Write to Redis: `SETEX client_context:{normalize(client_name)} 86400 {json}`.
4. Write to Notion "Client Dossiers" DB (lazy-create if needed):
   - If existing page for this client: update Dossier, Completeness, Health Score, Sources Used, Generated At, set Stale=False.
   - If no existing page: create new page with all properties.
5. Set `cache_written=True`, update `cache_info`.
6. On failure: set `cache_written=False`, append error to `errors`. Do not fail pipeline.

### 4.9 `enrich_crm`

| Attribute | Value |
|-----------|-------|
| **Purpose** | Write calculated health score, risk level, and sentiment back to CRM Pro databases |
| **Input fields read** | `dossier`, `crm_result`, `match_confidence` |
| **Output fields written** | `enrichment_written`, `enrichment_details` |
| **Tools used** | `NotionClient.update_page` |
| **LLM used** | None |
| **Timeout** | 10s |

Logic:
1. Skip if `match_confidence < 0.8`.
2. Skip if `crm_result` is None or errored.
3. Write to Companies page: set `Client Health Score` to `dossier.sentiment_and_health.health_score`.
4. Write to active Deals: set `Risk Level` based on stall + engagement analysis:
   - "High": deal stalled 30+ days AND engagement declining
   - "Medium": deal stalled OR engagement declining
   - "Low": neither condition
5. Write to most recent Communications entry: set Sentiment with "[Auto]" prefix (e.g., "[Auto] Positive"). Only update if field is empty or already has "[Auto]" prefix.
6. Set `enrichment_written=True`, `enrichment_details={companies: ..., deals: ..., communications: ...}`.
7. On failure: set `enrichment_written=False`, append error to `errors`. Do not fail pipeline.

---

## 5. Edge Topology

### 5.1 Graph Structure

```
START
  |
  v
check_cache
  |
  ├── [cache_hit=True] ──────────────────────────────> END
  |
  └── [cache_hit=False]
        |
        v
    fan_out (via Send)
        |
        ├── gather_crm ────────┐
        ├── gather_email ──────┤
        ├── gather_docs ───────┤ (5 parallel branches)
        ├── gather_calendar ───┤
        └── gather_notes ──────┘
                               |
                               v
                       synthesize_dossier
                               |
                               v
                         cache_result
                               |
                               v
                          enrich_crm
                               |
                               v
                              END
```

### 5.2 Conditional Edge Logic

```python
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send


def route_after_cache(state: ClientContextState) -> str | list[Send]:
    """Conditional edge after check_cache."""
    if state.cache_hit:
        return END

    # Fan out to all 5 gatherers in parallel via Send()
    return [
        Send("gather_crm", state),
        Send("gather_email", state),
        Send("gather_docs", state),
        Send("gather_calendar", state),
        Send("gather_notes", state),
    ]


def build_graph() -> StateGraph:
    graph = StateGraph(ClientContextState)

    # Add nodes
    graph.add_node("check_cache", check_cache_node)
    graph.add_node("gather_crm", gather_crm_node)
    graph.add_node("gather_email", gather_email_node)
    graph.add_node("gather_docs", gather_docs_node)
    graph.add_node("gather_calendar", gather_calendar_node)
    graph.add_node("gather_notes", gather_notes_node)
    graph.add_node("synthesize_dossier", synthesize_dossier_node)
    graph.add_node("cache_result", cache_result_node)
    graph.add_node("enrich_crm", enrich_crm_node)

    # Edges
    graph.add_edge(START, "check_cache")
    graph.add_conditional_edges("check_cache", route_after_cache)

    # All gatherers converge to synthesize
    graph.add_edge("gather_crm", "synthesize_dossier")
    graph.add_edge("gather_email", "synthesize_dossier")
    graph.add_edge("gather_docs", "synthesize_dossier")
    graph.add_edge("gather_calendar", "synthesize_dossier")
    graph.add_edge("gather_notes", "synthesize_dossier")

    # Post-synthesis pipeline
    graph.add_edge("synthesize_dossier", "cache_result")
    graph.add_edge("cache_result", "enrich_crm")
    graph.add_edge("enrich_crm", END)

    return graph.compile()
```

### 5.3 Parallel Gatherer Join Behavior

LangGraph's `Send()` dispatches all five gatherers concurrently. The `synthesize_dossier` node will not execute until all five `Send` branches complete (or time out). Each gatherer writes to its own state field (`crm_result`, `email_result`, etc.), so there are no write conflicts.

If a gatherer times out (30s), its result field remains `None`. The `synthesize_dossier` node treats `None` as `GathererResult(status="timeout")`.

---

## 6. Tool Definitions

Native Python SDK wrappers. These are NOT MCP tools; they are thin service clients initialized with credentials at startup.

### 6.1 NotionClient

```python
class NotionClient:
    """Wrapper around notion-client SDK for CRM and dossier operations."""

    def __init__(self, auth_token: str): ...

    async def search_databases(
        self, query: str, *, filter_type: str = "database"
    ) -> list[dict]:
        """
        Search Notion for databases matching the query string.
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

    async def get_page(
        self, page_id: str, *, include_children: bool = False
    ) -> dict:
        """
        Retrieve a Notion page by ID. Optionally fetches child blocks.
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
        Used for lazy-creating the Client Dossiers DB.
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
        Used for creating dossier cache entries and CRM records.
        """
        ...

    async def update_page(
        self, page_id: str, properties: dict
    ) -> dict:
        """
        Update properties on an existing Notion page.
        Used for cache updates, CRM enrichment writeback.
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
        Query uses Gmail search syntax (from:, to:, subject:, after:, before:).
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

### 6.3 CalendarClient

```python
class CalendarClient:
    """Wrapper around Google Calendar API."""

    def __init__(self, credentials: Credentials): ...

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
        q: free-text search filter on event fields.
        Returns list of event objects: id, summary, start, end, attendees, recurrence.
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
        query: e.g. "name contains 'Acme Corp' or fullText contains 'Acme Corp'"
        Returns list of file metadata objects.
        """
        ...

    async def get_file_metadata(
        self, file_id: str, *, fields: str | None = None
    ) -> dict:
        """
        Get detailed metadata for a single file.
        Returns name, mimeType, modifiedTime, owners, permissions, webViewLink.
        """
        ...
```

### 6.5 RedisClient

```python
class RedisClient:
    """Async Redis wrapper for dossier caching."""

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
| `gather_crm` | Z.ai | GLM-5 | Structured extraction, fuzzy matching -- simpler tasks |
| `gather_email` | Z.ai | GLM-5 | Thread summarization, sentiment signal extraction |
| `gather_docs` | Z.ai | GLM-5 | Document categorization |
| `gather_calendar` | Z.ai | GLM-5 | Meeting type classification |
| `gather_notes` | Z.ai | GLM-5 | Decision/open-item extraction from unstructured text |
| `synthesize_dossier` | Claude | claude-sonnet-4-20250514 | Complex multi-source synthesis, risk assessment, conflict resolution |
| `check_cache` | None | -- | No LLM needed |
| `cache_result` | None | -- | No LLM needed |
| `enrich_crm` | None | -- | No LLM needed |

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
| Extraction (GLM-5) | 0.0 | 2048 |
| Summarization (GLM-5) | 0.2 | 1024 |
| Synthesis (Claude) | 0.3 | 4096 |
| Brief generation (Claude) | 0.4 | 2048 |

---

## 8. Caching Strategy

### 8.1 Cache Key Design

```
Pattern:    client_context:{normalized_name}
Example:    client_context:acme_corp
Normalize:  lowercase, strip whitespace, replace spaces/hyphens with underscores,
            remove punctuation (Inc., LLC, Ltd., Corp.)
```

### 8.2 Three-Tier Cache Architecture

| Tier | Backend | TTL | Serialization | Use Case |
|------|---------|-----|---------------|----------|
| L1 | Redis | 24h (86400s) | JSON via `Dossier.model_dump_json()` | Production primary cache |
| L2 | Notion "Client Dossiers" DB | Permanent (Stale flag) | Rich text property (JSON string) | Human-readable archive, shared visibility |
| L3 | SQLite | 24h | JSON in `cache` table | Local development fallback |

### 8.3 Cache Read Flow

```
1. Check Redis (L1)
   ├── Hit + fresh (< 24h) → return cached dossier
   └── Miss
        ↓
2. Check Notion (L2)
   ├── Hit + fresh (Generated At < 24h, Stale=False) → return, backfill Redis
   └── Miss or stale
        ↓
3. Cache miss → proceed to gatherer fan-out
```

### 8.4 Cache Write Flow (post-synthesis)

```
1. Write to Redis (L1): SETEX with 86400s TTL
2. Write to Notion (L2):
   ├── Existing page → update Dossier, Completeness, Health Score, Sources Used, Generated At, Stale=False
   └── New client → create page with all properties
3. (Dev only) Write to SQLite (L3)
```

### 8.5 Cache Invalidation

- **TTL-based:** Redis keys expire after 24h automatically. Notion entries are marked Stale when `Generated At` is older than 24h (checked at read time).
- **Explicit refresh:** `refresh=True` flag bypasses all caches and triggers a full re-gather. After synthesis, overwrites existing cache entries.
- **Name normalization:** ensures "Acme Corp", "acme corp", and "ACME CORP" hit the same cache key.

### 8.6 SQLite Schema (dev)

```sql
CREATE TABLE IF NOT EXISTS dossier_cache (
    client_key    TEXT PRIMARY KEY,
    dossier_json  TEXT NOT NULL,
    created_at    TEXT NOT NULL,  -- ISO-8601
    expires_at    TEXT NOT NULL   -- ISO-8601
);
```

---

## 9. Error Handling

### 9.1 Per-Node Timeout Enforcement

| Node | Timeout | On Timeout Behavior |
|------|---------|---------------------|
| `check_cache` | 5s | Treat as cache miss, proceed to fan-out |
| `gather_crm` | 30s | Set `crm_result = GathererResult(status="timeout")` |
| `gather_email` | 30s | Set `email_result = GathererResult(status="timeout")` |
| `gather_docs` | 30s | Set `docs_result = GathererResult(status="timeout")` |
| `gather_calendar` | 30s | Set `calendar_result = GathererResult(status="timeout")` |
| `gather_notes` | 30s | Set `notes_result = GathererResult(status="timeout")` |
| `synthesize_dossier` | 45s | Return partial dossier with available data |
| `cache_result` | 10s | Set `cache_written=False`, log error, continue |
| `enrich_crm` | 10s | Set `enrichment_written=False`, log error, continue |

Timeouts are enforced via `asyncio.wait_for()` wrapping each node's execution.

### 9.2 Optional Gatherer Unavailability

When a gatherer detects its backing service is not configured (no credentials, no MCP server):

```python
return GathererResult(
    source="google_drive",  # or google_calendar
    status=GathererStatus.UNAVAILABLE,
    data=None,
    metadata=None,
    error_message="Google Drive credentials not configured",
)
```

The synthesize_dossier node records these in `sources_unavailable` and adjusts completeness scoring accordingly. It distinguishes "unavailable" (service not configured) from "no data found" (service available but returned empty results).

### 9.3 Minimum Gatherer Threshold

At least 1 gatherer must return `status="complete"` with non-empty data. If all 5 gatherers fail, timeout, or return unavailable:

- `synthesize_dossier` produces a minimal dossier with `completeness_score=0.0`
- All sections populated with empty/default values
- `errors` list includes guidance: "All data sources failed. Check MCP server configuration and API credentials."
- `cache_result` and `enrich_crm` are skipped (nothing useful to cache or write back)

### 9.4 Partial Failure Continuation

The pipeline never halts on a single gatherer failure. Each gatherer's result is independently evaluated:

- `status="complete"` with data -> used in synthesis
- `status="complete"` with empty data -> source was available but had no records; completeness for that component = 0.0 with "no data found" annotation
- `status="unavailable"` -> source not configured; completeness for that component = 0.0 with "unavailable" annotation
- `status="error"` -> source available but API call failed; recorded in `sources_failed`
- `status="timeout"` -> 30s exceeded; recorded in `sources_failed`
- `None` (field not set) -> treated as timeout

### 9.5 Enrichment Best-Effort

CRM enrichment in the `enrich_crm` node is entirely best-effort:

- Only executes when `match_confidence >= 0.8`
- Only updates fields that are empty or previously auto-set (has "[Auto]" prefix)
- Never overwrites manually-entered CRM data
- On any Notion API error: logs the error, sets `enrichment_written=False`, pipeline completes normally
- Individual enrichment targets (Companies, Deals, Communications) are independently attempted; failure in one does not block others

---

## 10. Observability

### 10.1 LangSmith Tracing

Every graph invocation is traced as a single LangSmith run with child spans per node.

```python
from langsmith import traceable

@traceable(name="P20-client-context-loader", run_type="chain")
async def run_pipeline(request: ClientContextRequest) -> ClientContextState:
    graph = build_graph()
    state = ClientContextState(
        client_name=request.client_name,
        refresh=request.refresh,
        lookback_hours=request.hours,
        brief_only=request.brief_only,
    )
    return await graph.ainvoke(state)
```

Each node function is decorated with `@traceable(run_type="tool")` to create child spans.

### 10.2 Structured Logging

All log entries use structlog with these standard fields:

```python
import structlog

logger = structlog.get_logger()

# Per-node logging pattern:
logger.info(
    "node_started",
    node="gather_crm",
    client_name=state.client_name,
    trace_id=state.trace_id,
)

logger.info(
    "node_completed",
    node="gather_crm",
    client_name=state.client_name,
    status="complete",
    records_found=12,
    duration_ms=1847,
    trace_id=state.trace_id,
)

logger.warning(
    "node_failed",
    node="gather_docs",
    client_name=state.client_name,
    status="unavailable",
    reason="Google Drive credentials not configured",
    trace_id=state.trace_id,
)
```

### 10.3 Per-Node Timing

Every node records its execution time in `state.node_timings`:

```python
import time

async def timed_node(node_name: str, fn, state: ClientContextState):
    start = time.monotonic()
    try:
        result = await asyncio.wait_for(fn(state), timeout=TIMEOUTS[node_name])
    except asyncio.TimeoutError:
        result = handle_timeout(node_name, state)
    elapsed_ms = int((time.monotonic() - start) * 1000)
    state.node_timings[node_name] = elapsed_ms
    return result
```

### 10.4 Gatherer Success/Failure Tracking

The final state includes a complete summary usable for dashboards:

```python
# Available in the response after pipeline completion:
{
    "pipeline_metrics": {
        "total_duration_ms": 4523,
        "node_timings": {
            "check_cache": 45,
            "gather_crm": 1847,
            "gather_email": 2103,
            "gather_docs": 0,        # unavailable, instant return
            "gather_calendar": 1562,
            "gather_notes": 1234,
            "synthesize_dossier": 3201,
            "cache_result": 312,
            "enrich_crm": 198
        },
        "sources_used": ["notion_crm", "gmail", "google_calendar", "notion_notes"],
        "sources_failed": [],
        "sources_unavailable": ["google_drive"],
        "cache_hit": false,
        "cache_written": true,
        "enrichment_written": true,
        "completeness_score": 0.85,
        "health_score": 72,
        "match_confidence": 1.0,
        "gatherer_success_rate": 0.8,   # 4/5 returned data
        "errors": []
    }
}
```

### 10.5 FastAPI Endpoints

```python
from fastapi import FastAPI

app = FastAPI(title="P20 Client Context Loader", version="1.0.0")

@app.post("/api/v1/client/load", response_model=ClientContextResponse)
async def load_client(request: ClientContextRequest):
    """Full dossier pipeline."""
    ...

@app.post("/api/v1/client/brief", response_model=ClientBriefResponse)
async def client_brief(request: ClientContextRequest):
    """Executive brief (sets brief_only=True)."""
    ...

@app.get("/api/v1/client/cache/{client_name}", response_model=CacheStatusResponse)
async def check_cache_status(client_name: str):
    """Check if a cached dossier exists and its freshness."""
    ...

@app.delete("/api/v1/client/cache/{client_name}")
async def invalidate_cache(client_name: str):
    """Manually invalidate a cached dossier."""
    ...

@app.get("/api/v1/health")
async def health_check():
    """Service health check including Redis and Notion connectivity."""
    ...
```
