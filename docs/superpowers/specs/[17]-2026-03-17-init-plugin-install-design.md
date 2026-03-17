# [17] Init Plugin Install — `--with-plugins` Flag Design

**Date:** 2026-03-17
**Status:** Draft
**Extends:** [14] NPM Distribution System
**Command:** `npx founder-os@latest --init --with-plugins`

## Problem

The `--init` command (spec [14]) installs founderOS files into `.claude/` and `.founderOS/` but does not install any Claude Code plugins from the official Anthropic marketplace. Users who want recommended plugins for an optimal development experience must discover and install them manually, one by one.

## Solution

Add an optional `--with-plugins` flag to the `--init` command. When passed, the CLI installs a curated list of recommended plugins from the official Anthropic marketplace into **project scope** after the standard file-copy install completes.

Default behavior (without flag) is unchanged — no plugins are installed. This keeps the base install fast, offline-capable, and dependency-free.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Opt-in vs opt-out | Opt-in (`--with-plugins`) | Base install should work without network; plugin install requires `claude` CLI and marketplace access |
| Scope | Project scope | Plugins are per-project, not global; keeps environments isolated |
| Failure handling | Graceful skip per plugin | Network issues or missing `claude` CLI shouldn't fail the entire install |
| Plugin list source | Hardcoded in CLI | Simple, auditable, versionable; no remote registry fetch needed |
| Version pinning | No pinning (latest) | Marketplace handles versioning; users get current stable |

## Recommended Plugins List

### Tier 1 — Official Anthropic Marketplace

These are maintained by Anthropic or official marketplace partners:

| Plugin | Source | Purpose |
|--------|--------|---------|
| `context7` | `claude-plugins-official` | Up-to-date library documentation and code examples |
| `superpowers` | `claude-plugins-official` | Enhanced development workflows (TDD, planning, debugging) |
| `skill-creator` | `claude-plugins-official` | Create and optimize custom Claude Code skills |
| `frontend-design` | `claude-plugins-official` | Production-grade frontend interface generation |
| `typescript-lsp` | `claude-plugins-official` | TypeScript language server integration |

### Tier 2 — Recommended Development Plugins

These are curated plugins that enhance the development experience:

| Plugin | Source | Purpose |
|--------|--------|---------|
| `claude-md-management` | Marketplace | Audit and improve CLAUDE.md project files |
| `agent-sdk-dev` | `claude-code-plugins` | Claude Agent SDK development toolkit |
| `plugin-dev` | `claude-code-plugins` | Plugin creation, validation, and development |
| `pyright-lsp` | Marketplace | Python language server (Pyright) integration |

## CLI Behavior

### Flag: `--with-plugins`

Only valid alongside `--init`. Runs as a post-install phase after all file operations complete.

```
$ npx founder-os@latest --init --with-plugins
```

### Execution Flow

1. Standard `--init` completes (all file copy, manifest, CLAUDE.md, settings.json)
2. Check `claude` CLI is available (`claude --version`)
   - If not found: print warning, skip plugin phase, exit 0
3. For each plugin in the recommended list:
   - Run `claude plugin install <name>@<source> --scope project`
   - On success: record in output
   - On failure: print warning, continue to next plugin
4. Print summary of installed / skipped / failed plugins

### Output Example

**With `--with-plugins` (success):**
```
$ npx founder-os@latest --init --with-plugins

  Founder OS v1.0.0

  ✓ Created .founderOS/
  ✓ Created .claude/commands/ (32 namespaces)
  ✓ Created .claude/skills/ (28 domains)
  ✓ Created .claude/agents/ (7 teams)
  ✓ Generated .claude/CLAUDE.md
  ✓ Generated .claude/settings.json

  Installing recommended plugins...

  ✓ context7 (claude-plugins-official)
  ✓ superpowers (claude-plugins-official)
  ✓ skill-creator (claude-plugins-official)
  ✓ frontend-design (claude-plugins-official)
  ✓ typescript-lsp (claude-plugins-official)
  ✓ claude-md-management
  ✓ agent-sdk-dev (claude-code-plugins)
  ✓ plugin-dev (claude-code-plugins)
  ✓ pyright-lsp

  9/9 plugins installed (project scope)

  Done! Next steps:
    ...
```

**With `--with-plugins` (partial failure):**
```
  Installing recommended plugins...

  ✓ context7 (claude-plugins-official)
  ✓ superpowers (claude-plugins-official)
  ⚠ skill-creator — install failed (network timeout)
  ✓ frontend-design (claude-plugins-official)
  ...

  7/9 plugins installed, 2 skipped
  Run manually: claude plugin install skill-creator@claude-plugins-official --scope project
```

**Without `claude` CLI:**
```
  ⚠ Claude CLI not found — skipping plugin installation
    Install Claude Code first, then run:
    npx founder-os@latest --init --with-plugins
```

### Flag: `--with-plugins` on update

When re-running `--init --with-plugins` on an existing installation:
- Already-installed plugins are skipped (no-op)
- New plugins added to the recommended list in newer versions get installed
- User-removed plugins are NOT reinstalled (respects user choice)

## Implementation

### In `bin/founder-os.js`

```js
const RECOMMENDED_PLUGINS = [
  // Tier 1: Official Anthropic
  { name: 'context7', source: 'claude-plugins-official', tier: 1 },
  { name: 'superpowers', source: 'claude-plugins-official', tier: 1 },
  { name: 'skill-creator', source: 'claude-plugins-official', tier: 1 },
  { name: 'frontend-design', source: 'claude-plugins-official', tier: 1 },
  { name: 'typescript-lsp', source: 'claude-plugins-official', tier: 1 },
  // Tier 2: Recommended Dev Plugins
  { name: 'claude-md-management', source: null, tier: 2 },
  { name: 'agent-sdk-dev', source: 'claude-code-plugins', tier: 2 },
  { name: 'plugin-dev', source: 'claude-code-plugins', tier: 2 },
  { name: 'pyright-lsp', source: null, tier: 2 },
];
```

### New module: `lib/plugins.js`

```
lib/plugins.js  (~80-100 lines)
├── checkClaudeCli()        → boolean (is `claude` available?)
├── isPluginInstalled(name) → boolean (check project scope)
├── installPlugin(plugin)   → { success, error? }
└── installRecommended()    → { installed[], skipped[], failed[] }
```

### Dependencies

- `child_process.execSync` — to run `claude plugin install` commands
- No new npm dependencies (stays zero-dependency)

## Manifest Tracking

Plugin install state is tracked in `.founderOS/manifest.json` under a new `plugins` key:

```json
{
  "version": "1.0.0",
  "files": { ... },
  "plugins": {
    "context7@claude-plugins-official": {
      "installedAt": "2026-03-17T12:00:00Z",
      "tier": 1,
      "status": "installed"
    },
    "skill-creator@claude-plugins-official": {
      "status": "failed",
      "error": "network timeout",
      "lastAttempt": "2026-03-17T12:00:00Z"
    }
  }
}
```

**Status values:**
- `installed` — successfully installed
- `failed` — install attempted but failed (records error for retry)
- `user-removed` — user uninstalled this plugin manually; don't reinstall on update

## Uninstall Behavior

`--uninstall` does **not** remove plugins. Plugins are managed by the `claude` CLI, not by founderOS file operations. The `plugins` section is removed from the manifest only.

Users can remove plugins individually: `claude plugin uninstall <name>`.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| `--with-plugins` without `--init` | Print error: "--with-plugins requires --init" |
| `claude` CLI not installed | Print warning, skip plugin phase, exit 0 |
| No network | Each plugin fails individually with warning; file install still succeeds |
| Plugin already installed (user or prior run) | Skip, count as success |
| User previously uninstalled a recommended plugin | Skip (tracked as `user-removed` in manifest) |
| `--force --with-plugins` | Reinstall all plugins including previously failed ones; respect `user-removed` |
| Marketplace not configured | `claude plugin install` handles this natively; may prompt user |

## Relation to Spec [14]

This spec **extends** spec [14] by:
1. Adding the `--with-plugins` flag to the CLI commands table
2. Adding `child_process` to the list of used Node.js built-ins (for `execSync`)
3. Moving "Plugin marketplace integration" from Out of Scope to this spec
4. Adding the `plugins` key to the manifest format

Spec [14]'s core behavior is unchanged — `--init` without `--with-plugins` works exactly as specified.

## Out of Scope

- Custom plugin lists (user-specified plugins via config file)
- Plugin auto-update mechanism
- Scout integration (spec [12]) for dynamic plugin discovery
- Plugin version pinning or lockfile
- Plugin dependency resolution (plugins are independent)

## Success Criteria

1. `npx founder-os@latest --init --with-plugins` installs all 9 recommended plugins in project scope
2. `npx founder-os@latest --init` (without flag) installs zero plugins — behavior unchanged
3. Partial failures don't block the install; summary shows what failed with retry commands
4. Re-running `--init --with-plugins` is idempotent — already-installed plugins are skipped
5. User-removed plugins are respected and not reinstalled
