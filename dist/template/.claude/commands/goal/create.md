---
description: Create a new goal with optional milestones and deadline
argument-hint: "[goal name] [--target=YYYY-MM-DD] [--category=CAT] [--milestones=M1,M2,M3]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:goal:create

Create a new goal with optional target date, category, and milestones. Save to the Goal Progress Tracker Notion database.

## Load Skills

Read the goal-tracking skill before starting any step:

1. `skills/goal/goal-tracking/SKILL.md`

Apply goal-tracking for all database operations, category detection, naming conventions, progress tracking, RAG status rules, and milestone management.

## Parse Arguments

Extract from `$ARGUMENTS`:

- **goal name** (required positional) — the full goal description. Everything that is not a `--` flag. If no goal name is provided, ask: "What goal would you like to create? Describe it in a short phrase." Then wait for input.
- `--target=YYYY-MM-DD` (optional) — Target Date for the goal. Validate date format (must be valid YYYY-MM-DD).
- `--category=CAT` (optional) — one of: Revenue, Product, Operations, Team, Personal, Technical, Marketing, Other. Case-insensitive. If not provided, auto-detect from goal name using the category taxonomy signals in the goal-tracking skill.
- `--milestones=M1,M2,M3` (optional) — comma-separated milestone names. Creates milestone entries linked to this goal.

If `$ARGUMENTS` is empty, prompt: "What goal would you like to create? Describe it in a short phrase." Then wait for input before continuing.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `goal` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `goal-tracker`
- Command: `goal-create`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'goal-tracker' OR plugin IS NULL) AND (command = 'goal-create' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Step 1: Verify Notion Availability

Check that the Notion CLI tool is connected. If Notion is unavailable, display the goal in chat format so the user can log it manually later, then stop. Display:

```
⚠️ Notion is not available. Here's your goal for manual logging:

🎯 Goal: [goal name]
📂 Category: [detected/specified category]
📅 Target: [YYYY-MM-DD or "No deadline"]
🏁 Milestones: [comma-separated list or "None"]

Reconnect Notion and run /founder-os:goal:create again to save.
```

## Step 2: Validate Input

Apply input validation:

- If goal name is fewer than 3 characters, display: "Goal name is too short (minimum 3 characters). Please provide a more descriptive goal." Then wait for revised input.
- If goal name exceeds 200 characters, display: "Goal name exceeds 200 characters. Please shorten it." Then wait for revised input.
- If `--target` is provided, validate it is a valid date in YYYY-MM-DD format. If the date is in the past, display a warning: "⚠️ Target date [YYYY-MM-DD] is in the past. Proceeding anyway." Continue without blocking.
- If `--target` is provided but the format is invalid, display: "Invalid date format. Please use YYYY-MM-DD (e.g., 2026-06-30)." Then wait for revised input.

## Step 3: Locate Goals Database

Follow the database discovery protocol from the goal-tracking skill:

1. Search the Notion workspace for a database titled "[FOS] Goals". If not found, try "Founder OS HQ - Goals". If not found, fall back to "Goal Progress Tracker - Goals".
2. If found, use it.
3. If none is found, report: "Goals database not found. Ensure the Founder OS HQ workspace template is installed in your Notion workspace." Then stop.

## Step 4: Check for Duplicates

Search the discovered Goals database for an existing goal where:
- `Title` matches the goal name (case-insensitive)

If a duplicate exists, present the existing goal's Status and Progress, then ask: "A goal with this name already exists: '[existing title]' (Status: [status], Progress: [N]%). Would you like to (1) update it, (2) save under a different name, or (3) cancel?" Wait for response.

## Step 5: Detect Category

If `--category` was provided, use it directly (case-insensitive match to one of the 8 categories).

If `--category` was not provided, auto-detect from the goal name using the category taxonomy signals in the goal-tracking skill. When detection is ambiguous, default to `Other`.

## Step 6: Create Goal Page

Create a new Notion page in the discovered Goals database with these property values:

- **Title**: goal name (apply naming conventions from the goal-tracking skill)
- **Description**: empty (user can add later via /founder-os:goal:update)
- **Status**: "Not Started" (select)
- **Progress**: 0 (number)
- **Target Date**: `--target` value or empty (date)
- **Start Date**: empty (set on first progress update)
- **Category**: detected or specified category (select)
- **RAG Status**: "Not Started" (select)
- **Progress Snapshots**: `[{"date":"YYYY-MM-DD","progress":0}]` (rich_text, using today's date)
- **Notes**: `[YYYY-MM-DD] Goal created.` (rich_text, using today's date)
- **Created At**: current date and time in ISO 8601 (date)

## Step 7: Create Milestones

Skip this step if `--milestones` was not provided.

If `--milestones` was provided:

1. Locate the milestones database following the database discovery protocol from the goal-tracking skill. Search for "[FOS] Milestones" first, try "Founder OS HQ - Milestones", fall back to "Goal Progress Tracker - Milestones". If none is found, report: "Milestones database not found. Ensure the Founder OS HQ workspace template is installed in your Notion workspace." Then stop.
2. Split the `--milestones` value by commas. Trim whitespace from each milestone name.
3. For each milestone, create a Notion page with:
   - **Title**: milestone name
   - **Goal**: relation to the goal page created in Step 6
   - **Status**: "Not Started" (select)
   - **Order**: sequential 1-based integer (1, 2, 3, ...)
4. After all milestones are created, update the Goal page:
   - **Milestone Count**: total number of milestones created (number)
   - **Completed Milestones**: 0 (number)

## Step 8: Display Confirmation

Display the confirmation:

```
✅ Goal created!

🎯 [Goal Name]
📂 Category: [Category]
📅 Target: [YYYY-MM-DD or "No deadline set"]
📊 Progress: ░░░░░░░░░░ 0%

🏁 Milestones: [N milestones created]
  1. [Milestone 1]
  2. [Milestone 2]
  3. [Milestone 3]

Use /founder-os:goal:update to log progress | /founder-os:goal:check for status
```

If no milestones were created, replace the Milestones section with:
```
🏁 Milestones: None — track progress manually with /founder-os:goal:update
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

- **Notion unavailable**: Display goal in chat format at Step 1. Do not discard.
- **Input too short/long**: Reject with clear message at Step 2. Ask for revision.
- **Duplicate found**: Surface conflict at Step 4. Never silently overwrite.
- **Invalid date**: Reject with clear format message. Ask for revision.
- **Category ambiguous**: Default to Other. Note assumption.
- **Milestone creation partial failure**: Log successfully created milestones, report which failed, update Milestone Count with actual count.
- **No arguments**: Interactive prompting for goal name.

## Usage Examples

```
/founder-os:goal:create "Launch MVP by end of Q2" --target=2026-06-30 --category=Product --milestones="Design mockups,Build prototype,User testing,Ship v1"
/founder-os:goal:create "Reach $50K MRR" --target=2026-12-31 --category=Revenue
/founder-os:goal:create "Hire senior engineer" --category=Team
/founder-os:goal:create
```
