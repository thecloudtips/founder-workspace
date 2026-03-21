---
description: Analyze a meeting transcript to extract summaries, decisions, follow-ups, and topics
argument-hint: "path/to/transcript.txt --output=chat"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:meeting:analyze

Analysis-only pipeline -- the user provides transcript text directly in conversation or as a file path. Skip source detection and gathering entirely. Run 4 extraction pipelines (summary, decisions, follow-ups, topics) on the provided content, then output results. Default output is `chat` (unlike `/founder-os:meeting:intel` which defaults to `both`).

## Load Skills

Read the meeting-analysis skill at `skills/meeting/meeting-analysis/SKILL.md` for extraction pipeline logic, detection patterns, output schema, Notion integration, and edge case handling.

Do not load the source-gathering skill. This command does not perform source detection or multi-source gathering.

## Parse Arguments

Extract parameters from `$ARGUMENTS`:

- **`[text-or-file]`** (optional positional) -- pasted transcript text in the conversation, or a file path to read.
- `--output=notion|chat|both` (optional) -- where to send results. Default: `chat`.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `meeting` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `meeting-intel`
- Command: `meeting-analyze`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'meeting-intel' OR plugin IS NULL) AND (command = 'meeting-analyze' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Step 1: Read Input

Determine the input type and read the transcript content:

1. **File path detected**: If the argument contains `/` or ends with a file extension (`.txt`, `.md`, `.json`, `.srt`, `.vtt`), treat it as a file path. Read the file using the Read tool.
   - If the file does not exist, halt with: "File not found: [path]. Check the path and try again."
   - If the file is empty, halt with: "File is empty: [path]. No meeting content to analyze."
2. **Pasted text detected**: If the argument is multi-line text without a file extension, treat it as a pasted transcript.
3. **No argument provided**: Prompt the user: "Provide a file path to a transcript, or paste the meeting text directly." Then stop and wait for input.

Construct a minimal NormalizedTranscript from the input:

- **title**: For file input, use the filename without extension. For pasted text, use the first non-empty line (truncated to 80 characters). Fall back to "Untitled Meeting" if neither yields a title.
- **date**: Scan the content for date patterns (YYYY-MM-DD, "March 5, 2026", etc.). If no date is detectable, use today's date.
- **duration**: Leave empty (not determinable from static text without timestamps).
- **attendees**: Infer from speaker labels in the text (e.g., "John:", "[Sarah]:", "Speaker 1:"). Leave empty if no labels are found.
- **source_type**: "Local File" for file input, "Direct Input" for pasted text.
- **source_path**: The file path for file input, or empty for pasted text.
- **transcript_text**: The full content.

## Step 2: Run Analysis Pipelines

Run all 4 pipelines from the meeting-analysis skill on the NormalizedTranscript. Each pipeline produces its section independently. A failure or empty result in one pipeline does not block the others.

### Pipeline 1: Meeting Summary

Generate a 3-5 sentence summary covering main topics discussed, key participants and their roles, and the outcome or open questions.

### Pipeline 2: Key Decisions Log

Scan the transcript for decision patterns per the meeting-analysis skill. For each decision, extract: decision text, proposer, context, confidence level (Explicit or Inferred). Flag any disagreements noted in the discussion.

### Pipeline 3: Follow-Up Commitments

Scan for follow-up commitment patterns per the meeting-analysis skill. For each commitment, extract: who (owner), what (action), deadline (parsed to ISO date where possible), mentioned_by. Format output to be compatible with Plugin #06 Follow-Up Tracker's promise patterns.

### Pipeline 4: Topic Extraction

Identify 3-7 topic tags via noun phrase extraction and frequency analysis per the meeting-analysis skill. When Notion CLI is available and `--output` includes `notion`, check existing tags in the target database ("[FOS] Meetings" or fallback) Topics property and map to existing tags where possible for consistency.

For short transcripts (fewer than 500 words), note that some pipelines may return limited or empty results. Still run all four pipelines.

## Step 3: Save to Notion

Execute this step only if `--output=notion` or `--output=both`.

1. **Discover database**: Search Notion for a database named "[FOS] Meetings". If not found, try "Founder OS HQ - Meetings". If not found, fall back to "Meeting Intelligence Hub - Analyses". If none exists, warn: "No Meetings database found in Notion. Analysis displayed in chat only." Skip Notion save and continue.
2. **Idempotent check**: Query the database for an existing row matching Event ID (rich_text) when available, or both Meeting Title and Date as fallback. The row may have been created by P03 Meeting Prep Autopilot. If found, update that row with P07-owned fields only. If not found, create a new row.
3. **Set Source Type** to "Local File" or "Direct Input" based on input type.
4. **Populate P07-owned fields** with the analysis results: Meeting Title, Event ID (when available), Date, Attendees, Source Type, Summary, Decisions (formatted numbered list), Follow-Ups (list with owner, action, deadline), Topics, Duration, Generated At. If meeting attendees match CRM contacts, set the Company relation.
5. **Preserve P03 fields**: Do not overwrite Prep Notes, Talking Points, Importance Score, or Sources Used if they already have values on an existing row.

## Step 4: Present Report

Always display the analysis report in chat (this is the default output mode).

```
## Meeting Analysis Report

**Meeting**: [title]
**Date**: [date]
**Source**: [source_type]
**Attendees**: [comma-separated list or "Not identified"]

---

### Summary

[3-5 sentence meeting summary]

---

### Key Decisions

| # | Decision | Proposed By | Confidence |
|---|----------|-------------|------------|
| 1 | [decision text] | [proposer or "—"] | [Explicit/Inferred] |

[If no decisions detected: "None detected — no explicit decisions found in this transcript."]

---

### Follow-Up Commitments

| # | Owner | Action | Deadline | Mentioned By |
|---|-------|--------|----------|--------------|
| 1 | [who] | [what] | [deadline or "—"] | [mentioned_by or "—"] |

[If no follow-ups detected: "None detected — no follow-up commitments found."]

---

### Topics

[tag1] | [tag2] | [tag3] | ...

---
```

Include a metadata footer:

```
[If Notion saved: "**Saved to Notion**: [FOS] Meetings"]
```

## Step 5: Cross-Plugin Suggestions

After the report, display relevant suggestions:

```
### Next Steps

- Run `/founder-os:actions:extract-file [file-path]` for deeper action item extraction with priority scoring and Notion task creation
- Follow-up commitments above are compatible with `/founder-os:followup:check` for automated nudge tracking
```

Include the actual file path in the `/founder-os:actions:extract-file` suggestion only when the input was a file. Omit that suggestion for pasted text input.

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

Handle these conditions:

- **No input provided**: Prompt the user: "Provide a file path to a transcript, or paste the meeting text directly." Stop and wait.
- **File not found**: Halt with "File not found: [path]. Check the path and try again."
- **Empty transcript**: Halt with "No meeting content to analyze."
- **Notion CLI unavailable when `--output=notion`**: Warn "Notion CLI not configured -- displaying results in chat only. Re-run with Notion connected to save." Fall back to chat output. Do not halt the pipeline.
- **Non-English content**: Warn about reduced accuracy and proceed with best-effort extraction.

## Usage Examples

```
/founder-os:meeting:analyze meeting-notes.txt              # Analyze a local file
/founder-os:meeting:analyze notes.md --output=notion       # Analyze and save to Notion
/founder-os:meeting:analyze notes.md --output=both         # Analyze, save, and display
```

For pasted text:
```
/founder-os:meeting:analyze
[User pastes transcript text in conversation]
```
