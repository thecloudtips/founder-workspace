---
description: Generate a proposal from an existing brief file or Notion page
argument-hint: "[file-or-url] --client=NAME --output=PATH"
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# /founder-os:proposal:from-brief

Generate a complete professional proposal from an existing brief file (local .md/.txt) or a Notion page URL. Extracts client information, project details, and constraints from the brief, then produces a 7-section proposal with 3 pricing packages.

## Load Skills

Read the proposal-writing skill at `${CLAUDE_PLUGIN_ROOT}/skills/proposal/proposal-writing/SKILL.md` for the 7-section proposal structure, writing style rules, formatting standards, quality checklist, and output file conventions.

Read the pricing-strategy skill at `${CLAUDE_PLUGIN_ROOT}/skills/proposal/pricing-strategy/SKILL.md` for 3-tier pricing philosophy, package naming, pricing calculation frameworks, scope differentiation rules, comparison table layout, and payment terms patterns.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `[file-or-url]` (required) — Path to a local .md or .txt file, OR a Notion page URL. If not provided, prompt: "Provide the path to a brief file (.md or .txt) or a Notion page URL."
- `--client=NAME` (optional) — Override the client name extracted from the brief.
- `--output=PATH` (optional, default: `./proposals/`) — Output directory for generated files.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `proposal` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `proposal-automator`
- Command: `proposal-from-brief`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'proposal-automator' OR plugin IS NULL) AND (command = 'proposal-from-brief' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

### Step 1: Load Brief

Determine the source type from the argument:

**Local file** (path ending in .md, .txt, or not starting with http):
- Read the file using the Read tool
- If file not found, report error: "File not found: [path]. Check the file path and try again."

**Notion page** (URL starting with http and containing notion):
- Use `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs fetch <notion-url>` to retrieve page content
- If Notion CLI unavailable, report: "Notion CLI is unavailable or not configured. Provide a local file path instead, or run `/founder-os:setup:notion-cli` to configure."

### Step 2: Extract Brief Contents

Parse the loaded content to extract:
- **Client name**: Look for "Client:", "Company:", "For:", or heading with client name. Override with `--client` if provided.
- **Project description**: Look for "Project Overview", "Description", "Summary", or the first substantial paragraph.
- **Deliverables**: Look for "Deliverables", "Features", "Requirements", or bulleted/numbered lists.
- **Constraints**: Look for "Budget", "Timeline", "Deadline", "Constraints", or contextual mentions.
- **Special requirements**: Look for "Requirements", "Notes", "Preferences", or contextual mentions.

If the client name cannot be determined and `--client` is not provided, ask: "Could not determine the client name from the brief. Who is this proposal for?"

### Step 3: Resolve CRM Context

If Notion CLI is available:
- Search CRM Pro "Companies" database for the extracted client name using `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "<client-name>" --filter page`
- Retrieve industry, past projects, relationship history if found
- Use context to enrich Cover Letter and Understanding & Approach sections

If Notion CLI is unavailable, proceed without CRM data.

### Step 4: Generate Proposal

Follow the same generation logic as `/founder-os:proposal:create` from Step 3 onward:

1. Generate 7-section proposal using the extracted brief contents and CRM context
2. Read the proposal template at `${CLAUDE_PLUGIN_ROOT}/templates/proposal-template.md` as scaffold
3. Consult `${CLAUDE_PLUGIN_ROOT}/skills/proposal/proposal-writing/references/section-templates.md` for section examples
4. Consult `${CLAUDE_PLUGIN_ROOT}/skills/proposal/pricing-strategy/references/pricing-models.md` for pricing calculations
5. Apply all writing style rules and quality checklist from the proposal-writing skill

### Step 5: Save Files

Determine the output directory (default: `./proposals/`). Create it if it does not exist.

Generate the client slug from the client name.

Save two files:
1. **Proposal**: `[output-dir]/proposal-[client-slug]-[YYYY-MM-DD].md`
2. **SOW Brief**: `[output-dir]/brief-[client-slug]-[YYYY-MM-DD].md`

### Step 6: Update Notion

If Notion CLI is available, create or update a record following the same Notion integration steps as `/founder-os:proposal:create`:

1. **Database discovery**: Search for "[FOS] Deliverables" first, fall back to "Founder OS HQ - Deliverables", then legacy "Proposal Automator - Proposals", skip if none exists (do NOT create the database).
2. **Type**: Set to "Proposal" when writing to "Founder OS HQ - Deliverables".
3. **Company + Deal relations**: Look up client name in CRM Pro "Companies" database and set relation properties if matches are found (HQ Deliverables only).
4. **Upsert key**: Client Name + Project Title, filtered by Type = "Proposal" when using HQ Deliverables.
5. **Sources Used**: Include "Brief File" and optionally "CRM" if CRM data was used.

### Step 7: Present Summary

Display the same output summary format as `/founder-os:proposal:create`, including the package comparison table, file paths, and Notion status.

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

- **Notion CLI unavailable**: Cannot load Notion pages — require local file. Skip CRM context and proposal tracking.
- **Brief file not found**: Report error with the attempted path.
- **Brief lacks key information**: Generate proposal with available data, mark gaps with `<!-- NEEDS REVIEW -->` comments, and note what is missing in the output summary.
- **Output directory not writable**: Output proposal content to chat.

## Usage Examples

```
/founder-os:proposal:from-brief briefs/acme-project.md
/founder-os:proposal:from-brief scope-notes.txt --client="Acme Corp"
/founder-os:proposal:from-brief https://www.notion.so/page-id --output=./proposals/
/founder-os:proposal:from-brief meeting-notes.md --client="TechStart" --output=./client-proposals/
```
