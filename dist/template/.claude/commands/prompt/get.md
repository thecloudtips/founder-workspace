---
description: Retrieve a prompt with interactive variable substitution
argument-hint: "[name]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:prompt:get

Retrieve a single prompt by name from the Team Prompt Library, collect values for any `{{variable}}` placeholders via interactive prompting, and output the fully substituted prompt ready to use.

## Load Skills

Read the prompt-management skill at `skills/prompt/prompt-management/SKILL.md` before proceeding.

## Parse Arguments

Extract from `$ARGUMENTS`:

- **name** (required positional): The name of the prompt to retrieve. This is all text provided before any `--` flags. If no name is provided, ask the user: "Which prompt would you like to retrieve? Provide the prompt name." Then stop and wait for input.

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
- Command: `prompt-get`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'prompt-library' OR plugin IS NULL) AND (command = 'prompt-get' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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
Error: Notion CLI is required for /founder-os:prompt:get.
Run `/founder-os:setup:notion-cli` for setup.
```

Then stop.

## Step 2: Locate the Team Prompt Library Database

Search the user's Notion workspace for a database named "[FOS] Prompts". If not found, try "Founder OS HQ - Prompts". If not found, fall back to "Team Prompt Library - Prompts".

If neither database exists, display:

```
Your Team Prompt Library is empty — no prompts have been added yet.

Get started with:
  /founder-os:prompt:add [prompt-text] --name="My First Prompt" --category=general
```

Then stop.

## Step 3: Search for the Prompt by Name

Query the discovered prompts database for a page whose `Name` property matches the requested name. Apply case-insensitive matching.

If an exact match (case-insensitive) is found, proceed to Step 4.

If no exact match is found, search for partial matches: query for pages whose `Name` contains any word from the requested name. Collect up to 5 partial matches sorted by `Times Used` descending.

If partial matches are found, display:

```
Prompt not found: "[requested name]"

Did you mean one of these?

1. [Name] — [Category]  (used [N] times)
2. [Name] — [Category]  (used [N] times)
3. [Name] — [Category]  (used [N] times)

Run /founder-os:prompt:list to browse all prompts, or /founder-os:prompt:get "[exact name]" to retry.
```

Then stop.

If no matches at all are found (exact or partial), display:

```
Prompt not found: "[requested name]"

No similar prompts were found in your library. Check the name and try again.

Run /founder-os:prompt:list to browse all available prompts.
```

Then stop.

## Step 4: Display Prompt Metadata

Display the prompt metadata before showing the content:

```
## [Name]

- **Category**: [Category]
- **Visibility**: [Personal / Shared]
- **Author**: [Author]
- **Tags**: [tag1, tag2, ...]  (or "None" if empty)
- **Times Used**: [N]
- **Last Used**: [YYYY-MM-DD]  (or "Never" if null)
```

## Step 5: Detect Variables

Apply the variable detection regex from the prompt-management skill to the prompt's `Content` field:

```
\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}
```

Extract all unique variable names (case-insensitive deduplication). Preserve the original casing of the first occurrence of each variable name for display purposes.

If **no variables are detected**, skip Step 6 and proceed directly to Step 7 with the prompt content as-is.

If **variables are detected**, display them before collecting values:

```
This prompt contains [N] variable(s) that need values:
  {{variable_1}}, {{variable_2}}, ...
```

Then proceed to Step 6.

## Step 6: Collect Variable Values (only if variables were detected)

For each unique variable detected, use AskUserQuestion to collect a value. Ask one variable at a time in the order they first appear in the prompt content.

Prompt format for each variable:

```
Enter value for {{variable_name}}:
```

If a variable name uses a suffix convention, include a hint in parentheses:
- Variable ending in `_date` → hint: "(e.g., 2026-03-05)"
- Variable ending in `_list` → hint: "(comma-separated)"
- Variable ending in `_tone` or `tone` appears in the name → hint: "(e.g., formal, friendly, concise)"

Wait for the user's response before asking for the next variable. Do not ask for all variables in one message.

After all values are collected, perform substitution: replace every occurrence of `{{variable_name}}` in the prompt content with the user-supplied value. The replacement is case-insensitive — `{{ClientName}}` and `{{clientname}}` are treated as the same variable and receive the same value.

## Step 7: Output the Substituted Prompt

Display the final, ready-to-use prompt in a fenced code block so it can be copied cleanly:

````
## Ready-to-Use Prompt

```
[full substituted prompt content here]
```
````

If no variables were present (Step 6 was skipped), display the prompt content unchanged in the same fenced format.

Below the code block, display a usage summary:

```
---

**Prompt**: [Name]
**Category**: [Category]
**Variables filled**: [N]  (or "None" if no variables)

Copy the prompt above and paste it into any AI tool or workflow.
```

## Step 8: Update Usage Tracking

After displaying the prompt output, update the Notion page for the retrieved prompt:

1. Increment the `Times Used` counter by 1.
2. Set `Last Used` to the current date in `YYYY-MM-DD` format.

Perform both updates in a single Notion page update call. Do not skip tracking — a retrieval is always a usage event, regardless of whether variables were filled.

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

- **Notion unavailable**: Show error message with setup wizard reference and stop (see Step 1).
- **Database missing**: Show empty library message with onboarding hint and stop (see Step 2).
- **Prompt not found (exact)**: Show similar names if partial matches exist, otherwise show not-found message (see Step 3).
- **Variable collection interrupted**: If the user provides an empty value for a variable, use the literal placeholder `{{variable_name}}` as the substituted value and continue — do not block on empty input.
- **Usage tracking fails**: If the Notion update in Step 8 fails, do not surface the error to the user. The prompt output has already been displayed and that is the primary outcome.
- **Content exceeds 2000 characters**: If the prompt content is split across multiple rich_text blocks in Notion, concatenate all blocks in order before running variable detection and substitution.

## Usage Examples

```
/founder-os:prompt:get "Client Intro Email"
/founder-os:prompt:get "Weekly Status Update"
/founder-os:prompt:get cold outreach
/founder-os:prompt:get "Code Review Checklist"
/founder-os:prompt:get competitor analysis
```
