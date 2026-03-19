# [19] Obsidian Integration Design

> **Status:** Draft
> **Date:** 2026-03-18
> **Updated:** 2026-03-19

## Problem

Founder OS is tightly coupled to Notion as its sole data backend. 22 of 33 command namespaces call `notion-tool.mjs` directly — there is no storage abstraction layer. This locks users into Notion and excludes founders who prefer local-first, markdown-based workflows with Obsidian.

## Solution

Introduce a **storage abstraction layer** (`storage-tool.mjs`) with an adapter pattern that routes operations to either Notion or Obsidian based on a one-time backend choice at install. Obsidian backend uses **SQLite for structured queries** and the **Obsidian CLI for vault operations**, producing markdown companion files with YAML frontmatter and wiki-links for graph navigation.

## Goals

1. Full backend alternative — a user who picks Obsidian never needs Notion
2. Zero regressions for existing Notion users
3. All command namespaces work with Obsidian — 36 command entry points across 33 canonical namespaces (some namespaces like `social`/`linkedin` and `ideate`/`scout` share entry points)
4. Clean migration path between backends

## Architecture

### Storage Abstraction Layer

`storage-tool.mjs` is a drop-in replacement for `notion-tool.mjs`. It reads backend config from `.founderOS/config.json` and delegates to the appropriate adapter.

```
User picks Notion   → storage-tool.mjs → notion-adapter.mjs   → Notion API (unchanged)
User picks Obsidian → storage-tool.mjs → obsidian-adapter.mjs → SQLite + Obsidian CLI
```

**CLI interface** (unchanged from notion-tool):

```
storage-tool.mjs search <query>
storage-tool.mjs create-page <parent> --props '{}' --content '...'
storage-tool.mjs create-database <parent> --schema '...'
storage-tool.mjs query <database> --filter '...' --sort '...'
storage-tool.mjs get-page <id>
storage-tool.mjs get-blocks <id>
storage-tool.mjs update-page <id> --props '{}'
storage-tool.mjs update-database <id> --schema '...'
storage-tool.mjs delete-page <id>
storage-tool.mjs archive-page <id>
```

**File structure:**

```
scripts/
  storage-tool.mjs            # CLI entry point — reads config, delegates
  adapters/
    notion-adapter.mjs         # Wraps existing notion-tool.mjs logic
    obsidian-adapter.mjs       # SQLite + Obsidian CLI operations
  config/
    backend-config.mjs         # Reads .founderOS/config.json
```

### Config Persistence

```json
{
  "backend": "obsidian",
  "obsidian": {
    "vaultPath": "/Users/me/FOS-Vault",
    "dbPath": ".fos/fos.db",          // relative to vaultPath
    "cliAvailable": true
  },
  "notion": {
    "apiKey": "env:NOTION_API_KEY"
  }
}
```

Located at `.founderOS/config.json` in the project root. The `notion.apiKey` field references the environment variable rather than storing the secret directly.

### Notion Adapter

Wraps the existing `notion-tool.mjs` logic. All current Notion behavior is preserved — same API calls, same consolidated database model, same HQ workspace. The adapter translates abstract table names (e.g., `tasks`) back to Notion-specific database names (e.g., `[FOS] Tasks`) and applies the existing discovery protocol (search by name with fallback chain).

### Obsidian Adapter

Dual-layer architecture: SQLite for structured data, Obsidian CLI for vault file operations.

**Vault interaction:**

- **Primary:** Obsidian CLI (official, ships with Obsidian v1.12+). Acts as a remote control for the running Obsidian app. Handles file creation, moves (with automatic wikilink rewriting), and search.
- **Fallback:** Direct file I/O when Obsidian is not running. Logs a warning that wikilinks may not auto-update. Sufficient for headless/CI scenarios.

**Write flow:**
1. Insert/update SQLite row
2. Generate markdown file via Obsidian CLI (or direct write as fallback)
3. Markdown includes YAML frontmatter with `fos_id` linking back to SQLite row

**Read/query flow:**
1. SQLite only — fast, supports filters/sorts/joins
2. Markdown files are never parsed back into SQLite (output-only)

## SQLite Schema

Database lives inside the vault at `.fos/fos.db` (hidden folder, won't clutter Obsidian's file explorer). Contains 21 data tables mirroring Notion's consolidated databases, plus 1 meta table (22 total):

```sql
-- CRM
companies        (id, name, industry, status, website, health_score, created, modified)
contacts         (id, name, role, type, email, company_id FK, last_contact, created, modified)
deals            (id, name, value, stage, probability, close_date, company_id FK, created, modified)
communications   (id, date, type, summary, sentiment, company_id FK, contact_id FK, created, modified)

-- Operations
tasks            (id, title, status, priority, type, assignee, due_date, source_namespace, created, modified)
meetings         (id, title, date, attendees_json, summary, action_items_json, company_id FK, created, modified)

-- Financial
finance          (id, type, amount, status, due_date, description, company_id FK, created, modified)
reports          (id, type, title, date, content_hash, vault_path, company_id FK, created, modified)

-- Intelligence
briefings        (id, type, date, content_hash, vault_path, created, modified)
memory           (id, key, value, namespace, tags_json, ttl, vector_json, created, modified)
learnings        (id, title, topics_json, source_type, iso_week, related_json, created, modified)
research         (id, type, title, source, findings_hash, vault_path, company_id FK, created, modified)

-- Content
content          (id, type, title, status, body_hash, vault_path, created, modified)
deliverables     (id, type, title, status, company_id FK, vault_path, created, modified)

-- Growth
goals            (id, title, status, category, target_date, progress, created, modified)
milestones       (id, title, goal_id FK, due_date, status, created, modified)
knowledge_base   (id, title, topic, source, tags_json, created, modified)
prompts          (id, title, category, content_hash, vault_path, created, modified)
workflows        (id, title, trigger, steps_hash, vault_path, created, modified)
weekly_insights  (id, iso_week, themes_json, connections_json, vault_path, created, modified)
activity_log     (id, date, type, source, summary, entity_id, entity_type, created, modified)

-- Meta
_fos_meta        (schema_version, last_sync, backend_version)
```

Foreign keys preserve the same relational model as Notion's cross-database relations.

### Memory Engine Integration

The existing Memory Engine uses a separate SQLite store at `.memory/memory.db` with HNSW vector indexing. When the Obsidian backend is active:

- The `memory` table in `.fos/fos.db` replaces `.memory/memory.db` as the canonical store
- The `vector_json` column stores serialized embedding vectors for HNSW compatibility
- The Memory Engine's `memory-store.mjs` is updated to read from `backend-config.mjs` and use the appropriate SQLite path
- HNSW index files (`.memory/*.hnsw`) relocate to `.fos/` alongside `fos.db`
- For Notion backend users, `.memory/memory.db` continues to work unchanged

### Delete and Archive Operations

When a record is deleted or archived:
- **`delete-page`:** Hard delete — SQLite row removed permanently; markdown file moved to `_Archive/{original-folder}/` as a safety net (recoverable by user but invisible to FOS queries)
- **`archive-page`:** Soft delete — SQLite row preserved with `archived_at` timestamp and `status=archived`; markdown file moved to `_Archive/{original-folder}/`. Archived records can be queried with `--include-archived` filter and restored via `update-page` (clear `archived_at`)
- The `_Archive/` folder is excluded from Obsidian's graph view via `.obsidian/app.json` excluded files config
- **Key distinction:** `delete` = gone from SQLite (file kept as backup); `archive` = queryable in SQLite (just hidden from default views)

## Vault Folder Structure

Organized by functional workflow — how founders actually use the data:

```
FOS-Vault/
  .fos/                           # Hidden — SQLite DB, FOS metadata
    fos.db
  Daily/                          # Date-scoped outputs
    {YYYY-MM-DD}/
      morning-briefing.md
      daily-briefing.md
      slack-digest.md
      review.md
      report-{type}.md
  Clients/                        # CRM data
    Companies/{company-name}.md
    Contacts/{first-last}.md
    Deals/{deal-name}.md
    Communications/{YYYY-MM-DD}-{type}-{company}.md
  Projects/                       # Tasks, meetings, goals
    Tasks/{task-title}.md
    Meetings/{YYYY-MM-DD}-{meeting-title}.md
    Goals/{goal-title}.md
    Milestones/{milestone-title}.md
  Finance/                        # Invoices, expenses, savings
    Invoices/{YYYY-MM-DD}-{client}-{number}.md
    Expenses/{YYYY-MM-DD}-{description}.md
    Savings/{YYYY-MM-DD}-analysis.md
  Knowledge/                      # Learnings, KB, memory, prompts
    Articles/{title}.md
    Learnings/{YYYY-Www}-{title}.md
    Memory/{namespace}-{key}.md
    Prompts/{title}.md
    Workflows/{title}.md
    Workflows/{title}-sop.md
    Drive-Imports/{filename}.md
    Intel/{YYYY-MM-DD}-{topic}.md
    Research/{YYYY-MM-DD}-{topic}.md
  Content/                        # Drafts, proposals, contracts
    Drafts/{title}.md
    Newsletters/{YYYY-MM-DD}-{title}.md
    Proposals/{client}-{title}.md
    Contracts/{client}-{title}.md
    Social/{YYYY-MM-DD}-linkedin.md
```

### Vault-to-Database Mapping

| Vault Folder | SQLite Table | Namespaces |
|-------------|-------------|------------|
| `Clients/Companies/` | companies | client, crm, health |
| `Clients/Contacts/` | contacts | crm |
| `Clients/Deals/` | deals | crm |
| `Clients/Communications/` | communications | crm |
| `Projects/Tasks/` | tasks | inbox, actions, followup |
| `Projects/Meetings/` | meetings | meeting, prep |
| `Projects/Goals/` | goals | goal |
| `Projects/Milestones/` | milestones | goal |
| `Finance/Invoices/` | finance (type=invoice) | invoice |
| `Finance/Expenses/` | finance (type=expense) | expense |
| `Finance/Savings/` | reports (type=savings) | savings |
| `Daily/{date}/` | briefings | briefing, morning, report, review, slack |
| `Content/Drafts/` | content | inbox, newsletter |
| `Content/Newsletters/` | content (type=newsletter) | newsletter |
| `Content/Proposals/` | deliverables (type=proposal) | proposal |
| `Content/Contracts/` | deliverables (type=contract/sow) | contract, sow |
| `Content/Social/` | content (type=social) | linkedin |
| `Knowledge/Articles/` | knowledge_base | kb |
| `Knowledge/Learnings/` | learnings | learn |
| `Knowledge/Memory/` | memory | memory |
| `Knowledge/Prompts/` | prompts | prompt |
| `Knowledge/Workflows/` | workflows | workflow, workflow-doc |
| `Knowledge/Drive-Imports/` | research (type=drive-import) | drive |
| `Knowledge/Intel/` | research (type=intel) | intel |
| `Knowledge/Research/` | research (type=scout) | scout, compete |

All namespaces write to both SQLite and markdown. The `research` and `reports` tables provide query support for namespaces that were previously non-Notion, enabling historical lookups (e.g., savings ROI trends, intel pattern detection).

### File Naming Rules

- Slugified: lowercase, hyphens for spaces, no special characters
- Date-prefixed (`YYYY-MM-DD`) where temporal ordering matters
- Company/client name included where relational context helps browsing
- `fos_id` in YAML frontmatter is the canonical identifier (not the filename)

### Markdown File Format

Every file follows a consistent structure:

```markdown
---
fos_id: "comp_a1b2c3"
fos_type: company
name: "Acme Corp"
industry: "SaaS"
status: "active"
website: "https://acme.com"
health_score: 85
created: 2026-03-19
modified: 2026-03-19
---

# Acme Corp

## Key Contacts
- [[Jane Smith]] — CEO, Decision Maker
- [[Bob Chen]] — CTO, Champion

## Open Deals
- [[Acme Platform Migration]] — $45,000 — Proposal Sent

## Recent Activity
- 2026-03-18: Email — Follow-up on proposal, Positive sentiment
```

- YAML frontmatter mirrors SQLite columns for the record
- Wiki-links (`[[Name]]`) create Obsidian graph connections automatically
- Body sections are human-readable summaries with cross-references
- Files are output-only — external edits to markdown are not synced back to SQLite

## Onboarding Flow

### Backend Selection (`/founder-os:setup:backend`)

New first step in the setup wizard:

```
Welcome to Founder OS Setup!

Where would you like to store your data?

  A) Notion  — Cloud-hosted databases with rich UI
     Requires: Notion account + API key

  B) Obsidian — Local vault with markdown files + SQLite
     Requires: Obsidian installed (v1.12+ for CLI support)
```

### Notion Path (unchanged)

Runs existing `/founder-os:setup:notion-cli` and `/founder-os:setup:notion-hq`. No changes.

### Obsidian Path (`/founder-os:setup:obsidian-vault`)

1. Detect existing Obsidian vaults (search common locations)
2. User picks existing vault or creates new one
3. Validate Obsidian CLI is available (`obsidian --version`)
4. Create `.fos/` hidden folder inside vault
5. Initialize SQLite database with full schema (21 tables + meta)
6. Scaffold vault folder structure (Daily, Clients, Projects, Finance, Knowledge, Content)
7. Write `.founderOS/config.json` with `"backend": "obsidian"`
8. Run preflight validation — test write/read cycle through `storage-tool.mjs`

### install.sh Changes

- Phase 5 becomes: "Configure data backend" (was: "Set up Notion HQ")
- `--skip-notion` flag renamed to `--skip-backend`
- New `--backend=obsidian|notion` flag for non-interactive installs

### Preflight Registry Changes

Current: all commands check `NOTION_API_KEY`.
New: commands check `backend` config, then validate the appropriate dependency:
- Notion: `NOTION_API_KEY` set + API connectivity test
- Obsidian: vault path exists + SQLite readable + CLI available (warn if not, degrade to file I/O)

## Backend Migration

`/founder-os:setup:migrate-backend` handles switching between Notion and Obsidian:

1. **Dry-run mode** (default): reads all records from source, reports what would be migrated
2. **Execute mode** (`--execute`): performs the actual migration
3. **Order**: respects foreign keys — companies first, then contacts/deals that reference them, then tasks/meetings, etc.
4. **Report**: records migrated, skipped (duplicates), failed (with error details)
5. **Safety**: source data is never deleted — user cleans up manually after verifying
6. **Config update**: writes new backend choice to `.founderOS/config.json`

## Command Migration Strategy

### Scope Per Command

1. Replace `notion-tool.mjs` → `storage-tool.mjs` in bash calls
2. Replace Notion-specific database names (`[FOS] Tasks`) with abstract table names (`tasks`)
3. Update preflight checks to use backend-aware validation
4. No logic changes — command workflow stays identical

### Migration Waves

| Wave | Namespaces | Count | Rationale |
|------|-----------|-------|-----------|
| **1: Foundation** | `setup`, `notion`, `memory` | 3 | Setup creates the backend; notion becomes storage-admin; memory used by all commands |
| **2: CRM Core** | `client`, `crm`, `health` | 3 | Companies/Contacts/Deals are FK targets |
| **3: Operations** | `inbox`, `actions`, `followup`, `meeting`, `prep` | 5 | Task/meeting workflows referencing CRM |
| **4: Financial** | `invoice`, `expense`, `savings` | 3 | Finance tables, reference companies |
| **5: Knowledge** | `kb`, `learn`, `prompt`, `workflow`, `workflow-doc`, `scout` | 6 | Knowledge layer + research discovery |
| **6: Content** | `briefing`, `morning`, `proposal`, `contract`, `sow`, `goal`, `compete` | 7 | Content generation, briefings, competitive intel |
| **7: Non-Notion** | `newsletter`, `report`, `review`, `drive`, `slack`, `linkedin`, `intel`, `ideate`, `social` | 9 | Optional vault output — additive, no migration |
| | | **36** | *All namespaces covered* |

Note: some namespaces (e.g., `social`, `ideate`) are aliases or sub-namespaces. The total covers every command entry point.

### Skill Updates

- `skills/notion/notion-operations/SKILL.md` → `skills/storage/storage-operations/SKILL.md`
- New skill documents the unified interface with backend-specific notes
- Old Notion skills kept as aliases redirecting to storage skills (backwards compat)

### Testing Strategy

- Each wave gets integration tests: write through storage-tool, read back, verify SQLite and markdown
- Notion regression suite: run all commands with `"backend": "notion"` to confirm no breakage
- Obsidian-specific tests: verify vault structure, frontmatter format, wikilink generation, CLI interaction

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Obsidian CLI requires app running | Medium | Fallback to direct file I/O with warning; document requirement in setup |
| SQLite + markdown drift (files edited outside FOS) | Medium | On read, use SQLite only; markdown is output-only; warn if file modified externally |
| Wikilink breakage on record rename | Low | Obsidian CLI handles link rewrites; direct-file fallback skips renames |
| Large vaults slow down (10K+ files) | Low | SQLite handles queries regardless of file count; vault is browse-only |
| Notion API changes break adapter | Low | Existing risk — adapter wraps current notion-tool.mjs, no new exposure |
| Migration data loss | High | Dry-run mode default; migration report with diffs; source data never deleted |
| Partial migration state (data split across backends) | Medium | Migration command is atomic per table — all-or-nothing per wave; preflight warns if migration is incomplete; commands refuse to run against partially-migrated state |

## Dependencies

| Dependency | Required | Version |
|------------|----------|---------|
| Obsidian app | Yes (for CLI) | v1.12+ |
| Node.js | Yes (storage-tool) | 18+ (existing requirement) |
| better-sqlite3 (npm) | Yes | Latest |
| Obsidian CLI | Yes (primary) / Optional (fallback to file I/O) | Ships with Obsidian 1.12+ |

## Success Criteria

1. A user completes `install.sh`, picks Obsidian, and runs any of the 33 commands without errors
2. All 22 Notion-dependent commands produce identical logical output through both backends
3. Existing Notion users experience zero regressions
4. `migrate-backend` transfers a vault with 500+ records between backends successfully
5. Vault is navigable in Obsidian without FOS-specific plugins (pure markdown + frontmatter)
6. SQLite queries return results in <100ms for vaults up to 10K records
7. Wiki-links create meaningful graph connections visible in Obsidian's graph view

## Out of Scope

- Real-time sync between Notion and Obsidian (dual-backend mode)
- Obsidian plugin development (we use CLI + files, not the plugin API)
- Mobile Obsidian support (CLI is desktop-only)
- Conflict resolution for concurrent edits (single-user assumption)
- Parsing markdown edits back into SQLite (markdown is output-only)
