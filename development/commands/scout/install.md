---
description: "Install a discovered tool with security review"
argument-hint: "<tool-url-or-catalog-id> [--skip-review] [--namespace=<target>]"
allowed-tools: ["Read", "Write", "Bash", "WebFetch", "Task"]
execution-mode: background
result-format: summary
---

# scout:install

Install a discovered tool into the scout sandbox, run a security review, generate a wrapper command, and register in the catalog.

## Skills

Read these skill files before proceeding:
1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/SKILL.md` — catalog schema, sandbox layout, tool ID generation
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/scout/security/SKILL.md` — 6-point security checklist, verdict schema, audit trail rules
3. Read `${CLAUDE_PLUGIN_ROOT}/skills/scout/integration/SKILL.md` — wrapper command templates, frontmatter rules, scout metadata comment block

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `target` | Yes (positional) | URL or catalog ID of the tool to install |
| `--skip-review` | No | Skip the security scan (always acknowledged, always logged) |
| `--namespace=<target>` | No | Pre-set target namespace in catalog entry for future promotion |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files. If present, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., filter relevance by business domain). If files don't exist, skip silently.

## Preflight Check

Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `scout` namespace.
- Required: (none)
- Optional: `websearch`

If the check returns `blocked`, stop execution and display fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and continue.

## Step 0: Memory Context

Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `scout install`, `tool integration`, `security review`.
Inject top 5 relevant memories into working context for this execution.

## Intelligence: Apply Learned Patterns

Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'scout' OR plugin IS NULL) AND (command = 'scout-install' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context for this execution
3. Notify: `[Intel] Applying learned preference: "{description}"` for each pattern applied
4. If the Intelligence database does not exist, skip silently and continue execution

## Phase 1/4: Download

1. Derive the tool ID from the target URL or catalog ID per the ID generation rules in the scout common skill (kebab-case, strip org prefixes and file extensions).
2. Create the sandbox directory at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/sandbox/<tool-id>/_downloaded/`.
3. Fetch all tool files (SKILL.md, command markdown files, agent configs, referenced scripts) into `_downloaded/`. Do not execute any downloaded file.
4. Write `_meta.json` in the sandbox root (`_infrastructure/scout/sandbox/<tool-id>/_meta.json`) with:
   ```json
   {
     "tool_id": "<id>",
     "source_url": "<target>",
     "download_date": "<ISO 8601>",
     "version": "<detected or null>",
     "status": "downloaded"
   }
   ```
5. If the download fails (network error, 404, unsupported format), halt with a clear error message and suggested fix. Do not create a partial catalog entry.

## Phase 2/4: Security Review

**If `--skip-review` is passed:**

- Display the skip notice immediately:
  ```
  Note: Security review was skipped for <tool-id>.
  This tool has not been scanned for prompt injection, secret exfiltration,
  data leakage, or other security concerns. Proceed with caution.
  ```
- Set `security_verdict: "unreviewed"` in the catalog entry.
- Append a `skip_review` audit log entry to the catalog.
- Proceed directly to Phase 3.

**If `--skip-review` is NOT passed:**

1. Spawn a background `security-auditor` agent via the Task tool with:
   - `${CLAUDE_PLUGIN_ROOT}/skills/scout/security/SKILL.md` as checklist context
   - All files in `_infrastructure/scout/sandbox/<tool-id>/_downloaded/` as target corpus
   - Instructions to run all six checks (prompt injection, secret exfiltration, overly broad tools, data leakage, supply chain risk, permission escalation) and produce a verdict JSON
2. Write the completed verdict JSON to `_infrastructure/scout/sandbox/<tool-id>/_review/report.json`.
3. Write a human-readable summary to `_infrastructure/scout/sandbox/<tool-id>/_review/verdict.md`.
4. Append a `review_completed` audit log entry to the catalog entry.

**Present verdict per non-blocking presentation rules:**
- RED verdict: display warning banner, require `CONFIRM` or `--confirm-security` before proceeding. Log `install_confirmed_red` to audit trail.
- YELLOW verdict: include "Security Notes" section in output, proceed without confirmation.
- GREEN verdict: include "Security scan: clean." line, proceed.

## Phase 3/4: Generate Wrapper

1. Derive the wrapper command name from the tool ID (use the tool's primary action if clear, otherwise use the tool ID as-is).
2. Create `${CLAUDE_PLUGIN_ROOT}/commands/scout/<tool-name>.md` using the template from the integration skill:
   - YAML frontmatter with only the five permitted fields (`description`, `argument-hint`, `allowed-tools`, `execution-mode`, `result-format`)
   - `description` prefixed with `[Auto-generated]`
   - `allowed-tools` scoped to what the tool actually needs (not a blanket set)
3. Immediately after the frontmatter, insert the scout metadata comment block:
   ```markdown
   <!-- Scout Metadata
   source_url: <target>
   catalog_id: <tool-id>
   security_verdict: <green|yellow|red|unreviewed>
   installed: <ISO date>
   -->
   ```
4. Write the command body describing how to invoke the underlying tool, mapping its arguments per the integration skill's argument mapping rules.
5. If `--namespace` was passed, note the target promotion namespace in the command body under a `## Promotion Target` section.

## Phase 4/4: Register

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/catalog.json`.
2. Append a new entry conforming to the catalog schema (from the scout common skill):
   ```json
   {
     "id": "<tool-id>",
     "keywords": ["<derived keywords>"],
     "source_type": "<skill|mcp|github_repo|package>",
     "source_url": "<target>",
     "integration_type": "<skill_native|mcp_add|bash_wrapper>",
     "security_verdict": "<green|yellow|red|unreviewed>",
     "install_status": "installed",
     "command_path": "commands/scout/<tool-name>.md",
     "usage_count": 0,
     "last_used": null,
     "discovered": "<ISO date>",
     "description": "<what the tool does>",
     "verdict_report": "_infrastructure/scout/sandbox/<tool-id>/_review/report.json",
     "last_reviewed_at": "<ISO date or null if skipped>",
     "namespace_target": "<namespace if --namespace was passed, else null>",
     "audit_log": []
   }
   ```
3. Write the updated catalog back to `_infrastructure/scout/catalog.json`.
4. Store in the Memory Engine:
   - Namespace: `scout`
   - Key: tool purpose / problem it solves (human-readable description)
   - Value: solution description + catalog ID
5. Log `install_approved` audit event to the catalog entry.

**Present final result:**
```
## scout:install — <tool-id>

**Status**: Installed
**Wrapper**: commands/scout/<tool-name>.md
**Security**: [GREEN|YELLOW ⚠|RED ⚠⚠|UNREVIEWED]
**Catalog ID**: <tool-id>
**Namespace Target**: <namespace or not set>

<Security verdict details if YELLOW or RED>

Run /founder-os:scout:<tool-name> to use this tool.
```

## Output

Structured install summary showing:
- Tool ID and wrapper command path
- Security verdict with findings summary
- Catalog registration confirmation
- Usage hint for invoking the newly installed tool

## Notion DB Logging (Optional)

If Notion is available, write a record to the `[FOS] Research` database:
- **Type**: `Scout Discovery`
- **Name**: `<tool-id> — <description>`
- **Status**: `Installed`
- **Security Verdict**: `<green|yellow|red|unreviewed>`
- **Source URL**: `<target>`
- **Install Date**: `<ISO date>`

If the `[FOS] Research` database is unavailable, skip silently and continue.

## Self-Healing: Error Recovery

For any error during this command:
- **Transient** (network timeout, temporary unavailability): retry with exponential backoff (2s, 5s, 15s)
- **Recoverable** (partial download, one scan check fails): continue with partial results, note what was skipped
- **Degradable** (Notion unavailable, memory engine unavailable): skip optional step, warn user, continue
- **Fatal** (sandbox write permission denied, catalog.json parse error): halt and present exact error with fix instructions

Always notify: `[Heal] {description of what happened and what was done}`

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Plugin: `scout`
- Command: `scout-install`
- Key entities: tool ID, source URL, security verdict
- Output summary: install status, wrapper path, catalog registration

Check for emerging patterns per detection rules. If a memory reaches the adaptation threshold, append the notification to the output.

## Intelligence: Post-Command

Log execution metrics:
- Duration (ms)
- Outcome: `success` | `failure` | `degraded`
- Security verdict reached
- Whether `--skip-review` was used
- Whether RED confirmation was required
