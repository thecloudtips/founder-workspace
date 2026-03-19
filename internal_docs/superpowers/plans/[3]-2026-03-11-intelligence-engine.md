# Adaptive Intelligence Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an adaptive intelligence layer that observes plugin execution, learns user preferences, self-heals from failures, and provides full user control via 6 slash commands.

**Architecture:** Hooks-first approach — infrastructure layer at `_infrastructure/intelligence/` with its own SQLite DB, user-facing plugin at `founder-os-adaptive-intel/`. Ships incrementally: hooks + minimal plugin first, then learning, then self-healing, then config/sync. Each chunk produces working, testable software.

**Tech Stack:** Markdown SKILL.md files, SQL schema files, JSON plugin manifest, Notion DB template JSON

**Spec:** `docs/superpowers/specs/2026-03-11-intelligence-engine-design.md`

**Dependency:** Requires Memory Engine (`_infrastructure/memory/`) to be designed but NOT necessarily built — the Intelligence Layer can operate standalone initially, with Memory Engine integration wired in later.

---

## Chunk 1: Hooks Module + Minimal Plugin

Establishes the event capture infrastructure and the `/intel:status` command for immediate user visibility.

### Task 1: Create SQLite event schema

**Files:**
- Create: `_infrastructure/intelligence/hooks/schema/intelligence.sql`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p _infrastructure/intelligence/hooks/schema
mkdir -p _infrastructure/intelligence/learning/taste-learning
mkdir -p _infrastructure/intelligence/learning/workflow-optimization
mkdir -p _infrastructure/intelligence/learning/confidence-gating
mkdir -p _infrastructure/intelligence/self-healing/fallback-registry
mkdir -p _infrastructure/intelligence/routing
```

- [ ] **Step 2: Write the events schema**

```sql
-- Adaptive Intelligence Engine — Event Store
-- Separate SQLite database from Memory Engine
-- File: intelligence.db (created at runtime in plugin data directory)

CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,        -- uuid v4
    timestamp   TEXT NOT NULL,           -- ISO 8601
    session_id  TEXT NOT NULL,           -- links events within one session
    plugin      TEXT NOT NULL,           -- e.g., "inbox-zero"
    command     TEXT NOT NULL,           -- e.g., "inbox-triage"
    event_type  TEXT NOT NULL CHECK(event_type IN ('pre_command', 'post_command', 'mcp_call', 'decision_point', 'error')),
    payload     TEXT NOT NULL,           -- JSON blob, schema varies by event_type
    outcome     TEXT CHECK(outcome IN ('success', 'failure', 'degraded') OR outcome IS NULL),
    duration_ms INTEGER                  -- wall clock time (post-events only)
);

CREATE INDEX IF NOT EXISTS idx_events_plugin ON events(plugin, command);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_outcome ON events(outcome);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);

-- Patterns table (used by Learning module, created here for schema completeness)
CREATE TABLE IF NOT EXISTS patterns (
    id              TEXT PRIMARY KEY,
    pattern_type    TEXT NOT NULL CHECK(pattern_type IN ('taste', 'workflow', 'autonomy')),
    plugin          TEXT,                -- null = cross-plugin
    command         TEXT,                -- null = all commands in plugin
    description     TEXT NOT NULL,       -- human-readable
    instruction     TEXT NOT NULL,       -- injected text
    confidence      REAL NOT NULL DEFAULT 0.0,
    observations    INTEGER DEFAULT 0,
    confirmations   INTEGER DEFAULT 0,
    rejections      INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'candidate' CHECK(status IN ('candidate', 'active', 'approved', 'rejected')),
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patterns_plugin ON patterns(plugin, command);
CREATE INDEX IF NOT EXISTS idx_patterns_status ON patterns(status);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(pattern_type);

-- Healing patterns table (used by Self-Healing module)
CREATE TABLE IF NOT EXISTS healing_patterns (
    id              TEXT PRIMARY KEY,
    error_signature TEXT NOT NULL,       -- normalized: "notion_api:404:database_not_found"
    category        TEXT NOT NULL CHECK(category IN ('transient', 'recoverable', 'degradable', 'fatal')),
    fix_action      TEXT,                -- what to do
    fallback_action TEXT,                -- degraded path if fix fails
    success_count   INTEGER DEFAULT 0,
    failure_count   INTEGER DEFAULT 0,
    last_seen       TEXT,
    plugin          TEXT,               -- null = cross-plugin pattern
    created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_healing_sig ON healing_patterns(error_signature);
CREATE INDEX IF NOT EXISTS idx_healing_plugin ON healing_patterns(plugin);

-- Configuration table
CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Default configuration values
INSERT OR IGNORE INTO config (key, value) VALUES
    ('learning.enabled', 'true'),
    ('learning.taste.threshold', '0.5'),
    ('learning.workflow.suggest_threshold', '0.5'),
    ('learning.workflow.trigger_threshold', '0.8'),
    ('learning.autonomy.max_level', 'notify'),
    ('healing.enabled', 'true'),
    ('healing.max_retries', '3'),
    ('healing.fallback.enabled', 'true'),
    ('hooks.retention_days', '30'),
    ('hooks.decision_points', 'true');
```

Write to `_infrastructure/intelligence/hooks/schema/intelligence.sql`.

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/intelligence/
git commit -m "feat(intelligence): create event store schema and directory structure"
```

### Task 2: Create hooks SKILL.md

**Files:**
- Create: `_infrastructure/intelligence/hooks/SKILL.md`

- [ ] **Step 1: Write the hooks skill reference**

```markdown
---
name: intelligence-hooks
description: Event observation system for the Adaptive Intelligence Engine. Defines event schema, observation conventions, and annotation templates that plugins use to emit structured events during execution.
---

## Overview

The hooks system captures structured events from plugin command execution. Events are written to the Intelligence SQLite database (`intelligence.db`) and used by the learning and self-healing modules to detect patterns and improve over time.

## Event Types

| Event Type | When | Who Emits |
|---|---|---|
| `pre_command` | Before command starts | Plugin command file (convention block) |
| `post_command` | After command completes | Plugin command file (convention block) |
| `mcp_call` | After a significant MCP tool call | Plugin command file (opt-in annotation) |
| `decision_point` | Agent makes a key choice | Plugin command file (opt-in annotation) |
| `error` | Any failure or exception | Plugin command file (convention block) |

## Plugin Integration

Plugins emit events by including observation blocks in their command files. This follows the same pattern as AIOS Enrichment context-loading blocks — a ~5-line addition per command file.

### Pre-Command Block (required)

Add to the top of every command file, after any context-loading block:

```
## Observation: Start
Before executing this command, record the following to the Intelligence event store:
- Event type: pre_command
- Plugin: [plugin-name]
- Command: [command-name]
- Payload: { input parameters, context files loaded, memories injected }
- Generate a session_id (UUID) for this execution and use it for all subsequent events
```

### Post-Command Block (required)

Add to the bottom of every command file:

```
## Observation: End
After execution completes, record the following to the Intelligence event store:
- Event type: post_command
- Use the same session_id from the pre_command event
- Payload: { outcome summary, items processed count, outputs created }
- Outcome: "success" | "failure" | "degraded"
- Duration: time elapsed since pre_command event
- If any errors occurred during execution, also record an error event with:
  - Event type: error
  - Payload: { error_type, error_message, context, recovery_attempted }
```

### MCP Call Annotation (opt-in)

Add before significant MCP calls where latency or failure matters for learning:

```
## Observation: MCP Call
Record this MCP tool invocation to the Intelligence event store:
- Event type: mcp_call
- Payload: { tool_name, key_parameters, response_status, latency_ms, data_size }
- Use the same session_id from the pre_command event
```

Not every MCP call needs this annotation. Focus on calls that:
- Access external services (Notion, Gmail, Calendar, Drive, Slack)
- Are known failure points
- Have variable latency that affects user experience

### Decision Point Annotation (opt-in)

Add at key decision moments within a command:

```
## Observation: Decision
Record this decision to the Intelligence event store:
- Event type: decision_point
- Payload: { decision_description, options_considered, choice_made, reasoning }
- Use the same session_id from the pre_command event
```

Use for decisions that:
- Affect output quality (e.g., classifying email priority, choosing tone)
- The user might want to override or learn from (e.g., which data to include in a briefing)
- Represent branching logic where the system could go multiple ways

## Event Payload Examples

### pre_command
```json
{
  "input_params": { "filter": "is:unread", "limit": 50 },
  "context_files_loaded": ["business-info.md", "strategy.md"],
  "memories_injected": ["prefers concise email drafts", "Acme Corp is VIP"]
}
```

### post_command
```json
{
  "outcome_summary": "Triaged 23 emails: 5 urgent, 12 normal, 6 low priority",
  "items_processed": 23,
  "outputs_created": { "tasks": 5, "drafts": 3 }
}
```

### mcp_call
```json
{
  "tool_name": "notion-query",
  "key_parameters": { "database": "[FOS] Tasks", "filter": "Status=Open" },
  "response_status": "success",
  "latency_ms": 450,
  "data_size": 12
}
```

### decision_point
```json
{
  "decision_description": "Classify email priority",
  "options_considered": ["urgent", "normal", "low"],
  "choice_made": "urgent",
  "reasoning": "Sender is CEO of VIP client Acme Corp, subject contains 'ASAP'"
}
```

### error
```json
{
  "error_type": "notion_api_error",
  "error_message": "429 Too Many Requests",
  "context": "Querying [FOS] Tasks database during inbox triage",
  "recovery_attempted": "retry_with_backoff"
}
```

## Retention

- Raw events: kept for 30 days (configurable via `hooks.retention_days`)
- Aggregated patterns: kept indefinitely in the patterns table
- Event cleanup: old events purged when `/intel:status` is run or on session start

## Database Location

The Intelligence database (`intelligence.db`) is stored at:
- `${CLAUDE_PLUGIN_ROOT}/../.intelligence/intelligence.db` (relative to any plugin)
- Or `_infrastructure/intelligence/.data/intelligence.db` (repo-relative)

The `.data/` directory should be added to `.gitignore` — it contains user-specific runtime data.
```

Write to `_infrastructure/intelligence/hooks/SKILL.md`.

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/intelligence/hooks/SKILL.md
git commit -m "feat(intelligence): add hooks SKILL.md with event observation conventions"
```

### Task 3: Create master intelligence SKILL.md

**Files:**
- Create: `_infrastructure/intelligence/SKILL.md`

- [ ] **Step 1: Write the master skill reference**

```markdown
---
name: adaptive-intelligence
description: Master reference for the Adaptive Intelligence Engine. Describes the four modules (hooks, learning, self-healing, routing), how plugins integrate, and the relationship to the Memory Engine.
---

## Overview

The Adaptive Intelligence Engine is a behavioral layer that observes, learns from, and improves Founder OS plugin execution. It sits on top of the Memory Engine (storage) and provides:

1. **Hooks** — structured event capture from every plugin execution
2. **Learning** — pattern detection and preference learning across three tiers
3. **Self-Healing** — error classification, retry, and graceful degradation
4. **Routing** — adaptive task routing (future)

## Architecture

```
Memory Engine (storage) ← Intelligence Layer (behavior) ← Adaptive Intel plugin (user commands)
                              ↑
                         All 30 plugins (emit events via convention)
```

- **Infrastructure**: `_infrastructure/intelligence/` — SKILL.md files, SQL schema. No commands.
- **Plugin**: `founder-os-adaptive-intel/` — 6 slash commands for user control
- **Database**: Own SQLite DB (`intelligence.db`), separate from Memory Engine

## Plugin Integration

Every plugin command file adds observation blocks to emit events. See `_infrastructure/intelligence/hooks/SKILL.md` for the full convention and annotation templates.

**Minimum integration** (all plugins):
- Pre-command observation block (~5 lines at top of command)
- Post-command observation block (~5 lines at bottom of command)

**Enhanced integration** (plugins with complex logic):
- MCP call annotations before significant external calls
- Decision point annotations at key branching logic

## Modules

| Module | Location | Ships In |
|---|---|---|
| Hooks | `hooks/SKILL.md` | Chunk 1 |
| Taste Learning | `learning/taste-learning/SKILL.md` | Chunk 2 |
| Self-Healing | `self-healing/SKILL.md` | Chunk 3 |
| Workflow Optimization | `learning/workflow-optimization/SKILL.md` | Chunk 5 (future) |
| Confidence Gating | `learning/confidence-gating/SKILL.md` | Chunk 6 (future) |
| Routing | `routing/SKILL.md` | Chunk 7 (future) |

## Cross-Plugin Knowledge Boundary

Patterns that reference a Company or Contact are promoted to the Memory Engine for cross-plugin availability. Plugin-specific output preferences stay in the Intelligence DB. See the design spec for the full mapping table.

**Confidence scale conversion**: Intelligence uses 0.0-1.0; Memory Engine uses 0-100. Convert with `round(confidence * 100)`.
```

Write to `_infrastructure/intelligence/SKILL.md`.

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/intelligence/SKILL.md
git commit -m "feat(intelligence): add master SKILL.md reference"
```

### Task 4: Scaffold the Adaptive Intel plugin

**Files:**
- Create: `founder-os-adaptive-intel/.claude-plugin/plugin.json`
- Create: `founder-os-adaptive-intel/.mcp.json`

- [ ] **Step 1: Create plugin directory**

```bash
mkdir -p founder-os-adaptive-intel/.claude-plugin
mkdir -p founder-os-adaptive-intel/commands
mkdir -p founder-os-adaptive-intel/skills/notion-sync
```

- [ ] **Step 2: Write plugin manifest**

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

Write to `founder-os-adaptive-intel/.claude-plugin/plugin.json`.

- [ ] **Step 3: Write MCP config**

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": ""
      }
    }
  }
}
```

Write to `founder-os-adaptive-intel/.mcp.json`.

- [ ] **Step 4: Commit**

```bash
git add founder-os-adaptive-intel/
git commit -m "feat(adaptive-intel): scaffold plugin with manifest and MCP config"
```

### Task 5: Create `/intel:status` command

**Files:**
- Create: `founder-os-adaptive-intel/commands/intel-status.md`

- [ ] **Step 1: Write the status command**

```markdown
---
name: intel-status
description: Dashboard view of the Adaptive Intelligence Engine — shows hooks activity, learned patterns, self-healing events, and workflow chains
usage: /intel:status
arguments: none
---

## Intelligence Status Dashboard

Display a comprehensive dashboard of the Adaptive Intelligence Engine state.

### Step 1: Read Intelligence Database

Read the Intelligence SQLite database at `_infrastructure/intelligence/.data/intelligence.db`.

If the database does not exist, display:
```
── Adaptive Intelligence Status ──────────────────
Status: Not initialized
Run any plugin command to begin capturing events.
```
And stop here.

### Step 2: Gather Metrics

Query the following from the Intelligence database:

**Hooks metrics** (last 30 days):
- Total events captured: `SELECT COUNT(*) FROM events WHERE timestamp > datetime('now', '-30 days')`
- Events by type: `SELECT event_type, COUNT(*) FROM events WHERE timestamp > datetime('now', '-30 days') GROUP BY event_type`
- Unique plugins observed: `SELECT COUNT(DISTINCT plugin) FROM events WHERE timestamp > datetime('now', '-30 days')`

**Pattern metrics**:
- Total patterns: `SELECT COUNT(*) FROM patterns`
- By status: `SELECT status, COUNT(*) FROM patterns GROUP BY status`
- Top 3 active patterns (highest confidence): `SELECT plugin, description, confidence, confirmations, rejections FROM patterns WHERE status IN ('active', 'approved') ORDER BY confidence DESC LIMIT 3`

**Healing metrics** (last 30 days):
- Total healing events: `SELECT COUNT(*) FROM events WHERE event_type = 'error' AND timestamp > datetime('now', '-30 days')`
- Recovery success rate: count events where `recovery_attempted` is not null in payload, vs total errors
- Recent healing events (last 5): `SELECT timestamp, plugin, command, payload FROM events WHERE event_type = 'error' ORDER BY timestamp DESC LIMIT 5`

### Step 3: Display Dashboard

Format output as:

```
── Adaptive Intelligence Status ──────────────────
Hooks:      active | {total_events} events captured (last 30 days)
Learning:   {enabled/disabled} | {pattern_count} patterns ({active} active, {candidate} candidate, {approved} approved, {rejected} rejected)
Self-Heal:  {enabled/disabled} | {healing_count} recoveries this month ({success_rate}% success rate)

── Top Active Patterns ───────────────────────────
#{n}  {plugin}    "{description}"     conf: {confidence}  ✓ {confirmations}/{confirmations+rejections}
(repeat for top 3, or "No patterns learned yet" if empty)

── Recent Healing Events ─────────────────────────
{timestamp}  {plugin}  {command}  {summary from payload}
(repeat for last 5, or "No healing events" if empty)

── Configuration ─────────────────────────────────
Taste threshold: {value} | Workflow threshold: {value} | Max autonomy: {value}
Healing retries: {value} | Fallback: {enabled/disabled} | Retention: {value} days
```

### Notes
- All queries use read-only access to the Intelligence database
- If any query fails, show "unavailable" for that section rather than failing the entire command
- Event counts are approximate — they reflect the retention window, not all-time totals
```

Write to `founder-os-adaptive-intel/commands/intel-status.md`.

- [ ] **Step 2: Commit**

```bash
git add founder-os-adaptive-intel/commands/intel-status.md
git commit -m "feat(adaptive-intel): add /intel:status dashboard command"
```

### Task 6: Add .gitignore for runtime data

**Files:**
- Create: `_infrastructure/intelligence/.data/.gitkeep`
- Modify: `.gitignore` (add intelligence data directory)

- [ ] **Step 1: Create data directory with .gitkeep**

```bash
mkdir -p _infrastructure/intelligence/.data
touch _infrastructure/intelligence/.data/.gitkeep
```

- [ ] **Step 2: Add to .gitignore**

Add the following line to the project `.gitignore`:

```
# Adaptive Intelligence runtime data
_infrastructure/intelligence/.data/intelligence.db
```

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/intelligence/.data/.gitkeep .gitignore
git commit -m "feat(intelligence): add runtime data directory and gitignore"
```

### Task 7: Add Notion DB template

**Files:**
- Create: `_infrastructure/notion-db-templates/hq-intelligence.json`
- Modify: `_infrastructure/notion-db-templates/founder-os-hq-manifest.json`

- [ ] **Step 1: Create the Intelligence DB template**

```json
{
  "database_name": "[FOS] Intelligence",
  "description": "Learned patterns, healing events, and intelligence configuration for the Adaptive Intelligence Engine",
  "icon": "🧠",
  "properties": {
    "Pattern": { "type": "title" },
    "Plugin": {
      "type": "select",
      "options": [
        "inbox-zero", "daily-briefing", "meeting-prep", "action-items",
        "weekly-review", "follow-up-tracker", "meeting-intel", "newsletter-engine",
        "report-generator", "client-health", "invoice-processor", "proposal-automator",
        "contract-analyzer", "sow-generator", "competitive-intel", "expense-report",
        "notion-command-center", "drive-brain", "slack-digest", "client-context",
        "crm-sync", "morning-sync", "knowledge-base", "linkedin-post",
        "time-savings", "prompt-library", "workflow-automator", "workflow-documenter",
        "learning-log", "goal-tracker", "Cross-Plugin"
      ]
    },
    "Type": {
      "type": "select",
      "options": ["Taste", "Workflow", "Autonomy", "Healing"]
    },
    "Confidence": {
      "type": "number",
      "format": "percent"
    },
    "Status": {
      "type": "status",
      "options": ["Candidate", "Active", "Approved", "Rejected"],
      "groups": [
        { "name": "Pending", "options": ["Candidate"] },
        { "name": "In Use", "options": ["Active", "Approved"] },
        { "name": "Inactive", "options": ["Rejected"] }
      ]
    },
    "Observations": { "type": "number" },
    "Confirmations": { "type": "number" },
    "Rejections": { "type": "number" },
    "Last Applied": { "type": "date" },
    "Instruction": { "type": "rich_text" }
  },
  "views": [
    {
      "name": "All Patterns",
      "type": "table",
      "sort": [{ "property": "Confidence", "direction": "descending" }]
    },
    {
      "name": "Active",
      "type": "table",
      "filter": { "property": "Status", "status": { "equals": "Active" } }
    },
    {
      "name": "By Plugin",
      "type": "board",
      "group_by": "Plugin"
    }
  ]
}
```

Write to `_infrastructure/notion-db-templates/hq-intelligence.json`.

- [ ] **Step 2: Update HQ manifest**

Read `_infrastructure/notion-db-templates/founder-os-hq-manifest.json` and add `"[FOS] Intelligence"` to the `databases` array in the "Growth & Meta" section. Also add `"hq-intelligence.json"` to the `creation_order` array at the end.

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/notion-db-templates/hq-intelligence.json _infrastructure/notion-db-templates/founder-os-hq-manifest.json
git commit -m "feat(intelligence): add Notion DB template and register in HQ manifest"
```

### Task 8: Integrate hooks into 3 pilot plugins

Add observation blocks to 3 representative plugins to validate the convention pattern before rolling out to all 30.

**Pilot plugins:**
- P01 Inbox Zero (`founder-os-inbox-zero/commands/inbox-triage.md`) — Pipeline pattern, Gmail + Notion
- P02 Daily Briefing (`founder-os-daily-briefing-generator/commands/daily-briefing.md`) — Parallel Gathering, multi-source
- P10 Client Health (`founder-os-client-health-dashboard/commands/health-scan.md`) — Notion-heavy, scoring logic

**Files:**
- Modify: `founder-os-inbox-zero/commands/inbox-triage.md`
- Modify: `founder-os-daily-briefing-generator/commands/daily-briefing.md`
- Modify: `founder-os-client-health-dashboard/commands/health-scan.md`

- [ ] **Step 1: Read each pilot command file**

Read all three command files to understand their current structure and find the right insertion points.

- [ ] **Step 2: Add pre-command observation block to each**

Add immediately after any existing context-loading block (or after the frontmatter if no context block exists):

```markdown
## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `[plugin-name]` (e.g., "inbox-zero")
- Command: `[command-name]` (e.g., "inbox-triage")
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution
```

- [ ] **Step 3: Add post-command observation block to each**

Add at the end of each command file, before any final output formatting:

```markdown
## Observation: End
After execution completes, record a post_command event to the Intelligence event store:
- Event type: `post_command`
- Use the same session_id from the start observation
- Outcome: `success` | `failure` | `degraded`
- Payload: { outcome summary, items processed, outputs created }
- Duration: milliseconds elapsed since pre_command event
- If any errors occurred during execution, also record an error event with the error type, message, and whether recovery was attempted
```

- [ ] **Step 4: Add 1-2 decision point annotations to inbox-triage**

P01 Inbox Zero has the richest decision logic. Add decision point annotations at:
- Email priority classification (urgent/normal/low)
- Draft tone selection (formal/casual based on sender)

```markdown
## Observation: Decision
Record this classification to the Intelligence event store:
- Event type: `decision_point`
- Payload: { decision: "email_priority_classification", options: ["urgent", "normal", "low"], choice: [selected], reasoning: [why] }
```

- [ ] **Step 5: Commit**

```bash
git add founder-os-inbox-zero/commands/inbox-triage.md
git add founder-os-daily-briefing-generator/commands/daily-briefing.md
git add founder-os-client-health-dashboard/commands/health-scan.md
git commit -m "feat(intelligence): add hooks observation blocks to 3 pilot plugins"
```

### Chunk 1 Verification

After completing all tasks in Chunk 1:

```bash
# Verify directory structure
ls -la _infrastructure/intelligence/
ls -la _infrastructure/intelligence/hooks/
ls -la _infrastructure/intelligence/hooks/schema/
ls -la founder-os-adaptive-intel/.claude-plugin/
ls -la founder-os-adaptive-intel/commands/

# Verify files exist
cat _infrastructure/intelligence/hooks/schema/intelligence.sql | head -5
cat _infrastructure/intelligence/hooks/SKILL.md | head -5
cat _infrastructure/intelligence/SKILL.md | head -5
cat founder-os-adaptive-intel/.claude-plugin/plugin.json | head -5
cat founder-os-adaptive-intel/commands/intel-status.md | head -5

# Tag milestone
git tag intelligence-chunk-1-hooks
```

---

## Chunk 2: Taste Learning + Pattern Commands

Adds the learning cycle (Tier 1: taste learning) and the `/intel:patterns`, `/intel:approve`, `/intel:reset` commands.

### Task 9: Create taste-learning SKILL.md

**Files:**
- Create: `_infrastructure/intelligence/learning/SKILL.md`
- Create: `_infrastructure/intelligence/learning/taste-learning/SKILL.md`

- [ ] **Step 1: Write the learning cycle master skill**

```markdown
---
name: intelligence-learning
description: Learning cycle for the Adaptive Intelligence Engine. Implements the Observe-Retrieve-Judge-Distill-Consolidate-Apply cycle for detecting and applying user preference patterns.
---

## Overview

The learning system detects patterns in user behavior and plugin outcomes, then injects learned preferences into future plugin runs. It operates in three tiers shipped sequentially:

1. **Taste Learning** (Tier 1) — output preference detection
2. **Workflow Optimization** (Tier 2) — plugin chain detection
3. **Confidence-Gated Autonomy** (Tier 3) — graduated trust

## The Cycle

```
OBSERVE → RETRIEVE → JUDGE → DISTILL → CONSOLIDATE → APPLY
   ↑                                                    │
   └────────────────── feedback ─────────────────────────┘
```

| Stage | What Happens | When |
|---|---|---|
| **Observe** | Hooks capture events | During command run |
| **Retrieve** | Pull relevant past patterns | Before next run |
| **Judge** | Compare outcome to patterns | After post_command |
| **Distill** | Extract generalizable insight | After 3+ observations |
| **Consolidate** | Store with confidence score | After distillation |
| **Apply** | Inject as instruction | Before next matching run |

## Confidence Mechanics

- Formula: `confirmations / max(1, confirmations + rejections * 2)`
- New patterns start at confidence 0.0 (candidate)
- Applied when confidence >= threshold AND observations >= 3
- Rejections weigh double to prevent bad patterns from persisting

## Pattern Lifecycle

```
candidate (conf < 0.5) → active (conf >= 0.5, auto-applied with notice)
                       → approved (user /intel:approve, conf locked at 1.0)
                       → rejected (user rejected or conf < 0.3)
```

## Applying Patterns

When a plugin command runs:
1. Query patterns table for matching plugin + command (or cross-plugin patterns)
2. Filter to status IN ('active', 'approved')
3. For each matching pattern, inject its `instruction` text into the command context
4. Notify user: `[Intel] Applying learned preference: "{description}"`

## Cross-Plugin Promotion

Patterns referencing a Company or Contact are promoted to the Memory Engine:
- taste + company → Memory Engine category `preference`
- workflow → Memory Engine category `workflow`
- Confidence conversion: `round(confidence * 100)`
```

Write to `_infrastructure/intelligence/learning/SKILL.md`.

- [ ] **Step 2: Write the taste-learning skill**

```markdown
---
name: taste-learning
description: Tier 1 learning — detects user output preferences from repeated corrections and injects them as instructions into future plugin runs.
---

## Overview

Taste learning detects patterns in how users modify or react to plugin outputs, then automatically adjusts future outputs to match preferences.

## Detection Mechanism

1. **Post-command observation**: After a command runs, the post_command event records the output
2. **User correction detection**: If the user edits, rejects, or re-runs the command with different parameters, record a decision_point event noting the change
3. **Pattern matching**: When the same type of correction is observed 3+ times for the same plugin/command, create a candidate pattern
4. **Distillation**: Convert the repeated correction into an instruction (e.g., "user shortened drafts 4/5 times" → "Keep email drafts concise, under 150 words")

## What Taste Learning Captures

| Signal | Example | Resulting Pattern |
|---|---|---|
| Output length corrections | User consistently shortens briefings | "Keep briefings under 500 words" |
| Tone adjustments | User rewrites drafts to be more formal | "Use formal business tone in email drafts" |
| Prioritization overrides | User re-orders urgent items | "Prioritize revenue-related items first" |
| Formatting preferences | User restructures output into bullets | "Use bullet-point format for task summaries" |
| Content inclusion/exclusion | User removes calendar section from briefing | "Exclude calendar items from daily briefing" |

## Creating a Taste Pattern

When distilling a pattern from observations:

1. Query recent decision_point events for this plugin/command
2. Group by similar correction types
3. If a correction type appears 3+ times with consistent direction:
   - Create a new row in the `patterns` table
   - `pattern_type`: "taste"
   - `plugin`: the specific plugin
   - `command`: the specific command (or null if applies to all commands)
   - `description`: human-readable summary of the preference
   - `instruction`: the text to inject into future command context
   - `confidence`: 0.0 (starts as candidate)
   - `observations`: count of times this pattern was seen
4. Subsequent observations update `observations`, `confirmations`, `rejections`, and recalculate `confidence`

## Confirmation vs Rejection

- **Confirmation**: User runs the command, pattern is applied, user accepts the output without changes
- **Rejection**: User runs the command, pattern is applied, user undoes/overrides the pattern's effect
- Track via post_command events: if outcome is "success" and no subsequent correction → confirmation
- If user re-runs or explicitly corrects → rejection

## Notification

Always notify the user when a taste pattern is applied:
```
[Intel] Applying learned preference: "concise email drafts under 150 words"
```

If the user says "stop applying this" or rejects 3 times in a row, set status to "rejected".
```

Write to `_infrastructure/intelligence/learning/taste-learning/SKILL.md`.

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/intelligence/learning/
git commit -m "feat(intelligence): add learning cycle and taste-learning SKILL.md"
```

### Task 10: Create `/intel:patterns` command

**Files:**
- Create: `founder-os-adaptive-intel/commands/intel-patterns.md`

- [ ] **Step 1: Write the patterns command**

```markdown
---
name: intel-patterns
description: View and explore learned patterns from the Adaptive Intelligence Engine
usage: /intel:patterns [plugin|all]
arguments:
  - name: scope
    description: Plugin name to filter by, or "all" for everything (default: all)
    required: false
  - name: --type
    description: Filter by pattern type (taste|workflow|autonomy)
    required: false
  - name: --status
    description: Filter by status (candidate|active|approved|rejected)
    required: false
  - name: --detail
    description: Show full history for a specific pattern ID
    required: false
---

## View Learned Patterns

### Step 1: Parse Arguments

- `scope`: plugin name or "all" (default: "all")
- `--type`: filter by pattern_type
- `--status`: filter by status
- `--detail <id>`: show detailed view of one pattern

### Step 2: Query Patterns

Read from the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`).

If `--detail <id>` is provided:
```sql
SELECT * FROM patterns WHERE id = ?
```
Also query related events:
```sql
SELECT * FROM events
WHERE plugin = (SELECT plugin FROM patterns WHERE id = ?)
  AND command = (SELECT command FROM patterns WHERE id = ?)
  AND event_type IN ('decision_point', 'post_command')
ORDER BY timestamp DESC
LIMIT 20
```

Otherwise, build a filtered query:
```sql
SELECT id, pattern_type, plugin, command, description, instruction, confidence, observations, confirmations, rejections, status, updated_at
FROM patterns
WHERE 1=1
  [AND plugin = ? -- if scope != 'all']
  [AND pattern_type = ? -- if --type provided]
  [AND status = ? -- if --status provided]
ORDER BY confidence DESC, observations DESC
```

### Step 3: Display Results

**List view** (default):
```
── Learned Patterns ──────────────────────────────
Filter: {scope} | Type: {type or "all"} | Status: {status or "all"}

ID        Plugin          Type    Confidence  Status     Description
────────  ──────────────  ──────  ──────────  ─────────  ───────────────────────────
abc123    inbox-zero      taste   0.82        active     concise email drafts under 150 words
def456    daily-briefing  taste   0.71        active     lead briefings with revenue metrics
ghi789    cross-plugin    taste   0.65        active     Acme Corp prefers formal tone

Total: {count} patterns
```

**Detail view** (`--detail <id>`):
```
── Pattern Detail: {id} ──────────────────────────
Plugin:       {plugin}
Command:      {command or "all commands"}
Type:         {pattern_type}
Status:       {status}
Confidence:   {confidence} ({confirmations} confirmed, {rejections} rejected)
Observations: {observations}
Created:      {created_at}
Updated:      {updated_at}

Instruction (injected into plugin context):
  "{instruction}"

Recent Related Events:
  {timestamp}  {event_type}  {summary from payload}
  ...
```

### Step 4: Offer Actions

After displaying patterns, suggest available actions:
- "Run `/intel:approve <id>` to promote a pattern to permanent"
- "Run `/intel:reset <plugin>` to clear patterns for a plugin"
```

Write to `founder-os-adaptive-intel/commands/intel-patterns.md`.

- [ ] **Step 2: Commit**

```bash
git add founder-os-adaptive-intel/commands/intel-patterns.md
git commit -m "feat(adaptive-intel): add /intel:patterns command"
```

### Task 11: Create `/intel:approve` command

**Files:**
- Create: `founder-os-adaptive-intel/commands/intel-approve.md`

- [ ] **Step 1: Write the approve command**

```markdown
---
name: intel-approve
description: Promote a learned pattern to permanently approved status
usage: /intel:approve <pattern-id>
arguments:
  - name: pattern-id
    description: The ID of the pattern to approve
    required: true
---

## Approve a Pattern

### Step 1: Validate Pattern

Query the Intelligence database for the pattern:
```sql
SELECT * FROM patterns WHERE id = ?
```

If not found, display: `"Pattern '{id}' not found. Run /intel:patterns to see available patterns."`

If already approved, display: `"Pattern '{id}' is already approved."`

### Step 2: Confirm with User

Display the pattern details and ask for confirmation:
```
Approving pattern: "{description}"
Plugin: {plugin} | Command: {command or "all"}
Current confidence: {confidence} | Status: {status}

This pattern will be:
- Permanently applied to all matching command runs
- Confidence locked at 1.0
- Will not be automatically rejected by future corrections

Confirm? (yes/no)
```

### Step 3: Apply Approval

```sql
UPDATE patterns
SET status = 'approved', confidence = 1.0, updated_at = datetime('now')
WHERE id = ?
```

Display: `"✓ Pattern '{id}' approved. It will be applied to all future {plugin}/{command} runs."`
```

Write to `founder-os-adaptive-intel/commands/intel-approve.md`.

- [ ] **Step 2: Commit**

```bash
git add founder-os-adaptive-intel/commands/intel-approve.md
git commit -m "feat(adaptive-intel): add /intel:approve command"
```

### Task 12: Create `/intel:reset` command

**Files:**
- Create: `founder-os-adaptive-intel/commands/intel-reset.md`

- [ ] **Step 1: Write the reset command**

```markdown
---
name: intel-reset
description: Clear learned patterns for a specific plugin or all plugins
usage: /intel:reset [plugin|all]
arguments:
  - name: scope
    description: Plugin name to reset, or "all" for everything (if omitted, prompts user to specify)
    required: false
  - name: --type
    description: Only reset patterns of a specific type (taste|workflow|autonomy)
    required: false
---

## Reset Learned Patterns

### Step 1: Count Affected Patterns

Query the Intelligence database:
```sql
SELECT COUNT(*) FROM patterns
WHERE 1=1
  [AND plugin = ? -- if scope != 'all']
  [AND pattern_type = ? -- if --type provided]
```

If count is 0, display: `"No patterns found matching the filter."`

### Step 2: Confirm with User

```
This will remove {count} learned patterns:
  Scope: {plugin or "all plugins"}
  Type: {type or "all types"}

Raw events will NOT be deleted — only distilled patterns.
Patterns can be re-learned from future observations.

Type 'confirm' to proceed:
```

Wait for user to type "confirm". Any other input cancels.

### Step 3: Delete Patterns

```sql
DELETE FROM patterns
WHERE 1=1
  [AND plugin = ? -- if scope != 'all']
  [AND pattern_type = ? -- if --type provided]
```

Display: `"✓ Removed {count} patterns. The Intelligence Engine will re-learn from future observations."`
```

Write to `founder-os-adaptive-intel/commands/intel-reset.md`.

- [ ] **Step 2: Commit**

```bash
git add founder-os-adaptive-intel/commands/intel-reset.md
git commit -m "feat(adaptive-intel): add /intel:reset command"
```

### Task 13: Add pattern injection to pilot plugins

Update the 3 pilot plugins from Task 8 to also retrieve and apply learned patterns before execution.

**Files:**
- Modify: `founder-os-inbox-zero/commands/inbox-triage.md`
- Modify: `founder-os-daily-briefing-generator/commands/daily-briefing.md`
- Modify: `founder-os-client-health-dashboard/commands/health-scan.md`

- [ ] **Step 1: Add pattern retrieval block to each pilot plugin**

Add after the pre-command observation block in each command file:

```markdown
## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = '[plugin-name]' OR plugin IS NULL) AND (command = '[command-name]' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context for this execution
3. Notify: `[Intel] Applying learned preference: "{description}"` for each pattern applied
4. If the Intelligence database does not exist, skip silently and continue execution
```

- [ ] **Step 2: Commit**

```bash
git add founder-os-inbox-zero/commands/inbox-triage.md
git add founder-os-daily-briefing-generator/commands/daily-briefing.md
git add founder-os-client-health-dashboard/commands/health-scan.md
git commit -m "feat(intelligence): add pattern injection to 3 pilot plugins"
```

### Chunk 2 Verification

```bash
# Verify learning skills exist
cat _infrastructure/intelligence/learning/SKILL.md | head -5
cat _infrastructure/intelligence/learning/taste-learning/SKILL.md | head -5

# Verify all 4 commands exist
ls founder-os-adaptive-intel/commands/
# Should show: intel-status.md, intel-patterns.md, intel-approve.md, intel-reset.md

# Tag milestone
git tag intelligence-chunk-2-learning
```

---

## Chunk 3: Self-Healing Module + Healing Command

Adds error classification, retry engine, fallback registry, and the `/intel:healing` command.

### Task 14: Create self-healing SKILL.md

**Files:**
- Create: `_infrastructure/intelligence/self-healing/SKILL.md`

- [ ] **Step 1: Write the self-healing skill**

```markdown
---
name: intelligence-self-healing
description: Error classification, retry engine, and graceful degradation for Founder OS plugins. Classifies errors into four categories and applies appropriate recovery strategies.
---

## Overview

The self-healing module detects errors during plugin execution and applies recovery strategies. It classifies errors into four categories and learns which recovery approaches work over time.

## Error Categories

| Category | Signal | Action | Max Retries |
|---|---|---|---|
| **Transient** | HTTP 429, 503, timeout, network error | Retry with exponential backoff | 3 (configurable) |
| **Recoverable** | Auth expired, DB not found, schema mismatch | Apply known fix, then retry | 1 |
| **Degradable** | Optional source unavailable | Fall back to reduced capability | 0 |
| **Fatal** | Invalid input, missing required resource | Stop + notify user | 0 |

## Classification Rules

### Rule-Based (initial)

```
HTTP 429 → transient
HTTP 503 → transient
HTTP 502 → transient
"timeout" in error → transient
"ECONNREFUSED" in error → transient
"ENOTFOUND" in error → transient

HTTP 401 → recoverable (auth refresh)
HTTP 403 → fatal (permissions)
HTTP 404 + "database" → recoverable (DB discovery)
HTTP 404 + other → fatal

"not found" + Notion DB name → recoverable (try alternate names)
"rate limit" → transient

Slack/Drive/Calendar unavailable → degradable
Optional MCP source error → degradable

All other errors → fatal (safe default)
```

### Learned (over time)

The healing_patterns table tracks which classifications and fixes actually work. If a "transient" error persists across 3+ sessions, it gets reclassified to "recoverable" or "fatal". If a "fatal" error gets manually resolved by the user, the system learns the recovery path.

## Retry Engine

### Transient Errors

```
Attempt 1: wait 2 seconds, retry same call
Attempt 2: wait 5 seconds, retry same call
Attempt 3: wait 15 seconds, retry same call
Exhausted: reclassify as degradable (if optional source) or fatal (if required)
```

### Recoverable Errors

1. Look up the error_signature in healing_patterns table
2. If a known fix exists with success_count > failure_count, apply it
3. Known fixes:
   - Auth expired → re-run `gws auth login` prompt
   - Notion DB not found → apply 3-step discovery (search "[FOS] Name", then "Founder OS HQ - Name", then legacy name)
4. After applying fix, retry once
5. If still fails, reclassify as fatal

### Degradable Errors

1. Look up fallback in the fallback registry
2. Execute the fallback path (continue with available data)
3. Mark the output as "degraded" with clear explanation of what was skipped
4. Log which data source was unavailable and what the user lost

### Fatal Errors

1. Stop execution immediately
2. Present clear error message with suggested manual fix
3. Log the error for pattern analysis

## User Notifications

Every self-healing action produces a visible notification:

```
[Heal] {error_description} — retrying in {wait}s (attempt {n}/{max})
[Heal] {source} unavailable — continuing without {data_type}
[Heal] Recovered: {fix_description}, resuming command
[Heal] FAILED: {error_description} — {suggested_fix}
```

## Plugin Integration

Plugins integrate self-healing by including the error observation block (from hooks convention) and checking healing configuration:

```
## Self-Healing: Error Recovery
If an error occurs during this command:
1. Classify using the rules in _infrastructure/intelligence/self-healing/SKILL.md
2. Check healing.enabled config (default: true)
3. Apply the appropriate recovery strategy
4. Record an error event with recovery_attempted field
5. If recovery succeeds, continue execution and note the recovery in post_command
6. If recovery fails, stop and present the error to the user
```

## Learning From Failures

After each error event:
1. Look up or create a healing_pattern for this error_signature
2. If recovery was attempted and succeeded, increment success_count
3. If recovery was attempted and failed, increment failure_count
4. If success_count / (success_count + failure_count) drops below 0.5, demote the fix
5. If an error classified as "transient" appears 3+ times across sessions without resolution, reclassify
```

Write to `_infrastructure/intelligence/self-healing/SKILL.md`.

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/intelligence/self-healing/SKILL.md
git commit -m "feat(intelligence): add self-healing SKILL.md with error classification and retry engine"
```

### Task 15: Create fallback registry SKILL.md

**Files:**
- Create: `_infrastructure/intelligence/self-healing/fallback-registry/SKILL.md`

- [ ] **Step 1: Write the fallback registry**

```markdown
---
name: fallback-registry
description: Seed data of known fallback paths for all 30 Founder OS plugins. Used by the self-healing module when a data source is classified as degradable.
---

## Overview

The fallback registry maps known failure modes to graceful degradation paths. This is seed data — the learning system extends it over time based on which fallbacks users accept vs reject.

## Universal Fallbacks (All Plugins)

| Failure | Fallback | Output Note |
|---|---|---|
| Notion DB not found | Apply 3-step discovery (search "[FOS] Name" → "Founder OS HQ - Name" → legacy name). If all fail, output to local file instead. | "Notion output saved to local file — sync manually when available" |
| Notion API rate limited | Retry with backoff (handled by transient classification). If exhausted, queue output for next run. | "Notion rate limited — output queued for next run" |
| gws CLI not installed | Skip all Google data sources | "Google Workspace data unavailable — install gws CLI" |
| gws auth expired | Prompt user to re-authenticate | "Google auth expired — run 'gws auth login' to reconnect" |

## Pillar 1: Daily Work

| Plugin | Failure | Fallback | Output Note |
|---|---|---|---|
| P01 Inbox Zero | Gmail unavailable | Skip triage, log partial state | "Gmail unreachable — triage skipped" |
| P02 Daily Briefing | Calendar fails | Briefing from Gmail + Notion only | "Calendar data missing from briefing" |
| P02 Daily Briefing | Gmail fails | Briefing from Calendar + Notion only | "Email summary missing from briefing" |
| P03 Meeting Prep | Drive search fails | Prep from Calendar + Notion + Gmail | "No Drive documents found for meeting" |
| P05 Weekly Review | Calendar fails | Review from Gmail + Notion metrics | "Calendar events missing from weekly review" |
| P06 Follow-Up Tracker | Gmail unavailable | Check Notion tasks only | "Email follow-ups not checked — Gmail unavailable" |

## Pillar 2: Code Without Coding

| Plugin | Failure | Fallback | Output Note |
|---|---|---|---|
| P09 Report Generator | Filesystem write fails | Output report as chat message | "Could not save to file — report shown inline" |
| P10 Client Health | One health score source down | Partial score, flag stale metric | "Health score partial — {metric} data unavailable" |
| P11 Invoice Processor | Filesystem read fails | Prompt user for manual file path | "Could not read invoice file — please provide path" |
| P13 Contract Analyzer | Filesystem read fails | Prompt user for manual file path | "Could not read contract file — please provide path" |

## Pillar 3: MCP & Integrations

| Plugin | Failure | Fallback | Output Note |
|---|---|---|---|
| P18 Drive Brain | Drive unavailable | Return cached results from Notion Activity Log | "Drive search unavailable — showing last known results" |
| P19 Slack Digest | Slack unavailable | Skip digest entirely | "Slack unavailable — digest skipped" |
| P20 Client Context | Drive fails | Dossier from Notion + Gmail only | "No Drive documents in client dossier" |
| P21 CRM Sync | Calendar down, Gmail up | Sync emails only | "Calendar sync skipped — email communications synced" |
| P21 CRM Sync | Gmail down, Calendar up | Sync calendar only | "Email sync skipped — calendar events synced" |

## Pillar 4: Meta & Growth

| Plugin | Failure | Fallback | Output Note |
|---|---|---|---|
| P25 Time Savings | Notion query fails | Estimate from local event history | "Time savings estimated from local data — Notion unavailable" |
| P27 Workflow Automator | Filesystem write fails | Output workflow as chat message | "Could not save workflow file — shown inline" |

## Extending the Registry

The self-healing learning system extends this registry by:
1. Tracking which fallbacks users accept (no re-run after degraded output)
2. Tracking which fallbacks users reject (re-run or complaint after degraded output)
3. Promoting successful new recovery paths discovered by user overrides
4. Demoting fallbacks with low acceptance rates
```

Write to `_infrastructure/intelligence/self-healing/fallback-registry/SKILL.md`.

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/intelligence/self-healing/fallback-registry/SKILL.md
git commit -m "feat(intelligence): add fallback registry with seed data for all 30 plugins"
```

### Task 16: Create `/intel:healing` command

**Files:**
- Create: `founder-os-adaptive-intel/commands/intel-healing.md`

- [ ] **Step 1: Write the healing command**

```markdown
---
name: intel-healing
description: View self-healing event log, error frequency analysis, and fallback acceptance rates
usage: /intel:healing [--plugin=<name>]
arguments:
  - name: --plugin
    description: Filter to a specific plugin
    required: false
---

## Self-Healing Event Log

### Step 1: Query Healing Data

Read from the Intelligence database.

**Recent healing events** (last 7 days):
```sql
SELECT timestamp, plugin, command, payload, outcome
FROM events
WHERE event_type = 'error'
  AND timestamp > datetime('now', '-7 days')
  [AND plugin = ? -- if --plugin provided]
ORDER BY timestamp DESC
LIMIT 20
```

**Error frequency** (last 30 days):
```sql
SELECT plugin, json_extract(payload, '$.error_type') as error_type, COUNT(*) as count
FROM events
WHERE event_type = 'error'
  AND timestamp > datetime('now', '-30 days')
GROUP BY plugin, error_type
ORDER BY count DESC
```

**Healing pattern effectiveness**:
```sql
SELECT error_signature, category, fix_action, success_count, failure_count,
  ROUND(CAST(success_count AS REAL) / MAX(1, success_count + failure_count) * 100) as success_rate
FROM healing_patterns
ORDER BY (success_count + failure_count) DESC
LIMIT 10
```

**Systemic issues** (errors recurring 3+ times across sessions):
```sql
SELECT json_extract(payload, '$.error_type') as error_type, plugin, COUNT(DISTINCT session_id) as sessions
FROM events
WHERE event_type = 'error'
  AND timestamp > datetime('now', '-30 days')
GROUP BY error_type, plugin
HAVING sessions >= 3
ORDER BY sessions DESC
```

### Step 2: Display Report

```
── Self-Healing Report ───────────────────────────
Period: last 7 days | Filter: {plugin or "all"}

── Recent Events ─────────────────────────────────
{timestamp}  {plugin}/{command}  {error_type} → {outcome}
  {recovery details from payload}
(repeat for up to 20 events)

── Error Frequency (30 days) ─────────────────────
{plugin}         {error_type}              {count}x
(heatmap-style, most frequent first)

── Fix Effectiveness ─────────────────────────────
{error_signature}  {fix_action}  {success_rate}% ({success}/{total})
(top 10 by volume)

── Systemic Issues ───────────────────────────────
⚠ {error_type} in {plugin} — recurring across {sessions} sessions
(only shown if any exist; these need manual attention)
```
```

Write to `founder-os-adaptive-intel/commands/intel-healing.md`.

- [ ] **Step 2: Commit**

```bash
git add founder-os-adaptive-intel/commands/intel-healing.md
git commit -m "feat(adaptive-intel): add /intel:healing command"
```

### Task 17: Add self-healing blocks to pilot plugins

**Files:**
- Modify: `founder-os-inbox-zero/commands/inbox-triage.md`
- Modify: `founder-os-daily-briefing-generator/commands/daily-briefing.md`
- Modify: `founder-os-client-health-dashboard/commands/health-scan.md`

- [ ] **Step 1: Add self-healing integration block to each pilot plugin**

Add after the pattern injection block in each command file:

```markdown
## Self-Healing: Error Recovery
If any error occurs during this command:
1. Classify the error using rules from `_infrastructure/intelligence/self-healing/SKILL.md`
2. Check if healing is enabled: query `SELECT value FROM config WHERE key = 'healing.enabled'` from Intelligence DB
3. For transient errors: retry with exponential backoff (2s, 5s, 15s)
4. For recoverable errors: look up fix in healing_patterns table, apply if found
5. For degradable errors: consult fallback registry in `_infrastructure/intelligence/self-healing/fallback-registry/SKILL.md`, execute fallback path
6. For fatal errors: stop and present error with suggested fix
7. Always notify: `[Heal] {description of what happened and what was done}`
8. Record error event to Intelligence DB with recovery_attempted field
9. If Intelligence DB is unavailable, fall back to existing error handling (no self-healing)
```

- [ ] **Step 2: Commit**

```bash
git add founder-os-inbox-zero/commands/inbox-triage.md
git add founder-os-daily-briefing-generator/commands/daily-briefing.md
git add founder-os-client-health-dashboard/commands/health-scan.md
git commit -m "feat(intelligence): add self-healing blocks to 3 pilot plugins"
```

### Chunk 3 Verification

```bash
# Verify self-healing skills
cat _infrastructure/intelligence/self-healing/SKILL.md | head -5
cat _infrastructure/intelligence/self-healing/fallback-registry/SKILL.md | head -5

# Verify healing command
cat founder-os-adaptive-intel/commands/intel-healing.md | head -5

# All 5 commands now exist
ls founder-os-adaptive-intel/commands/
# Should show: intel-status.md, intel-patterns.md, intel-approve.md, intel-reset.md, intel-healing.md

# Tag milestone
git tag intelligence-chunk-3-self-healing
```

---

## Chunk 4: Config, Notion Sync, and Plugin Docs

Completes the Adaptive Intel plugin with `/intel:config`, Notion sync skill, and documentation.

### Task 18: Create `/intel:config` command

**Files:**
- Create: `founder-os-adaptive-intel/commands/intel-config.md`

- [ ] **Step 1: Write the config command**

```markdown
---
name: intel-config
description: View and modify Adaptive Intelligence Engine configuration
usage: /intel:config [key] [value]
arguments:
  - name: key
    description: Configuration key to view or set (e.g., learning.taste.threshold)
    required: false
  - name: value
    description: New value to set
    required: false
  - name: --reset
    description: Reset all configuration to defaults
    required: false
---

## Intelligence Configuration

### Step 1: Determine Action

- No arguments → show all config
- `key` only → show that key's value
- `key value` → update that key
- `--reset` → reset all to defaults

### Step 2: Show All Config (no arguments)

```sql
SELECT key, value FROM config ORDER BY key
```

Display as:
```
── Intelligence Configuration ────────────────────
learning.enabled              true
learning.taste.threshold      0.5       # confidence to auto-apply taste patterns
learning.workflow.suggest_threshold 0.5  # confidence to suggest next command
learning.workflow.trigger_threshold 0.8  # confidence to auto-trigger chains
learning.autonomy.max_level   notify    # cap: ask | suggest | notify | silent
healing.enabled               true
healing.max_retries           3         # retry attempts for transient errors
healing.fallback.enabled      true      # allow graceful degradation
hooks.retention_days          30        # raw event retention period
hooks.decision_points         true      # capture decision-point events

Usage: /intel:config <key> <value> to change a setting
       /intel:config --reset to restore defaults
```

### Step 3: Update Config (key + value)

Validate the key exists:
```sql
SELECT value FROM config WHERE key = ?
```

If not found: `"Unknown config key '{key}'. Run /intel:config to see available keys."`

Validate the value:
- Boolean keys (*.enabled, hooks.decision_points): accept "true"/"false"
- Number keys (*.threshold, *.max_retries, *.retention_days): accept numeric values
- Enum keys (learning.autonomy.max_level): accept "ask"/"suggest"/"notify"/"silent"

Update:
```sql
UPDATE config SET value = ? WHERE key = ?
```

Display: `"✓ Updated {key}: {old_value} → {new_value}"`

### Step 4: Reset (--reset flag)

Confirm: `"Reset all intelligence configuration to defaults? Type 'confirm':"`

Delete and re-insert defaults:
```sql
DELETE FROM config;
INSERT INTO config (key, value) VALUES
    ('learning.enabled', 'true'),
    ('learning.taste.threshold', '0.5'),
    ('learning.workflow.suggest_threshold', '0.5'),
    ('learning.workflow.trigger_threshold', '0.8'),
    ('learning.autonomy.max_level', 'notify'),
    ('healing.enabled', 'true'),
    ('healing.max_retries', '3'),
    ('healing.fallback.enabled', 'true'),
    ('hooks.retention_days', '30'),
    ('hooks.decision_points', 'true');
```

Display: `"✓ All configuration reset to defaults."`
```

Write to `founder-os-adaptive-intel/commands/intel-config.md`.

- [ ] **Step 2: Commit**

```bash
git add founder-os-adaptive-intel/commands/intel-config.md
git commit -m "feat(adaptive-intel): add /intel:config command"
```

### Task 19: Create Notion sync skill

**Files:**
- Create: `founder-os-adaptive-intel/skills/notion-sync/SKILL.md`

- [ ] **Step 1: Write the Notion sync skill**

```markdown
---
name: intelligence-notion-sync
description: Bidirectional sync between the local Intelligence SQLite database and the [FOS] Intelligence Notion database. Reads from both the patterns and healing_patterns tables.
---

## Overview

Syncs learned patterns and healing data between the local Intelligence DB and the `[FOS] Intelligence` Notion database. Sync is triggered explicitly by `/memory:sync` (shared with Memory Engine). It is NOT triggered automatically by read-only commands like `/intel:status`.

## Notion Database Discovery

Follow the standard 3-step discovery pattern:
1. Search for "[FOS] Intelligence"
2. Fall back to "Founder OS HQ - Intelligence"
3. If not found, skip Notion sync silently — local-only mode

## Local → Notion (Push)

### Patterns Table

For each row in `patterns` with `updated_at` newer than last sync:

| SQLite Column | Notion Property | Transform |
|---|---|---|
| description | Pattern (title) | Direct |
| plugin | Plugin (select) | Null → "Cross-Plugin" |
| pattern_type | Type (select) | Capitalize: taste → "Taste" |
| confidence | Confidence (number) | Direct (0.0-1.0) |
| status | Status (status) | Capitalize: active → "Active" |
| observations | Observations (number) | Direct |
| updated_at | Last Applied (date) | ISO 8601 |
| instruction | Instruction (rich_text) | Direct |

### Healing Patterns Table

For each row in `healing_patterns` with `last_seen` newer than last sync:

| SQLite Column | Notion Property | Transform |
|---|---|---|
| error_signature | Pattern (title) | Direct |
| plugin | Plugin (select) | Null → "Cross-Plugin" |
| category | Type (select) | Fixed: "Healing" |
| (calculated) | Confidence (number) | `success_count / max(1, success_count + failure_count)` |
| "active" | Status (status) | Fixed: "Active" |
| success_count + failure_count | Observations (number) | Sum |
| last_seen | Last Applied (date) | ISO 8601 |
| fix_action + fallback_action | Instruction (rich_text) | Concatenate: "Fix: {fix_action}. Fallback: {fallback_action}" |

## Notion → Local (Pull)

When a user edits a pattern in Notion:
- Status changes (e.g., Approved → Rejected) are written back to the patterns table
- Instruction edits are written back
- Confidence manual overrides are written back
- New rows created in Notion are NOT synced back (patterns must originate from observations)

## Sync Tracking

Store last sync timestamp in the config table:
```sql
INSERT OR REPLACE INTO config (key, value) VALUES ('notion.last_sync', datetime('now'))
```

## Error Handling

- If Notion API is unavailable, skip sync silently — local data is the source of truth
- If a specific row fails to sync, log the error and continue with remaining rows
- Never block plugin execution on Notion sync failure
```

Write to `founder-os-adaptive-intel/skills/notion-sync/SKILL.md`.

- [ ] **Step 2: Commit**

```bash
git add founder-os-adaptive-intel/skills/notion-sync/SKILL.md
git commit -m "feat(adaptive-intel): add Notion sync skill for Intelligence DB"
```

### Task 20: Create plugin documentation and test plan

**Files:**
- Create: `founder-os-adaptive-intel/tests/integration-test-plan.md`
- Create: `founder-os-adaptive-intel/INSTALL.md`
- Create: `founder-os-adaptive-intel/QUICKSTART.md`
- Create: `founder-os-adaptive-intel/README.md`
- Modify: `_infrastructure/notion-hq/INSTALL.md` (add [FOS] Intelligence DB to install steps)

- [ ] **Step 1: Write integration test plan**

Create `founder-os-adaptive-intel/tests/integration-test-plan.md` with test scenarios covering:
- `/intel:status` with empty DB, with events, with patterns
- `/intel:patterns` with no patterns, filtered by plugin, filtered by type, detail view
- `/intel:approve` with valid ID, invalid ID, already-approved pattern
- `/intel:reset` by plugin, by type, all, with confirmation flow
- `/intel:healing` with no errors, with errors, filtered by plugin
- `/intel:config` show all, set value, invalid key, reset
- Pilot plugin hooks: verify pre_command/post_command events are written
- Pilot plugin pattern injection: verify active patterns are applied
- Pilot plugin self-healing: verify transient retry and graceful degradation

```bash
mkdir -p founder-os-adaptive-intel/tests
```

- [ ] **Step 2: Write INSTALL.md**

Standard Founder OS install doc covering: prerequisites (Memory Hub plugin), MCP server config (Notion), initial setup steps.

- [ ] **Step 3: Write QUICKSTART.md**

Quick reference showing all 6 commands with one-line descriptions and example usage.

- [ ] **Step 4: Write README.md**

Plugin overview covering: what it does, how it works (hooks → learning → self-healing), commands reference, configuration options, Notion integration, relationship to Memory Engine.

- [ ] **Step 5: Update HQ install guide**

Read `_infrastructure/notion-hq/INSTALL.md` and add the `[FOS] Intelligence` database to the database creation steps, referencing `hq-intelligence.json` as the template.

- [ ] **Step 6: Commit**

```bash
git add founder-os-adaptive-intel/tests/ founder-os-adaptive-intel/INSTALL.md founder-os-adaptive-intel/QUICKSTART.md founder-os-adaptive-intel/README.md _infrastructure/notion-hq/INSTALL.md
git commit -m "docs(adaptive-intel): add test plan, INSTALL, QUICKSTART, README, and update HQ install guide"
```

### Chunk 4 Verification

```bash
# Verify all 6 commands exist
ls founder-os-adaptive-intel/commands/
# Should show: intel-approve.md, intel-config.md, intel-healing.md, intel-patterns.md, intel-reset.md, intel-status.md

# Verify complete plugin structure
find founder-os-adaptive-intel -type f | sort
# Should show all expected files

# Verify complete infrastructure structure
find _infrastructure/intelligence -type f | sort
# Should show all SKILL.md files and schema

# Final tag
git tag intelligence-chunk-4-complete
```

---

## Future Chunks (Not Yet Planned in Detail)

The following chunks build on the foundation above. They should each get their own detailed plan when ready to implement.

### Chunk 5: Workflow Optimization (Tier 2)
- `_infrastructure/intelligence/learning/workflow-optimization/SKILL.md`
- Chain detection logic: track sequential commands within 5min windows
- Workflow suggestion engine: notify after first command in a detected chain
- Auto-trigger at confidence >= 0.8 or user-approved
- Max chain length: 4 commands

### Chunk 6: Confidence-Gated Autonomy (Tier 3)
- `_infrastructure/intelligence/learning/confidence-gating/SKILL.md`
- Decision-point pattern matching across sessions
- Escalation ladder: Ask → Suggest → Act+Notify → Silent
- Any rejection drops back to Ask
- Silent level requires explicit `/intel:approve`

### Chunk 7: Adaptive Routing
- `_infrastructure/intelligence/routing/SKILL.md`
- Cross-plugin pattern promotion to Memory Engine
- Confidence scale conversion (0.0-1.0 → 0-100)
- Route decisions based on accumulated patterns

### Chunk 8: Full Plugin Rollout
- Add observation blocks to remaining 27 plugins (beyond the 3 pilots)
- Add pattern injection blocks to all 30 plugins
- Add self-healing blocks to all 30 plugins
- Organized by pillar with separate commits per pillar

---

## Final Verification

After all 4 core chunks are complete:

```bash
# Full structure check
echo "=== Infrastructure ===" && find _infrastructure/intelligence -type f | sort
echo "=== Plugin ===" && find founder-os-adaptive-intel -type f | sort

# Git log for all intelligence commits
git log --oneline --grep="intelligence\|adaptive-intel"

# Tag release
git tag intelligence-v1.0-core
```
