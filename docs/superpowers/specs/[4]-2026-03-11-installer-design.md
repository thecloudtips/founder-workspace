# Founder OS Installer & Distribution Design Spec

**Date:** 2026-03-11
**Status:** Approved
**Scope:** One-command installer for the full Founder OS ecosystem

## Problem

Installing Founder OS requires ~11 manual steps across 4 systems (Notion, Google, Node.js, Claude Code). Users must configure API keys, install MCP servers, set up 32 plugins individually, create Notion databases, and authenticate with Google — all without a unified guide. This friction blocks adoption.

## Solution

A Claude Code marketplace + plugin structure that lets users install with two commands (`claude plugin marketplace add` + `claude plugin install`). No custom scripts needed. Combined with a `/founder-os:setup:notion-hq` command that programmatically creates all 22 Notion HQ databases.

## Target User

Technical founders comfortable with terminal, environment variables, and CLI tools. They want speed and reliability, not hand-holding.

## Distribution Model

**Marketplace + plugin pattern.** The distribution repo (`github.com/thecloudtips/founder-os`) serves as both a Claude Code marketplace and a plugin container. Root `.claude-plugin/marketplace.json` declares the marketplace; `plugin/` subdirectory contains the actual plugin content. Users install via standard Claude Code plugin commands — no custom scripts needed.

### Dev Repo (this repo)
Contains everything — plugin source, infrastructure, specs, plans, templates, social content, beads workflow. Not public-facing.

### Distribution Repo (`github.com/thecloudtips/founder-os`)
Clean, public repo structured as a Claude Code marketplace. Users add the marketplace and install the plugin with two commands.

### What Ships vs What Stays

| Ships to dist repo | Stays in dev repo only |
|--------------------|----------------------|
| `plugin/commands/` (all 32 namespaces) | `docs/superpowers/` (specs & plans) |
| `plugin/skills/` | `docs/plans/` (design decisions) |
| `plugin/agents/` | `docs/reports/`, `docs/reference/` |
| `plugin/_infrastructure/` (excl. `deprecated/`) | `docs/agent-specs/` |
| `plugin/.claude-plugin/plugin.json` | `_templates/` (dev scaffolding) |
| `plugin/.mcp.json` (auto-configures Notion + Filesystem) | `social/` (blog & marketing) |
| `plugin/CLAUDE.md` (user-facing) | `.beads/`, `.swarm/` (dev workflow) |
| `.claude-plugin/marketplace.json` | `_infrastructure/mcp-configs/deprecated/` |
| `docs/getting-started/` | `CLAUDE.md` (dev version, this file) |
| `CLAUDE.md` (root, marketplace context) | |
| `README.md` (user-facing) | |

### Release Script (`scripts/release.sh`)

A bash script in the dev repo that:
1. Validates the distribution repo target directory exists
2. Syncs plugin content into `plugin/` subdirectory via `rsync --delete`
3. Generates `plugin/.mcp.json` for automatic MCP server configuration
4. Generates `plugin/CLAUDE.md` (user-facing, stripped of dev workflow)
5. Preserves marketplace.json at dist repo root (NOT synced from dev)
6. Commits and optionally tags a version in the dist repo

```bash
# Usage from dev repo root:
./scripts/release.sh [--tag v1.0.0] [--push]
```

### User-Facing CLAUDE.md

The plugin directory gets a simplified `CLAUDE.md` containing:
- Project overview (what Founder OS is)
- Plugin quick reference table
- Plugin dependencies
- Conventions (naming, patterns, HQ DB discovery)
- Notion HQ structure
- No references to beads, specs, plans, templates, or dev workflow

### Distribution Repo Structure

```
founder-os/                              # Marketplace root
├── .claude-plugin/
│   └── marketplace.json                 # Declares this repo as a marketplace
├── plugin/                              # The actual plugin
│   ├── .claude-plugin/
│   │   └── plugin.json                  # Plugin manifest
│   ├── .mcp.json                        # Auto-configures Notion + Filesystem MCP
│   ├── commands/                        # All 32 namespaces
│   ├── skills/                          # Domain knowledge per namespace
│   ├── agents/                          # Agent teams (7 namespaces)
│   ├── _infrastructure/                 # Shared skills, templates, configs
│   └── CLAUDE.md                        # User-facing plugin documentation
├── docs/
│   └── getting-started/
│       ├── SETUP-GUIDE.md
│       ├── FAQ.md
│       └── TROUBLESHOOTING.md
├── CLAUDE.md                            # Root marketplace context
└── README.md
```

## Install Flow (User Perspective)

```bash
# Add marketplace and install plugin (2 commands)
claude plugin marketplace add thecloudtips/founder-os
claude plugin install founder-os

# Set Notion API key
export NOTION_API_KEY=ntn_your_token_here

# Optional: set up Notion HQ databases (inside Claude Code)
/founder-os:setup:notion-hq
```

## New Files

| File | Purpose | Ships to dist? |
|------|---------|----------------|
| `install.sh` | Main installer script (~300-400 lines bash) | Yes |
| `.env.example` | Template with all config vars + comments | Yes |
| `.gitignore` | Secrets, OS junk, generated files protection | Yes (dist version) |
| `.mcp.json.example` | Template MCP config (reference, installer generates real one) | Yes |
| `docs/getting-started/SETUP-GUIDE.md` | Full walkthrough with API key instructions | Yes |
| `docs/getting-started/FAQ.md` | ~15-20 common questions | Yes |
| `docs/getting-started/TROUBLESHOOTING.md` | Symptom/Cause/Fix/Verify format | Yes |
| `founder-os-setup/.claude-plugin/plugin.json` | Setup plugin manifest | Yes |
| `founder-os-setup/skills/notion-hq-setup/SKILL.md` | Notion HQ deployment logic | Yes |
| `founder-os-setup/commands/setup-notion-hq.md` | `/setup:notion-hq` slash command | Yes |
| `founder-os-setup/commands/setup-verify.md` | `/setup:verify` slash command | Yes |
| `scripts/release.sh` | Syncs user-facing content to dist repo | No (dev only) |
| `CLAUDE.md` (user-facing) | Simplified project guide for end users | Yes (generated) |
| `README.md` | Public-facing project README | Yes |

## Installer Script Design (install.sh)

### Phase 1 — Prerequisites Check

- Verify Node.js >= 18 (`node --version`)
- Verify `npx` available
- Verify Claude Code installed (`claude --version`)
- Verify `gws` CLI installed (`gws --version`)
- Print clear install instructions for anything missing, then exit

### Phase 2 — Environment Setup

- Check for `.env` file; if missing, copy `.env.example` and prompt user to fill it
- If `.env` exists but `NOTION_API_KEY` is still the placeholder value, fall back to interactive prompt
- Validate `NOTION_API_KEY` by hitting Notion API (`curl` to list databases)
- Create `WORKSPACE_DIR` if it doesn't exist
- Optionally validate `SLACK_BOT_TOKEN` if provided

### Phase 3 — Google Authentication

- Check if `gws auth` is already authenticated (`gws auth status` or similar)
- If not, run `gws auth login` interactively (opens browser)
- Validate with a quick `gws gmail list --limit=1`

### Phase 4 — Plugin Installation

- Create `.claude/plugins/` in project root if not exists
- Symlink all 32 `founder-os-*/` directories into `.claude/plugins/`
- **Merge** Notion + Filesystem server entries into existing project-level `.mcp.json` (preserves any existing entries like `claude-flow`). Read existing file first, add new keys, write back. Never overwrite.
- Fix P01 Inbox Zero missing `.mcp.json` (known gotcha)

### Phase 5 — Notion HQ Setup (Automated)

**Execution mechanism:** The bash script invokes `claude --dangerously-skip-permissions -p "Run /setup:notion-hq"` which triggers the setup plugin's slash command inside Claude Code. This allows the skill to use Notion MCP tools natively. The script waits for the command to complete and checks the exit code.

The `/setup:notion-hq` skill:
- Reads `_infrastructure/notion-db-templates/founder-os-hq-manifest.json` for the full DB map (22 databases in `creation_order`)
- Reads each database template JSON by filename from the manifest (mix of `hq-*.json` and legacy-named templates like `crm-sync-hub-communications.json`)
- Uses Notion MCP tools to:
  1. Create a top-level "Founder OS HQ" page as the workspace root
  2. Create all 22 databases under it with correct properties and schema
  3. Wire up cross-database relations (Companies as hub)
  4. Create the Command Center dashboard page with linked views
  5. Populate seed data (status options, type selects, etc.)
- Validates all databases listed in the manifest exist and have correct properties
- **Idempotent / partial recovery:** Before creating any database, searches for existing `[FOS] [Name]`. If found, skips. If 12 of 22 exist from a previous partial run, creates only the missing 10.

**Fallback:** If `claude` CLI invocation fails, prints manual instructions: "Open Claude Code in this project directory and run `/setup:notion-hq`"

### Phase 6 — Verification

- Test Notion connectivity (list all HQ databases)
- Test gws connectivity (Gmail, Calendar, Drive — quick read-only calls)
- Test filesystem MCP (write/read a temp file in `WORKSPACE_DIR`)
- Print summary: green checkmarks for working, red X for failures with links to troubleshooting doc

### Flags

- `./install.sh` — full run (skips completed phases automatically)
- `./install.sh --verify` — only run Phase 6
- `./install.sh --skip-notion` — skip Phase 5 (for users with existing Notion setup or no Notion)
- `./install.sh --reset` — remove symlinks and generated MCP entries for clean reinstall

### .env Loading

The script loads `.env` using safe parsing that handles quoted values and special characters:
```bash
set -a
source .env
set +a
```
Values with spaces or special characters must be quoted in `.env` (documented in `.env.example`).

## .env.example

```bash
# ============================================
# Founder OS Configuration
# ============================================
# Copy this file to .env and fill in your values:
#   cp .env.example .env
#
# See docs/getting-started/SETUP-GUIDE.md for
# step-by-step instructions on getting each key.
# ============================================

# --- REQUIRED ---

# Notion Integration Token
# Get yours at: https://www.notion.so/my-integrations
# Create integration → Copy "Internal Integration Secret"
# Starts with: ntn_
NOTION_API_KEY=ntn_your_token_here

# Workspace directory for file operations (reports, exports, etc.)
# This directory will be created if it doesn't exist
WORKSPACE_DIR=~/founder-os-workspace

# --- OPTIONAL ---

# Slack Bot Token (for P19 Slack Digest)
# Get yours at: https://api.slack.com/apps → Create App → Bot Token
# Starts with: xoxb-
SLACK_BOT_TOKEN=

# Web Search API Key (for P08 Newsletter Engine, P15 Competitive Intel)
WEB_SEARCH_API_KEY=
```

## .gitignore

The installer **appends** to any existing `.gitignore` rather than overwriting. It checks for each entry before adding to avoid duplicates.

```gitignore
# Secrets & credentials
.env
.env.local
.env.*.local
credentials.json
token.json
*.pem
*.key
*.p12
*.pfx
service-account.json

# Local plugin symlinks (generated by installer)
.claude/plugins/

# Node
node_modules/

# OS files
.DS_Store
Thumbs.db
Desktop.ini

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Logs & temp
*.log
tmp/
.tmp/

# gws auth cache
.gws/

# Build artifacts
dist/
build/
```

Key decisions:
- `.mcp.json` stays tracked in git (installer merges entries into the existing file, which already contains `claude-flow` config). `.mcp.json.example` is committed as reference for what the installer adds.
- `.claude/plugins/` ignored because those are local symlinks
- `.env` never committed; `.env.example` is committed

## Documentation Design

### SETUP-GUIDE.md

Comprehensive walkthrough:

1. **Overview** — What Founder OS is, what you're installing (32 plugins, 22 Notion databases, MCP integrations)
2. **Prerequisites** — What to install first with links:
   - Claude Code (link to Anthropic docs)
   - Node.js 18+ (link to nodejs.org)
   - `gws` CLI (link to repo + install command)
3. **Getting Your API Keys** — Step-by-step:
   - **Notion API Key**: notion.so/my-integrations → New integration → Name "Founder OS" → Copy "Internal Integration Secret" (starts with `ntn_`) → Must have "Read content", "Update content", "Insert content" capabilities
   - **Google (gws)**: Run `gws auth login` → Browser opens → Sign in → Approve Gmail + Calendar + Drive scopes → Terminal confirms
   - **Slack Bot Token** (optional): api.slack.com/apps → Create New App → From Manifest → Add bot scopes (`channels:history`, `channels:read`, `users:read`) → Install to Workspace → Copy Bot User OAuth Token (starts with `xoxb-`)
   - **Web Search API Key** (optional): Brief instructions for search provider
4. **Installation** — The 3 commands (clone, configure, run)
5. **What the Installer Does** — Transparent breakdown of all 6 phases
6. **First Commands to Try** — 3-4 example commands to validate end-to-end
7. **Updating** — `git pull && ./install.sh` (idempotent)

### FAQ.md

~15-20 entries including:
- "Do I need all 32 plugins?" — Yes they all install, use what you need
- "Can I use this without Notion?" — Limited, Notion is backbone for 21 plugins
- "What Google permissions does gws need?" — Read-only by default, write for Calendar/Drive features
- "Is my data sent anywhere?" — No, everything local, API calls direct to Notion/Google
- "Can I add custom plugins?" — Yes, follow plugin scaffold template
- "How do I update?" — `git pull && ./install.sh`
- "Can I use with a team?" — Each person runs installer with own API keys
- "What about older Notion databases?" — Migration guide, backward-compatible discovery

### TROUBLESHOOTING.md

Each entry follows Symptom → Cause → Fix → Verify:

- "Notion API key invalid" — Check starts with `ntn_`, integration has capabilities, page shared
- "gws auth fails" — Browser didn't open, wrong account, missing scopes
- "`npx` command not found" — Node.js not installed/not in PATH
- "Database not found" — Run `./install.sh --verify`, check integration access
- "Permission denied on install.sh" — `chmod +x install.sh`
- "Plugin not showing in Claude Code" — Check symlinks, restart Claude Code
- "MCP server connection failed" — Verify `.mcp.json` env vars, check `NOTION_API_KEY` exported
- "gws rate limited" — Wait 60s, retry, reduce `--limit`

## Setup Plugin (founder-os-setup)

A dedicated plugin that provides installation and maintenance commands. Lives alongside the 32 product plugins as plugin #00.

### Structure

```
founder-os-setup/
├── .claude-plugin/
│   └── plugin.json           # Manifest (plugin_number: "00", type: "infrastructure")
├── .mcp.json                 # Notion MCP config
├── commands/
│   ├── setup-notion-hq.md    # /setup:notion-hq — create all HQ databases
│   └── setup-verify.md       # /setup:verify — health check all integrations
├── skills/
│   └── notion-hq-setup/
│       └── SKILL.md          # Database creation logic, schema reference
├── INSTALL.md
└── README.md
```

### `/setup:notion-hq` Command

Invokes the `notion-hq-setup` skill which:
1. Reads `_infrastructure/notion-db-templates/founder-os-hq-manifest.json` for the complete database map (22 databases in `creation_order`)
2. Reads each template JSON by filename from the manifest (handles both `hq-*.json` and legacy-named templates)
3. Creates databases via Notion MCP in dependency order:
   - Companies first (hub for all relations)
   - Then Contacts, Deals, Communications (CRM cluster)
   - Then Tasks, Meetings, Finance (Operations)
   - Then Briefings, Knowledge Base, Research, Reports (Intelligence)
   - Then Content, Deliverables, Prompts (Content)
   - Then Goals, Milestones, Learnings, Weekly Insights, Workflows, Activity Log (Growth)
4. Wires cross-database relations after all databases exist
5. Creates Command Center dashboard page
6. Populates select/multi-select options (status values, type values)

### `/setup:verify` Command

Runs all Phase 6 verification checks from within Claude Code:
- Notion DB connectivity (all 22 databases)
- gws CLI auth status
- Filesystem MCP write/read test
- Reports results with pass/fail per integration

### Idempotency

- Before creating any database, searches for existing `[FOS] [Name]` database
- If found, validates schema matches expected properties
- Reports discrepancies but does not overwrite existing data
- Handles partial state: if 12 of 22 databases exist, creates only the missing 10
- Safe to re-run at any time

## Design Principles

- **Idempotent** — safe to re-run, skips completed steps
- **Fail-fast** — stops at first blocker with clear error + troubleshooting link
- **No manual Notion setup** — `/setup:notion-hq` creates all 22 databases programmatically
- **Secrets never committed** — `.env` in `.gitignore`, `.env.example` committed
- **Updatable** — `git pull && ./install.sh` handles updates
- **Project-scoped** — plugins symlinked to `.claude/plugins/` (project level, not global)
- **Transparent** — user can read exactly what the installer does before running it
- **Clean separation** — dev workflow artifacts never reach end users; release script enforces the boundary
