# P20 Client Context Loader -- System Architecture

> LangGraph agent service implementing a parallel-gathering pattern with 5 gatherer nodes and 1 synthesis lead. Aggregates client data from Notion CRM, Gmail, Google Calendar, Google Drive, and Notion Notes into a unified dossier with caching, health scoring, and CRM enrichment writeback.

---

## Table of Contents

1. [Component Diagram](#1-component-diagram)
2. [Data Flow Diagram](#2-data-flow-diagram)
3. [Sequence Diagram](#3-sequence-diagram)
4. [State Schema Visual](#4-state-schema-visual)
5. [Node & Edge Definition Table](#5-node--edge-definition-table)
6. [Edge Definitions](#6-edge-definitions)
7. [Cache Architecture](#7-cache-architecture)
8. [Error Handling Flow](#8-error-handling-flow)
9. [Deployment Architecture](#9-deployment-architecture)

---

## 1. Component Diagram

```mermaid
graph TD
    subgraph Client
        HTTP[HTTP Client]
    end

    subgraph "FastAPI Layer"
        API_LOAD["POST /api/v1/client/load"]
        API_BRIEF["POST /api/v1/client/brief"]
        API_HEALTH["GET /health\nGET /health/ready\nGET /health/sources"]
    end

    subgraph "LangGraph Orchestration"
        CC[check_cache]

        subgraph "Parallel Gatherers (Send)"
            G_CRM[gather_crm]
            G_EMAIL[gather_email]
            G_DOCS[gather_docs]
            G_CAL[gather_calendar]
            G_NOTES[gather_notes]
        end

        SYN[synthesize_dossier]
        CACHE[cache_result]
        ENRICH[enrich_crm]
    end

    subgraph "Cache Layer"
        REDIS[(Redis\nTTL 24h)]
        SQLITE[(SQLite\nDev Fallback)]
    end

    subgraph "External SDKs"
        NOTION[Notion SDK\nnotion-client]
        GOOGLE[Google API SDK\ngoogle-api-python-client]
    end

    subgraph "External Services"
        NOTION_API[Notion API]
        GMAIL_API[Gmail API]
        GCAL_API[Google Calendar API]
        GDRIVE_API[Google Drive API]
    end

    subgraph "LLM Providers"
        CLAUDE[Claude API\nPrimary -- Synthesis]
        ZAI["Z.ai GLM-5\nFallback -- Extraction"]
    end

    subgraph "Observability"
        LS[LangSmith\nTracing & Deployment]
    end

    HTTP --> API_LOAD
    HTTP --> API_BRIEF
    HTTP --> API_HEALTH

    API_LOAD --> CC
    API_BRIEF --> CC

    CC --> REDIS
    CC --> SQLITE

    CC -->|cache miss| G_CRM
    CC -->|cache miss| G_EMAIL
    CC -->|cache miss| G_DOCS
    CC -->|cache miss| G_CAL
    CC -->|cache miss| G_NOTES

    G_CRM --> NOTION
    G_NOTES --> NOTION
    G_EMAIL --> GOOGLE
    G_CAL --> GOOGLE
    G_DOCS --> GOOGLE

    NOTION --> NOTION_API
    GOOGLE --> GMAIL_API
    GOOGLE --> GCAL_API
    GOOGLE --> GDRIVE_API

    G_CRM --> SYN
    G_EMAIL --> SYN
    G_DOCS --> SYN
    G_CAL --> SYN
    G_NOTES --> SYN

    SYN --> CLAUDE
    G_CRM -.-> ZAI
    G_EMAIL -.-> ZAI
    G_DOCS -.-> ZAI
    G_CAL -.-> ZAI
    G_NOTES -.-> ZAI

    SYN --> CACHE
    CACHE --> REDIS
    CACHE --> NOTION

    CACHE --> ENRICH
    ENRICH --> NOTION

    CC -.-> LS
    SYN -.-> LS
    ENRICH -.-> LS
```

**Key relationships:**

| Component | Used By Nodes | Purpose |
|-----------|---------------|---------|
| Notion SDK (`notion-client`) | `gather_crm`, `gather_notes`, `cache_result`, `enrich_crm` | CRM reads, notes queries, dossier cache persistence, enrichment writeback |
| Google API SDK (`google-api-python-client`) | `gather_email`, `gather_calendar`, `gather_docs` | Gmail threads, Calendar events, Drive file search |
| Claude API | `synthesize_dossier` | Primary LLM for dossier synthesis, sentiment analysis, health scoring |
| Z.ai GLM-5 | `gather_crm`, `gather_email`, `gather_docs`, `gather_calendar`, `gather_notes` | Fallback LLM for structured extraction tasks within gatherers |
| Redis | `check_cache`, `cache_result` | Fast TTL-based dossier cache (production) |
| SQLite | `check_cache`, `cache_result` | Development cache fallback |
| LangSmith | All nodes | Distributed tracing, run observability, deployment target |

---

## 2. Data Flow Diagram

```mermaid
graph TD
    START((START)) --> CC[check_cache]

    CC -->|"cache_hit=true\ncached_dossier loaded"| END_HIT((END))

    CC -->|"cache_hit=false"| FAN{Fan-Out\nvia Send}

    FAN -->|Send| G_CRM[gather_crm]
    FAN -->|Send| G_EMAIL[gather_email]
    FAN -->|Send| G_DOCS[gather_docs]
    FAN -->|Send| G_CAL[gather_calendar]
    FAN -->|Send| G_NOTES[gather_notes]

    G_CRM -->|"crm_result:\ncompany, contacts,\ndeals, communications,\ntenure, interaction_counts"| SYN[synthesize_dossier]

    G_EMAIL -->|"email_result:\nthreads, comm_stats,\nsentiment, topics,\nopen_threads"| SYN

    G_DOCS -->|"docs_result:\ndocuments,\ndocument_stats"| SYN

    G_CAL -->|"calendar_result:\npast_meetings,\nupcoming_meetings,\nmeeting_stats"| SYN

    G_NOTES -->|"notes_result:\nmeeting_notes,\ncommunications,\nopen_items, decisions"| SYN

    SYN -->|"dossier (7 sections)\ncompleteness_score\nhealth_score"| CACHE_W[cache_result]

    CACHE_W -->|"cache_written=true"| ENRICH[enrich_crm]

    ENRICH -->|"enrichments_written:\nhealth_score,\nrisk_levels,\nsentiment"| END_DONE((END))

    style G_CRM fill:#e1f5fe
    style G_EMAIL fill:#e1f5fe
    style G_DOCS fill:#e1f5fe
    style G_CAL fill:#e1f5fe
    style G_NOTES fill:#e1f5fe
    style SYN fill:#c8e6c9
    style CC fill:#fff9c4
    style CACHE_W fill:#fff9c4
    style ENRICH fill:#f3e5f5
```

**Data cardinality through the pipeline:**

| Stage | Input Records | Output Records |
|-------|--------------|----------------|
| check_cache | 1 client name | 0 or 1 cached dossier |
| gather_crm | 1 company lookup | 1 company + N contacts + N deals + N communications |
| gather_email | N contact emails | N threads (last 180 days) |
| gather_docs | 1 company name | N documents |
| gather_calendar | N contact emails | N past events + N upcoming events |
| gather_notes | 1 company name | N meeting notes + N communications + N open items |
| synthesize_dossier | 5 gatherer results | 1 dossier (7 sections) + 1 completeness score + 1 health score |
| cache_result | 1 dossier | 1 Redis entry + 1 Notion page |
| enrich_crm | 1 dossier | N CRM property updates |

---

## 3. Sequence Diagram

This diagram shows the full request lifecycle for a **cache-miss** scenario on the `/client/load` endpoint.

```mermaid
sequenceDiagram
    actor Client
    participant API as FastAPI
    participant Graph as LangGraph
    participant CC as check_cache
    participant Redis
    participant GCRM as gather_crm
    participant GEML as gather_email
    participant GDOC as gather_docs
    participant GCAL as gather_calendar
    participant GNOT as gather_notes
    participant Notion as Notion API
    participant Gmail as Gmail API
    participant Drive as Drive API
    participant Cal as Calendar API
    participant LLM as Claude API
    participant ZAI as Z.ai GLM-5
    participant SYN as synthesize_dossier
    participant CACH as cache_result
    participant ENR as enrich_crm

    Client->>API: POST /api/v1/client/load {client_name, refresh: false}
    API->>Graph: invoke(state={client_name, refresh_flag})

    Graph->>CC: execute
    CC->>Redis: GET client_context:acme-corp
    Redis-->>CC: null (cache miss)
    CC-->>Graph: {cache_hit: false}

    Note over Graph: Fan-out via Send() -- 5 parallel gatherers

    par Parallel Execution
        Graph->>GCRM: execute(client_name)
        GCRM->>Notion: Search "Companies" DB
        Notion-->>GCRM: Company record
        GCRM->>Notion: Query Contacts relation
        Notion-->>GCRM: Contact records + emails
        GCRM->>Notion: Query Deals relation
        Notion-->>GCRM: Active deals
        GCRM->>Notion: Query Communications (180d)
        Notion-->>GCRM: Communication entries
        GCRM-->>Graph: crm_result

    and
        Graph->>GEML: execute(client_name, contact_emails)
        GEML->>Gmail: Search threads by contact emails
        Gmail-->>GEML: Thread list
        GEML->>Gmail: Get messages (last 10)
        Gmail-->>GEML: Message content
        GEML->>ZAI: Extract sentiment signals
        ZAI-->>GEML: Sentiment indicators
        GEML-->>Graph: email_result

    and
        Graph->>GDOC: execute(client_name)
        GDOC->>Drive: Search files by company name
        Drive-->>GDOC: File list + metadata
        GDOC-->>Graph: docs_result

    and
        Graph->>GCAL: execute(client_name, contact_emails)
        GCAL->>Cal: List events (180d past, 30d future)
        Cal-->>GCAL: Event list
        GCAL-->>Graph: calendar_result

    and
        Graph->>GNOT: execute(client_name)
        GNOT->>Notion: Search pages by client name
        Notion-->>GNOT: Meeting notes pages
        GNOT->>Notion: Query Communications DB (Meeting/Note types)
        Notion-->>GNOT: Communication entries
        GNOT->>ZAI: Extract decisions + open items
        ZAI-->>GNOT: Structured extractions
        GNOT-->>Graph: notes_result
    end

    Note over Graph: Fan-in -- all gatherers complete

    Graph->>SYN: execute(crm_result, email_result, docs_result, calendar_result, notes_result)
    SYN->>LLM: Synthesize 7-section dossier
    LLM-->>SYN: Dossier content
    SYN->>SYN: Calculate completeness_score (weighted)
    SYN->>SYN: Calculate health_score (6-component formula)
    SYN->>SYN: Detect risk_flags
    SYN-->>Graph: {dossier, completeness_score, health_score}

    Graph->>CACH: execute(dossier, scores)
    CACH->>Redis: SET client_context:acme-corp (TTL 24h)
    Redis-->>CACH: OK
    CACH->>Notion: Upsert "Client Dossiers" page
    Notion-->>CACH: Page ID
    CACH-->>Graph: {cache_written: true}

    Graph->>ENR: execute(dossier.sentiment_and_health, crm_result.deals)
    ENR->>Notion: Update Companies.Client Health Score
    Notion-->>ENR: OK
    ENR->>Notion: Update Deals.Risk Level (per deal)
    Notion-->>ENR: OK
    ENR->>Notion: Update Communications.Sentiment (latest entry)
    Notion-->>ENR: OK
    ENR-->>Graph: {enrichments_written: {health: true, risk: true, sentiment: true}}

    Graph-->>API: Final state (dossier + metadata)
    API-->>Client: 200 {dossier, metadata}
```

---

## 4. State Schema Visual

The LangGraph `ClientContextState` TypedDict contains these fields. The table shows which nodes read (`R`) and write (`W`) each field.

| State Field | Type | check_cache | gather_crm | gather_email | gather_docs | gather_calendar | gather_notes | synthesize_dossier | cache_result | enrich_crm |
|---|---|---|---|---|---|---|---|---|---|---|
| `client_name` | `str` | R | R | R | R | R | R | R | R | R |
| `refresh_flag` | `bool` | R | | | | | | | | |
| `cache_hit` | `bool` | W | | | | | | R | | |
| `cached_dossier` | `dict or None` | W | | | | | | R | | |
| `cache_metadata` | `dict or None` | W | | | | | | | | |
| `crm_result` | `dict or None` | | W | | | | | R | | R |
| `contact_emails` | `list[str]` | | W | R | | R | | | | |
| `email_result` | `dict or None` | | | W | | | | R | | |
| `docs_result` | `dict or None` | | | | W | | | R | | |
| `calendar_result` | `dict or None` | | | | | W | | R | | |
| `notes_result` | `dict or None` | | | | | | W | R | | |
| `dossier` | `dict (7 sections)` | | | | | | | W | R | R |
| `completeness_score` | `float (0.0-1.0)` | | | | | | | W | R | |
| `completeness_breakdown` | `dict` | | | | | | | W | R | |
| `health_score` | `int (0-100)` | | | | | | | W | R | R |
| `risk_flags` | `list[dict]` | | | | | | | W | | R |
| `cache_written` | `bool` | | | | | | | | W | |
| `enrichments_written` | `dict` | | | | | | | | | W |
| `match_confidence` | `float (0.0-1.0)` | | W | | | | | R | R | R |
| `sources_used` | `list[str]` | | | | | | | W | R | |
| `sources_failed` | `list[str]` | | | | | | | W | | |
| `error` | `str or None` | W | W | W | W | W | W | W | W | W |

**State mutation rules:**
- Gatherer nodes only write their own `*_result` field plus `contact_emails` (CRM populates this for downstream gatherers).
- `synthesize_dossier` is the only node that reads all five `*_result` fields.
- `enrich_crm` reads the synthesized `dossier` and `crm_result` but never modifies them.
- All nodes may write to `error` on failure.

---

## 5. Node & Edge Definition Table

### Node Definitions

| # | Node Name | Purpose | SDKs / Tools | LLM | Input State | Output State | Timeout | Required |
|---|-----------|---------|-------------|-----|-------------|--------------|---------|----------|
| 1 | `check_cache` | Look up existing dossier in Redis (or SQLite fallback); short-circuit if fresh | Redis, SQLite | None | `client_name`, `refresh_flag` | `cache_hit`, `cached_dossier`, `cache_metadata` | 5s | Yes |
| 2 | `gather_crm` | Search Notion CRM Pro for company, contacts, deals, communications | `notion-client` | Z.ai (extraction fallback) | `client_name` | `crm_result`, `contact_emails`, `match_confidence` | 30s | Yes (required source) |
| 3 | `gather_email` | Search Gmail for threads with client contacts; extract sentiment | `google-api-python-client` (Gmail) | Z.ai (sentiment extraction) | `client_name`, `contact_emails` | `email_result` | 30s | Yes (required source) |
| 4 | `gather_docs` | Search Google Drive for documents related to client | `google-api-python-client` (Drive) | None | `client_name` | `docs_result` | 30s | No (optional) |
| 5 | `gather_calendar` | List past and upcoming meetings with client attendees | `google-api-python-client` (Calendar) | None | `client_name`, `contact_emails` | `calendar_result` | 30s | No (optional) |
| 6 | `gather_notes` | Search Notion pages and Communications DB for meeting notes and decisions | `notion-client` | Z.ai (decision/action extraction) | `client_name` | `notes_result` | 30s | No (optional) |
| 7 | `synthesize_dossier` | Merge all gatherer outputs into 7-section dossier; score completeness and health | None (pure logic + LLM) | Claude (primary) | All `*_result` fields, `cache_hit`, `cached_dossier` | `dossier`, `completeness_score`, `completeness_breakdown`, `health_score`, `risk_flags`, `sources_used`, `sources_failed` | 60s | Yes |
| 8 | `cache_result` | Persist dossier to Redis (TTL) and Notion ("Client Dossiers" DB) | Redis, `notion-client` | None | `dossier`, `completeness_score`, `health_score`, `match_confidence`, `sources_used` | `cache_written` | 15s | Yes (best-effort) |
| 9 | `enrich_crm` | Write health score, risk levels, sentiment back to CRM Pro databases | `notion-client` | None | `dossier`, `crm_result`, `health_score`, `risk_flags`, `match_confidence` | `enrichments_written` | 15s | No (best-effort) |

### LLM Assignment Rationale

| LLM | Assignment | Rationale |
|-----|-----------|-----------|
| Claude API | `synthesize_dossier` (primary) | Complex multi-source synthesis, sentiment reasoning, health score justification -- requires highest capability |
| Z.ai GLM-5 | Gatherer extraction tasks (fallback) | Structured extraction from API responses (sentiment signals, decision detection, action item parsing) -- cost-efficient for repetitive tasks |
| None | `check_cache`, `cache_result`, `enrich_crm`, `gather_docs`, `gather_calendar` | Pure data operations with no natural-language reasoning required |

---

## 6. Edge Definitions

```mermaid
graph TD
    START((START)) -->|always| CC[check_cache]
    CC -->|"cache_hit=true"| END1((END))
    CC -->|"cache_hit=false"| SEND["Send() fan-out"]

    SEND -->|"Send(gather_crm)"| G1[gather_crm]
    SEND -->|"Send(gather_email)"| G2[gather_email]
    SEND -->|"Send(gather_docs)"| G3[gather_docs]
    SEND -->|"Send(gather_calendar)"| G4[gather_calendar]
    SEND -->|"Send(gather_notes)"| G5[gather_notes]

    G1 -->|always| SYN[synthesize_dossier]
    G2 -->|always| SYN
    G3 -->|always| SYN
    G4 -->|always| SYN
    G5 -->|always| SYN

    SYN -->|always| CACHE[cache_result]
    CACHE -->|always| ENRICH[enrich_crm]
    ENRICH -->|always| END2((END))
```

| # | From Node | To Node | Condition | Description |
|---|-----------|---------|-----------|-------------|
| 1 | `START` | `check_cache` | Always | Entry point; every invocation begins with cache check |
| 2 | `check_cache` | `END` | `cache_hit == true AND refresh_flag == false` | Short-circuit: return cached dossier, skip all gathering |
| 3 | `check_cache` | Fan-out (`Send()`) | `cache_hit == false OR refresh_flag == true` | Cache miss or forced refresh: dispatch all 5 gatherers in parallel |
| 4 | Fan-out | `gather_crm` | Always (via `Send()`) | Parallel dispatch |
| 5 | Fan-out | `gather_email` | Always (via `Send()`) | Parallel dispatch; depends on `contact_emails` from CRM but uses fallback name search if CRM incomplete |
| 6 | Fan-out | `gather_docs` | Always (via `Send()`) | Parallel dispatch |
| 7 | Fan-out | `gather_calendar` | Always (via `Send()`) | Parallel dispatch; uses `contact_emails` when available |
| 8 | Fan-out | `gather_notes` | Always (via `Send()`) | Parallel dispatch |
| 9 | `gather_crm` | `synthesize_dossier` | Always (fan-in) | Gatherer result collected; fan-in waits for all 5 |
| 10 | `gather_email` | `synthesize_dossier` | Always (fan-in) | Gatherer result collected |
| 11 | `gather_docs` | `synthesize_dossier` | Always (fan-in) | Gatherer result collected |
| 12 | `gather_calendar` | `synthesize_dossier` | Always (fan-in) | Gatherer result collected |
| 13 | `gather_notes` | `synthesize_dossier` | Always (fan-in) | Gatherer result collected |
| 14 | `synthesize_dossier` | `cache_result` | Always | Dossier assembled; persist to cache |
| 15 | `cache_result` | `enrich_crm` | Always | Cache written (or failed); proceed to enrichment |
| 16 | `enrich_crm` | `END` | Always | Pipeline complete; return final state |

**Edge notes:**
- The fan-out uses LangGraph's `Send()` API to dispatch all 5 gatherers simultaneously.
- Fan-in is implicit: `synthesize_dossier` is not invoked until all 5 `Send()` branches have returned (or timed out).
- `gather_email` and `gather_calendar` benefit from `contact_emails` populated by `gather_crm`, but because all gatherers run in parallel, they use fallback name-based search if contact emails are not yet available. In practice, `gather_crm` often completes first and updates shared state, but the architecture does not depend on this ordering.

---

## 7. Cache Architecture

### Three-Tier Cache Strategy

```mermaid
graph TD
    subgraph "Tier 1: Redis (Hot Cache)"
        R_READ["Redis GET\nclient_context:{name}"]
        R_WRITE["Redis SET\nclient_context:{name}\nTTL: 86400s (24h)"]
    end

    subgraph "Tier 2: Notion (Persistent Cache)"
        N_READ["Notion Query\nClient Dossiers DB\nfilter: Client Name = X"]
        N_WRITE["Notion Upsert\nClient Dossiers page\n7 properties"]
    end

    subgraph "Tier 3: SQLite (Dev Fallback)"
        S_READ["SQLite SELECT\nFROM dossier_cache\nWHERE client = X"]
        S_WRITE["SQLite INSERT/REPLACE\nINTO dossier_cache\nexpires_at = now + 24h"]
    end

    CC[check_cache node] -->|"1. Try Redis"| R_READ
    R_READ -->|"HIT"| RETURN_CACHED[Return cached dossier]
    R_READ -->|"MISS or unavailable"| N_READ
    N_READ -->|"HIT + fresh (< 24h)"| RETURN_CACHED
    N_READ -->|"HIT + stale (> 24h)"| MARK_STALE["Mark Stale=true\nProceed to gather"]
    N_READ -->|"MISS or unavailable"| S_READ
    S_READ -->|"HIT + not expired"| RETURN_CACHED
    S_READ -->|"MISS"| GATHER["Proceed to gather"]

    CACHE_W[cache_result node] -->|"1. Write Redis"| R_WRITE
    CACHE_W -->|"2. Write Notion"| N_WRITE
    CACHE_W -->|"3. Write SQLite (dev only)"| S_WRITE
```

### Cache Key Schema

| Tier | Key Format | Value | TTL | Eviction |
|------|-----------|-------|-----|----------|
| Redis | `client_context:{slugified_name}` | JSON-serialized dossier + metadata | 24 hours (86400s) | TTL expiry |
| Notion | "Client Dossiers" DB page, title = Client Name | Structured page with 7 properties (see context-lead agent spec) | `Stale` checkbox set after 24h | Manual or overwrite on next cache write |
| SQLite | `dossier_cache` table, `client` column | JSON blob in `dossier` column | `expires_at` timestamp column | Application-level check on read |

### Read Path Priority

1. **Redis** -- Sub-millisecond lookup. Used in production. If Redis is unavailable (connection error), fall through silently.
2. **Notion** -- Seconds-range lookup. Always attempted if Redis misses. Serves as human-readable persistent cache. Freshness checked via `Generated At` property.
3. **SQLite** -- Local file. Used only when `ENVIRONMENT=development`. Never deployed to production.

### Write Path (All Tiers)

On every fresh dossier synthesis, `cache_result` writes to all available tiers in parallel. Write failures are logged but never block the pipeline -- the dossier is already assembled and will be returned to the caller regardless.

### Cache Invalidation

| Trigger | Action |
|---------|--------|
| TTL expiry (24h) | Redis key auto-deleted; Notion `Stale` checkbox set on next read |
| `refresh=true` parameter | Bypass cache read entirely; overwrite all tiers after synthesis |
| Client name change in CRM | Not auto-detected; stale cache remains until TTL or manual refresh |

---

## 8. Error Handling Flow

```mermaid
graph TD
    subgraph "Gatherer Failure Handling"
        G_START[Gatherer Executes] --> G_CHECK{Success?}

        G_CHECK -->|Yes| G_OK["Return *_result\nstatus: complete"]
        G_CHECK -->|Timeout 30s| G_TIMEOUT["Return *_result = None\nstatus: timeout\nAdd to sources_failed"]
        G_CHECK -->|SDK Error| G_ERR["Return *_result = None\nstatus: error\nAdd to sources_failed"]
        G_CHECK -->|MCP Unavailable| G_UNAVAIL["Return *_result = None\nstatus: unavailable\nAdd to sources_unavailable"]
    end

    subgraph "Synthesis Failure Modes"
        SYN_START[synthesize_dossier] --> SYN_CHECK{How many\ngatherers\nsucceeded?}

        SYN_CHECK -->|"5/5 or 4/5"| FULL["Full dossier\ncompleteness >= 0.7"]
        SYN_CHECK -->|"3/5 or 2/5"| PARTIAL["Partial dossier\ncompleteness 0.3-0.7\nEmpty sections marked"]
        SYN_CHECK -->|"1/5"| MINIMAL["Minimal dossier\ncompleteness < 0.3\nWarning: low confidence"]
        SYN_CHECK -->|"0/5"| FAIL["Return error response\ncompleteness: 0.0\nGuidance: check MCP config"]
    end

    subgraph "Required vs Optional Sources"
        REQ_CHECK{Required source\nfailed?}
        REQ_CHECK -->|"CRM failed"| CRM_DEGRADE["Cap completeness at 0.4\nBuild partial profile\nfrom email/calendar"]
        REQ_CHECK -->|"Email failed"| EMAIL_DEGRADE["Cap completeness at 0.5\nNo sentiment analysis\nNo response metrics"]
        REQ_CHECK -->|"Both CRM + Email failed"| BOTH_DEGRADE["Cap completeness at 0.2\nCalendar/Drive/Notes only\nProfile section empty"]

        OPT_CHECK{Optional source\nfailed?}
        OPT_CHECK -->|"Calendar unavailable"| CAL_SKIP["Skip calendar sections\nSet calendar_data: 0.0\nNote: unavailable"]
        OPT_CHECK -->|"Drive unavailable"| DRIVE_SKIP["Skip documents section\nSet documents: 0.0\nNote: unavailable"]
        OPT_CHECK -->|"Notes unavailable"| NOTES_SKIP["Skip decisions/open items\nSet notes: 0.0\nNote: unavailable"]
    end

    subgraph "Post-Synthesis Error Handling"
        CACHE_FAIL["cache_result fails"] --> CACHE_LOG["Log failure\nContinue pipeline\nReturn dossier anyway"]
        ENRICH_FAIL["enrich_crm fails"] --> ENRICH_LOG["Log failure\nContinue pipeline\nReturn dossier anyway"]
        ENRICH_CONF["match_confidence < 0.8"] --> ENRICH_SKIP["Skip all enrichments\nLog: confidence too low"]
    end
```

### Failure Propagation Rules

| Failure Scenario | Impact | Recovery |
|-----------------|--------|----------|
| Redis unavailable | Cache read falls through to Notion/SQLite; cache write skipped for Redis | Pipeline continues; slightly slower |
| Notion unavailable | CRM + Notes gatherers return `status: unavailable`; cache writes to Redis/SQLite only | Dossier built from Gmail/Calendar/Drive |
| Gmail unavailable | Email gatherer returns `status: unavailable` | No sentiment analysis; completeness capped |
| Google APIs unavailable | Email + Calendar + Docs gatherers fail | CRM + Notes only (Notion-based dossier) |
| Claude API unavailable | Synthesis node fails | Return raw gatherer data without synthesis; HTTP 503 |
| Z.ai GLM-5 unavailable | Gatherer extraction falls back to regex/heuristic parsing | Reduced extraction quality; pipeline continues |
| All 5 gatherers fail | Synthesis returns `completeness: 0.0` | HTTP 200 with empty dossier + error guidance |
| Single gatherer timeout (30s) | That source marked as `timeout` in `sources_failed` | Other 4 sources proceed normally |

### Minimum Viability

Per `teams/config.json`, `minimum_gatherers_required: 1`. The pipeline produces a dossier as long as at least one gatherer returns data. The completeness score transparently communicates data confidence to the caller.

---

## 9. Deployment Architecture

### Production: Railway

```mermaid
graph TD
    subgraph "Internet"
        CLIENT[API Client]
    end

    subgraph "Railway Project"
        subgraph "Web Service"
            DOCKER[Docker Container]
            subgraph "Application"
                UVICORN[Uvicorn\nASGI Server]
                FASTAPI[FastAPI\nApp]
                LANGGRAPH[LangGraph\nGraph Runner]
            end
        end

        subgraph "Redis Service"
            REDIS_SVC[(Redis 7.x\nManaged)]
        end
    end

    subgraph "External Services"
        NOTION_EXT[Notion API\napi.notion.com]
        GOOGLE_EXT[Google APIs\ngmail, calendar, drive]
        CLAUDE_EXT[Claude API\napi.anthropic.com]
        ZAI_EXT[Z.ai API\napi.z.ai]
        LANGSMITH_EXT[LangSmith\napi.smith.langchain.com]
    end

    CLIENT -->|"HTTPS\nport 443"| UVICORN
    UVICORN --> FASTAPI
    FASTAPI --> LANGGRAPH

    LANGGRAPH <-->|"TCP 6379\nRAILWAY_REDIS_URL"| REDIS_SVC
    LANGGRAPH <-->|HTTPS| NOTION_EXT
    LANGGRAPH <-->|HTTPS| GOOGLE_EXT
    LANGGRAPH <-->|HTTPS| CLAUDE_EXT
    LANGGRAPH <-->|HTTPS| ZAI_EXT
    LANGGRAPH -.->|"HTTPS\nAsync traces"| LANGSMITH_EXT
```

### LangSmith Deployment Variant

```mermaid
graph TD
    subgraph "LangSmith Platform"
        LS_DEPLOY[LangSmith Deployment\nManaged Infrastructure]
        LS_TRACE[LangSmith Tracing\nRun Dashboard]
        LS_MONITOR[LangSmith Monitoring\nAlerts & Metrics]
    end

    subgraph "Deployed Graph"
        LS_GRAPH[P20 Client Context Loader\nLangGraph Cloud]
    end

    subgraph "External Services"
        REDIS_MNG[(Managed Redis\nvia LangSmith infra)]
        NOTION_API2[Notion API]
        GOOGLE_API2[Google APIs]
        LLM_API2[Claude + Z.ai APIs]
    end

    LS_DEPLOY --> LS_GRAPH
    LS_GRAPH --> LS_TRACE
    LS_TRACE --> LS_MONITOR

    LS_GRAPH <--> REDIS_MNG
    LS_GRAPH <--> NOTION_API2
    LS_GRAPH <--> GOOGLE_API2
    LS_GRAPH <--> LLM_API2
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API authentication |
| `ZAI_API_KEY` | Yes | Z.ai GLM-5 API authentication |
| `NOTION_API_KEY` | Yes | Notion integration token |
| `GOOGLE_CREDENTIALS_JSON` | Yes | Google service account or OAuth credentials (Gmail, Calendar, Drive) |
| `REDIS_URL` | Prod only | Redis connection string (Railway provides `RAILWAY_REDIS_URL`) |
| `LANGSMITH_API_KEY` | No | LangSmith tracing and deployment |
| `LANGSMITH_PROJECT` | No | LangSmith project name (default: `p20-client-context-loader`) |
| `ENVIRONMENT` | No | `production` or `development` (controls SQLite fallback, debug logging) |
| `LOG_LEVEL` | No | `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`) |
| `GATHERER_TIMEOUT_SECONDS` | No | Per-gatherer timeout (default: `30`) |
| `CACHE_TTL_HOURS` | No | Dossier cache TTL (default: `24`) |

### Container Specification

```
Base image:     python:3.12-slim
Exposed port:   8000
Healthcheck:    GET /health (interval: 30s, timeout: 5s, retries: 3)
Memory:         512 MB (minimum), 1 GB (recommended)
CPU:            0.5 vCPU (minimum), 1 vCPU (recommended)
Startup time:   < 10 seconds (Uvicorn + LangGraph graph compilation)
```

---

## Appendix: API Request/Response Schemas

### POST /api/v1/client/load

**Request:**
```json
{
  "client_name": "Acme Corp",
  "refresh": false,
  "lookback_hours": 4320,
  "team_mode": true
}
```

**Response (200):**
```json
{
  "client_name": "Acme Corp",
  "dossier": {
    "profile": { },
    "relationship_history": { },
    "recent_activity": [ ],
    "open_items": [ ],
    "upcoming": [ ],
    "sentiment_and_health": {
      "overall_sentiment": "positive",
      "email_sentiment": "positive",
      "meeting_sentiment": "stable",
      "deal_sentiment": "positive",
      "engagement_level": "high",
      "engagement_trend": "stable",
      "risk_flags": [],
      "health_score": 82,
      "health_label": "Excellent"
    },
    "key_documents": [ ]
  },
  "metadata": {
    "completeness_score": 0.92,
    "completeness_breakdown": {
      "crm_profile": 1.0,
      "contacts": 1.0,
      "deal_status": 1.0,
      "email_history": 1.0,
      "calendar_data": 0.5,
      "documents": 1.0,
      "notes_decisions": 0.5
    },
    "sources_used": ["notion_crm", "gmail", "google_drive", "google_calendar", "notion_notes"],
    "sources_failed": [],
    "sources_unavailable": [],
    "match_confidence": 1.0,
    "from_cache": false,
    "generated_at": "2026-03-05T10:30:00Z",
    "cache_ttl_hours": 24
  }
}
```

### POST /api/v1/client/brief

**Request:**
```json
{
  "client_name": "Acme Corp"
}
```

**Response (200):** Returns an executive brief (markdown string) generated from the cached or freshly-built dossier, following the Executive Brief Template defined in the `relationship-summary` skill.

### GET /health/sources

**Response (200):**
```json
{
  "notion": "available",
  "gmail": "available",
  "google_calendar": "available",
  "google_drive": "unavailable",
  "redis": "available",
  "claude": "available",
  "zai": "available"
}
```
