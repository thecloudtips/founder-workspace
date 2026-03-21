---
description: Create a Notion page or database from a natural language description
argument-hint: "[description] [--type=page|database] [--parent=NAME]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# /founder-os:notion:create

Create a new Notion page or database from a natural language description. Detect whether the user wants a page or a database, design the appropriate structure, and create it via the Notion CLI tool.

## Load Skills

Read the notion-operations skill at `skills/notion/notion-operations/SKILL.md` for Notion CLI tool usage, workspace discovery, page operations, database operations, and content block formatting.

Read the notion-database-design skill at `skills/notion/notion-database-design/SKILL.md` for natural language to schema translation, property type selection, schema design best practices, and pre-built templates.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `[description]` (required) -- the natural language description of what to create. This is all non-flag text. If empty, prompt the user: "What would you like to create in Notion? Describe a page or database." Wait for a response.
- `--type=page|database` (optional) -- explicitly specify the type. If omitted, auto-detect from the description.
- `--parent=NAME` (optional) -- name of the parent page under which to create. If omitted, create at workspace root (pages) or prompt for parent (databases, which require a parent page).

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
- Command: `notion-create`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'notion-command-center' OR plugin IS NULL) AND (command = 'notion-create' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Step 1: Detect Intent

Determine whether the user wants a page or a database.

**Auto-detection signals:**

Database signals (create a database):
- Words like "tracker", "table", "database", "spreadsheet", "board", "list of [plural noun]", "catalog"
- Descriptions mentioning properties, columns, or fields: "with status, priority, and due date"
- Descriptions implying multiple records: "track my tasks", "manage contacts", "log expenses"

Page signals (create a page):
- Words like "page", "document", "note", "wiki", "article", "brief"
- Descriptions with prose content: "meeting notes for...", "a page about...", "project overview"
- Single-entity descriptions: "a summary of Q4 results", "my weekly plan"

If the `--type` flag is provided, use it directly. If auto-detection is ambiguous, ask the user: "Should I create this as a page (single document) or a database (structured table with multiple entries)?"

## Step 2: Resolve Parent

If `--parent=NAME` is provided:
1. Search Notion for the parent page using `node ../../../.founderOS/scripts/notion-tool.mjs search` with the name.
2. If multiple matches, present a numbered list with parent context and last edited date. Ask the user to pick.
3. If no matches, report: "Could not find a page named '[NAME]'. Would you like to create at the workspace root instead, or provide a different parent name?"

If `--parent` is omitted:
- For pages: create at workspace root.
- For databases: databases require a parent page. Ask: "Which page should this database be created under? (Provide a page name, or say 'workspace root' to use the top level.)" If the user says workspace root, create under a general-purpose parent or at the top level if the API allows.

## Step 3: Create Page

When creating a page:

1. **Extract title** -- identify the page title from the description. If the description is a sentence ("meeting notes for the Q1 kickoff"), derive a concise title ("Q1 Kickoff Meeting Notes").
2. **Extract content** -- identify any initial content the user described. Apply the content block formatting rules from the notion-operations skill to convert text to appropriate Notion block types (paragraphs, headings, lists, to-dos, code blocks).
3. **Create** -- run `node ../../../.founderOS/scripts/notion-tool.mjs create-page <parent-id> --properties '<json>' --content '<json>'`.
4. **Confirm** -- display the created page:

```
Page created: [Title]
Parent: [Parent name or "Workspace root"]
URL: [Notion URL]
```

## Step 4: Create Database

When creating a database:

1. **Translate schema** -- apply the notion-database-design skill's translation pipeline:
   - Extract entities and attributes from the description.
   - Infer implicit attributes (e.g., Status for trackers).
   - Map each attribute to the appropriate Notion property type.
   - Design default options for Select/Multi-select properties.

2. **Present schema for confirmation** -- show the proposed schema:

```
Database: [Title]
Parent: [Parent page name]

| Property | Type | Options/Config |
|----------|------|----------------|
| [Name] | Title | -- |
| [Status] | Status | To Do, In Progress, Done |
| ... | ... | ... |

Suggested view: [Board/Table/Calendar] grouped/sorted by [property]

Create this database? (yes / no / modify)
```

3. **Handle modification** -- if the user says "modify", ask what to change. Update the schema and re-present.
4. **Create** -- once confirmed, run `node ../../../.founderOS/scripts/notion-tool.mjs create-database <parent-id> --title '<name>' --properties '<json>'`.
5. **Confirm** -- display the created database:

```
Database created: [Title]
Parent: [Parent page name]
Properties: [count] properties configured
Suggested view: [view type]
URL: [Notion URL]
```

## Graceful Degradation

**Notion CLI unavailable**: Stop execution. Display:
"Notion CLI is not configured. The Notion Command Center requires Notion to function.
Set your `NOTION_API_KEY` environment variable and ensure the Notion integration has access to your workspace pages.
Run `/founder-os:setup:notion-cli` for setup."

**Parent page not found**: Offer to create at workspace root or ask for alternative name.

**Database creation fails**: Report the error. Common causes: parent page not shared with the integration, property schema validation error. Suggest fixes.

**Permission errors**: Report that the Notion integration may not have access. Suggest sharing the parent page with the integration.

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
/founder-os:notion:create A project tracker for our Q2 marketing campaigns with status, priority, owner, and launch date
/founder-os:notion:create Meeting notes for the weekly standup --parent="Team Wiki"
/founder-os:notion:create --type=database A CRM for tracking sales leads with name, company, email, status, and deal value
/founder-os:notion:create --type=page Project brief for the mobile app redesign
/founder-os:notion:create A simple task list for onboarding new employees --parent="HR"
```
