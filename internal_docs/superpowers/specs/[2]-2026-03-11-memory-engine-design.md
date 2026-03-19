# Founder OS Memory Engine — Design Spec

**Date**: 2026-03-11
**Status**: Approved
**Approach**: Infrastructure Layer + Thin Command Plugin (Approach 3)

## Problem

The 30 Founder OS plugins operate statelessly — each execution starts fresh with no knowledge of past runs, user preferences, or cross-plugin context. A founder who triages emails daily must re-establish context every time. Knowledge discovered by one plugin (e.g., P21 CRM Sync learning a new contact) is invisible to others (e.g., P01 Inbox Zero).

## Goals

1. **Cross-plugin shared memory** — Knowledge discovered by any plugin is available to all others
2. **Adaptive behavior** — System detects usage patterns and auto-adjusts after 3+ confirmations, notifying the user
3. **Context injection** — Before any plugin runs, relevant memories are automatically injected into its context
4. **User control** — User can view, teach, forget, and manage memories via commands and Notion

## Architecture

### Two Components

**1. Infrastructure Layer** (`_infrastructure/memory/`)
Shared skills consumed by all 30 plugins. Manages the local SQLite+HNSW store, context injection, and pattern detection. Not a plugin — no manifest, no commands.

**2. Memory Hub Plugin** (`founder-os-memory-hub/`)
Thin user-facing plugin with 4 slash commands for memory management, plus Notion sync. Follows the standard Anthropic plugin format.

### Directory Structure

```
_infrastructure/memory/
├── SKILL.md                    # Core memory API: store, retrieve, query, delete
├── context-injection/
│   └── SKILL.md                # Auto-inject top 5 relevant memories before plugin execution
├── pattern-detection/
│   └── SKILL.md                # Detect patterns, manage confidence, trigger adaptations
└── schema/
    └── memory-store.sql        # SQLite + HNSW schema

founder-os-memory-hub/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── memory-show.md          # /memory:show [company|plugin|all] — view memories
│   ├── memory-forget.md        # /memory:forget <key> — delete a memory
│   ├── memory-teach.md         # /memory:teach "always do X" — explicit memory
│   └── memory-sync.md          # /memory:sync — force local ↔ Notion sync
├── skills/
│   └── notion-sync/
│       └── SKILL.md            # Bidirectional sync: local SQLite ↔ [FOS] Memory DB
├── INSTALL.md
├── QUICKSTART.md
└── README.md
```

## Data Model

### Local Store (SQLite + HNSW)

```sql
-- Core memory entries
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,          -- human-readable identifier
  category TEXT NOT NULL,            -- preference | pattern | fact | contact | workflow
  content TEXT NOT NULL,             -- the actual memory content
  source_plugin TEXT,                -- which plugin created this (P01, P21, user, etc.)
  confidence INTEGER DEFAULT 0,     -- 0-100, rises with repeated confirmation
  status TEXT DEFAULT 'candidate',   -- candidate | confirmed | applied | dismissed
  company_id TEXT,                   -- optional: related company page_id
  tags TEXT,                         -- JSON array of tags for filtering
  embedding TEXT,                    -- vector embedding for semantic search
  times_used INTEGER DEFAULT 0,
  times_confirmed INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_used_at INTEGER,
  expires_at INTEGER                 -- optional TTL for temporal patterns
);

-- Pattern observations (raw data before becoming memories)
CREATE TABLE observations (
  id TEXT PRIMARY KEY,
  plugin TEXT NOT NULL,
  action TEXT NOT NULL,              -- what the user did
  context TEXT,                      -- surrounding context (JSON)
  observed_at INTEGER NOT NULL
);

-- Adaptation log (what the system changed and when)
CREATE TABLE adaptations (
  id TEXT PRIMARY KEY,
  memory_id TEXT REFERENCES memories(id),
  plugin TEXT NOT NULL,
  description TEXT NOT NULL,         -- "Now auto-archiving newsletters from tech-daily.com"
  applied_at INTEGER NOT NULL,
  reverted_at INTEGER                -- null if still active
);
```

### HNSW Vector Index

- Indexes `memories.embedding` for semantic similarity search
- Used by context injection to find relevant memories for current plugin input
- Local-only, rebuilt from SQLite data on corruption

### Notion DB: [FOS] Memory

Added to HQ template. Properties:

| Property | Type | Description |
|----------|------|-------------|
| Key | title | Human-readable memory identifier |
| Category | select | preference, pattern, fact, contact, workflow |
| Content | rich_text | The memory content |
| Source Plugin | select | P01-P30 or "User" |
| Confidence | number (0-100) | How certain the system is |
| Status | select | candidate, confirmed, applied, dismissed |
| Company | relation → Companies | Optional company link |
| Tags | multi_select | Filtering tags |
| Times Used | number | Usage count |
| Last Used | date | Last access timestamp |
| Synced At | date | Last local↔Notion sync time |

## Data Flow

### 1. Context Injection (before every plugin run)

```
Plugin starts → context-injection skill activates
  → Extract key entities from input (company names, email domains, topics)
  → Query HNSW index for top 5 semantically similar memories
  → Also query by exact company_id if a company is identified
  → Filter: only status=confirmed or status=applied memories
  → Inject as a "Memory Context" block at the top of the plugin's execution context
  → Increment times_used on each injected memory
```

Injected format:
```
## Relevant Memories
- [preference] Acme Corp: VIP client, always prioritize. Prefers formal tone. (confidence: 95)
- [contact] Sarah Chen (sarah@acmecorp.com): CTO, key decision maker, has open $45K deal. (confidence: 88)
- [pattern] Emails from @acmecorp.com are typically action-required (85% of last 20). (confidence: 78)
```

### 2. Pattern Detection (after every plugin run)

```
Plugin completes → pattern-detection skill activates
  → Log observation: {plugin, action, context, timestamp}
  → Check for emerging patterns:
    - Same action repeated 3+ times? → Create candidate memory
    - User edited/overrode plugin output? → Log preference signal
    - New entity discovered? → Create fact memory
  → For existing candidate memories:
    - Pattern confirmed again? → Increment confidence (+15 per confirmation)
    - Confidence ≥ 60? → Promote to status=confirmed
    - Confidence ≥ 80 and 3+ confirmations? → Auto-adapt, notify user, set status=applied
  → Decay: memories not used in 30 days lose 5 confidence/week
  → Memories below confidence 10 auto-expire
```

### 3. Auto-Adaptation + Notification

When a pattern reaches the adaptation threshold (confidence ≥ 80, confirmed 3+ times):

1. System applies the adaptation (e.g., adjusts priority, pre-fills field, skips step)
2. Creates an adaptation log entry
3. Notifies user in the plugin's output:
   ```
   Memory adapted: I'm now auto-flagging @acmecorp.com emails as VIP based on your last 5 sessions. Run /memory:show to review, or /memory:forget "acme-vip" to revert.
   ```
4. User can revert anytime via `/memory:forget`

### 4. Notion Sync

Bidirectional sync between local SQLite and [FOS] Memory DB:

- **Local → Notion**: Push confirmed/applied memories on plugin completion (debounced, max 1 sync per 5 minutes)
- **Notion → Local**: Pull on plugin start if last sync > 1 hour ago. User edits in Notion (status changes, deletions) propagate to local store.
- **Conflict resolution**: Notion wins for status/content changes (user is source of truth). Local wins for confidence/usage counters (system-tracked).
- **Force sync**: `/memory:sync` triggers immediate bidirectional sync.

## Integration with Existing Plugins

Each of the 30 plugins needs a small modification:

1. **Add to skill references**: Include `_infrastructure/memory/context-injection/SKILL.md` and `_infrastructure/memory/pattern-detection/SKILL.md` in the command markdown's execution flow
2. **Context injection point**: At the start of execution, after input parsing but before main logic
3. **Pattern detection point**: At the end of execution, after output is generated

This is a 2-3 line addition per command file — no structural changes to any plugin.

Example addition to a command file:
```markdown
## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input. Inject any returned memories into your working context.

... (existing plugin logic) ...

## Final Step: Memory Update
Read the pattern-detection skill at `_infrastructure/memory/pattern-detection/SKILL.md`.
Log this execution as an observation. Check for emerging patterns.
```

## Memory Categories

| Category | Examples | Source |
|----------|----------|--------|
| preference | "Prefers bullet-point briefings", "Always CC mike@team.com" | User override detection, /memory:teach |
| pattern | "Emails from @bigclient.com are 90% action-required" | Auto-detected from repeated observations |
| fact | "Sarah Chen is CTO at Acme Corp", "Acme Corp fiscal year ends June" | Discovered by P20/P21/P10, or /memory:teach |
| contact | "mike@greenleaf.com — Account Manager, responsive, prefers Slack" | P21 CRM Sync, P01 email patterns |
| workflow | "After invoice processing, founder always runs expense report" | Sequential plugin usage patterns |

## Commands

### /memory:show [filter]
Show memories, optionally filtered by company, plugin, category, or status.
- `/memory:show` — all confirmed+applied memories
- `/memory:show acme` — memories related to Acme Corp
- `/memory:show --candidates` — pending patterns awaiting confirmation
- `/memory:show --adaptations` — active behavior changes

### /memory:forget <key>
Delete a memory and revert any adaptation it triggered.
- `/memory:forget acme-vip` — removes memory, reverts auto-VIP behavior

### /memory:teach "<statement>"
Explicitly create a confirmed memory (confidence 100).
- `/memory:teach "Always flag emails from @bigclient.com as urgent"`
- `/memory:teach "Acme Corp fiscal year ends in June"`

### /memory:sync
Force immediate bidirectional sync between local store and [FOS] Memory Notion DB.

## Performance Constraints

- Context injection must add < 2 seconds to plugin startup
- HNSW query for top 5 memories: < 100ms (local index)
- Pattern detection runs async after plugin output is delivered to user
- Notion sync is debounced (max 1 per 5 min) to avoid rate limits
- Local store size cap: 10,000 memories (with auto-expiry for low-confidence entries)

## Non-Goals

- No plugin-to-plugin real-time messaging (plugins don't talk to each other directly)
- No ML model training (pattern detection uses rule-based heuristics + confidence scoring)
- No memory sharing across different Founder OS installations (single-user system)
