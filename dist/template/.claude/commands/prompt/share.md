---
description: Share a prompt with your team
argument-hint: "[name]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:prompt:share

Share a prompt with your team by updating its Visibility from Personal to Shared in the Notion prompt library.

## Load Skills

Load the prompt-management skill from `skills/prompt/prompt-management/SKILL.md` for Notion DB discovery and prompt lookup logic.

## Parse Arguments

Extract the prompt name from the argument. If no argument is provided, ask the user: "Which prompt would you like to share? Please provide the prompt name."

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
- Command: `prompt-share`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'prompt-library' OR plugin IS NULL) AND (command = 'prompt-share' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Steps

1. **Discover the Notion DB** — Use the prompt-management skill to locate the prompts database. Search for "[FOS] Prompts" first. If not found, try "Founder OS HQ - Prompts". If not found, fall back to "Team Prompt Library - Prompts". If none is found, inform the user that the prompt library has not been set up yet and suggest running `/founder-os:prompt:add` first.

2. **Find the prompt** — Search the database for a page where the Name property matches the provided name (case-insensitive). If no exact match is found:
   - Search for pages where the Name contains any word from the provided name
   - Present up to 3 similar matches to the user: "Could not find '[name]'. Did you mean one of these? [list]"
   - If no similar matches exist, inform the user: "No prompt named '[name]' was found in the library."

3. **Check current Visibility** — Read the Visibility property of the matched prompt page.
   - If Visibility is already "Shared", inform the user: "The prompt '[name]' is already shared with your team. No changes made."
   - Stop here.

4. **Update Visibility** — Update the Visibility property from "Personal" to "Shared" on the matched prompt page.

5. **Confirm change** — Report success to the user:
   ```
   Prompt shared successfully.

   Name: [prompt name]
   Visibility: Personal → Shared

   Your team can now find this prompt using /founder-os:prompt:list or /founder-os:prompt:get.
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

- **Notion unavailable**: Inform the user that Notion CLI is required for this command and cannot proceed without it.
- **Multiple exact matches**: Present all matches with their tags and creation dates so the user can clarify which one to share.
- **Update fails**: Report the error and suggest the user check their Notion permissions.

## Usage Examples

```
/founder-os:prompt:share "Weekly Status Update"
/founder-os:prompt:share cold-email-opener
/founder-os:prompt:share "Client Onboarding Welcome"
```
