---
description: Generate a professional client proposal with 7 sections and 3 pricing packages
argument-hint: "[client] --output=PATH --brief=FILE"
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# /founder-os:proposal:create

Generate a complete professional proposal for a client with 7 structured sections and 3 pricing packages. Save the proposal and a SOW-compatible brief file for handoff to `/founder-os:sow:from-brief`.

## Load Skills

Read the proposal-writing skill at `skills/proposal/proposal-writing/SKILL.md` for the 7-section proposal structure, writing style rules, formatting standards, quality checklist, and output file conventions.

Read the pricing-strategy skill at `skills/proposal/pricing-strategy/SKILL.md` for 3-tier pricing philosophy, package naming, pricing calculation frameworks, scope differentiation rules, comparison table layout, and payment terms patterns.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `[client]` (optional) — Client name. If not provided, ask the user: "Who is this proposal for? Provide the client or company name."
- `--output=PATH` (optional, default: `./proposals/`) — Output directory for generated files.
- `--brief=FILE` (optional) — Path to an existing brief file to use as input instead of interactive collection.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
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
- Command: `proposal-create`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'proposal-automator' OR plugin IS NULL) AND (command = 'proposal-create' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

### Step 1: Resolve Client Context

Search for client information to personalize the proposal:

1. If Notion CLI is available, search CRM Pro databases:
   - Search "Companies" database for the client name (fuzzy match) using `node ../../../.founderOS/scripts/notion-tool.mjs search "<client-name>" --filter page`
   - If found, retrieve: industry, past projects, relationship history, key contacts
   - Search "Deals" database for past engagements with this client
   - Summarize found context for use in Cover Letter and Understanding & Approach sections
2. If Notion CLI is unavailable, proceed without CRM data — note this in the output

### Step 2: Collect Project Brief

If `--brief=FILE` is provided:
- Read the file using the Read tool
- Extract: project description, goals, deliverables, timeline, budget range, special requirements
- Confirm extracted details with the user before proceeding

If no brief file is provided, collect interactively using AskUserQuestion:
- **Project description and goals**: "Describe the project. What does the client need and what are the key goals?"
- **Key deliverables or features**: "What are the main deliverables or features to include?"
- **Target timeline**: "What is the target timeline? (e.g., 8 weeks, 3 months)"
- **Budget range**: "Is there a known budget range? (Enter 'unknown' if not specified)"
- **Special requirements**: "Any special requirements, constraints, or preferences?"

### Step 3: Generate Proposal

Using the collected brief and CRM context, generate the complete 7-section proposal following the proposal-writing skill:

1. **Cover Letter** — Personalize with CRM context if available. Reference the client's specific situation.
2. **Executive Summary** — Problem-solution-value framework. Under 300 words.
3. **Understanding & Approach** — Demonstrate comprehension of the client's situation. Identify underlying challenges.
4. **Scope of Work** — Deliverables table with acceptance criteria. Explicit exclusions and assumptions.
5. **Timeline & Milestones** — Phase breakdown with single week numbers. Map every deliverable.
6. **Pricing** — 3 packages following the pricing-strategy skill. Comparison table leads with scope, not price. Mark recommended package.
7. **Terms & Conditions** — Payment terms, change control, IP, confidentiality.

Read the proposal template at `../../../.founderOS/templates/proposal-template.md` as a structural scaffold.

For detailed section examples, consult `skills/proposal/proposal-writing/references/section-templates.md`.

For pricing calculation examples, consult `skills/proposal/pricing-strategy/references/pricing-models.md`.

### Step 4: Save Files

Determine the output directory (default: `./proposals/`). Create it if it does not exist.

Generate the client slug: lowercase the client name, replace spaces with hyphens, remove special characters.

Save two files:
1. **Proposal**: `[output-dir]/proposal-[client-slug]-[YYYY-MM-DD].md` — The complete 7-section proposal
2. **SOW Brief**: `[output-dir]/brief-[client-slug]-[YYYY-MM-DD].md` — Structured brief file following the SOW-compatible format from the proposal-writing skill

### Step 5: Update Notion

If Notion CLI is available:

1. **Database discovery** (ordered):
   - Search for "Founder OS HQ - Deliverables" database using `node ../../../.founderOS/scripts/notion-tool.mjs search "Deliverables" --filter database`
   - If not found, fall back to legacy "Proposal Automator - Proposals" database
   - If neither exists, skip Notion tracking and note it in the output (do NOT create the database)

2. **Resolve Company + Deal relations** (only when writing to "Founder OS HQ - Deliverables"):
   - Look up the client name in the CRM Pro "Companies" database
   - If a matching company is found, set the **Company** relation property
   - If a deal was identified during CRM context resolution (Step 1), set the **Deal** relation property
   - If no match is found, leave relation properties empty

3. **Idempotent upsert**: Check for existing record with same Client Name + Project Title. When using "Founder OS HQ - Deliverables", also filter by **Type = "Proposal"** to avoid collisions with other deliverable types.

4. Create or update the record:
   - **Type**: "Proposal" (when writing to HQ Deliverables)
   - Project Title: extracted from brief
   - Client Name: from arguments
   - Status: "Draft"
   - Package Selected: "None"
   - Total Amount: 0
   - Proposal File: path to saved proposal
   - Brief File: path to saved brief
   - Generated At: current date
   - Sources Used: list of sources used (CRM, Brief File, Interactive)
   - **Company**: relation to matched Companies record (if found)
   - **Deal**: relation to matched Deals record (if found)

If Notion is unavailable, skip this step and note it in the output.

### Step 6: Present Summary

Display the output summary:

```
## Proposal Generated

**Client**: [Client Name]
**Output**: [proposal file path]
**SOW Brief**: [brief file path] (use with /founder-os:sow:from-brief)
**Saved to Notion**: [Yes/No]

### Package Summary
| Package | Timeline | Price | Scope |
|---------|----------|-------|-------|
| [Starter Name] | N weeks | $XX,XXX | Core deliverables |
| **[Professional Name] ✓** | N weeks | $XX,XXX | Core + enhancements |
| [Enterprise Name] | N weeks | $XX,XXX | Full vision |

_Recommended: [Professional Name] package_
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

- **Notion unavailable**: Skip CRM context and proposal tracking. Output full proposal to files and chat.
- **Brief file not found**: Report the error and ask for a valid path.
- **Output directory not writable**: Output proposal content to chat with a warning.

## Usage Examples

```
/founder-os:proposal:create Acme Corp
/founder-os:proposal:create "NaluForge Inc" --output=./client-proposals/
/founder-os:proposal:create --brief=briefs/project-alpha.md
/founder-os:proposal:create "TechStart" --brief=scope-notes.txt --output=./proposals/
```
