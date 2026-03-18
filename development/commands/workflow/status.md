---
description: View execution history and status of workflow runs
argument-hint: "[workflow-name] [--last=N] [--status=completed|failed|partial]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:workflow:status

View execution history for workflows from the Notion execution log.

## Load Skills

Read: `${CLAUDE_PLUGIN_ROOT}/skills/workflow/workflow-execution/SKILL.md`

## Parse Arguments

- **workflow-name** (optional positional) — filter by specific workflow name
- `--last=N` (optional) — show last N executions (default: 5, max: 20)
- `--status=VALUE` (optional) — filter: completed, failed, partial, running

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `workflow` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `workflow-automator`
- Command: `workflow-status`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'workflow-automator' OR plugin IS NULL) AND (command = 'workflow-status' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Steps

1. **Check Notion**: Verify Notion CLI is available. If unavailable:
   ```
   Notion is not available. Execution history requires Notion.
   Run /founder-os:workflow:run to execute workflows — results display in chat regardless of Notion status.
   ```

2. **Query Executions DB**: Search for a database titled "[FOS] Workflows" first. If not found, try "Founder OS HQ - Workflows". If not found, fall back to "Workflow Automator - Executions" (legacy). If no DB exists, display: "No execution history yet. Run a workflow with /founder-os:workflow:run first." When querying the consolidated DB, filter by Type="Execution" to exclude SOP records.

3. **Apply Filters**: Filter by workflow name (if provided) and status (if provided). Sort by Started At descending. Limit to --last count.

4. **Display Results**:

```
Workflow Execution History
━━━━━━━━━━━━━━━━━━━━━━━━━━

morning-routine v1.0.0
  [Mar 07 09:01] Completed — 4/4 steps (2m 34s)
  [Mar 06 09:00] Completed — 4/4 steps (2m 12s)
  [Mar 05 09:02] Failed at step 'generate-briefing' — 2/4 steps (1m 45s)

weekly-review v1.2.0
  [Mar 07 17:00] Partial — 4/6 steps, 1 failed, 1 skipped (5m 20s)

━━━━━━━━━━━━━━━━━━━━━━━━━━
Showing last 5 runs | Use --last=N for more
```

5. **Empty State**: "No matching executions found."

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

## Usage Examples

```
/founder-os:workflow:status
/founder-os:workflow:status morning-routine
/founder-os:workflow:status --status=failed --last=10
/founder-os:workflow:status weekly-review --last=3
```
