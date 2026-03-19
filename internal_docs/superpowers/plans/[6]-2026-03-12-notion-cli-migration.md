# [6] Notion CLI Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Notion MCP server with a lightweight Node.js CLI wrapper (`notion-tool.mjs`) to eliminate ~110,000 wasted tokens per session (97% reduction).

**Architecture:** A ~200-line CLI entry point wraps `@notionhq/client` SDK, exposing 10 subcommands invoked via Bash. Two skill files are rewritten as CLI references. 12 command files with direct MCP tool calls are updated, 7 agent configs switch from `"notion"` to `"Bash"`, and ~54 command files get mechanical degradation-text updates.

**Tech Stack:** Node.js, `@notionhq/client` v5.9.0+, ES modules (.mjs)

**Spec:** `docs/superpowers/specs/[6]-2026-03-12-notion-cli-migration-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `scripts/notion-tool.mjs` | CLI entry point — 10 subcommands wrapping `@notionhq/client` |
| `scripts/package.json` | Dependency manifest for `@notionhq/client` |
| `commands/setup/notion-cli.md` | Guided setup wizard for Notion API token + verification |

### Modified Files — Core
| File | Change |
|------|--------|
| `skills/notion/notion-operations/SKILL.md` | Full rewrite: MCP tool table → CLI command table |
| `skills/notion/notion-database-design/SKILL.md` | Update `notion-create-database` references → CLI |
| `commands/notion/create.md` | Replace 3 MCP tool calls with CLI equivalents |
| `commands/notion/query.md` | Replace 2 MCP tool calls with CLI equivalents |
| `commands/notion/update.md` | Replace 3 MCP tool calls with CLI equivalents |
| `commands/notion/template.md` | Replace 2 MCP tool calls with CLI equivalents |
| `commands/setup/notion-hq.md` | Replace 4 MCP tool calls with CLI equivalents |
| `commands/setup/verify.md` | Replace MCP search with CLI diagnostic |

### Modified Files — 8 Other Direct MCP Callers
| File | MCP Tools Used |
|------|---------------|
| `commands/memory/teach.md` | notion-search, notion-fetch, notion-create-pages, notion-update-page |
| `commands/kb/ask.md` | notion-search, notion-fetch |
| `commands/kb/index.md` | notion-create-database, notion-update-page |
| `commands/proposal/from-brief.md` | notion-search, notion-fetch |
| `commands/proposal/create.md` | notion-search, notion-create-pages |
| `commands/report/generate.md` | notion-search, notion-fetch |
| `commands/sow/from-brief.md` | notion-search, notion-fetch |
| `commands/sow/generate.md` | notion-search, notion-fetch, notion-create-pages, notion-update-page |

### Modified Files — 7 Agent Configs
| File | Change |
|------|--------|
| `agents/briefing/config.json` | `"tools": ["notion"]` → `"tools": ["Bash"]` |
| `agents/client/config.json` | `"tools": ["notion"]` → `"tools": ["Bash"]` |
| `agents/inbox/config.json` | `"tools": ["notion"]` → `"tools": ["Bash"]` |
| `agents/invoice/config.json` | `"tools": ["notion"]` → `"tools": ["Bash"]` |
| `agents/prep/config.json` | `"tools": ["notion"]` → `"tools": ["Bash"]` |
| `agents/report/config.json` | `"notion"` → `"Bash"` in tools arrays |
| `agents/sow/config.json` | `"notion"` → `"Bash"` in tools arrays |

### Modified Files — ~54 Indirect Notion References (Mechanical)
All command files in `commands/` that reference "Notion MCP" in their graceful degradation sections. The change is a string replacement: references to "Notion MCP server" become references to the notion-tool CLI, and degradation hints point to `/founder-os:setup:notion-cli`.

### Modified Files — Infrastructure
| File | Change |
|------|--------|
| `.mcp.json` | Remove `notion` server entry |
| `scripts/release.sh` | Remove notion from generated `.mcp.json` |
| `scripts/generate-user-claude-md.sh` | Update Notion references from MCP to CLI |
| `CLAUDE.md` | Update Notion tool reference from MCP to CLI |

---

## Chunk 1: Build the CLI Tool

### Task 1: Create `scripts/package.json`

**Files:**
- Create: `scripts/package.json`

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "founder-os-scripts",
  "private": true,
  "type": "module",
  "dependencies": {
    "@notionhq/client": "^5.9.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd scripts && npm install`
Expected: `node_modules/` created with `@notionhq/client` and its 2 transitive deps (~890KB)

- [ ] **Step 3: Verify `.gitignore` covers `node_modules`**

Check that `scripts/node_modules/` is gitignored. If not, add `scripts/node_modules/` to the root `.gitignore`.

- [ ] **Step 4: Commit**

```bash
git add scripts/package.json scripts/package-lock.json .gitignore
git commit -m "feat(notion-cli): add package.json with @notionhq/client dependency"
```

---

### Task 2: Build `scripts/notion-tool.mjs` — Auth & Core Structure

**Files:**
- Create: `scripts/notion-tool.mjs`

**Reference:** Spec Section "CLI Interface" for the 10 subcommands, auth resolution, error handling, and pagination.

- [ ] **Step 1: Create the CLI entry point with auth resolution and argument parsing**

The file must:
1. Import `Client` from `@notionhq/client`
2. Resolve auth token from: `$NOTION_API_KEY` env var → `.env` file in plugin root → structured error
3. Parse `process.argv` to extract subcommand and arguments (no external arg parser needed — keep deps minimal)
4. Route to the correct handler function based on subcommand name
5. Output JSON to stdout on success, structured error JSON to stderr on failure (exit code 1)
6. Handle `--diagnostic` flag for health checks

Auth resolution order (spec §Architecture > Auth Resolution Order):
```javascript
// 1. Environment variable
let token = process.env.NOTION_API_KEY;
// 2. .env file in plugin root (walk up from script dir to find .env)
if (!token) { /* read .env, parse NOTION_API_KEY= line */ }
// 3. Error with setup hint
if (!token) { /* stderr JSON with code NOTION_AUTH_MISSING, hint to run setup wizard */ }
```

Error output format:
```json
{"error": "description", "code": "ERROR_CODE", "hint": "actionable hint"}
```

The subcommand routing skeleton should list all 10 commands with stub handlers that will be implemented in the next tasks. Each stub should output `{"error": "not implemented"}` for now.

- [ ] **Step 2: Verify the script runs and shows usage**

Run: `node scripts/notion-tool.mjs`
Expected: Usage text listing all 10 subcommands (or error about missing subcommand)

Run: `node scripts/notion-tool.mjs --help`
Expected: Usage text with all subcommands listed

- [ ] **Step 3: Commit**

```bash
git add scripts/notion-tool.mjs
git commit -m "feat(notion-cli): scaffold CLI entry point with auth resolution and subcommand routing"
```

---

### Task 3: Implement `search` and `query` Subcommands

**Files:**
- Modify: `scripts/notion-tool.mjs`

These are the two most-used read operations across all 22 namespaces.

- [ ] **Step 1: Implement `search <query>` subcommand**

Behavior (spec §CLI Interface):
- Call `notion.search({ query, filter: { property: 'object', value: filterValue } })` where `filterValue` comes from `--filter` flag (either `page` or `database`)
- If no `--filter`, search all object types
- Auto-paginate using cursor (Notion returns max 100 per request)
- Output combined results array as JSON to stdout

Parse flags:
- `--filter page` or `--filter database` → filter by object type
- Remaining positional args joined as query string

- [ ] **Step 2: Implement `query <database-id>` subcommand**

Behavior (spec §CLI Interface):
- Call `notion.databases.query({ database_id, filter, sorts, page_size })`
- `--filter` accepts JSON string for Notion filter object
- `--sorts` accepts JSON string for Notion sorts array
- `--page-size N` controls per-request batch size (default 100)
- Auto-paginate using `start_cursor` / `has_more`
- Output combined results array as JSON to stdout

- [ ] **Step 3: Test both commands manually against a real Notion workspace**

Run: `NOTION_API_KEY=<token> node scripts/notion-tool.mjs search "Founder OS"`
Expected: JSON array of matching pages/databases

Run: `NOTION_API_KEY=<token> node scripts/notion-tool.mjs query <known-db-id> --page-size 5`
Expected: JSON array of database rows

- [ ] **Step 4: Commit**

```bash
git add scripts/notion-tool.mjs
git commit -m "feat(notion-cli): implement search and query subcommands with pagination"
```

---

### Task 4: Implement Page CRUD Subcommands

**Files:**
- Modify: `scripts/notion-tool.mjs`

- [ ] **Step 1: Implement `create-page <parent-id>` subcommand**

Behavior:
- `--properties` accepts JSON string of Notion property values
- `--content` accepts JSON string of Notion block children (optional)
- Call `notion.pages.create({ parent: { database_id: parentId }, properties, children })`
- If parent is a page (not database), use `{ page_id: parentId }` instead
- Detect parent type: if parentId looks like a database ID from prior search, use `database_id`; otherwise try `page_id`
- Output created page object as JSON

- [ ] **Step 2: Implement `update-page <page-id>` subcommand**

Behavior:
- `--properties` accepts JSON string of property updates
- Call `notion.pages.update({ page_id: pageId, properties })`
- Output updated page object as JSON

- [ ] **Step 3: Implement `get-page <page-id-or-url>` subcommand**

Behavior:
- Accept either a raw page ID or a full Notion URL
- If URL provided, extract the page ID (last 32 hex chars after removing hyphens)
- Call `notion.pages.retrieve({ page_id })`
- Output page object as JSON

- [ ] **Step 4: Test page CRUD operations**

Run: `NOTION_API_KEY=<token> node scripts/notion-tool.mjs get-page <known-page-id>`
Expected: JSON page object with properties

- [ ] **Step 5: Commit**

```bash
git add scripts/notion-tool.mjs
git commit -m "feat(notion-cli): implement create-page, update-page, and get-page subcommands"
```

---

### Task 5: Implement Remaining Subcommands

**Files:**
- Modify: `scripts/notion-tool.mjs`

- [ ] **Step 1: Implement `get-blocks <page-id>`**

Behavior:
- Call `notion.blocks.children.list({ block_id: pageId })`
- If `--recursive` flag, recursively fetch children of each block that `has_children`
- Auto-paginate
- Output blocks array as JSON

- [ ] **Step 2: Implement `get-comments <page-id>`**

Behavior:
- Call `notion.comments.list({ block_id: pageId })`
- Auto-paginate
- Output comments array as JSON

- [ ] **Step 3: Implement `create-comment <page-id>`**

Behavior:
- `--body` accepts the comment text
- Call `notion.comments.create({ parent: { page_id: pageId }, rich_text: [{ text: { content: body } }] })`
- Output created comment as JSON

- [ ] **Step 4: Implement `create-database <parent-id>`**

Behavior:
- `--title` accepts the database title string
- `--properties` accepts JSON string of Notion property definitions
- Call `notion.databases.create({ parent: { page_id: parentId }, title: [{ text: { content: title } }], properties })`
- Output created database object as JSON

- [ ] **Step 5: Implement `update-database <database-id>`**

Behavior:
- `--properties` accepts JSON string of property definition updates (e.g., adding relation properties)
- Call `notion.databases.update({ database_id: databaseId, properties })`
- Output updated database object as JSON
- This is needed specifically for `commands/setup/notion-hq.md` which uses `notion-update-data-source` to wire relation properties between databases after initial creation (relations can't be fully specified at `create-database` time when the related database doesn't yet exist)

**Note:** This is the 11th subcommand, added to cover `notion-update-data-source` MCP tool usage. The spec lists 10 subcommands — this addition should be noted when updating the spec.

- [ ] **Step 6: Implement `fetch <notion-url>`**

Behavior:
- Accept any Notion URL
- Extract the ID from the URL
- Auto-detect whether it's a page, database, or block by trying in order:
  1. `notion.pages.retrieve()` — if succeeds and `object === 'page'`, return page
  2. `notion.databases.retrieve()` — if succeeds and `object === 'database'`, return database
  3. `notion.blocks.retrieve()` — if succeeds, return block
- Output the resolved object as JSON

- [ ] **Step 7: Implement `--diagnostic` flag**

Behavior (spec §Diagnostics):
- Validate auth token by calling `notion.users.me()`
- List accessible databases via `notion.search({ filter: { property: 'object', value: 'database' } })`
- Test read/write cycle: create a temp page, read it back, delete it (archive)
- Report latency per operation
- Output structured diagnostic report as JSON

- [ ] **Step 8: Implement error handling wrapper**

Wrap all subcommand handlers in a try/catch that maps Notion API errors to structured error JSON:
- 401 → `{ error: "...", code: "NOTION_AUTH_FAILED", hint: "Run /founder-os:setup:notion-cli" }`
- 429 → exponential backoff with 3 retries (delays: 1s, 2s, 4s), then error if still failing
- 404 → `{ error: "...", code: "NOTION_NOT_FOUND", hint: "Check sharing permissions" }`
- Validation errors → `{ error: "...", code: "NOTION_VALIDATION", hint: "..." }` identifying the failing property
- Network timeout (10s) → `{ status: "unavailable" }`

- [ ] **Step 9: Test the remaining subcommands**

Run: `NOTION_API_KEY=<token> node scripts/notion-tool.mjs --diagnostic`
Expected: JSON report with auth status, database list, read/write test results, latencies

- [ ] **Step 10: Commit**

```bash
git add scripts/notion-tool.mjs
git commit -m "feat(notion-cli): implement all 11 subcommands, diagnostics, and error handling"
```

---

## Chunk 2: Skill Files & Setup Wizard

### Task 6: Rewrite `notion-operations` Skill for CLI

**Files:**
- Modify: `skills/notion/notion-operations/SKILL.md`

**Key change:** Replace all MCP tool references with CLI command references. The skill structure (workspace discovery, page operations, database operations, search strategies, content block formatting, graceful degradation) stays the same — only the tool invocation syntax changes.

- [ ] **Step 1: Read the current skill file fully**

Read: `skills/notion/notion-operations/SKILL.md` — read the entire file before making any edits. Do not skip this step.

- [ ] **Step 2: Rewrite the skill file**

Changes to make:

1. **Frontmatter description:** Change "MCP tool usage" → "CLI tool usage"
2. **Title intro paragraph:** "Interact with Notion workspaces through `notion-tool.mjs`" (not "Notion MCP server")
3. **Tool reference table (lines 17-26):** Replace the entire MCP tools table with the CLI commands table:

| Command | Purpose | Key Args |
|---------|---------|----------|
| `search <query>` | Find pages and databases by title | `--filter page\|database` |
| `query <database-id>` | Query database with filters/sorts | `--filter json`, `--sorts json`, `--page-size N` |
| `create-page <parent-id>` | Create page/row in database | `--properties json`, `--content json` |
| `update-page <page-id>` | Update page properties | `--properties json` |
| `get-page <page-id-or-url>` | Read page properties | — |
| `get-blocks <page-id>` | Read page content/body | `--recursive` |
| `get-comments <page-id>` | Read discussion threads | — |
| `create-comment <page-id>` | Add comment to page | `--body text` |
| `create-database <parent-id>` | Create a new database | `--title text`, `--properties json` |
| `update-database <database-id>` | Update database properties/schema | `--properties json` |
| `fetch <notion-url>` | Resolve any Notion URL | — |

4. **Invocation pattern note:** Add after the table:
```
All commands are invoked via Bash:
node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs <command> [args]

All output is JSON to stdout. Errors are structured JSON to stderr with exit code 1.
```

5. **Discovery pipeline (lines 31-35):** Replace `notion-search` → `search`, `notion-fetch` → `get-page` / `fetch`
6. **Page operations — Creating (lines 60):** Replace `notion-create-pages` → `create-page`
7. **Page operations — Reading (lines 67):** Replace `notion-fetch` → `get-page` / `get-blocks`
8. **Page operations — Updating (lines 84):** Replace `notion-update-page` → `update-page`
9. **Database operations — Creating (lines 105):** Replace `notion-create-database` → `create-database`
10. **Database operations — Querying (lines 114-126):** Replace `notion-search` → `search` and `notion-fetch` (when used to query a database with filters/sorts) → `query <database-id> --filter ... --sorts ...`. Note: in this context `notion-fetch` maps to the `query` subcommand, NOT `get-page` or `fetch` — because it's executing a filtered database query, not reading a single page.
11. **Graceful degradation (lines 183-188):** Replace "Notion MCP unavailable" with "Notion CLI unavailable". Update hint to: "Check that `$NOTION_API_KEY` is set. Run `/founder-os:setup:notion-cli` for setup."
12. **Remove** `notion-move-pages` and `notion-duplicate-page` from the tool reference (out of scope per spec)

- [ ] **Step 3: Verify the skill file reads cleanly**

Read the modified file to verify consistency — no leftover "MCP" references except in the description of what was replaced.

- [ ] **Step 4: Commit**

```bash
git add skills/notion/notion-operations/SKILL.md
git commit -m "feat(notion-cli): rewrite notion-operations skill for CLI tool reference"
```

---

### Task 7: Update `notion-database-design` Skill

**Files:**
- Modify: `skills/notion/notion-database-design/SKILL.md`

This skill is mostly about schema design knowledge (property types, naming conventions, templates) — only the downstream operation references need updating.

- [ ] **Step 1: Read the current skill file**

Read: `skills/notion/notion-database-design/SKILL.md` — read the entire file before making any edits. Do not skip this step. Identify all MCP references by searching for "notion-create-database", "notion-", and "MCP".

- [ ] **Step 2: Update references**

Changes:
1. If the file references "MCP" or specific MCP tool names, update them to CLI equivalents
2. The file defers database creation to the `notion-operations` skill, so it may have zero direct MCP tool references in its body — verify by reading first
3. Any mentions of `notion-create-database` → `create-database` CLI subcommand reference

This is likely a very small change — most of the file is schema design knowledge that doesn't reference tools directly.

- [ ] **Step 3: Commit**

```bash
git add skills/notion/notion-database-design/SKILL.md
git commit -m "feat(notion-cli): update database-design skill references to CLI"
```

---

### Task 8: Create Setup Wizard Command

**Files:**
- Create: `commands/setup/notion-cli.md`

**Reference:** Spec §Setup Wizard for the 10-step flow.

- [ ] **Step 1: Write the setup wizard command**

The command should follow the same markdown structure as other setup commands (see `commands/setup/notion-hq.md` and `commands/setup/verify.md` for pattern).

Frontmatter:
```yaml
---
description: Set up Notion CLI integration — install dependencies, configure API token, and verify access
argument-hint: ""
allowed-tools: ["Bash", "Read"]
---
```

The wizard steps (from spec):
1. Check `${CLAUDE_PLUGIN_ROOT}/scripts/node_modules/` exists → run `npm install --prefix ${CLAUDE_PLUGIN_ROOT}/scripts` if missing
2. Check `$NOTION_API_KEY` env var → skip to step 8 if present
3. Check `.env` file in `${CLAUDE_PLUGIN_ROOT}` → skip to step 8 if `.env` has `NOTION_API_KEY`
4. Guide user to `notion.so/profile/integrations`
5. Create integration named "Founder OS", select workspace
6. Copy the Internal Integration Secret
7. Prompt user to paste token → write `NOTION_API_KEY=<token>` to `${CLAUDE_PLUGIN_ROOT}/.env`
8. Instruct user to share root "Founder OS" page (or "Founder OS HQ") with the integration — explain that sharing a parent grants access to all child databases
9. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "Founder OS"` to verify access
10. List discovered databases → confirm success or troubleshoot

Include graceful degradation: if Node.js is not available, explain the requirement. If npm install fails, show manual steps.

- [ ] **Step 2: Commit**

```bash
git add commands/setup/notion-cli.md
git commit -m "feat(notion-cli): add setup wizard command for Notion CLI configuration"
```

---

## Chunk 3: Update Commands with Direct MCP Calls

### Task 9: Update 4 Core `commands/notion/` Files

**Files:**
- Modify: `commands/notion/create.md`
- Modify: `commands/notion/query.md`
- Modify: `commands/notion/update.md`
- Modify: `commands/notion/template.md`

These files directly name MCP tools (`notion-search`, `notion-create-pages`, etc.) in their step instructions.

**CRITICAL — `allowed-tools` frontmatter update:** All 4 files currently have `allowed-tools: ["Read"]`. After migration, they invoke the CLI via Bash. You MUST update each file's frontmatter to `allowed-tools: ["Read", "Bash"]`. Without this, Claude Code will refuse to execute CLI commands at runtime. This applies to every command file modified in Tasks 9, 10, and 11.

- [ ] **Step 1: Read all 4 files**

Read each file to identify every MCP tool reference.

- [ ] **Step 2: Update `commands/notion/create.md`**

Replacements:
- **Frontmatter:** `allowed-tools: ["Read"]` → `allowed-tools: ["Read", "Bash"]`
- "Notion MCP server" → "Notion CLI tool" (throughout)
- "notion-search" → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search`
- "notion-create-pages" → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs create-page`
- "notion-create-database" → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs create-database`
- Graceful degradation: update hint from MCP setup to `/founder-os:setup:notion-cli`
- Skill load reference: update description text from "Notion MCP tool usage" → "Notion CLI tool usage" (the skill path stays the same)

- [ ] **Step 3: Update `commands/notion/query.md`**

Replacements:
- **Frontmatter:** `allowed-tools: ["Read"]` → `allowed-tools: ["Read", "Bash"]`
- Skill load description: "Notion MCP tool usage" → "Notion CLI tool usage"
- "notion-search" → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search`
- "notion-fetch" → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs get-page` or `fetch` depending on context (for database queries, use `query` — see Task 6 mapping notes)
- Graceful degradation update

- [ ] **Step 4: Update `commands/notion/update.md`**

Replacements:
- **Frontmatter:** `allowed-tools: ["Read"]` → `allowed-tools: ["Read", "Bash"]`
- Skill load description: "Notion MCP tool usage" → "Notion CLI tool usage"
- "notion-search" → CLI search
- "notion-fetch" → CLI get-page
- "notion-update-page" → CLI update-page
- Graceful degradation update

- [ ] **Step 5: Update `commands/notion/template.md`**

Replacements:
- **Frontmatter:** `allowed-tools: ["Read"]` → `allowed-tools: ["Read", "Bash"]`
- Skill load description: "Notion MCP tool usage" → "Notion CLI tool usage"
- "notion-search" → CLI search
- "notion-create-database" → CLI create-database
- Graceful degradation update

- [ ] **Step 6: Verify no MCP tool names remain in `commands/notion/`**

Run: `grep -r 'notion-search\|notion-fetch\|notion-create-pages\|notion-update-page\|notion-create-database\|notion-create-comment\|notion-get-comments\|notion-update-data-source\|notion-move-pages\|notion-duplicate-page' commands/notion/`
Expected: No matches

- [ ] **Step 7: Commit**

```bash
git add commands/notion/
git commit -m "feat(notion-cli): migrate 4 core Notion commands from MCP to CLI"
```

---

### Task 10: Update `commands/setup/notion-hq.md`

**Files:**
- Modify: `commands/setup/notion-hq.md`

This file has the densest MCP usage — it calls `notion-search`, `notion-create-database`, `notion-update-data-source`, and `notion-create-pages` to set up the entire HQ workspace.

- [ ] **Step 1: Read the full file**

Read: `commands/setup/notion-hq.md`

- [ ] **Step 2: Replace all MCP tool references**

Replacements:
- **Frontmatter:** Ensure `allowed-tools` includes `"Bash"` (add if missing)
- `notion-search` → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search`
- `notion-create-database` → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs create-database`
- `notion-create-pages` → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs create-page`
- `notion-update-page` → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs update-page`
- `notion-update-data-source` → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs update-database` (added as 11th subcommand in Task 5 Step 5 specifically for this use case — wiring relation properties between databases after both exist)
- Graceful degradation: update to CLI reference

- [ ] **Step 3: Verify no MCP references remain**

Run: `grep -r 'notion-search\|notion-fetch\|notion-create\|notion-update\|Notion MCP' commands/setup/notion-hq.md`
Expected: No matches (except possibly historical comments)

- [ ] **Step 4: Commit**

```bash
git add commands/setup/notion-hq.md
git commit -m "feat(notion-cli): migrate HQ setup command from MCP to CLI"
```

---

### Task 11: Update 7 Other Direct MCP Caller Commands

**Files:**
- Modify: `commands/memory/teach.md`
- Modify: `commands/kb/ask.md`
- Modify: `commands/kb/index.md`
- Modify: `commands/proposal/from-brief.md`
- Modify: `commands/proposal/create.md`
- Modify: `commands/report/generate.md`
- Modify: `commands/sow/from-brief.md`
- Modify: `commands/sow/generate.md`

These 8 files directly name MCP tools in their step instructions (not just in the skill load or degradation section).

- [ ] **Step 1: Read all 8 files and identify MCP tool references**

For each file, find lines with: `notion-search`, `notion-fetch`, `notion-create-pages`, `notion-update-page`, `notion-create-database`

- [ ] **Step 2: Apply mechanical replacements in each file**

For all 8 files, apply these replacements:
- **Frontmatter:** Ensure `allowed-tools` includes `"Bash"` (add if missing — required for CLI invocation)
- `notion-search` → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search`
- `notion-fetch` → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs get-page` (for page reads) or `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs fetch` (for URL resolution)
- `notion-create-pages` → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs create-page`
- `notion-update-page` → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs update-page`
- `notion-create-database` → `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs create-database`

Context matters for `notion-fetch`: if the command is fetching a page by URL, use `fetch`. If reading a known page by ID, use `get-page`.

- [ ] **Step 3: Verify no direct MCP tool names remain in these files**

Run: `grep -l 'notion-search\|notion-fetch\|notion-create-pages\|notion-update-page\|notion-create-database' commands/memory/teach.md commands/kb/ask.md commands/kb/index.md commands/proposal/from-brief.md commands/proposal/create.md commands/report/generate.md commands/sow/from-brief.md commands/sow/generate.md`
Expected: No matches

- [ ] **Step 4: Commit**

```bash
git add commands/memory/teach.md commands/kb/ask.md commands/kb/index.md commands/proposal/from-brief.md commands/proposal/create.md commands/report/generate.md commands/sow/from-brief.md commands/sow/generate.md
git commit -m "feat(notion-cli): migrate 8 direct MCP caller commands to CLI"
```

---

### Task 12: Update `commands/setup/verify.md`

**Files:**
- Modify: `commands/setup/verify.md`

- [ ] **Step 1: Read the full file**

- [ ] **Step 2: Update Notion connectivity check**

Replace:
```
Search Notion for databases with `[FOS]` prefix using the Notion MCP search tool.
```
With:
```
Run the Notion CLI diagnostic to verify connectivity:
node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs --diagnostic

Then search for HQ databases:
node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "[FOS]" --filter database
```

Count matches against the 22 expected databases. List any missing.

- [ ] **Step 3: Commit**

```bash
git add commands/setup/verify.md
git commit -m "feat(notion-cli): update verify command to use CLI diagnostic"
```

---

## Chunk 4: Agents, Config & Mechanical Updates

### Task 13: Update 7 Agent Config Files

**Files:**
- Modify: `agents/briefing/config.json`
- Modify: `agents/client/config.json`
- Modify: `agents/inbox/config.json`
- Modify: `agents/invoice/config.json`
- Modify: `agents/prep/config.json`
- Modify: `agents/report/config.json`
- Modify: `agents/sow/config.json`

The change is mechanical: replace `"notion"` with `"Bash"` in all `"tools"` arrays. This matches the pattern used by the gws migration where Google MCP tools were replaced with Bash (to invoke the gws CLI).

- [ ] **Step 1: Read all 7 config files**

- [ ] **Step 2: Replace `"notion"` → `"Bash"` in tools arrays**

For each file:
- Find all `"tools": [...]` arrays containing `"notion"`
- Replace `"notion"` with `"Bash"`
- If `"Bash"` is already in the array, just remove `"notion"` (don't duplicate)
- Example: `"tools": ["notion"]` → `"tools": ["Bash"]`
- Example: `"tools": ["filesystem", "notion"]` → `"tools": ["filesystem", "Bash"]`

- [ ] **Step 3: Verify no "notion" tool references remain in agent configs**

Run: `grep -r '"notion"' agents/*/config.json`
Expected: No matches

- [ ] **Step 4: Commit**

```bash
git add agents/*/config.json
git commit -m "feat(notion-cli): update agent configs from notion tool to Bash"
```

---

### Task 14: Update 8 Agent Markdown Files

**Files:**
- Modify: `agents/briefing/briefing-lead.md`
- Modify: `agents/briefing/notion-agent.md`
- Modify: `agents/briefing/calendar-agent.md`
- Modify: `agents/prep/notion-agent.md`
- Modify: `agents/prep/prep-lead.md`
- Modify: `agents/report/research-agent.md`
- Modify: `agents/report/qa-agent.md`
- Modify: `agents/sow/sow-lead.md`

These 8 agent markdown files contain "Notion MCP" references in their instructions and degradation logic.

- [ ] **Step 1: Read all 8 agent markdown files**

Read each file to identify MCP tool references and availability detection logic.

- [ ] **Step 2: Apply mechanical text replacements**

For all 8 files:
- Replace MCP tool names with CLI command equivalents (same mapping as Task 11)
- Replace "Notion MCP" → "Notion CLI" in text references

- [ ] **Step 3: Update Notion availability detection logic**

**IMPORTANT:** `agents/briefing/notion-agent.md` and `agents/prep/notion-agent.md` contain detection logic like "Detect whether the Notion MCP server is available" that controls graceful degradation branching. This is NOT a simple string replacement — the detection mechanism changes:

Before (MCP): Check if the `notion` MCP tool is available in the tool list
After (CLI): Check if `$NOTION_API_KEY` is set and CLI is accessible

For these files, rewrite the availability check to:
```
Check Notion CLI availability:
1. Verify $NOTION_API_KEY is set (check env var)
2. Run: node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "test" 2>/dev/null
3. If exit code 0: Notion is available. If exit code 1: check stderr for error code.
4. If NOTION_AUTH_FAILED or NOTION_AUTH_MISSING: report unavailable with setup hint.
```

- [ ] **Step 4: Verify no MCP references remain in agent markdown files**

Run: `grep -rl 'notion-search\|notion-fetch\|notion-create\|notion-update\|Notion MCP' agents/`
Expected: No matches (config.json files should also be clean from Task 13)

- [ ] **Step 5: Commit**

```bash
git add agents/
git commit -m "feat(notion-cli): update 8 agent markdown files for CLI with detection logic"
```

---

### Task 15: Mechanical Degradation Text Updates (~54 Commands)

**Files:**
- Modify: All command files in `commands/` that reference "Notion MCP" in graceful degradation sections

These ~54 files don't call MCP tools directly — they load the notion-operations skill (which now references CLI) and have graceful degradation text mentioning "Notion MCP".

- [ ] **Step 1: Find all files with "Notion MCP" references**

Run: `grep -rl 'Notion MCP' commands/`
This will include the 12 direct callers (already updated) plus ~54 indirect files.

- [ ] **Step 2: Apply mechanical string replacements**

For each file not already updated in Tasks 9-12:

Replace patterns:
- `"Notion MCP server is not connected"` → `"Notion CLI is not configured"`
- `"Notion MCP is required"` → `"Notion CLI is required"`
- `"Notion MCP not configured"` → `"Notion CLI not configured"`
- `"Notion MCP server"` → `"Notion CLI tool"` (generic)
- `"Notion MCP"` → `"Notion CLI"` (catch-all for remaining)
- `"See \`${CLAUDE_PLUGIN_ROOT}/INSTALL.md\` for setup instructions"` → `"Run \`/founder-os:setup:notion-cli\` for setup"`
- Any reference to "ensure the Notion integration has access" → keep as-is (this is about Notion permissions, not our tooling)
- Any reference to "the MCP server is running" → remove or replace with "the NOTION_API_KEY is set"

Also update skill load description text if it says "Notion MCP tool usage":
- `"Notion MCP tool usage"` → `"Notion CLI tool usage"`

- [ ] **Step 3: Verify no "Notion MCP" references remain in commands/**

Run: `grep -rl 'Notion MCP' commands/`
Expected: No matches

- [ ] **Step 4: Commit**

```bash
git add commands/
git commit -m "feat(notion-cli): update degradation text across all 54 indirect Notion commands"
```

---

### Task 16: Update Infrastructure Config Files

**Files:**
- Modify: `.mcp.json`
- Modify: `scripts/release.sh`
- Modify: `scripts/generate-user-claude-md.sh`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remove `notion` server from `.mcp.json`**

Remove the entire `"notion": { ... }` block from `.mcp.json`. The file should retain `filesystem` and `claude-flow` entries.

Before:
```json
{
  "mcpServers": {
    "notion": { ... },
    "filesystem": { ... },
    "claude-flow": { ... }
  }
}
```

After:
```json
{
  "mcpServers": {
    "filesystem": { ... },
    "claude-flow": { ... }
  }
}
```

- [ ] **Step 2: Update `scripts/release.sh`**

Read the full file first. Find the section that generates `plugin/.mcp.json` (around line 64). Remove the `notion` server entry from the generated JSON. The generated `.mcp.json` for distribution should only contain `filesystem`.

- [ ] **Step 3: Update `CLAUDE.md`**

Find the "MCP Servers & External Tools" section. Change:
```
1. **Notion** MCP (21 namespaces) - CRM backbone, task tracking, output storage
```
To:
```
1. **Notion** CLI (`scripts/notion-tool.mjs`, 21 namespaces) - CRM backbone, task tracking, output storage. Run `/founder-os:setup:notion-cli` to configure.
```

Also update the "MCP Package Names" section:
- Remove or update the Notion MCP entry (`@modelcontextprotocol/server-notion`)
- Add: `Notion: Use `scripts/notion-tool.mjs` CLI (not MCP). See `skills/notion/notion-operations/SKILL.md`.`

- [ ] **Step 4: Update `scripts/generate-user-claude-md.sh`**

This script generates the user-facing CLAUDE.md for distribution. It contains stale Notion MCP references:
- Update the Notion entry (similar to Step 3): `**Notion** MCP (21 namespaces)` → `**Notion** CLI (\`scripts/notion-tool.mjs\`, 21 namespaces)`
- Update the MCP Package Names section: `Notion: \`@modelcontextprotocol/server-notion\`` → `Notion: Use \`scripts/notion-tool.mjs\` CLI (not MCP)`

Read the file first, then apply changes.

- [ ] **Step 5: Commit**

```bash
git add .mcp.json scripts/release.sh scripts/generate-user-claude-md.sh CLAUDE.md
git commit -m "feat(notion-cli): remove Notion MCP from configs, update CLAUDE.md"
```

---

### Task 17: Smoke Test the Full Migration

- [ ] **Step 1: Verify no MCP tool references remain anywhere in the codebase**

Run: `grep -r 'notion-search\|notion-fetch\|notion-create-pages\|notion-update-page\|notion-create-database\|notion-create-comment\|notion-get-comments\|notion-update-data-source' commands/ skills/ agents/`
Expected: No matches

Run: `grep -r 'Notion MCP' commands/ skills/ agents/ CLAUDE.md`
Expected: No matches (or only in historical/changelog context)

Run: `grep -r '"notion"' agents/*/config.json`
Expected: No matches

- [ ] **Step 2: Verify CLI tool runs**

Run: `node scripts/notion-tool.mjs --help`
Expected: Lists all 10 subcommands

Run: `NOTION_API_KEY=<token> node scripts/notion-tool.mjs --diagnostic`
Expected: Successful diagnostic report

- [ ] **Step 3: Test a representative Notion workflow**

Test the search → query → create-page → update-page flow:
```bash
# Search for a database
NOTION_API_KEY=<token> node scripts/notion-tool.mjs search "[FOS] Tasks" --filter database

# Query the database
NOTION_API_KEY=<token> node scripts/notion-tool.mjs query <db-id> --page-size 3

# Create a test page
NOTION_API_KEY=<token> node scripts/notion-tool.mjs create-page <db-id> --properties '{"Name": {"title": [{"text": {"content": "CLI Migration Test"}}]}}'

# Update the test page
NOTION_API_KEY=<token> node scripts/notion-tool.mjs update-page <page-id> --properties '{"Status": {"status": {"name": "Done"}}}'
```

- [ ] **Step 4: Verify `.mcp.json` no longer includes notion**

Run: `cat .mcp.json | grep notion`
Expected: No matches

- [ ] **Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix(notion-cli): post-migration fixups from smoke testing"
```
