---
description: Set up persistent scheduling for a workflow using session or OS-level cron
argument-hint: "[workflow-name] [--cron=EXPR] [--natural=DESC] [--persistent] [--disable] [--list]"
allowed-tools: ["Read", "Write"]
execution-mode: background
result-format: summary
---

# /founder-os:workflow:schedule

Configure recurring execution of a workflow via session-level or persistent OS cron scheduling.

## Load Skills

Read these skills:

1. `skills/workflow/workflow-scheduling/SKILL.md`
2. `skills/workflow/workflow-design/SKILL.md`

## Parse Arguments

- **workflow-name** (optional positional) — workflow to schedule. Required unless `--list`.
- `--cron=EXPR` (optional) — 5-field cron expression
- `--natural=DESC` (optional) — natural language schedule (e.g., "every weekday at 9am")
- `--persistent` (optional) — generate OS-level cron job instead of session-level
- `--disable` (optional) — disable scheduling for this workflow
- `--list` (optional) — list all scheduled workflows (no workflow-name needed)
- `--timezone=TZ` (optional) — IANA timezone (default: system local)

If workflow-name provided but no --cron or --natural, check if workflow already has a schedule block and use it.

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
- Command: `workflow-schedule`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'workflow-automator' OR plugin IS NULL) AND (command = 'workflow-schedule' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

### --list Mode

1. Scan all `.yaml` files in `workflows/`
2. Filter for schedule.enabled=true
3. Display:
```
Scheduled Workflows
━━━━━━━━━━━━━━━━━━
  morning-routine    0 9 * * 1-5    Weekdays at 9:00 AM     (session)
  weekly-review      0 17 * * 5    Fridays at 5:00 PM       (persistent)
━━━━━━━━━━━━━━━━━━
Total: 2 scheduled workflows
```
4. If none scheduled: "No workflows are currently scheduled. Use /founder-os:workflow:schedule [name] --cron='...' to add one."

### Schedule Mode

1. **Locate Workflow**: Find `workflows/[workflow-name].yaml`. If not found, error.

2. **Determine Cron Expression**:
   - If `--cron` provided: validate the 5-field expression per cron-syntax reference (`skills/workflow/workflow-scheduling/references/cron-syntax.md`)
   - If `--natural` provided: convert using NL-to-cron table from workflow-scheduling skill. Confirm: "Interpreted as: [cron] ([description]). Correct?"
   - If neither: check workflow's schedule.cron. If empty, ask user.

3. **Update Workflow YAML**: Set schedule.enabled=true, schedule.cron, schedule.timezone.

4. **Session-Level Schedule** (default):
   - Use CronCreate to register the schedule for the current session
   - Display next 3 run times
   - Note: "This schedule is active for this session only. Use --persistent for OS-level cron."

5. **Persistent Schedule** (--persistent):
   - Generate runner script at `workflows/runners/[name]-runner.sh` per os-cron-generation reference (`skills/workflow/workflow-scheduling/references/os-cron-generation.md`)
   - Make script executable
   - Display crontab installation instructions (never modify crontab directly)
   - Display: "Runner script created. Follow the instructions above to install the persistent cron job."

### --disable Mode

1. Set schedule.enabled=false in the workflow YAML
2. If a session schedule exists, note it will stop at session end
3. If persistent, provide crontab removal instructions
4. Display: "Schedule disabled for '[name]'."

## Confirmation Display

```
✅ Schedule configured: [name]

⏰ Cron: [expression] ([human description])
🌍 Timezone: [timezone]
📋 Mode: [Session | Persistent]

Next runs:
  1. [datetime]
  2. [datetime]
  3. [datetime]

[For persistent: installation instructions]
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

- Invalid cron: display error with valid format hint
- Ambiguous NL: present multiple options
- Interval < 5 min: warn about excessive frequency
- No workflow name with --list: OK (list doesn't need one)
- Already scheduled: update existing schedule

## Usage Examples

```
/founder-os:workflow:schedule morning-routine --cron="0 9 * * 1-5"
/founder-os:workflow:schedule weekly-review --natural="every Friday at 5pm" --persistent
/founder-os:workflow:schedule client-onboarding --disable
/founder-os:workflow:schedule --list
/founder-os:workflow:schedule morning-routine --timezone=Europe/London
```
