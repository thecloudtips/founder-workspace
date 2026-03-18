---
description: Create a new workflow YAML file from a template or interactive builder
argument-hint: "[workflow-name] [--steps=N] [--from-template]"
allowed-tools: ["Read", "Write"]
execution-mode: background
result-format: summary
---

# /founder-os:workflow:create

Create a new workflow YAML file interactively or from the template scaffold.

## Load Skills

Read: `${CLAUDE_PLUGIN_ROOT}/skills/workflow/workflow-design/SKILL.md`

## Parse Arguments

- **workflow-name** (optional positional) — kebab-case name for the workflow. If not provided, ask: "What should this workflow be called? Use kebab-case (e.g., morning-routine, client-onboarding)."
- `--steps=N` (optional) — pre-create N placeholder steps (default: 2)
- `--from-template` (optional) — copy from `templates/workflow-template.yaml` with the new name

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
- Command: `workflow-create`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'workflow-automator' OR plugin IS NULL) AND (command = 'workflow-create' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

1. **Get Workflow Name**: Use provided name or prompt. Validate kebab-case format (lowercase, hyphens, no spaces).

2. **Check for Conflicts**: Check if `workflows/[name].yaml` already exists. If so: "Workflow '[name]' already exists. Use /founder-os:workflow:edit to modify it, or choose a different name."

3. **Choose Creation Mode**:
   - If `--from-template`: Copy template, replace placeholder values with workflow name
   - If interactive (default): Guide user through building the workflow

4. **Interactive Builder** (when not --from-template):
   a. Ask for workflow description: "Describe what this workflow does (1-2 sentences):"
   b. Ask for steps: "What Founder OS commands should this workflow run? List them in order (e.g., /founder-os:inbox:triage, /founder-os:briefing:briefing):"
   c. For each command, ask: "Any arguments for [command]? (press Enter to skip)"
   d. Ask about dependencies: "Should steps run sequentially (each depends on the previous) or in parallel where possible?"
   e. Ask about scheduling: "Should this workflow run on a schedule? If so, describe when (e.g., 'every weekday at 9am'):"

5. **Generate YAML**: Build the workflow YAML following the schema from workflow-design skill. Apply defaults for timeout, stop_on_error, etc.

6. **Validate**: Run all 14 validation rules on the generated YAML.

7. **Write File**: Save to `workflows/[name].yaml`. Ensure the `workflows/` directory exists.

8. **Display Confirmation**:
```
Workflow created: workflows/[name].yaml

[name] — "[description]"
   Steps: [N]
   Schedule: [cron expression or "None"]

Use /founder-os:workflow:run [name] to execute
Use /founder-os:workflow:run [name] --dry-run to preview
Use /founder-os:workflow:edit [name] to modify
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

- Name not kebab-case: suggest correction
- File already exists: redirect to /founder-os:workflow:edit
- Empty steps list: create with template defaults (2 placeholder steps)
- Invalid commands in step list: accept them (validation happens at run time)

## Usage Examples

```
/founder-os:workflow:create morning-routine
/founder-os:workflow:create weekly-review --from-template
/founder-os:workflow:create client-onboarding --steps=5
/founder-os:workflow:create
```
