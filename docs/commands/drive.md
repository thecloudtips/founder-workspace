# Google Drive Brain

> Search, summarize, organize, and ask questions across your Google Drive files.

## Overview

The Google Drive Brain turns your Drive into a searchable knowledge base. Instead of clicking through nested folders and opening documents one by one, you ask questions in plain English and get answers with citations, structured summaries, or organization recommendations -- all without leaving your terminal.

This namespace covers four complementary operations. Search finds files by keyword with relevance scoring and preview snippets. Summarize extracts the key points from any document at quick or detailed depth. Ask goes further -- it searches across multiple documents and synthesizes a sourced answer with inline citations and confidence levels. Organize audits a folder's contents and suggests a cleaner structure (without moving anything).

Every command scores results on a 0-100 relevance scale using keyword density, title match, and recency factors, so the most useful files surface first. Activity is optionally logged to a Notion database for tracking, and all commands work with Google Docs, Sheets, Slides, PDFs, and plain text files.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| gws CLI (Drive) | Yes | Google Drive file search, folder traversal, and content extraction |
| Notion CLI | No | Optional activity logging to the Founder OS Activity Log database |
| Business Context | No | Personalizes results with your company and client context |

## Commands

### `/founder-os:drive:search`

**What it does** -- Search Google Drive for files matching your query. Generates multiple query variants for broader recall, scores results by relevance, and presents a ranked list with preview snippets and freshness indicators.

**Usage:**
```
/founder-os:drive:search [query] [--type=docs|sheets|pdf|all] [--in=FOLDER] [--limit=N]
```

**Example scenario:**
> You need the latest version of a client proposal but cannot remember the exact filename. You run `/founder-os:drive:search proposal Phoenix --type=pdf --in="Client Projects"` and get a ranked list of PDF files in your Client Projects folder, each with a content preview and relevance score, with the most relevant Phoenix proposal at the top.

**What you get back:**
- Ranked file list with relevance scores (0-100)
- 500-character content previews for each result
- Freshness indicators (Fresh, Current, Aging, Stale)
- Folder breadcrumb paths showing where each file lives
- File type labels and last-modified dates

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--type=TYPE` | `all` | Filter by file type: `docs`, `sheets`, `pdf`, or `all` |
| `--in=FOLDER` | All Drive | Scope search to a specific folder name |
| `--limit=N` | `10` | Maximum results to display (1-20) |
| `--schedule=EXPR` | -- | Schedule recurring searches via cron expression |

---

### `/founder-os:drive:summarize`

**What it does** -- Generate a structured summary of a Google Drive document. Quick mode produces an executive summary with key bullet points. Detailed mode adds section-by-section analysis. Optionally saves the summary to a local file.

**Usage:**
```
/founder-os:drive:summarize [file-id-or-name] [--depth=quick|detailed] [--output=PATH]
```

**Example scenario:**
> Before a board meeting, you need to quickly review a 20-page Q1 revenue report. You run `/founder-os:drive:summarize "Q1 Revenue Report" --depth=detailed` and get an executive summary, 5-8 key bullet points, and a section-by-section analysis covering each major heading in the document -- all in under a minute.

**What you get back:**
- Executive summary (2-3 sentences covering purpose, audience, key content)
- Key points (5-8 standalone bullet points)
- Section-by-section analysis (detailed mode only)
- Data highlights for spreadsheets (tab names, row counts, key metrics)
- Slide breakdown for presentations (detailed mode only)

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--depth=LEVEL` | `quick` | Summary depth: `quick` (bullet points) or `detailed` (section-by-section) |
| `--output=PATH` | -- | Save the summary to a local markdown file |

---

### `/founder-os:drive:ask`

**What it does** -- Ask a natural language question and get a sourced answer synthesized from your Google Drive documents. Searches for relevant files, extracts content, and composes an answer with inline citations, confidence assessment, and staleness warnings.

**Usage:**
```
/founder-os:drive:ask [question] [--in=FOLDER] [--limit=N]
```

**Example scenario:**
> A team member asks about your refund policy and you need the exact terms. You run `/founder-os:drive:ask What is our refund policy?` and get a direct answer citing the specific policy document in Drive, with a confidence level of "High" and a link to the source file for verification.

**What you get back:**
- Direct answer with inline citations (e.g., `[1]`, `[2]`)
- Confidence level (High, Medium, or Low) with explanation
- Numbered source list with document titles and Drive URLs
- Staleness warnings for sources older than 90 days
- Partial coverage notes when the question is only partially answered
- Alternative search suggestions when no definitive answer is found

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--in=FOLDER` | All Drive | Scope search to a specific folder |
| `--limit=N` | `5` | Maximum source documents for answer synthesis (1-5) |

---

### `/founder-os:drive:organize`

**What it does** -- Analyze a Google Drive folder and suggest organizational improvements. Detects file groupings, naming inconsistencies, potential duplicates, and stale files. This command is recommend-only -- it never moves, renames, or deletes files.

**Usage:**
```
/founder-os:drive:organize [folder-id-or-name] [--strategy=project|date|type]
```

**Example scenario:**
> Your "Client Projects" folder has grown to 40+ files with no consistent structure. You run `/founder-os:drive:organize "Client Projects" --strategy=project` and get a recommended folder structure that groups files by detected project names, flags 3 potential duplicates, identifies 5 stale files untouched in 6 months, and suggests a consistent naming convention.

**What you get back:**
- Current folder structure visualization
- Recommended folder structure with file-to-folder assignments
- Move suggestion table with rationale for each grouping
- Naming inconsistency observations with suggested conventions
- Potential duplicate flags (similar names or identical file sizes)
- Stale file list (unmodified for 180+ days)

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--strategy=STRATEGY` | `project` | Organization approach: `project` (by topic), `date` (by year/month), `type` (by file format) |

---

## Tips & Patterns

- **Ask before you search.** If you need a specific answer (not just a file), use `/founder-os:drive:ask` -- it searches, reads, and synthesizes in one step.
- **Use `--in` to reduce noise.** Scoping searches and questions to a specific folder dramatically improves relevance when you know the general area.
- **Summarize before meetings.** Run `/founder-os:drive:summarize --depth=detailed` on key documents the morning of a meeting for fast preparation.
- **Organize quarterly.** Run `/founder-os:drive:organize` on your busiest folders every quarter. Review the suggestions and apply the ones that make sense -- the command never touches your files.
- **Check confidence levels.** When `/founder-os:drive:ask` returns "Low confidence," treat the answer as a starting point, not a final answer. The source links let you verify directly.
- **Combine with Notion.** Summarize a Drive document, then create a Notion page from the summary with `/founder-os:notion:create`.

## Related Namespaces

- **[Notion](/commands/notion)** -- Create Notion pages and databases from information discovered in Drive
- **[Slack](/commands/slack)** -- Slack discussions often reference Drive documents; use both to get the full picture
- **[Client](/commands/client)** -- The client dossier draws from Drive documents alongside CRM and email data
- **[CRM](/commands/crm)** -- CRM context can help you find the right client-related files faster
