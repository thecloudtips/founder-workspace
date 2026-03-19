# Report Generator Agent Team

> Pipeline: Sequential data-to-report pipeline from research through QA

## Overview

The Report Generator agent team transforms raw data files into polished, publication-ready business reports. Five agents work in sequence -- research, analysis, writing, formatting, and QA -- each one building on the previous agent's output. Feed it CSV files, JSON data, Notion databases, or Google Drive documents, and the pipeline produces a structured Markdown report with an executive summary, Mermaid charts, formatted tables, and a QA review log.

By default, `/founder-os:report:generate` runs in single-agent mode and produces a simpler report from your data sources. When you add `--team`, the full five-agent pipeline activates, bringing statistical analysis (descriptive statistics, trend detection, outlier identification, correlation analysis), professional prose with template support, auto-generated visualizations, and a QA pass that cross-references every number against the source data.

The pipeline is strictly sequential, with each agent's output feeding directly into the next. This ensures data integrity: the research agent extracts raw data, the analysis agent computes insights without modifying source data, the writing agent narrates findings without inventing numbers, the formatting agent visualizes without altering prose, and the QA agent validates everything without changing the report.

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| research-agent | Step 1 | Identifies and extracts data from all specified sources (CSV, JSON, text, Notion databases, Google Drive documents via `gws` CLI), detects formats, normalizes column names and types, and outputs a unified structured dataset with per-source metadata |
| analysis-agent | Step 2 | Validates data quality (completeness, consistency, validity), computes descriptive statistics for all numeric fields, detects time-series trends with growth rates and moving averages, runs comparative analysis across categorical groups, identifies outliers via Z-score and IQR, assesses correlations between metrics, and ranks the top 10 key findings |
| writing-agent | Step 3 | Structures the report following template or default format (Executive Summary, Introduction, Methodology, Findings, Discussion, Recommendations, Appendix), writes professional prose backed by specific numbers, places chart markers for the formatting agent, caps the executive summary at 400 words |
| formatting-agent | Step 4 | Replaces chart markers with Mermaid diagrams (bar, line, pie, gantt, flowchart), formats all tables with proper alignment, generates a table of contents for longer reports, writes the final output file |
| qa-agent | Step 5 | Cross-references every number in the report against source data, checks for internal contradictions, validates Mermaid syntax, reviews executive summary against a QA checklist, logs report metadata to Notion "[FOS] Reports" database with Type="Business Report" -- strictly recommend-only, never modifies the report |

## Data Flow

```
Data Sources → [Research: extract + normalize] → [Analysis: statistics + trends + findings]
            → [Writing: prose + chart markers] → [Formatting: charts + tables + file]
            → [QA: validate + log → final report]
```

Each agent passes its structured JSON output to the next agent in the chain. The research agent's normalized dataset feeds into analysis. The analysis agent's findings and metrics feed into writing. The writing agent's Markdown with chart markers plus the original data feed into formatting. The formatting agent's final file plus the source data feed into QA for cross-referencing. The pipeline halts on failure at any step, preserving upstream outputs.

## When to Use --team

The full pipeline is designed for reports that need to be accurate, well-structured, and presentation-ready. Key scenarios:

- **Quarterly revenue or performance reports.** When you need trend analysis, comparisons across regions or products, and polished charts, the pipeline handles everything from raw CSVs to a finished report with Mermaid visualizations.
- **Client health reports.** Pull data from your Notion CRM and local metrics files. The analysis agent computes health trends, the writing agent narrates the findings, and the QA agent validates every number.
- **Board or investor updates.** When accuracy is non-negotiable, the QA agent's cross-referencing catches discrepancies between the executive summary and the data tables -- the kind of errors that erode credibility.
- **Template-driven recurring reports.** If you have a report template (quarterly-review, project-status, executive-summary), the writing agent follows the template structure exactly, making month-over-month reports consistent.

Single-agent mode is sufficient for quick ad-hoc summaries or when you just need a data overview without the full analytical treatment.

## Example

```
/founder-os:report:generate --team --spec="Q4 Revenue Summary" --sources=revenue.csv,clients.json
```

Here is what happens step by step:

1. **Research agent** detects that `revenue.csv` is a CSV with 150 rows and 4 columns (date, product, revenue, region) and `clients.json` is a JSON file with 42 records (company_name, deal_stage, value, last_contact). It normalizes all column names to snake_case, converts dates to ISO format, and strips currency formatting from revenue values.
2. **Analysis agent** runs data quality checks (100% completeness on revenue, 93% on last_contact with 3 missing values). It computes descriptive statistics, detects a 34% year-over-year revenue increase with R-squared=0.87 confidence, identifies the West region as the top performer at 34.4% revenue share, finds a strong positive correlation (r=0.82) between marketing_spend and monthly_revenue with a 2-period lead, and flags a December revenue outlier as likely seasonal.
3. **Writing agent** produces a 3,180-word Markdown report with 7 sections. The executive summary (380 words) leads with the 34% growth finding. Chart markers are placed for a monthly revenue line chart, a revenue-by-region bar chart, and a client segment pie chart. All claims cite specific numbers from the analysis.
4. **Formatting agent** replaces 3 chart markers with Mermaid diagrams, right-aligns all numeric columns in tables, generates a table of contents (7 H2 sections), and writes the file to `report-2026-03-19-q4-revenue-summary.md`.
5. **QA agent** cross-references every metric against the source data, confirms all numbers match, validates 3 Mermaid blocks for syntax, checks the executive summary against the QA checklist (under 400 words, situation-findings-recommendations structure, specific numbers cited). It passes with 0 critical issues and 1 info-level note about the December outlier. Report metadata is logged to "[FOS] Reports" in Notion with Type="Business Report".

The final report is ready for distribution -- accurate, well-visualized, and QA-verified.

## Related

- [Report Commands](../commands/report.md) -- command reference for generate and from-template
