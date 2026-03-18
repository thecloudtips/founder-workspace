---
description: Close or archive a goal with completion summary
argument-hint: "[goal name] [--archive] [--force] [--note=TEXT]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:goal:close

Close a goal as completed or archive it. Validate milestone completion, warn about incomplete work, generate final summary.

## Load Skills

Read `${CLAUDE_PLUGIN_ROOT}/skills/goal/goal-tracking/SKILL.md`

## Parse Arguments

- **goal name** (required positional) — fuzzy match. If empty, prompt.
- `--archive` (optional flag) — archive instead of completing. Sets Status to "Archived" instead of "Completed".
- `--force` (optional flag) — skip incomplete milestone warning. Close without confirmation.
- `--note=TEXT` (optional) — closing note appended to Notes field.

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
- Command: `goal-close`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'goal-tracker' OR plugin IS NULL) AND (command = 'goal-close' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

1. **Verify Notion**: Check connection. Required.

2. **Resolve Goal**: Search Goals DB. Fuzzy match. If ambiguous, present selection. If not found, suggest similar.

3. **Validate Status**: Check current status against lifecycle transitions (goal-tracking skill reference `references/status-lifecycle.md`):
   - If already Completed: "This goal is already completed (closed on YYYY-MM-DD)."
   - If already Archived: "This goal is already archived. Use --reopen to restore."
   - If Not Started and not --archive: "Cannot complete a goal that hasn't started. Update progress first or use --archive."

4. **Check Incomplete Milestones**: Fetch milestones for this goal. Count milestones with Status != "Done" and Status != "Skipped".
   - If incomplete milestones exist AND --force not provided:
     ```
     ⚠️ This goal has N incomplete milestone(s):
       🔄 Milestone A (in progress)
       ⬜ Milestone B (not started)

     Close anyway? Use --force to skip this check, or complete milestones first with /founder-os:goal:update --done="name".
     ```
     Wait for confirmation before proceeding.
   - If --force provided, skip warning and proceed.

5. **Close the Goal**:
   - If --archive: Set Status = "Archived". Leave Progress as-is.
   - If not --archive: Set Status = "Completed". Set Progress = 100.
   - Append to Notes: `[YYYY-MM-DD] Goal [completed/archived]. [--note text if provided]`
   - If incomplete milestones and closing anyway: `[YYYY-MM-DD] Goal closed with N incomplete milestone(s).`

6. **Calculate Duration**: Compute days from Start Date (or Created At) to today.

7. **Display Final Summary**:
```
✅ Goal [completed/archived]: [Goal Name]

📊 Final Progress: ██████████ 100% (or current % if archived)
📂 Category: [Category]
📅 Duration: N days (Start → Today)
🏁 Milestones: X/Y completed [Z skipped]

📝 Closing note: [note text or "None"]

🎉 [If completed: "Congratulations! Goal achieved."]
[If archived: "Goal archived. It won't appear in future reports."]

Use /founder-os:goal:report for updated dashboard
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

- Already closed/archived: Inform, no action
- All milestones already Done: Close smoothly, no warning
- 0 milestones: Close smoothly
- Goal with active blockers: Warn but allow close with --force
- Archived → reopen not handled here (future enhancement, display message)

## Usage Examples

```
/founder-os:goal:close "Launch MVP" --note="Shipped successfully to 50 beta users"
/founder-os:goal:close "Old Q1 initiative" --archive
/founder-os:goal:close "Hire engineer" --force --note="Position deprioritized"
```
