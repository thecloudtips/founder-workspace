# [6] Notion CLI Migration Design

**Date:** 2026-03-12
**Status:** Draft
**Supersedes:** Notion MCP server integration (`@modelcontextprotocol/server-notion`)
**Research:** `docs/specs/notion-cli-research.md`

## Problem

The official Notion MCP server registers 22 tool definitions injected into every conversation turn, consuming ~11,000 tokens per turn regardless of whether Notion is needed. In a typical 10-command Founder OS session where only 3 commands touch Notion, this wastes ~110,000 tokens — a 97% overhead. At scale (5 founders, 20 sessions/day), this costs ~$990/month in Notion-only token overhead versus ~$24/month with a CLI approach.

Beyond token bloat, the MCP server has a confirmed schema validation bug (#153) in `notion-update-page` that blocks all database page property updates — a showstopper for 21 namespaces that write to Notion.

## Solution

Replace the Notion MCP server with a Node.js CLI wrapper (`notion-tool.mjs`) around the official `@notionhq/client` SDK (v5.9.0, 222K+ weekly downloads). This follows the proven pattern established by the `gws` CLI, which replaced three Google MCP servers (Gmail, Calendar, Drive) with a single CLI tool.

The CLI lives inside the plugin distribution directory and is invoked via Bash from command and agent markdown files. Zero tokens are consumed when Notion is not in use. Per-call cost is ~200 tokens of skill instructions + ~800 tokens of command output.

## Architecture

### File Structure (Plugin Distribution)

```
plugin/
├── scripts/
│   ├── notion-tool.mjs          # ~200 line CLI entry point
│   ├── package.json             # @notionhq/client dependency
│   └── node_modules/            # ~890 KB (gitignored)
├── skills/
│   └── notion/
│       ├── notion-operations/SKILL.md   # Updated: CLI reference replaces MCP reference
│       └── notion-database-design/SKILL.md  # Updated: downstream calls use create-database CLI subcommand
└── commands/
    └── setup/
        └── notion-cli.md        # Guided setup wizard
```

### CLI Interface

Entry point: `node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs <command> [args]`

All output is JSON to stdout. Errors are structured JSON to stderr with exit code 1.

#### 10 Subcommands

| Command | Purpose | Key Args |
|---------|---------|----------|
| `search <query>` | Workspace search (databases, pages) | `--filter object_type` |
| `query <database-id>` | Database query with filters/sorts | `--filter json`, `--sorts json`, `--page-size N` |
| `create-page <parent-id>` | Create page/row in database | `--properties json`, `--content json` |
| `update-page <page-id>` | Update page properties | `--properties json` |
| `get-page <page-id-or-url>` | Read page properties | — |
| `get-blocks <page-id>` | Read page content/body | `--recursive` |
| `get-comments <page-id>` | Read discussion threads | — |
| `create-comment <page-id>` | Add comment to page | `--body text` |
| `create-database <parent-id>` | Create a new database | `--title text`, `--properties json` |
| `fetch <notion-url>` | Resolve any Notion URL to its content | — |

**URL resolution:** `get-page` and `fetch` both accept full Notion URLs (e.g., `https://notion.so/Page-abc123`) in addition to raw IDs. The CLI extracts the page/database ID from the URL automatically. `fetch` is a convenience command that auto-detects whether the URL points to a page, database, or block and returns the appropriate content.

**Out of scope:** `move-pages` and `duplicate-page` (MCP tools `notion-move-pages`, `notion-duplicate-page`) are not included. These are used in zero Founder OS commands and can be added later if needed.

#### Auth Resolution Order

1. `$NOTION_API_KEY` environment variable (shell — primary)
2. `.env` file in plugin root (fallback for users who can't set shell vars)
3. Structured error with setup instructions if neither found

#### Error Handling

| Condition | Behavior |
|-----------|----------|
| Auth failure (401) | Exit 1, hint: "Run /founder-os:setup:notion-cli" |
| Rate limit (429) | Exponential backoff, 3 retries (Notion allows 3 req/sec avg) |
| Not found (404) | Exit 1, hint: "Check sharing permissions" |
| Validation error | Exit 1, identify failing property + expected format |
| Network timeout | 10s timeout, return `status: "unavailable"` JSON |

All errors emit structured JSON to stderr:
```json
{"error": "description", "code": "NOTION_AUTH_FAILED", "hint": "Run /founder-os:setup:notion-cli"}
```

#### Pagination

Handled internally by the CLI. Database queries auto-fetch all pages using cursor-based pagination and return combined results. A `--page-size` flag controls per-request batch size (default 100, Notion max).

#### Diagnostics

`notion-tool.mjs --diagnostic` runs a health check:
- Validates auth token
- Lists accessible databases with names
- Tests read/write (creates and deletes a temp page)
- Reports latency per operation

### Skill File

The updated `skills/notion/notion-operations/SKILL.md` replaces MCP tool references with CLI command references. It:

- Auto-activates when Notion operations are detected in conversation
- Documents all 10 subcommands with examples
- Shell access scoping is enforced at the command level via `allowed-tools` in each command's frontmatter (consistent with the gws skill pattern — skill files do not use `allowed-tools`)
- Preserves the HQ database discovery pattern:
  1. `search "[FOS] <Name>"` first
  2. Fall back to `"Founder OS HQ - <Name>"`
  3. Fall back to legacy plugin-specific DB name
  4. If none found: skip Notion, return `status: "unavailable"`

### Setup Wizard

New command `/founder-os:setup:notion-cli` replaces MCP-based Notion configuration:

1. Check `scripts/node_modules/` exists → run `npm install` in `scripts/` if missing
2. Check `$NOTION_API_KEY` in environment → skip to step 8 if present
3. Check `.env` in plugin root → skip to step 8 if present
4. Guide user to notion.so/profile/integrations
5. Create integration named "Founder OS", select workspace
6. Copy token
7. Prompt paste → write to `.env` (gitignored)
8. Instruct user to share root Founder OS page with integration (one share grants access to all child databases)
9. Run `notion-tool.mjs search "Founder OS"` to verify access
10. List discovered databases → confirm success

**Key UX insight:** Sharing a parent page automatically grants access to all child pages and databases. Users share 1-3 pages instead of 21 databases.

## Migration Scope

### What Changes

**22 command namespaces** (21 Notion-dependent namespaces + the `notion` namespace itself) — replace MCP tool invocations with CLI calls in all command markdown files. The change is mechanical:

Before:
```markdown
Search Notion for "[FOS] Tasks" using notion-search
Create page via notion-create-pages with properties...
```

After:
```markdown
node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "[FOS] Tasks"
node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs create-page <db-id> --properties '...'
```

**7 agent team definitions** — mechanical replacement in both agent markdown files (`agents/*/*.md`) AND their `config.json` files. Tool declarations change from `"tools": ["notion"]` to `"tools": ["Bash"]` (same pattern as the gws migration).

**4 `commands/notion/` files** — `create.md`, `query.md`, `update.md`, `template.md` contain hardcoded MCP tool names (`notion-search`, `notion-fetch`, `notion-create-pages`, `notion-update-page`, `notion-create-database`) that must be rewritten to CLI calls. These are not covered by the skill file update alone.

**2 skill files updated:**
- `skills/notion/notion-operations/SKILL.md` — rewritten for CLI reference
- `skills/notion/notion-database-design/SKILL.md` — update downstream operation references from `notion-create-database` MCP tool to `create-database` CLI subcommand

**1 new command** — `commands/setup/notion-cli.md` (setup wizard).

**1 new script + package.json** — `scripts/notion-tool.mjs` and `scripts/package.json`.

**Plugin distribution `.mcp.json`** — remove the `notion` MCP server entry.

**`CLAUDE.md`** — update Notion tool reference from MCP to CLI.

### What Stays the Same

- `skills/notion/notion-database-design/SKILL.md` — schema design knowledge unchanged, but downstream references updated to use `create-database` CLI subcommand
- Database discovery pattern (`[FOS] Name` → fallback chain)
- Graceful degradation contract (`status: "unavailable"` JSON)
- Output JSON structure from Notion operations
- All 21 HQ database templates and manifest
- Business context loading, memory engine, intelligence engine

### Dev Repo vs Distribution

This design targets the **distributed plugin** (`plugin/` directory). The distributed plugin will not include Notion in its `.mcp.json`.

**Dev repo `.mcp.json`:** The Notion MCP entry can remain for comparison testing during migration, but developers should be aware that the MCP server will still inject ~11,000 tokens per turn while active. Once migration is validated, remove the `notion` entry from the dev repo's `.mcp.json` as well to match the distribution config and avoid unnecessary token overhead during development.

## Token Economics

| Metric | MCP (current) | CLI (proposed) |
|--------|--------------|----------------|
| Tokens per turn (idle) | ~11,000 | 0 |
| Tokens per Notion call | ~11,000 + response | ~200 (skill) + ~800 (output) |
| 10-command session (3 Notion) | ~110,000 | ~3,000 |
| Reduction | — | 97.3% |
| Monthly cost (5 users, 20 sessions/day) | ~$990 | ~$24 |

## Dependencies

- `@notionhq/client` v5.9.0+ (official SDK, 222K+ weekly downloads, 2 direct deps, ~890KB)
- Node.js (already ships with Claude Code)
- No new MCP servers, no external binaries, no OAuth infrastructure

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| SDK breaking change | Low | Pin to `^5.9.0`, test on update |
| Notion API rate limits | Medium | Built-in exponential backoff, 3 retries |
| Users struggle with token setup | Medium | 8-step guided wizard, diagnostic command |
| Edge case in property formatting | Medium | Match exact MCP server property format in CLI output |
| `node_modules/` missing after install | Low | Skill file checks, setup wizard handles |

## Success Criteria

1. All 22 Notion-dependent namespaces (including `commands/notion/`) work identically via CLI as they did via MCP
2. Zero Notion tokens consumed in non-Notion conversation turns
3. `notion-update-page` works correctly (bypasses MCP bug #153)
4. Setup wizard completes in under 5 minutes for non-technical users
5. `--diagnostic` flag validates full read/write cycle
6. Graceful degradation unchanged — all `status: "unavailable"` paths still work
