---
description: Run health checks on the Founder OS installation
allowed-tools: ["Read", "Bash"]
execution-mode: foreground
result-format: full
---

# /founder-os:setup:verify

Run health checks on the Founder OS installation.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `setup` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Usage

```
/founder-os:setup:verify
```

## Instructions

Run each check below and report results as a table with Pass/Fail status.

### 1. Notion Connectivity

- Run the Notion CLI diagnostic to verify connectivity:
  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs --diagnostic
  ```
- Then search for HQ databases:
  ```bash
  node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "[FOS]" --filter database
  ```
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
- Verify `filesystem` server entry exists with `WORKSPACE_DIR` path.

### 5. Environment Variables

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
| MCP Config         | ✓ Pass | filesystem configured      |
| Environment        | ✓ Pass | WORKSPACE_DIR set          |
| Slack (optional)   | — Skip | Token not configured       |

Result: 5/5 required checks passed

Note: Basic tool availability (Notion API key, gws auth) is now checked by the Preflight Check above. This verify command focuses on deeper diagnostics: database coverage, access confirmation, symlink integrity, and MCP configuration.
```
