# Report Generator

> Transform raw data into polished, executive-ready reports with AI-powered analysis, Mermaid charts, and optional multi-agent pipelines.

## Overview

The Report Generator turns your data files, Notion databases, and Google Drive documents into professional Markdown reports -- complete with executive summaries, trend analysis, and embedded visualizations. Whether you have a CSV of quarterly sales figures or a folder of project metrics, Founder OS reads the data, runs statistical analysis, writes narrative prose, and delivers a report you can hand to stakeholders.

The namespace supports two modes. The default single-agent mode produces a 3-5 page report in one pass -- ideal for quick internal updates. The `--team` flag activates a full 5-agent pipeline (Research, Analysis, Writing, Formatting, QA) that produces deeper analysis with richer visualizations and a quality review pass. Team mode also records the finished report in your **Founder OS HQ - Reports** database in Notion.

Data sources are auto-detected: CSV, JSON, plain text, Markdown, log files, Notion databases, and Google Drive documents (via the gws CLI). You can point the command at a single file or an entire directory -- the system processes each source, merges results where appropriate, and highlights the most important findings.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Filesystem | Yes | Read data source files and write report output |
| Notion CLI | No | Record reports in the HQ Reports database (team mode) |
| gws CLI | No | Extract data from Google Drive documents |

## Commands

### `/founder-os:report:generate`

**What it does** -- Generates a polished Markdown report from one or more data sources. In default mode, it reads your data, performs statistical analysis, and writes a concise report with an executive summary, key findings, Mermaid charts, and recommendations. With `--team`, it runs the full 5-agent pipeline for deeper analysis and a QA review pass.

**Usage:**

```
/founder-os:report:generate [--data=PATH] [--output=PATH] [--team]
```

**Example scenario:**

> You have a CSV of Q4 sales data and need to brief your advisory board tomorrow. Run `/founder-os:report:generate --data=sales-q4.csv` and you get a report with revenue trends, top-performing segments, anomaly flags, and prioritized recommendations -- ready to share in under a minute.

**What you get back:**

A Markdown file in your output directory containing an executive summary, key findings with supporting metrics, 1-2 Mermaid chart visualizations, and actionable recommendations. The output summary shows the file path, data sources processed, section count, chart count, and a preview of the executive summary.

**Flags:**

- `--data=PATH` -- Path to a data file or directory. If omitted, you are prompted for a source.
- `--output=PATH` -- Output directory (default: `./report-output/`)
- `--team` -- Activate the full 5-agent pipeline with Notion recording

---

### `/founder-os:report:from-template`

**What it does** -- Generates a report using a predefined template that controls section layout and formatting. Three templates are available: `executive-summary` for quick stakeholder updates, `full-business-report` for quarterly deep dives, and `project-status-report` for RAG-status milestone tracking. Template placeholders are filled with your data, and chart markers are replaced with Mermaid visualizations.

**Usage:**

```
/founder-os:report:from-template [--template=NAME] [--data=PATH] [--output=PATH] [--team]
```

**Example scenario:**

> Your team runs weekly sprint retrospectives and you want a consistent format every time. Run `/founder-os:report:from-template --template=project-status-report --data=sprint-metrics.json` and the output follows your standard layout -- RAG status, milestone progress, action items -- with this week's data filled in automatically.

**What you get back:**

A Markdown report following the chosen template structure exactly, with data-derived content filling each section. If no template is specified, you see a list of available templates with descriptions to choose from.

**Flags:**

- `--template=NAME` -- Template name: `executive-summary`, `full-business-report`, or `project-status-report`. If omitted, lists available templates.
- `--data=PATH` -- Path to data source. If omitted, you are prompted.
- `--output=PATH` -- Output directory (default: `./report-output/`)
- `--team` -- Activate the full 5-agent pipeline with Notion recording

---

## The 5-Agent Pipeline (Team Mode)

When you use `--team`, the report passes through five specialized agents in sequence:

| Order | Agent | Role |
|-------|-------|------|
| 1 | Research Agent | Gathers and extracts data from all specified sources |
| 2 | Analysis Agent | Computes statistics, detects trends, identifies outliers and correlations |
| 3 | Writing Agent | Generates report prose with executive summary and narrative data interpretation |
| 4 | Formatting Agent | Adds Mermaid charts, formats tables, polishes the final output |
| 5 | QA Agent | Reviews for accuracy, consistency, and data integrity (recommend-only) |

Each agent passes structured JSON output to the next. The pipeline produces a richer report than single-agent mode and includes a QA review with flags for anything that warrants a second look.

## Supported Data Sources

| Source Type | How It Works |
|-------------|--------------|
| `.csv` files | Auto-detects delimiters, headers, and column types |
| `.json` files | Supports arrays and nested objects with automatic flattening |
| `.txt` / `.md` / `.log` files | Pattern-matches tables, key-value pairs, and log entries |
| Notion databases | Queries via Notion CLI with dynamic database discovery |
| Google Drive | Exports Sheets as CSV, Docs as text via gws CLI |
| Directories | Scans for all supported file types and processes each |

## Tips & Patterns

- **Start with default mode** for quick turnaround, then re-run with `--team` when you need a presentation-quality report.
- **Point at a directory** when your data lives across multiple files -- the system merges results and reports which files were included.
- **Use templates** for recurring reports (weekly status, monthly reviews) to maintain a consistent format your stakeholders recognize.
- **Business context files** in `_infrastructure/context/active/` are loaded automatically. If you have `business-info.md` and `strategy.md` set up, reports use your company terminology and align recommendations with your current strategy.
- The report generator learns your preferences over time. If you consistently prefer certain chart types or section lengths, the Intelligence Engine adapts.

## Related Namespaces

- **[Health](/docs/commands/health)** -- Client health reports use the same data analysis pipeline. Health scan results can feed into broader business reports.
- **[Invoice](/docs/commands/invoice)** -- Invoice batch summaries provide financial data that pairs well with the report generator for expense analysis.
