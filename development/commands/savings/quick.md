---
description: Quick view of time savings across all active Founder OS plugins for a recent period
argument-hint: "[--since=Nd|YYYY-MM-DD]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:savings:quick

Display a compact, chat-only summary of time saved by Founder OS plugins. No file output, no Notion logging. For a full report saved to disk and Notion, use `/founder-os:savings:weekly`.

## Load Skills

Read the cross-plugin-discovery skill at `${CLAUDE_PLUGIN_ROOT}/skills/savings/cross-plugin-discovery/SKILL.md` for the plugin scanning algorithm and DiscoveryResult schema.

Read the roi-calculation skill at `${CLAUDE_PLUGIN_ROOT}/skills/savings/roi-calculation/SKILL.md` for the calculation formulas, configuration resolution, and quick summary format.

Read the task estimates registry at `${CLAUDE_PLUGIN_ROOT}/config/task-estimates.json` for the plugin-to-database mapping.

## Parse Arguments

Extract from `$ARGUMENTS`:

- `--since=Nd|YYYY-MM-DD` (optional) -- Lookback period. `Nd` means N days ago (e.g., `7d`, `30d`). `YYYY-MM-DD` means from that date to today. Default: `7d`.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `savings` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `time-savings`
- Command: `savings-quick`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'time-savings' OR plugin IS NULL) AND (command = 'savings-quick' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Workflow

### Step 1: Resolve Date Range

1. Parse `--since` into a start_date and end_date (today).
2. For `Nd` format: start_date = today minus N days.
3. For `YYYY-MM-DD` format: start_date = provided date, end_date = today.

### Step 2: Load Configuration

1. Read `${CLAUDE_PLUGIN_ROOT}/config/user-config.json` if it exists for hourly_rate and overrides.
2. Fall back to defaults from task-estimates.json (hourly_rate_default: 150).

### Step 3: Discover Active Plugins

Run the cross-plugin-discovery algorithm:
1. Load the task-estimates.json registry.
2. For each category, search Notion for the database by name.
3. If found, count records within the date range using the category's date_property.
4. Record status per plugin (found/not_installed/error).

### Step 4: Calculate Savings

For each discovered plugin with status "found" and filtered_count > 0:
1. Look up manual_minutes and ai_minutes from task-estimates.json (with user overrides applied).
2. Calculate time_saved_hours = (manual_minutes - ai_minutes) × filtered_count / 60.
3. Calculate dollar_value = time_saved_hours × hourly_rate (skip if rate == 0).
4. Calculate roi_multiplier = manual_minutes / ai_minutes.

Compute aggregate totals: total_hours_saved, total_dollar_value, equivalent_work_days, tasks_automated.

### Step 5: Display Summary

Present results in this compact format:

```
## Time Savings Summary (Last [N] Days)

**[total_hours_saved] hours saved** across [tasks_automated] tasks
{{if rate > 0}} — worth **$[total_dollar_value]** at $[hourly_rate]/hr{{/if}}

### Top Savers
| Category | Tasks | Time Saved | ROI |
|----------|-------|------------|-----|
| [top 5 categories by time_saved, descending] |

**[active_plugins]** plugins active, **[not_installed]** not installed
```

If rate is 0 or not configured, omit dollar figures entirely.

End with: `For full report: /founder-os:savings:weekly • Configure: /founder-os:savings:configure`

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

- **No Notion CLI**: Report "Notion unavailable — cannot scan plugin databases." and stop.
- **No plugins found**: Display "No Founder OS plugin databases found in Notion. Install and use some plugins first."
- **All plugins have 0 tasks in range**: Display "No tasks recorded in the last [N] days. Try a wider range with --since=30d."
- **user-config.json missing**: Use defaults silently, no error.

## Usage Examples

```
/founder-os:savings:quick
/founder-os:savings:quick --since=30d
/founder-os:savings:quick --since=2026-01-01
```
