---
description: Execute a YAML-defined workflow by running all steps in dependency order
argument-hint: "[workflow-name] [--from=step-id] [--dry-run] [--output=chat|notion|both]"
allowed-tools: ["Read", "Write"]
execution-mode: background
result-format: summary
---

# /founder-os:workflow:run

Execute a workflow YAML file by parsing its steps, resolving the dependency DAG, and running each step's command in order with context passing between steps.

## Load Skills

Read all three skills before starting:

1. `${CLAUDE_PLUGIN_ROOT}/skills/workflow/workflow-design/SKILL.md`
2. `${CLAUDE_PLUGIN_ROOT}/skills/workflow/workflow-execution/SKILL.md`
3. `${CLAUDE_PLUGIN_ROOT}/skills/workflow/workflow-scheduling/SKILL.md`

## Parse Arguments

Extract from `$ARGUMENTS`:

- **workflow-name** (required positional) — name of the workflow to run (matches filename in `workflows/` without .yaml extension). If not provided, list available workflows in `workflows/` and ask the user to choose.
- `--from=step-id` (optional) — resume execution from this step, skipping all prior steps
- `--dry-run` (optional) — validate and show execution plan without running any steps
- `--output=chat|notion|both` (optional) — override the workflow's defaults.output_format

If `$ARGUMENTS` is empty, list workflow files found in `workflows/` directory and prompt for selection.

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
- Command: `workflow-run`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'workflow-automator' OR plugin IS NULL) AND (command = 'workflow-run' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Step 1: Locate Workflow File

Search for `workflows/[workflow-name].yaml`. If not found, search case-insensitively. If still not found:

```
❌ Workflow '[name]' not found.
Available workflows:
  - morning-routine
  - weekly-review
  - client-onboarding
Use: /founder-os:workflow:run [name]
```

## Step 2: Parse YAML

Read and parse the workflow YAML file. If YAML parsing fails, display the parse error with line number and stop.

## Step 3: Validate

Run all 14 validation rules from the workflow-design skill (read `${CLAUDE_PLUGIN_ROOT}/skills/workflow/workflow-design/references/validation-rules.md`). Collect all violations. If any errors (not warnings) exist, display all violations and stop. Warnings are displayed but do not block execution.

## Step 4: Resolve DAG

Apply Kahn's topological sort to determine step execution order (read `${CLAUDE_PLUGIN_ROOT}/skills/workflow/workflow-design/references/dag-resolution.md`). Identify parallel batches for display.

## Step 5: Handle --dry-run

If `--dry-run` is set, display the execution plan and stop:

```
Workflow: [name] v[version]
Execution Plan (dry run):
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Batch 1 (parallel):
  [1] step-id-1: "Step Name" → /command
  [2] step-id-2: "Step Name" → /command

Batch 2:
  [3] step-id-3: "Step Name" → /command (depends on: step-id-1, step-id-2)

Batch 3:
  [4] step-id-4: "Step Name" → /command (depends on: step-id-3)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: [N] steps in [M] batches
Estimated time: ~[N*default_timeout]s max
```

Do not execute any steps.

## Step 6: Handle --from (Resume)

If `--from=step-id` is set:
1. Verify the step-id exists in the workflow
2. Determine all steps before this step in topological order
3. Skip those steps during execution
4. If a Notion execution log exists from a previous run of this workflow, attempt to restore context values for previously completed steps
5. Display: "Resuming from step '[step-id]'. Skipping [N] prior steps."

## Step 7: Execute Steps

Follow the step execution protocol from workflow-execution skill:

1. Initialize fresh context with reserved keys (workflow_name, workflow_version, run_id as UUID, run_timestamp)
2. Display workflow header:
   ```
   Workflow: [name] v[version]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```
3. For each step in topological order:
   a. Check if step should be skipped (upstream failure or --from)
   b. Evaluate condition (if present)
   c. Apply context substitution to args
   d. Display: `[Step N/M] Running: step-name...`
   e. Invoke the command with args
   f. Capture output, store in context under output_as
   g. Display result: `✓ (Ns)` or `✗ Failed (reason)` or `⊘ Skipped (reason)`
   h. On failure, apply error handling rules from `${CLAUDE_PLUGIN_ROOT}/skills/workflow/workflow-execution/references/error-handling.md`

## Step 8: Display Summary

After all steps complete:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result: [COMPLETED|FAILED|PARTIAL] ([N/M] steps)
  Completed: N ✓
  Failed: N ✗
  Skipped: N ⊘
Duration: [total time]
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If any steps failed, add suggestion:
```
💡 Resume from failure: /founder-os:workflow:run [name] --from=[failed-step-id]
```

## Step 9: Log to Notion

If Notion is available, log the execution to the "[FOS] Workflows" DB with Type="Execution", following the execution logging protocol in workflow-execution skill. Use the database discovery sequence: search for "[FOS] Workflows" first, try "Founder OS HQ - Workflows", fall back to "Workflow Automator - Executions". Do NOT create the database if none is found — skip logging silently. If Notion is unavailable, skip silently.

When logging to [FOS] Workflows, populate the Company relation if the workflow is scoped to a specific client.

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

- **Workflow file not found**: List available workflows, suggest correct name
- **YAML parse error**: Show error with line number, stop
- **Validation errors**: Display all errors at once, stop
- **Step failure**: Follow error handling decision tree
- **Notion unavailable**: Skip execution logging, warn once
- **No workflows directory**: Create it and inform user: "No workflows found. Create a workflow file in `workflows/` or use /founder-os:workflow:create."

## Usage Examples

```
/founder-os:workflow:run morning-routine
/founder-os:workflow:run weekly-review --dry-run
/founder-os:workflow:run client-onboarding --from=health-check
/founder-os:workflow:run morning-routine --output=notion
```
