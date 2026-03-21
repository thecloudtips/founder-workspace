---
description: Deploy a pre-built Notion database template or list available templates
argument-hint: "[template-name] [--parent=NAME]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# /founder-os:notion:template

Deploy a pre-built business database template or list available templates. Templates provide complete Notion database schemas with properties, options, and suggested views — ready for immediate use.

## Load Skills

Read the notion-database-design skill at `skills/notion/notion-database-design/SKILL.md` for schema design best practices and template deployment protocol.

Read the notion-operations skill at `skills/notion/notion-operations/SKILL.md` for Notion CLI tool usage, workspace discovery, and database creation operations.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `[template-name]` (optional) -- name of the template to deploy. If omitted, list all available templates. Accepts exact names ("CRM Contacts") and common variations ("CRM", "contacts", "project", "calendar", "meetings", "wiki").
- `--parent=NAME` (optional) -- name of the parent page under which to create the database. If omitted, ask the user where to create it.

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
- Command: `notion-template`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'notion-command-center' OR plugin IS NULL) AND (command = 'notion-template' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Step 1: List or Select Template

### No template name provided

Display the template catalog:

```
Available Notion Database Templates:

1. CRM Contacts — Track business contacts, leads, and client relationships (12 properties)
2. Project Tracker — Track projects with tasks, deadlines, and ownership (10 properties)
3. Content Calendar — Plan and track content creation across channels (11 properties)
4. Meeting Notes — Record meeting details, decisions, and action items (8 properties)
5. Knowledge Wiki — Organize team knowledge and reference material (9 properties)

Deploy with: /founder-os:notion:template [name]
Example: /founder-os:notion:template "Project Tracker" --parent="My Workspace"
```

Stop here. Wait for the user to invoke the command again with a template name.

### Template name provided

Match the user's input to a template. Accept these variations:

| User input | Maps to |
|-----------|---------|
| "CRM", "CRM Contacts", "contacts", "crm" | CRM Contacts |
| "Project", "Project Tracker", "tasks", "task tracker" | Project Tracker |
| "Content", "Content Calendar", "editorial", "calendar" | Content Calendar |
| "Meeting", "Meeting Notes", "meetings" | Meeting Notes |
| "Wiki", "Knowledge Wiki", "knowledge base", "kb" | Knowledge Wiki |

If the input doesn't match any template, display: "Unknown template '[input]'. Available templates:" followed by the catalog list.

## Step 2: Resolve Parent

If `--parent=NAME` is provided:
1. Search Notion for the parent page using `node ../../../.founderOS/scripts/notion-tool.mjs search`.
2. Disambiguate if multiple matches (numbered list with context).
3. If not found, offer to create at workspace root.

If `--parent` is omitted:
- Ask: "Where should the [Template Name] database be created? Provide a parent page name, or say 'workspace root'."

## Step 3: Load Template Schema

Read the complete template definition from `skills/notion/notion-database-design/references/templates.md`. Each template defines:
- Property names and types
- Default options for Select/Multi-select properties
- Suggested default view (Board, Table, or Calendar)

## Step 4: Confirm Before Creating

Present the full schema for user approval:

```
Deploying: [Template Name]
Parent: [Parent page name]

| Property | Type | Options/Config |
|----------|------|----------------|
| [Name] | Title | -- |
| [Status] | Status | [options] |
| ... | ... | ... |

Properties: [count]
Suggested view: [view type] by [property]

Create this database? (yes / no / modify)
```

If the user says "modify", ask which properties to add, remove, or change. Apply modifications and re-present. Use the notion-database-design skill's property type selection table for any new properties.

If the user says "no", stop. Display: "Template deployment canceled."

## Step 5: Create Database

1. Run `node ../../../.founderOS/scripts/notion-tool.mjs create-database <parent-id> --title '<name>' --properties '<json>'` with the template title and complete property schema.
2. If creation succeeds, display:

```
Database deployed: [Template Name]
Parent: [Parent page name]
Properties: [count] properties configured
Suggested view: [view type] grouped/sorted by [property]
URL: [Notion URL]

Tip: Open the database in Notion to switch to the suggested [view type] view.
```

3. If creation fails, report the error with common fixes:
   - Parent page not shared with integration → share the page
   - Duplicate database name → the database may already exist
   - API error → retry or check Notion status

## Graceful Degradation

**Notion CLI unavailable**: Stop execution. Display:
"Notion CLI is not configured. The Notion Command Center requires Notion to function.
Run `/founder-os:setup:notion-cli` for setup."

**Parent page not found**: Offer to create at workspace root or ask for alternative name.

**Database creation fails**: Report the specific error. Suggest checking that the parent page is shared with the Notion integration.

**Permission errors**: Report that the Notion integration may not have permission to create databases under the specified parent.

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
/founder-os:notion:template
/founder-os:notion:template CRM Contacts --parent="Sales"
/founder-os:notion:template "Project Tracker"
/founder-os:notion:template wiki --parent="Team Knowledge"
/founder-os:notion:template meetings
/founder-os:notion:template Content Calendar --parent="Marketing"
```
