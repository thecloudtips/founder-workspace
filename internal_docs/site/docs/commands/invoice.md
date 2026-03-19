# Invoice Processor

> Extract structured data from invoice files, categorize expenses, and record everything in your Notion Finance database -- one invoice at a time or an entire folder in batch.

## Overview

The Invoice Processor reads PDF, JPG, and image-based invoices, extracts vendor details, line items, totals, and payment terms, then assigns expense categories using a 14-category taxonomy. You get a clean, structured summary of every invoice without manual data entry.

The namespace offers two commands: `process` for a single invoice and `batch` for an entire folder. Both support two modes. The default mode extracts and categorizes data in one fast pass, outputting a formatted summary to your terminal (no Notion required). The `--team` flag activates a 5-agent pipeline that adds validation, anomaly detection, and automatic recording in your **Founder OS HQ - Finance** database in Notion with `Type = "Invoice"`.

This is the foundation of your financial data in Founder OS. The invoices recorded here feed into the Expense Report Builder, the Client Health Dashboard's Payment Status metric, and your ROI tracking. Process invoices early and often -- the downstream tools get smarter with better data.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Filesystem | Yes | Read invoice files from local storage |
| Notion CLI | No | Record invoices in the Finance database (team mode only) |

## Commands

### `/founder-os:invoice:process`

**What it does** -- Processes a single invoice file, extracting the vendor name, invoice number, date, line items with quantities and prices, tax amounts, and the total. Assigns expense categories to each line item (e.g., `software`, `office_supplies`, `professional_services`) with confidence scores. In team mode, the 5-agent pipeline validates amounts, detects anomalies, and records the invoice in Notion.

**Usage:**

```
/founder-os:invoice:process [file-path] [--team] [--output=PATH]
```

**Example scenario:**

> A contractor sends you an invoice PDF for design work. Run `/founder-os:invoice:process ~/Downloads/contractor-invoice.pdf --team` and the system extracts all the data, validates the math, categorizes it as `professional_services`, and creates a record in your Finance database with a link to the original file. You see the vendor, amount, line items, and category in a clean summary.

**What you get back:**

A formatted Markdown summary showing the vendor name, invoice number, dates, line items with descriptions, quantities, unit prices, totals, and assigned expense categories. Includes subtotal, tax, and grand total. In team mode, you also get the Notion record URL.

**Flags:**

- `--team` -- Run the full 5-agent pipeline with Notion integration
- `--output=PATH` -- Save the formatted summary as a local Markdown file

**Supported formats:** PDF, JPG, JPEG, PNG, TIFF

---

### `/founder-os:invoice:batch`

**What it does** -- Processes all invoice files in a folder, extracting and categorizing each one. Produces a batch summary table showing every invoice with its vendor, number, date, total, and category. In team mode, runs the full 5-agent pipeline for each invoice with configurable concurrency, recording every invoice in Notion and reporting progress along the way.

**Usage:**

```
/founder-os:invoice:batch [folder-path] [--team] [--since=DATE] [--concurrency=N] [--output=PATH]
```

**Example scenario:**

> It is the end of Q1 and you have a folder of 30 invoices that need processing. Run `/founder-os:invoice:batch /invoices/q1/ --team --output=./reports/q1-batch.md` and the system processes all 30 invoices in parallel (up to 5 at a time), records each one in Notion, and gives you a batch summary with the total spend, per-vendor breakdown, and any files that had errors.

**What you get back:**

A batch summary table listing every processed invoice with vendor, invoice number, date, total, and primary category. Includes the count of invoices processed, total dollar amount, and notes on any skipped files (unsupported formats) or errors (OCR failures). In team mode, includes Notion links for each recorded invoice.

**Flags:**

- `--team` -- Run the full 5-agent pipeline with Notion integration for every invoice
- `--since=DATE` -- Only process files modified on or after this date (e.g., `2024-01-01`)
- `--concurrency=N` -- Number of parallel pipelines in team mode (default: 5, max: 10)
- `--output=PATH` -- Save the batch summary as a local Markdown file

---

## The 5-Agent Pipeline (Team Mode)

When you use `--team`, each invoice passes through five specialized agents:

| Order | Agent | Role |
|-------|-------|------|
| 1 | Extraction Agent | Reads the file and extracts structured data (vendor, amounts, line items) |
| 2 | Validation Agent | Verifies mathematical correctness (quantity x price = total, line items sum to subtotal) |
| 3 | Categorization Agent | Assigns expense categories using vendor signals, description keywords, and amount patterns |
| 4 | Approval Agent | Detects anomalies and flags invoices that need human review |
| 5 | Integration Agent | Records the invoice in the Notion Finance database and links to the Companies DB |

## Expense Categories

The categorization agent uses a fixed 14-category taxonomy:

| Category | Budget Code | Tax Deductible |
|----------|-------------|----------------|
| office_supplies | OPS-001 | Yes |
| software | TECH-001 | Yes |
| hardware | TECH-002 | Yes |
| professional_services | SVC-001 | Yes |
| travel | TRV-001 | Partial |
| meals | TRV-002 | 50% |
| shipping | OPS-002 | Yes |
| utilities | FAC-001 | Yes |
| rent | FAC-002 | Yes |
| insurance | ADM-001 | Yes |
| marketing | MKT-001 | Yes |
| training | HR-001 | Yes |
| subscriptions | TECH-003 | Yes |
| other | GEN-001 | Varies |

Categories are assigned with confidence scores. Items scoring below 0.7 are flagged for human review.

## Tips & Patterns

- **Default mode is great for quick lookups** -- when a contractor sends an invoice and you just want to see the details, skip `--team` for an instant summary.
- **Use `--since` for incremental processing** -- if you batch-process invoices monthly, use `--since=2024-03-01` to avoid re-processing older files.
- **Team mode populates your Finance database** -- this is important because the Client Health Dashboard reads payment data from the same database. Processing invoices keeps health scores accurate.
- **Batch mode handles errors gracefully** -- if one invoice in a folder fails (corrupted PDF, unreadable scan), the system logs the error and continues processing the rest. You see which files failed in the summary.
- The categorization agent learns from your business context. If you have `business-info.md` set up, it uses your vendor relationships and industry terminology for better accuracy.

## Related Namespaces

- **[Proposal](/docs/commands/proposal)** -- Proposals define the pricing and payment terms that invoices ultimately fulfill. The proposal's SOW brief can be referenced when validating invoice line items against agreed scope.
- **[Contract](/docs/commands/contract)** -- Contract analysis extracts payment terms that should match what appears on invoices. Use both together for end-to-end financial visibility.
- **[Health](/docs/commands/health)** -- The Payment Status metric in health scoring reads from the Finance database. Keep invoices processed and your health scores stay accurate.
