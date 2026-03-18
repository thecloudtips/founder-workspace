# Dispatcher Skill — Subagent Delegation

This skill standardizes how `/founder-os:*` commands are dispatched. It reads the command's `execution-mode` frontmatter and either spawns a background subagent or executes inline.

## Overview

The dispatcher separates the main session (user's conversational interface) from the execution engine (subagent). Background commands run in isolated subagent contexts, keeping the main session small and responsive.

## Reading Execution Mode

Every command markdown file has YAML frontmatter with two delegation fields:

```yaml
---
execution-mode: background    # background | foreground
result-format: summary        # summary | full
---
```

- `background` (default): Spawn a Task tool subagent with `run_in_background: true`
- `foreground`: Execute inline in the main session (current behavior)
- `summary`: Subagent returns a structured result summary (~500-1500 tokens)
- `full`: Subagent returns complete output (for commands where full output IS the value)

## Dispatch Flow

### Step 1: Parse the Command

Read the target command markdown file's frontmatter. Extract `execution-mode` and `result-format`.

### Step 2: Check for Flag Overrides

User flags override frontmatter defaults:
- `--foreground` → force inline execution regardless of metadata
- `--background` → force background delegation regardless of metadata

If neither flag is present, use the frontmatter value.

### Step 3: Branch on Execution Mode

**If foreground:**
Proceed with current inline execution. No dispatcher involvement beyond this point. The command runs in the main session as it always has.

**If background:**
Continue to Step 4.

### Step 4: Pre-fetch Context for Subagent

Before spawning the subagent, gather lightweight context references (NOT full file contents):

1. **Business context paths**: List files in `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` — pass paths to subagent (it reads them itself)
2. **Memory context**: Query memory engine for top 5 relevant memories for this command's namespace. Pass the memory text into the subagent prompt. This is the ONE read the dispatcher does — it's small (~200-400 tokens) and saves the subagent from having to initialize memory search.
3. **Intelligence patterns**: If Intelligence Engine [3] is active, fetch learned patterns for the namespace. Pass pattern text into subagent prompt.
4. **Skill file paths**: List the skill files referenced in the command markdown — pass paths (not contents) to subagent.

### Step 5: Spawn Background Subagent

Use the Task tool with `run_in_background: true`. The subagent prompt is constructed from the template below.

### Step 6: Confirm Dispatch to User

Print a brief confirmation in the main session:
```
Running [namespace]:[action] in background...
```

The main session is now free for new input.

### Step 7: Receive and Inject Result

When the subagent completes, the Task tool delivers the result to the main session. Format it using the result template (see `_infrastructure/dispatcher/result-template.md`) and display it.

## Subagent Prompt Template

The dispatcher constructs the subagent prompt from this template:

~~~
You are executing a Founder OS command as a background subagent.

## Command
[Full contents of the command markdown file]

## User Input
[Arguments and flags passed by the user, exactly as provided]

## Context Files
- Business context: ${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/
- Read relevant skill files referenced in the command

## Relevant Memories
[Top 5 memories from memory engine, pre-fetched by dispatcher]

## Intelligence Patterns
[Learned patterns for this namespace, if any]

## Output Requirements
Return a structured result in this format:
- **Status**: success | partial | error
- **Summary**: 2-5 sentence description of what was done
- **Key Data**: The primary output (table, list, document reference, etc.)
- **Actions Taken**: What was created/updated/sent (with links/IDs where applicable)
- **Warnings**: Any degraded dependencies or skipped steps
- **Follow-up**: Suggested next commands, if any

Do NOT include raw API responses, intermediate reasoning, or full file contents in your result. Return only the structured summary above.
~~~

## Integration Notes

### Memory Engine [2]
- Dispatcher pre-fetches top 5 memories and injects them into the subagent prompt
- Subagent logs observations at end of execution (writes happen in subagent context)
- Memory search tokens stay out of the main session

### Intelligence Engine [3]
- Learned patterns are injected into the subagent prompt by the dispatcher
- Pattern application and observation logging happen entirely in the subagent
- No intelligence engine tokens pollute the main session

### Preflight Checks [7]
- Preflight runs INSIDE the subagent, not in the dispatcher
- If preflight returns `blocked`, the subagent returns an error result with fix instructions
- The dispatcher surfaces the error as a structured message in the main session

### Agent Teams (--team flag)
- When `--team` is used, the subagent itself becomes the coordinator that spawns the agent pipeline
- The dispatcher's role is unchanged — it still spawns a single background subagent
- The subagent handles multi-agent orchestration internally

## Dispatcher Does NOT
- Execute any command logic itself
- Read skill files or tool outputs into the main session context
- Retain the subagent's full execution trace
- Need to know about agent teams or command internals
