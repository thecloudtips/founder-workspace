---
description: Generate meeting prep documents for all of today's calendar meetings in sequence
argument-hint: "--team --skip-internal --hours=2160 --yes"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# /founder-os:prep:today

Generate meeting prep documents for every qualifying calendar meeting today. Fetch all events, filter out non-meetings, then run the full `/founder-os:meeting:prep` logic for each meeting in chronological order. Save each prep to Notion and display a summary table at the end with links to all generated prep pages.

## Parse Arguments

Extract these from `$ARGUMENTS`:
- `--team` (boolean, default: false) -- activate the full parallel-gathering pipeline with dedicated agents (calendar-agent, gmail-agent, notion-agent, drive-agent, prep-lead) for each meeting instead of single-agent mode
- `--hours=N` (integer, default: 2160 i.e. 90 days) -- email lookback window in hours for attendee email history searches
- `--skip-internal` (boolean, default: false) -- when present, skip meetings classified as `internal-sync` or `group-meeting` (all attendees share the user's org domain)
- `--yes` (boolean, default: false) -- auto-proceed without showing the confirmation prompt; prep all qualifying meetings immediately

If an argument is malformed (e.g., `--hours=abc`), reject it with a clear error: "Invalid value for --hours: expected an integer, got '[value]'."

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `prep` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `meeting-prep`
- Command: `prep-today`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'meeting-prep' OR plugin IS NULL) AND (command = 'prep-today' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Process

### Step 1: Load Skills

1. Read the meeting-context skill at `${CLAUDE_PLUGIN_ROOT}/skills/prep/meeting-context/SKILL.md` for event identity resolution, meeting classification, attendee context lookup, event filtering rules, and graceful degradation rules.
2. Read the talking-points skill at `${CLAUDE_PLUGIN_ROOT}/skills/prep/talking-points/SKILL.md` for framework selection, talking point generation, open/close structure, and context-aware customization.
3. If `--team` is present, read the pipeline configuration at `${CLAUDE_PLUGIN_ROOT}/agents/prep/config.json`.

### Step 2: Fetch Today's Calendar Events

1. Use `gws calendar +agenda --today --format json` to fetch all events for today. Alternatively, use `gws calendar events list --params '{"calendarId":"primary","timeMin":"ISO","timeMax":"ISO","singleEvents":true,"orderBy":"startTime"}' --format json` with midnight-to-midnight bounds in the user's local timezone.
2. Sort events by start time ascending.
3. Apply event filtering rules from the meeting-context skill:
   - **Exclude declined**: Events where the user's RSVP is "declined". Do not prep unless user explicitly overrides.
   - **Exclude cancelled**: Events with status "cancelled".
   - **Exclude focus/OOO blocks**: Skip events with titles containing "Focus", "Block", "OOO", "Out of Office", "Do Not Book", "No Meetings" (case-insensitive).
   - **Exclude solo events**: Skip events with no attendees besides the user.
   - **Include tentative**: Keep events where user's RSVP is "tentative", flag as "[Tentative]" in output.
   - **Include all-day**: Keep all-day events only if they have attendees besides the user, mark as "[All-Day]" in output.
4. If `--skip-internal` is present, further exclude events classified as `internal-sync` or `group-meeting` per the meeting-context skill classification rules (all attendees share the user's org domain; recurring or 4+ attendees).
5. If zero events remain after filtering, display: "No meetings to prep for today after filtering. [N] events were skipped ([reasons])." and stop.

### Step 3: Display Confirmation

If `--yes` is NOT present:

1. Display the list of meetings that will be prepped:

```
## Today's Meetings to Prep ([N] meetings)

| # | Time | Title | Type | Attendees | Flags |
|---|------|-------|------|-----------|-------|
| 1 | 09:00-09:30 | [Title] | [type] | [count] | [Tentative/All-Day/etc.] |
| 2 | 10:00-11:00 | [Title] | [type] | [count] | |
| ... |

Estimated time: ~[N] minutes ([single-agent/team pipeline] mode)

Proceed with prep for all [N] meetings? (yes/no/select #s)
```

2. If the user responds with "no", stop.
3. If the user responds with specific numbers (e.g., "1, 3, 5"), prep only those meetings.
4. If the user responds with "yes" or equivalent, proceed with all.

If `--yes` IS present, skip confirmation and proceed immediately. Display: "Auto-proceeding with [N] meetings (--yes flag)."

### Step 4: Build Attendee Cache

Before processing individual meetings, build a shared attendee context cache to avoid redundant lookups:

1. Collect all unique attendee email addresses across all meetings to be prepped.
2. For each unique attendee, perform the attendee context lookup once (per the meeting-context skill: identity resolution, Gmail cross-reference within the `--hours` window, Notion CRM cross-reference, Notion notes cross-reference).
3. Store the results keyed by email address.
4. When processing each meeting, pull attendee data from this cache rather than re-fetching. This is critical for performance when the same client or colleague appears in multiple meetings.

### Step 5: Process Each Meeting

For each meeting in start-time order:

1. Display progress: "Prepping meeting [current]/[total]: [Title] ([time])..."
2. Execute the full `/founder-os:meeting:prep` logic for this single meeting:
   - **If `--team` is NOT present**: Run single-agent mode. Use cached attendee data. Perform event identity resolution, meeting classification, Google Drive document search, open items compilation, talking point generation, and output assembly per the meeting-context and talking-points skills.
   - **If `--team` IS present**: Launch the parallel-gathering pipeline per `${CLAUDE_PLUGIN_ROOT}/agents/prep/config.json`. Pass cached attendee data to the gatherer agents to avoid redundant lookups. Agents read their definitions from `${CLAUDE_PLUGIN_ROOT}/agents/prep/[agent-name].md`.
3. **Save to Notion**:
   - Search for a Notion database titled "[FOS] Meetings". If not found, try "Founder OS HQ - Meetings". If not found, fall back to "Meeting Prep Autopilot - Prep Notes". If none exists, warn and continue without Notion storage.
   - Check if a record already exists for this meeting (match by Event ID rich_text). The record may have been created by P07 Meeting Intelligence Hub. If yes, update the existing entry with P03-owned fields only (Prep Notes, Talking Points, Importance Score, Sources Used, Meeting Title, Date, Attendees, Meeting Type, Generated At). Do not overwrite P07 fields. If no existing record, create a new entry. If the meeting is with a known client, set the Company relation.
   - Record the Notion page URL for the summary table.
4. Display a brief inline summary after each meeting completes:

```
[check] [Title] ([time]) -- [Type], Importance [N]/5, [framework] framework
   [M] attendees profiled | [N] open items | [N] talking points | Notion: [URL]
```

5. If processing fails for a meeting, catch the error, record it, and continue to the next meeting. Display:

```
[x] [Title] ([time]) -- FAILED: [error reason]
   Skipping to next meeting...
```

### Step 6: Handle Back-to-Back Deduplication

When consecutive meetings share one or more attendees:

1. Check the talking-points skill edge case rules for "Back-to-Back Meetings with Same Attendee."
2. Do not repeat the same open items or talking points across consecutive meetings. Assign each item to the more appropriate meeting context.
3. In the later meeting's prep, reference the earlier one: "Defer [topic] to the [earlier meeting title] discussion" or "[topic] covered in [earlier meeting title] prep."

### Step 7: Display Final Summary

After all meetings are processed, display a summary table:

```
## Today's Meeting Prep Summary

**Date**: [YYYY-MM-DD]
**Mode**: [Single-agent / Team pipeline]
**Total meetings prepped**: [N] of [total qualifying]
**Total attendees profiled**: [N unique]
**Attendee cache hits**: [N] (lookups saved by caching)

### Results

| # | Time | Meeting | Type | Importance | Framework | Talking Points | Status | Notion |
|---|------|---------|------|------------|-----------|----------------|--------|--------|
| 1 | 09:00 | [Title] | [type] | [N]/5 | [framework] | [N] | Generated | [link] |
| 2 | 10:00 | [Title] | [type] | [N]/5 | [framework] | [N] | Generated | [link] |
| 3 | 11:30 | [Title] | [type] | [N]/5 | [framework] | -- | FAILED | -- |
| ... |

### Skipped Events ([N])
- [Title] ([time]) -- Reason: [declined/cancelled/focus block/solo/internal (--skip-internal)]

### Errors ([N])
- [Title] ([time]) -- [error description]

**Total prep time**: [elapsed]
```

If `--team` mode was used, append a pipeline execution section:

```
### Pipeline Execution

| Meeting | Calendar | Gmail | Notion | Drive | Prep Lead | Total |
|---------|----------|-------|--------|-------|-----------|-------|
| [Title] | [time]   | [time]| [time] | [time]| [time]    | [time]|
| ... |
```

## Output Format

All meeting prep documents follow the format defined in the meeting-context skill's Output Format section. Each individual prep document is saved as a Notion page and contains:

- Meeting metadata (title, time, type, importance, location, RSVP)
- Attendee profiles (ordered: external > internal, seniority desc)
- Agenda (explicit + inferred items)
- Related documents (top 3 from Drive)
- Open items (you owe / owed to you / shared / resolved)
- Recent context (last 5 interactions)
- Discussion guide with framework-based talking points (per talking-points skill)
- Suggested opener, proposed next steps, and meeting close

The terminal output shown to the user is the summary table from Step 7, with brief per-meeting confirmations from Step 5.

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

## Error Handling

- **gws CLI not available (Gmail)**: Warn: "Gmail unavailable via gws -- email history and sentiment analysis will be empty for all meetings." Continue with remaining sources.
- **Notion CLI not configured**: Warn: "Notion unavailable -- CRM context will be empty and preps will not be saved to Notion. Prep documents will be displayed in terminal only." Continue.
- **gws CLI not available (Drive)**: Warn: "Google Drive unavailable via gws -- related documents section will be skipped." Continue.
- **Single meeting fails**: Log the error, mark the meeting as "FAILED" in the summary table, and continue to the next meeting. Never abort the entire batch for a single meeting failure.
- **All meetings fail**: Display: "All [N] meetings failed to prep. See error details above. Common issues: MCP server timeout, rate limiting, or invalid calendar data."
- **Calendar returns no events**: Display: "No events found on your calendar for today." and stop.
- **Calendar returns events but all are filtered out**: Display: "Found [N] calendar events but all were filtered out. Reasons: [breakdown]. Use `/founder-os:meeting:prep [event-title]` to prep a specific event that was filtered."
- **No Meetings database found**: Continue without Notion storage. Display prep in terminal. Warn: "No Meetings database found in Notion -- preps displayed below but not saved."
- **Rate limiting**: If any MCP server returns rate limit errors, implement exponential backoff (1s, 2s, 4s) with max 3 retries per meeting. If still failing, mark that meeting as failed and continue.
- **Timeout**: Individual meeting prep times out after 60 seconds in single-agent mode, 90 seconds in `--team` mode. Mark as failed and continue.

## Usage Examples

```
/founder-os:meeting:prep-today                           # Prep all today's meetings, single-agent, with confirmation
/founder-os:meeting:prep-today --yes                     # Prep all today's meetings, auto-proceed
/founder-os:meeting:prep-today --team                    # Full parallel pipeline for each meeting
/founder-os:meeting:prep-today --skip-internal           # Skip internal syncs and group meetings
/founder-os:meeting:prep-today --team --skip-internal    # Team pipeline, external/important meetings only
/founder-os:meeting:prep-today --hours=720 --yes         # 30-day email lookback, auto-proceed
/founder-os:meeting:prep-today --team --skip-internal --hours=2160 --yes  # Full pipeline, externals only, 90-day lookback, no confirmation
```
