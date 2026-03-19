# [8] Default Subagent Delegation Design

**Date:** 2026-03-12
**Status:** Draft
**Depends on:** [6] Preflight Checks, [3] Intelligence Engine, [2] Memory Engine

## Problem

Every `/founder-os:*` command currently executes inline in the main Claude Code session. A typical command — say `/founder-os:briefing:briefing` — reads the command markdown, loads skills, runs preflight, queries memory, calls 3-8 external tools (Notion, gws, Slack), reasons over the results, and writes a structured output. This easily consumes 15,000-40,000 tokens of context in the main session. After 5-10 commands, the session is sluggish: context is packed with intermediate tool outputs, file contents, and reasoning traces that are no longer relevant.

First user feedback confirms this is the top UX pain point:

1. **Context bloat** — the main session accumulates execution artifacts (API responses, file contents, intermediate reasoning) that crowd out the user's actual conversation history.
2. **Single-threaded blocking** — users wait idle while a 30-second report generates. They cannot ask a quick question, queue another command, or do anything until the current command finishes.
3. **Compounding degradation** — each command makes the next one slower. By command 8-10, response quality drops as the model struggles with a massive context window.

The root cause is architectural: the main session is both the user's conversational interface AND the execution engine. These roles should be separated.

## Solution

Make subagent delegation the default execution pattern for all `/founder-os:*` commands. The main session becomes a thin dispatcher — it parses the user's request, spawns a background subagent with the full command prompt and context, and returns a concise result summary when the agent completes. The main session stays small, fast, and available for new input at all times.

This is not a new capability — Claude Code already supports `run_in_background: true` for Task tool calls. The change is making background delegation the *default* rather than an opt-in pattern reserved for `--team` agent pipelines.

## Architecture

### Execution Flow (Before)

```
User -> Main Session: parse command -> load skill -> preflight -> memory ->
       execute steps (tool calls, reasoning, file I/O) -> format output ->
       display result -> wait for next input
       [All tokens accumulate in main session context]
```

### Execution Flow (After)

```
User -> Main Session: parse command -> spawn background subagent
       [~300-500 tokens in main session]
       Main session is FREE for new input

       Subagent (background): load skill -> preflight -> memory ->
       execute steps (tool calls, reasoning, file I/O) -> format output ->
       return result summary
       [All execution tokens isolated in subagent context]

       Main Session: receive notification -> inject result summary
       [~500-1500 tokens added to main session]
```

### Component 1: Dispatcher Skill

A new infrastructure skill at `_infrastructure/dispatcher/SKILL.md` that standardizes how commands are delegated.

**Dispatcher responsibilities:**

1. Read the command's execution mode metadata (see Component 2)
2. If `background` (default): spawn a Task tool call with `run_in_background: true`
3. If `foreground`: execute inline in the main session (current behavior)
4. Inject into the subagent prompt:
   - The full command markdown content
   - Relevant skill file paths (the subagent reads them itself)
   - User arguments and flags
   - Business context file paths (from `_infrastructure/context/active/`)
   - Any relevant memories (top 5 from memory engine, pre-fetched by dispatcher)
5. When the subagent returns, format and inject the result summary into the main session

**Dispatcher does NOT:**

- Execute any command logic itself
- Read skill files or tool outputs into the main session context
- Retain the subagent's full execution trace

### Component 2: Execution Mode Metadata

Each command markdown file gains a frontmatter field specifying its default execution mode:

```yaml
---
execution-mode: background    # background | foreground
result-format: summary        # summary | full
---
```

- `execution-mode: background` — dispatcher spawns a subagent (default for all commands)
- `execution-mode: foreground` — dispatcher executes inline (interactive/guided commands)
- `result-format: summary` — subagent returns a structured summary (default)
- `result-format: full` — subagent returns complete output (for commands where full output IS the value)

Users can override the default with flags:

- `--foreground` — force inline execution regardless of metadata
- `--background` — force background delegation regardless of metadata

### Component 3: Subagent Prompt Template

The dispatcher constructs the subagent prompt from a standard template:

```markdown
You are executing a Founder OS command as a background subagent.

## Command
[Full contents of the command markdown file]

## User Input
[Arguments and flags passed by the user]

## Context Files
- Business context: ${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/
- Read relevant skill files referenced in the command

## Relevant Memories
[Top 5 memories from memory engine, pre-fetched]

## Output Requirements
Return a structured result in this format:
- **Status**: success | partial | error
- **Summary**: 2-5 sentence description of what was done
- **Key Data**: The primary output (table, list, document reference, etc.)
- **Actions Taken**: What was created/updated/sent (with links/IDs where applicable)
- **Warnings**: Any degraded dependencies or skipped steps
- **Follow-up**: Suggested next commands, if any
```

### Component 4: Result Summary Format

When a subagent completes, the dispatcher injects a standardized summary into the main session:

```
--- Founder OS: briefing:briefing (completed in 28s) ---
Status: success
Summary: Generated daily briefing covering 12 emails, 4 calendar events,
         and 3 Notion task updates. Saved to [FOS] Briefings database.
Key Data:
  - 3 urgent emails requiring response (from: J. Chen, M. Lopez, AWS Billing)
  - Next meeting: Product sync at 10:30am (prep note attached)
  - 2 overdue tasks flagged for follow-up
Actions: Created Notion page "Daily Briefing -- 2026-03-12" (ID: abc123)
Follow-up: /founder-os:inbox:triage, /founder-os:prep:today
---
```

This summary is what the main session "sees" — not the 25,000 tokens of API responses, file reads, and intermediate reasoning that produced it. The user can ask follow-up questions about the summary, and if they need the full output, they can request it or run the command with `--foreground`.

## Execution Modes

### Mode 1: Background (Default)

The standard path for 90%+ of command executions.

```
User: /founder-os:report:generate --template quarterly
Main: "Generating quarterly report in background..."
      [spawns subagent, main session is free]
User: "What meetings do I have today?"
Main: [answers from memory/context -- no blocking]
      ...
      [notification] Report generation complete.
Main: [injects result summary]
```

### Mode 2: Foreground (Opt-in)

For interactive commands that require back-and-forth with the user, or when the user wants to watch execution happen.

```
User: /founder-os:setup:notion-cli --foreground
Main: [executes inline -- guided wizard with prompts]
```

### Mode 3: Parallel (Natural Extension)

Multiple background commands running simultaneously. No special infrastructure needed — this falls out naturally from background delegation.

```
User: "Run my morning routine: briefing, inbox triage, and meeting prep"
Main: [spawns 3 background subagents simultaneously]
      "Running 3 commands in parallel..."
      [results arrive as each completes]
```

## Command Classification

Every command namespace maps to a default execution mode. The classification is based on two factors: (a) whether the command requires interactive user input during execution, and (b) whether the command's value comes from its execution trace or its final output.

### Background by Default (54 commands across 30 namespaces)

All commands that execute a defined workflow and produce a result. This is the vast majority.

| Namespace | Commands | Typical Execution Tokens | Delegation Benefit |
|-----------|----------|-------------------------|-------------------|
| `inbox` | triage, drafts-approved | 25,000-35,000 | High — Gmail API responses are large |
| `briefing` | briefing, review | 30,000-45,000 | Very high — aggregates 4+ sources |
| `prep` | prep, today | 20,000-35,000 | High — calendar + research context |
| `actions` | extract, extract-file | 10,000-20,000 | Medium — file content in context |
| `review` | review | 35,000-50,000 | Very high — week of data aggregated |
| `followup` | check, nudge, remind | 15,000-25,000 | High — email thread scanning |
| `meeting` | analyze, intel | 15,000-30,000 | High — transcript processing |
| `newsletter` | draft, newsletter, outline, research | 20,000-40,000 | High — research + composition |
| `report` | from-template, generate | 25,000-50,000 | Very high — data gathering + formatting |
| `health` | report, scan | 20,000-35,000 | High — multi-source scoring |
| `invoice` | batch, process | 15,000-30,000 | High — file parsing + Notion writes |
| `proposal` | create, from-brief | 20,000-35,000 | High — document generation |
| `contract` | analyze, compare | 20,000-40,000 | High — document analysis |
| `sow` | from-brief, generate | 20,000-35,000 | High — structured document output |
| `compete` | matrix, research | 25,000-45,000 | Very high — web search intensive |
| `expense` | report, summary | 15,000-25,000 | Medium — file + Notion aggregation |
| `notion` | create, query, update, template | 8,000-15,000 | Medium — direct Notion operations |
| `drive` | ask, organize, search, summarize | 15,000-30,000 | High — Drive API responses |
| `slack` | catch-up, digest | 20,000-35,000 | High — message volume |
| `client` | brief, load | 25,000-40,000 | Very high — multi-source dossier |
| `crm` | context, sync-email, sync-meeting | 15,000-30,000 | High — cross-system sync |
| `morning` | quick, sync | 25,000-40,000 | Very high — full morning aggregation |
| `kb` | ask, find, index | 10,000-25,000 | Medium — knowledge base queries |
| `linkedin` | from-doc, post, variations | 10,000-20,000 | Medium — content generation |
| `savings` | quick, monthly-roi, weekly | 10,000-25,000 | Medium — data aggregation |
| `prompt` | add, get, list, optimize, share | 8,000-15,000 | Medium — Notion CRUD |
| `workflow` | create, edit, list, run, schedule, status | 10,000-25,000 | Medium — workflow management |
| `workflow-doc` | diagram, document | 15,000-30,000 | High — document generation |
| `learn` | log, search, weekly | 10,000-20,000 | Medium — Notion operations |
| `goal` | check, close, create, report, update | 10,000-20,000 | Medium — Notion CRUD |
| `memory` | forget, show, sync, teach | 8,000-15,000 | Medium — memory operations |
| `intel` | approve, config, healing, patterns, reset, status | 5,000-15,000 | Low-medium — local state |

### Foreground by Default (3 commands)

Commands that require interactive user input during execution:

| Namespace | Command | Reason |
|-----------|---------|--------|
| `setup` | notion-cli | Guided wizard — prompts user for API key, confirms sharing |
| `setup` | verify | Interactive verification — user confirms each check |
| `savings` | configure | Guided setup of time estimates — requires user input |

These commands set `execution-mode: foreground` in their frontmatter. Users can still force them to background with `--background`, but this is not recommended for interactive flows.

## Context Economics

### Per-Command Savings

| Metric | Inline (current) | Delegated (proposed) |
|--------|------------------|---------------------|
| Main session tokens per command | 15,000-50,000 | 800-2,000 |
| Breakdown — dispatch overhead | — | ~300-500 tokens |
| Breakdown — result summary | — | ~500-1,500 tokens |
| Breakdown — execution trace | 15,000-50,000 (in main) | 0 (isolated in subagent) |
| Context reduction | — | 90-97% per command |

### Session-Level Impact

| Commands in Session | Main Context (Inline) | Main Context (Delegated) | Savings |
|--------------------|-----------------------|-------------------------|---------|
| 1 | ~25,000 tokens | ~1,500 tokens | 94% |
| 3 | ~75,000 tokens | ~4,500 tokens | 94% |
| 5 | ~125,000 tokens | ~7,500 tokens | 94% |
| 10 | ~250,000 tokens | ~15,000 tokens | 94% |

At 10 commands, the inline approach has consumed 250K tokens of context — the model is working with a massive window and response quality degrades. The delegated approach keeps the main session at 15K tokens — still crisp and responsive.

### Cost Impact

Token costs apply to both approaches (the subagent still consumes tokens), but the UX benefit is the primary value:

- Main session stays responsive and high-quality throughout the day
- No context window pressure means better reasoning on the user's conversational queries
- Subagent context is disposable — it's created fresh for each command, so there's no accumulation

## Implementation Approach

### Phase 1: Infrastructure (dispatcher + template)

1. Create `_infrastructure/dispatcher/SKILL.md` — the dispatcher skill that reads command metadata and spawns subagents
2. Create `_infrastructure/dispatcher/result-template.md` — standardized result summary format reference
3. Define the `execution-mode` and `result-format` frontmatter fields

### Phase 2: Command Metadata (all 57 commands)

Add `execution-mode` frontmatter to all command markdown files:

- 54 commands get `execution-mode: background`
- 3 commands get `execution-mode: foreground`

This is a mechanical change — add 2-3 lines of YAML frontmatter to each file.

### Phase 3: Dispatcher Integration

Modify the command execution flow to route through the dispatcher:

```
1. Parse Arguments (including --foreground / --background override)
2. Dispatcher reads execution-mode from command frontmatter
3. If foreground: proceed with current inline execution (no change)
4. If background:
   a. Dispatcher pre-fetches business context paths and top 5 memories
   b. Dispatcher spawns subagent via Task tool (run_in_background: true)
   c. Dispatcher confirms dispatch to user ("Running in background...")
   d. Main session returns to idle — ready for new input
   e. On subagent completion: dispatcher formats and injects result summary
```

### Phase 4: Parallel Command Support

No new infrastructure needed. Once background delegation is default, users naturally issue multiple commands:

```
User: "Triage my inbox and generate today's briefing"
Dispatcher: [spawns 2 subagents in parallel]
```

The dispatcher handles this by issuing multiple Task tool calls in a single message, consistent with Claude Code's existing parallel execution model.

### Command Execution Flow (After)

```
1. Parse Arguments (+ --foreground/--background flag)
2. Dispatcher: read execution-mode
   |-- foreground? -> proceed inline (existing flow unchanged)
   +-- background? -> spawn subagent:
      |  Subagent executes:
      |  |-- Business Context
      |  |-- Preflight Check
      |  |-- Memory Context
      |  |-- Intelligence Patterns
      |  |-- [Main execution steps]
      |  |-- Observation: End
      |  +-- Return structured result
      |
      +-- Dispatcher: inject result summary into main session
```

## UX Improvements

### Before (Current)

```
User: /founder-os:briefing:briefing
[waits 25-40 seconds, watching execution happen]
[25,000+ tokens consumed in main context]
[session feels slower for next command]

User: "What's the status of the Chen proposal?"
[response quality slightly degraded due to context size]
```

### After (Delegated)

```
User: /founder-os:briefing:briefing
Main: "Generating daily briefing in background..."
[~500 tokens consumed, main session free immediately]

User: "What's the status of the Chen proposal?"
Main: [instant, high-quality response -- context is clean]

[notification: briefing complete]
Main: [injects 1,200-token summary with key highlights]

User: /founder-os:inbox:triage
Main: "Triaging inbox in background..."
[user continues working while both commands run]
```

### Command Queue Behavior

Users develop a natural workflow:

1. Issue morning commands in rapid succession (briefing, triage, prep)
2. All three run in parallel as background subagents
3. Results arrive as each completes — user reviews at their pace
4. Main session stays available for ad-hoc questions throughout

### Progress Notifications

Background subagents surface status via the Task tool's built-in notification mechanism:

- **Dispatch confirmation**: "Running briefing:briefing in background..."
- **Completion notification**: Task result arrives in main session
- **Error notification**: Task error surfaces with actionable message

No custom notification infrastructure is needed — Claude Code's Task tool handles this.

## Interaction with Existing Infrastructure

### Memory Engine ([2])

- Dispatcher pre-fetches top 5 memories for the command namespace and injects them into the subagent prompt
- Subagent logs observations at end of execution (memory writes happen in subagent context, not main session)
- Memory search tokens stay out of main session

### Intelligence Engine ([3])

- Learned patterns for the namespace are injected into the subagent prompt by the dispatcher
- Pattern application and observation logging happen entirely in the subagent
- No intelligence engine tokens in main session

### Preflight Checks ([6])

- Preflight runs inside the subagent, not in the dispatcher
- If preflight returns `blocked`, the subagent returns an error result with fix instructions
- The dispatcher surfaces the error in the main session as a structured message
- This keeps preflight's dependency checks (tool availability, gws auth) out of the main session context

### Agent Teams (--team flag)

- When `--team` is used, the subagent itself becomes the coordinator that spawns the agent pipeline
- The dispatcher's role is the same — spawn a single background subagent
- The subagent handles multi-agent orchestration internally
- This is a clean layering: dispatcher does not need to know about agent teams

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Subagent spawn latency adds 1-3s overhead | High | Low | Acceptable trade-off — user gets main session back immediately. Net UX is better even with the overhead. |
| Subagent lacks context the main session had (prior conversation) | Medium | Medium | Dispatcher injects relevant memories and business context. For truly conversation-dependent commands, user can use `--foreground`. |
| User confusion about async results appearing later | Medium | Medium | Clear dispatch confirmation message. Result summaries are visually distinct (bordered/formatted). Users learn the pattern quickly. |
| Subagent errors are harder to debug than inline errors | Medium | Low | Structured error format with actionable next steps. `--foreground` flag available for debugging. |
| Result summary loses important details | Low | Medium | Standardized result template ensures key data is always included. User can request full output or re-run with `--foreground`. |
| Subagent cannot access MCP tools available to main session | Low | High | Claude Code Task tool subagents inherit the parent session's MCP tool access. Verified by existing `--team` agent pipeline behavior. |

## Files Created / Modified

| File | Action | Description |
|------|--------|-------------|
| `_infrastructure/dispatcher/SKILL.md` | Create | Dispatcher skill — reads metadata, spawns subagents, formats results |
| `_infrastructure/dispatcher/result-template.md` | Create | Standardized result summary format reference |
| `commands/*/[every-command].md` | Modify | Add `execution-mode` and `result-format` frontmatter to all 57 command files |
| `CLAUDE.md` | Modify | Document dispatcher in Universal Patterns section, update command execution flow |

## Success Criteria

1. A user runs `/founder-os:briefing:briefing` and regains control of the main session within 2 seconds. The briefing result appears as a summary notification when complete.
2. A user issues 3 commands in rapid succession (`briefing`, `inbox:triage`, `prep:today`). All three run in parallel. The main session stays responsive for ad-hoc questions while they execute.
3. After 10 delegated commands, the main session context contains fewer than 20,000 tokens of Founder OS execution artifacts (vs. 250,000+ tokens with inline execution).
4. `--foreground` flag works on any command, producing the current inline execution behavior for debugging or interactive use.
5. Subagent errors surface clearly in the main session with actionable fix instructions — never silently swallowed.
6. Existing `--team` agent pipelines continue to work unchanged — the dispatcher spawns a single subagent that internally coordinates the team.
7. No changes to command logic — the same markdown instructions execute identically whether run inline or in a subagent.
