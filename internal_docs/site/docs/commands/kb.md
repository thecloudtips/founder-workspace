# Knowledge Base

> Search, query, and index your company knowledge across Notion and Google Drive with sourced answers and confidence ratings.

## Overview

The Knowledge Base namespace turns your scattered documentation into a searchable, citable resource. It connects to Notion pages and databases as the primary source and Google Drive as an optional secondary source, then lets you ask natural-language questions and get answers backed by inline citations, confidence ratings, and links to the original documents.

Three commands cover the full knowledge lifecycle. The `index` command crawls your workspace and catalogs every document with a 9-type classification (wiki, meeting notes, project docs, process, reference, template, database, archive, other), freshness tier, and extracted keywords. The `find` command searches for documents matching a topic and returns a ranked list with previews -- useful for discovery when you know roughly what you're looking for. The `ask` command goes further: it searches, retrieves the most relevant content, synthesizes a cited answer with a confidence rating (High, Medium, or Low), and logs the query to Notion for tracking.

All three commands work even if Google Drive is not configured -- Notion is the required backbone. Drive adds broader coverage when available, but the system never blocks on a missing optional source.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | Search pages and databases, read content, log queries and index records |
| gws CLI (Drive) | Optional | Search Google Drive documents for broader knowledge coverage |
| WebFetch | Optional | Fetch URL content for the `facts` command (not needed for `ask`, `find`, or `index`) |

## Commands

### `/founder-os:kb:ask`

**What it does** -- Searches your Notion workspace and Google Drive for documents relevant to your question, scores them for relevance, synthesizes an answer with inline citations, assigns a confidence rating (High, Medium, or Low), and logs the query to the **[FOS] Knowledge Base** database (with `Type = "Query"`).

**Usage:**
```
/founder-os:kb:ask What is our refund policy?
/founder-os:kb:ask How do I set up a new client project? --sources=notion
/founder-os:kb:ask What are the steps for employee onboarding? --limit=3
```

**Example scenario:**
> A new team member asks about your onboarding process. Instead of searching Notion manually, you run `/founder-os:kb:ask How do I onboard a new contractor?`. The system generates three query variants ("onboarding new contractors", "getting started contractors", "onboarding"), searches Notion and Drive, finds two relevant pages, and synthesizes an answer: "Contractor onboarding follows a 5-step process outlined in the Operations wiki [1]. Start by creating a project in Notion, then..." with High confidence because two sources agree and both were updated recently.

**What you get back:**

A formatted answer with a confidence badge at the top, inline numbered citations throughout, a Sources block with document titles and links, and optional warnings about stale sources or partial coverage. If no answer is found, you get a list of the closest documents and suggested alternative search terms. The query is logged to Notion for future reference.

**Flags:**
- `--sources=notion|drive|all` -- Which sources to search (default: `all`)
- `--limit=N` -- Maximum source documents to use for synthesis, 1-5 (default: `5`)

---

### `/founder-os:kb:find`

**What it does** -- Searches Notion and Google Drive for documents matching a topic, scores them for relevance using keyword density, title match, and recency, and returns a ranked list of preview cards. This is a discovery tool -- it shows what documents exist without synthesizing an answer. Ephemeral output only; nothing is saved to Notion.

**Usage:**
```
/founder-os:kb:find onboarding
/founder-os:kb:find "deployment process" --type=process
/founder-os:kb:find pricing --sources=notion --limit=5
/founder-os:kb:find API documentation --type=reference --limit=20
```

**Example scenario:**
> You vaguely remember a document about pricing tiers but cannot find it. You run `/founder-os:kb:find pricing --type=reference`. The system returns 4 results ranked by relevance: "Pricing and Plans" (reference, Fresh, score 87/100), "Enterprise Pricing FAQ" (reference, Current, score 72/100), and two others. Each result includes a 150-character preview and a direct link.

**What you get back:**

A ranked list of documents with title, classification type, freshness tier (Fresh/Current/Aging/Stale), a 150-character content preview, source type (Notion Page, Notion Database, or Google Drive), relevance score out of 100, and a direct link. A footer suggests running `/founder-os:kb:ask` for a synthesized answer.

**Flags:**
- `--sources=notion|drive|all` -- Which sources to search (default: `all`)
- `--type=TYPE` -- Filter results by classification: `wiki`, `meeting-notes`, `project-docs`, `process`, `reference`, `template`, `database`, `archive`, `other`, or `all` (default: `all`)
- `--limit=N` -- Maximum results to display, 1-20 (default: `10`)

---

### `/founder-os:kb:index`

**What it does** -- Crawls your Notion workspace and Google Drive to build a structured catalog of all knowledge sources. For each document, it extracts metadata, classifies content into a 9-type taxonomy, computes a freshness tier, extracts topic keywords, and writes records to the **[FOS] Knowledge Base** database (with `Type = "Source"`). The index powers fast retrieval for `kb:ask` and `kb:find` without re-scanning on every query.

**Usage:**
```
/founder-os:kb:index
/founder-os:kb:index --scope=notion
/founder-os:kb:index --scope=drive --folder="Client Projects"
```

**Example scenario:**
> You just onboarded your team to Notion and have 200+ pages of documentation scattered across the workspace. You run `/founder-os:kb:index` to catalog everything. The system discovers 187 Notion pages and 43 Google Drive documents, classifies each one (52 wiki pages, 38 meeting notes, 27 project docs, etc.), computes freshness tiers, and writes all records to the Knowledge Base database. The summary shows 14 stale documents that may need updating.

**What you get back:**

A comprehensive index summary: total sources indexed (new, updated, archived), a breakdown by classification type with freshness distribution, and a freshness overview. If any sources failed metadata extraction, error details are listed. The index is stored in Notion for use by other KB commands.

**Flags:**
- `--scope=notion|drive|all` -- Which platforms to scan (default: `all`)
- `--folder=PATH` -- Scope Google Drive discovery to a specific folder (only applies when scope includes Drive)

---

## Tips & Patterns

- **Index first, then query**: Run `/founder-os:kb:index` once to build your catalog, then use `kb:ask` and `kb:find` for day-to-day queries. Re-run index periodically to catch new documents and update freshness tiers.
- **Use `find` for browsing, `ask` for answers**: When you know a document exists but cannot remember the name, use `find`. When you need a specific answer with citations, use `ask`.
- **Filter by type for precision**: Looking for a process doc? Use `--type=process`. Need meeting notes? Use `--type=meeting-notes`. Type filters dramatically reduce noise in large workspaces.
- **Watch the freshness tiers**: Documents marked "Stale" (180+ days since edit) may contain outdated information. The system flags these in answers and suggests verification.
- **Confidence as a trust signal**: High confidence means multiple recent sources agree. Low confidence means weak matches or conflicting sources. Use the confidence rating to decide whether to trust the answer or verify manually.

## Related Namespaces

- [Ideate](./ideate.md) -- Content ideation can reference knowledge base documents as source material via `ideate:from-doc`
- [Notion](./notion.md) -- The Notion Command Center provides lower-level database operations; KB wraps those with search intelligence
- [Drive](./drive.md) -- Google Drive Brain provides file-level search and summarization; KB integrates Drive search into a cross-source knowledge layer
