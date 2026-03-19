# Invoice Processor Agent Team

> Pipeline-batch: Five agents process each invoice sequentially, with up to five invoices running in parallel across a batch.

## Overview

The Invoice Processor team turns a folder of invoices (or a Gmail inbox full of attachments) into categorized, validated, approval-routed records in your Notion Finance database. Each invoice passes through a strict five-step pipeline: extraction, validation, categorization, approval routing, and integration. The pipeline handles PDFs, scanned images, and photos -- anything you might receive from a vendor.

What makes this team powerful is the batch dimension. While each individual invoice flows through all five agents in sequence, the orchestrator runs up to five invoices through the pipeline concurrently. A stack of 50 invoices does not mean 50 sequential runs; it means 10 waves of 5, with failed items skipped and a summary report at the end.

In single-agent mode (the default when you run `/founder-os:invoice:process`), one agent handles the full extraction-to-recording workflow for a single invoice. The `--team` flag activates the full five-agent pipeline, which is where you see the real value: specialized validation logic, anomaly detection with configurable thresholds, and automatic Notion approval requests for anything that looks unusual.

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| Extraction Agent | Worker (Step 1) | Reads invoice files (PDF, JPG, PNG, TIFF), applies OCR to scanned documents, and extracts structured data: vendor details, line items, totals, dates, and payment terms. Assigns a confidence score to each extraction. |
| Validation Agent | Worker (Step 2) | Verifies mathematical correctness (line item totals, subtotal + tax = total), date logic, and field completeness. Auto-corrects minor rounding errors without modifying original data. |
| Categorization Agent | Worker (Step 3) | Assigns expense categories to each line item using a 14-category taxonomy, determines tax deductibility, and maps budget codes. Flags ambiguous items with low confidence for downstream review. |
| Approval Agent | Worker (Step 4) | Runs anomaly detection: duplicate invoice numbers, amounts above $5,000, first-time vendors, stale dates, and low-confidence extractions. Routes each invoice to auto-approved, needs-review, requires-approval, or rejected status. Creates Notion approval requests for flagged items. |
| Integration Agent | Worker (Step 5) | Records the fully processed invoice in the Notion Finance database, including all extraction data, validation results, categories, and approval status. Links to the CRM Companies database when a vendor match is found. Every invoice gets a record -- even rejected ones, for audit trail. |

## Data Flow

```
Invoice File → [Extraction: OCR + parse] → [Validation: math + date checks]
  → [Categorization: expense taxonomy] → [Approval: anomaly detection]
  → [Integration: Notion record] → Batch Summary
```

Each agent receives structured JSON from the previous agent and passes its enriched output forward. The batch orchestrator manages concurrency (up to 5 invoices in parallel), progress reporting (every 5 items), and failure handling (skip failed items, continue the batch).

## When to Use --team

Use the full team pipeline when you are processing more than a handful of invoices or when you need the rigor of separated validation, categorization, and approval routing. Specific scenarios where `--team` adds clear value:

- **End-of-month batch processing** -- drop a folder of invoices and walk away
- **First-time vendor invoices** -- the approval agent flags new vendors for review instead of silently recording them
- **High-value invoices** -- amounts above $5,000 automatically route to approval rather than auto-recording
- **Mixed-quality scans** -- the extraction agent's confidence scoring combined with the validation agent's checks catch OCR errors that a single agent might miss

For a single, clean PDF from a known vendor, the default single-agent mode is faster and sufficient.

## Example

```
/founder-os:invoice:batch --team --source ./invoices/2026-02/
```

Here is what happens step by step:

1. The batch orchestrator scans the folder and finds 12 invoice files (PDFs and scanned JPGs).
2. The first wave of 5 invoices enters the pipeline simultaneously, each starting at the Extraction Agent.
3. For each invoice, the Extraction Agent reads the file, applies OCR if needed, and outputs structured JSON with vendor details, line items, and a confidence score.
4. The Validation Agent checks every invoice's math -- verifying that line item totals add up, subtotal + tax equals the grand total, and dates make sense. A rounding error on one invoice is auto-corrected and logged.
5. The Categorization Agent assigns expense categories (office supplies, subscriptions, professional services, etc.) and flags one ambiguous line item with low confidence.
6. The Approval Agent runs anomaly detection. Two invoices are auto-approved (known vendors, amounts under threshold). One is flagged as "needs review" (first-time vendor). One triggers "requires approval" (total of $8,200 exceeds the $5,000 threshold). A Notion approval request is created for each flagged invoice.
7. The Integration Agent records all four invoices in the Notion Finance database, linking vendor names to CRM Companies where matches exist.
8. The second wave of 5 invoices begins. One scanned JPG fails OCR (blurred image) and is skipped. The remaining proceed through the full pipeline.
9. After all waves complete, a batch summary reports: 11 processed, 1 failed, 8 auto-approved, 2 needs-review, 1 requires-approval.

## Related

- [Invoice Commands](../commands/invoice.md) -- command reference for process and batch
