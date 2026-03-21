---
description: Create Gmail drafts from approved Notion entries
allowed-tools: Read, Glob, Grep, Bash, Task
execution-mode: background
result-format: summary
---

# /founder-os:inbox:drafts-approved

Create Gmail drafts from entries approved in the Notion **"[FOS] Content"** database (filtered by `Type = "Email Draft"`). Falls back to "Founder OS HQ - Content", then to the legacy "Inbox Zero - Drafts" database. This command bridges the review step between AI-generated drafts and actual Gmail draft creation.

## Gmail Access

This command uses the `gws` CLI to create Gmail drafts:
```bash
# Build the raw RFC 2822 message and create a draft
raw=$(printf "To: RECIPIENT\r\nSubject: SUBJECT\r\nContent-Type: text/plain\r\n\r\nBODY" | base64 -w 0)
gws gmail users drafts create --params '{"userId":"me"}' --json "{\"message\":{\"raw\":\"$raw\"}}"
```

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `inbox` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `inbox-zero`
- Command: `inbox-drafts-approved`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'inbox-zero' OR plugin IS NULL) AND (command = 'inbox-drafts-approved' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

1. Search Notion for a database named "[FOS] Content". If not found, try "Founder OS HQ - Content". If not found, fall back to "Inbox Zero - Drafts" (legacy name). If none exists, halt with an error.
2. Query the resolved database for entries where `Status = "Approved"`. When using the HQ Content database, also filter by `Type = "Email Draft"`.
3. For each approved entry, extract:
   - `to`: recipient email address
   - `subject`: email subject (should start with "Re: " for replies)
   - `body`: the draft response text
   - `source_email_id`: original Gmail message ID (for threading)
4. For each approved draft:
   a. Use gws CLI to create a Gmail draft: build an RFC 2822 message with To, Subject, and Body fields, base64-encode it, and call `gws gmail users drafts create`.
   b. On success: update the Notion entry status from "Approved" to "Sent to Gmail".
   c. On failure: update the Notion entry status to "Error" and add an error note.
5. Present a summary report:
   - Total approved entries found
   - Successfully created as Gmail drafts
   - Failed (with error details)
   - Reminder: "Drafts are in your Gmail Drafts folder — review and send manually."

## Output Format

```
## Drafts Approved → Gmail

**Found**: 5 approved drafts in Notion

### Results
| # | To | Subject | Status |
|---|-----|---------|--------|
| 1 | alice@example.com | Re: Q4 Budget Review | Created in Gmail |
| 2 | bob@corp.com | Re: Meeting Follow-up | Created in Gmail |
| 3 | carol@client.com | Re: Proposal Feedback | Error: thread not found |

**Successfully created**: 4/5 drafts
**Action needed**: Review and send drafts from your Gmail Drafts folder.
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

## Error Handling

- **No approved drafts found**: Report "No approved drafts found in Notion. Run /founder-os:inbox:triage --team first, then approve drafts in Notion."
- **Notion database not found**: Report that none of "[FOS] Content", "Founder OS HQ - Content", or "Inbox Zero - Drafts" databases were found. Suggest deploying the HQ template or running the pipeline first.
- **Gmail draft creation fails**: Log the error for that specific draft, continue processing remaining drafts, report failures at the end.
- **Missing required fields**: Skip the entry, report it as incomplete with details on which field is missing.

## Usage Examples

```
/founder-os:inbox:drafts_approved    # Process all approved drafts from Notion to Gmail
```
