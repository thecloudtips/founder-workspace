# Scout Namespace — External Tool & Skill Discovery

**Namespace:** scout (Meta & Growth Pillar, superpowers extension)
**Date:** 2026-03-14
**Status:** Design approved

## Problem

Users encounter new problems that existing founderOS namespaces don't solve. Today, finding and integrating external tools (Claude Code skills, MCP servers, GitHub repos, CLI packages) is entirely manual — the user must research, evaluate, install, and wire things up themselves. This is slow, error-prone, and disconnected from the founderOS workflow system.

## Solution

A new `scout` namespace that automatically researches existing solutions across the internet, evaluates them for security, and generates wrapper commands that plug into the founderOS ecosystem — including P27 workflow YAML pipelines.

**Core principles:**
- **Skills-first**: prioritize Claude Code skills per Anthropic guidance (zero-install, native format)
- **Token-conscious**: catalog-first caching, budget-controlled web searches, targeted page fetches
- **Security-gated**: every discovered tool goes through a sandboxed security review before use
- **Non-blocking**: security warnings are prominent but never block the user
- **Workflow-native**: every scouted tool is immediately usable in P27 workflow YAML

## Commands

### scout:find

Research solutions for a user-described problem.

**Flow:** check catalog → check Memory Engine → ranked web search cascade → score & rank → present top 3.

```yaml
---
description: "Discover external tools and skills to solve a problem"
argument-hint: "<problem-description> [--deep] [--type=skill|mcp|repo|package] [--budget=low|medium|high]"
allowed-tools: ["Read", "Write", "Bash", "WebSearch", "WebFetch", "Task"]
execution-mode: background
result-format: summary
---
```

**Flags:**
- `--deep` — activates `--team` mode with parallel research agents across all source tiers (higher token cost)
- `--type=skill|mcp|repo|package` — restrict search to specific source types
- `--budget=low|medium|high` — controls web search volume (default: `low` = 3-5 searches)

**Output:** ranked list of up to 3 solutions with: name, source URL, source type, integration effort estimate, relevance score, brief description.

### scout:install

Download an approved solution into sandbox, run security review, generate wrapper command.

```yaml
---
description: "Install a discovered tool with security review"
argument-hint: "<tool-url-or-catalog-id> [--skip-review] [--namespace=<target>]"
allowed-tools: ["Read", "Write", "Bash", "WebFetch", "Task"]
execution-mode: background
result-format: summary
---
```

**Flags:**
- `--skip-review` — bypass security scan (shows warning, logged to audit trail)
- `--namespace=<target>` — pre-assign the target namespace for eventual promotion

**Steps:**
1. Download tool files into `_infrastructure/scout/sandbox/<tool-id>/_downloaded/`
2. Spawn background security review agent
3. Generate wrapper command at `commands/scout/<tool-name>.md`
4. Add entry to `_infrastructure/scout/catalog.json`
5. Store discovery in Memory Engine (namespace: `scout`)
6. Present result with security verdict

### scout:catalog

Browse and search the local solution catalog.

```yaml
---
description: "Browse discovered tools and their security ratings"
argument-hint: "[search-term] [--verdict=green|yellow|red] [--type=skill|mcp|repo|package] [--installed]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---
```

### scout:review

Re-run security assessment on an already-installed scouted tool.

```yaml
---
description: "Re-run security review on a scouted tool"
argument-hint: "<tool-id>"
allowed-tools: ["Read", "Write", "Bash", "Task"]
execution-mode: background
result-format: summary
---
```

### scout:promote

Move a proven scouted tool into its proper target namespace.

```yaml
---
description: "Promote a scouted tool to a native namespace"
argument-hint: "<tool-id> --to=<namespace> [--command-name=<name>]"
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---
```

**Steps:**
1. Move `commands/scout/<tool-name>.md` → `commands/<namespace>/<new-name>.md`
2. Remove `[Auto-generated]` prefix from description
3. Update catalog entry with new location
4. Update any workflow YAML files referencing the old path
5. Optionally scaffold a domain skill at `skills/<namespace>/<skill-name>/SKILL.md`

### scout:remove

Uninstall a scouted tool.

```yaml
---
description: "Remove a scouted tool and its artifacts"
argument-hint: "<tool-id> [--keep-catalog]"
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---
```

**Removes:** wrapper command, sandbox directory, catalog entry (unless `--keep-catalog`), Memory Engine entry.

### scout:sources

List and configure search sources and their priority order.

```yaml
---
description: "View or configure scout search sources"
argument-hint: "[--add=<url>] [--remove=<source-id>] [--reorder]"
allowed-tools: ["Read", "Write"]
execution-mode: foreground
result-format: full
---
```

## Search Pipeline

### Source Priority (Skills-First per Anthropic Guidance)

| Priority | Source | Search Method | Rationale |
|----------|--------|--------------|-----------|
| 1 | Claude Code Skills | WebSearch `site:skillsmp.com`, `site:github.com "SKILL.md"` | Zero-install, native format, runs in-context |
| 2 | MCP Servers | WebSearch `site:npmjs.com "mcp-server"`, `site:github.com "mcp server"` | Low-friction install via `claude mcp add`, rich tool integration |
| 3 | GitHub Repos with AI integration | WebSearch for repos with `/docs/ai/skills` or agent configs | Semi-native, may need thin wrapper |
| 4 | npm/PyPI CLI tools | WebSearch for CLI tools solving the problem | Need Bash wrapper command, most scaffolding work |

### Cascade Logic

Search stops early if Priority 1 or 2 yields a high-confidence match. Only cascades to lower priorities if higher ones return nothing relevant. This minimizes token spend.

### Result Scoring

| Factor | Weight | Measures |
|--------|--------|----------|
| Integration ease | 0.30 | Scaffolding needed (skill.md = none, npm CLI = significant) |
| Relevance | 0.25 | How well it solves the stated problem |
| Maintenance signal | 0.20 | Stars, recent commits, active maintainer |
| Documentation quality | 0.15 | Docs, examples, AI-specific guides |
| Token efficiency | 0.10 | Context consumed when loaded |

### Token Budget Controls

| Budget | WebSearch calls | Behavior |
|--------|----------------|----------|
| `low` (default) | 3-5 | Stop at first good match |
| `medium` | 8-12 | Explore top 2 priorities fully |
| `high` / `--deep` | Unlimited | Parallel agents across all 4 tiers |

## Security Sandbox & Review

### Sandbox Structure

```
_infrastructure/scout/
  ├── catalog.json              # Solution catalog (keyword → tool mapping)
  ├── sources.json              # Configurable source list & priorities
  ├── sandbox/                  # Isolated download area
  │   └── <tool-id>/
  │       ├── _downloaded/      # Raw downloaded files
  │       ├── _review/
  │       │   ├── report.json   # Structured findings
  │       │   └── verdict.md    # Human-readable summary
  │       └── _meta.json        # Source URL, download date, version, status
  └── SKILL.md                  # Scout infrastructure skill
```

### Security Review Process

1. **Download** — fetch tool files into `sandbox/<tool-id>/_downloaded/`
2. **Spawn background security agent** — uses `security-auditor` agent type with scout-specific checklist
3. **Run 6-point scan:**

| Check | Detects | Severity |
|-------|---------|----------|
| Prompt injection | System prompt overrides, hidden directives, jailbreak patterns | RED |
| Secret exfiltration | Reads of `~/.env`, `~/.ssh/`, `~/.claude/`, env var harvesting | RED |
| Overly broad tools | Unrestricted `Bash`, `Write` to paths outside workspace, arbitrary `WebFetch` | YELLOW |
| Data leakage | Sending workspace content to external URLs, logging sensitive fields | RED |
| Supply chain risk | Unpinned dependencies, `curl \| sh` patterns, remote code execution | YELLOW |
| Permission escalation | Requesting unnecessary tools, spawning unrestricted subagents | YELLOW |

4. **Produce verdict:**

```json
{
  "verdict": "green|yellow|red",
  "tool_id": "<id>",
  "findings": [
    {
      "check": "<check-name>",
      "severity": "green|yellow|red",
      "detail": "What was found",
      "recommendation": "How to mitigate"
    }
  ],
  "safe_to_use": true,
  "warnings": ["Human-readable warning strings"]
}
```

5. **Non-blocking presentation** — RED findings get a prominent warning banner but the user can still proceed. The verdict is stored in the catalog entry and shown whenever the tool is referenced.

### Audit Trail

Every install and review is recorded in `catalog.json` with the full verdict. `scout:catalog` surfaces security ratings. The `--skip-review` flag is logged so there's always a record of bypassed scans.

## Wrapper Command Generation

### Generated Command Structure

Scout produces standard founderOS commands at `commands/scout/<tool-name>.md`:

```yaml
---
description: "[Auto-generated] <what the tool does>"
argument-hint: "<mapped arguments>"
allowed-tools: ["Read", "Bash", ...]  # Scoped to what the tool actually needs
execution-mode: background
result-format: summary
---
```

> **Note:** `scouted-from` and `security-verdict` are NOT stored in YAML frontmatter (the dispatcher only reads `execution-mode` and `result-format`). Instead, these metadata are stored in the catalog.json entry and embedded in the command body as a comment block that the command itself surfaces at runtime.

The command body includes:
1. Standard preflight check (validates tool is accessible)
2. Argument parsing mapped to the underlying tool's CLI/API
3. Scout metadata comment block with source URL and security verdict (read from catalog, surfaced in command output — not via dispatcher)
4. Structured result block per `_infrastructure/dispatcher/result-template.md`

### Workflow Integration

Scouted tools are immediately usable in P27 workflow YAML:

```yaml
steps:
  - name: "Generate video script"
    command: "/founder-os:newsletter:draft --topic='$topic' --format=script"
  - name: "Render video"
    command: "/founder-os:scout:remotion-render --script='$prev.output_path'"
  - name: "Post to social"
    command: "/founder-os:social:post --platforms=x,linkedin --media='$prev.output_path'"
```

### Promotion Flow

`scout:promote <tool-id> --to=<namespace>` transitions a tool from scout to native:
1. Moves command file to target namespace
2. Removes `[Auto-generated]` prefix
3. Updates catalog entry with new location
4. Updates workflow YAML references
5. Optionally scaffolds a domain skill

## Caching & Memory

### Layer 1 — Catalog (Zero-Token Lookup)

`_infrastructure/scout/catalog.json` stores structured entries:

```json
{
  "entries": [
    {
      "id": "remotion-video-skill",
      "keywords": ["video", "short-form video", "video rendering", "remotion"],
      "source_type": "github_repo",
      "source_url": "https://github.com/remotion-dev/remotion",
      "integration_type": "bash_wrapper",
      "security_verdict": "yellow",
      "install_status": "installed",
      "command_path": "commands/scout/remotion-render.md",
      "usage_count": 3,
      "last_used": "2026-03-14",
      "discovered": "2026-03-14",
      "description": "Programmatic video rendering with React components, has AI skill guides"
    }
  ]
}
```

### Layer 2 — Memory Engine (Semantic Recall)

After each successful `scout:find`, store via `_infrastructure/memory/`:
- **Key:** problem description (e.g., "create short form video content")
- **Value:** solution summary + catalog entry ID
- **Namespace:** `scout`

Handles fuzzy recall — "I need to make TikTok clips" matches earlier "short form video" discovery.

### Token Cost Estimates

| Action | Token cost | When |
|--------|-----------|------|
| Catalog lookup | ~0 | Every `scout:find` (first check) |
| Memory query | ~200-500 | On catalog miss, before web search |
| WebSearch (per call) | ~1,000-2,000 | Only on cache miss, budget-controlled |
| Page fetch (targeted) | ~2,000-5,000 | Only for option user selects |
| Security review | ~3,000-5,000 | Once per install, background agent |
| Wrapper generation | ~1,000-2,000 | Once per install |

**Typical flows:**
- Cache hit: **~500 tokens**
- Fresh search (low budget): **~8,000-12,000 tokens**
- Full install with review: **~15,000-20,000 tokens**

## Skills

| Skill | Location | Purpose |
|-------|----------|---------|
| `scout-research` | `skills/scout/research/SKILL.md` | Search strategy rules, query formulation, result scoring rubric |
| `scout-security` | `skills/scout/security/SKILL.md` | Security review checklist, verdict criteria, risk classification |
| `scout-integration` | `skills/scout/integration/SKILL.md` | Wrapper templates, promotion rules, workflow snippet patterns |
| `scout-common` (infra) | `_infrastructure/scout/SKILL.md` | Catalog schema, sandbox management, source configuration |

## Infrastructure

### Preflight Dependencies

```json
{
  "scout": {
    "required": ["websearch"],
    "optional": []
  }
}
```

Graceful degradation: without `websearch`, scout operates in catalog-only mode. WebFetch is a Claude built-in tool (not an external dependency) and does not need a preflight entry.

### Agent Team (--deep mode only)

```
agents/scout/config.json
  ├── researcher-skills.md    — searches skills directories
  ├── researcher-mcp.md       — searches MCP registries
  ├── researcher-github.md    — searches GitHub repos
  └── synthesizer.md          — merges, deduplicates, ranks results
```

Only activated with `scout:find --deep`. Default single-agent path uses no team.

### Notion HQ Integration

Scout results written to the Research table with `Type: "Scout Discovery"`. This requires adding `"Scout Discovery"` to the Type select options in `_infrastructure/notion-db-templates/hq-research.json` during implementation. Fields: problem description, solution found, source URL, security verdict, install status.

### CLAUDE.md Registration

New entry in the namespace quick reference table under Meta & Growth: `scout` — External tool & skill discovery with security-gated integration. This is a superpowers extension (not part of the original 30-plugin set), following the same pattern as `memory` (P31), `intel`, and `social` (P33).

## End-to-End Example

**User:** "help me create short form video content"

1. `scout:find "short form video content"` runs
2. Catalog check: empty (first time) → Memory check: no match → web search
3. WebSearch cascade:
   - Priority 1 (skills): finds remotion AI skills at `remotion.dev/docs/ai/skills`
   - High-confidence match → cascade stops early (3 searches used)
4. Scores: remotion ranks #1 (good docs, AI skills guide, active repo, React-based)
5. Presents to user: "Found Remotion — programmatic video rendering with React. Has official AI skill guides. Integration effort: medium (needs npx). Want to install?"
6. User approves → `scout:install remotion-video-skill`
7. Downloads skill files into sandbox
8. Background security agent scans → verdict: YELLOW (uses Bash for `npx remotion render`)
9. Generates `commands/scout/remotion-render.md`
10. Catalog + Memory updated
11. User shown: "Installed. Use `/founder-os:scout:remotion-render` or add to workflows. Security: YELLOW — uses Bash for video rendering."
12. Later: user runs `scout:promote remotion-render --to=content` → becomes `/founder-os:content:render-video`
