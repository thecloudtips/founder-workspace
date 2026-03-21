---
description: List and search prompts from your team library
argument-hint: "[category] [--search=keyword] [--limit=N]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:prompt:list

List and search prompts from the team prompt library, filtered by category or keyword.

## Load Skills

Read the prompt-management skill at `skills/prompt/prompt-management/SKILL.md` before proceeding.

## Parse Arguments

Extract from `$ARGUMENTS`:
- **category** (optional positional): Filter by prompt category (e.g., `sales`, `support`, `writing`)
- **--search=keyword** (optional): Filter prompts whose name, description, or tags contain the keyword
- **--limit=N** (optional): Maximum number of results to display (default: 20)

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `prompt` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `prompt-library`
- Command: `prompt-list`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'prompt-library' OR plugin IS NULL) AND (command = 'prompt-list' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Step 1: Verify Notion Availability

Check that the Notion CLI tool is connected. If Notion is unavailable, display:

```
Error: Notion CLI is required for /founder-os:prompt:list.
Run `/founder-os:setup:notion-cli` for setup.
```

Then stop.

## Step 2: Locate the Team Prompt Library Database

Search the user's Notion workspace for a database named "[FOS] Prompts". If not found, try "Founder OS HQ - Prompts". If not found, fall back to "Team Prompt Library - Prompts".

If neither database exists, display:

```
Your Team Prompt Library is empty — no prompts have been added yet.

Get started with:
  /founder-os:prompt:add "My First Prompt" [prompt-text] --category="Email Templates"
```

Then stop.

## Step 3: Query Prompts

Query the discovered prompts database with the following filters applied in combination:

1. If **category** was provided: filter where Category property equals the given category (case-insensitive match).
2. If **--search** was provided: filter where Name, Description, or Tags contain the keyword (use Notion text search across these fields).
3. Apply **--limit** (default 20) to cap the number of results returned.

Sort results by Times Used descending, then by Name ascending as a tiebreaker.

## Step 4: Display Results

If no prompts match the filters, display:

```
No prompts found matching your criteria.

Try:
  /founder-os:prompt:list                  (show all prompts)
  /founder-os:prompt:list --search=email   (search by keyword)
```

If prompts are found, display a formatted table:

```
Team Prompt Library  (showing X of Y total)

Name                     Category     Visibility   Times Used
─────────────────────────────────────────────────────────────
Cold Outreach Opener     sales        team         42
Weekly Status Update     writing      personal     17
Support Escalation       support      team         9
...

Filter: category=sales, search="email", limit=20
```

Column definitions:
- **Name**: The prompt name/title
- **Category**: The prompt category tag
- **Visibility**: `team` (shared) or `personal` (private)
- **Times Used**: Usage count from the Times Used property

If no filters were applied, omit the Filter line at the bottom.

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

- **Notion unavailable**: Show error message with setup wizard reference (see Step 1).
- **Database missing**: Show empty library message with onboarding hint (see Step 2).
- **No results for filters**: Show "no prompts found" message with alternative suggestions (see Step 4).
- **Category property missing on some records**: Display those records with a blank Category column rather than omitting them.
- **Times Used missing**: Display `—` in the Times Used column for those records.

## Usage Examples

```
/founder-os:prompt:list
/founder-os:prompt:list sales
/founder-os:prompt:list --search=email
/founder-os:prompt:list --search=onboarding --limit=5
/founder-os:prompt:list support --limit=10
/founder-os:prompt:list writing --search=newsletter
```
