---
description: Load CRM context for a client - company profile, contacts, recent activities, and deals
argument-hint: "[client] [--days=30] [--full]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:crm:context

Load a lightweight, CRM-focused view of a client's data. This is a READ-ONLY command — no writes to CRM. Complements Plugin #20's /founder-os:client:load (which does full multi-source dossier) by providing a fast CRM-only view.

## Load Skills

Read these skills for lookup logic:
- `${CLAUDE_PLUGIN_ROOT}/skills/crm/crm-sync/SKILL.md` for the context command workflow
- `${CLAUDE_PLUGIN_ROOT}/skills/crm/client-matching/SKILL.md` for resolving client name to CRM records

## Parse Arguments

Extract from `$ARGUMENTS`:
- First positional arg: `client` (required) — client or company name to look up
- `--days=N` (optional) — activity lookback period. Default: 30
- `--full` (optional) — show all activity details instead of summaries

If no client name provided, ask the user: "Which client would you like to look up?"

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `crm` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `crm-sync`
- Command: `crm-context`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'crm-sync' OR plugin IS NULL) AND (command = 'crm-context' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Lookup Process

1. **Match client**: Use client-matching skill to find the client in Companies DB.
   - Search by company name (exact then fuzzy)
   - If multiple matches: present top matches and ask user to select
   - If no match: report "No client found matching '[name]' in CRM" and suggest checking the name

2. **Fetch company profile**: From Companies DB, pull: Name, Industry, Size, Status, Website, and any custom properties.

3. **Fetch contacts**: Follow the Contacts relation from the Companies record. For each contact: Name, Email, Role, Type (Decision Maker/Champion/etc.), Last Contact date.

4. **Fetch recent activities**: Search Communications DB for records linked to this company within the --days window (default 30 days). Sort by Date descending.
   - Default view: show Type, Date, Title, Sentiment for each activity
   - With --full flag: also show full Summary text for each activity

5. **Fetch open deals**: Search Deals DB for records linked to this company where Stage is NOT "Closed Lost" or "Closed Won". Show: Deal Name, Value, Stage, Close Date, Probability.

6. **Quick health indicators**: Calculate from the fetched data:
   - Days since last contact (from most recent Communication)
   - Total activities in period
   - Active deals count and total pipeline value
   - Dominant sentiment across recent activities

## Notion Integration

- All 4 CRM Pro databases are accessed via Notion CLI
- Use dynamic discovery: search by title "[FOS] Companies"/"[FOS] Contacts"/"[FOS] Communications"/"[FOS] Deals" first, then "Founder OS HQ - Companies"/"Founder OS HQ - Contacts"/"Founder OS HQ - Communications"/"Founder OS HQ - Deals", then fall back to "Companies"/"Contacts"/"Communications"/"Deals"
- Never hardcode database IDs

## Graceful Degradation

- If Notion CLI unavailable: error — Notion is required for this command. Run `/founder-os:setup:notion-cli`.
- If Communications DB empty or doesn't exist: show company profile and contacts, note "No synced activities yet. Use `/founder-os:crm:sync-email` or `/founder-os:crm:sync-meeting` to populate."
- If Deals DB empty: show "No active deals" section

## Output Format

```
## CRM Context: [Company Name]

**Industry**: [industry] | **Size**: [size] | **Status**: [status]
**Website**: [url]

---

### Key Contacts
| Name | Role | Type | Email | Last Contact |
|------|------|------|-------|-------------|
| [name] | [role] | [type] | [email] | [date] |

---

### Recent Activity ([N] days)
| Date | Type | Summary | Sentiment |
|------|------|---------|-----------|
| [date] | [type] | [title or full summary if --full] | [sentiment] |

**Total activities**: [count] | **Last contact**: [N] days ago

---

### Open Deals
| Deal | Value | Stage | Close Date | Probability |
|------|-------|-------|------------|-------------|
| [name] | $[value] | [stage] | [date] | [pct]% |

**Pipeline value**: $[total]

---

### Health Indicators
- **Contact recency**: [N] days since last activity — [Good/Warning/Alert]
- **Engagement**: [count] activities in last [days] days — [Active/Moderate/Low]
- **Pipeline**: [count] open deals worth $[value]
- **Sentiment trend**: [Mostly positive/Mixed/Concerning]
```

Health indicator thresholds:
- Contact recency: Good (<=7 days), Warning (8-21 days), Alert (>21 days)
- Engagement: Active (>5 activities), Moderate (2-5), Low (0-1)

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
/founder-os:crm:context Acme Corp              # Quick CRM view for Acme Corp
/founder-os:crm:context "Tech Solutions Inc"   # Name with spaces
/founder-os:crm:context Acme --days=60         # Look back 60 days
/founder-os:crm:context Acme --full            # Show full activity summaries
/founder-os:crm:context Acme --days=90 --full  # Extended view with full details
```
