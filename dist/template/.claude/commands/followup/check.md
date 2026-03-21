---
description: Scan Gmail sent folder for emails awaiting response and track follow-ups
argument-hint: "[--days=N] [--priority=high|all] [--limit=N] [--schedule=EXPR] [--persistent]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:followup:check

Scan the user's Gmail sent folder to identify emails awaiting a response, detect bidirectional promises, score urgency, and optionally track results in Notion.

## Load Skill

Read the follow-up-detection skill at `skills/followup/follow-up-detection/SKILL.md` for sent-email scanning logic, thread reply detection, promise pattern matching, age-based priority tiers, exclusion rules, and priority scoring.

## Parse Arguments

Extract flags from `$ARGUMENTS`:
- `--days=N` (optional) — number of days to look back in the sent folder. Default: 30.
- `--priority=high|all` (optional) — filter results. `high` shows only priority 3-5. `all` shows everything including priority 1-2. Default: `all`.
- `--limit=N` (optional) — maximum number of follow-ups to display. Default: 20.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `followup` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `follow-up-tracker`
- Command: `followup-check`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'follow-up-tracker' OR plugin IS NULL) AND (command = 'followup-check' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Scheduling Support

If `$ARGUMENTS` contains `--schedule`:
1. Extract the schedule value and any `--persistent` flag
2. Read `_infrastructure/scheduling/SKILL.md` for scheduling bridge logic
3. Read `_infrastructure/scheduling/references/schedule-flag-spec.md` for argument parsing
4. Default suggestion if no expression given: `"0 10 * * 1-5"` (Weekdays 10:00am)
5. Handle the schedule operation (create/disable/status) per the spec
6. Exit after scheduling — do NOT continue to main command logic

## Scanning Process

1. **Scan sent folder**: Search Gmail for messages sent by the user within the lookback window (default 30 days). Retrieve full threads for each sent message.

2. **Identify awaiting-reply threads**: For each thread, determine whether the user sent the last message. If the user sent the last message and no reply has been received, flag the thread as "Awaiting Reply." Apply the thread reply detection logic from the skill.

3. **Detect promises**: Scan flagged threads for bidirectional promise patterns. For outbound promises (user's sent messages), check for delivery, response, action, and temporal commitment language. For inbound promises (received messages), check the same categories plus deferral language. Consult `skills/followup/follow-up-detection/references/promise-patterns.md` for the complete pattern library. Classify each promise as "Promise Made", "Promise Received", or "Awaiting Response."

4. **Apply exclusion rules**: Filter out threads matching exclusion criteria from the skill: no-reply addresses, automated senders, service addresses, newsletters, auto-replies, transactional confirmations, mailing list messages, and calendar invitations.

5. **Score priority**: Calculate priority 1-5 for each follow-up candidate using the skill's scoring formula: age-based tier + relationship importance modifier + promise urgency modifier + thread activity modifier. Clamp to 1-5 range.

6. **Sort results**: Order by priority descending, then by days_waiting descending.

7. **Apply filters**: If `--priority=high`, keep only items with priority >= 3. Apply `--limit` to cap the displayed count.

## Notion Integration

1. **Discover database**: Search Notion for the consolidated **"[FOS] Tasks"** database. If not found, try **"Founder OS HQ - Tasks"**. If not found, fall back to the legacy "Follow-Up Tracker - Follow-Ups" database. If none exists, degrade gracefully (see below). Do **not** lazy-create any database.
2. **Type filter**: All reads and queries against the HQ database **must** include a filter `Type = "Follow-Up"` to scope results to this plugin's records only.
3. **Write fields**: Set `Type = "Follow-Up"` and `Source Plugin = "Follow-Up Tracker"` on every created or updated record. Map Subject → Title, Recipient → Contact relation (with Company relation when domain matches CRM), and use HQ status values (Waiting / Done). See the follow-up-detection skill for the full field mapping.
4. **Idempotent updates**: Use Thread ID as the unique key. For threads already in the database (filtered by `Type = "Follow-Up"`), update Days Waiting, Priority, and Status. For new threads, create records. Never duplicate entries.
5. **Resolve threads**: If a previously tracked thread now has a reply, update Status to "Done."
6. **Expire threads**: Mark items as "Done" with note "[Expired — no reply after 30 days]" when days_waiting exceeds 30 and no nudge has been sent.

## Graceful Degradation

If Notion CLI is unavailable or any Notion operation fails:
- Output the follow-up list as structured text in chat
- Include all fields for each item
- Warn: "Notion unavailable — displaying results in chat. Follow-ups were not saved to the tracker database. Configure Notion CLI per `/founder-os:setup:notion-cli` and ensure the [FOS] Tasks database exists."

## Output Format

After scanning, display results:

```
## Follow-Up Check

**Scanned**: Last [N] days of sent mail
**Found**: [count] emails awaiting response
**Promises detected**: [count] (Made: [n], Received: [n])
**Tracked in Notion**: [count] new | [count] updated | [count] resolved

---

| # | Subject | Recipient | Days | Priority | Promise Type | Suggested Action |
|---|---------|-----------|------|----------|--------------|------------------|
| 1 | [subject] | [recipient] | [days] | [score]/5 [label] | [type] | [action] |
| 2 | ... | ... | ... | ... | ... | ... |

[For each tracked item, include the Notion page link if available]
```

Suggested Action values:
- Priority 5: "Follow up immediately"
- Priority 4: "Follow up today — use `/founder-os:followup:nudge [thread_id]`"
- Priority 3: "Follow up this week — use `/founder-os:followup:nudge [thread_id]`"
- Priority 2: "Set a reminder — use `/founder-os:followup:remind [thread_id]`"
- Priority 1: "Monitor — no action needed yet"

If no follow-ups found:
- Display: "No emails awaiting response in the last [N] days. Inbox is clear!"

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

## Usage Examples

```
/founder-os:followup:check
/founder-os:followup:check --days=7
/founder-os:followup:check --priority=high
/founder-os:followup:check --days=14 --limit=10
/founder-os:followup:check --priority=high --limit=5
```
