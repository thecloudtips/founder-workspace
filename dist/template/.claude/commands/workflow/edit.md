---
description: Modify an existing workflow's steps, schedule, or configuration
argument-hint: "[workflow-name] [--add-step] [--remove-step=ID] [--schedule=CRON] [--disable-schedule]"
allowed-tools: ["Read", "Write"]
execution-mode: background
result-format: summary
---

# /founder-os:workflow:edit

Modify an existing workflow YAML file — add/remove steps, update schedule, or change configuration.

## Load Skills

Read these skills before starting:

1. `skills/workflow/workflow-design/SKILL.md`
2. `skills/workflow/workflow-scheduling/SKILL.md`

## Parse Arguments

- **workflow-name** (required positional) — name of workflow to edit. If not provided, list available workflows and prompt for selection.
- `--add-step` (optional) — interactively add a new step
- `--remove-step=ID` (optional) — remove step with given ID
- `--schedule=CRON-OR-NATURAL` (optional) — set or update the cron schedule. Accepts cron expression or natural language (e.g., "every weekday at 9am")
- `--disable-schedule` (optional) — set schedule.enabled=false

If no modification flags are provided, display the current workflow configuration and ask what the user wants to change.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
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
- Command: `workflow-edit`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'workflow-automator' OR plugin IS NULL) AND (command = 'workflow-edit' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

1. **Locate Workflow**: Find `workflows/[workflow-name].yaml`. If not found, suggest closest match or list available workflows.

2. **Parse Current State**: Read and parse the YAML file. Display current configuration summary.

3. **Apply Modifications**:

   **--add-step**:
   a. Ask: "What command should this step run? (e.g., /founder-os:inbox:triage)"
   b. Ask: "Step name (human-readable):"
   c. Ask: "Any arguments? (key=value, comma-separated, or Enter to skip)"
   d. Ask: "Should it depend on any existing step? Available: [list step IDs]"
   e. Generate step ID from name (kebab-case)
   f. Insert step into the steps array

   **--remove-step=ID**:
   a. Find the step with matching ID
   b. Check if other steps depend on it. If so, warn: "Step '[ID]' is depended on by: [list]. Removing it will break those dependencies."
   c. Remove the step
   d. Remove the ID from all other steps' depends_on arrays

   **--schedule=VALUE**:
   a. If value looks like a cron expression (5 space-separated fields), use directly
   b. If natural language, convert to cron using workflow-scheduling skill's NL-to-cron rules
   c. Confirm the interpretation: "Schedule: [cron] ([description]). Correct?"
   d. Update schedule block: set cron, enabled=true

   **--disable-schedule**:
   a. Set schedule.enabled=false in the YAML

4. **Validate**: Run all 14 validation rules on the modified workflow.

5. **Write File**: Save the modified YAML back to the same file path.

6. **Display Confirmation**:
```
✅ Workflow updated: [name]

Changes:
  [+ Added step 'new-step' at position N]
  [- Removed step 'old-step']
  [~ Schedule updated: 0 9 * * 1-5 (weekdays at 9 AM)]

Use /founder-os:workflow:run [name] --dry-run to preview changes
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

- Workflow not found: suggest /founder-os:workflow:create
- Removing the only step: reject "Cannot remove the last step. Delete the workflow file instead."
- Adding step creates cycle: reject with cycle error
- Schedule NL ambiguous: present options and confirm

## Usage Examples

```
/founder-os:workflow:edit morning-routine --add-step
/founder-os:workflow:edit weekly-review --remove-step=old-report
/founder-os:workflow:edit morning-routine --schedule="every weekday at 8:30am"
/founder-os:workflow:edit client-onboarding --disable-schedule
/founder-os:workflow:edit morning-routine
```
