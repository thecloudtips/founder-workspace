# Adaptive Intelligence Engine — Design Spec

**Date**: 2026-03-11
**Status**: Approved
**Approach**: Hooks-First Intelligence (Approach 1) — separate behavioral layer on top of Memory Engine

## Problem

Founder OS plugins execute statelessly with no ability to learn from outcomes, recover from failures, or improve over time. Every execution is identical regardless of past performance. When a plugin fails due to a transient API issue, it crashes instead of retrying. When a user corrects plugin output for the 10th time, the plugin makes the same mistake on the 11th run.

## Goals

1. **Observability** — capture structured events from every plugin execution (command-level, MCP-level, decision-point-level)
2. **Adaptive learning** — detect usage patterns and output preferences, inject learned improvements into future runs
3. **Self-healing** — classify errors, retry transients, degrade gracefully, learn which fixes work
4. **Graduated autonomy** — start by asking, graduate to acting autonomously as confidence grows
5. **Full user control** — 6 slash commands for inspecting, approving, resetting, and configuring the system

## Architecture

### Relationship to Existing Specs

- **Memory Engine** (`_infrastructure/memory/`): Storage/retrieval system — "what do I know?" Intelligence Layer consumes it as a cross-plugin knowledge backend. Client-specific patterns (e.g., "Acme Corp prefers formal tone") flow to Memory Engine for cross-plugin availability. Plugin-specific patterns stay in Intelligence DB.
- **AIOS Enrichment** (`_infrastructure/context/`): Context files feed the Intelligence Layer's taste-learning module as baseline data. Intelligence refines from there.

### Two Components

**1. Infrastructure Layer** (`_infrastructure/intelligence/`)
Four modules: hooks, learning, self-healing, routing. Own SQLite database separate from Memory Engine. Not a plugin — no manifest, no commands.

**2. Adaptive Intel Plugin** (`founder-os-adaptive-intel/`)
User-facing plugin (#31, superpower plugin outside the core #01-#30 sequence) with 6 slash commands for full control over the intelligence system. Follows standard Anthropic plugin format. Syncs to Notion. Named "Adaptive Intel" to avoid collision with P07 Meeting Intelligence Hub.

### Directory Structure

```
_infrastructure/intelligence/
├── SKILL.md                        # Master reference: what the intelligence layer is, how plugins integrate
├── hooks/
│   ├── SKILL.md                    # Hook registry, event schema, lifecycle
│   └── schema/
│       └── intelligence.sql        # Full database schema (events, patterns, healing, config)
├── learning/
│   ├── SKILL.md                    # Retrieve-Judge-Distill-Consolidate-Route cycle
│   ├── taste-learning/
│   │   └── SKILL.md                # Output preference learning (Tier 1 — ships first)
│   ├── workflow-optimization/
│   │   └── SKILL.md                # Plugin chain pattern detection (Tier 2)
│   └── confidence-gating/
│       └── SKILL.md                # Graduated autonomy engine (Tier 3)
├── self-healing/
│   ├── SKILL.md                    # Error classification, retry, degradation
│   └── fallback-registry/
│       └── SKILL.md                # Known fallback paths per plugin (seed data for all 30)
└── routing/
    └── SKILL.md                    # Adaptive task routing decisions

founder-os-adaptive-intel/
├── .claude-plugin/
│   └── plugin.json
├── .mcp.json                       # Notion MCP server config
├── commands/
│   ├── intel-status.md             # /intel:status — dashboard view
│   ├── intel-patterns.md           # /intel:patterns [plugin] — view learned patterns
│   ├── intel-approve.md            # /intel:approve <pattern-id> — promote pattern
│   ├── intel-reset.md              # /intel:reset [plugin|all] — clear patterns
│   ├── intel-healing.md            # /intel:healing — self-healing event log
│   └── intel-config.md             # /intel:config — tune thresholds
├── skills/
│   └── notion-sync/
│       └── SKILL.md                # Sync patterns + healing log to [FOS] Intelligence DB
├── INSTALL.md
├── QUICKSTART.md
└── README.md
```

### Dependency Chain

```
Memory Engine (storage) ← Intelligence Layer (behavior) ← Adaptive Intel plugin (user commands)
                              ↑
                         All 30 plugins (emit events via convention)
```

### Ship Order

1. Hooks module + Adaptive Intel plugin (minimal: `/intel:status` only) — event capture with immediate user visibility
2. Learning module (Tier 1: taste-learning) + `/intel:patterns`, `/intel:approve`, `/intel:reset` commands
3. Self-healing module + `/intel:healing` command
4. `/intel:config` command + Notion sync skill
5. Learning module (Tier 2: workflow-optimization) — chain detection
6. Learning module (Tier 3: confidence-gating) — graduated autonomy
7. Routing module — adaptive task routing

> **Note**: The Adaptive Intel plugin ships incrementally alongside infrastructure modules (not deferred to the end). Each step adds commands as the backing infrastructure becomes available. This ensures user visibility from day one and enables iterative testing.

## Module 1: Hooks System

### Event Schema

```sql
CREATE TABLE events (
    id          TEXT PRIMARY KEY,        -- uuid
    timestamp   TEXT NOT NULL,           -- ISO 8601
    session_id  TEXT NOT NULL,           -- links events within one session
    plugin      TEXT NOT NULL,           -- e.g., "inbox-zero"
    command     TEXT NOT NULL,           -- e.g., "inbox-triage"
    event_type  TEXT NOT NULL,           -- pre_command | post_command | mcp_call | decision_point | error
    payload     TEXT NOT NULL,           -- JSON blob, schema varies by event_type
    outcome     TEXT,                    -- success | failure | degraded | null (for pre-events)
    duration_ms INTEGER                  -- wall clock time (post-events only)
);

CREATE INDEX idx_events_plugin ON events(plugin, command);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_outcome ON events(outcome);
CREATE INDEX idx_events_session ON events(session_id);
```

### Event Types

| Event Type | When Fired | Payload Contains |
|---|---|---|
| `pre_command` | Before plugin command starts | Input params, context files loaded, injected memories |
| `post_command` | After plugin command completes | Output summary, duration, success/failure, resources used |
| `mcp_call` | Each MCP tool invocation within a command | Tool name, params, response status, latency, data size |
| `decision_point` | Agent makes a significant choice | Decision description, options considered, choice made, reasoning |
| `error` | Any failure or exception | Error type, message, stack context, recovery attempted |

### Hook Lifecycle

```
User runs /inbox:triage
    │
    ├─ [pre_command] → log input params, context state
    │
    ├─ Plugin execution begins
    │   ├─ [mcp_call] → Notion query for tasks DB
    │   ├─ [mcp_call] → Gmail fetch via gws
    │   ├─ [decision_point] → "classified 3 emails as urgent based on sender + subject"
    │   ├─ [mcp_call] → Notion create task
    │   └─ [decision_point] → "drafted reply using formal tone, client has VIP tag"
    │
    ├─ [post_command] → log outcome, duration, output summary
    │
    └─ [error] → (only if something failed, triggers self-healing)
```

### Plugin Integration Convention

Each plugin command gets an observation block — convention-based pattern backed by the infrastructure skill reference.

**Pre-command block** (top of command file, ~5 lines):
```markdown
## Observation: Start
Before executing, emit a pre_command event:
- Record: command name, input parameters, timestamp
- Record: which context files were loaded (from AIOS enrichment)
- Record: which memories were injected (from Memory Engine)
```

**Decision-point annotation** (inline where agents make choices):
```markdown
## Observation: Decision
When classifying an email's priority, emit a decision_point event:
- Record: what was decided, what alternatives existed, why this choice
```

**Post-command block** (end of command file, ~5 lines):
```markdown
## Observation: End
After execution completes, emit a post_command event:
- Record: outcome (success/failure/degraded), duration, output summary
- If any MCP calls failed, record error events with context
```

### Observation Rules

- `pre_command` and `post_command` events are **convention-based** — each plugin command file includes the ~5-line observation blocks (same pattern as AIOS Enrichment context-loading blocks)
- `mcp_call` events are **opt-in per plugin** — plugins add a ~2-line annotation before significant MCP calls they want tracked. Not every MCP call needs logging; focus on calls whose latency or failure matters for learning. The hooks SKILL.md provides the annotation template.
- `decision_point` events are **opt-in annotations** — plugins add them at key choice moments
- Hooks are non-blocking — observe and record, never prevent execution
- Events are fire-and-forget local SQLite writes (negligible performance overhead)
- No cross-session hooks — each command execution is a self-contained observation window
- Retention: raw events kept 30 days, aggregated patterns kept indefinitely

## Module 2: Learning System

### The Cycle

```
OBSERVE → RETRIEVE → JUDGE → DISTILL → CONSOLIDATE → APPLY
   ↑                                                    │
   └────────────────── feedback ─────────────────────────┘
```

| Stage | What Happens | When |
|---|---|---|
| **Observe** | Hooks capture events from plugin execution | Real-time (during command run) |
| **Retrieve** | Pull relevant past patterns from intelligence DB | Before next run of same plugin |
| **Judge** | Compare current outcome to past patterns — better, worse, same? | After each post_command event |
| **Distill** | Extract generalizable insight from confirmed patterns | When pattern seen 3+ times |
| **Consolidate** | Store distilled pattern with confidence score | After distillation |
| **Apply** | Inject learned pattern as instruction into plugin context | Before next matching command run |

### Pattern Schema

```sql
CREATE TABLE patterns (
    id              TEXT PRIMARY KEY,
    pattern_type    TEXT NOT NULL,       -- taste | workflow | autonomy
    plugin          TEXT,                -- null = cross-plugin
    command         TEXT,                -- null = all commands in plugin
    description     TEXT NOT NULL,       -- human-readable: "prefers concise email drafts"
    instruction     TEXT NOT NULL,       -- injected text: "Keep email drafts under 150 words"
    confidence      REAL NOT NULL,       -- 0.0 to 1.0
    observations    INTEGER DEFAULT 0,  -- times pattern was observed
    confirmations   INTEGER DEFAULT 0,  -- times user accepted the pattern's output
    rejections      INTEGER DEFAULT 0,  -- times user overrode after pattern applied
    status          TEXT DEFAULT 'candidate', -- candidate | active | approved | rejected
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE INDEX idx_patterns_plugin ON patterns(plugin, command);
CREATE INDEX idx_patterns_status ON patterns(status);
CREATE INDEX idx_patterns_type ON patterns(pattern_type);
```

### Confidence Mechanics

- Formula: `confirmations / max(1, confirmations + rejections * 2)` — rejections weigh double; returns 0.0 when no data
- New patterns start with confidence = 0.0 (candidate status)
- Pattern applied when confidence >= 0.5 AND observations >= 3
- User always notified when a pattern is applied: `"[Intel] Applying learned preference: concise email drafts"`
- Rejected patterns kept for audit, excluded from application

### Confidence Lifecycle

```
candidate (conf < 0.5) → active (conf >= 0.5, auto-applied with notice)
                       → approved (user explicitly approved via /intel:approve)
                       → rejected (user rejected or conf dropped below 0.3)
```

### Tier 1: Taste Learning (ships first)

Learns user preferences for plugin outputs.

1. After a command runs, hooks capture the output
2. If the user edits/rejects/redoes the output, a `decision_point` event records what changed
3. The system detects repeated corrections (e.g., "user shortened email draft 4 out of 5 times")
4. After 3 confirmations of the same pattern, distills a preference: `"email drafts → prefer concise, under 150 words"`
5. Next time the command runs, the preference is injected as an instruction

### Tier 2: Workflow Optimization (ships second)

Detects plugin chain patterns and suggests/automates sequences.

1. Hooks track which commands run in sequence within a session
2. System detects repeated chains: "user runs `/crm:sync` then `/client:health` 5 out of 6 sessions"
3. Distills a workflow pattern: `"after crm-sync → suggest client-health-scan"`
4. At confidence >= 0.5: suggests the next command after the first completes
5. At confidence >= 0.8 OR user-approved: auto-triggers the chain

**Chain detection rules:**
- Commands within 5 minutes of each other in same session count as a chain
- Minimum 3 observations before suggesting
- Cross-plugin chains supported
- Max chain length: 4 commands (prevents runaway automation)

### Tier 3: Confidence-Gated Autonomy (ships last)

Graduated trust for recurring decisions.

1. Decision-point hooks capture repeated choices
2. System tracks user confirmation rate for that specific decision
3. Escalation ladder:
   - **Ask** (default): present decision, wait for confirmation
   - **Suggest** (conf >= 0.6, 5+ observations): pre-fill the choice, user confirms
   - **Act + Notify** (conf >= 0.8, 10+ observations OR user-approved): execute and notify
   - **Silent** (user-approved only, never auto-promoted): execute without notification
4. Any rejection at any level drops back to "Ask"

### Cross-Plugin Knowledge Boundary

When a pattern is generalizable across plugins, it gets promoted to the Memory Engine:

| Intelligence pattern_type | Has Company/Contact context? | Action | Memory Engine category | Confidence conversion |
|---|---|---|---|---|
| taste | Yes | Promote | `preference` | `round(confidence * 100)` |
| taste | No | Stay in Intelligence DB | — | — |
| workflow | Any | Promote | `workflow` | `round(confidence * 100)` |
| autonomy | Yes | Promote | `pattern` | `round(confidence * 100)` |
| autonomy | No | Stay in Intelligence DB | — | — |

> **Scale note**: Intelligence Layer uses `REAL 0.0-1.0`; Memory Engine uses `INTEGER 0-100`. Conversion: `memory.confidence = round(intelligence.confidence * 100)`. Memory Engine's `times_confirmed` maps to Intelligence's `confirmations`.

Memory Engine provides seed context; Intelligence Layer refines from observed behavior.

## Module 3: Self-Healing System

### Error Classification

| Category | Examples | Default Action |
|---|---|---|
| **Transient** | API rate limit, network timeout, 503 from Notion | Retry with backoff |
| **Recoverable** | Auth token expired, DB schema mismatch, missing Notion page | Fix + retry |
| **Degradable** | Optional MCP source unavailable, Slack offline, Drive inaccessible | Fall back + continue |
| **Fatal** | Invalid input, missing required DB, plugin misconfiguration | Stop + notify user |

Classification starts rule-based (HTTP status codes, known error strings) and improves over time — the learning system tracks which errors were actually transient vs persistent.

### Retry Engine

```
Error detected
    │
    ├─ Classify error
    │
    ├─ Transient?
    │   ├─ Attempt 1: wait 2s, retry same call
    │   ├─ Attempt 2: wait 5s, retry same call
    │   ├─ Attempt 3: wait 15s, retry same call
    │   └─ Exhausted → reclassify as Degradable or Fatal
    │
    ├─ Recoverable?
    │   ├─ Look up known fix from healing patterns DB
    │   ├─ Apply fix (e.g., refresh token, search alternate DB name)
    │   └─ Retry once → if still fails, reclassify as Fatal
    │
    ├─ Degradable?
    │   ├─ Look up fallback from fallback registry
    │   ├─ Execute fallback path
    │   ├─ Mark output as "degraded" with explanation
    │   └─ Log: which source was skipped, what user lost
    │
    └─ Fatal?
        ├─ Stop execution
        ├─ Present clear error + suggested manual fix
        └─ Log for pattern analysis
```

### Healing Patterns DB

```sql
CREATE TABLE healing_patterns (
    id              TEXT PRIMARY KEY,
    error_signature TEXT NOT NULL,       -- normalized: "notion_api:404:database_not_found"
    category        TEXT NOT NULL,       -- transient | recoverable | degradable | fatal
    fix_action      TEXT,                -- what to do: "search_alternate_db_names" | "retry_with_backoff"
    fallback_action TEXT,                -- degraded path if fix fails
    success_count   INTEGER DEFAULT 0,  -- times this fix worked
    failure_count   INTEGER DEFAULT 0,  -- times this fix didn't help
    last_seen       TEXT,
    plugin          TEXT,               -- null = cross-plugin pattern
    created_at      TEXT NOT NULL
);

CREATE INDEX idx_healing_sig ON healing_patterns(error_signature);
CREATE INDEX idx_healing_plugin ON healing_patterns(plugin);
```

### Fallback Registry (Seed Data)

Ships with known degradation paths for all 30 plugins:

| Plugin | Failure | Fallback |
|---|---|---|
| Any plugin | Notion DB not found | Search alternate DB names (3-step discovery), then skip Notion write + output to local file |
| P01 Inbox Zero | Gmail via gws unavailable | Notify user, skip triage, log partial state for next session |
| P02 Daily Briefing | Calendar fetch fails | Generate briefing from available sources only, note "calendar data missing" |
| P10 Client Health | One of 5 health score sources down | Calculate partial score, flag which metric is stale |
| P20 Client Context | Drive search returns nothing | Build dossier from Notion + Gmail only, note "no Drive documents found" |
| P21 CRM Sync | Gmail available but Calendar down | Sync email communications only, schedule calendar sync for next run |

Registry is seed data — the learning system extends it over time as it observes which fallback paths users accept vs reject.

### Learning From Failures

1. **Error frequency tracking** — same error 3+ times across sessions flagged as systemic issue
2. **Fix effectiveness** — tracks success/failure rate per fix action; below 50% success gets demoted
3. **Category reclassification** — "transient" error persisting 3+ sessions auto-reclassified
4. **User override learning** — if user manually fixes something classified as fatal, system learns that recovery path

### User Notifications

Every self-healing intervention produces a notification:
```
[Heal] Notion API returned 429 — retrying in 5s (attempt 2/3)
[Heal] Calendar unavailable — generating briefing without calendar data
[Heal] Recovered: refreshed Notion token, resuming command
[Heal] FAILED: Gmail unreachable after 3 retries — run /inbox:triage again when connectivity is restored
```

## Adaptive Intel Plugin

### Command Discovery

The `/intel:*` commands are **plugin commands** (not infrastructure commands) — they live in `founder-os-adaptive-intel/commands/` and are discovered when the plugin is installed, like all other Founder OS plugins. The infrastructure layer at `_infrastructure/intelligence/` contains only SKILL.md reference files consumed by other plugins' command files — no user-facing commands.

This differs from AIOS Enrichment's `/context:setup` which is an infrastructure command. The distinction: `/context:setup` is a one-time setup tool used across all plugins; `/intel:*` commands are ongoing management for a specific subsystem.

### Commands

#### `/intel:status`
Dashboard: hooks event count, active patterns with confidence, recent healing events, workflow chains detected.

#### `/intel:patterns [plugin|all]`
Deep dive into learned patterns. Filters: `--type=taste|workflow|autonomy`, `--status=candidate|active|approved|rejected`, `--detail <pattern-id>`.

#### `/intel:approve <pattern-id>`
Promote a pattern: boosts confidence to 1.0, locks status to `approved`. Works for taste patterns, workflow chains, and autonomy levels.

#### `/intel:reset [plugin|all]`
Clear learned patterns. Options: by plugin, by type, or all. Does NOT delete raw events. Confirmation required.

#### `/intel:healing`
Self-healing event log: recent events with outcomes, error frequency heatmap, fallback acceptance rate, systemic issues flagged for manual attention. Filter: `--plugin=<name>`.

#### `/intel:config`
Tune intelligence behavior:
```
learning.enabled           true
learning.taste.threshold   0.5       # confidence to auto-apply taste patterns
learning.workflow.suggest_threshold 0.5  # confidence to suggest next command
learning.workflow.trigger_threshold 0.8  # confidence to auto-trigger chains
learning.autonomy.max_level "notify" # cap: ask | suggest | notify | silent
healing.enabled            true
healing.max_retries        3
healing.fallback.enabled   true
hooks.retention_days       30
hooks.decision_points      true
```

### Notion Sync

Bidirectional sync to `[FOS] Intelligence` database:

| Property | Type | Content |
|---|---|---|
| Pattern | Title | Human-readable description |
| Plugin | Select | Which plugin (or "Cross-Plugin") |
| Type | Select | Taste / Workflow / Autonomy / Healing |
| Confidence | Number | 0.0-1.0 |
| Status | Status | Candidate / Active / Approved / Rejected |
| Observations | Number | Times seen |
| Last Applied | Date | Most recent application |
| Instruction | Rich Text | What gets injected into plugin context |

User can edit patterns in Notion — changes flow back to local DB on next sync.

### Plugin Manifest

```json
{
  "name": "founder-os-adaptive-intel",
  "display_name": "Adaptive Intelligence",
  "description": "Adaptive intelligence control panel — view learned patterns, manage self-healing, tune confidence thresholds",
  "version": "1.0.0",
  "type": "claude-code",
  "difficulty": "intermediate",
  "plugin_number": 31,
  "release_week": null,
  "agent_pattern": "none",
  "dependencies": ["founder-os-memory-hub"],
  "mcp_servers": ["@modelcontextprotocol/server-notion"],
  "capabilities": {
    "commands": ["intel-status", "intel-patterns", "intel-approve", "intel-reset", "intel-healing", "intel-config"],
    "skills": ["notion-sync"],
    "agent_teams": false
  },
  "author": {
    "name": "Founder OS",
    "url": "https://founderos.com"
  }
}
```

> **Note**: Plugin #31 is a "superpower plugin" — outside the core #01-#30 product sequence. It extends the platform's intelligence capabilities but is not part of the original 30-plugin deliverable.

### Notion DB Registration

The `[FOS] Intelligence` database must be added to the HQ template:

- **Manifest**: Add to `_infrastructure/notion-db-templates/founder-os-hq-manifest.json` under the "Growth & Meta" section
- **Template**: Create `_infrastructure/notion-db-templates/hq-intelligence.json` with the schema from the Notion Sync section above
- **Discovery**: Follows the standard 3-step pattern — search "[FOS] Intelligence" first, then "Founder OS HQ - Intelligence", then skip Notion sync

The Notion sync skill reads from **both** the `patterns` and `healing_patterns` SQLite tables, using the `Type` property (Taste/Workflow/Autonomy/Healing) to distinguish them in the single `[FOS] Intelligence` Notion DB.

## Inspiration

Architecture informed by claude-flow v3.5 (github.com/ruvnet/ruflo — also known as ruflo):
- SONA (Self-Optimizing Neural Architecture) → adapted as the learning cycle
- ReasoningBank retrieve-judge-distill-consolidate-route → adapted for plugin-level pattern detection
- EWC++ catastrophic forgetting prevention → confidence lifecycle with rejection weighting
- Hooks intelligence system → adapted as command/MCP/decision-point observation layer
- Self-healing workflows → error classification + retry + graceful degradation

Key adaptation: ruflo targets long-running multi-agent swarms; Founder OS targets single-execution plugin commands. This means no event bus (sequential execution), no swarm consensus (single agent), and observation windows scoped to individual command runs rather than continuous monitoring.
