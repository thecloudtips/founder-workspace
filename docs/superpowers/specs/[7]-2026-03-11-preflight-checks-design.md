# Preflight Dependency Checks — Design Spec

**Date**: 2026-03-11
**Status**: Final
**Priority**: P1 — First-run experience

## Problem

When a new user installs Founder OS from the marketplace and runs their first command, they hit cryptic errors if required MCP servers or the gws CLI aren't configured. There's no consistent way to tell the user what's missing, why it matters, and how to fix it. Some commands (e.g., `inbox/triage.md`) have inline `which gws` checks, but most don't check at all. Error messages vary across namespaces.

This is the #1 barrier to retention: if the first command fails, the user leaves.

## Solution

A single shared infrastructure skill (`_infrastructure/preflight/SKILL.md`) backed by a dependency registry (`_infrastructure/preflight/dependency-registry.json`). Every command calls preflight as a new step between "Business Context" and "Step 0: Memory Context". The preflight skill checks whether the namespace's required and optional dependencies are available, then returns one of three states: `ready`, `degraded`, or `blocked`.

## Design

### Component 1: Dependency Registry

A JSON file at `_infrastructure/preflight/dependency-registry.json` mapping each namespace to its dependencies.

**Dependency types:**

| Dependency Key | What It Means | How to Check |
|---------------|---------------|--------------|
| `notion` | Notion MCP server connected | Check if Notion MCP tools (e.g., `notion-search`) are available in the current tool list |
| `gws:gmail` | gws CLI installed + authenticated | `which gws` then `gws auth status` |
| `gws:calendar` | gws CLI installed + authenticated | `which gws` then `gws auth status` |
| `gws:drive` | gws CLI installed + authenticated | `which gws` then `gws auth status` |
| `filesystem` | Filesystem MCP server connected | Check if filesystem MCP tools are available |
| `slack` | Slack MCP server connected | Check if Slack MCP tools are available |
| `websearch` | Web Search MCP available | Check if web search tools are available |

**Registry structure:**

```json
{
  "$schema": "dependency-registry",
  "$version": "1.0",
  "namespaces": {
    "inbox": {
      "required": ["gws:gmail"],
      "optional": ["notion"]
    },
    "briefing": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar", "slack"]
    },
    "prep": {
      "required": ["gws:calendar", "notion"],
      "optional": ["gws:gmail", "gws:drive"]
    },
    "actions": {
      "required": ["notion"],
      "optional": []
    },
    "review": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar"]
    },
    "followup": {
      "required": ["gws:gmail", "notion"],
      "optional": ["gws:calendar"]
    },
    "meeting": {
      "required": ["notion", "filesystem"],
      "optional": []
    },
    "newsletter": {
      "required": ["filesystem"],
      "optional": ["websearch", "notion"]
    },
    "report": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "health": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar"]
    },
    "invoice": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "proposal": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "contract": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "sow": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "compete": {
      "required": ["websearch"],
      "optional": ["filesystem", "notion"]
    },
    "expense": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "notion": {
      "required": ["notion"],
      "optional": []
    },
    "drive": {
      "required": ["gws:drive"],
      "optional": ["notion"]
    },
    "slack": {
      "required": ["slack"],
      "optional": ["notion"]
    },
    "client": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar", "gws:drive"]
    },
    "crm": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar"]
    },
    "morning": {
      "required": ["notion"],
      "optional": ["gws:gmail", "gws:calendar"]
    },
    "kb": {
      "required": ["notion"],
      "optional": []
    },
    "linkedin": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "savings": {
      "required": ["notion"],
      "optional": ["filesystem"]
    },
    "prompt": {
      "required": ["notion"],
      "optional": []
    },
    "workflow": {
      "required": ["filesystem"],
      "optional": ["notion"]
    },
    "workflow-doc": {
      "required": ["notion"],
      "optional": ["filesystem"]
    },
    "learn": {
      "required": ["notion"],
      "optional": []
    },
    "goal": {
      "required": ["notion"],
      "optional": []
    },
    "memory": {
      "required": ["notion"],
      "optional": []
    },
    "intel": {
      "required": [],
      "optional": []
    },
    "setup": {
      "required": [],
      "optional": []
    }
  }
}
```

**Design decisions on required vs optional:**

The CLAUDE.md table lists tools per namespace, but doesn't distinguish required from optional. The registry makes these choices:

- For namespaces that write to Notion (briefing, actions, followup, health, client, crm, morning, kb, savings, prompt, learn, goal, memory, workflow-doc): Notion is **required** because the command's primary output destination is Notion.
- For namespaces that *can* write to Notion but primarily output files or terminal results (report, invoice, proposal, sow, expense): Notion is **optional** — the command works without it, just skips the Notion save.
- For `inbox`: gws:gmail is required (the whole point is email), but Notion is optional (triage results can be displayed in terminal without persisting).
- For `newsletter`: filesystem is required (all commands read/write local files). WebSearch is optional because only `newsletter:research` needs it — `newsletter:draft`, `newsletter:outline`, and `newsletter:newsletter` work without it. When websearch is unavailable, `newsletter:research` will degrade (warn that web research is skipped, proceed with file-based sources only).
- For `compete`: websearch is required (competitive research without web access is not useful). Filesystem is optional enrichment.
- **gws downgrade rationale**: CLAUDE.md lists gws as "Required Tools" for briefing, review, health, crm, morning, and client. However, for preflight purposes we classify gws as **optional** for these namespaces because: (a) the commands already implement graceful degradation when gws sources are unavailable, (b) a user with only Notion configured should still be able to get a partial briefing/review rather than being blocked entirely, (c) blocking on gws would prevent Notion-only users from using most of Pillar 1. Exceptions where gws remains **required**: `inbox` and `followup` (primary data source is Gmail), `prep` (gws:calendar is required because meeting prep without a calendar is meaningless — but gws:gmail and gws:drive are optional enrichment), and `drive` (gws:drive IS the entire namespace).
- **Slack for briefing**: Slack is optional for `briefing` because Notion + gws sources produce a complete briefing; Slack adds team activity highlights but is not essential.
- **gws auth granularity**: The gws CLI uses a single Google OAuth token covering all scopes (Gmail, Calendar, Drive). `gws auth status` checks overall authentication, not per-service. If gws is authenticated, all three services are available. The three separate dependency keys (`gws:gmail`, `gws:calendar`, `gws:drive`) exist for semantic clarity in the registry (to document which services a namespace uses), not because they can fail independently.
- Any namespace that writes to a Notion HQ database (per the HQ DB column in CLAUDE.md) includes `notion` as at least optional, even if its primary I/O is file-based.
- `intel` and `setup` have no hard dependencies — they operate on local state or guide the user. `setup` specifically omits Notion because its purpose is to *configure* Notion.

### Component 2: Preflight Skill

A skill at `_infrastructure/preflight/SKILL.md` with the following behavior:

**Input**: The current namespace name (derived from the command being executed, e.g., `inbox` from `/founder-os:inbox:triage`).

**Process**:

1. Read the dependency registry at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/dependency-registry.json`
2. Look up the current namespace's `required` and `optional` arrays
3. For each dependency, run the appropriate check:

| Dependency | Check Method | Pass Criteria |
|-----------|-------------|---------------|
| `notion` | Check if Notion MCP tools (e.g., `notion-search`) are available in the current tool list | Tool exists |
| `gws:gmail` | Run `which gws` via Bash. If found, run `gws auth status` to verify authentication. | gws binary exists and auth is valid |
| `gws:calendar` | Run `which gws` via Bash. If found, run `gws auth status` to verify authentication. | gws binary exists and auth is valid |
| `gws:drive` | Run `which gws` via Bash. If found, run `gws auth status` to verify authentication. | gws binary exists and auth is valid |
| `filesystem` | Check if filesystem MCP tools (e.g., `read_file`) are available in the current tool list | Tool exists |
| `slack` | Check if Slack MCP tools are available in the current tool list | Tool exists |
| `websearch` | Check if WebSearch tool is available in the current tool list | Tool exists |

4. Classify the result:

| State | Condition | Action |
|-------|-----------|--------|
| `ready` | All required pass, all optional pass | Proceed. No output. |
| `degraded` | All required pass, 1+ optional fail | Print warnings, proceed |
| `blocked` | 1+ required fail | Print error with fix instructions, **halt execution** |

**gws optimization**: If multiple gws services are needed (e.g., `gws:gmail` + `gws:calendar`), run `which gws` only once. If gws is not installed, mark all gws dependencies as failed in one step.

**Caching**: Within a single conversation, the LLM naturally remembers earlier check results in its context window. The skill should instruct: "If you have already verified this dependency earlier in this conversation, skip the re-check." This is implicit caching — no technical mechanism needed.

**Unknown namespaces**: If a namespace is not found in the registry (e.g., a newly added namespace that hasn't been registered yet), treat it as `ready` and proceed. Log no warning — the missing registry entry is a developer issue, not a user issue.

**`--team` mode**: The preflight check runs once at the namespace level, covering all dependencies needed by both single-agent and `--team` agent pipeline modes. Since the registry lists the union of all dependencies a namespace can use, agent-mode dependencies are already included.

### Component 3: Fix Instructions

Each dependency type has a specific, copy-pasteable fix message:

```
notion:
  ✘ Required: Notion MCP server not connected.
  This command stores results in your Notion workspace.
  To fix:
    1. Get an API key: https://www.notion.so/my-integrations
    2. Add to your shell profile: export NOTION_API_KEY="your-key-here"
    3. Add MCP server: claude mcp add notion -- npx @modelcontextprotocol/server-notion
    4. Restart Claude Code

gws:gmail / gws:calendar / gws:drive:
  ✘ Required: gws CLI not found (or Gmail/Calendar/Drive not authenticated).
  This command accesses your Google Workspace data.
  To fix:
    1. Install gws: See gws documentation for installation
    2. Authenticate: gws auth login
    3. Verify: gws gmail +triage --max 1 --format json

filesystem:
  ✘ Required: Filesystem MCP server not connected.
  This command reads/writes local files.
  To fix:
    1. Add MCP server: claude mcp add filesystem -- npx @modelcontextprotocol/server-filesystem ~/your-workspace
    2. Restart Claude Code

slack:
  ✘ Required: Slack MCP server not connected.
  This command reads your Slack messages.
  To fix:
    1. Get a Slack Bot token from your workspace admin
    2. Add to shell profile: export SLACK_BOT_TOKEN="xoxb-your-token"
    3. Add MCP server: claude mcp add slack -- npx @anthropic/mcp-server-slack
    4. Restart Claude Code

websearch:
  ✘ Required: Web Search not available.
  This command searches the web for research.
  To fix:
    1. Add MCP server: claude mcp add web-search -- npx @anthropic/mcp-server-web-search
    2. Restart Claude Code
```

For optional dependencies, the same messages are used but prefixed with `⚠ Optional:` instead of `✘ Required:` and include what functionality will be skipped:

```
⚠ Optional: gws (Drive) not available — skipping document search.
  Results will include Calendar + Gmail + Notion data only.
  To enable: [same fix instructions]
```

### Component 4: Command Integration

Every command file gets a new step inserted between "Business Context" and "Step 0: Memory Context":

```markdown
## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `<namespace>` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.
```

This replaces any existing inline dependency checks (e.g., the `which gws` check in `inbox/triage.md`).

### What This Does NOT Do

- **No auto-install**: The preflight skill never installs anything. It tells the user what to do.
- **No persistent state**: No database, no config file. Checks are live every time (with session caching).
- **No new commands**: No `/founder-os:preflight:check` command. The check is invisible when everything works.
- **No changes to the dependency registry at runtime**: The registry is static JSON maintained by developers.
- **No failure on missing registry**: If the registry file itself is missing or malformed, treat as `ready` and proceed silently (consistent with the project's "skip silently" pattern for missing infrastructure).

## Command Execution Flow (After)

```
1. Parse Arguments
2. Business Context (optional, skip silently if missing)
3. Preflight Check  ← NEW
   └─ blocked? → print fix instructions, halt
   └─ degraded? → print warnings, continue
   └─ ready? → silent, continue
4. Step 0: Memory Context
5. Observation: Start
6. Intelligence: Apply Learned Patterns
7. [Main execution steps]
8. Observation: End
```

## Files Created / Modified

| File | Action | Description |
|------|--------|-------------|
| `_infrastructure/preflight/SKILL.md` | Create | Preflight check skill |
| `_infrastructure/preflight/dependency-registry.json` | Create | Namespace → dependency mapping |
| `_infrastructure/preflight/references/fix-messages.md` | Create | Copy-pasteable fix instructions per dependency |
| `commands/*/[every-command].md` | Modify | Add Preflight Check step to all command files across all namespaces |
| `CLAUDE.md` | Modify | Document preflight in Universal Patterns section |

## Success Criteria

1. A user with zero external tools configured runs `/founder-os:inbox:triage` and sees a clear message telling them to install gws, with the exact commands to run.
2. A user with Notion + gws (Gmail only) runs `/founder-os:briefing:briefing` and gets a warning about missing Calendar/Slack data but the command still runs using available sources.
3. A user with everything configured sees no preflight output — the check is invisible.
4. Fix instructions are accurate and copy-pasteable. Running them actually fixes the problem.
5. No existing command behavior changes — preflight only adds a gate, it doesn't modify what commands do when dependencies are available.
