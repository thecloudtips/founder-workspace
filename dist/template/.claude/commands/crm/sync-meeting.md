---
description: Sync calendar meetings to CRM Pro Communications database with client matching and AI summaries
argument-hint: "[event_id] [--since=7d] [--client=NAME] [--dry-run] [--upcoming]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:crm:sync-meeting

Sync calendar meetings from Google Calendar to the CRM Pro Communications database in Notion. Supports single-event sync and batch mode.

## Load Skills

Read these skills for processing logic:
- `skills/crm/crm-sync/SKILL.md` for the sync orchestration workflow, batch status report format, dry run rules, and error handling patterns
- `skills/crm/activity-logging/SKILL.md` for CRM write logic, AI summary generation guidelines, sentiment classification, activity type mapping, and deduplication strategy
- `skills/crm/client-matching/SKILL.md` for resolving attendees to CRM clients via the 5-step progressive matching algorithm and confidence tiers

## Parse Arguments

Extract from `$ARGUMENTS`:
- First positional arg: `event_id` (optional) -- Google Calendar event ID for single-event sync
- `--since=Nd` (optional) -- batch mode lookback window. Default: 7d. Accepted formats: "7d", "2w", "1m", ISO date. For parsing rules see `skills/crm/crm-sync/references/sync-patterns.md`.
- `--client=NAME` (optional) -- skip client matching, assign directly to the named client
- `--dry-run` (optional) -- preview what would be synced without writing to Notion
- `--upcoming` (optional) -- include future meetings (logged as "Meeting Scheduled")

If no event_id and no --since flag: default to batch mode with --since=7d.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `crm` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `crm-sync`
- Command: `crm-sync-meeting`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'crm-sync' OR plugin IS NULL) AND (command = 'crm-sync-meeting' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Mode Detection

- **Single mode**: event_id provided -- sync one meeting
- **Batch mode**: no event_id -- scan calendar for recent meetings within the lookback window

## Single Event Sync

1. **Fetch**: Use Google gws CLI (Calendar) to retrieve the event by `event_id`. Extract: title, description, attendees (with emails and RSVP status), start time, end time, location (physical or virtual meeting link), recurrence info, event status (confirmed/tentative/cancelled). Calculate the meeting duration in minutes.

2. **Skip cancelled**: If event status is "cancelled", report: "Event [event_id] is cancelled. Skipped." and exit. Do not create a Communications record for cancelled events.

3. **Match client**:
   - If `--client` flag provided: search the Companies DB for the named client directly using dynamic database discovery (never hardcode IDs).
   - Otherwise: run the client-matching skill's 5-step progressive matching algorithm on all non-user attendee email addresses extracted from the event. Use the highest-confidence match result.
   - If attendees have no email addresses (name only): skip directly to Step 4 of the matching algorithm (fuzzy name matching) per the client-matching skill's edge case rules for calendar events without emails.
   - If no match found (confidence NONE): present the attendee list (names and emails) and ask the user to select a client from the CRM, create a new contact, or skip.

4. **Generate summary**: Create an AI summary following the activity-logging skill's meeting summary guidelines:
   - **Sentence 1**: State the meeting purpose and list key participants by name.
   - **Sentence 2**: Summarize key topics discussed or decisions made, drawing from the event title, description, and any attached notes.
   - **Sentence 3** (include only when substantive): Note action items or follow-ups assigned during the meeting.
   - When the description is empty, construct the summary from the title, attendee names, and duration alone.
   - Classify sentiment (Positive/Neutral/Negative) using the activity-logging skill's sentiment classification rules.
   - For the Title field: use the calendar event title directly. Truncate at 80 characters. Do not modify the casing of meeting titles.

5. **Determine activity type**: Check the event's start time against the current timestamp per the activity-logging skill's mapping rules:
   - Past event (start time in the past): Type = "Meeting Held"
   - Future event (start time in the future, requires `--upcoming` flag): Type = "Meeting Scheduled"
   - Future event without `--upcoming` flag: skip this event silently in batch mode; in single mode, warn: "Event [title] is in the future. Use --upcoming to sync future meetings."

6. **Write to CRM**:
   - If `--dry-run`: display what WOULD be written with `[DRY RUN]` prefix on all output lines. Skip the Notion write entirely. Do not create or update any Communications DB records.
   - Otherwise: create or update a Communications DB record via the activity-logging skill's deduplication logic. Before writing, query the Communications DB for existing records matching on Title (event title) + Date (same calendar day) + Type ("Meeting Held" or "Meeting Scheduled"). If a match is found, apply the idempotent update rules from the activity-logging skill. If a previously "Meeting Scheduled" record now has a past start time, update the Type to "Meeting Held". If no match, create a new record. Link to matched Company and Contact page IDs.

7. **Confirm**: Display the result to the user showing activity logged, client matched (with confidence tier), and summary preview. If the match confidence is below 0.7 (MEDIUM or lower), display a warning and ask the user to confirm the match before writing.

## Batch Mode

1. **Scan**: Search Google Calendar for events within the lookback window (from `--since` flag or default 7d).
   - Default: past events only (start time before now)
   - With `--upcoming`: also include events in the next 7 days from today

2. **Filter**:
   - Skip cancelled events (event status "cancelled")
   - Skip events the user declined (RSVP status "declined")
   - Skip all-day events (typically holidays, OOO, or block-out markers) -- they rarely represent client interactions
   - Skip events with no external attendees (all attendees share the user's email domain = internal-only meetings)
   - Skip events with zero attendees (personal blocks, focus time)

3. **Check already synced**: For each remaining event, check the Communications DB for existing records using the deduplication logic from the activity-logging skill. Use the batch deduplication optimization: fetch all Communications records within the batch's date range in a single query, then match locally by Title + Date + Type. Skip events that already have a synced record. Count these as "Skipped (already synced)" in the batch report.

4. **Process each**: Run the single-event workflow (steps 3-7 above) for each unsynced event. Process events sequentially to avoid overwhelming the Notion API. Follow batch size limits from the activity-logging skill (batches of 50, 1-second pause between batches).

5. **Handle unmatched**: Collect events where client matching returned confidence NONE. Do not halt the batch for unmatched items. Present the full unmatched list at the end for user resolution, formatted per the crm-sync skill: "N unmatched participants found. Review and assign: [list with attendee name, email, and domain for each]."

6. **Report**: Display the batch status report using the format from the crm-sync skill:

```
## CRM Sync Complete

**Source**: Google Calendar
**Period**: [start_date] to [end_date]
**Duration**: [processing_time]

| Status | Count |
|--------|-------|
| Synced (new) | X |
| Updated (existing) | X |
| Skipped (already synced) | X |
| Unmatched (needs review) | X |
| Failed | X |
| **Total processed** | **X** |

### Unmatched Items (if any)
- [meeting title] -- [attendee name/email] -- No CRM match found
```

When all items are successfully synced with zero unmatched and zero failed, append: "All activities synced successfully."

If `--dry-run` is active, prefix the report header with `[DRY RUN]` and treat all would-be synced items as previews.

## Notion Integration

1. **Find Communications DB**: Search Notion for databases titled "[FOS] Communications", "Founder OS HQ - Communications", "Communications", "CRM - Communications", or "CRM Pro - Communications" (in that priority order). Use dynamic discovery via the Notion search API -- never hardcode database IDs. Cache the discovered ID for the duration of this command execution.
2. **If not found**: Report: "Communications database not found. Ensure the Founder OS HQ workspace template or CRM Pro template is installed in your Notion workspace." Do not create the database automatically.
3. **Companies and Contacts DB**: Use dynamic discovery (search by title, never hardcode IDs). Search for "[FOS] Companies" / "[FOS] Contacts" first, then "Founder OS HQ - Companies" / "Founder OS HQ - Contacts", then fall back to "Companies" / "Contacts" or "CRM - Companies" / "CRM - Contacts" per the client-matching skill's discovery rules.

## Graceful Degradation

- **Google gws CLI (Calendar) unavailable**: Error -- Google Calendar is required for this command. Display: "Google Calendar unavailable -- cannot sync meetings. Configure Google gws CLI (Calendar) per `/founder-os:setup:notion-cli`." Stop execution.
- **Notion CLI unavailable**: Display sync results in chat with all fields for each item. Warn: "Notion unavailable -- displaying results in chat. Meeting activities were not saved to the CRM. Configure Notion CLI per `/founder-os:setup:notion-cli`."
- **gws CLI (Gmail) unavailable**: Not needed for this command. No degradation required.

## Output Format (Single Mode)

```
## Meeting Synced to CRM

**Meeting**: [title]
**Client**: [client_name] (confidence: [tier])
**Type**: Meeting Held / Meeting Scheduled
**Date**: [date and time]
**Attendees**: [attendee list]

### Summary
[AI-generated 2-3 sentence summary]

**Sentiment**: [Positive/Neutral/Negative]
**Notion**: [link to Communications record or "Not saved (dry run)"]
```

If no event found for the given event_id:
- Display: "No calendar event found for ID [event_id]. Verify the event ID and try again."

## Output Format (Batch Mode)

Use the batch status report format defined in the Batch Mode section above (from the crm-sync skill).

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
/founder-os:crm:sync-meeting                                    # Batch: sync last 7 days of meetings
/founder-os:crm:sync-meeting event_xyz789                        # Single: sync specific meeting
/founder-os:crm:sync-meeting --since=14d                         # Batch: last 14 days
/founder-os:crm:sync-meeting --since=7d --upcoming               # Include future meetings
/founder-os:crm:sync-meeting --since=2w --dry-run                # Preview batch without writing
/founder-os:crm:sync-meeting event_xyz789 --client="Acme Corp"   # Single with known client
```
