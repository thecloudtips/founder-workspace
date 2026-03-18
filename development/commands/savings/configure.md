---
description: Configure hourly rate and custom time estimates for savings calculations
argument-hint: "[--rate=N] [--reset]"
allowed-tools: ["Read", "Write"]
execution-mode: foreground
result-format: full
---

# /founder-os:savings:configure

Set up or update the hourly rate and custom time estimates used by all savings commands. Configuration is stored in `${CLAUDE_PLUGIN_ROOT}/config/user-config.json`.

## Load Skills

Read the roi-calculation skill at `${CLAUDE_PLUGIN_ROOT}/skills/savings/roi-calculation/SKILL.md` for the configuration resolution priority order and user config schema.

## Parse Arguments

Extract from `$ARGUMENTS`:

- `--rate=N` (optional) -- Set hourly rate directly without interactive prompt. N must be a positive number.
- `--reset` (optional) -- Reset all custom overrides back to defaults. Keeps hourly rate.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `savings` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `time-savings`
- Command: `savings-configure`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'time-savings' OR plugin IS NULL) AND (command = 'savings-configure' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Workflow

### Step 1: Load Current Configuration

1. Read `${CLAUDE_PLUGIN_ROOT}/config/user-config.json` if it exists.
2. Read `${CLAUDE_PLUGIN_ROOT}/config/task-estimates.json` for default values.
3. Display current configuration:

```
## Current Configuration

**Hourly Rate**: $[rate]/hr (or "Not set — using default $150/hr")
**Currency**: [currency]
**Custom Overrides**: [N categories customized] (or "None")
**Last Updated**: [date] (or "Never")
```

### Step 2: Handle --reset Flag

If `--reset` is provided:
1. Remove the `overrides` object from user-config.json (keep hourly_rate and currency).
2. Confirm: "Reset N custom overrides to defaults. Hourly rate unchanged at $[rate]/hr."
3. Stop here.

### Step 3: Set Hourly Rate

If `--rate=N` was provided:
- Validate N is a positive number.
- Set hourly_rate to N.
- Skip the interactive prompt.

If `--rate` was NOT provided:
- Use AskUserQuestion: "What is your hourly rate? (Current: $[rate]/hr, enter to keep, 0 to disable dollar calculations)"
- Parse the response. Accept numbers, "0" (disables dollar calc), or empty (keep current).

### Step 4: Offer Category Customization

Use AskUserQuestion: "Would you like to customize time estimates for any categories? (y/n)"

If yes:
1. Display current estimates table:
   | Category | Manual (min) | AI (min) | Savings | Source |
   |----------|-------------|----------|---------|--------|
   List all 24 categories with current values. Mark overridden ones with "(custom)".

2. Use AskUserQuestion: "Enter category key to customize (e.g., 'email_triage'), or 'done' to finish:"

3. For each category the user wants to customize:
   - Ask for manual_minutes (must be > 0)
   - Ask for ai_minutes (must be > 0, must be < manual_minutes)
   - Validate: manual_minutes > ai_minutes
   - If validation fails, explain and re-ask
   - Add to overrides object

4. Repeat until user says "done".

### Step 5: Save Configuration

Write `${CLAUDE_PLUGIN_ROOT}/config/user-config.json`:

```json
{
  "hourly_rate": [number],
  "currency": "USD",
  "configured_at": "[ISO date]",
  "overrides": {
    "category_key": {
      "manual_minutes": [number],
      "ai_minutes": [number]
    }
  }
}
```

### Present Summary

Display:
```
## Configuration Updated

**Hourly Rate**: $[rate]/hr
**Currency**: [currency]
**Custom Overrides**: [N categories]
**Saved**: config/user-config.json

Run `/founder-os:savings:quick` to see your updated calculations.
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

## Graceful Degradation

- If user-config.json doesn't exist yet, create it fresh.
- If task-estimates.json is missing, report error: "Default task estimates not found. Plugin may be corrupted."
- If user enters invalid data, explain the validation rule and re-ask (never save invalid config).

## Usage Examples

```
/founder-os:savings:configure
/founder-os:savings:configure --rate=200
/founder-os:savings:configure --reset
```
