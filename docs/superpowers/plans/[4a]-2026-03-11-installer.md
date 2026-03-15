# Founder OS Installer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a one-command installer that sets up the full 32-plugin Founder OS ecosystem from a fresh git clone of the **distribution repo**.

**Architecture:** A separate distribution repo (`founder-os`) contains only user-facing content. A `scripts/release.sh` in the dev repo syncs content to the dist repo. The dist repo's `install.sh` handles prerequisites, env vars, Google auth, plugin symlinks, and MCP config. A `founder-os-setup` plugin provides `/setup:notion-hq` (creates 22 Notion databases via MCP) and `/setup:verify` (health checks). Three docs (SETUP-GUIDE, FAQ, TROUBLESHOOTING) cover everything users need.

**Tech Stack:** Bash, rsync (release script), curl (Notion API validation), Claude Code CLI (Notion HQ setup), Notion MCP, gws CLI.

**Spec:** `docs/superpowers/specs/[1]-2026-03-11-installer-design.md`

---

## Chunk 0: Distribution Infrastructure

### Task 0a: Create release script (`scripts/release.sh`)

**Files:**
- Create: `scripts/release.sh`

This script syncs user-facing content from the dev repo to the distribution repo. It must be run from the dev repo root.

- [ ] **Step 1: Create the script**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Founder OS Release Script
# Syncs user-facing content from dev repo to distribution repo.
# Usage: ./scripts/release.sh [--dist-dir <path>] [--tag <version>] [--push]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="${DEV_ROOT}/../founder-os"
TAG=""
PUSH=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dist-dir) DIST_DIR="$2"; shift 2 ;;
    --tag) TAG="$2"; shift 2 ;;
    --push) PUSH=true; shift ;;
    -h|--help)
      echo "Usage: ./scripts/release.sh [--dist-dir <path>] [--tag <version>] [--push]"
      echo "  --dist-dir  Path to distribution repo (default: ../founder-os)"
      echo "  --tag       Git tag to create in dist repo (e.g., v1.0.0)"
      echo "  --push      Push commits and tags to dist remote"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate
if [[ ! -d "$DIST_DIR/.git" ]]; then
  echo "ERROR: Distribution repo not found at $DIST_DIR"
  echo "Clone it first: git clone <dist-repo-url> $DIST_DIR"
  exit 1
fi

echo "=== Founder OS Release ==="
echo "Dev repo:  $DEV_ROOT"
echo "Dist repo: $DIST_DIR"
echo ""

# Sync plugin directories
echo "Syncing plugins..."
for plugin_dir in "$DEV_ROOT"/founder-os-*/; do
  plugin_name=$(basename "$plugin_dir")
  rsync -a --delete "$plugin_dir" "$DIST_DIR/$plugin_name/"
done

# Sync infrastructure (excluding deprecated)
echo "Syncing infrastructure..."
rsync -a --delete \
  --exclude='deprecated/' \
  "$DEV_ROOT/_infrastructure/" "$DIST_DIR/_infrastructure/"

# Sync installer files
echo "Syncing installer files..."
for f in install.sh .env.example .mcp.json.example; do
  [[ -f "$DEV_ROOT/$f" ]] && cp "$DEV_ROOT/$f" "$DIST_DIR/$f"
done

# Sync getting-started docs
echo "Syncing documentation..."
mkdir -p "$DIST_DIR/docs/getting-started"
rsync -a --delete \
  "$DEV_ROOT/docs/getting-started/" "$DIST_DIR/docs/getting-started/"

# Generate user-facing CLAUDE.md (Task 0b handles the template)
if [[ -f "$DEV_ROOT/scripts/generate-user-claude-md.sh" ]]; then
  echo "Generating user-facing CLAUDE.md..."
  bash "$DEV_ROOT/scripts/generate-user-claude-md.sh" > "$DIST_DIR/CLAUDE.md"
fi

# Copy README if exists
[[ -f "$DEV_ROOT/README.dist.md" ]] && cp "$DEV_ROOT/README.dist.md" "$DIST_DIR/README.md"

# Copy distribution .gitignore
[[ -f "$DEV_ROOT/.gitignore.dist" ]] && cp "$DEV_ROOT/.gitignore.dist" "$DIST_DIR/.gitignore"

# Ensure install.sh is executable
[[ -f "$DIST_DIR/install.sh" ]] && chmod +x "$DIST_DIR/install.sh"

echo ""
echo "Sync complete. Review changes:"
echo "  cd $DIST_DIR && git status"

# Commit in dist repo
cd "$DIST_DIR"
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -m "release: sync from dev repo$([ -n "$TAG" ] && echo " ($TAG)")"
  echo "Committed changes in dist repo."
fi

# Tag if requested
if [[ -n "$TAG" ]]; then
  git tag -a "$TAG" -m "Release $TAG"
  echo "Tagged: $TAG"
fi

# Push if requested
if [[ "$PUSH" == true ]]; then
  git push origin main
  [[ -n "$TAG" ]] && git push origin "$TAG"
  echo "Pushed to remote."
fi

echo ""
echo "=== Done ==="
```

- [ ] **Step 2: Make executable and commit**

```bash
chmod +x scripts/release.sh
git add scripts/release.sh
git commit -m "feat: add release script for dev-to-dist repo sync"
```

---

### Task 0b: Create distribution .gitignore and README template

**Files:**
- Create: `.gitignore.dist` (the .gitignore that ships to users)
- Create: `README.dist.md` (the README that ships to users)

- [ ] **Step 1: Create `.gitignore.dist`**

Same content as the .gitignore specified in the design spec (secrets, plugins, node_modules, OS files, IDE, logs, gws, build artifacts). This file is copied to the dist repo as `.gitignore` by the release script.

- [ ] **Step 2: Create `README.dist.md`**

User-facing README with:
- Project tagline and description
- Quick start (3 commands)
- What's included (32 plugins, 4 pillars)
- Link to SETUP-GUIDE.md for full instructions
- Link to FAQ and Troubleshooting
- License info

- [ ] **Step 3: Commit**

```bash
git add .gitignore.dist README.dist.md
git commit -m "feat: add distribution .gitignore and README templates"
```

---

### Task 0c: Create user-facing CLAUDE.md generator

**Files:**
- Create: `scripts/generate-user-claude-md.sh`

A script that outputs a simplified CLAUDE.md for end users. Strips dev workflow (beads, specs, templates, plans) and includes only what's relevant for using the plugins.

- [ ] **Step 1: Create the generator script**

The script outputs to stdout. It includes:
- Project overview
- Plugin architecture (format, four pillars)
- Plugin quick reference table (all 32)
- Plugin dependencies
- Conventions (naming, DB discovery, idempotency, type column, etc.)
- Notion HQ structure and database consolidation map
- MCP servers info
- Key decisions table

Does NOT include:
- Beads workflow instructions
- Specs/plans locations
- Template references
- Dev session workflow
- Implementation order notes

- [ ] **Step 2: Make executable and commit**

```bash
chmod +x scripts/generate-user-claude-md.sh
git add scripts/generate-user-claude-md.sh
git commit -m "feat: add user-facing CLAUDE.md generator for dist repo"
```

---

## Chunk 1: Foundation Files

### Task 1: Create `.env.example`

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create the file**

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

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "feat: add .env.example for Founder OS configuration"
```

---

### Task 2: Update `.gitignore`

**Files:**
- Modify: `.gitignore`

The existing `.gitignore` has only Dolt entries. Append the new entries without removing existing ones.

- [ ] **Step 1: Read existing `.gitignore`**

Current contents:
```
# Dolt database files (added by bd init)
.dolt/
*.db
```

- [ ] **Step 2: Append new entries**

Add below the existing content:

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

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "feat: expand .gitignore with secrets, OS, IDE, and generated file patterns"
```

---

### Task 3: Create `.mcp.json.example`

**Files:**
- Create: `.mcp.json.example`

This is a reference showing what the installer adds to `.mcp.json`. Not used directly — just documentation.

- [ ] **Step 1: Create the file**

```json
{
  "_comment": "Reference: these entries are merged into .mcp.json by install.sh. Do not edit this file — edit .mcp.json directly or re-run the installer.",
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
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${WORKSPACE_DIR}"],
      "env": {}
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add .mcp.json.example
git commit -m "feat: add .mcp.json.example as MCP config reference"
```

---

## Chunk 2: Installer Script

### Task 4: Create `install.sh` — Header and Utilities

**Files:**
- Create: `install.sh`

Build the script incrementally. Start with the header, color output helpers, and flag parsing.

- [ ] **Step 1: Create script with header and utilities**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Founder OS Installer
# Usage: ./install.sh [--verify] [--skip-notion] [--reset]

# ── Colors & Output ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${BLUE}→${NC} $1"; }
header() { echo -e "\n${BOLD}$1${NC}"; }

# ── Flag Parsing ─────────────────────────────────────────────────
VERIFY_ONLY=false
SKIP_NOTION=false
RESET=false

for arg in "$@"; do
  case $arg in
    --verify)      VERIFY_ONLY=true ;;
    --skip-notion) SKIP_NOTION=true ;;
    --reset)       RESET=true ;;
    --help|-h)
      echo "Usage: ./install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --verify        Run verification checks only (Phase 6)"
      echo "  --skip-notion   Skip Notion HQ database setup (Phase 5)"
      echo "  --reset         Remove symlinks and installer-generated MCP entries"
      echo "  --help, -h      Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Run ./install.sh --help for usage"
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGINS_DIR="$SCRIPT_DIR/.claude/plugins"
```

- [ ] **Step 2: Verify the script is syntactically valid**

Run: `bash -n install.sh`
Expected: No output (clean parse).

- [ ] **Step 3: Make executable and commit**

```bash
chmod +x install.sh
git add install.sh
git commit -m "feat: install.sh skeleton with flag parsing and output helpers"
```

---

### Task 5: `install.sh` — Phase 1 (Prerequisites)

**Files:**
- Modify: `install.sh`

- [ ] **Step 1: Add Phase 1 after the flag parsing block**

Append to `install.sh`:

```bash
# ── Reset Mode ───────────────────────────────────────────────────
if $RESET; then
  header "Resetting Founder OS installation..."

  # Remove plugin symlinks
  if [ -d "$PLUGINS_DIR" ]; then
    rm -rf "$PLUGINS_DIR"
    ok "Removed .claude/plugins/"
  fi

  # Remove installer-generated MCP entries from .mcp.json
  if [ -f "$SCRIPT_DIR/.mcp.json" ] && command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
try:
    with open('$SCRIPT_DIR/.mcp.json', 'r') as f:
        config = json.load(f)
    for key in ['notion', 'filesystem']:
        config.get('mcpServers', {}).pop(key, None)
    with open('$SCRIPT_DIR/.mcp.json', 'w') as f:
        json.dump(config, f, indent=2)
        f.write('\n')
    print('Removed notion and filesystem entries from .mcp.json')
except Exception as e:
    print(f'Warning: could not update .mcp.json: {e}', file=sys.stderr)
" && ok "Cleaned .mcp.json" || warn "Could not clean .mcp.json"
  fi

  ok "Reset complete. Run ./install.sh to reinstall."
  exit 0
fi

# ── Phase 1: Prerequisites ──────────────────────────────────────
if ! $VERIFY_ONLY; then
  header "Phase 1: Checking prerequisites..."
  MISSING=()

  # python3 (used for JSON merging and validation)
  if command -v python3 &>/dev/null; then
    ok "python3 available"
  else
    fail "python3 not found"
    MISSING+=("Python 3: https://www.python.org/downloads/")
  fi

  # Node.js >= 18
  if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
      ok "Node.js $(node --version)"
    else
      fail "Node.js $(node --version) — need v18+"
      MISSING+=("Node.js 18+: https://nodejs.org/")
    fi
  else
    fail "Node.js not found"
    MISSING+=("Node.js 18+: https://nodejs.org/")
  fi

  # npx
  if command -v npx &>/dev/null; then
    ok "npx available"
  else
    fail "npx not found"
    MISSING+=("npx (comes with Node.js): https://nodejs.org/")
  fi

  # Claude Code
  if command -v claude &>/dev/null; then
    ok "Claude Code installed"
  else
    fail "Claude Code not found"
    MISSING+=("Claude Code: https://docs.anthropic.com/en/docs/claude-code")
  fi

  # gws CLI
  if command -v gws &>/dev/null; then
    ok "gws CLI installed"
  else
    fail "gws CLI not found"
    MISSING+=("gws CLI: see docs/getting-started/SETUP-GUIDE.md")
  fi

  if [ ${#MISSING[@]} -gt 0 ]; then
    echo ""
    fail "Missing prerequisites:"
    for item in "${MISSING[@]}"; do
      echo "     - $item"
    done
    echo ""
    echo "Install the missing tools and re-run ./install.sh"
    exit 1
  fi

  ok "All prerequisites met"
fi
```

- [ ] **Step 2: Verify syntax**

Run: `bash -n install.sh`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add install.sh
git commit -m "feat: install.sh Phase 1 — prerequisites check"
```

---

### Task 6: `install.sh` — Phase 2 (Environment Setup)

**Files:**
- Modify: `install.sh`

- [ ] **Step 1: Add Phase 2 after Phase 1**

Append to `install.sh`:

```bash
# ── Phase 2: Environment Setup ──────────────────────────────────
if ! $VERIFY_ONLY; then
  header "Phase 2: Setting up environment..."

  # Check for .env
  if [ ! -f "$SCRIPT_DIR/.env" ]; then
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    warn "Created .env from template. Please edit it with your API keys."
    echo ""
    echo "     nano .env    # or use your preferred editor"
    echo ""
    echo "Then re-run: ./install.sh"
    exit 0
  fi

  # Load .env
  set -a
  source "$SCRIPT_DIR/.env"
  set +a

  # Validate NOTION_API_KEY
  if [ -z "${NOTION_API_KEY:-}" ] || [ "$NOTION_API_KEY" = "ntn_your_token_here" ]; then
    echo ""
    warn "NOTION_API_KEY is not set or still has the placeholder value."
    read -rp "  Enter your Notion API key (starts with ntn_): " NOTION_API_KEY
    if [ -z "$NOTION_API_KEY" ]; then
      fail "Notion API key is required. Get one at https://www.notion.so/my-integrations"
      exit 1
    fi
    # Update .env with the provided key
    if grep -q "^NOTION_API_KEY=" "$SCRIPT_DIR/.env"; then
      sed -i '.bak' "s|^NOTION_API_KEY=.*|NOTION_API_KEY=$NOTION_API_KEY|" "$SCRIPT_DIR/.env"
      rm -f "$SCRIPT_DIR/.env.bak"
    else
      echo "NOTION_API_KEY=$NOTION_API_KEY" >> "$SCRIPT_DIR/.env"
    fi
  fi

  # Validate Notion key against API
  info "Validating Notion API key..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $NOTION_API_KEY" \
    -H "Notion-Version: 2022-06-28" \
    "https://api.notion.com/v1/users/me")

  if [ "$HTTP_STATUS" = "200" ]; then
    ok "Notion API key is valid"
  else
    fail "Notion API key validation failed (HTTP $HTTP_STATUS)"
    echo "     Check that your key starts with 'ntn_' and has the correct capabilities."
    echo "     See docs/getting-started/TROUBLESHOOTING.md for help."
    exit 1
  fi

  # Create WORKSPACE_DIR
  WORKSPACE_DIR="${WORKSPACE_DIR:-$HOME/founder-os-workspace}"
  if [ ! -d "$WORKSPACE_DIR" ]; then
    mkdir -p "$WORKSPACE_DIR"
    ok "Created workspace directory: $WORKSPACE_DIR"
  else
    ok "Workspace directory exists: $WORKSPACE_DIR"
  fi

  # Validate SLACK_BOT_TOKEN if provided
  # Note: Slack API always returns HTTP 200; check the JSON "ok" field instead
  if [ -n "${SLACK_BOT_TOKEN:-}" ]; then
    SLACK_RESP=$(curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" "https://slack.com/api/auth.test")
    if echo "$SLACK_RESP" | python3 -c "import json,sys; assert json.load(sys.stdin).get('ok')" 2>/dev/null; then
      ok "Slack bot token is valid"
    else
      warn "Slack bot token validation failed — skipping Slack setup"
    fi
  else
    info "Slack bot token not provided — Slack features will be unavailable (optional)"
  fi

  ok "Environment ready"
fi
```

- [ ] **Step 2: Verify syntax**

Run: `bash -n install.sh`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add install.sh
git commit -m "feat: install.sh Phase 2 — environment setup and API validation"
```

---

### Task 7: `install.sh` — Phase 3 (Google Authentication)

**Files:**
- Modify: `install.sh`

- [ ] **Step 1: Add Phase 3**

Append to `install.sh`:

```bash
# ── Phase 3: Google Authentication ──────────────────────────────
if ! $VERIFY_ONLY; then
  header "Phase 3: Google authentication (gws CLI)..."

  # Check if already authenticated
  if gws auth status &>/dev/null; then
    ok "gws CLI already authenticated"
  else
    info "Opening browser for Google authentication..."
    echo "     Sign in with your Google account and approve Gmail, Calendar, and Drive access."
    echo ""

    if ! gws auth login; then
      fail "Google authentication failed."
      echo "     Try: gws auth login --no-browser"
      echo "     See docs/getting-started/TROUBLESHOOTING.md for help."
      exit 1
    fi

    ok "Google authentication successful"
  fi

  # Quick validation
  if gws gmail list --limit=1 &>/dev/null; then
    ok "Gmail access confirmed"
  else
    warn "Could not verify Gmail access — some features may not work"
  fi
fi
```

- [ ] **Step 2: Verify syntax**

Run: `bash -n install.sh`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add install.sh
git commit -m "feat: install.sh Phase 3 — Google authentication via gws CLI"
```

---

### Task 8: `install.sh` — Phase 4 (Plugin Installation)

**Files:**
- Modify: `install.sh`

- [ ] **Step 1: Add Phase 4**

Append to `install.sh`:

```bash
# ── Phase 4: Plugin Installation ────────────────────────────────
if ! $VERIFY_ONLY; then
  header "Phase 4: Installing plugins..."

  # Create project-level plugins directory
  mkdir -p "$PLUGINS_DIR"

  # Symlink all founder-os-* plugin directories
  PLUGIN_COUNT=0
  SKIP_COUNT=0
  for plugin_dir in "$SCRIPT_DIR"/founder-os-*/; do
    if [ -d "$plugin_dir/.claude-plugin" ]; then
      plugin_name=$(basename "$plugin_dir")
      target="$PLUGINS_DIR/$plugin_name"
      if [ -L "$target" ]; then
        SKIP_COUNT=$((SKIP_COUNT + 1))
      else
        ln -sf "$plugin_dir" "$target"
        PLUGIN_COUNT=$((PLUGIN_COUNT + 1))
      fi
    fi
  done

  if [ $PLUGIN_COUNT -gt 0 ]; then
    ok "Symlinked $PLUGIN_COUNT plugins to .claude/plugins/"
  fi
  if [ $SKIP_COUNT -gt 0 ]; then
    info "Skipped $SKIP_COUNT already-linked plugins"
  fi

  # Fix P01 Inbox Zero missing .mcp.json
  P01_DIR="$SCRIPT_DIR/founder-os-inbox-zero"
  if [ -d "$P01_DIR" ] && [ ! -f "$P01_DIR/.mcp.json" ]; then
    cat > "$P01_DIR/.mcp.json" <<'MCPEOF'
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "${NOTION_API_KEY}"
      }
    }
  }
}
MCPEOF
    ok "Created missing .mcp.json for P01 Inbox Zero"
  fi

  # Merge Notion + Filesystem into project-level .mcp.json
  info "Updating project .mcp.json..."
  if command -v python3 &>/dev/null; then
    python3 -c "
import json, os

mcp_path = '$SCRIPT_DIR/.mcp.json'

# Read existing config
config = {'mcpServers': {}}
if os.path.exists(mcp_path):
    with open(mcp_path, 'r') as f:
        config = json.load(f)

servers = config.setdefault('mcpServers', {})

# Add Notion if not present
if 'notion' not in servers:
    servers['notion'] = {
        'command': 'npx',
        'args': ['-y', '@modelcontextprotocol/server-notion'],
        'env': {
            'NOTION_API_KEY': '\${NOTION_API_KEY}'
        }
    }

# Add Filesystem if not present
if 'filesystem' not in servers:
    servers['filesystem'] = {
        'command': 'npx',
        'args': ['-y', '@modelcontextprotocol/server-filesystem', '\${WORKSPACE_DIR}'],
        'env': {}
    }

with open(mcp_path, 'w') as f:
    json.dump(config, f, indent=2)
    f.write('\n')

print('done')
" && ok "Merged Notion + Filesystem into .mcp.json (preserved existing entries)" \
  || { fail "Could not update .mcp.json"; exit 1; }
  else
    fail "python3 is required for .mcp.json merging"
    exit 1
  fi

  ok "Plugin installation complete"
fi
```

- [ ] **Step 2: Verify syntax**

Run: `bash -n install.sh`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add install.sh
git commit -m "feat: install.sh Phase 4 — plugin symlinks and MCP config merge"
```

---

### Task 9: `install.sh` — Phase 5 (Notion HQ) and Phase 6 (Verification)

**Files:**
- Modify: `install.sh`

- [ ] **Step 1: Add Phase 5 and Phase 6**

Append to `install.sh`:

```bash
# ── Phase 5: Notion HQ Setup ────────────────────────────────────
if ! $VERIFY_ONLY && ! $SKIP_NOTION; then
  header "Phase 5: Setting up Notion HQ databases..."

  # Check if databases already exist
  EXISTING_DBS=$(curl -s \
    -H "Authorization: Bearer $NOTION_API_KEY" \
    -H "Notion-Version: 2022-06-28" \
    -X POST "https://api.notion.com/v1/search" \
    -H "Content-Type: application/json" \
    -d '{"query": "[FOS]", "filter": {"property": "object", "value": "database"}}' \
    | python3 -c "import json,sys; data=json.load(sys.stdin); print(len(data.get('results',[])))" 2>/dev/null || echo "0")

  if [ "$EXISTING_DBS" -ge 22 ]; then
    ok "Notion HQ databases already exist ($EXISTING_DBS found)"
  else
    info "Found $EXISTING_DBS existing databases. Setting up remaining..."

    # Try invoking Claude Code to run /setup:notion-hq
    if command -v claude &>/dev/null; then
      info "Running /setup:notion-hq via Claude Code (this may take a few minutes)..."
      if claude -p "Run /setup:notion-hq to create all Founder OS HQ Notion databases. Use the notion-hq-setup skill. Read the manifest at _infrastructure/notion-db-templates/founder-os-hq-manifest.json and create any missing databases." --dangerously-skip-permissions 2>/dev/null; then
        ok "Notion HQ setup complete"
      else
        warn "Automated Notion setup did not complete successfully."
        echo ""
        echo "     Please run this manually in Claude Code:"
        echo "     ${BOLD}/setup:notion-hq${NC}"
        echo ""
        echo "     This will create the 22 Notion databases needed by Founder OS."
        echo ""
      fi
    else
      warn "Claude Code not available for automated Notion setup."
      echo ""
      echo "     Open Claude Code in this project and run: /setup:notion-hq"
      echo ""
    fi
  fi
elif $SKIP_NOTION; then
  info "Skipping Notion HQ setup (--skip-notion flag)"
fi

# ── Phase 6: Verification ───────────────────────────────────────
header "Phase 6: Verifying installation..."

PASS=0
TOTAL=0

# Load .env if not already loaded
if [ -z "${NOTION_API_KEY:-}" ] && [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

# 1. Notion connectivity
TOTAL=$((TOTAL + 1))
if [ -n "${NOTION_API_KEY:-}" ] && [ "$NOTION_API_KEY" != "ntn_your_token_here" ]; then
  NOTION_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $NOTION_API_KEY" \
    -H "Notion-Version: 2022-06-28" \
    "https://api.notion.com/v1/users/me")
  if [ "$NOTION_CHECK" = "200" ]; then
    ok "Notion API: connected"
    PASS=$((PASS + 1))
  else
    fail "Notion API: connection failed (HTTP $NOTION_CHECK)"
  fi
else
  fail "Notion API: not configured"
fi

# 2. gws connectivity
TOTAL=$((TOTAL + 1))
if command -v gws &>/dev/null && gws auth status &>/dev/null; then
  ok "gws CLI: authenticated"
  PASS=$((PASS + 1))
else
  fail "gws CLI: not authenticated"
fi

# 3. Plugin symlinks
TOTAL=$((TOTAL + 1))
LINKED=$(find "$PLUGINS_DIR" -maxdepth 1 -type l 2>/dev/null | wc -l | tr -d ' ')
if [ "$LINKED" -ge 32 ]; then
  ok "Plugins: $LINKED symlinked"
  PASS=$((PASS + 1))
elif [ "$LINKED" -gt 0 ]; then
  warn "Plugins: only $LINKED of 32+ symlinked"
else
  fail "Plugins: no symlinks found in .claude/plugins/"
fi

# 4. .mcp.json has required entries
TOTAL=$((TOTAL + 1))
if [ -f "$SCRIPT_DIR/.mcp.json" ]; then
  if python3 -c "
import json
with open('$SCRIPT_DIR/.mcp.json') as f:
    c = json.load(f)
s = c.get('mcpServers', {})
assert 'notion' in s, 'missing notion'
assert 'filesystem' in s, 'missing filesystem'
" 2>/dev/null; then
    ok "MCP config: notion + filesystem present"
    PASS=$((PASS + 1))
  else
    fail "MCP config: missing notion or filesystem entries"
  fi
else
  fail "MCP config: .mcp.json not found"
fi

# 5. Workspace directory
TOTAL=$((TOTAL + 1))
WORKSPACE_DIR="${WORKSPACE_DIR:-$HOME/founder-os-workspace}"
if [ -d "$WORKSPACE_DIR" ]; then
  ok "Workspace: $WORKSPACE_DIR exists"
  PASS=$((PASS + 1))
else
  fail "Workspace: $WORKSPACE_DIR not found"
fi

# Summary
echo ""
if [ $PASS -eq $TOTAL ]; then
  echo -e "${GREEN}${BOLD}Installation complete! $PASS/$TOTAL checks passed.${NC}"
  echo ""
  echo "  Next steps:"
  echo "    1. Open Claude Code in this directory"
  echo "    2. Try: /inbox:triage"
  echo "    3. Try: /report:generate --type=weekly"
  echo "    4. Try: /client:load --company=\"Acme Corp\""
  echo ""
  echo "  Docs: docs/getting-started/SETUP-GUIDE.md"
  echo "  FAQ:  docs/getting-started/FAQ.md"
  echo "  Help: docs/getting-started/TROUBLESHOOTING.md"
else
  echo -e "${YELLOW}${BOLD}Installation partially complete: $PASS/$TOTAL checks passed.${NC}"
  echo ""
  echo "  See docs/getting-started/TROUBLESHOOTING.md for help with failing checks."
  echo "  Re-run: ./install.sh --verify"
fi
```

- [ ] **Step 2: Verify syntax**

Run: `bash -n install.sh`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add install.sh
git commit -m "feat: install.sh Phase 5 (Notion HQ) and Phase 6 (verification)"
```

---

## Chunk 3: Setup Plugin

### Task 10: Create `founder-os-setup` plugin manifest

**Files:**
- Create: `founder-os-setup/.claude-plugin/plugin.json`
- Create: `founder-os-setup/.mcp.json`

- [ ] **Step 1: Create plugin directory structure**

```bash
mkdir -p founder-os-setup/.claude-plugin
mkdir -p founder-os-setup/commands
mkdir -p founder-os-setup/skills/notion-hq-setup
```

- [ ] **Step 2: Create plugin.json**

Write to `founder-os-setup/.claude-plugin/plugin.json`:

```json
{
  "name": "founder-os-setup",
  "version": "1.0.0",
  "description": "Installer and maintenance commands for the Founder OS ecosystem. Creates Notion HQ databases, validates integrations, and provides health checks.",
  "platform": "claude-code",
  "author": {
    "name": "Founder OS",
    "email": "contact@founderos.dev"
  },
  "display_name": "Founder OS Setup",
  "pillar": "Infrastructure",
  "plugin_number": "00",
  "type": "infrastructure",
  "difficulty": "beginner",
  "release_week": 0,
  "agent_pattern": "none",
  "capabilities": {
    "commands": true,
    "skills": true,
    "agent_teams": false
  },
  "dependencies": []
}
```

- [ ] **Step 3: Create .mcp.json**

Write to `founder-os-setup/.mcp.json`:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "${NOTION_API_KEY}"
      }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add founder-os-setup/.claude-plugin/plugin.json founder-os-setup/.mcp.json
git commit -m "feat: create founder-os-setup plugin manifest (P00)"
```

---

### Task 11: Create `/setup:notion-hq` command

**Files:**
- Create: `founder-os-setup/commands/setup-notion-hq.md`

- [ ] **Step 1: Create the command file**

Write to `founder-os-setup/commands/setup-notion-hq.md`:

````markdown
# /setup:notion-hq

Create all Founder OS HQ Notion databases programmatically.

## What It Does

Sets up the complete Notion HQ workspace with 22 interconnected databases, organized into 5 sections (CRM, Operations, Intelligence, Content & Deliverables, Growth & Meta). Uses the `notion-hq-setup` skill for database creation logic.

## Usage

```
/setup:notion-hq
```

No arguments needed. The command reads configuration from `.env` (NOTION_API_KEY) and database schemas from `_infrastructure/notion-db-templates/`.

## Instructions

1. Load the `notion-hq-setup` skill from this plugin for database creation logic and schema reference.

2. Read the manifest file at `_infrastructure/notion-db-templates/founder-os-hq-manifest.json` to get the complete list of databases and their creation order.

3. For each database in the manifest's `creation_order` array:
   a. Search Notion for an existing database named `[FOS] <display_name>` using the Notion MCP search tool.
   b. If found, report "Already exists" and skip to the next database.
   c. If not found, read the template JSON from `_infrastructure/notion-db-templates/<template_filename>.json`.
   d. Create a Notion database using `notion-create-database` with the properties from the template.
   e. Name it `[FOS] <display_name>` (e.g., `[FOS] Companies`, `[FOS] Tasks`).

4. After all databases are created, wire up relations:
   - Read the `relations` section from the manifest.
   - For each relation, use `notion-update-data-source` to add relation properties connecting databases (e.g., Tasks → Companies, Finance → Companies).

5. Create a "Founder OS HQ" top-level page as a dashboard using `notion-create-pages`.

6. Print a summary showing each database with its status (Created / Already Exists / Failed).

## Important Notes

- **Idempotent**: Safe to run multiple times. Skips existing databases.
- **Partial recovery**: If interrupted, re-running creates only missing databases.
- **Prerequisite**: `NOTION_API_KEY` must be set in `.env` and the Notion integration must have full capabilities (Read, Update, Insert content).
- **Rate limits**: Notion API allows ~3 requests/second. The command naturally paces itself but may take 2-3 minutes for a full setup.
````

- [ ] **Step 2: Commit**

```bash
git add founder-os-setup/commands/setup-notion-hq.md
git commit -m "feat: /setup:notion-hq command for automated Notion HQ setup"
```

---

### Task 12: Create `notion-hq-setup` skill

**Files:**
- Create: `founder-os-setup/skills/notion-hq-setup/SKILL.md`

- [ ] **Step 1: Create the skill file**

Write to `founder-os-setup/skills/notion-hq-setup/SKILL.md`:

````markdown
# Notion HQ Setup Skill

Domain knowledge for creating and managing the Founder OS HQ Notion workspace.

## Database Architecture

The Founder OS HQ consists of 22 databases organized into 5 sections. CRM Companies is the central hub — all client-facing databases relate back to it.

### Sections and Databases

| Section | Databases | Template Files |
|---------|-----------|----------------|
| CRM | Companies, Contacts, Deals, Communications | `hq-companies.json`, `hq-contacts.json`, `hq-deals.json`, `crm-sync-hub-communications.json` |
| Operations | Tasks, Meetings, Finance | `hq-tasks.json`, `hq-meetings.json`, `hq-finance.json` |
| Intelligence | Briefings, Knowledge Base, Research, Reports | `hq-briefings.json`, `hq-knowledge-base.json`, `hq-research.json`, `hq-reports.json` |
| Content & Deliverables | Content, Deliverables, Prompts | `hq-content.json`, `hq-deliverables.json`, `team-prompt-library-prompts.json` |
| Growth & Meta | Goals, Milestones, Learnings, Weekly Insights, Workflows, Activity Log, Memory, Intelligence | `goal-progress-tracker-goals.json`, `goal-progress-tracker-milestones.json`, `learning-log-tracker-learnings.json`, `learning-log-tracker-weekly-insights.json`, `hq-workflows.json`, `google-drive-brain-activity.json`, `hq-memory.json`, `hq-intelligence.json` |

### Database Naming Convention

All databases created by this skill use the `[FOS]` prefix:
- `[FOS] Companies`
- `[FOS] Tasks`
- `[FOS] Briefings`
- etc.

This prefix is used for discovery by all 32 plugins. The 3-step discovery pattern in plugins searches for:
1. `[FOS] <Name>` (primary — created by this skill)
2. `Founder OS HQ - <Name>` (legacy consolidated name)
3. Plugin-specific name (e.g., `Inbox Zero - Action Items`)

### Creation Order

Databases must be created in dependency order because relations reference other databases:

1. **Companies** (hub — no dependencies)
2. **Contacts** (relates to Companies)
3. **Deals** (relates to Companies, Contacts)
4. **Communications** (relates to Companies, Contacts)
5. **Tasks** (relates to Companies, Contacts)
6. **Meetings** (relates to Companies, Contacts)
7. **Finance** (relates to Companies)
8. **Briefings** (no required relations)
9. **Knowledge Base** (no required relations)
10. **Research** (relates to Companies)
11. **Reports** (relates to Companies)
12. **Content** (relates to Companies)
13. **Deliverables** (relates to Companies, Deals)
14. **Prompts** (no required relations)
15. **Goals** (no required relations)
16. **Milestones** (relates to Goals)
17. **Learnings** (no required relations)
18. **Weekly Insights** (no required relations)
19. **Workflows** (no required relations)
20. **Activity Log** (no required relations)
21. **Memory** (no required relations)
22. **Intelligence** (no required relations)

### Consolidated Database Type Values

Several databases merge data from multiple plugins. The `Type` column distinguishes records:

| Database | Type Values |
|----------|-------------|
| Tasks | Email Task, Action Item, Follow-Up |
| Meetings | (no type — shared Event ID distinguishes Prep vs Analysis) |
| Finance | Invoice, Expense |
| Briefings | Daily Briefing, Weekly Review, Slack Digest, Morning Sync |
| Knowledge Base | Source, Query |
| Research | Newsletter Research, Competitive Analysis |
| Reports | Business Report, Expense Report, ROI Report |
| Content | Email Draft, Newsletter, LinkedIn Post |
| Deliverables | Proposal, Contract, SOW |
| Workflows | Execution, SOP |

### Template File Format

Each template JSON in `_infrastructure/notion-db-templates/` follows this structure:

```json
{
  "name": "Display Name",
  "description": "Purpose of this database",
  "properties": {
    "Name": { "title": {} },
    "Status": {
      "select": {
        "options": [
          { "name": "To Do", "color": "gray" },
          { "name": "In Progress", "color": "blue" },
          { "name": "Done", "color": "green" }
        ]
      }
    },
    "Company": {
      "relation": {
        "database_id": "{{companies_db_id}}",
        "single_property": {}
      }
    }
  }
}
```

The `{{companies_db_id}}` placeholder is replaced at runtime with the actual database ID after creation.

### Idempotency Rules

1. Before creating any database, search for `[FOS] <display_name>`.
2. If found, log "Already exists" and record its ID for relation wiring.
3. If not found, create it and record the new ID.
4. After all databases exist, wire relations using the collected IDs.
5. If a relation already exists on a database, skip it.

### Error Handling

- If a database creation fails, log the error and continue with the next database.
- At the end, report all failures so the user can re-run (idempotent recovery).
- Notion rate limit: if receiving 429 responses, wait 1 second and retry up to 3 times.

### Manifest Reference

The source of truth for database names, template filenames, and creation order is:
`_infrastructure/notion-db-templates/founder-os-hq-manifest.json`

Always read this file at runtime rather than hardcoding the database list.
````

- [ ] **Step 2: Commit**

```bash
git add founder-os-setup/skills/notion-hq-setup/SKILL.md
git commit -m "feat: notion-hq-setup skill with database architecture reference"
```

---

### Task 13: Create `/setup:verify` command

**Files:**
- Create: `founder-os-setup/commands/setup-verify.md`

- [ ] **Step 1: Create the command file**

Write to `founder-os-setup/commands/setup-verify.md`:

````markdown
# /setup:verify

Run health checks on the Founder OS installation.

## Usage

```
/setup:verify
```

## Instructions

Run each check below and report results as a table with Pass/Fail status.

### 1. Notion Connectivity

- Search Notion for databases with `[FOS]` prefix using the Notion MCP search tool.
- Count how many of the 22 expected databases exist.
- List any missing databases by name.

### 2. gws CLI Authentication

- Run `gws auth status` via bash to check Google authentication.
- If authenticated, run `gws gmail list --limit=1` to confirm Gmail access.
- Run `gws calendar list --limit=1` to confirm Calendar access.

### 3. Plugin Symlinks

- Check that `.claude/plugins/` directory exists in the project root.
- Count symlinks pointing to `founder-os-*` directories.
- Report any broken symlinks.

### 4. MCP Configuration

- Read `.mcp.json` in the project root.
- Verify `notion` server entry exists with `NOTION_API_KEY` env var.
- Verify `filesystem` server entry exists with `WORKSPACE_DIR` path.

### 5. Environment Variables

- Check that `.env` file exists.
- Verify `NOTION_API_KEY` is set and not a placeholder.
- Verify `WORKSPACE_DIR` is set and the directory exists.
- Report optional vars (SLACK_BOT_TOKEN, WEB_SEARCH_API_KEY) as configured/not configured.

### Output Format

```
Founder OS Health Check
=======================

| Check              | Status | Details                    |
|--------------------|--------|----------------------------|
| Notion API         | ✓ Pass | Connected, 22/22 databases |
| gws CLI            | ✓ Pass | Gmail + Calendar confirmed |
| Plugin Symlinks    | ✓ Pass | 33 plugins linked          |
| MCP Config         | ✓ Pass | notion + filesystem        |
| Environment        | ✓ Pass | All required vars set      |
| Slack (optional)   | — Skip | Token not configured       |

Result: 5/5 required checks passed
```
````

- [ ] **Step 2: Commit**

```bash
git add founder-os-setup/commands/setup-verify.md
git commit -m "feat: /setup:verify command for installation health checks"
```

---

### Task 14: Create setup plugin README and INSTALL.md

**Files:**
- Create: `founder-os-setup/README.md`
- Create: `founder-os-setup/INSTALL.md`

- [ ] **Step 1: Create README.md**

Write to `founder-os-setup/README.md`:

```markdown
# Founder OS Setup (P00)

Infrastructure plugin providing installation and maintenance commands for the Founder OS ecosystem.

## Commands

| Command | Description |
|---------|-------------|
| `/setup:notion-hq` | Create all 22 Notion HQ databases automatically |
| `/setup:verify` | Run health checks on the installation |

## When to Use

- **First install**: Run `./install.sh` from the repo root — it handles everything including invoking `/setup:notion-hq`.
- **Manual Notion setup**: If the installer's automated Notion step fails, run `/setup:notion-hq` directly in Claude Code.
- **Health check**: Run `/setup:verify` anytime to check integration status.
- **After updates**: Run `git pull && ./install.sh` to pick up changes.

## Prerequisites

- Notion API key configured in `.env`
- Notion integration with Read, Update, Insert capabilities
```

- [ ] **Step 2: Create INSTALL.md**

Write to `founder-os-setup/INSTALL.md`:

```markdown
# Installing Founder OS Setup Plugin

This plugin is installed automatically by `./install.sh`. No manual setup needed.

## Prerequisites

- Claude Code installed
- Node.js 18+
- `.env` file with `NOTION_API_KEY` configured

## Manual Installation

If not using the installer:

1. Symlink this plugin:
   ```bash
   mkdir -p .claude/plugins
   ln -sf "$(pwd)/founder-os-setup" .claude/plugins/founder-os-setup
   ```

2. Ensure `.mcp.json` in project root has a Notion server entry. See `.mcp.json.example` for reference.

## Verification

Run `/setup:verify` in Claude Code to confirm everything is working.
```

- [ ] **Step 3: Commit**

```bash
git add founder-os-setup/README.md founder-os-setup/INSTALL.md
git commit -m "feat: setup plugin README and INSTALL docs"
```

---

## Chunk 4: User Documentation

### Task 15: Create SETUP-GUIDE.md

**Files:**
- Create: `docs/getting-started/SETUP-GUIDE.md`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p docs/getting-started
```

Write to `docs/getting-started/SETUP-GUIDE.md`:

````markdown
# Founder OS Setup Guide

This guide walks you through installing and configuring Founder OS — a 32-plugin AI automation ecosystem for SMB founders, built on Claude Code.

## What You're Installing

- **32 AI plugins** organized into 4 pillars (Daily Work, Code Without Coding, MCP & Integrations, Meta & Growth)
- **22 Notion databases** (CRM, tasks, meetings, reports, and more — all interconnected)
- **MCP server connections** (Notion, Filesystem)
- **Google Workspace access** via gws CLI (Gmail, Calendar, Drive)

## Prerequisites

Install these before running the Founder OS installer:

### 1. Claude Code

The AI coding assistant that runs Founder OS plugins.

Install: https://docs.anthropic.com/en/docs/claude-code

Verify:
```bash
claude --version
```

### 2. Node.js 18+

Required for MCP servers (Notion, Filesystem).

Install: https://nodejs.org/ (LTS recommended)

Verify:
```bash
node --version   # Should be v18.x or higher
npx --version    # Should be available
```

### 3. gws CLI

Command-line tool for Gmail, Calendar, and Drive access. Used by 20+ plugins for email, scheduling, and document operations.

Install: Follow the gws CLI installation instructions for your platform.

Verify:
```bash
gws --version
```

## Getting Your API Keys

### Notion API Key (Required)

Your Notion key allows Founder OS to read and write to your Notion workspace.

1. Go to https://www.notion.so/my-integrations
2. Click **"+ New integration"**
3. Name it **"Founder OS"**
4. Under **Capabilities**, ensure these are enabled:
   - Read content
   - Update content
   - Insert content
5. Click **"Submit"**
6. Copy the **"Internal Integration Secret"** (starts with `ntn_`)
7. Save this — you'll paste it into `.env` in the next section

### Google Account (Required)

The gws CLI handles Google authentication. No API key needed — just your Google account.

During installation, the script runs `gws auth login` which:
1. Opens your browser
2. Asks you to sign in with your Google account
3. Requests access to Gmail, Calendar, and Drive
4. Confirms authentication in the terminal

You only need to do this once. The token is stored locally.

### Slack Bot Token (Optional)

Only needed for P19 Slack Digest. Skip this if you don't use Slack.

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name it **"Founder OS"**, select your workspace
4. Go to **OAuth & Permissions** → **Bot Token Scopes** and add:
   - `channels:history`
   - `channels:read`
   - `users:read`
5. Click **"Install to Workspace"** and approve
6. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)

### Web Search API Key (Optional)

Only needed for P08 Newsletter Engine and P15 Competitive Intel. Skip if not using these plugins.

## Installation

### Step 1: Clone the repository

```bash
git clone https://github.com/[org]/founderOS.git
cd founderOS
```

### Step 2: Configure your environment

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in:
- `NOTION_API_KEY` — paste your Notion integration secret
- `WORKSPACE_DIR` — directory for file operations (default: `~/founder-os-workspace`)
- `SLACK_BOT_TOKEN` — (optional) paste your Slack bot token
- `WEB_SEARCH_API_KEY` — (optional) paste your search API key

### Step 3: Run the installer

```bash
./install.sh
```

The installer runs 6 phases:

| Phase | What It Does |
|-------|-------------|
| 1. Prerequisites | Checks Node.js, npx, Claude Code, gws CLI |
| 2. Environment | Loads `.env`, validates API keys against live APIs |
| 3. Google Auth | Runs `gws auth login` if not already authenticated |
| 4. Plugins | Symlinks 32 plugins into `.claude/plugins/`, configures MCP |
| 5. Notion HQ | Creates 22 databases in your Notion workspace |
| 6. Verification | Tests all connections and reports results |

## After Installation

### First Commands to Try

Open Claude Code in the `founderOS` directory and try:

```
/inbox:triage                          # Triage your inbox
/report:generate --type=weekly         # Generate a weekly report
/client:load --company="Acme Corp"     # Load client context
/setup:verify                          # Check installation health
```

### Updating Founder OS

Pull the latest changes and re-run the installer (safe — it skips completed steps):

```bash
git pull
./install.sh
```

### Installer Flags

| Flag | Purpose |
|------|---------|
| `--verify` | Run only the verification phase |
| `--skip-notion` | Skip Notion database setup |
| `--reset` | Remove symlinks and MCP entries (clean slate) |
| `--help` | Show usage information |
````

- [ ] **Step 2: Commit**

```bash
git add docs/getting-started/SETUP-GUIDE.md
git commit -m "feat: comprehensive setup guide with API key instructions"
```

---

### Task 16: Create FAQ.md

**Files:**
- Create: `docs/getting-started/FAQ.md`

- [ ] **Step 1: Create the file**

Write to `docs/getting-started/FAQ.md`:

```markdown
# Founder OS — Frequently Asked Questions

## General

### Do I need all 32 plugins?

All 32 plugins are installed together (they share infrastructure), but you only use the ones you need. Unused plugins have zero overhead — they're just symlinked directories that Claude Code discovers on demand.

### What does Founder OS cost?

Founder OS itself is free and open source. You need:
- A Claude Code subscription (for the AI)
- A Notion account (free tier works, but Pro recommended for API limits)
- A Google Workspace or personal Gmail account (free)

### Is my data sent anywhere?

No. Everything runs locally on your machine. API calls go directly from your computer to Notion, Google, and Slack — Founder OS never routes your data through third-party servers.

### Can I use this with a team?

Yes. Each team member clones the repo and runs the installer with their own API keys. Everyone gets their own Notion HQ databases and Google authentication. Shared data happens through your existing Notion workspace.

## Setup

### Can I use Founder OS without Notion?

Partially. Notion is the backbone for 21 of 32 plugins. Without it, you can still use file-based plugins like Report Generator, Contract Analyzer, and LinkedIn Post Generator. Run `./install.sh --skip-notion` to install without Notion.

### What Google permissions does gws need?

- **Gmail**: Read and send emails (for inbox triage, follow-up tracking)
- **Calendar**: Read and create events (for meeting prep, daily briefing)
- **Google Drive**: Read and upload files (for document search, report storage)

You can revoke access anytime at https://myaccount.google.com/permissions.

### Can I change the workspace directory after installation?

Yes. Update `WORKSPACE_DIR` in `.env` and re-run `./install.sh`. The installer updates the MCP configuration automatically.

### The installer failed midway — is it safe to re-run?

Yes. The installer is idempotent — it detects what's already done and skips completed steps. Re-running is always safe.

## Plugins

### Can I add custom plugins?

Yes. Create a new directory following the plugin format (see `_templates/plugin-scaffold/`), add a `.claude-plugin/plugin.json` manifest, and symlink it into `.claude/plugins/`.

### How do I disable a specific plugin?

Remove its symlink from `.claude/plugins/`:
```bash
rm .claude/plugins/founder-os-[plugin-name]
```

Re-running `./install.sh` will re-link it. To permanently exclude a plugin, remove it before running the installer or delete its symlink after.

### What are the four pillars?

| Pillar | Focus | Plugins |
|--------|-------|---------|
| Daily Work | Email, meetings, reviews | #01-#08 |
| Code Without Coding | Reports, invoices, contracts | #09-#16 |
| MCP & Integrations | Notion, Drive, Slack, CRM | #17-#24 |
| Meta & Growth | ROI, workflows, templates | #25-#30 |

## Updating

### How do I update Founder OS?

```bash
git pull
./install.sh
```

The installer picks up new plugins, updated configurations, and any new Notion databases.

### What about my existing Notion databases?

If you had older plugin-specific Notion databases (before the HQ consolidation), they're preserved. Plugins search for HQ databases first, then fall back to legacy names. See `_infrastructure/notion-hq/MIGRATION.md` for details.

## Troubleshooting

### Where do I get help?

1. Check `docs/getting-started/TROUBLESHOOTING.md` for common issues
2. Run `./install.sh --verify` to diagnose problems
3. Run `/setup:verify` inside Claude Code for detailed checks
```

- [ ] **Step 2: Commit**

```bash
git add docs/getting-started/FAQ.md
git commit -m "feat: FAQ covering setup, plugins, updates, and troubleshooting"
```

---

### Task 17: Create TROUBLESHOOTING.md

**Files:**
- Create: `docs/getting-started/TROUBLESHOOTING.md`

- [ ] **Step 1: Create the file**

Write to `docs/getting-started/TROUBLESHOOTING.md`:

````markdown
# Founder OS — Troubleshooting Guide

Each entry follows: **Symptom → Cause → Fix → Verify**

## Installation Issues

### "Permission denied" when running install.sh

**Symptom:** `bash: ./install.sh: Permission denied`

**Cause:** The script doesn't have execute permissions.

**Fix:**
```bash
chmod +x install.sh
./install.sh
```

**Verify:** Script starts running and shows "Phase 1: Checking prerequisites..."

---

### "Node.js not found" or "need v18+"

**Symptom:** Phase 1 fails with Node.js error.

**Cause:** Node.js is not installed or is an older version.

**Fix:**
1. Install Node.js 18+ from https://nodejs.org/ (LTS recommended)
2. If installed via nvm: `nvm install 18 && nvm use 18`
3. Restart your terminal

**Verify:** `node --version` shows v18.x or higher.

---

### "npx not found"

**Symptom:** Phase 1 fails with npx error.

**Cause:** npx comes bundled with Node.js. If missing, Node.js may be partially installed.

**Fix:** Reinstall Node.js from https://nodejs.org/

**Verify:** `npx --version` outputs a version number.

---

### "Claude Code not found"

**Symptom:** Phase 1 fails with Claude Code error.

**Cause:** Claude Code CLI is not installed or not in PATH.

**Fix:** Install Claude Code following https://docs.anthropic.com/en/docs/claude-code

**Verify:** `claude --version` outputs a version number.

---

### "gws CLI not found"

**Symptom:** Phase 1 fails with gws error.

**Cause:** The gws CLI tool is not installed.

**Fix:** Follow gws CLI installation instructions for your platform.

**Verify:** `gws --version` outputs a version number.

---

## Notion Issues

### "Notion API key validation failed"

**Symptom:** Phase 2 fails with HTTP 401 or 403.

**Cause:** The API key is invalid, expired, or missing capabilities.

**Fix:**
1. Verify your key starts with `ntn_`
2. Go to https://www.notion.so/my-integrations
3. Click on your "Founder OS" integration
4. Check that all capabilities are enabled (Read, Update, Insert content)
5. If the key looks wrong, create a new integration and update `.env`

**Verify:** Re-run `./install.sh` — Phase 2 should show "Notion API key is valid".

---

### "Database not found" or missing databases

**Symptom:** `/setup:verify` shows fewer than 22 databases, or plugins report "database not found".

**Cause:** Notion HQ setup didn't complete, or the integration doesn't have access.

**Fix:**
1. Run `/setup:notion-hq` in Claude Code (creates missing databases)
2. If databases exist but aren't found: open the Founder OS HQ page in Notion → Click **...** → **Connections** → Ensure your integration is connected

**Verify:** Run `/setup:verify` — should show 22/22 databases.

---

### Notion rate limiting

**Symptom:** Database creation fails with "rate limited" or HTTP 429 errors.

**Cause:** Notion API allows ~3 requests/second. Batch operations can exceed this.

**Fix:** Wait 60 seconds and re-run `/setup:notion-hq`. It's idempotent — it picks up where it left off.

**Verify:** Run `/setup:verify` — should show 22/22 databases.

---

## Google (gws) Issues

### "Google authentication failed"

**Symptom:** Phase 3 fails after `gws auth login`.

**Cause:** Browser didn't open, wrong account selected, or scopes not approved.

**Fix:**
1. Try headless auth: `gws auth login --no-browser` (gives you a URL to paste)
2. Make sure you approve Gmail, Calendar, AND Drive access
3. Use the correct Google account (the one with your work email)

**Verify:** `gws auth status` shows authenticated. `gws gmail list --limit=1` returns a result.

---

### "Could not verify Gmail access"

**Symptom:** Phase 3 warning about Gmail access.

**Cause:** Gmail API access wasn't granted, or the account has no emails.

**Fix:**
1. Re-run `gws auth login` and ensure Gmail scope is approved
2. Check Google API console for any restrictions on your account

**Verify:** `gws gmail list --limit=1` returns at least one email.

---

## Plugin Issues

### Plugins not showing in Claude Code

**Symptom:** Slash commands like `/inbox:triage` aren't recognized.

**Cause:** Symlinks are missing or Claude Code needs a restart.

**Fix:**
1. Check symlinks exist: `ls -la .claude/plugins/`
2. If empty, re-run `./install.sh`
3. Restart Claude Code (close and reopen)

**Verify:** Open Claude Code and type `/inbox:` — autocomplete should show available commands.

---

### "MCP server connection failed"

**Symptom:** Plugin commands fail with MCP connection errors.

**Cause:** `.mcp.json` is missing server entries, or environment variables aren't set.

**Fix:**
1. Check `.mcp.json` has `notion` and `filesystem` entries: `cat .mcp.json`
2. Verify `.env` has `NOTION_API_KEY` and `WORKSPACE_DIR` set
3. Re-run `./install.sh` to regenerate MCP config

**Verify:** Run `/setup:verify` — MCP Config check should pass.

---

### Broken symlinks after moving the repository

**Symptom:** Plugins stop working after moving the founderOS directory.

**Cause:** Symlinks use absolute paths that break when the repo moves.

**Fix:**
```bash
./install.sh --reset
./install.sh
```

**Verify:** `ls -la .claude/plugins/` shows valid symlinks pointing to the new location.

---

## Environment Issues

### ".env file not found" on re-run

**Symptom:** Installer creates a new `.env` from template and exits.

**Cause:** `.env` file was deleted or never created.

**Fix:** The installer automatically creates `.env` from `.env.example`. Edit it with your API keys and re-run.

**Verify:** `cat .env` shows your actual API keys (not placeholder values).

---

### Workspace directory permission errors

**Symptom:** File-based plugins (Report Generator, Contract Analyzer) fail to write output.

**Cause:** `WORKSPACE_DIR` doesn't exist or has wrong permissions.

**Fix:**
```bash
mkdir -p ~/founder-os-workspace
chmod 755 ~/founder-os-workspace
```

**Verify:** `ls -la ~/founder-os-workspace` shows the directory with write permissions.
````

- [ ] **Step 2: Commit**

```bash
git add docs/getting-started/TROUBLESHOOTING.md
git commit -m "feat: troubleshooting guide covering all installation failure scenarios"
```

---

## Chunk 5: Final Integration

### Task 18: Verify full installation flow

- [ ] **Step 1: Verify all files exist**

Run:
```bash
ls -la install.sh .env.example .mcp.json.example .gitignore.dist README.dist.md
ls -la scripts/release.sh scripts/generate-user-claude-md.sh
ls -la founder-os-setup/.claude-plugin/plugin.json
ls -la founder-os-setup/commands/setup-notion-hq.md
ls -la founder-os-setup/commands/setup-verify.md
ls -la founder-os-setup/skills/notion-hq-setup/SKILL.md
ls -la founder-os-setup/README.md
ls -la founder-os-setup/INSTALL.md
ls -la docs/getting-started/SETUP-GUIDE.md
ls -la docs/getting-started/FAQ.md
ls -la docs/getting-started/TROUBLESHOOTING.md
```

Expected: All files exist, `install.sh` and scripts have execute permission.

- [ ] **Step 2: Verify install.sh parses cleanly**

Run: `bash -n install.sh`
Expected: No output (clean parse).

- [ ] **Step 3: Test --help flag**

Run: `./install.sh --help`
Expected: Shows usage information with all flags.

- [ ] **Step 4: Dry-run prerequisites check**

Run: `./install.sh` (let it check prerequisites — it will stop at Phase 1 if anything is missing, or continue through the phases)

Expected: Phase 1 passes with green checkmarks for all prerequisites.

- [ ] **Step 5: Test release script**

Create a temporary dist repo and run the release:
```bash
mkdir -p /tmp/founder-os-test && cd /tmp/founder-os-test && git init
cd <dev-repo>
./scripts/release.sh --dist-dir /tmp/founder-os-test
```

Verify:
- All 32 plugin dirs present (plus founder-os-setup)
- `_infrastructure/` present without `deprecated/`
- `docs/getting-started/` present
- No dev-only dirs (`docs/superpowers/`, `_templates/`, `social/`, `.beads/`, `.swarm/`)
- `CLAUDE.md` is user-facing version (no beads references)
- `install.sh` is executable

Clean up: `rm -rf /tmp/founder-os-test`

- [ ] **Step 6: Final commit with all verification**

```bash
git add -A
git status  # Review what's staged
git commit -m "feat: Founder OS installer — complete distribution system

One-command installer (install.sh) with:
- 6-phase setup: prerequisites, env, Google auth, plugins, Notion HQ, verification
- founder-os-setup plugin with /setup:notion-hq and /setup:verify commands
- Comprehensive docs: SETUP-GUIDE, FAQ, TROUBLESHOOTING
- .env.example, .gitignore.dist, .mcp.json.example templates
- Release script (scripts/release.sh) for dev-to-dist repo sync
- User-facing CLAUDE.md generator for clean distribution"
```
