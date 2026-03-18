---
description: Generate a goal progress dashboard with RAG status, blockers, and Gantt timeline
argument-hint: "[--category=CAT] [--status=red|yellow|green|active|all] [--output=chat|notion|file] [--path=PATH]"
allowed-tools: ["Read", "Write"]
execution-mode: background
result-format: summary
---

# /founder-os:goal:report

Generate a comprehensive goal progress dashboard with dashboard table, RAG breakdown, blockers analysis, and Mermaid Gantt timeline.

## Load Skills

Read all three skills:

1. `${CLAUDE_PLUGIN_ROOT}/skills/goal/goal-tracking/SKILL.md`
2. `${CLAUDE_PLUGIN_ROOT}/skills/goal/progress-analysis/SKILL.md`
3. `${CLAUDE_PLUGIN_ROOT}/skills/goal/goal-reporting/SKILL.md`

## Parse Arguments

- `--category=CAT` (optional) — filter by goal category
- `--status=VALUE` (optional) — filter: red, yellow, green, active (In Progress only), all (default)
- `--output=DEST` (optional) — chat (default), notion, file
- `--path=PATH` (optional) — local file path for file output. Default: `goal-report-YYYY-MM-DD.md`
- No positional arguments. If arguments provided that look like a goal name, suggest /founder-os:goal:check instead.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `goal` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `goal-tracker`
- Command: `goal-report`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'goal-tracker' OR plugin IS NULL) AND (command = 'goal-report' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

1. **Verify Notion**: Check connection. Required for this command.

2. **Fetch All Goals**: Query Goals DB for all non-archived goals. Apply filters (--category, --status) using AND logic per filtering rules in goal-reporting skill.

3. **Fetch Milestones**: For each goal with Milestone Count > 0, fetch linked milestones from Milestones DB.

4. **Recompute Analysis**: For each goal, run:
   - Milestone progress formula (if milestones exist)
   - RAG status calculation
   - Velocity projection
   - Blocker detection
   Update the goal pages with fresh RAG Status and Projected Completion values.

5. **Render Dashboard Table**: Build table per dashboard-table-format specification. Read `${CLAUDE_PLUGIN_ROOT}/skills/goal/goal-reporting/references/dashboard-table-format.md` for full formatting rules. Sort by RAG severity.

6. **Render RAG Breakdown**: Group goals by RAG tier. Red first, then Yellow, Green, Not Started. 1-2 sentence analysis per group.

7. **Render Needs Attention**: List goals with active blockers sorted by severity. Include blocker detail and suggested action.

8. **Generate Gantt Timeline**: Build Mermaid gantt chart per gantt-generation specification. Read `${CLAUDE_PLUGIN_ROOT}/skills/goal/goal-reporting/references/gantt-generation.md` for syntax. Group by category, apply color directives.

9. **Output Report**: Based on --output:
   - chat: Display full report in chat with Mermaid in fenced code block
   - notion: Create/update a report page in Notion
   - file: Write to --path (or default path)

10. **Display Summary Stats**:

```
📊 Goal Progress Report — YYYY-MM-DD

🟢 On Track: N  |  🟡 At Risk: N  |  🔴 Behind: N  |  ⚪ Not Started: N

[Dashboard Table]

[RAG Breakdown]

[Needs Attention]

[Gantt Timeline]

Generated from N goals | Use /founder-os:goal:check [name] for detail
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

## Edge Cases

- 0 goals: "No goals tracked yet. Use /founder-os:goal:create to get started."
- All filtered out: "No goals match the selected filters."
- All completed: Celebration summary
- Goals without target date: Include in table, exclude from Gantt, list in footnote

## Usage Examples

```
/founder-os:goal:report
/founder-os:goal:report --status=red
/founder-os:goal:report --category=Product --output=file --path=q2-goals.md
/founder-os:goal:report --output=notion
```
