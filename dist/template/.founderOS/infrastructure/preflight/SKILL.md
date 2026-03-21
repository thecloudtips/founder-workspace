---
name: preflight-dependency-check
description: Checks whether a namespace's required and optional dependencies are available before command execution. Returns ready, degraded, or blocked status with actionable fix instructions.
---

# Preflight Dependency Check

Validate that required external tools are available before a command runs. Called as the "Preflight Check" step in every command, between "Business Context" and "Step 0: Memory Context".

**Invisible when all dependencies are satisfied** — no output when the result is `ready`.

Covers both single-agent and `--team` agent pipeline modes. The registry lists the union of all dependencies a namespace can use, so one check covers both modes.

## Input

The current namespace name (e.g., `inbox` from `/founder-os:inbox:triage`).

## Process

### Step 1: Read the Registry

Read `../preflight/dependency-registry.json`.

Look up the current namespace in the `namespaces` object.

- If the namespace is not found in the registry, return status `ready` and proceed silently.
- If the registry file is missing or malformed, return status `ready` and proceed silently.

### Step 2: Check Each Dependency

For each dependency listed in the namespace's `required` and `optional` arrays, run the corresponding check:

| Dependency | Check Method |
|-----------|-------------|
| `notion` | Check if `$NOTION_API_KEY` env var is set: `echo $NOTION_API_KEY`. If empty, mark failed. If set, run `node ../../scripts/notion-tool.mjs search "test" 2>/dev/null` — exit code 0 means available. |
| `gws:gmail`, `gws:calendar`, `gws:drive` | Run `which gws`. If not found, all gws dependencies fail. If found, run `gws auth status`. If auth is valid, all gws dependencies pass. **Only run `which gws` + `gws auth status` once** even if multiple gws dependencies are listed. |
| `filesystem` | Check if filesystem MCP tools (e.g., `list_directory`, `read_file`) are in the current tool list. These are MCP tools, not CLI — check tool availability. |
| `slack` | Check if Slack MCP tools (e.g., `slack_list_channels`) are in the current tool list. |
| `websearch` | Check if WebSearch or Brave search tools are in the current tool list. |

### Step 3: Classify the Result

| State | Condition | Action |
|-------|-----------|--------|
| `ready` | All required pass, all optional pass | Proceed silently. No output. |
| `degraded` | All required pass, 1+ optional fail | Display warnings for each failed optional dependency, then proceed. |
| `blocked` | 1+ required fail | Display error messages for each failed required dependency with fix instructions. **Halt execution.** |

## Output Format

### Blocked

```
## Preflight: Blocked

This command cannot run because required dependencies are missing:

✘ Required: [dependency-specific message from fix-messages.md]

Fix the above, then retry.
```

### Degraded

```
## Preflight: Degraded

Some optional features are unavailable:

⚠ Optional: [dependency-specific message from fix-messages.md]

Proceeding with reduced functionality.
```

### Ready

No output. Proceed silently to the next step.

## Session Caching

If you have already verified a dependency earlier in this conversation (e.g., you already confirmed gws is installed), skip the re-check for that dependency. This avoids redundant Bash calls across multiple commands in the same session.

## Graceful Degradation

- If the registry file is missing: treat as `ready`, proceed silently.
- If a check command itself fails (e.g., Bash execution error): treat that dependency as failed.
- Preflight must **NEVER** crash or produce an unhandled error — always return one of the three states.

## Reference

Fix instructions are in `../preflight/references/fix-messages.md`.
