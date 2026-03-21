---
description: Update a Notion page's properties or append content using natural language
argument-hint: "[page] [changes] [--append]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# /founder-os:notion:update

Find a Notion page by title or URL, then update its properties or append content based on a natural language description of changes. Confirm before executing.

## Load Skills

Read the notion-operations skill at `skills/notion/notion-operations/SKILL.md` for Notion CLI tool usage, workspace discovery, page operations (reading, updating), property value mapping, and content block formatting.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `[page]` (required) -- the page title or Notion URL to update. If the input contains a Notion URL (starts with `https://www.notion.so/` or `https://notion.so/`), use it directly. Otherwise, treat as a title search query.
- `[changes]` (required) -- the natural language description of what to change. Everything after the page identifier. If no changes are described, prompt the user: "What changes would you like to make to this page?" Wait for a response.
- `--append` (optional flag) -- append content to the page body instead of updating properties. Without this flag, changes are interpreted as property updates by default.

**Argument parsing heuristic**: The page identifier is the first quoted string, or the first recognizable Notion URL, or the text before common change verbs ("set", "change", "update", "mark", "add"). Everything after is the change description.

Examples:
- `"Project Alpha" set status to Done` → page="Project Alpha", changes="set status to Done"
- `https://notion.so/abc123 add a note about the delay` → page=URL, changes="add a note about the delay"
- `Weekly Report mark as complete` → page="Weekly Report", changes="mark as complete"

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `notion` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `notion-command-center`
- Command: `notion-update`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'notion-command-center' OR plugin IS NULL) AND (command = 'notion-update' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Step 1: Find the Page

1. **URL provided**: Run `node ../../../.founderOS/scripts/notion-tool.mjs fetch <url>`. Skip to Step 2.
2. **Title search**: Run `node ../../../.founderOS/scripts/notion-tool.mjs search '<title>'`.
3. **Single match**: Proceed to Step 2.
4. **Multiple matches**: Present a disambiguated list following the notion-operations skill's disambiguation rules:

```
Found [N] pages matching "[title]":
1. [Title] (under [Parent], edited [date])
2. [Title] (under [Parent], edited [date])
3. [Title] (under [Parent], edited [date])

Which page? (Enter number)
```

Wait for the user's selection.

5. **No matches**: Report: "Could not find a page matching '[title]'. Check the spelling or provide a direct Notion URL." Suggest broader search terms.

## Step 2: Read Current State

1. Run `node ../../../.founderOS/scripts/notion-tool.mjs get-page <page-id>` to read the full page.
2. Extract current properties (name, type, current value for each).
3. Extract current body content (summarize structure: number of blocks, headings, lists).
4. Store this state for the before/after comparison.

## Step 3: Parse Changes

Determine what the user wants to change and map to API operations.

### Property Updates (default mode, no --append flag)

Apply the property value mapping from the notion-operations skill:

1. **Identify target properties** -- match the user's language to existing page properties:
   - "set status to Done" → Status property
   - "change priority to High" → Priority property (Select)
   - "update the date to next Friday" → Date property
   - "assign to Sarah" → People property
   - "tag it as Marketing" → Multi-select property
   - "set the amount to 5000" → Number property
   - "mark as checked/complete/done" → Checkbox property or Status property

2. **Validate** -- check that the target property exists on the page and the value is compatible. Consult `skills/notion/notion-operations/references/workspace-patterns.md` for the full property value mapping table.

3. **Handle mismatches**:
   - Property not found: List available properties and suggest the closest match.
   - Value incompatible: Explain what values the property accepts.
   - Ambiguous target: Ask which property the user means.

### Content Append (--append flag)

1. Parse the content from the changes description.
2. Apply content block formatting rules from the notion-operations skill.
3. Content will be appended after existing page content with a divider separator.

## Step 4: Confirm Changes

Present a summary of planned changes before executing:

### For property updates:

```
Updating: [Page Title]
URL: [Notion URL]

Changes:
| Property | Current | New |
|----------|---------|-----|
| Status | In Progress | Done |
| Priority | Medium | High |
| Due Date | (empty) | 2026-03-15 |

Apply these changes? (yes / no)
```

### For content append:

```
Appending to: [Page Title]
URL: [Notion URL]

New content to add:
---
[formatted content preview]
---

This will be added after the existing [N] blocks on the page.

Append this content? (yes / no)
```

Wait for the user's confirmation. If the user says "no", ask what they'd like to change.

## Step 5: Execute and Report

1. **Execute** -- run `node ../../../.founderOS/scripts/notion-tool.mjs update-page <page-id> --properties '<json>'`.
2. **Report** -- show the before/after summary:

### For property updates:

```
Updated: [Page Title]

| Property | Before | After |
|----------|--------|-------|
| Status | In Progress | Done |
| Priority | Medium | High |

URL: [Notion URL]
```

### For content append:

```
Content appended to: [Page Title]
Added: [count] blocks ([brief description])
URL: [Notion URL]
```

## Graceful Degradation

**Notion CLI unavailable**: Stop execution. Display:
"Notion CLI is not configured. The Notion Command Center requires Notion to function.
Run `/founder-os:setup:notion-cli` for setup."

**Page not found**: Suggest alternative search terms or ask for a direct URL.

**Update fails**: Report the error. Common causes:
- Property is read-only (Created Time, Created By, Last Edited)
- Value format doesn't match property type
- Page is locked or archived
- Integration doesn't have write access

**Permission errors**: Report that the Notion integration may not have write access to this page. Suggest checking the integration's page permissions.

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
/founder-os:notion:update "Project Alpha" set status to Done
/founder-os:notion:update "Q2 Marketing Plan" change priority to High and assign to Sarah
/founder-os:notion:update https://notion.so/abc123 mark as complete
/founder-os:notion:update "Weekly Report" update the due date to next Friday
/founder-os:notion:update "Team Meeting Notes" --append Add action item: Review budget proposal by EOW
/founder-os:notion:update "Client Brief" --append ## Next Steps\n- Schedule kickoff call\n- Send NDA
```
