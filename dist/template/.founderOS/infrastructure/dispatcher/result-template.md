# Result Summary Template

Standardized format for subagent result summaries displayed in the main session.

## Format

When a background subagent completes, the dispatcher injects a result block into the main session using this format:

```
--- Founder OS: [namespace]:[action] (completed in [N]s) ---
Status: [success | partial | error]
Summary: [2-5 sentences describing what was done]
Key Data:
  - [Primary output item 1]
  - [Primary output item 2]
  - [...]
Actions: [What was created/updated/sent, with IDs or links]
Warnings: [Any degraded dependencies or skipped steps, or "None"]
Follow-up: [Suggested next commands, or "None"]
---
```

## Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| Status | Yes | `success` = all steps completed. `partial` = some steps skipped (degraded dependency). `error` = command failed. |
| Summary | Yes | 2-5 sentences. Focus on what was accomplished, not how. No raw data. |
| Key Data | Yes | The primary output the user cares about. Tables, lists, counts, document references. Keep to 5-10 items max. |
| Actions | Yes | Concrete actions taken: Notion pages created (with IDs), emails drafted, files written (with paths). |
| Warnings | No | Omit if none. List any MCP tools that were unavailable, APIs that timed out, or steps that were skipped. |
| Follow-up | No | Omit if none. Suggest 1-3 natural next commands the user might want to run. |

## Examples

### Example 1: Daily Briefing

```
--- Founder OS: briefing:briefing (completed in 28s) ---
Status: success
Summary: Generated daily briefing covering 12 emails, 4 calendar events,
         and 3 Notion task updates. Saved to [FOS] Briefings database.
Key Data:
  - 3 urgent emails requiring response (from: J. Chen, M. Lopez, AWS Billing)
  - Next meeting: Product sync at 10:30am (prep note attached)
  - 2 overdue tasks flagged for follow-up
Actions: Created Notion page "Daily Briefing -- 2026-03-12" (ID: abc123)
Follow-up: /founder-os:inbox:triage, /founder-os:prep:today
---
```

### Example 2: Report Generation

```
--- Founder OS: report:generate (completed in 45s) ---
Status: success
Summary: Generated Q1 quarterly report from template. Pulled revenue data
         from 3 Notion databases and formatted 8 sections with charts.
Key Data:
  - Revenue: $142,500 (up 18% from Q4)
  - Active clients: 12 (3 new, 1 churned)
  - Top project: NaluForge redesign ($45,000)
Actions: Created Notion page "Q1 2026 Quarterly Report" (ID: def456)
         Wrote PDF export to ./reports/q1-2026-quarterly.pdf
Follow-up: /founder-os:goal:report
---
```

### Example 3: Inbox Triage

```
--- Founder OS: inbox:triage (completed in 32s) ---
Status: partial
Summary: Triaged 47 emails from the last 12 hours. Categorized 42 emails,
         drafted 5 responses. Slack digest was unavailable.
Key Data:
  - Urgent (3): AWS billing alert, client escalation from Chen, contract deadline reminder
  - Needs reply (5): drafts created and saved to [FOS] Content
  - FYI (18): newsletter subscriptions, team updates
  - Archive (21): notifications, automated alerts
Actions: Created 5 draft entries in [FOS] Content (Type: Email Draft)
         Created 3 follow-up tasks in [FOS] Tasks (Type: Email Task)
Warnings: Slack MCP unavailable — Slack mentions not included in triage
Follow-up: /founder-os:inbox:drafts-approved, /founder-os:followup:check
---
```

### Example 4: Error Result

```
--- Founder OS: health:scan (completed in 4s) ---
Status: error
Summary: Client health scan failed — Notion CLI is not configured.
         Cannot access [FOS] Companies database.
Key Data: None
Actions: None
Warnings: NOTION_AUTH_MISSING — $NOTION_API_KEY is not set
Follow-up: /founder-os:setup:notion-cli
---
```

## Display in Main Session

The result block is injected as-is into the main session context. The main session can then:
1. Display the block to the user
2. Answer follow-up questions about the summary
3. Use the summary data in subsequent reasoning

If the user needs more detail than the summary provides, they can:
- Ask a specific follow-up question (the main session can reason over the summary)
- Re-run the command with `--foreground` to see full inline execution
- Request `result-format: full` in the command frontmatter for commands where full output is always needed

## Token Budget

| Component | Typical Tokens |
|-----------|---------------|
| Dispatch overhead (prompt construction) | 300-500 |
| Result summary (injected into main session) | 500-1,500 |
| **Total main session cost per command** | **800-2,000** |
| Subagent execution (isolated, discarded) | 15,000-50,000 |
