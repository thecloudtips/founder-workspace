# Expense Report

> Summarize spending at a glance or generate a comprehensive 7-section expense report with category breakdowns, tax deductibility, and trend analysis.

## Overview

The Expense Report namespace has two commands designed for different moments in your week. The `summary` command is the quick check — type it and get your total spending, category breakdown, top vendors, and tax-deductible amount displayed directly in chat. No files created, no databases written to. It is built for the "how much did I spend this month?" question.

The `report` command is the full picture. It produces a 7-section Markdown expense report covering a specified date range: cover page, executive summary, category breakdown across 14 standard categories, vendor summary, tax deductibility analysis, budget code allocation by department, and trend analysis comparing against the prior period. The report is saved to disk and optionally logged to your Notion Reports database.

Both commands aggregate data from two sources: your Notion Finance database (where invoices processed by the Invoice Processor live) and local CSV files in your working directory. Records are merged and deduplicated automatically — matching by invoice number first, then by vendor, amount, and date proximity. Uncategorized local expenses are classified using a built-in 14-category taxonomy with confidence scoring, so you know exactly which items need manual review.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Filesystem | Yes | Read local CSV files and receipt directories; write report output |
| Notion CLI | No | Query the Finance database for processed invoices; log reports to the Reports database |

## Commands

### `/founder-os:expense:summary`

**What it does** — Produces a quick spending overview for a date range, displayed directly in chat. Shows total spending, category breakdown, top vendors, and tax-deductible amount. This command is ephemeral by design — it does not save files or write to Notion.

**Usage:**

```
/founder-os:expense:summary [date-range] --top=N
```

**Example scenario:**

> It is the middle of the month and you want a quick pulse on spending. You type `/founder-os:expense:summary` and instantly see that you have spent $8,420 across 22 invoices this month, with software as the top category at 34% of total spend, and $7,156 (85%) is tax deductible. Your top 10 vendors are listed with totals and invoice counts.

**What you get back:**

A formatted summary displayed in chat with three sections:

- **Total** — Dollar amount and invoice count for the period
- **By Category** — Each category with amount and percentage of total (only categories with non-zero spend are shown)
- **Top N Vendors** — Vendor name, total spent, and number of invoices

The summary ends with a tax-deductible total showing the combined fully and partially deductible amount and its percentage of overall spending.

**Date range formats:**

- Explicit: `2024-03`, `Q1 2024`, `2024-01 to 2024-03`
- Relative: `this month`, `last month`, `this quarter`, `last quarter`
- Default (no argument): current calendar month

**Flags:**

- `--top=N` — Maximum number of vendors to display (default: 10, minimum: 1)

---

### `/founder-os:expense:report`

**What it does** — Generates a comprehensive 7-section Markdown expense report for a date range. Aggregates data from your Notion Finance database and local files, deduplicates records, categorizes uncategorized items, calculates tax deductibility, compares against the prior period, and saves the report to disk. Optionally logs the report metadata to your Notion Reports database.

**Usage:**

```
/founder-os:expense:report [date-range] --output=PATH --sources=notion|local|all
```

**Example scenario:**

> It is April 1st and you need a Q1 expense report. You run `/founder-os:expense:report Q1 2024` and Founder OS queries your Notion Finance database for all approved invoices in the range, scans your local `invoices/` directory for CSV files, merges and deduplicates the two sources (removing 3 duplicates), categorizes 5 local receipts that were not yet processed, and generates the full report. The trend analysis section shows a 14% increase over Q4 2023, flags a significant spike in hardware spending, and notes two new spending categories. Three items with low classification confidence are flagged for your review.

**What you get back:**

A 7-section Markdown report saved to disk (and displayed as a summary in chat):

1. **Cover Page** — Report title, date range, generation date, data sources used
2. **Executive Summary** — Total expenses, invoice count, top category, tax deductible percentage, period-over-period change
3. **Category Breakdown** — All 14 expense categories with amount, percentage of total, item count, and budget code. Zero-spend categories are included for completeness.
4. **Vendor Summary** — Top 20 vendors by total spend with invoice counts and primary category
5. **Tax Deductibility Summary** — Three tiers: fully deductible, partially deductible (meals at 50%, travel at 85% when line-item split is unavailable), and non-deductible/pending review
6. **Budget Code Allocation** — Expenses grouped by department (Operations, Technology, Services, Travel, Facilities, Administration, Marketing, Human Resources, General)
7. **Trend Analysis** — Period-over-period comparison with total spend change, invoice count change, average invoice size change, daily spending rate, and per-category shift analysis with flags (significant spike, notable increase, stable, notable decrease, significant drop, new spending, eliminated)

A completion summary is also displayed in chat showing key metrics and any flagged items that need attention.

**Flags:**

- `--output=PATH` — File path or directory for the report (default: `expense-reports/[period-slug]-[YYYY-MM-DD].md`)
- `--sources=notion|local|all` — Which data sources to query: `notion` for the Finance database only, `local` for local files only, `all` for both merged (default: `all`)

---

## How Categorization Works

When local expense files lack a category assignment, the Expense Report command classifies them automatically using a 14-category taxonomy:

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

Classification uses three signal tiers in priority order: vendor name matching (highest weight), description and line-item keyword matching, and amount-based pattern matching (tiebreaker). Each classified expense receives a confidence score between 0.0 and 1.0. Items scoring below 0.7 are flagged as "needs review" in the report so you can confirm or override the category.

Expenses already categorized by the Invoice Processor are accepted as-is and not re-classified.

---

## Tips & Patterns

- **Use `summary` for quick checks, `report` for stakeholder deliverables**: The summary command is designed for your own awareness — run it anytime. The report command produces a document you can share with your accountant, co-founder, or board.
- **Process invoices first for best results**: Run `/founder-os:invoice:process` or `/founder-os:invoice:batch` before generating expense reports. Processed invoices carry richer metadata (category, budget code, tax deductibility) and reduce the number of items that need automatic classification.
- **Partial periods are handled gracefully**: If you run a report for the current month, the end date is clamped to today and the report is marked as a partial period. The trend analysis still compares against the full prior period, with a note about the partial data.
- **Mixed currencies are flagged, not converted**: If your expense data includes multiple currencies, amounts are reported in the majority currency. Entries in other currencies are flagged for manual review rather than converted at potentially stale exchange rates.
- **The `--sources` flag is useful for debugging**: If your totals look off, run the report with `--sources=notion` and `--sources=local` separately to see which source contributes what.

## Related Namespaces

- **[Invoice](/docs/commands/invoice)** — Process raw invoices and receipts into categorized, approved records in the Finance database. This is the primary data pipeline that feeds the Expense Report.
- **[Contract](/docs/commands/contract)** — Analyze contracts that govern your vendor relationships and spending commitments
- **[SOW](/docs/commands/sow)** — Generate Statements of Work that define the scope and budget for professional services expenses
