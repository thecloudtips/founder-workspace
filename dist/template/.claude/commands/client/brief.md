---
description: Generate a concise 1-page client brief for meeting preparation
argument-hint: "[name]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:client:brief

Generate a concise, printable 1-page executive brief for a client. Designed for quick pre-meeting preparation or portfolio review. Always operates in single-agent mode (no --team flag).

## Parse Arguments

Extract from `$ARGUMENTS`:
- `[name]` (required) — client or company name

If no client name is provided, ask the user: "Which client do you need a brief for?"

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `client` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `client-context`
- Command: `client-brief`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'client-context' OR plugin IS NULL) AND (command = 'client-brief' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Process

1. Read the relationship-summary skill at `skills/client/relationship-summary/SKILL.md` for the executive brief template, sentiment scoring, engagement metrics, risk flags, and health score formula.
2. Read the client-context skill at `skills/client/client-context/SKILL.md` for CRM schema and data source hierarchy.
3. **Check dossier cache**:
   - Locate the Companies database using the discovery order: search "[FOS] Companies" first, then "Founder OS HQ - Companies", then "Companies" or "CRM - Companies", then fall back to a standalone "Client Dossiers" database.
   - Search the discovered database for a page matching the client name.
   - If found and Dossier Generated At is within the last 24 hours: use the page's Dossier property to generate the brief.
   - If Dossier Stale is true or Dossier Generated At is older than 24 hours: warn the user and suggest running `/founder-os:client:load [name]` first to refresh data. Still generate a brief from stale data with a staleness warning.
   - If no Dossier property is populated or no matching page found: inform the user that no dossier exists for this client. Suggest running `/founder-os:client:load [name]` first. If the user wants to proceed anyway, perform a lightweight CRM-only lookup and generate a partial brief.
4. **Generate brief** from dossier data following the executive brief template in the relationship-summary skill.
5. Calculate health score using the health score formula if not already in the cached dossier.
6. Identify risk flags per the risk flag criteria.
7. Present the brief in clean, printable markdown format.

## Output Format

```
# Client Brief: [Company Name]

**Generated**: [date] | **Health**: [score]/100 ([label]) | **Data**: [completeness score]

---

## Profile
**[Company Name]** | [Industry] | [Size] | [Status]
**Primary Contact**: [Name] ([Role]) — [Email]
**Relationship Owner**: [User] | **Tenure**: [N] months
**Active Deals**: [Count] | **Value**: $[Total]

## Recent Activity (Last 30 Days)
- [Relative date]: [Type] — [Summary]
- [Relative date]: [Type] — [Summary]
- [Relative date]: [Type] — [Summary]
- [Relative date]: [Type] — [Summary]
- [Relative date]: [Type] — [Summary]

## Open Items
- [ ] [Action item 1] *(from [source])*
- [ ] [Action item 2] *(from [source])*
- [ ] [Action item 3] *(from [source])*

## Upcoming
- [Date]: [Meeting/milestone/deadline]
- [Date]: [Meeting/milestone/deadline]

## Sentiment & Risk
**Sentiment**: [Positive/Neutral/Negative] ([trend direction])
**Engagement**: [High/Medium/Low] ([trend direction])
**Risk Flags**:
- [Flag description] ([severity])

## Key Documents
- [Title] ([category], [relative date])
- [Title] ([category], [relative date])
- [Title] ([category], [relative date])

---
*Brief generated from [source description]. Run `/founder-os:client:load [name]` to refresh.*
```

### Formatting Rules

- Use relative dates for items < 14 days old ("2 days ago", "last week"). Use absolute dates for older items.
- Lead with the most actionable information: risk flags and open items matter most.
- Use bullet points, not paragraphs — executives scan, not read.
- Keep the entire brief under 500 words.
- If completeness < 0.5, add a warning at the top: "Low data confidence — some sections may be incomplete."
- Empty sections: include the header with "No data available" rather than omitting.
- Maximum 5 recent activities, 10 open items, 3 key documents.

## Error Handling

- **No client name provided**: Ask the user which client they need a brief for.
- **No cached dossier found**: Inform user and suggest `/founder-os:client:load [name]`. Offer to generate a partial brief from CRM-only data.
- **Notion CLI not configured**: Halt with message: "Notion CLI is required. Run `/founder-os:setup:notion-cli` for setup."
- **Client not found in CRM or cache**: Report that no data exists for this client. Suggest checking the spelling or running `/founder-os:client:load [name]` with the correct name.
- **Stale data (>24h)**: Generate the brief but include a staleness warning with the age of the data.

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
/founder-os:client:brief Acme Corp          # Generate 1-page brief from cached dossier
/founder-os:client:brief "Acme Corp Inc"    # Quoted name for exact match
```
