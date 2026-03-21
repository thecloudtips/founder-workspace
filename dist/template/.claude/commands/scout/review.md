---
description: "Re-run security review on a scouted tool"
argument-hint: "<tool-id>"
allowed-tools: ["Read", "Write", "Bash", "Task"]
execution-mode: background
result-format: summary
---

# scout:review

Re-run the 6-point security scan on a previously installed scouted tool. Updates the verdict in the catalog and presents a comparison with the previous result if one exists.

## Skills

Read these skill files before proceeding:
1. Read `../../../.founderOS/infrastructure/scout/SKILL.md` — catalog schema, sandbox layout, tool ID generation
2. Read `skills/scout/security/SKILL.md` — 6-point security checklist, verdict schema, audit trail rules

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `tool-id` | Yes (positional) | Catalog ID of the tool to re-review |

## Business Context (Optional)

Check `../../../.founderOS/infrastructure/context/active/` for `.md` files. If present, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output. If files don't exist, skip silently.

## Preflight Check

Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `scout` namespace.
- Required: (none)
- Optional: `websearch`

If the check returns `blocked`, stop execution and display fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and continue.

## Step 0: Memory Context

Read `../../../.founderOS/infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `scout review`, `security assessment`.
Inject top 5 relevant memories into working context for this execution.

## Intelligence: Apply Learned Patterns

Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'scout' OR plugin IS NULL) AND (command = 'scout-review' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context for this execution
3. Notify: `[Intel] Applying learned preference: "{description}"` for each pattern applied
4. If the Intelligence database does not exist, skip silently and continue execution

## Phase 1/3: Locate Tool

1. Read `../../../.founderOS/infrastructure/scout/catalog.json`.
2. Find the entry matching `tool-id` (exact match on the `id` field).
3. If no matching entry exists, halt with:
   ```
   Error: Tool "<tool-id>" not found in catalog.
   Run /founder-os:scout:catalog to browse installed tools.
   ```
4. If the entry has `install_status: "removed"`, halt with:
   ```
   Error: Tool "<tool-id>" has been removed from the catalog.
   Re-install it first with /founder-os:scout:install.
   ```
5. Verify the sandbox exists at `_infrastructure/scout/sandbox/<tool-id>/`.
6. Verify `_downloaded/` exists and contains files. If missing, halt with:
   ```
   Error: Sandbox for "<tool-id>" is missing or empty.
   Re-install the tool to restore the sandbox: /founder-os:scout:install <source-url>
   ```
7. If a previous verdict exists, read `_infrastructure/scout/sandbox/<tool-id>/_review/report.json` and store as `previous_verdict` for comparison in Phase 3.

## Phase 2/3: Security Scan

1. Spawn a background `security-auditor` agent via the Task tool with:
   - `skills/scout/security/SKILL.md` as checklist context
   - All files in `_infrastructure/scout/sandbox/<tool-id>/_downloaded/` as target corpus
   - Instructions to run all six checks (prompt injection, secret exfiltration, overly broad tools, data leakage, supply chain risk, permission escalation) and produce a verdict JSON
2. Overwrite `_infrastructure/scout/sandbox/<tool-id>/_review/report.json` with the new verdict JSON.
3. Overwrite `_infrastructure/scout/sandbox/<tool-id>/_review/verdict.md` with the new human-readable summary.

## Phase 3/3: Update & Present

1. Read `../../../.founderOS/infrastructure/scout/catalog.json`.
2. Update the matching entry:
   - Set `security_verdict` to the new overall verdict.
   - Set `verdict_report` to the relative path of the updated `report.json`.
   - Set `last_reviewed_at` to the current ISO 8601 timestamp.
   - Append a `review_completed` audit log entry.
3. Write the updated catalog back to `_infrastructure/scout/catalog.json`.
4. Apply non-blocking presentation rules from the security skill:
   - RED verdict: display warning banner.
   - YELLOW verdict: include "Security Notes" section.
   - GREEN verdict: include "Security scan: clean." line.
5. If `previous_verdict` was found in Phase 1, present a comparison:
   ```
   ## Verdict Change
   Previous: [<old-verdict>] — reviewed <old-date>
   Current:  [<new-verdict>] — reviewed <now>

   Changed findings:
   - <check>: <old-severity> → <new-severity> (<what changed>)
   ```
   If the verdict is unchanged, note: "No change from previous review."
6. Present final result:
   ```
   ## scout:review — <tool-id>

   **Security Verdict**: [GREEN|YELLOW ⚠|RED ⚠⚠]
   **Reviewed**: <ISO datetime>
   **Catalog Updated**: Yes

   <Finding details per check>

   <Comparison with previous verdict if applicable>
   ```

## Output

Structured review summary showing:
- Updated security verdict with per-check findings
- Comparison with previous verdict (if one existed)
- Catalog update confirmation

## Self-Healing: Error Recovery

For any error during this command:
- **Transient** (temporary file lock, brief unavailability): retry with exponential backoff (2s, 5s, 15s)
- **Recoverable** (one scan check fails): continue with partial results, note which check was skipped
- **Degradable** (memory engine unavailable): skip optional step, warn user, continue
- **Fatal** (catalog.json parse error, sandbox unreadable): halt and present exact error with fix instructions

Always notify: `[Heal] {description of what happened and what was done}`

## Final Step: Observation Logging

Record observation via `../../../.founderOS/infrastructure/memory/pattern-detection/SKILL.md`:
- Plugin: `scout`
- Command: `scout-review`
- Key entities: tool ID, previous verdict, new verdict
- Output summary: verdict outcome, whether verdict changed, catalog update status

Check for emerging patterns per detection rules. If a memory reaches the adaptation threshold, append the notification to the output.

## Intelligence: Post-Command

Log execution metrics:
- Duration (ms)
- Outcome: `success` | `failure` | `degraded`
- Previous verdict (if any)
- New verdict
- Whether verdict changed
