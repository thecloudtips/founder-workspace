# [14] NPM Distribution System Design

**Date:** 2026-03-15
**Status:** Draft
**Package:** `founder-os` on npm
**Command:** `npx founder-os@latest --init`

## Problem

Founder OS is a complete Claude Code automation system. Currently, it has no distribution mechanism — the `founder-os-dist` repo is empty and the dev repo has no npm packaging. Users need a single command to install founderOS into any project directory.

## Solution

An npm package called `founder-os` that provides a CLI entry point. Running `npx founder-os@latest --init` copies all founderOS files into the current directory, creating `.founderOS/` (engine/infrastructure) and `.claude/` (commands, skills, agents). The command is idempotent — re-running it updates to the latest version while preserving user customizations.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Install mode | Standalone in `.claude/` | Native Claude Code discovery, no plugin system dependency |
| Directory split | `.founderOS/` (engine) + `.claude/` (interface) | Clean separation of infrastructure from Claude Code content |
| Dependency setup | Install-then-guide | Fast install, print next-steps checklist afterward |
| Update strategy | Idempotent re-run of `--init` | Simple mental model, manifest tracks managed files |
| Package name | `founder-os` | Matches repo name, npm-compliant |
| CLI approach | Pure file copy | No framework, no runtime dependencies |
| Plugin system | Bypassed for distribution | See "Plugin System Pivot" section |

## Plugin System Pivot

The dev repo uses `.claude-plugin/plugin.json` as a Claude Code plugin. The npm distribution **bypasses the plugin system entirely** and installs files directly into `.claude/`. Rationale:

1. **No plugin marketplace dependency** — users don't need `claude plugin marketplace add`; `npx` is universal
2. **Simpler mental model** — files are right where Claude Code reads them
3. **No `${CLAUDE_PLUGIN_ROOT}` resolution needed** — files reference each other via relative paths from `.claude/`

### Path Rewriting

The dev repo uses `${CLAUDE_PLUGIN_ROOT}` in command and skill files for portability. During the **release build step**, all occurrences of `${CLAUDE_PLUGIN_ROOT}` are rewritten:

| Dev repo path | Distributed path | Rewrite rule |
|---------------|------------------|--------------|
| `${CLAUDE_PLUGIN_ROOT}/skills/...` | `skills/...` | Strip prefix — skills are in `.claude/skills/` |
| `${CLAUDE_PLUGIN_ROOT}/commands/...` | `commands/...` | Strip prefix — commands are in `.claude/commands/` |
| `${CLAUDE_PLUGIN_ROOT}/agents/...` | `agents/...` | Strip prefix — agents are in `.claude/agents/` |
| `${CLAUDE_PLUGIN_ROOT}/_infrastructure/...` | `../../.founderOS/infrastructure/...` | Rewrite to relative path from `.claude/` to `.founderOS/` |

This rewriting happens in `release.sh` using `sed`, not at install time. The template files in the npm package already have correct paths.

## Package Structure

```
founder-os/                     # npm package root (= founder-os-dist repo)
├── package.json                # Full spec below
├── bin/
│   └── founder-os.js           # CLI entry point
├── template/
│   ├── .founderOS/             # Engine files (copied to project)
│   │   ├── version.json        # Written at install time, not bundled
│   │   ├── manifest.json       # Written at install time, not bundled
│   │   ├── config/             # User settings references
│   │   ├── scripts/            # Runtime scripts (see mapping table)
│   │   ├── infrastructure/     # Core infrastructure (see mapping table)
│   │   ├── context/            # Business context storage (empty dir)
│   │   ├── auth/               # Auth state (empty dir)
│   │   └── db/                 # SQLite, memory indexes (empty dir)
│   └── .claude/                # Claude Code interface (copied to project)
│       ├── commands/           # All command namespaces
│       ├── skills/             # All domain skills
│       ├── agents/             # All agent teams
│       ├── settings.json       # Claude Code config with MCP servers
│       └── CLAUDE.md           # Project instructions + best practices
├── CHANGELOG.md
├── LICENSE
└── README.md                   # npm page documentation
```

### package.json

```json
{
  "name": "founder-os",
  "version": "1.0.0",
  "description": "AI-powered business automation for founders — installs into any Claude Code project",
  "license": "MIT",
  "author": {
    "name": "Founder OS",
    "email": "contact@founderos.dev"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/thecloudtips/founder-os-dist.git"
  },
  "keywords": ["claude-code", "ai", "automation", "founder", "business"],
  "bin": {
    "founder-os": "bin/founder-os.js"
  },
  "files": [
    "bin/",
    "template/",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Template Mapping (Dev Repo → npm Package)

This table defines exactly what goes from the dev repo into `template/`:

| Dev repo source | Template destination | Notes |
|-----------------|---------------------|-------|
| `commands/` | `template/.claude/commands/` | All command namespaces |
| `skills/` | `template/.claude/skills/` | All domain skills |
| `agents/` | `template/.claude/agents/` | All agent team configs |
| `_infrastructure/dispatcher/` | `template/.founderOS/infrastructure/dispatcher/` | Command routing |
| `_infrastructure/memory/` | `template/.founderOS/infrastructure/memory/` | Memory engine |
| `_infrastructure/preflight/` | `template/.founderOS/infrastructure/preflight/` | Dependency validation |
| `_infrastructure/intelligence/` | `template/.founderOS/infrastructure/intelligence/` | Adaptive intelligence |
| `_infrastructure/scheduling/` | `template/.founderOS/infrastructure/scheduling/` | Recurring execution |
| `_infrastructure/context/` | `template/.founderOS/infrastructure/context/` | Business context |
| `_infrastructure/auth/` | `template/.founderOS/infrastructure/auth/` | Authentication |
| `_infrastructure/humanize-content/` | `template/.founderOS/infrastructure/humanize-content/` | Content formatting |
| `_infrastructure/scout/` | `template/.founderOS/infrastructure/scout/` | Tool discovery |
| `_infrastructure/gws-skills/` | `template/.founderOS/infrastructure/gws-skills/` | Google Workspace CLI |
| `_infrastructure/late-skills/` | `template/.founderOS/infrastructure/late-skills/` | Social media CLI |
| `_infrastructure/mcp-configs/` | `template/.founderOS/infrastructure/mcp-configs/` | MCP config examples |
| `scripts/notion-tool.mjs` | `template/.founderOS/scripts/notion-tool.mjs` | Notion CLI tool |
| `scripts/late-tool.mjs` | `template/.founderOS/scripts/late-tool.mjs` | Late.dev CLI tool |
| `scripts/package.json` | `template/.founderOS/scripts/package.json` | Script dependencies |

**Excluded from distribution (dev-only):**

| Dev repo path | Reason |
|---------------|--------|
| `_infrastructure/notion-db-templates/` | Used by setup command, references templates by content not file |
| `_infrastructure/notion-hq/` | Installation guides consumed during setup, not at runtime |
| `_infrastructure/automation-audit/` | Dev verification tool |
| `_templates/` | Dev scaffolding |
| `scripts/release.sh` | Build tool, not user-facing |
| `scripts/generate-user-claude-md.sh` | Build tool, output goes into template |
| `social/` | Blog/welcome-gift content, separate distribution |
| `docs/` | Dev documentation |
| `.claude-plugin/` | Plugin manifest not used in standalone install |

## CLI Behavior

### Commands

| Flag | Behavior |
|------|----------|
| `--init` | Install or update founderOS (main command) |
| `--version` | Print package version and installed version (if any) |
| `--status` | Show what's installed, what's outdated, what's modified |
| `--uninstall` | Remove all founderOS-managed files (respects manifest) |
| `--force` | Modifier for `--init` or `--uninstall`: overwrite modified files (creates `.bak` backups) |

### Fresh Install Flow

1. Check Node.js version >= 18; exit with error if not met
2. Check write permissions on current directory; exit with error if denied
3. Check if `.founderOS/version.json` exists — if yes, redirect to Update Flow
4. Create `.founderOS/` directory
5. Copy `template/.founderOS/` contents → `./.founderOS/`
6. Create `.claude/` directory if it doesn't exist
7. For each file in `template/.claude/`:
   - If file already exists at destination (pre-existing user file with same path):
     - **Back it up** to `<filename>.pre-founderos.bak`
     - Copy founderOS version
     - Record in manifest with status `"replaced-existing"` and backup path
   - If file doesn't exist: copy it, record in manifest as `"managed"`
8. Handle CLAUDE.md specially (see CLAUDE.md Generation section)
9. Handle settings.json specially (see settings.json Merge section)
10. Write `.founderOS/version.json` with version, timestamp
11. Write `.founderOS/manifest.json` with all file checksums
12. Print success + next steps

**Note on step 7:** Pre-existing files at founderOS paths are rare (a user would have to manually create `commands/inbox/triage.md` before installing). The backup preserves their work. On `--uninstall`, backed-up files are restored.

### Update Flow

1. Read `.founderOS/version.json` → get installed version
2. Compare with package version:
   - Same version without `--force`: print "Already up to date. Use --force to repair." and exit
   - Same version with `--force`: proceed (repair mode)
   - Different version: proceed (update mode)
3. Read `.founderOS/manifest.json`
4. For each file in the manifest:
   - Compute SHA-256 of file on disk
   - If file missing: mark as `"user-removed"` in manifest, don't recreate
   - If checksum matches manifest (unchanged): overwrite with new version, update checksum
   - If checksum differs (user-modified):
     - Without `--force`: skip, add to warnings list
     - With `--force`: create `.bak` backup, overwrite, update checksum
5. For files in new version but not in manifest (new files): copy, add to manifest
6. For files in manifest but not in new version (removed files):
   - If checksum matches (unmodified): delete file, remove from manifest
   - If checksum differs (user-modified): keep file, remove from manifest (becomes user's file)
7. Update `.founderOS/infrastructure/` wholesale (engine files are not user-modified)
8. Handle CLAUDE.md merge (preserve user content outside markers)
9. Handle settings.json merge (deep merge)
10. Update `version.json` and `manifest.json`
11. Print update summary

### Interrupted Install Recovery

The manifest is written **last** (step 11 of fresh install). If installation is interrupted:

- `.founderOS/` exists but `manifest.json` is missing
- Next `--init` run detects this state: `.founderOS/` exists but no `version.json` or `manifest.json`
- Treats this as a fresh install: re-copies all files, generates manifest from scratch
- Any partially-copied files are overwritten cleanly

### Output Examples

**Fresh install:**
```
$ npx founder-os@latest --init

  Founder OS v1.0.0

  ✓ Created .founderOS/
  ✓ Created .claude/commands/ (N namespaces)
  ✓ Created .claude/skills/ (N domains)
  ✓ Created .claude/agents/ (N teams)
  ✓ Generated .claude/CLAUDE.md
  ✓ Generated .claude/settings.json

  Done! Next steps:

    1. Set NOTION_API_KEY in your environment
    2. Run `gws auth login` for Gmail/Calendar/Drive
    3. Open Claude Code and try:
       /inbox triage    — Process your inbox
       /briefing        — Get your daily briefing
       /prep            — Prepare for meetings
```

Counts (N) are computed dynamically by counting directories/files, never hardcoded.

**Update:**
```
$ npx founder-os@latest --init

  Founder OS v1.0.0 → v1.3.0

  ✓ Updated 12 commands
  ✓ Updated 8 skills
  ✓ Updated 2 agent teams
  ✓ Refreshed .founderOS/ infrastructure
  ⚠ Skipped 3 files (modified by you):
    .claude/commands/inbox/triage.md
    .claude/skills/inbox/SKILL.md
    .claude/CLAUDE.md

  Done! See CHANGELOG for what's new.
```

## CLAUDE.md Generation

The generated CLAUDE.md uses section markers to separate founderOS-managed content from user content:

```markdown
<!-- founder-os:start -->
# Founder OS

AI-powered business automation for founders.

## Quick Start

- `/inbox triage` — Process and prioritize your inbox
- `/briefing` — Get your daily briefing
- `/prep` — Prepare for upcoming meetings
- `/report weekly` — Generate weekly status report

## Command Reference

### Daily Operations
| Command | Description |
|---------|-------------|
| `/inbox triage` | Prioritize emails, draft responses |
| `/briefing` | Calendar + email + Slack digest |
| `/prep` | Meeting preparation with context |
| `/review` | End-of-day review and follow-ups |
| `/followup` | Track and send follow-ups |
| `/meeting` | Meeting notes and action items |

### Business Documents
| Command | Description |
|---------|-------------|
| `/report weekly` | Status reports from your data |
| `/invoice create` | Generate invoices |
| `/proposal draft` | Write business proposals |
| `/contract` | Contract drafting |
| `/sow` | Statements of work |
| `/expense` | Expense tracking |

### Communications
| Command | Description |
|---------|-------------|
| `/newsletter draft` | Newsletter composition |
| `/linkedin post` | LinkedIn content |
| `/social cross-post` | Multi-platform publishing |

### Integrations
| Command | Description |
|---------|-------------|
| `/notion` | Notion workspace operations |
| `/slack` | Slack channel operations |
| `/drive` | Google Drive management |
| `/crm` | CRM operations |

### Intelligence & Meta
| Command | Description |
|---------|-------------|
| `/memory` | Cross-session memory |
| `/intel health` | Intelligence engine status |
| `/scout find` | Discover new tools and skills |
| `/workflow` | Automation workflows |

## Configuration

### Required
- `NOTION_API_KEY` — Your Notion integration token
- `gws auth login` — Google Workspace CLI authentication

### Optional
- Slack MCP server for `/slack` commands
- Late.dev account for social media publishing

## Architecture

- **Commands** (`.claude/commands/`) — WHAT to do (YAML frontmatter specs)
- **Skills** (`.claude/skills/`) — HOW to do it (domain knowledge)
- **Agents** (`.claude/agents/`) — WHO does it (team coordination)
- **Infrastructure** (`.founderOS/`) — Shared services (dispatcher, memory, intelligence)

## Customization

Add your own commands to `.claude/commands/` — they won't be overwritten
on update. To override a founderOS command, create a file with the same
path and name; your version takes precedence.

## Updating

```bash
npx founder-os@latest --init
```

Re-run anytime. Your customizations are preserved.
<!-- founder-os:end -->
```

### Merge Behavior

| Scenario | Behavior |
|----------|----------|
| No existing CLAUDE.md | Create new file with founderOS section only |
| Existing CLAUDE.md without markers | Prepend founderOS section with markers, blank line, then existing content |
| Existing CLAUDE.md with markers | Replace content between markers only, preserve everything outside |

### Uninstall Behavior

On `--uninstall`, the CLI removes **only the content between markers** from CLAUDE.md. If the file becomes empty after removal, delete it. Otherwise, leave the user's content intact.

## settings.json Merge Strategy

The CLI generates this base `settings.json` for founderOS:

```json
{
  "permissions": {
    "allow": [
      "Bash(npx founder-os*)",
      "Bash(node .founderOS/scripts/*)"
    ]
  }
}
```

### Merge Rules

1. Read existing `.claude/settings.json` (if any)
2. For `permissions.allow`: append founderOS entries if not already present
3. Never remove existing user entries
4. Write merged result
5. On `--uninstall`: remove only founderOS-added entries from `permissions.allow`

MCP server configuration is **not** added to `settings.json` by the CLI. MCP servers require user-specific credentials (API keys, auth tokens) and are configured separately via the next-steps guide or `/setup` commands.

## Manifest Format

`.founderOS/manifest.json` tracks all managed files:

```json
{
  "version": "1.3.0",
  "installedAt": "2026-03-15T12:00:00Z",
  "updatedAt": "2026-03-15T12:00:00Z",
  "files": {
    ".claude/commands/inbox/triage.md": {
      "checksum": "sha256:abc123def456...",
      "status": "managed"
    },
    ".claude/commands/inbox/drafts-approved.md": {
      "checksum": "sha256:789abc...",
      "status": "user-modified"
    },
    ".claude/commands/custom/my-command.md": {
      "status": "user-removed"
    },
    ".claude/commands/report/generate.md": {
      "checksum": "sha256:...",
      "status": "replaced-existing",
      "backup": ".claude/commands/report/generate.md.pre-founderos.bak"
    }
  }
}
```

**Status values:**
- `managed` — founderOS-owned, safe to overwrite on update
- `user-modified` — checksum differs from install, skip on update
- `user-removed` — user deleted this file, don't recreate
- `replaced-existing` — file existed before founderOS, backup created

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No `.claude/` directory | Create it |
| `.claude/` exists with user commands | founderOS files alongside, never overwrite user files in different paths |
| Pre-existing file at a founderOS path | Back up to `.pre-founderos.bak`, install founderOS version |
| `.claude/CLAUDE.md` exists without markers | Prepend founderOS section with markers |
| `.claude/CLAUDE.md` exists with markers | Replace between markers only |
| `.claude/settings.json` exists | Merge permissions, don't overwrite |
| User deleted a founderOS command | Don't recreate on update (tracked as `user-removed`) |
| User modified a founderOS command | Skip on update (warn), or overwrite with `--force` (backup created) |
| No Node.js >= 18 | Exit with: "Founder OS requires Node.js 18+. Current: [version]" |
| No write permissions | Exit with: "Cannot write to [directory]. Check permissions." |
| npm registry unreachable | npx handles this natively (network error) |
| Interrupted install (no manifest) | Next `--init` detects missing manifest, re-runs fresh install |
| `--uninstall` with modifications | Without `--force`: list modified files, skip them. With `--force`: backup and remove. |
| `--uninstall` restores backups | Files with `replaced-existing` status: restore from `.pre-founderos.bak` |
| `.founderOS/` exists but no `version.json` | Treat as corrupted/partial install, re-run fresh |

## Release Pipeline

### Build Step (from dev repo)

The existing `scripts/release.sh` is **replaced** with a new version that:

1. Runs from the `founderOS/` dev repo root
2. Creates a clean `build/` directory
3. Assembles the template (see Template Mapping table above):
   - Copies included directories into `build/template/.claude/` and `build/template/.founderOS/`
   - Excludes dev-only directories (see exclusion table above)
4. Rewrites `${CLAUDE_PLUGIN_ROOT}` paths in all `.md` files under `build/template/.claude/`:
   - `${CLAUDE_PLUGIN_ROOT}/skills/` → `skills/`
   - `${CLAUDE_PLUGIN_ROOT}/commands/` → `commands/`
   - `${CLAUDE_PLUGIN_ROOT}/agents/` → `agents/`
   - `${CLAUDE_PLUGIN_ROOT}/_infrastructure/` → `../../.founderOS/infrastructure/`
5. Generates `build/template/.claude/CLAUDE.md` from template content
6. Generates `build/template/.claude/settings.json` with base config
7. Copies `bin/founder-os.js` to `build/bin/`
8. Copies `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md` to `build/`
9. Bumps version in `build/package.json`
10. Syncs `build/` contents → `founder-os-dist/` repo (rsync --delete)
11. Commits and tags in `founder-os-dist`
12. Runs `npm publish` from `founder-os-dist/`

### founder-os-dist Repo

The `founder-os-dist` repository **is** the npm package source. It contains exactly what gets published to npm. The repo structure after a release matches the Package Structure section above. This replaces the previously planned marketplace structure.

### Version Strategy

- Semantic versioning: `MAJOR.MINOR.PATCH`
- MAJOR: Breaking changes (restructured directories, removed commands)
- MINOR: New commands, skills, or features
- PATCH: Bug fixes, documentation updates
- `package.json` version is the source of truth
- `.founderOS/version.json` (at install site) tracks the installed version

## CLI Implementation Notes

The CLI (`bin/founder-os.js`) uses only Node.js built-in modules:

- `fs` — file operations (synchronous for simplicity)
- `path` — path manipulation
- `crypto` — SHA-256 checksums
- `child_process` — none needed

**Argument parsing:** Manual `process.argv` parsing (no library). The flag set is small and fixed.

**Expected size:** 400-500 lines. The CLAUDE.md merge logic, settings.json merge, manifest management, and backup/restore logic are non-trivial.

**Exit codes:**
- `0` — success
- `1` — error (permissions, Node version, corrupted state)

## Technical Constraints

- **Node.js >= 18** required (for native `fs.cpSync`, `crypto.createHash`)
- **No runtime dependencies** — only Node.js built-ins
- **No build step for the CLI** — plain JavaScript
- **File operations are synchronous** — simpler code, file count is manageable
- **Checksums use SHA-256** via `crypto.createHash`
- **macOS and Linux only** — Claude Code doesn't support Windows

## Out of Scope

- Interactive setup wizard (users configure integrations separately)
- Plugin marketplace integration (separate concern from npm distribution)
- Auto-update mechanism (users explicitly re-run `--init`)
- Telemetry or analytics
- MCP server auto-configuration (requires user credentials)
- Hooks directory in `.claude/` (founderOS does not currently ship hook files; hooks are defined in settings.json or added by users)

## Success Criteria

1. `npx founder-os@latest --init` installs successfully in under 5 seconds (goal, not hard requirement)
2. All command namespaces are accessible via `/command` in Claude Code after install
3. Re-running `--init` preserves all user modifications (verified by checksum comparison)
4. `--uninstall` cleanly removes all founderOS files without affecting user files
5. Pre-existing files backed up during install are restored on `--uninstall`
6. The generated CLAUDE.md teaches a new user how to use founderOS effectively
7. Release pipeline produces a working npm package from the dev repo in one script run
8. `${CLAUDE_PLUGIN_ROOT}` references are fully rewritten — no broken paths in distributed files
