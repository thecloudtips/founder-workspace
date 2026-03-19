# Custom Namespaces

## Overview

Every capability in Founder OS lives inside a namespace. The `inbox` namespace handles email triage. The `report` namespace generates business reports. The `briefing` namespace builds your daily briefing. If you need Founder OS to do something it does not already do, you create a new namespace.

A namespace is a directory-based grouping of up to three component types: **commands** (the slash commands users run), **skills** (the domain knowledge that informs those commands), and **agents** (the AI team members that handle complex multi-step work). You do not need all three for every namespace. Many namespaces consist of commands and skills only. Agent teams are reserved for pipelines and parallel-gathering patterns where multiple specialized agents coordinate on a single task.

This guide walks through the file formats, conventions, and testing steps to add your own namespace to Founder OS.

---

## Directory Structure

All namespace files live under the plugin root directory. The three component types each have their own top-level folder:

```
commands/
  <namespace>/
    <action>.md              # One file per slash command

skills/
  <namespace>/
    <skill-name>/
      SKILL.md               # One SKILL.md per skill topic
      references/            # Optional: supporting reference docs
        <reference>.md

agents/
  <namespace>/
    config.json              # Team configuration and orchestration
    <agent-name>.md          # One markdown file per agent
```

A minimal namespace needs only one command file. For example, a namespace called `checklist` with a single `run` action would be:

```
commands/checklist/run.md
```

This registers the slash command `/founder-os:checklist:run`.

---

## Command File Format

Every command file is a markdown document with YAML frontmatter at the top. The frontmatter tells Founder OS how to register and execute the command. The markdown body contains the full instructions for what the command does.

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `description` | Yes | One-line summary shown in help menus |
| `argument-hint` | Yes | Example arguments displayed to the user |
| `allowed-tools` | Yes | Tools the command is permitted to use |
| `execution-mode` | Yes | `background` (delegated to subagent) or `foreground` (inline) |
| `result-format` | Yes | `summary` (500-1500 tokens) or `full` (complete output) |

### Example: A Real Command File

Here is the frontmatter from the inbox triage command at `commands/inbox/triage.md`:

```yaml
---
description: Triage your inbox with AI categorization and prioritization
argument-hint: --team --hours=24 --max=100
allowed-tools: Read, Glob, Grep, Bash, Task
execution-mode: background
result-format: summary
---
```

After the frontmatter, the markdown body defines:

1. **Heading** -- Always formatted as `# /founder-os:<namespace>:<action>`
2. **Parse Arguments** -- A section listing the flags the command accepts
3. **Business Context** -- A standard block that checks `_infrastructure/context/active/` for personalization files
4. **Preflight Check** -- Validates that required external tools are available
5. **Memory Context** -- Injects relevant memories from previous executions
6. **Steps** -- The actual logic of the command, described in numbered steps
7. **Output Format** -- What the user sees when the command finishes
8. **Error Handling** -- Graceful degradation rules
9. **Usage Examples** -- Concrete invocations at the bottom

### Execution Modes

Most commands use `execution-mode: background`, which means the dispatcher spawns them as a background subagent. The user's main session stays free to accept new input while the command runs. Only three commands across all of Founder OS use `foreground` mode -- interactive wizards where the command needs to ask questions mid-execution.

If you are building a command that runs autonomously and produces a report at the end, use `background`. If your command needs a back-and-forth conversation with the user, use `foreground`.

### Writing the Command Body

The body follows a consistent pattern across all namespaces. Here is a skeleton you can copy:

```markdown
---
description: Your command description here
argument-hint: "[required-arg] [--optional-flag]"
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# /founder-os:<namespace>:<action>

Brief description of what this command does.

## Parse Arguments

- **required-arg** (positional) -- Description
- `--optional-flag` (optional) -- Description

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`.
If found, read and use for personalization. If not, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `<namespace>` namespace.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for relevant memories and incorporate them.

## Steps

1. Your first step
2. Your second step
3. Your third step

## Output Format

Describe what the user sees.

## Error Handling

- If [tool] is unavailable: warn and continue
- If [input] is missing: prompt the user

## Usage Examples

/founder-os:<namespace>:<action> example-arg
/founder-os:<namespace>:<action> --optional-flag
```

---

## Skill File Format

Skills are the domain knowledge layer. While commands define *what* to do, skills define *how* to think about it. A skill file teaches the AI the rules, heuristics, classification systems, and edge cases it needs to execute a command well.

Each skill lives in its own subdirectory under `skills/<namespace>/`, with a `SKILL.md` file as the main entry point.

### SKILL.md Structure

A skill file has YAML frontmatter followed by the domain knowledge in markdown:

```yaml
---
name: Email Triage
description: "Email classification and routing for inbox management.
  Use this whenever the user mentions email triage, sorting inbox,
  prioritizing messages, categorizing emails, or dealing with
  email overload."
globs:
  - "teams/agents/triage-agent.md"
  - "teams/agents/archive-agent.md"
---
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Human-readable skill name |
| `description` | Yes | When to activate this skill -- include trigger phrases and synonyms |
| `globs` | No | File patterns this skill is relevant to (used for auto-activation) |

The `description` field is important for discoverability. Write it so that the system can match it against user requests. Include the obvious trigger phrases ("email triage") and the non-obvious ones ("dealing with email overload") so the skill activates when needed.

### Skill Body Content

After the frontmatter, write the domain knowledge in structured markdown. Effective skills include:

- **Overview** -- What the skill covers and how it fits into the namespace
- **Rules and heuristics** -- Concrete classification criteria, scoring rubrics, decision trees
- **Edge cases** -- How to handle ambiguous or conflicting inputs
- **Output format** -- The expected structure of results produced using this skill

For example, the email triage skill at `skills/inbox/email-triage/SKILL.md` defines five email categories, detection heuristics for each, VIP handling rules, the `needs_response` and `archivable` flag logic, and edge case resolution order.

### Supporting References

For complex skills, break supplementary material into a `references/` subdirectory:

```
skills/workflow/workflow-design/
  SKILL.md
  references/
    yaml-schema.md
    dag-resolution.md
    validation-rules.md
```

The main `SKILL.md` references these files by path. This keeps the primary skill document focused while allowing detailed specifications to live alongside it.

---

## Agent Team Setup

Agent teams are optional. You need them when a single command benefits from multiple specialized AI agents working together -- for example, an inbox pipeline where one agent triages, another extracts action items, a third drafts replies, and a fourth recommends archiving.

### config.json

Every agent namespace has a `config.json` at `agents/<namespace>/config.json` that defines the team pattern and agent roster:

```json
{
  "pattern": "pipeline",
  "description": "Inbox Zero Commander: Sequential email processing",
  "execution": "sequential",
  "agents": [
    {
      "name": "triage-agent",
      "role": "Categorize and prioritize incoming emails",
      "file": "agents/triage-agent.md",
      "order": 1,
      "tools": ["Bash"]
    },
    {
      "name": "action-agent",
      "role": "Extract action items from prioritized emails",
      "file": "agents/action-agent.md",
      "order": 2,
      "tools": ["Bash"]
    }
  ],
  "coordination": {
    "handoff": "output_of_previous_is_input_of_next",
    "data_format": "structured_json",
    "error_handling": "stop_pipeline_on_failure",
    "timeout_per_agent": "60s",
    "retry_on_failure": false
  },
  "observability": {
    "log_handoffs": true,
    "log_agent_output": true,
    "report_timing": true
  }
}
```

Founder OS supports four team patterns:

| Pattern | Use When | Examples |
|---------|----------|---------|
| Pipeline | Steps must happen in strict sequence | Inbox (triage, extract, draft, archive) |
| Parallel Gathering | Multiple agents fetch data simultaneously, one lead merges | Daily Briefing, Client Context |
| Pipeline + Batch | Pipeline per item, batch across items | Invoice Processor |
| Competing Hypotheses | Multiple agents propose solutions, one lead synthesizes | SOW Generator |

### Agent Markdown Files

Each agent in the team gets its own markdown file at `agents/<namespace>/<agent-name>.md`. The frontmatter defines the agent's identity:

```yaml
---
name: triage-agent
description: |
  Use this agent when the inbox triage pipeline is activated
  with --team mode, as step 1 of 4.

  <example>
  Context: User runs /inbox:triage --team
  user: "/inbox:triage --team --hours=24"
  assistant: "Starting the pipeline. Launching triage-agent."
  </example>

model: inherit
color: cyan
tools: ["Read", "Grep", "Glob"]
---
```

After the frontmatter, write the agent's instructions in markdown: what it reads, what it processes, what format it produces, and how it passes data to the next agent in the team.

---

## Conventions to Follow

These conventions apply across all namespaces. Following them ensures your namespace works correctly with the rest of the ecosystem.

### Naming

- **Namespace names**: lowercase, single-word or kebab-case (`inbox`, `workflow-doc`)
- **Command filenames**: action name in kebab-case (`triage.md`, `from-brief.md`)
- **Skill directories**: kebab-case descriptive name (`email-triage/`, `priority-scoring/`)
- **Agent files**: `<role>-agent.md` (`triage-agent.md`, `response-agent.md`)
- **Slash commands**: `/founder-os:<namespace>:<action>` derived from directory structure

### The Type Column

Every write to a shared Notion database must include the correct `Type` value. Founder OS uses consolidated databases where multiple namespaces write to the same table. The `Type` column distinguishes records:

| Database | Type Values |
|----------|-------------|
| Tasks | Email Task, Action Item, Follow-Up |
| Briefings | Daily Briefing, Weekly Review, Slack Digest, Morning Sync |
| Content | Email Draft, Newsletter, LinkedIn Post |
| Finance | Invoice, Expense |
| Research | Newsletter Research, Competitive Analysis, Scout Discovery |

When your namespace writes to a shared database, define a unique Type value and document it in your command.

### HQ Database Discovery

When a command writes to Notion, use the three-step database discovery sequence:

1. Search for `[FOS] <Database Name>` (the current HQ naming convention)
2. Fall back to `Founder OS HQ - <Database Name>` (legacy HQ name)
3. Fall back to the plugin-specific legacy name (backward compatibility)

Never create a database if none is found. Warn and continue without Notion persistence.

### File Path Portability

Always use `${CLAUDE_PLUGIN_ROOT}` for file paths in your command and skill markdown. This variable resolves to the correct plugin root directory regardless of where the user has installed Founder OS.

### Graceful Degradation

Optional MCP tools (Notion, Slack, web search) may not be installed. When an optional tool is unavailable, your command should:

- Skip the step that depends on it
- Note the degradation once (not per-item)
- Never halt execution for an optional dependency

---

## Testing Your Namespace

Before considering your namespace complete, verify these checkpoints:

1. **Command discovery** -- Run your slash command and confirm it is recognized. The command path must match the naming convention (`commands/<namespace>/<action>.md`) for the plugin to discover it.

2. **Argument parsing** -- Test with no arguments, with all arguments, and with invalid arguments. Confirm the command prompts for missing required inputs and ignores unknown flags gracefully.

3. **Preflight behavior** -- Test with required tools missing. Confirm the command blocks with clear fix instructions. Test with optional tools missing. Confirm the command warns and continues.

4. **Memory injection** -- Run the command twice with the same context. On the second run, verify that the Memory Engine injects relevant memories from the first run. This validates the observation logging and context injection are wired correctly.

5. **Notion output** (if applicable) -- Confirm the correct `Type` value is written. Confirm the database discovery sequence works for all three naming conventions.

6. **Error scenarios** -- Trigger at least one failure (invalid input, unavailable tool, network timeout). Confirm the error message is actionable and the command does not crash silently.

7. **Dual-mode execution** -- If your command supports `--team`, test both default mode and team mode. Confirm agent handoffs work and the pipeline report includes output from all agents.

Once these pass, your namespace is ready for use. Other namespaces can chain yours into workflows, and the Memory Engine will begin learning from its execution history automatically.
