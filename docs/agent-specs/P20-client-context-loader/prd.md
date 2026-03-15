# P20 Client Context Loader Agent Service PRD

**Version**: 1.0
**Date**: 2026-03-05
**Status**: Draft
**Plugin Source**: `founder-os-client-context-loader/`
**Architecture Pattern**: Parallel Gathering (5 gatherers + 1 lead)

---

## 1. Problem Statement

The P20 Client Context Loader exists as a Claude Code plugin -- a collection of markdown skill files, agent definitions, and slash commands executed within the Claude Code IDE. This architecture has fundamental limitations:

1. **No external API access.** Other services, dashboards, and automations cannot call the plugin. A CRM webhook, a Slack bot, or a meeting prep workflow cannot trigger a client context load programmatically.
2. **No webhook triggers.** Events like "new deal created in Notion" or "meeting starting in 15 minutes" cannot automatically generate or refresh a client dossier.
3. **No observability.** There is no structured logging, latency tracking, trace correlation, or error rate monitoring. Failures are silent and unrecoverable.
4. **No caching layer beyond Notion.** The 24h TTL cache lives in a Notion database, meaning every cache check requires a Notion API call. There is no fast in-memory or Redis-based cache.
5. **No concurrency.** The plugin processes one client at a time within a single Claude Code session. Batch operations (e.g., refreshing all client dossiers overnight) are not possible.
6. **Tight MCP coupling.** Data access flows through MCP server processes (Node.js child processes for Notion, Gmail, etc.), adding latency and limiting deployment flexibility.

This PRD defines the conversion of P20 into a standalone LangGraph-based API service that exposes REST endpoints, runs as a deployable container, and replaces MCP servers with native Python SDKs.

---

## 2. Goals and Non-Goals

### Goals

- **G1**: Expose `/client:load` and `/client:brief` as authenticated REST API endpoints with full request/response contracts.
- **G2**: Preserve the exact 6-agent parallel gathering architecture (crm, email, docs, calendar, notes gatherers + context-lead) as a LangGraph state graph.
- **G3**: Replace all MCP server dependencies with native Python SDK calls (notion-client, google-api-python-client).
- **G4**: Implement a two-tier cache: Redis (or SQLite in dev) for fast lookups, Notion for persistent human-readable storage.
- **G5**: Achieve < 30s response time for cached requests and < 90s for full pipeline execution.
- **G6**: Support partial failure tolerance -- the pipeline must produce a dossier if at least 1 gatherer succeeds (matching the plugin's `minimum_gatherers_required: 1`).
- **G7**: Provide full LangSmith tracing for every graph execution, with per-node timing and intermediate state visibility.
- **G8**: Deploy as a Docker container to Railway, with LangSmith Deployment as an alternative target.

### Non-Goals

- **NG1**: Building a web UI or dashboard. This service is API-only.
- **NG2**: Supporting real-time streaming/SSE of partial dossier results. The response is returned when the full pipeline completes.
- **NG3**: Implementing authentication/authorization beyond API key validation. OAuth, RBAC, and multi-tenant isolation are deferred.
- **NG4**: Converting other Founder OS plugins. This PRD covers P20 only (though it serves as a template).
- **NG5**: Migrating existing Notion "Client Dossiers" data. The service creates new cache entries; legacy entries remain readable.
- **NG6**: Implementing the CRM enrichment writeback in v1.0. The health score, risk level, and sentiment writeback to CRM Pro databases is deferred to v1.1 to reduce scope.

---

## 3. User Stories

### US-1: API Consumer (Internal Service)

> As an internal service (e.g., the meeting prep automation), I want to call `POST /api/v1/client/load` with a client name and receive a structured JSON dossier so that I can embed client context into my own workflows without depending on Claude Code.

**Acceptance Criteria:**
- Request with `client_name` returns a complete dossier JSON within 90s.
- Cached results return within 30s.
- Partial failures (e.g., Google Drive unavailable) do not prevent a response.
- Response includes `metadata.completeness_score` so the caller can assess data quality.

### US-2: CRM Webhook Trigger

> As a Notion webhook handler, I want to trigger a dossier refresh when a deal stage changes so that the cached dossier always reflects the latest CRM state.

**Acceptance Criteria:**
- `POST /api/v1/client/load` with `refresh: true` bypasses cache and runs the full pipeline.
- The refreshed dossier is written to both Redis and Notion cache.
- The webhook handler receives a 202 Accepted for async processing or a 200 with the full dossier for sync processing.

### US-3: Meeting Prep Automation

> As the meeting prep service (P03), I want to call `POST /api/v1/client/brief` 15 minutes before a meeting and receive a 500-word executive brief so that I can include it in the meeting prep document.

**Acceptance Criteria:**
- Brief endpoint returns within 30s when a cached dossier exists.
- Brief is structured markdown, under 500 words.
- If no cached dossier exists, the response includes a `recommendation` field suggesting a full load.

### US-4: DevOps Monitoring

> As a DevOps engineer, I want to monitor the health of the client context service -- latency percentiles, error rates, cache hit ratios, and per-gatherer success rates -- so that I can detect degradation before users notice.

**Acceptance Criteria:**
- `GET /health` returns service status, uptime, and dependency connectivity.
- LangSmith traces are emitted for every request with per-node timing.
- Structured logs include `request_id`, `client_name`, `duration_ms`, `cache_hit`, `gatherer_statuses`.

---

## 4. Functional Requirements

### 4.1 Endpoint Mapping

| Plugin Command | API Endpoint | Method | Auth |
|---|---|---|---|
| `/client:load [name]` | `/api/v1/client/load` | POST | API Key |
| `/client:brief [name]` | `/api/v1/client/brief` | POST | API Key |
| (new) | `/health` | GET | None |

### 4.2 Endpoint Specifications

#### POST /api/v1/client/load

Runs the full client context gathering pipeline or returns a cached dossier.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `client_name` | string | Yes | -- | Company or client name to search for |
| `refresh` | boolean | No | `false` | Bypass cache and force fresh data gathering |
| `lookback_hours` | integer | No | `4320` (180 days) | Lookback window in hours for email and calendar searches |
| `team_mode` | boolean | No | `false` | When `true`, runs the full 6-agent parallel pipeline. When `false`, runs a lightweight CRM + email single-pass. |

**Behavior:**

1. Validate request parameters. Return 422 if `client_name` is missing or empty.
2. If `refresh` is `false`, check Redis cache for an unexpired dossier (24h TTL).
3. If cache hit, return the cached dossier with `metadata.from_cache: true`.
4. If cache miss or `refresh: true`, execute the LangGraph pipeline:
   - **Phase 1 (Parallel):** Launch all 5 gatherer nodes concurrently with a 30s per-node timeout.
   - **Phase 2 (Synthesis):** Run the context-lead node to merge gatherer outputs.
5. Cache the result in Redis (24h TTL) and Notion ("Client Dossiers" database).
6. Return the assembled dossier.

**team_mode behavior:**
- `false` (default): Single-pass execution. The service uses one LLM call to query CRM and Gmail, assemble a dossier, and score completeness. No parallel gathering. Faster but less thorough.
- `true`: Full LangGraph parallel pipeline with all 6 agent nodes. More thorough, higher latency.

#### POST /api/v1/client/brief

Generates a concise executive brief from an existing dossier.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `client_name` | string | Yes | -- | Company or client name |

**Behavior:**

1. Validate request parameters.
2. Check Redis cache for a dossier matching `client_name`.
3. If found (any age): generate a 500-word executive brief using the relationship-summary skill logic. If the dossier is older than 24h, include `stale: true` and `recommendation: "Run /api/v1/client/load with refresh=true"` in the response.
4. If not found: check Notion "Client Dossiers" database as fallback cache.
5. If still not found: return 404 with a recommendation to call `/api/v1/client/load` first.

#### GET /health

**Response:** Service health, uptime, and dependency connectivity status.

### 4.3 LangGraph State Graph

The pipeline is modeled as a LangGraph `StateGraph` with the following nodes and edges:

```
                    +---> crm_gatherer ----+
                    |                      |
                    +---> email_gatherer --+
                    |                      |
START --> router -->+---> docs_gatherer ---+--> context_lead --> END
                    |                      |
                    +---> calendar_gatherer+
                    |                      |
                    +---> notes_gatherer --+
```

**Nodes:**

| Node | Maps to Agent | Timeout | Required | LLM |
|---|---|---|---|---|
| `router` | (new) | 2s | Yes | None (logic only) |
| `crm_gatherer` | crm-agent | 30s | Yes (Notion) | Fallback LLM |
| `email_gatherer` | email-agent | 30s | Yes (Gmail) | Fallback LLM |
| `docs_gatherer` | docs-agent | 30s | No (Drive) | Fallback LLM |
| `calendar_gatherer` | calendar-agent | 30s | No (Calendar) | Fallback LLM |
| `notes_gatherer` | notes-agent | 30s | No (Notion) | Fallback LLM |
| `context_lead` | context-lead | 45s | Yes | Primary LLM (Claude) |

**State Schema:**

```python
class ClientContextState(TypedDict):
    client_name: str
    lookback_hours: int
    team_mode: bool
    refresh: bool

    # Gatherer outputs (populated in parallel)
    crm_result: GathererOutput       # from crm_gatherer
    email_result: GathererOutput     # from email_gatherer
    docs_result: GathererOutput      # from docs_gatherer
    calendar_result: GathererOutput  # from calendar_gatherer
    notes_result: GathererOutput     # from notes_gatherer

    # Final output (populated by context_lead)
    dossier: DossierOutput
    metadata: DossierMetadata
    error: Optional[str]
```

**GathererOutput schema** (matches plugin agent output format):

```python
class GathererOutput(TypedDict):
    source: str                          # "notion_crm" | "gmail" | "google_drive" | "google_calendar" | "notion_notes"
    status: Literal["complete", "error", "unavailable"]
    data: dict                           # Source-specific data (see Section 6)
    metadata: dict                       # records_found, confidence, etc.
```

### 4.4 Client Name Matching

The service preserves the plugin's 3-step fuzzy matching strategy:

1. **Exact match**: Case-sensitive title match in Notion Companies database.
2. **Partial match**: Case-insensitive substring match (client name contained in company name or vice versa). Confidence: 0.8.
3. **Abbreviation match**: Common abbreviation expansion (e.g., "IBM" to "International Business Machines"). Confidence: 0.5.

When multiple matches are found:
- If the top match has confidence >= 0.8, use it automatically.
- If all matches score below 0.8, return a 300-style response with `multiple_matches` array and require the caller to resubmit with an exact name.

### 4.5 Cache Architecture

| Layer | Technology | TTL | Purpose |
|---|---|---|---|
| L1 | Redis (prod) / SQLite (dev) | 24 hours | Fast lookup, avoids Notion API call on cache hit |
| L2 | Notion "Client Dossiers" DB | 24 hours (soft, via Stale checkbox) | Human-readable, persistent, survives Redis eviction |

**Cache key**: Normalized lowercase `client_name`.

**Write flow**: On fresh synthesis, write to L1 and L2 concurrently. L2 write failure does not fail the request.

**Read flow**: Check L1 first. On L1 miss, check L2. On L2 hit, backfill L1. On both miss, run the pipeline.

---

## 5. API Contract

### 5.1 POST /api/v1/client/load

#### Request

```json
{
  "client_name": "Acme Corp",
  "refresh": false,
  "lookback_hours": 4320,
  "team_mode": true
}
```

#### Success Response (200 OK)

```json
{
  "client_name": "Acme Corp",
  "dossier": {
    "profile": {
      "company_name": "Acme Corp",
      "industry": "Technology",
      "size": "SMB",
      "status": "Active",
      "website": "https://acme.example.com",
      "relationship_owner": "Jane Doe",
      "tenure_months": 14,
      "primary_contact": {
        "name": "Bob Chen",
        "role": "VP Engineering",
        "email": "bob@acme.example.com",
        "type": "Decision Maker"
      },
      "contacts_count": 3,
      "active_deals": [
        {
          "name": "Acme Platform Rebuild",
          "value": 75000,
          "stage": "Proposal",
          "close_date": "2026-04-15",
          "probability": 60,
          "risk_level": "Low"
        }
      ]
    },
    "relationship_history": {
      "first_contact_date": "2024-12-10",
      "total_interactions": 80,
      "interaction_counts": {
        "email": 45,
        "meeting": 12,
        "call": 8,
        "note": 15
      },
      "engagement_trend": "stable",
      "avg_response_time_hours": 3.2,
      "messages_per_month": 14.5
    },
    "recent_activity": [
      {
        "date": "2026-03-03T14:30:00Z",
        "type": "email",
        "summary": "Discussed Q2 roadmap priorities and timeline adjustments"
      },
      {
        "date": "2026-02-28T10:00:00Z",
        "type": "meeting",
        "summary": "Quarterly business review -- scope expansion approved"
      }
    ],
    "open_items": [
      {
        "item": "Send updated proposal with mobile scope by March 10",
        "source": "Q4 Review Notes",
        "date_created": "2026-02-28",
        "age_days": 5,
        "status": "open"
      }
    ],
    "upcoming": [
      {
        "date": "2026-03-12T15:00:00Z",
        "type": "meeting",
        "description": "Technical deep-dive: mobile architecture"
      },
      {
        "date": "2026-04-15",
        "type": "deal_milestone",
        "description": "Acme Platform Rebuild -- expected close date"
      }
    ],
    "sentiment_and_health": {
      "overall_sentiment": "positive",
      "email_sentiment": "positive",
      "meeting_sentiment": "stable",
      "deal_sentiment": "positive",
      "engagement_level": "high",
      "engagement_trend": "stable",
      "risk_flags": [],
      "health_score": 82,
      "health_label": "Excellent",
      "health_breakdown": {
        "contact_recency": { "score": 100, "weight": 0.25 },
        "response_quality": { "score": 100, "weight": 0.20 },
        "engagement_level": { "score": 100, "weight": 0.20 },
        "deal_progress": { "score": 60, "weight": 0.15 },
        "task_completion": { "score": 75, "weight": 0.10 },
        "sentiment": { "score": 100, "weight": 0.10 }
      }
    },
    "key_documents": [
      {
        "title": "Acme Corp - Q1 Proposal",
        "category": "Proposal",
        "url": "https://docs.google.com/document/d/...",
        "last_modified": "2026-03-01T09:00:00Z",
        "active": true
      }
    ]
  },
  "metadata": {
    "completeness_score": 0.92,
    "completeness_breakdown": {
      "crm_profile": { "score": 1.0, "status": "complete" },
      "contacts": { "score": 1.0, "status": "complete" },
      "deal_status": { "score": 1.0, "status": "complete" },
      "email_history": { "score": 1.0, "status": "complete" },
      "calendar_data": { "score": 0.5, "status": "complete" },
      "documents": { "score": 1.0, "status": "complete" },
      "notes_decisions": { "score": 0.5, "status": "complete" }
    },
    "sources_used": ["notion_crm", "gmail", "google_drive", "google_calendar", "notion_notes"],
    "sources_failed": [],
    "sources_unavailable": [],
    "match_confidence": 1.0,
    "match_type": "exact",
    "from_cache": false,
    "generated_at": "2026-03-05T14:30:00Z",
    "cache_ttl_hours": 24,
    "pipeline_timing": {
      "total_ms": 12340,
      "crm_gatherer_ms": 3200,
      "email_gatherer_ms": 4100,
      "docs_gatherer_ms": 2800,
      "calendar_gatherer_ms": 2100,
      "notes_gatherer_ms": 3400,
      "context_lead_ms": 5200
    }
  }
}
```

### 5.2 POST /api/v1/client/brief

#### Request

```json
{
  "client_name": "Acme Corp"
}
```

#### Success Response (200 OK)

```json
{
  "client_name": "Acme Corp",
  "brief": "# Client Brief: Acme Corp\n\n**Generated**: 2026-03-05 | **Health**: 82/100 (Excellent) | **Data**: 0.92\n\n---\n\n## Profile\n**Acme Corp** | Technology | SMB | Active\n**Primary Contact**: Bob Chen (VP Engineering) -- bob@acme.example.com\n**Relationship Owner**: Jane Doe | **Tenure**: 14 months\n**Active Deals**: 1 | **Value**: $75,000\n\n## Recent Activity (Last 30 Days)\n- 2 days ago: Email -- Discussed Q2 roadmap priorities\n- Last week: Meeting -- Quarterly business review\n...\n\n## Open Items\n- [ ] Send updated proposal with mobile scope *(from Q4 Review Notes)*\n...\n\n## Upcoming\n- Mar 12: Technical deep-dive: mobile architecture\n- Apr 15: Deal close date -- Acme Platform Rebuild\n\n## Sentiment & Risk\n**Sentiment**: Positive (stable)\n**Engagement**: High (stable)\n**Risk Flags**: None\n\n## Key Documents\n- Acme Corp - Q1 Proposal (Proposal, 4 days ago)\n\n---\n*Brief generated from cached dossier (3 hours old).*",
  "health_score": 82,
  "health_label": "Excellent",
  "completeness_score": 0.92,
  "stale": false,
  "dossier_age_hours": 3.2,
  "generated_at": "2026-03-05T14:35:00Z"
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
    "notion": { "status": "connected", "latency_ms": 120 },
    "gmail": { "status": "connected", "latency_ms": 95 },
    "google_calendar": { "status": "connected", "latency_ms": 88 },
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
  "message": "client_name is required and must be a non-empty string",
  "details": {
    "field": "client_name",
    "constraint": "required"
  }
}
```

#### 404 Not Found (brief endpoint, no cached dossier)

```json
{
  "error": "dossier_not_found",
  "message": "No cached dossier found for 'Acme Corp'",
  "recommendation": "Call POST /api/v1/client/load with client_name='Acme Corp' first"
}
```

#### 300 Multiple Choices (ambiguous client name)

```json
{
  "error": "ambiguous_match",
  "message": "Multiple companies match 'Acme'. Please resubmit with an exact name.",
  "multiple_matches": [
    { "name": "Acme Corp", "confidence": 0.7, "status": "Active" },
    { "name": "Acme Industries", "confidence": 0.65, "status": "Prospect" },
    { "name": "Acme Digital", "confidence": 0.6, "status": "Active" }
  ]
}
```

#### 500 Internal Server Error

```json
{
  "error": "pipeline_error",
  "message": "All gatherer agents failed. Unable to produce a dossier.",
  "request_id": "req_abc123",
  "details": {
    "crm_gatherer": "Notion API timeout after 30s",
    "email_gatherer": "Gmail authentication expired",
    "docs_gatherer": "unavailable",
    "calendar_gatherer": "unavailable",
    "notes_gatherer": "Notion API timeout after 30s"
  }
}
```

#### 503 Service Unavailable

```json
{
  "error": "service_unavailable",
  "message": "Required dependency 'notion' is not reachable",
  "retry_after_seconds": 30
}
```

---

## 6. Non-Functional Requirements

### 6.1 Latency

| Scenario | Target | Hard Limit |
|---|---|---|
| Cache hit (L1 Redis) | < 5s | 30s |
| Cache hit (L2 Notion fallback) | < 15s | 30s |
| Full pipeline (team_mode=false) | < 30s | 60s |
| Full pipeline (team_mode=true) | < 60s | 90s |
| Brief generation from cache | < 10s | 30s |
| Health check | < 500ms | 2s |

### 6.2 Partial Failure Tolerance

- The pipeline must produce a dossier if **at least 1 gatherer** returns `status: "complete"` (matching `minimum_gatherers_required: 1` from the plugin config).
- Each gatherer node has an independent 30s timeout. A timed-out gatherer returns `status: "error"` with a timeout message; the pipeline continues.
- Optional sources (Google Drive, Google Calendar) return `status: "unavailable"` when their SDK credentials are not configured. This is not an error.
- The context-lead node must distinguish between "unavailable" (no credentials), "error" (credentials exist but call failed), and "no data found" (call succeeded, zero results).

### 6.3 Rate Limits and Quotas

| Service | Relevant Limit | Mitigation |
|---|---|---|
| Notion API | 3 requests/second per integration | Sequential Notion calls within crm_gatherer and notes_gatherer; batched relation lookups |
| Gmail API | 250 quota units/second per user | Limit to 50 most recent threads; use `list` then selective `get` |
| Google Calendar API | 500 requests/100s per user | Single `list` call with timeMin/timeMax; no pagination unless > 250 events |
| Google Drive API | 1000 requests/100s per project | Single `files.list` call with `q` filter |
| Claude API | Tier-dependent TPM | Primary LLM used only for context-lead synthesis; gatherers use fallback LLM |

### 6.4 Concurrency

- The service must handle at least 10 concurrent requests.
- Each request spawns up to 5 parallel gatherer tasks. Total concurrent external API calls per request: up to 5.
- Redis operations are atomic and non-blocking.
- Notion cache writes are fire-and-forget (do not block response).

### 6.5 Security

- All endpoints (except `/health`) require an `Authorization: Bearer <API_KEY>` header.
- API keys are stored as environment variables, not in code.
- External service credentials (Notion API key, Google OAuth tokens) are stored as environment variables.
- No PII is logged. Client names and email addresses are redacted in structured logs (replaced with hashes).
- Notion and Google API calls use the minimum required OAuth scopes.

---

## 7. Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| p50 latency (cached) | < 3s | LangSmith trace duration |
| p95 latency (cached) | < 15s | LangSmith trace duration |
| p50 latency (full pipeline) | < 45s | LangSmith trace duration |
| p95 latency (full pipeline) | < 75s | LangSmith trace duration |
| Cache hit rate | > 60% after 7 days of use | Redis hit/miss counter |
| Gatherer success rate (per source) | > 95% when credentials configured | Per-node status counter |
| Trace completeness | 100% of requests have a LangSmith trace | LangSmith project dashboard |
| Error rate (5xx) | < 1% of requests | Application error counter |
| Partial dossier rate | < 10% of non-cached requests | Requests where completeness_score < 0.5 |
| Brief generation success rate | > 99% when dossier exists in cache | 200 vs 404 response ratio |
| Dossier completeness (average) | > 0.7 | Mean `completeness_score` across all generated dossiers |

---

## 8. Dependencies and Integrations

### 8.1 External Services

| Service | Purpose | SDK | Auth Method |
|---|---|---|---|
| Notion | CRM data (Companies, Contacts, Deals, Communications), Notes pages, Dossier cache (L2) | `notion-client` (Python) | Integration token (env: `NOTION_API_KEY`) |
| Gmail | Email thread history, sentiment signals | `google-api-python-client` (Gmail API v1) | OAuth 2.0 service account or user token (env: `GOOGLE_CREDENTIALS_JSON`) |
| Google Calendar | Meeting history, upcoming events, engagement trends | `google-api-python-client` (Calendar API v3) | OAuth 2.0 (shared credentials with Gmail) |
| Google Drive | Client-related documents | `google-api-python-client` (Drive API v3) | OAuth 2.0 (shared credentials with Gmail) |
| Redis | L1 cache | `redis-py` | Connection string (env: `REDIS_URL`) |

### 8.2 LLM Providers

| Provider | Role | Model | Usage |
|---|---|---|---|
| Anthropic Claude API | Primary LLM | claude-sonnet-4-20250514 (or latest) | Context-lead synthesis: merging gatherer outputs, calculating sentiment, generating briefs. Estimated 1 call per request, ~4K input tokens, ~2K output tokens. |
| Z.ai GLM-5 | Fallback LLM | glm-5 | Gatherer extraction tasks: summarizing email threads, categorizing documents, detecting decisions in notes. Used when structured extraction is sufficient and Claude is not needed. Estimated 2-5 calls per request. |

### 8.3 Infrastructure

| Component | Technology | Purpose |
|---|---|---|
| API Framework | FastAPI | REST endpoints, request validation, OpenAPI docs |
| Graph Engine | LangGraph | State graph orchestration, parallel node execution, checkpointing |
| Observability | LangSmith | Trace collection, latency tracking, debugging |
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
| `google-api-python-client` | >= 2.150 | Google APIs (Gmail, Calendar, Drive) |
| `google-auth` | >= 2.35 | Google OAuth |
| `redis` | >= 5.2 | Redis client |
| `pydantic` | >= 2.9 | Request/response models, state validation |

---

## 9. Out of Scope

The following items are explicitly excluded from this PRD and v1.0 implementation:

1. **CRM enrichment writeback.** The plugin writes health scores, risk levels, and sentiment back to Notion CRM databases. This is deferred to v1.1 because it involves write operations to the user's source-of-truth CRM and requires careful idempotency, "[Auto]" prefix tracking, and match confidence gating.

2. **Batch operations.** Refreshing all client dossiers in a single API call (e.g., nightly cron job) is not covered. Individual clients can be refreshed via the `/load` endpoint.

3. **WebSocket or SSE streaming.** Partial dossier results are not streamed as they become available. The response waits for full pipeline completion.

4. **Multi-tenant support.** The service assumes a single set of Notion/Google credentials. Supporting multiple users with separate credentials requires tenant isolation, credential vaulting, and per-tenant rate limiting.

5. **Custom gatherer configuration.** The set of 5 gatherers is fixed. Users cannot add custom data sources or disable specific gatherers via the API (optional sources auto-detect credential availability).

6. **Historical dossier versioning.** Only the latest dossier is cached. Previous versions are overwritten. A dossier history/diff feature is not included.

7. **Notion database creation.** The service assumes the CRM Pro databases (Companies, Contacts, Deals, Communications) already exist. It discovers them by title but does not create them. The "Client Dossiers" cache database is lazy-created as in the plugin.

8. **Plugin interoperability.** Cross-plugin data reads (P10 Client Health Dashboard reading P20 dossiers, P21 CRM Sync writing to the same Communications DB) are not coordinated in v1.0. Each service operates independently.

9. **UI or admin panel.** No web interface for viewing dossiers, managing cache, or configuring the service.

10. **Load testing and capacity planning.** Performance targets are defined but formal load testing methodology and infrastructure sizing are not specified here.
