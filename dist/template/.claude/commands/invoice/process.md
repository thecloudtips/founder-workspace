---
description: Process a single invoice file, extracting vendor, amount, date, and line items. Supports two modes: fast single-agent extraction (default) or full 5-agent pipeline with Notion recording (--team flag).
argument-hint: "[file-path] [--team] [--output=PATH]"
allowed-tools: [mcp__filesystem__read_file, mcp__notion__create_page, mcp__notion__search]
execution-mode: background
result-format: summary
---

# /founder-os:invoice:process

Process a single invoice file and extract structured data.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `invoice` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `invoice-processor`
- Command: `invoice-process`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'invoice-processor' OR plugin IS NULL) AND (command = 'invoice-process' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Modes

### Default Mode (Fast, No Notion Required)

When invoked without `--team`, read the invoice file directly and output a formatted summary to the user.

1. Read the invoice file from the provided path.
2. Apply the invoice-extraction skill: extract vendor, amount, date, line items, totals.
3. Apply the expense-categorization skill: assign categories to line items.
4. Output a formatted markdown summary to the user.
5. Do NOT write to Notion in default mode.

**Output format:**

```
## Invoice: [VENDOR NAME]
**Invoice #**: INV-2024-0042
**Date**: January 15, 2024 | **Due**: February 14, 2024
**Total**: $513.00 USD

### Line Items
| Description | Qty | Unit Price | Total | Category |
|-------------|-----|-----------|-------|----------|
| Office Supplies - Q1 Bundle | 1 | $450.00 | $450.00 | office_supplies |
| Shipping and Handling | 1 | $25.00 | $25.00 | shipping |

**Subtotal**: $475.00 | **Tax**: $38.00 | **Total**: $513.00
**Primary Category**: office_supplies | **Tax Deductible**: Yes
```

If `--output=PATH` is specified, also write the summary as a markdown file to that path.

### Team Mode (Full Pipeline + Notion)

When invoked with `--team`, run the complete 5-agent pipeline:

1. **extraction-agent**: Read and extract structured data from the file.
2. **validation-agent**: Verify mathematical correctness and completeness.
3. **categorization-agent**: Assign expense categories to line items.
4. **approval-agent**: Detect anomalies; create Notion approval request if needed.
5. **integration-agent**: Record the invoice in the Notion Finance database with `Type = "Invoice"`. DB discovery order: **"[FOS] Finance"** first, then "Founder OS HQ - Finance", then "Invoice Processor - Invoices" as legacy fallback. Links vendor to the Companies DB via Company relation when a match exists.

Show progress as each agent completes. Display the final Notion record URL.

## Supported File Formats

PDF, JPG, JPEG, PNG, TIFF. Return an error for unsupported formats.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `[file-path]` | Yes | Path to the invoice file |
| `--team` | No | Run full 5-agent pipeline with Notion integration |
| `--output=PATH` | No | Save formatted summary to a local file |

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

## Examples

```
/founder-os:invoice:process /invoices/2024/adobe-dec.pdf
/founder-os:invoice:process ~/Downloads/contractor-invoice.jpg --team
/founder-os:invoice:process /invoices/acme-jan.pdf --output=/reports/acme-summary.md
```

## Error Handling

- **File not found**: Tell the user the file path doesn't exist. Suggest checking the path.
- **Unsupported format**: Tell the user which formats are supported (PDF, JPG, JPEG, PNG, TIFF).
- **Notion unavailable** (in `--team` mode): Inform the user that Notion integration failed but show the extracted and categorized data.
