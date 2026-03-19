# Workflows

## Overview

A workflow chains multiple Founder OS commands into a single automated pipeline. Instead of running `/founder-os:inbox:triage`, then `/founder-os:briefing:briefing`, then `/founder-os:morning:sync` one at a time every morning, you define a workflow that runs all three in sequence with a single command.

Workflows are YAML files stored in the `workflows/` directory. Each file defines metadata, optional scheduling, default settings, and an ordered set of steps that form a directed acyclic graph (DAG). The workflow engine resolves step dependencies, passes context between steps, and executes the pipeline in the correct order.

This guide covers creating, running, scheduling, and documenting workflows.

---

## Workflow YAML Structure

Every workflow file has four top-level blocks:

### workflow (required)

Identity and metadata for the pipeline.

```yaml
workflow:
  name: morning-routine
  description: "Weekday morning check-in: triage inbox, build briefing, sync all sources"
  version: "1.0.0"
  tags: [morning, daily, email, briefing]
```

- **name** -- Kebab-case, must match the filename (without `.yaml`)
- **description** -- One or two sentences describing the pipeline's purpose
- **version** -- Semantic version; increment on structural changes
- **tags** -- Lowercase strings for filtering and categorization

### schedule (optional)

Defines recurring execution. Omit this block entirely for on-demand-only workflows.

```yaml
schedule:
  enabled: true
  cron: "0 9 * * 1-5"
  timezone: "America/New_York"
```

- **enabled** -- Set to `true` to activate. The schedule is ignored when `false`.
- **cron** -- Standard five-field cron expression (minute, hour, day-of-month, month, day-of-week)
- **timezone** -- IANA timezone string. Defaults to UTC when omitted.

### defaults

Pipeline-wide settings applied to every step unless overridden.

```yaml
defaults:
  stop_on_error: true
  timeout_seconds: 300
  output_format: chat
```

- **stop_on_error** -- Halt the entire pipeline when any step fails (default: `true`)
- **timeout_seconds** -- Maximum wall-clock seconds per step (default: 300)
- **output_format** -- Where results are written: `chat`, `notion`, or `both`

### steps (required)

An ordered list of pipeline steps. Each step specifies a Founder OS command and its configuration:

```yaml
steps:
  - id: triage
    name: "Triage inbox"
    command: "/founder-os:inbox:triage"
    args:
      hours: "8"
      max: "50"
    output_as: triage_results

  - id: briefing
    name: "Build daily briefing"
    command: "/founder-os:briefing:briefing"
    depends_on: [triage]
    output_as: briefing_output

  - id: sync
    name: "Morning sync"
    command: "/founder-os:morning:sync"
    depends_on: [triage]
    output_as: sync_output
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique kebab-case identifier within this workflow |
| `name` | Yes | Human-readable label |
| `command` | Yes | The slash command to execute |
| `args` | No | Key-value pairs passed as command arguments |
| `depends_on` | No | Step IDs that must complete before this step runs |
| `continue_on_error` | No | Override `stop_on_error` for this step |
| `output_as` | No | Context key to store this step's output for downstream steps |
| `timeout_seconds` | No | Per-step timeout override |
| `condition` | No | Expression evaluated at runtime; skip when false |

### Context Passing Between Steps

Steps can reference the output of earlier steps using the `{{context.key}}` substitution pattern. When a step sets `output_as: triage_results`, downstream steps can reference `{{context.triage_results}}` in their `args` values. Context values are strings, truncated to 500 characters.

---

## Creating a Workflow

Use the `create` command to build a new workflow interactively or from a template.

```
/founder-os:workflow:create morning-routine
/founder-os:workflow:create weekly-review --from-template
/founder-os:workflow:create client-onboarding --steps=5
```

**Interactive mode** (the default) walks you through each decision:

1. Name the workflow (kebab-case)
2. Describe what it does
3. List the Founder OS commands it should run, in order
4. Specify arguments for each command
5. Choose sequential or parallel execution where possible
6. Optionally set a schedule

**Template mode** (`--from-template`) copies the template scaffold at `templates/workflow-template.yaml` and replaces placeholder values with your workflow name. This is faster when you want to hand-edit the YAML directly.

The command validates the generated YAML against all 14 validation rules (no cycles, valid commands, correct schema) before saving to `workflows/<name>.yaml`.

After creation, you will see a confirmation with your next steps:

```
Workflow created: workflows/morning-routine.yaml

morning-routine -- "Weekday morning check-in pipeline"
   Steps: 3
   Schedule: None

Use /founder-os:workflow:run morning-routine to execute
Use /founder-os:workflow:run morning-routine --dry-run to preview
Use /founder-os:workflow:edit morning-routine to modify
```

---

## Running a Workflow

Execute a workflow with the `run` command:

```
/founder-os:workflow:run morning-routine
```

The execution engine follows a five-phase process:

1. **Locate and parse** -- Finds the YAML file in `workflows/` and parses it
2. **Validate** -- Runs all 14 validation rules
3. **Resolve DAG** -- Applies topological sort to determine step execution order and identifies parallel batches
4. **Execute steps** -- Runs each step in order, passing context between them
5. **Log to Notion** -- Records the execution to the `[FOS] Workflows` database with `Type = "Execution"`

### Dry Run

Preview the execution plan without running any steps:

```
/founder-os:workflow:run morning-routine --dry-run
```

This shows the execution order, parallel batches, and estimated time:

```
Workflow: morning-routine v1.0.0
Execution Plan (dry run):

Batch 1 (parallel):
  [1] triage: "Triage inbox" -> /founder-os:inbox:triage

Batch 2 (parallel):
  [2] briefing: "Build daily briefing" -> /founder-os:briefing:briefing (depends on: triage)
  [3] sync: "Morning sync" -> /founder-os:morning:sync (depends on: triage)

Total: 3 steps in 2 batches
```

### Resume from Failure

If a workflow fails partway through, resume from the failed step:

```
/founder-os:workflow:run morning-routine --from=briefing
```

This skips all steps before `briefing` and picks up where the pipeline stopped. If a previous Notion execution log exists, context values from completed steps are restored.

### Output Control

Override where results are written:

```
/founder-os:workflow:run morning-routine --output=notion
```

Options: `chat` (display in terminal), `notion` (write to Notion only), `both`.

### Execution Report

After all steps complete, you see a summary:

```
Result: COMPLETED (3/3 steps)
  Completed: 3
  Failed: 0
  Skipped: 0
Duration: 42s
```

If any steps failed, the report includes a resume hint:

```
Resume from failure: /founder-os:workflow:run morning-routine --from=briefing
```

---

## Scheduling Workflows

Set up recurring execution with the `schedule` command.

### Using Cron Expressions

```
/founder-os:workflow:schedule morning-routine --cron="0 9 * * 1-5"
```

This schedules the workflow for 9:00 AM, Monday through Friday.

### Using Natural Language

```
/founder-os:workflow:schedule weekly-review --natural="every Friday at 5pm"
```

The system converts your description to a cron expression and asks you to confirm the interpretation before saving.

### Session vs. Persistent Scheduling

By default, schedules are **session-level** -- they run as long as your current Claude Code session is active. When the session ends, the schedule stops.

For schedules that survive session restarts, use `--persistent`:

```
/founder-os:workflow:schedule morning-routine --cron="0 9 * * 1-5" --persistent
```

This generates a runner script at `workflows/runners/morning-routine-runner.sh` and provides crontab installation instructions. You install the cron job yourself -- Founder OS never modifies your system crontab directly.

### Managing Schedules

List all scheduled workflows:

```
/founder-os:workflow:schedule --list
```

Output:

```
Scheduled Workflows
  morning-routine    0 9 * * 1-5    Weekdays at 9:00 AM     (session)
  weekly-review      0 17 * * 5    Fridays at 5:00 PM       (persistent)

Total: 2 scheduled workflows
```

Disable a schedule:

```
/founder-os:workflow:schedule morning-routine --disable
```

Set a timezone:

```
/founder-os:workflow:schedule morning-routine --timezone=Europe/London
```

---

## Documenting Workflows as SOPs

Once a workflow is running reliably, turn it into a formal Standard Operating Procedure with the `document` command from the `workflow-doc` namespace:

```
/founder-os:workflow-doc:document "Weekday morning routine: triage inbox, build briefing, sync sources"
```

This command runs a four-phase pipeline:

1. **Input loading** -- Parses your description and extracts steps, tools, decision points, handoffs, and complexity tier
2. **Document generation** -- Produces a structured SOP with seven sections plus a Mermaid flowchart diagram
3. **File output** -- Saves the SOP to `sops/sop-<workflow-slug>-<date>.md`
4. **Notion integration** -- Creates or updates a record in the `[FOS] Workflows` database with `Type = "SOP"`

You can also document from a file:

```
/founder-os:workflow-doc:document --file=processes/client-onboarding.md
```

Or control where the output goes:

```
/founder-os:workflow-doc:document "Invoice approval process" --format=file --output=hr/invoice-sop.md
```

The generated SOP includes a Mermaid flowchart that visualizes the workflow's steps, decision points, and handoffs in a diagram you can render in Notion, GitHub, or any Mermaid-compatible viewer.

---

## Example: Morning Automation Workflow

Here is a complete workflow YAML for a weekday morning routine that triages email, builds a briefing, and syncs morning data sources -- all before your first meeting.

```yaml
workflow:
  name: morning-routine
  description: "Weekday morning check-in: triage inbox, build briefing, sync all sources"
  version: "1.0.0"
  tags: [morning, daily, email, briefing]

schedule:
  enabled: true
  cron: "0 9 * * 1-5"
  timezone: "America/New_York"

defaults:
  stop_on_error: false
  timeout_seconds: 300
  output_format: both

steps:
  - id: triage
    name: "Triage inbox"
    command: "/founder-os:inbox:triage"
    args:
      hours: "12"
      max: "50"
    output_as: triage_results

  - id: briefing
    name: "Build daily briefing"
    command: "/founder-os:briefing:briefing"
    depends_on: [triage]
    output_as: briefing_output

  - id: sync
    name: "Morning sync"
    command: "/founder-os:morning:sync"
    depends_on: [triage]
    output_as: sync_output

  - id: followup
    name: "Check follow-ups"
    command: "/founder-os:followup:check"
    depends_on: [triage]
    continue_on_error: true
    output_as: followup_results
```

**How this runs:**

1. **Batch 1**: The `triage` step runs first (no dependencies). It processes the last 12 hours of email and stores results in `triage_results`.
2. **Batch 2**: Three steps run in parallel -- `briefing`, `sync`, and `followup` -- since all three depend only on `triage` and not on each other.
3. The `followup` step has `continue_on_error: true`, so if the follow-up check fails (perhaps Notion is temporarily unreachable), the workflow still reports success for the other steps.
4. Results are written to both the chat session and the `[FOS] Workflows` Notion database.

**To set this up:**

```
/founder-os:workflow:create morning-routine
/founder-os:workflow:run morning-routine --dry-run
/founder-os:workflow:run morning-routine
/founder-os:workflow:schedule morning-routine --cron="0 9 * * 1-5"
```

### Other Workflow Commands

Two additional commands help manage your workflows:

- **`/founder-os:workflow:list`** -- Shows all workflow files with step counts and schedule status
- **`/founder-os:workflow:status`** -- Shows execution history and recent run results
- **`/founder-os:workflow:edit`** -- Opens an existing workflow for modification

```
/founder-os:workflow:list
/founder-os:workflow:list --scheduled
/founder-os:workflow:list --verbose
```

---

## Tips for Effective Workflows

**Start small.** Begin with two or three commands and add steps once you confirm the basics work. Use `--dry-run` to preview before executing.

**Use `continue_on_error` for non-critical steps.** If a step enhances the workflow but is not essential (like checking follow-ups), let it fail gracefully so the rest of the pipeline completes.

**Set `stop_on_error: false` at the defaults level** for workflows where partial results are still valuable. Set it to `true` for workflows where every step depends on the accuracy of the previous one.

**Leverage context passing.** When a downstream step can use the output of an earlier step, set `output_as` on the producer and reference `{{context.key}}` in the consumer's args. This avoids redundant API calls and keeps the pipeline coherent.

**Document your workflows.** After a workflow has been running for a week or two, use `/founder-os:workflow-doc:document` to generate an SOP. This gives you a permanent record of the process, complete with a visual diagram, that you can share with your team or reference when onboarding.
