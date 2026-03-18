---
description: Search and browse past learnings by topic, keyword, or date
argument-hint: "[topic-or-keyword] [--since=Nd|YYYY-MM-DD] [--source=TYPE] [--limit=N]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:learn:search

Query the Learning Log Tracker database to find past learnings filtered by topic, keyword, date range, and source type. Display ranked results with related insight cross-references.

## Load Skills

Read the learning-search skill before starting any step:

1. `${CLAUDE_PLUGIN_ROOT}/skills/learn/learning-search/SKILL.md`

Apply learning-search for all filter logic, result ranking, display formatting, and empty result handling.

## Parse Arguments

Extract from `$ARGUMENTS`:

- **topic-or-keyword** (optional positional) — if the value matches one of the 10 predefined topics (case-insensitive prefix match), treat as a topic filter. Otherwise, treat as a keyword search term. If empty, return the most recent learnings with no filters.
- `--since=VALUE` (optional) — date filter. Accepts `Nd` (e.g., `7d`, `30d`) for relative lookback or `YYYY-MM-DD` for absolute date. Entries on or after the resolved date are included.
- `--source=TYPE` (optional) — filter by Source Type (experience, reading, conversation, experiment, observation).
- `--limit=N` (optional) — maximum results to return. Default: 10. Maximum: 50.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `learn` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `learning-log`
- Command: `learn-search`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'learning-log' OR plugin IS NULL) AND (command = 'learn-search' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Step 1: Verify Notion Availability

Check that the Notion CLI tool is connected. If unavailable, display:

```
⚠️ Notion is not available. Cannot search learnings without database access.
Check your Notion CLI connection and try again.
```

Then stop.

## Step 2: Locate Database

Search the Notion workspace for a database named "[FOS] Learnings". If not found, try "Founder OS HQ - Learnings". If not found, fall back to "Learning Log Tracker - Learnings". If none exists, display:

```
📭 No learning log found yet. Use /founder-os:learn:log to capture your first learning!
```

Then stop. Do not create the database on read operations.

## Step 3: Build Filter Pipeline

Read `${CLAUDE_PLUGIN_ROOT}/skills/learn/learning-search/references/search-filter-logic.md` for the detailed Notion query construction.

Apply filters in the fixed order defined in the learning-search skill:

1. **Topic filter** — if a topic was identified from the positional argument
2. **Date filter** — if `--since` was provided
3. **Source filter** — if `--source` was provided, add a filter for `Source Type` equals the specified value
4. **Keyword filter** — if the positional argument is a keyword (not a topic match)

Combine active filters with AND logic.

## Step 4: Execute Query

Query the Notion database with the constructed filter. Fetch up to 50 results sorted by `Logged At` descending.

## Step 5: Score and Rank Results

Apply the composite relevance scoring from the learning-search skill:

- Title keyword match: +3
- Insight keyword match: +2
- Context keyword match: +1
- Exact topic match: +2
- Recency (last 7 days): +1
- Old (90+ days): -1

Re-sort results by composite score descending, tiebreak by `Logged At` descending.

Apply the `--limit` value (default 10).

## Step 6: Display Results

Format results using the display template from the learning-search skill. Use topic emojis:

```
### 🔍 Learning Search Results

**Query**: [search terms] | **Filters**: [active filters] | **Results**: N found

1. 📘 **Granular Try-Catch Blocks for Async Errors** — Technical, Process
   _Discovered that wrapping each await in its own try-catch rather than one big block..._
   📅 2026-03-05 | Source: Experience
   🔗 Related: API Rate Limiting Best Practices, Error Monitoring Setup

2. 💡 **Notion API Pagination Requires Has_More Check** — Technical, Tool
   _Reading about how Notion's API handles pagination taught me to always check..._
   📅 2026-03-03 | Source: Reading
   🔗 Related: none
```

Topic emoji mapping: Technical=📘, Process=⚙️, Business=💼, People=👥, Tool=🔧, Strategy=🎯, Mistake=⚠️, Win=🏆, Idea=💡, Industry=🌐

## Step 7: Handle Empty Results

If no results match, follow the empty results handling from the learning-search skill:

```
📭 No learnings found matching "[query]" with filters: [active filters].

💡 Suggestions:
  • Remove the date filter to search all time
  • Try a related topic: [suggest 2-3 related topics]
  • Use a shorter or broader keyword

📊 Your learning log contains N entries total.
```

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

## Graceful Degradation

- **Notion unavailable**: Error message at Step 1. Do not fabricate results.
- **Database not found**: Friendly message at Step 2 suggesting /founder-os:learn:log.
- **No results**: Constructive suggestions at Step 7.
- **Ambiguous argument**: Prioritize topic matching over keyword. Note in output.

## Usage Examples

```
/founder-os:learn:search Technical
/founder-os:learn:search "error handling" --since=30d
/founder-os:learn:search --source=reading --limit=20
/founder-os:learn:search Process --since=7d
/founder-os:learn:search
```
