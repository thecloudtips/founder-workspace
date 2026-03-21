---
description: List available workflow files and their metadata
argument-hint: "[--scheduled] [--verbose]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:workflow:list

List all workflow YAML files in the `workflows/` directory with their metadata.

## Load Skills

Read: `skills/workflow/workflow-design/SKILL.md`

## Parse Arguments

- `--scheduled` (optional) — show only workflows with schedule.enabled=true
- `--verbose` (optional) — show full details including step count, dependencies, and schedule info

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
- Command: `workflow-list`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'workflow-automator' OR plugin IS NULL) AND (command = 'workflow-list' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

1. **Scan Directory**: List all `.yaml` files in the `workflows/` directory (exclude `workflows/examples/` and `workflows/runners/`).

2. **Parse Metadata**: For each file, parse YAML and extract: workflow.name, workflow.description, workflow.version, workflow.tags, step count, schedule.enabled, schedule.cron.

3. **Filter**: If `--scheduled`, include only workflows where schedule.enabled=true.

4. **Display List**:

Default format:
```
Available Workflows
━━━━━━━━━━━━━━━━━━
  morning-routine     "Weekday morning check-in pipeline"      (4 steps)
  weekly-review       "End-of-week review and planning"         (6 steps)
  client-onboarding   "New client setup with CRM sync"          (5 steps, scheduled)
━━━━━━━━━━━━━━━━━━
Total: 3 workflows

Use /founder-os:workflow:run [name] to execute
```

Verbose format (--verbose): Add version, tags, schedule details, and step list for each workflow.

5. **Empty State**: If no workflows found:
```
No workflows found in workflows/ directory.
Create one with /founder-os:workflow:create or copy the template from templates/workflow-template.yaml
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

## Usage Examples

```
/founder-os:workflow:list
/founder-os:workflow:list --scheduled
/founder-os:workflow:list --verbose
```
