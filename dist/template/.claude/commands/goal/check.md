---
description: Quick status check for a single goal or all goals (read-only, no Notion writes)
argument-hint: "[goal name]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:goal:check

Ephemeral read-only status check. Never write to Notion. Two modes: single-goal detail view, or all-goals compact dashboard.

## Load Skills

Read:
1. `skills/goal/goal-tracking/SKILL.md`
2. `skills/goal/progress-analysis/SKILL.md`

## Parse Arguments

- **goal name** (optional positional) — if provided, show single-goal detail view. Fuzzy match.
- No flags. This command has no options — it's intentionally simple.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
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
- Command: `goal-check`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'goal-tracker' OR plugin IS NULL) AND (command = 'goal-check' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Mode 1: Single-Goal Detail (when goal name provided)

1. Search Goals DB for matching goal. Fuzzy match. If ambiguous, present selection list.
2. Fetch linked milestones from Milestones DB.
3. Compute RAG, velocity, projected completion, and blockers (do NOT write results back to Notion).
4. Display detailed view:

```
🎯 [Goal Name]
📂 [Category] | 📅 Target: [YYYY-MM-DD] | Status: [Status]

📊 Progress: ███████░░░ 70%
🟡 RAG: At Risk (gap: -15)
📈 Velocity: 3.2%/day | Projected: YYYY-MM-DD

🏁 Milestones (X/Y):
  ✅ Milestone 1 (completed YYYY-MM-DD)
  ✅ Milestone 2 (completed YYYY-MM-DD)
  🔄 Milestone 3 (in progress, due YYYY-MM-DD)
  ⬜ Milestone 4 (not started, due YYYY-MM-DD)
  🚫 Milestone 5 (skipped)

⚠️ Blockers:
  • [critical] Deadline overrun: target was YYYY-MM-DD
  • [high] Milestone "X" overdue by N days

📝 Recent Notes:
  [YYYY-MM-DD] Latest note...
  [YYYY-MM-DD] Previous note...
```

Milestone status icons: ✅ Done, 🔄 In Progress, ⬜ Not Started, 🚫 Skipped

## Mode 2: All-Goals Dashboard (when no goal name)

1. Fetch all non-archived goals from Goals DB.
2. Compute RAG for each (read-only, don't write back).
3. Display compact dashboard table (same format as goal-report but without Gantt):

```
📊 Goal Status Overview

| Goal | Category | Progress | RAG | Target Date | Status |
|:---|:---|:---:|:---:|:---:|:---|
| Launch MVP | Product | ███████░░░ 70% | 🟡 | 2026-06-30 | In Progress |
| Reach 50K MRR | Revenue | ██░░░░░░░░ 20% | 🔴 | 2026-12-31 | In Progress |
...

🟢 N on track | 🟡 N at risk | 🔴 N behind | ⚪ N not started

Use /founder-os:goal:check [name] for details | /founder-os:goal:report for full dashboard
```

## Key Constraint

**NEVER write to Notion.** This command is purely read-only. All computations (RAG, velocity, blockers) are calculated in-memory for display only. Use /founder-os:goal:report to persist updated analysis.

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
- Goal not found: Suggest similar names
- Notion unavailable: "Cannot check goals — Notion is not connected."

## Usage Examples

```
/founder-os:goal:check "Launch MVP"
/founder-os:goal:check
```
