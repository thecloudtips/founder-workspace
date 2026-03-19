# Notion Command Center

> Create, query, update, and template Notion pages and databases using natural language.

## Overview

The Notion Command Center turns Notion into a conversational workspace. Instead of navigating menus and configuring properties by hand, you describe what you need in plain English and Founder OS handles the rest -- creating pages, designing database schemas, querying records, and updating properties.

This namespace covers four core operations that map to the most common Notion tasks founders perform daily: searching for information, creating new content, updating existing records, and deploying pre-built database templates. Every command understands your workspace structure, translates natural language into the correct Notion API calls, and confirms changes before executing them.

Whether you need a quick CRM lookup, a new project tracker with status columns and due dates, or a batch property update across pages, the Notion Command Center keeps you in the flow of conversation. It pairs naturally with the Drive and Slack integrations -- data you surface in Drive or decisions captured from Slack can feed directly into Notion pages and databases.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | All Notion read/write operations via `notion-tool.mjs` |
| Business Context | No | Personalizes output with your company terminology and strategy |

## Commands

### `/founder-os:notion:query`

**What it does** -- Search Notion pages and query databases using natural language questions. Automatically detects whether you are searching for a specific page, querying a database with filters, or browsing your workspace broadly.

**Usage:**
```
/founder-os:notion:query [question] [--db=NAME] [--limit=N]
```

**Example scenario:**
> You are preparing for a client call and need to see all overdue tasks in your Project Tracker database. You run `/founder-os:notion:query What are my overdue tasks? --db="Project Tracker"` and get a formatted list of tasks where the due date has passed and the status is not "Done," sorted by urgency.

**What you get back:**
- Formatted result cards with property values, sorted by relevance
- Database query results showing status, priority, dates, and assignees
- Page search results with content previews and parent context
- Aggregation answers for "how many" and "count" questions

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--db=NAME` | -- | Target a specific database by name for filtered queries |
| `--limit=N` | `10` | Maximum results to display (1-50) |

---

### `/founder-os:notion:create`

**What it does** -- Create a new Notion page or database from a natural language description. Automatically detects whether you want a page (single document) or a database (structured table), designs the schema or content, and confirms before creating.

**Usage:**
```
/founder-os:notion:create [description] [--type=page|database] [--parent=NAME]
```

**Example scenario:**
> You need a project tracker for your Q2 marketing campaigns. You run `/founder-os:notion:create A project tracker for Q2 marketing with status, priority, owner, and launch date` and Founder OS proposes a database schema with Status (select), Priority (select), Owner (people), and Launch Date (date) properties. After you confirm, it creates the database under the parent page you specify.

**What you get back:**
- For pages: a created Notion page with title and initial content, plus a direct URL
- For databases: a proposed schema table for your review, then the created database with all properties configured and a suggested default view

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--type=page\|database` | Auto-detect | Force creation of a page or database |
| `--parent=NAME` | Workspace root (pages) / prompted (databases) | Parent page name for the new content |

---

### `/founder-os:notion:update`

**What it does** -- Find a Notion page by title or URL, then update its properties or append content using natural language. Shows a before/after comparison and confirms before applying changes.

**Usage:**
```
/founder-os:notion:update [page] [changes] [--append]
```

**Example scenario:**
> A deal just closed and you need to update the CRM record. You run `/founder-os:notion:update "Project Alpha" set status to Done and priority to High` and Founder OS finds the page, shows a table with the current and proposed values side by side, and waits for your confirmation before applying the update.

**What you get back:**
- A before/after comparison table showing each changed property
- Confirmation prompt before any writes are executed
- Direct Notion URL to the updated page
- When using `--append`, a preview of the content blocks that will be added

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--append` | Off | Append content to the page body instead of updating properties |

---

### `/founder-os:notion:template`

**What it does** -- Deploy a pre-built business database template or list available templates. Templates include complete schemas with typed properties, default select options, and suggested views -- ready for immediate use.

**Usage:**
```
/founder-os:notion:template [template-name] [--parent=NAME]
```

**Example scenario:**
> You are setting up a new sales pipeline and need a contacts database. You run `/founder-os:notion:template CRM Contacts --parent="Sales"` and Founder OS presents the full 12-property schema (Name, Email, Company, Status, Deal Value, and more) for your approval. After you confirm, the database is created and ready to populate.

**What you get back:**
- Without a template name: a catalog of 5 available templates (CRM Contacts, Project Tracker, Content Calendar, Meeting Notes, Knowledge Wiki) with property counts
- With a template name: a full schema preview table, then the created database with all properties and a suggested view type

**Available templates:**
| Template | Properties | Best For |
|----------|-----------|----------|
| CRM Contacts | 12 | Tracking leads, clients, and business relationships |
| Project Tracker | 10 | Managing tasks with deadlines and ownership |
| Content Calendar | 11 | Planning content across channels |
| Meeting Notes | 8 | Recording decisions and action items |
| Knowledge Wiki | 9 | Organizing team knowledge and reference material |

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--parent=NAME` | Prompted | Parent page under which to create the database |

---

## Tips & Patterns

- **Start with templates, customize later.** Deploy a template with `/founder-os:notion:template`, then use `/founder-os:notion:update` to tweak individual records as your process evolves.
- **Use `--db` for precision.** When querying, specifying `--db="Project Tracker"` avoids ambiguous results across your workspace.
- **Natural language filters work well.** Queries like "high priority items assigned to Sarah" or "content published this month" are translated into proper database filters automatically.
- **Chain with other integrations.** Surface a document with `/founder-os:drive:search`, then log findings to Notion with `/founder-os:notion:create`. Or pull Slack decisions with `/founder-os:slack:digest` and track follow-ups in a Notion database.
- **Confirm before committing.** Both `create` and `update` show you exactly what will change and wait for your approval. You can modify the proposed schema or cancel at any point.

## Related Namespaces

- **[Drive](/commands/drive)** -- Search and summarize Google Drive documents; results can feed into Notion pages
- **[Slack](/commands/slack)** -- Capture Slack decisions and action items that you can track in Notion databases
- **[Client](/commands/client)** -- Client dossiers are assembled from Notion CRM data alongside email and calendar
- **[CRM](/commands/crm)** -- Syncs email and meeting data into the Notion CRM Communications database
