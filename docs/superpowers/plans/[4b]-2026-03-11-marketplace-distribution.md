# Marketplace Distribution Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the `founder-os` distribution repo into a self-contained Claude Code marketplace + plugin, so users install with `claude plugin marketplace add` + `claude plugin install` — no custom install.sh needed.

**Architecture:** The `thecloudtips/founder-os` GitHub repo serves as both marketplace and plugin. Root `.claude-plugin/marketplace.json` declares the marketplace; `plugin/` subdirectory contains the actual plugin content (commands, skills, agents, `.mcp.json`). Follows the claude-mem single-repo pattern.

**Tech Stack:** Claude Code plugin system, JSON manifests, GitHub.

**Spec:** Brainstorming session 2026-03-11 (marketplace approach A — single repo as marketplace + plugin).

---

## Chunk 1: Restructure Distribution Repo

**Important notes:**
- Do NOT `git mv .claude-plugin/` — that directory stays at root for the marketplace manifest. Only its contents change.
- Tasks in this chunk MUST execute in order (Task 3 creates `plugin/` dir that Task 4 depends on).
- Claude Code auto-discovers `commands/`, `skills/`, `agents/` by convention within the plugin directory — no explicit path declarations needed in `plugin.json`.
- After migration, no `.mcp.json` exists at the dist repo root. The plugin's `.mcp.json` at `plugin/.mcp.json` is what Claude Code reads when the plugin is installed.

### Task 1: Create marketplace manifest

**Files:**
- Create: `(dist)/.claude-plugin/marketplace.json`
- Remove: `(dist)/.claude-plugin/plugin.json` (will be replaced by marketplace.json at root level)

- [ ] **Step 1: Create marketplace.json**

In the distribution repo (`/Users/lhalicki/coding_projects/founder-os`), create `.claude-plugin/marketplace.json`:

```json
{
  "name": "founder-os-marketplace",
  "owner": {
    "name": "Founder OS",
    "url": "https://github.com/thecloudtips/founder-os"
  },
  "plugins": [
    {
      "name": "founder-os",
      "version": "1.0.0",
      "source": "./plugin",
      "description": "32-namespace AI automation ecosystem for SMB founders — email triage, meeting prep, reports, CRM sync, and more."
    }
  ]
}
```

- [ ] **Step 2: Remove old root plugin.json (replaced by marketplace.json)**

```bash
cd /Users/lhalicki/coding_projects/founder-os
git rm .claude-plugin/plugin.json
```

- [ ] **Step 3: Verify marketplace.json is valid JSON**

Run: `python3 -m json.tool /Users/lhalicki/coding_projects/founder-os/.claude-plugin/marketplace.json`
Expected: Pretty-printed JSON, no errors.

### Task 2: Create plugin subdirectory with manifest

**Files:**
- Create: `(dist)/plugin/.claude-plugin/plugin.json`
- Create: `(dist)/plugin/.mcp.json`

- [ ] **Step 1: Create plugin directory and manifest**

Create `plugin/.claude-plugin/plugin.json`:

```json
{
  "name": "founder-os",
  "version": "1.0.0",
  "description": "32-namespace AI automation ecosystem for SMB founders. Email triage, meeting prep, report generation, CRM sync, and 28 more tools — all powered by Claude Code.",
  "platform": "claude-code",
  "author": {
    "name": "Founder OS",
    "url": "https://github.com/thecloudtips/founder-os"
  },
  "repository": "https://github.com/thecloudtips/founder-os",
  "keywords": [
    "automation",
    "founder",
    "smb",
    "notion",
    "crm",
    "email",
    "meetings",
    "reports"
  ]
}
```

- [ ] **Step 2: Create plugin .mcp.json**

Create `plugin/.mcp.json` with the MCP servers the plugin needs:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "${NOTION_API_KEY}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${HOME}/founder-os-workspace"],
      "env": {}
    }
  }
}
```

Note: `${HOME}/founder-os-workspace` is a sensible default. Users can change it in their `.mcp.json` after install.

### Task 3: Move plugin content into plugin/ subdirectory

**Files:**
- Move: `(dist)/commands/` → `(dist)/plugin/commands/`
- Move: `(dist)/skills/` → `(dist)/plugin/skills/`
- Move: `(dist)/agents/` → `(dist)/plugin/agents/`
- Move: `(dist)/_infrastructure/` → `(dist)/plugin/_infrastructure/`

- [ ] **Step 1: Move all plugin content**

```bash
cd /Users/lhalicki/coding_projects/founder-os
mkdir -p plugin
git mv commands plugin/commands
git mv skills plugin/skills
git mv agents plugin/agents
git mv _infrastructure plugin/_infrastructure
```

- [ ] **Step 2: Verify plugin directory has expected structure**

```bash
ls plugin/
```

Expected: `_infrastructure  agents  commands  skills  .claude-plugin  .mcp.json`

### Task 4: Create plugin CLAUDE.md

**Depends on:** Task 3 (plugin/ directory must exist)

**Files:**
- Create: `(dist)/plugin/CLAUDE.md`

- [ ] **Step 1: Generate user-facing CLAUDE.md for the plugin**

Run the existing generator script, but output to `plugin/CLAUDE.md`:

```bash
cd /Users/lhalicki/coding_projects/founderOS
bash scripts/generate-user-claude-md.sh > /Users/lhalicki/coding_projects/founder-os/plugin/CLAUDE.md
```

If the generator doesn't work standalone, create a minimal CLAUDE.md with the namespace quick reference from the dev repo's CLAUDE.md.

### Task 5: Clean up root-level files

**Files:**
- Remove: `(dist)/install.sh` (no longer needed)
- Remove: `(dist)/.env.example` (env vars handled by MCP config)
- Remove: `(dist)/.mcp.json.example` (plugin .mcp.json handles this)
- Update: `(dist)/README.md`
- Keep: `(dist)/docs/getting-started/` (update later)
- Keep: `(dist)/CLAUDE.md` (root-level, for marketplace context)

Note: `(dist)/.claude-plugin/plugin.json` was already removed in Task 1 Step 2.

- [ ] **Step 1: Remove obsolete files**

```bash
cd /Users/lhalicki/coding_projects/founder-os
git rm install.sh
git rm .env.example
git rm .mcp.json.example
```

- [ ] **Step 2: Update README.md**

Replace `README.md` with marketplace-oriented installation instructions:

```markdown
# Founder OS

**32-namespace AI automation ecosystem for SMB founders, built on Claude Code.**

Stop drowning in email, meetings, and manual busywork. Founder OS gives you a full AI-powered command center — from inbox triage to client health dashboards to automated proposals — all running inside Claude Code.

---

## Install

```bash
# 1. Add the marketplace
claude plugin marketplace add thecloudtips/founder-os

# 2. Install the plugin
claude plugin install founder-os

# 3. Set your Notion API key (required for most commands)
#    Get yours at: https://www.notion.so/my-integrations
export NOTION_API_KEY=ntn_your_token_here
```

That's it. All 94 commands are now available as `/founder-os:<namespace>:<action>`.

---

## What's Included

**32 namespaces across 4 pillars:**

| Pillar | Namespaces | Focus |
|--------|------------|-------|
| Daily Work | inbox, briefing, prep, actions, review, followup, meeting, newsletter | Email, meetings, reviews |
| Code Without Coding | report, health, invoice, proposal, contract, sow, compete, expense | Reports, invoices, proposals |
| MCP & Integrations | notion, drive, slack, client, crm, morning, kb, linkedin | Notion, Drive, Slack, CRM |
| Meta & Growth | savings, prompt, workflow, workflow-doc, learn, goal, memory, intel | ROI, workflows, templates |

---

## Requirements

- Claude Code (latest)
- Node.js 18+
- Notion workspace + API key (free tier works)
- Google account + [gws CLI](https://github.com/nicholasgasior/gws) for Gmail/Calendar/Drive features

---

## Optional: Google Workspace

For email, calendar, and drive features, install and authenticate the gws CLI:

```bash
# Install gws (see gws docs for your platform)
gws auth login
```

---

## Optional: Notion HQ Databases

After installing, run the setup command inside Claude Code to create all 22 Notion databases:

```
/founder-os:setup:notion-hq
```

---

## Documentation

| Guide | Description |
|-------|-------------|
| [SETUP-GUIDE.md](docs/getting-started/SETUP-GUIDE.md) | Detailed setup walkthrough |
| [FAQ.md](docs/getting-started/FAQ.md) | Common questions |
| [TROUBLESHOOTING.md](docs/getting-started/TROUBLESHOOTING.md) | Fixes for common issues |

---

## License

MIT
```

- [ ] **Step 3: Commit all changes**

```bash
cd /Users/lhalicki/coding_projects/founder-os
git add -A
git commit -m "refactor: restructure as marketplace + plugin for standard Claude Code installation"
```

## Chunk 2: Update Release Script

### Task 6: Update release.sh in dev repo

**Files:**
- Modify: `(dev)/scripts/release.sh`

The release script must now sync content into `plugin/` instead of the repo root.

- [ ] **Step 1: Update release.sh sync targets**

Change the script so that:
- Plugin content (commands, skills, agents, .claude-plugin) syncs to `$DIST_DIR/plugin/`
- Infrastructure syncs to `$DIST_DIR/plugin/_infrastructure/`
- Root files (README.md, marketplace.json) sync to `$DIST_DIR/` root
- The `plugin/.mcp.json` is generated/synced
- The `plugin/CLAUDE.md` is generated
- install.sh, .env.example, .mcp.json.example are NO LONGER synced

Key changes to the sync loop:

```bash
# Sync plugin structure into plugin/ subdirectory
for dir in commands skills agents; do
  if [[ -d "$DEV_ROOT/$dir" ]]; then
    mkdir -p "$DIST_DIR/plugin/$dir"
    rsync -a --delete "$DEV_ROOT/$dir/" "$DIST_DIR/plugin/$dir/"
  fi
done

# Sync .claude-plugin for the plugin (not marketplace)
mkdir -p "$DIST_DIR/plugin/.claude-plugin"
cp "$DEV_ROOT/.claude-plugin/plugin.json" "$DIST_DIR/plugin/.claude-plugin/plugin.json"

# Sync infrastructure into plugin/
rsync -a --delete \
  --exclude='deprecated/' \
  "$DEV_ROOT/_infrastructure/" "$DIST_DIR/plugin/_infrastructure/"

# Generate plugin .mcp.json
cat > "$DIST_DIR/plugin/.mcp.json" << 'MCPEOF'
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "${NOTION_API_KEY}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${HOME}/founder-os-workspace"],
      "env": {}
    }
  }
}
MCPEOF

# Generate plugin CLAUDE.md
if [[ -f "$DEV_ROOT/scripts/generate-user-claude-md.sh" ]]; then
  bash "$DEV_ROOT/scripts/generate-user-claude-md.sh" > "$DIST_DIR/plugin/CLAUDE.md"
fi
```

- [ ] **Step 2: Preserve marketplace.json and docs/getting-started sync**

The release script MUST:
- NOT overwrite `$DIST_DIR/.claude-plugin/marketplace.json` — add a guard:
  ```bash
  # Preserve marketplace manifest (lives only in dist repo, not dev)
  # Do NOT sync .claude-plugin/ from dev root to dist root
  ```
- Continue syncing `docs/getting-started/` to `$DIST_DIR/docs/getting-started/` (unchanged from old script)
- Continue syncing `README.md` to `$DIST_DIR/README.md`

- [ ] **Step 3: Commit release script changes**

```bash
cd /Users/lhalicki/coding_projects/founderOS
git add scripts/release.sh
git commit -m "refactor: update release script for marketplace plugin structure"
```

## Chunk 3: Update Design Spec

### Task 7: Update installer design spec

**Files:**
- Modify: `(dev)/docs/superpowers/specs/[4]-2026-03-11-installer-design.md`

- [ ] **Step 1: Update the Distribution Model section**

Replace the "Distribution Model" section to reflect the marketplace approach instead of install.sh.

- [ ] **Step 2: Commit spec update**

```bash
git add docs/superpowers/specs/[4]-2026-03-11-installer-design.md
git commit -m "docs: update installer spec for marketplace distribution model"
```

## Chunk 4: Validate & Push

### Task 8: Validate the marketplace structure

- [ ] **Step 1: Validate plugin manifest**

```bash
claude plugin validate /Users/lhalicki/coding_projects/founder-os/plugin
```

Expected: Validation passes. If `claude plugin validate` returns an error about unknown command, skip to Step 2 — the install test is the real validation.

- [ ] **Step 2: Test marketplace add (dry run)**

```bash
claude plugin marketplace add /Users/lhalicki/coding_projects/founder-os
```

This adds the local path as a marketplace. If it succeeds, the structure is correct.

- [ ] **Step 3: Test plugin install**

```bash
claude plugin install founder-os@founder-os-marketplace
```

Expected: Plugin installs successfully and commands become available.

- [ ] **Step 4: Verify commands are available**

Start a new Claude Code session and check that `/founder-os:` commands appear.

- [ ] **Step 5: Push distribution repo**

```bash
cd /Users/lhalicki/coding_projects/founder-os
git push origin main
```

- [ ] **Step 6: Test remote marketplace add**

```bash
claude plugin marketplace remove founder-os-marketplace  # remove local
claude plugin marketplace add thecloudtips/founder-os     # add from GitHub
claude plugin install founder-os
```

Expected: Same result as local test.
