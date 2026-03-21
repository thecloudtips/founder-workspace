---
description: Quick morning check-in showing top priorities, today's schedule, and urgent counts across all sources
argument-hint: "[--since=12h]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:morning:quick

Lightweight morning check-in across all configured sources. Produce a concise chat-only summary — no Notion page creation, no detailed section assembly. Optimized for speed over completeness.

## Load Skills

Read the morning-briefing skill at `skills/morning/morning-briefing/SKILL.md` for multi-source gathering patterns and overnight window calculation.

Read the priority-synthesis skill at `skills/morning/priority-synthesis/SKILL.md` for cross-source priority scoring and the Quick Summary Format.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `--since=TIMEFRAME` (optional) — overnight window. Accepts `Nh` (hours) or ISO datetime. Default: `12h`.

No `--date`, `--output`, or other flags. This command is always today, always chat-only.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `morning` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `morning-sync`
- Command: `morning-quick`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'morning-sync' OR plugin IS NULL) AND (command = 'morning-quick' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context for this execution
3. Notify: `[Intel] Applying learned preference: "{description}"` for each pattern applied
4. If the Intelligence database does not exist, skip silently and continue execution

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

## Gather Phase (Lightweight)

Follow the morning-briefing skill's five-source gathering pipeline but with reduced depth:
1. Gmail: Fetch unread count and Q1 highlights only (skip Q2-Q4 classification detail)
2. Calendar: Fetch today's events, classify types and score importance
3. Notion: Count tasks due today + overdue count
4. Slack (if available): Count @mentions and P1 messages only
5. Drive (if available): Count recently modified docs only

Skip detailed extraction for each source — collect counts and top items only.

Track source availability (available/unavailable). Apply graceful degradation per morning-briefing skill rules.

## Synthesize Phase (Quick)

Apply the priority-synthesis skill's cross-source scoring to produce a Top 5 priority list. Use the Quick Summary Format defined in the skill.

Skip section assembly, urgency windowing detail, and Notion page formatting.

## Output Format

Present results in chat using this compact format:

```
## Morning Quick — [YYYY-MM-DD]

### Top 5 Priorities
1. [imperative action] — [source icon] [time sensitivity]
2. [imperative action] — [source icon] [time sensitivity]
3. [imperative action] — [source icon] [time sensitivity]
4. [imperative action] — [source icon] [time sensitivity]
5. [imperative action] — [source icon] [time sensitivity]

### Today at a Glance
- [N] meetings ([N] high-priority) | Next: [title] at [time]
- [N] emails need attention | [N] total unread
- [N] tasks due today | [N] overdue
[if Slack available] - [N] Slack @mentions | [N] highlights
[if Drive available] - [N] Drive updates

**Sources**: [list] | **Window**: Last [N]h
```

### Zero-Item Handling
- Zero priorities: "All clear — no urgent items this morning."
- Single source: Still produce output with available data
- All sources unavailable: Report which MCP servers to configure

### No Notion Storage

Do NOT search for, create, or update any Notion database. This command is ephemeral by design — like P19's /founder-os:slack:catch-up.

## Observation: End
After execution completes, record a post_command event to the Intelligence event store:
- Event type: `post_command`
- Use the same session_id from the start observation
- Outcome: `success` | `failure` | `degraded`
- Payload: { outcome summary, items processed, outputs created }
- Duration: milliseconds elapsed since pre_command event
- If any errors occurred during execution, also record an error event with the error type, message, and whether recovery was attempted

## Final: Memory Update
Read the pattern-detection skill at `_infrastructure/memory/pattern-detection/SKILL.md`.
Log this execution as an observation with: plugin name, primary action performed, key entities (companies, contacts), and output summary.
Check for emerging patterns per the detection rules. If a memory reaches the adaptation threshold, append the notification to the output.
