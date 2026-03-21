---
description: Process all invoice files in a folder, extracting data and generating a batch summary table. Supports two modes: fast single-agent batch extraction (default) or full 5-agent pipeline with Notion recording for every invoice (--team flag).
argument-hint: "[folder-path] [--team] [--since=DATE] [--concurrency=N] [--output=PATH]"
allowed-tools: [mcp__filesystem__read_file, mcp__filesystem__list_directory, mcp__notion__create_page, mcp__notion__search]
execution-mode: background
result-format: summary
---

# /founder-os:invoice:batch

Process all invoice files in a folder and generate a batch summary.

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
- Command: `invoice-batch`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'invoice-processor' OR plugin IS NULL) AND (command = 'invoice-batch' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

### Default Mode (Fast Batch, No Notion Required)

When invoked without `--team`, process each invoice file using single-agent extraction.

1. List all files in the folder.
2. Filter to supported formats: PDF, JPG, JPEG, PNG, TIFF. Skip all others silently.
3. If `--since=DATE` is specified, skip files modified before that date.
4. For each invoice file:
   a. Apply the invoice-extraction skill to extract structured data.
   b. Apply the expense-categorization skill to assign categories.
5. Output a summary table to the user:

```
## Batch Processing Summary: /invoices/2024/

Processed 12 invoices | Total: $14,237.50

| # | Vendor | Invoice # | Date | Total | Category |
|---|--------|-----------|------|-------|----------|
| 1 | Adobe Inc. | INV-2024-12345 | Dec 1, 2024 | $659.88 | subscriptions |
| 2 | Acme Supplies | INV-2024-0042 | Jan 15, 2024 | $513.00 | office_supplies |
...

**Skipped**: 3 files (unsupported format)
**Errors**: 1 file (invoice-corrupted.pdf — OCR failed)
```

If `--output=PATH` is specified, also write the summary as a markdown file.

### Team Mode (Full Pipeline + Notion)

When invoked with `--team`, run the complete 5-agent pipeline for each invoice file.

1. List and filter files as in default mode.
2. Launch up to `--concurrency=N` (default: 5) parallel pipelines, one per invoice.
3. Each pipeline: extraction → validation → categorization → approval → integration.
4. Integration records each invoice in the Finance database with `Type = "Invoice"`. DB discovery order: **"[FOS] Finance"** first, then "Founder OS HQ - Finance", then "Invoice Processor - Invoices" as legacy fallback.
5. Show batch progress every 5 invoices.
6. After all complete, show the batch summary with Notion links for each recorded invoice.

**Batch progress format:**
```
Processing batch: 5/12 complete... (2 auto-approved, 2 need review, 1 error)
```

## Supported File Formats

PDF, JPG, JPEG, PNG, TIFF. Silently skip all other file types (e.g., .xlsx, .docx, .txt).

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `[folder-path]` | Yes | Path to folder containing invoice files |
| `--team` | No | Run full 5-agent pipeline with Notion integration |
| `--since=DATE` | No | Only process files modified on or after this date (e.g., `2024-01-01`) |
| `--concurrency=N` | No | Number of parallel pipelines in team mode (default: 5, max: 10) |
| `--output=PATH` | No | Save batch summary to a local file |

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
/founder-os:invoice:batch /invoices/2024/
/founder-os:invoice:batch ~/Downloads/invoices/ --team
/founder-os:invoice:batch /invoices/ --since=2024-01-01 --team --output=/reports/q1-batch.md
/founder-os:invoice:batch /invoices/q4/ --team --concurrency=3
```

## Error Handling

- **Folder not found**: Tell the user the folder doesn't exist. Suggest checking the path.
- **Empty folder** (no supported files): Tell the user no supported invoice files were found.
- **Individual file errors**: Log the error and continue processing remaining files. Report failed files in the summary.
- **All files fail**: Report the errors and suggest checking the folder contents.
- **Notion unavailable** (in `--team` mode): Note this in progress output. Continue processing all files; report which invoices could not be recorded in Notion.
