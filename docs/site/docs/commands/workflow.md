# Workflow

> Chain any Founder OS commands into repeatable, schedulable multi-step pipelines -- defined in YAML, executed in dependency order.

## Overview

The Workflow namespace turns ad-hoc command sequences into formalized, repeatable automations. You define workflows as YAML files with named steps, each step invoking a Founder OS command with specific arguments. Steps can run sequentially or in parallel based on dependency declarations, and context flows between steps so downstream commands can use upstream outputs.

Think of it as cron meets CI/CD for your founder operations. A "morning routine" workflow might triage your inbox, pull calendar events, generate a daily briefing, and check follow-ups -- all triggered with a single command. When something fails, the error handling system either retries, skips, or stops based on your configuration, and you can resume from the failure point.

Scheduling supports both session-level timers (active while Claude Code is open) and persistent OS-level cron jobs for truly hands-off automation.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Filesystem MCP | Yes | Reads and writes workflow YAML files |
| Notion CLI | Optional | Logs execution history to the Workflows database |

## Commands

### `/founder-os:workflow:create`

**What it does** -- Creates a new workflow YAML file through an interactive builder or from a template scaffold. You specify the name, description, and steps (each mapped to a Founder OS command), and the system generates a validated YAML file with proper dependency declarations and defaults.

**Usage:**

```
/founder-os:workflow:create [workflow-name] [--steps=N] [--from-template]
```

**Example scenario:**

> You find yourself running the same three commands every Monday morning: inbox triage, daily briefing, and follow-up check. You create a "monday-morning" workflow, add those three steps sequentially, and now your entire Monday kickoff is a single command.

**What you get back:**

- Validated workflow YAML file in the `workflows/` directory
- Step count, schedule info, and run/dry-run commands

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--steps=N` | `2` | Pre-create N placeholder steps |
| `--from-template` | -- | Copy from the template scaffold |

---

### `/founder-os:workflow:edit`

**What it does** -- Modifies an existing workflow's steps, schedule, or configuration. Add new steps interactively, remove steps by ID (with dependency warnings), update the cron schedule using natural language or cron syntax, or disable scheduling entirely.

**Usage:**

```
/founder-os:workflow:edit [workflow-name] [--add-step] [--remove-step=ID] [--schedule=CRON] [--disable-schedule]
```

**Example scenario:**

> Your morning routine workflow has been working great, but you want to add a CRM sync step after the inbox triage. You run edit with `--add-step`, specify the CRM sync command and its dependency on the triage step, and the workflow is updated with proper DAG ordering.

**What you get back:**

- Change summary showing added, removed, or modified elements
- Re-validated workflow with dry-run command

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--add-step` | -- | Interactive step builder |
| `--remove-step=ID` | -- | Remove a step by its ID |
| `--schedule=CRON` | -- | Set/update schedule (cron or natural language) |
| `--disable-schedule` | -- | Turn off scheduling |

---

### `/founder-os:workflow:list`

**What it does** -- Lists all workflow YAML files in your `workflows/` directory with their description, step count, and scheduling status. Use `--verbose` for full details including step lists and dependency graphs.

**Usage:**

```
/founder-os:workflow:list [--scheduled] [--verbose]
```

**Example scenario:**

> You've created several workflows over the past month and want to see which ones are actively scheduled. You run `list --scheduled` and see two workflows running on cron: morning-routine (weekdays 9 AM) and weekly-review (Fridays 5 PM).

**What you get back:**

- Compact table of all workflows with name, description, step count, and schedule status
- Verbose mode adds version, tags, and full step listings

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--scheduled` | -- | Show only workflows with active schedules |
| `--verbose` | -- | Include full details per workflow |

---

### `/founder-os:workflow:run`

**What it does** -- Executes a workflow by parsing its YAML, resolving the step dependency graph (DAG), and running each step's command in topological order. Context flows between steps via output variables. Supports dry-run mode to preview the execution plan without running anything, and resume mode to pick up from a failed step.

**Usage:**

```
/founder-os:workflow:run [workflow-name] [--from=step-id] [--dry-run] [--output=chat|notion|both]
```

**Example scenario:**

> Your morning-routine workflow has 4 steps. You run it and see each step execute in sequence: inbox triage completes in 45 seconds, briefing generation in 30 seconds, follow-up check in 20 seconds, and CRM sync in 15 seconds. Total: 1 minute 50 seconds, all four steps completed.

**What you get back:**

- Real-time progress display per step with timing
- Final summary: completed/failed/skipped counts and total duration
- Execution log saved to Notion (if available)
- Resume command if any step fails

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--from=step-id` | -- | Resume from a specific step |
| `--dry-run` | -- | Preview execution plan without running steps |
| `--output` | Workflow default | `chat`, `notion`, or `both` |

---

### `/founder-os:workflow:schedule`

**What it does** -- Configures recurring execution of a workflow via session-level timers or persistent OS cron jobs. Accepts natural language scheduling ("every weekday at 9am") or standard cron expressions. Displays the next 3 scheduled run times for verification.

**Usage:**

```
/founder-os:workflow:schedule [workflow-name] [--cron=EXPR] [--natural=DESC] [--persistent] [--disable] [--list]
```

**Example scenario:**

> You want your morning routine to run automatically every weekday. You run `schedule morning-routine --natural="every weekday at 9am" --persistent`, which generates an OS-level cron job and shows you the installation instructions and next three run times.

**What you get back:**

- Cron expression with human-readable description
- Next 3 scheduled run times
- For persistent mode: runner script and crontab installation instructions

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--cron=EXPR` | -- | 5-field cron expression |
| `--natural=DESC` | -- | Natural language schedule description |
| `--persistent` | -- | Generate OS-level cron job |
| `--disable` | -- | Disable scheduling for this workflow |
| `--list` | -- | List all scheduled workflows |
| `--timezone=TZ` | System local | IANA timezone for schedule |

---

### `/founder-os:workflow:status`

**What it does** -- Displays execution history for your workflows, pulled from the Notion execution log. Filter by workflow name, status (completed, failed, partial), or limit the number of results. Purely read-only.

**Usage:**

```
/founder-os:workflow:status [workflow-name] [--last=N] [--status=completed|failed|partial]
```

**Example scenario:**

> Your weekly-review workflow failed yesterday and you want to see what happened. You run `status weekly-review --last=3` and see the last three executions: two completed successfully, one failed at the "generate-briefing" step after 1 minute 45 seconds.

**What you get back:**

- Execution history table with timestamps, step counts, duration, and outcome
- Filter summary and pagination hint

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `workflow-name` | All workflows | Filter by specific workflow |
| `--last=N` | `5` | Number of recent executions to show |
| `--status` | All | Filter: `completed`, `failed`, `partial`, `running` |

---

## Tips & Patterns

- **Start with dry-run.** Always preview a new workflow with `--dry-run` before running it live. This shows you the execution plan, parallel batches, and estimated time.
- **Use dependencies for parallel speedups.** If two steps don't depend on each other, declare them without dependencies and they'll run in parallel batches.
- **Schedule your routines.** The biggest ROI comes from workflows that run on a schedule. Your morning routine, weekly review, and follow-up checks are prime candidates.
- **Resume on failure.** When a step fails, fix the underlying issue and use `--from=step-id` to resume without re-running completed steps.

## Related Namespaces

- **[Workflow Doc](/commands/workflow-doc)** -- Generate SOPs and flowcharts from your workflow definitions
- **[Savings](/commands/savings)** -- Measure the time saved by your automated workflows
- **[Intel](/commands/intel)** -- The intelligence engine learns from your workflow patterns over time
