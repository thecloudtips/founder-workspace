---
description: Generate a detailed health report for a single client with metric breakdown and recommended actions
argument-hint: "[client_name]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:health:report

Generate a deep-dive health report for a single CRM client, displaying the overall health score, per-metric breakdowns with scoring details, risk flags, recommended actions, and recent activity timeline.

## Load Skills

Read the client-health-scoring skill at `skills/health/client-health-scoring/SKILL.md` for the 5-metric scoring algorithm, RAG classification, data source integration, caching strategy, and risk flag taxonomy.

Read the sentiment-analysis skill at `skills/health/sentiment-analysis/SKILL.md` for email and meeting sentiment extraction needed by the Sentiment metric.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `$1` (required) — client name to report on. Fuzzy match against CRM Companies database.

If no argument is provided:
1. Search Notion for the CRM Companies database.
2. List the first 10 active clients by name.
3. Prompt: "Which client would you like a health report for? Select from the list above or type a name."

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `health` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `client-health`
- Command: `health-report`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'client-health' OR plugin IS NULL) AND (command = 'health-report' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Report Process

1. **Identify client**: Search the CRM Companies database for a company matching the provided name. Use fuzzy matching (case-insensitive, partial match). If multiple matches, list them and ask the user to clarify. If no match, report: "No client matching '[name]' found in CRM."

2. **Check cache**: Using the database discovery logic from the client-health-scoring skill (search "[FOS] Companies" first, then "Founder OS HQ - Companies", then "Companies", then fallback to standalone "Client Health Dashboard - Health Scores"), check the Company page for cached health scores:
   - If the Company page has a `Last Scanned` property < 24 hours old, use the cached scores (Health Score, Health Status, Risk Flags, per-metric scores) for the initial display. Still gather recent activity for the timeline.
   - If `Last Scanned` is missing or stale (> 24 hours), recompute all metrics from source data.
   - In fallback mode (standalone Health Scores DB), look for a matching record by Client Name instead.

3. **Compute or retrieve metrics**: For each of the 5 metrics, either use cached scores or compute fresh:
   - **Last Contact** (0.25 weight): Find the most recent email or calendar event with this client. Report the date and channel.
   - **Response Time** (0.20 weight): Calculate average response time across last 10 email threads. Report the average in hours.
   - **Open Tasks** (0.20 weight): Count total active tasks and overdue tasks for this client. Report the ratio.
   - **Payment Status** (0.20 weight): Check P11 Invoice Processor DB for this client's invoices. Report paid-on-time count vs total and any overdue invoices.
   - **Sentiment** (0.15 weight): Run sentiment-analysis skill. Report the composite score, email/meeting breakdowns, and any notable signals.

4. **Calculate composite**: Apply weights, compute overall score, classify RAG tier.

5. **Evaluate risk flags**: Check each risk condition from the scoring skill. List active flags.

6. **Generate recommended actions**: Based on risk flags and low-scoring metrics:
   - Red metrics (score < 40): Urgent action with specific recommendation
   - Yellow metrics (score 40-69): Monitoring action with suggestion
   - Green metrics (score >= 70): No action needed

7. **Gather recent activity**: Collect timeline data:
   - Last 5 emails involving this client (date, subject, direction, snippet)
   - Last 3 calendar events with this client (date, title, duration, attendees)

8. **Update cache**: If scores were recomputed, update the Company page with the new health score properties (Health Score, Health Status, Risk Flags, Last Scanned, Sources Used, Notes). In fallback mode, write/update the record in the standalone Health Scores DB.

## Graceful Degradation

- **Notion unavailable**: Cannot identify client. Report error and stop.
- **Gmail unavailable**: Set Last Contact and Response Time to defaults. Note in report.
- **Calendar unavailable**: Skip meeting data. Use email-only for timeline and sentiment.
- **P11 unavailable**: Set Payment to neutral (75). Note in report.
- **P20 dossier available**: Supplement the report with dossier data if fresh.

## Output Format

Display the complete health report in chat:

```
## Health Report: [Client Name]

**Overall Score**: [score]/100 — [Green 🟢 | Yellow 🟡 | Red 🔴]
**Last Scanned**: [timestamp] | **Data Sources**: [list of sources used]

---

### Metric Breakdown

| Metric | Score | Weight | Details |
|--------|-------|--------|---------|
| Last Contact | [score]/100 | 0.25 | Last contact: [date] via [email/meeting] ([N] days ago) |
| Response Time | [score]/100 | 0.20 | Avg response: [N] hours across [N] threads |
| Open Tasks | [score]/100 | 0.20 | [N] active tasks, [N] overdue |
| Payment Status | [score]/100 | 0.20 | [N]/[N] invoices paid on time, [N] overdue |
| Sentiment | [score]/100 | 0.15 | [Positive/Neutral/Negative] — Email: [score], Meeting: [score] |

### Risk Flags

[If no flags]: No risk flags detected.
[If flags exist]:
- 🔴 **[Flag Name]**: [Description and trigger condition]
- 🟡 **[Flag Name]**: [Description and trigger condition]

### Recommended Actions

[Based on risk flags and low-scoring metrics]:
1. **[Action]** — [Specific recommendation based on the data]
2. **[Action]** — [Specific recommendation based on the data]

### Recent Activity

**Emails** (last 5):
- [date] — [↗ Sent | ↙ Received] "[subject]" — [first 80 chars of body]

**Meetings** (last 3):
- [date] — "[title]" ([duration]) — Attendees: [names]

---

Report generated from [N] data sources. Use `/founder-os:client:health-scan --client="[name]" --refresh` to force a full rescan.
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

## Usage Examples

```
/founder-os:client:health-report Acme Corp
/founder-os:client:health-report "Smith & Associates"
/founder-os:client:health-report acme
```
