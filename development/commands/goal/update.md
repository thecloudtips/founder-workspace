---
description: Update goal progress, complete milestones, add notes, or change status
argument-hint: "[goal name] [--progress=N] [--done=MILESTONE] [--add=MILESTONE] [--status=STATUS] [--note=TEXT]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:goal:update

Update an existing goal's progress, milestones, status, or notes. Recalculate RAG status and velocity after changes.

## Load Skills

Read both:
1. `${CLAUDE_PLUGIN_ROOT}/skills/goal/goal-tracking/SKILL.md`
2. `${CLAUDE_PLUGIN_ROOT}/skills/goal/progress-analysis/SKILL.md`

## Parse Arguments

- **goal name** (required positional) — fuzzy match against existing goals. If ambiguous, present numbered list for selection. If empty, prompt.
- `--progress=N` (optional) — manual progress override 0-100. Only valid for goals without milestones.
- `--done=MILESTONE` (optional) — mark named milestone as Done. Set Completed At to today.
- `--add=MILESTONE` (optional) — add a new milestone. Assign next Order number.
- `--status=STATUS` (optional) — change goal status. Validate against lifecycle transitions.
- `--note=TEXT` (optional) — append note to goal's Notes field.
- Multiple flags can combine: `--done=M1 --note="Shipped ahead of schedule"`

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
- Command: `goal-update`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'goal-tracker' OR plugin IS NULL) AND (command = 'goal-update' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

1. **Verify Notion**: Check connection. If unavailable, display error and stop.

2. **Resolve Goal**: Search Goals DB for matching goal by name. Fuzzy match (case-insensitive substring). If multiple matches, present numbered list. If no match, suggest similar names or offer to create.

3. **Apply Changes** (in this order):
   a. If `--done=MILESTONE`: Find milestone by name under this goal, set Status="Done", set Completed At=today. If milestone not found, list available milestones.
   b. If `--add=MILESTONE`: Create new milestone page linked to this goal. Assign Order = current max Order + 1. Update Milestone Count on goal.
   c. If `--progress=N`: Set Progress to N. Only allowed when Milestone Count = 0 (manual tracking). If milestones exist, reject: "Progress is auto-calculated from milestones. Use --done to complete milestones instead."
   d. If `--status=STATUS`: Validate transition per status lifecycle. Apply if valid. If invalid, display error message from lifecycle reference.
   e. If `--note=TEXT`: Prepend `[YYYY-MM-DD] TEXT` to Notes field.

4. **Recalculate Progress**: If milestones exist, recalculate using milestone progress formula. Append new Progress Snapshot entry.

5. **Auto-Transition Status**: If progress went from 0 to >0 and Status was "Not Started", auto-transition to "In Progress" and set Start Date. If progress = 100% and all milestones Done, auto-transition to "Completed".

6. **Recompute Analysis**: Run RAG status calculation, velocity projection, and blocker detection from progress-analysis skill. Update RAG Status and Projected Completion on the goal page.

7. **Update Goal Page**: Write all changed properties to Notion.

8. **Display Summary**:
```
✅ Goal updated: [Goal Name]

📊 Progress: ███████░░░ 70% (was 50%)
🔴/🟡/🟢 RAG: [Status] (was [Previous])
📅 Projected: [YYYY-MM-DD]
🏁 Milestones: [X/Y completed]

Changes applied:
  • [Milestone "Design mockups" marked Done]
  • [Note added]
  • [etc.]

⚠️ Blockers detected:
  • [blocker detail if any]

Use /founder-os:goal:check for full status | /founder-os:goal:report for dashboard
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

- Notion unavailable: Error message, stop.
- Goal not found: Suggest similar names, offer to create.
- Invalid milestone name: List available milestones.
- Invalid status transition: Display error with valid options.
- Manual progress on milestone goal: Reject with explanation.

## Usage Examples

```
/founder-os:goal:update "Launch MVP" --done="Design mockups" --note="Finalized with client approval"
/founder-os:goal:update "Reach 50K MRR" --progress=35
/founder-os:goal:update "Hire senior engineer" --add="Post job listing" --add="Screen candidates"
/founder-os:goal:update "Launch MVP" --status=on-hold --note="Waiting for vendor contract"
```
