---
description: Extract action items from a file and create Notion tasks
argument-hint: "[file-path]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:actions:extract-file

Read a file from disk (meeting transcript, email export, or document) and extract structured action items, then create Notion tasks automatically.

## Load Skill

Read the action-extraction skill at `${CLAUDE_PLUGIN_ROOT}/skills/actions/action-extraction/SKILL.md` for verb patterns, owner inference rules, deadline parsing, priority scoring, duplicate detection, and Notion task creation procedures.

## Parse Arguments

Extract the file path from `$ARGUMENTS`:
- `$1` (optional positional) — the file path to process

If no file path is provided:
1. Ask the user: "No file path provided. Enter a file path, or I can search for transcript/notes files in the current directory."
2. If the user asks to search, use Glob to find common transcript and notes files:
   - `**/*.txt`, `**/*.md`, `**/*transcript*`, `**/*meeting*`, `**/*notes*`, `**/*minutes*`
3. Present matching files as a numbered list and let the user pick one.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `actions` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `action-items`
- Command: `actions-extract-file`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'action-items' OR plugin IS NULL) AND (command = 'actions-extract-file' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Read File

1. Use the Read tool to read the file at the provided path. Do NOT use Filesystem MCP — use the built-in Read tool.
2. Validate the file:
   - If the file does not exist: halt with "File not found: [path]. Check the path and try again."
   - If the file is empty: halt with "File is empty: [path]. No content to extract action items from."
   - Supported formats: `.txt`, `.md`, `.csv`, `.log`, and other plain text files. If the file appears to be binary, halt with: "Unsupported file format. This command works with plain text files (.txt, .md, .csv, .log)."

## Extraction Process

1. **Detect source type**: Analyze the file content to determine if it is a meeting transcript, email thread, document, or other format. Use the source type detection rules from the skill.

2. **Extract source title**: Identify the title or subject:
   - Meeting transcript: Look for a title line, "Meeting:" header, or subject in metadata
   - Email: Extract the `Subject:` header
   - Document: Use the first heading or first meaningful line
   - Fallback: Use the filename (without extension) as the source title

3. **Scan for action items**: Apply the three-pass verb pattern scan from the skill (direct requests, implicit actions, commitment language). For meeting transcripts, also apply transcript-specific patterns.

4. **Build action items**: For each detected action, construct the full action item structure per the skill: title (verb-first, max 80 chars), description, owner (using inference rules), deadline (using parsing rules), priority (1-5), source_type, source_title, context.

5. **Deduplicate within batch**: Ensure no two action items from the same source have identical titles. Disambiguate by adding specificity from the text.

## Notion Integration

1. **Database discovery**: Search Notion for a database named "[FOS] Tasks". If not found, try "Founder OS HQ - Tasks". If not found, fall back to "Action Item Extractor - Tasks". If none exists, use graceful degradation (below). Do NOT create the database.
2. **Duplicate detection**: For each action item, query the database for tasks with similar titles created within the past 14 days, **filtered by `Type = "Action Item"`**. Apply the duplicate detection rules from the skill (verb+noun matching). Skip duplicates, cross-reference near-duplicates.
3. **Create tasks**: Create a Notion page for each new action item with all properties populated:
   - `Type` = "Action Item"
   - `Source Plugin` = "Action Extractor"
   - Title, Description, Owner, Deadline, Priority, Status ("To Do"), Source Type, Source Title, Extracted At (now)
   - `Company` / `Contact` relations when owner matches a CRM contact (see skill for matching rules)

## Graceful Degradation

If Notion CLI is unavailable or any Notion operation fails:
- Output all extracted action items as structured text in chat
- Format each item clearly with all fields (title, description, owner, deadline, priority, source type, source title)
- Warn: "Notion unavailable — displaying results in chat. Tasks were not saved to Notion. Configure Notion CLI per `/founder-os:setup:notion-cli`."

## Output Format

After processing, display results:

```
## Action Items Extracted

**Source**: [source_title] ([source_type])
**File**: [file_path]
**Items found**: [count]
**Created in Notion**: [count] new | [count] duplicates skipped

---

| # | Action Item | Owner | Deadline | Priority | Status |
|---|-------------|-------|----------|----------|--------|
| 1 | [title] | [owner] | [deadline or "—"] | [priority]/5 | [Created ✓ / Duplicate ⚠️] |
| 2 | ... | ... | ... | ... | ... |

[For each created task, include the Notion page link]
```

If no action items were found:
- Display: "No action items detected in [filename]. The file may not contain actionable requests, tasks, or commitments."

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
/founder-os:actions:extract-file meeting-notes-2026-02-25.md
/founder-os:actions:extract-file ~/Documents/transcripts/standup-recap.txt
/founder-os:actions:extract-file ./project-kickoff-notes.md
/founder-os:actions:extract-file                                    # Interactive file search
```
