# Scout Namespace Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `scout` namespace — external tool & skill discovery with security-gated integration, catalog caching, and workflow-native wrapper generation.

**Architecture:** 7 commands, 4 skills, 1 agent team (--deep mode), infrastructure scaffolding (catalog, sandbox, sources), preflight registration, and Notion HQ integration. Skills-first search cascade with token-budget controls. Security sandbox with 6-point scan and non-blocking verdicts.

**Tech Stack:** Claude Code plugin format (markdown commands, YAML frontmatter, JSON configs), WebSearch/WebFetch for discovery, Bash for sandbox operations, Memory Engine for semantic recall.

**Spec:** `docs/superpowers/specs/2026-03-14-scout-namespace-design.md`

**Skills to use during implementation:**
- `@skill-creator` — for writing SKILL.md files
- `@plugin-dev:command-development` — for writing command .md files
- `@plugin-dev:agent-development` — for writing agent team config + agent .md files
- `@plugin-dev:skill-development` — for skill structure validation

**Review gate:** Every chunk requires review via plan-document-reviewer before commit.

---

## File Structure

### Files to Create

```
# Infrastructure (Chunk 1)
_infrastructure/scout/catalog.json                    # Solution catalog (empty initial schema)
_infrastructure/scout/sources.json                    # Search source priorities & config
_infrastructure/scout/SKILL.md                        # Infra skill: catalog schema, sandbox mgmt
_infrastructure/scout/sandbox/.gitkeep                # Sandbox directory placeholder

# Skills (Chunk 2 — parallel)
skills/scout/research/SKILL.md                        # Search strategy, query formulation, scoring
skills/scout/security/SKILL.md                        # Security checklist, verdict criteria
skills/scout/integration/SKILL.md                     # Wrapper templates, promotion rules

# Commands (Chunk 3 — parallel)
commands/scout/find.md                                # Discover external tools
commands/scout/install.md                             # Install with security review
commands/scout/catalog.md                             # Browse local catalog
commands/scout/review.md                              # Re-run security assessment
commands/scout/promote.md                             # Move to native namespace
commands/scout/remove.md                              # Uninstall scouted tool
commands/scout/sources.md                             # Configure search sources

# Agent Team (Chunk 4)
agents/scout/config.json                              # Parallel-gathering + synthesizer
agents/scout/researcher-skills.md                     # Skills directory searcher
agents/scout/researcher-mcp.md                        # MCP registry searcher
agents/scout/researcher-github.md                     # GitHub repo searcher
agents/scout/synthesizer.md                           # Merge, dedupe, rank results

# Integration (Chunk 5)
_infrastructure/notion-db-templates/hq-research.json  # MODIFY: add "Scout Discovery" type
_infrastructure/preflight/dependency-registry.json    # MODIFY: add scout namespace entry
```

### Files to Modify

```
CLAUDE.md                                             # Add scout to namespace quick reference
```

---

## Chunk 1: Infrastructure Foundation

**Wave:** 1 (must complete before Chunks 2-4)
**Subagent count:** 1
**Estimated steps:** 20

### Task 1.1: Catalog Schema

**Files:**
- Create: `_infrastructure/scout/catalog.json`

- [ ] **Step 1: Write the catalog.json with empty entries array and schema**

```json
{
  "$schema": "scout-catalog",
  "$version": "1.0",
  "entries": []
}
```

Reference spec Section "Caching & Memory > Layer 1" for the entry schema. Each entry has: `id`, `keywords`, `source_type`, `source_url`, `integration_type`, `security_verdict`, `install_status`, `command_path`, `usage_count`, `last_used`, `discovered`, `description`.

- [ ] **Step 2: Verify file is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('_infrastructure/scout/catalog.json','utf8')); console.log('OK')"`
Expected: `OK`

### Task 1.2: Sources Configuration

**Files:**
- Create: `_infrastructure/scout/sources.json`

- [ ] **Step 3: Write sources.json with default priority tiers**

```json
{
  "$schema": "scout-sources",
  "$version": "1.0",
  "sources": [
    {
      "id": "claude-skills",
      "priority": 1,
      "type": "skill",
      "label": "Claude Code Skills",
      "search_patterns": [
        "site:skillsmp.com",
        "site:github.com \"SKILL.md\""
      ],
      "enabled": true
    },
    {
      "id": "mcp-servers",
      "priority": 2,
      "type": "mcp",
      "label": "MCP Servers",
      "search_patterns": [
        "site:npmjs.com \"mcp-server\"",
        "site:github.com \"mcp server\""
      ],
      "enabled": true
    },
    {
      "id": "github-ai-repos",
      "priority": 3,
      "type": "repo",
      "label": "GitHub Repos with AI Integration",
      "search_patterns": [
        "github.com docs/ai/skills",
        "github.com agent config"
      ],
      "enabled": true
    },
    {
      "id": "cli-packages",
      "priority": 4,
      "type": "package",
      "label": "npm/PyPI CLI Tools",
      "search_patterns": [],
      "enabled": true
    }
  ],
  "custom_sources": []
}
```

- [ ] **Step 4: Verify file is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('_infrastructure/scout/sources.json','utf8')); console.log('OK')"`
Expected: `OK`

### Task 1.3: Sandbox Directory

**Files:**
- Create: `_infrastructure/scout/sandbox/.gitkeep`

- [ ] **Step 5: Create sandbox directory with .gitkeep**

```bash
mkdir -p _infrastructure/scout/sandbox
touch _infrastructure/scout/sandbox/.gitkeep
```

### Task 1.4: Infrastructure Skill (scout-common)

**Files:**
- Create: `_infrastructure/scout/SKILL.md`

Use `@skill-creator` to write this skill. It covers:
- Catalog schema documentation (entry fields, types, validation)
- Sandbox management (directory layout, cleanup rules)
- Source configuration (how to add/remove/reorder sources)
- Catalog lookup function (keyword matching against entries)

- [ ] **Step 6: Invoke @skill-creator to create the infrastructure skill**

The skill must follow the pattern in `_infrastructure/late-skills/late-common/SKILL.md`:
- YAML frontmatter with `name`, `description`
- No `globs` field (infra skills don't use globs)
- Sections: Catalog Schema, Sandbox Management, Source Configuration, Catalog Operations

Key content to include:

```markdown
---
name: scout-common
description: "Core scout infrastructure: catalog schema, sandbox management, source configuration, and catalog lookup operations"
---

# Scout Common Infrastructure

## Catalog Schema

Each entry in `_infrastructure/scout/catalog.json` follows this structure:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique tool identifier (kebab-case) |
| keywords | string[] | Search terms for catalog lookup |
| source_type | enum | "skill" \| "mcp" \| "github_repo" \| "package" |
| source_url | string | Original source URL |
| integration_type | enum | "skill_native" \| "mcp_add" \| "bash_wrapper" |
| security_verdict | enum | "green" \| "yellow" \| "red" \| "unreviewed" |
| install_status | enum | "installed" \| "removed" \| "pending" |
| command_path | string | Relative path to generated wrapper command |
| usage_count | number | Times the tool has been invoked |
| last_used | string | ISO date of last use |
| discovered | string | ISO date of discovery |
| description | string | What the tool does |

## Sandbox Layout

Downloaded tools live in isolated sandbox directories:

```
_infrastructure/scout/sandbox/<tool-id>/
  ├── _downloaded/        # Raw downloaded files (READ-ONLY after download)
  ├── _review/
  │   ├── report.json     # Structured security findings
  │   └── verdict.md      # Human-readable summary
  └── _meta.json          # Source URL, download date, version, status
```

### Cleanup Rules
- Sandbox entries for removed tools: delete entire `<tool-id>/` directory
- Sandbox entries for promoted tools: keep `_review/` for audit trail, delete `_downloaded/`
- `--keep-catalog` on remove: catalog entry stays, sandbox deleted

## Source Configuration

Sources are defined in `_infrastructure/scout/sources.json`. Priority 1 = searched first.

### Adding Custom Sources
Append to the `custom_sources` array:
```json
{
  "id": "my-source",
  "priority": 5,
  "type": "repo",
  "label": "My Custom Source",
  "search_patterns": ["site:example.com"],
  "enabled": true
}
```

Custom sources are always searched after built-in sources (priority 5+).

## Catalog Lookup

Before web search, check catalog by keyword match:
1. Read `_infrastructure/scout/catalog.json`
2. For each entry, check if any `keywords` array element matches the user's query (case-insensitive substring)
3. If match found with `install_status: "installed"`: return immediately (zero token cost)
4. If match found with `install_status: "removed"`: mention it was previously removed, continue search

## Generating Tool IDs

Tool IDs are kebab-case, derived from the tool name:
- `remotion-video-skill` (from "Remotion Video")
- `mcp-server-github` (from "@modelcontextprotocol/server-github")
- Strip org prefixes (@org/), version suffixes, file extensions
```

- [ ] **Step 7: Verify SKILL.md has valid YAML frontmatter**

Run: `head -5 _infrastructure/scout/SKILL.md`
Expected: Lines starting with `---`, containing `name:` and `description:`

### Task 1.5: Preflight Registry Update

**Files:**
- Modify: `_infrastructure/preflight/dependency-registry.json`

- [ ] **Step 8: Add scout namespace to dependency-registry.json**

Add to the `namespaces` object:

```json
"scout": {
  "required": [],
  "optional": ["websearch"]
}
```

> **Note:** `websearch` is optional, not required. Per spec: "without `websearch`, scout operates in catalog-only mode." The `find.md` command implements this graceful degradation path (catalog + memory lookup only, no web search cascade).

- [ ] **Step 9: Verify JSON is still valid after edit**

Run: `node -e "const d=JSON.parse(require('fs').readFileSync('_infrastructure/preflight/dependency-registry.json','utf8')); console.log('namespaces:', Object.keys(d.namespaces).length, 'has scout:', 'scout' in d.namespaces)"`
Expected: `namespaces: 34 has scout: true` (or similar count)

- [ ] **Step 10: Commit infrastructure foundation**

```bash
git add _infrastructure/scout/ _infrastructure/preflight/dependency-registry.json
git commit -m "feat(scout): add infrastructure foundation — catalog, sources, sandbox, preflight"
```

---

## Chunk 2: Domain Skills

**Wave:** 2 (depends on Chunk 1; all 3 skills are independent — run in parallel)
**Subagent count:** 3 (one per skill)
**Estimated steps:** 15

Use `@skill-creator` for each skill. Follow the pattern from `skills/social/platform-adaptation/SKILL.md`:
- YAML frontmatter: `name`, `description`, `globs` (pointing to commands/scout/*.md)
- Markdown body with tables, code examples, clear rules

### Task 2.1: Scout Research Skill (Subagent A)

**Files:**
- Create: `skills/scout/research/SKILL.md`

- [ ] **Step 1: Invoke @skill-creator to create research skill**

Content must cover (from spec "Search Pipeline" section):
- Source priority table (4 tiers: skills → MCP → GitHub → CLI)
- Cascade logic (stop early on high-confidence match)
- Result scoring rubric (5 factors with weights: integration 0.30, relevance 0.25, maintenance 0.20, docs 0.15, token efficiency 0.10)
- Token budget controls (low/medium/high behavior)
- Query formulation rules (how to construct WebSearch queries per source type)
- Output format (ranked list with: name, source URL, source type, effort estimate, relevance score, description)

```yaml
---
name: scout-research
description: "Search strategy, query formulation, cascade logic, result scoring rubric, and token budget controls for scout:find and scout:install"
globs: ["commands/scout/find.md", "commands/scout/install.md"]
---
```

Include token cost estimate table from spec (Section "Caching & Memory > Token Cost Estimates") for implementer awareness.

- [ ] **Step 2: Verify skill frontmatter**

Run: `head -5 skills/scout/research/SKILL.md`

### Task 2.2: Scout Security Skill (Subagent B)

**Files:**
- Create: `skills/scout/security/SKILL.md`

- [ ] **Step 3: Invoke @skill-creator to create security skill**

Content must cover (from spec "Security Sandbox & Review" section):
- 6-point security scan checklist (prompt injection, secret exfil, overly broad tools, data leakage, supply chain risk, permission escalation)
- Severity classification (RED/YELLOW/GREEN per check)
- Verdict schema (JSON structure with findings array)
- Non-blocking presentation rules (RED = warning banner, user can still proceed)
- Audit trail requirements (every install/review logged in catalog)
- `--skip-review` behavior (logged, never silent)

```yaml
---
name: scout-security
description: "Security review checklist, 6-point scan procedure, verdict criteria, severity classification, and audit trail rules for scout:install and scout:review"
globs: ["commands/scout/install.md", "commands/scout/review.md"]
---
```

- [ ] **Step 4: Verify skill frontmatter**

Run: `head -5 skills/scout/security/SKILL.md`

### Task 2.3: Scout Integration Skill (Subagent C)

**Files:**
- Create: `skills/scout/integration/SKILL.md`

- [ ] **Step 5: Invoke @skill-creator to create integration skill**

Content must cover (from spec "Wrapper Command Generation" section):
- Wrapper command template (YAML frontmatter + body structure)
- Frontmatter rules (only standard 5 fields; metadata in catalog + comment block)
- Argument mapping (how to map underlying tool CLI/API args to command args)
- Promotion flow (5 steps: move file, remove prefix, update catalog, update workflows, scaffold skill)
- Workflow YAML integration (how scouted tools plug into P27 workflow steps)
- Scout metadata comment block format (embedded in command body, not frontmatter)

```yaml
---
name: scout-integration
description: "Wrapper command templates, promotion rules, workflow snippet patterns, and metadata embedding for scout:install, scout:promote, and scout:remove"
globs: ["commands/scout/install.md", "commands/scout/promote.md", "commands/scout/remove.md"]
---
```

- [ ] **Step 6: Verify skill frontmatter**

Run: `head -5 skills/scout/integration/SKILL.md`

- [ ] **Step 7: Commit all skills**

```bash
git add skills/scout/
git commit -m "feat(scout): add domain skills — research, security, integration"
```

---

## Chunk 3: Commands

**Wave:** 2 (depends on Chunk 1; runs after Chunk 2 skills are created — commands reference skill content)
**Subagent count:** 3 (split into 3 groups of 2-3 commands each)
**Estimated steps:** 35

> **Dependency note:** Commands reference skill files in their Skills section and their body phases use skill-defined concepts (scoring rubric, security checklist, wrapper templates). Chunk 2 skill files should be created first so command authors can reference actual skill content. If running in parallel with Chunk 2, command subagents must write command bodies from the **spec** directly (not from skill files) and accept that skill section names may need minor post-hoc alignment.

Use `@plugin-dev:command-development` for each command. Follow the exact pattern from `commands/social/post.md`:
- YAML frontmatter: `description`, `argument-hint`, `allowed-tools`, `execution-mode`, `result-format`
- Skills section (list skill files to read before execution)
- Arguments table
- Business Context (optional — check `_infrastructure/context/active/`)
- Preflight Check (reference `_infrastructure/preflight/SKILL.md` for namespace `scout`)
- Step 0: Memory Context (query memory engine, inject top 5 memories)
- Intelligence: Apply Learned Patterns (check for namespace optimizations)
- Multi-phase execution body
- Output section
- Notion DB Logging (optional)
- Self-Healing: Error Recovery (classify: transient/recoverable/degradable/fatal)
- Final Step: Observation Logging (record via `_infrastructure/memory/pattern-detection/SKILL.md`)
- Intelligence: Post-Command (log execution metrics)

**CRITICAL: Every command — including simple ones like `catalog` and `sources` — MUST include ALL sections above.** This is a universal founderOS pattern. No exceptions.

### Task 3.1: Core Discovery Commands (Subagent D)

**Files:**
- Create: `commands/scout/find.md`
- Create: `commands/scout/catalog.md`
- Create: `commands/scout/sources.md`

#### scout:find

- [ ] **Step 1: Write find.md command using @plugin-dev:command-development**

Frontmatter from spec:
```yaml
---
description: "Discover external tools and skills to solve a problem"
argument-hint: "<problem-description> [--deep] [--type=skill|mcp|repo|package] [--budget=low|medium|high]"
allowed-tools: ["Read", "Write", "Bash", "WebSearch", "WebFetch", "Task"]
execution-mode: background
result-format: summary
---
```

Skills section:
1. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/SKILL.md` — catalog schema, sandbox mgmt
2. `${CLAUDE_PLUGIN_ROOT}/skills/scout/research/SKILL.md` — search strategy, scoring

Arguments table: `text` (positional, required), `--deep`, `--type`, `--budget`

Preflight degradation: if `websearch` unavailable, operate in **catalog-only mode** — skip Phase 2, return only catalog/memory matches. Warn user that web search is disabled.

Execution phases:
- Phase 1/3: Catalog & Memory Check — read catalog.json, keyword match. If hit → return immediately. Else query Memory Engine (namespace: `scout`). If semantic match → return cached result.
- Phase 2/3: Web Search Cascade — (skipped in catalog-only mode). Follow research skill cascade logic. Budget controls number of searches. Stop early on high-confidence match. If `--type` specified, restrict to that source tier. If `--deep`, spawn agent team (read `agents/scout/config.json`).
- Phase 3/3: Score & Present — apply scoring rubric (5 factors). Present top 3 results with: name, source URL, source type, integration effort, relevance score, description. Suggest `scout:install <url>` for chosen result.

Output: ranked table of up to 3 solutions.

Notion DB: write to `[FOS] Research` with Type="Scout Discovery".

- [ ] **Step 2: Verify find.md frontmatter is valid YAML**

Run: `head -8 commands/scout/find.md`

#### scout:catalog

- [ ] **Step 3: Write catalog.md command**

Frontmatter from spec:
```yaml
---
description: "Browse discovered tools and their security ratings"
argument-hint: "[search-term] [--verdict=green|yellow|red] [--type=skill|mcp|repo|package] [--installed]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---
```

Skills: `_infrastructure/scout/SKILL.md` only.

Include ALL universal sections: Business Context, Preflight Check (namespace `scout`), Step 0 Memory Context, Intelligence patterns, Error Recovery, Observation Logging, Intelligence Post-Command.

Core logic: read catalog.json, filter by flags, format as table. No web access needed.

Output table columns: ID, Name, Type, Verdict, Status, Last Used, Usage Count.

- [ ] **Step 4: Verify catalog.md frontmatter**

Run: `head -8 commands/scout/catalog.md`

#### scout:sources

- [ ] **Step 5: Write sources.md command**

Frontmatter from spec:
```yaml
---
description: "View or configure scout search sources"
argument-hint: "[--add=<url>] [--remove=<source-id>] [--reorder]"
allowed-tools: ["Read", "Write"]
execution-mode: foreground
result-format: full
---
```

Skills: `_infrastructure/scout/SKILL.md` only.

Include ALL universal sections: Business Context, Preflight Check (namespace `scout`), Step 0 Memory Context, Intelligence patterns, Error Recovery, Observation Logging, Intelligence Post-Command.

Core logic: read sources.json, apply mutations if flags provided, write back. Display current source list with priorities.

- [ ] **Step 6: Verify sources.md frontmatter**

Run: `head -8 commands/scout/sources.md`

- [ ] **Step 7: Commit discovery commands**

```bash
git add commands/scout/find.md commands/scout/catalog.md commands/scout/sources.md
git commit -m "feat(scout): add discovery commands — find, catalog, sources"
```

### Task 3.2: Install & Security Commands (Subagent E)

**Files:**
- Create: `commands/scout/install.md`
- Create: `commands/scout/review.md`

#### scout:install

- [ ] **Step 8: Write install.md command using @plugin-dev:command-development**

Frontmatter from spec:
```yaml
---
description: "Install a discovered tool with security review"
argument-hint: "<tool-url-or-catalog-id> [--skip-review] [--namespace=<target>]"
allowed-tools: ["Read", "Write", "Bash", "WebFetch", "Task"]
execution-mode: background
result-format: summary
---
```

Skills section:
1. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/SKILL.md` — catalog, sandbox
2. `${CLAUDE_PLUGIN_ROOT}/skills/scout/security/SKILL.md` — security checklist
3. `${CLAUDE_PLUGIN_ROOT}/skills/scout/integration/SKILL.md` — wrapper templates

Execution phases (from spec Section "scout:install > Steps"):
- Phase 1/4: Download — fetch tool files into `_infrastructure/scout/sandbox/<tool-id>/_downloaded/`. Write `_meta.json` with source URL, download date, version.
- Phase 2/4: Security Review — unless `--skip-review`. Spawn background `security-auditor` agent type (from CLAUDE.md available agents list) via Task tool with scout-specific checklist from the security skill. Run 6-point scan per security skill. Produce verdict JSON at `_review/report.json` and `_review/verdict.md`.
- Phase 3/4: Generate Wrapper — create `commands/scout/<tool-name>.md` per integration skill template. Scope `allowed-tools` to what the tool actually needs. Add scout metadata comment block in body.
- Phase 4/4: Register — add entry to catalog.json. Store in Memory Engine (namespace: `scout`, key: problem description, value: solution + catalog ID). Present result with security verdict.

If `--skip-review`: log bypass in catalog entry, show warning, proceed without scan.
If `--namespace`: pre-set target namespace in catalog for future promote.

- [ ] **Step 9: Verify install.md frontmatter**

Run: `head -8 commands/scout/install.md`

#### scout:review

- [ ] **Step 10: Write review.md command**

Frontmatter from spec:
```yaml
---
description: "Re-run security review on a scouted tool"
argument-hint: "<tool-id>"
allowed-tools: ["Read", "Write", "Bash", "Task"]
execution-mode: background
result-format: summary
---
```

Skills: security skill + infra skill.

Include ALL universal sections: Business Context, Preflight Check, Step 0 Memory Context, Intelligence patterns, Error Recovery, Observation Logging, Intelligence Post-Command.

Core logic: find tool in catalog → read sandbox files → spawn `security-auditor` agent type (see C3 note below) → overwrite `_review/report.json` and `_review/verdict.md` → update catalog verdict → present new verdict.

- [ ] **Step 11: Verify review.md frontmatter**

Run: `head -8 commands/scout/review.md`

- [ ] **Step 12: Commit install & security commands**

```bash
git add commands/scout/install.md commands/scout/review.md
git commit -m "feat(scout): add install and review commands"
```

### Task 3.3: Lifecycle Commands (Subagent F)

**Files:**
- Create: `commands/scout/promote.md`
- Create: `commands/scout/remove.md`

#### scout:promote

- [ ] **Step 13: Write promote.md command using @plugin-dev:command-development**

Frontmatter from spec:
```yaml
---
description: "Promote a scouted tool to a native namespace"
argument-hint: "<tool-id> --to=<namespace> [--command-name=<name>]"
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---
```

Skills: integration skill + infra skill.

Include ALL universal sections: Business Context, Preflight Check, Step 0 Memory Context, Intelligence patterns, Error Recovery, Observation Logging, Intelligence Post-Command.

Execution (from spec Section "scout:promote > Steps"):
1. Move `commands/scout/<tool-name>.md` → `commands/<namespace>/<new-name>.md`
2. Remove `[Auto-generated]` prefix from description
3. Update catalog entry with `install_status: "promoted"`, new `command_path`
4. Search for workflow YAML files referencing old path, update them
5. Optionally scaffold domain skill at `skills/<namespace>/<skill-name>/SKILL.md`

Foreground because it's a structural change the user should see happening.

- [ ] **Step 14: Verify promote.md frontmatter**

Run: `head -8 commands/scout/promote.md`

#### scout:remove

- [ ] **Step 15: Write remove.md command**

Frontmatter from spec:
```yaml
---
description: "Remove a scouted tool and its artifacts"
argument-hint: "<tool-id> [--keep-catalog]"
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---
```

Skills: integration skill + infra skill.

Include ALL universal sections: Business Context, Preflight Check, Step 0 Memory Context, Intelligence patterns, Error Recovery, Observation Logging, Intelligence Post-Command.

Core logic: delete wrapper command, delete sandbox directory, delete catalog entry (unless `--keep-catalog`), delete Memory Engine entry.

- [ ] **Step 16: Verify remove.md frontmatter**

Run: `head -8 commands/scout/remove.md`

- [ ] **Step 17: Commit lifecycle commands**

```bash
git add commands/scout/promote.md commands/scout/remove.md
git commit -m "feat(scout): add promote and remove commands"
```

---

## Chunk 4: Agent Team (--deep mode)

**Wave:** 3 (depends on Chunks 1-2 for skill references)
**Subagent count:** 1
**Estimated steps:** 12

Use `@plugin-dev:agent-development` for the agent team. The scout agent team uses the **parallel-gathering** pattern. Read `agents/briefing/config.json` as the primary reference (it uses parallel-gathering with gatherers + lead). Also read `agents/social/config.json` for general agent config conventions (pipeline pattern — different but shares the JSON schema).

### Task 4.1: Agent Team Config

**Files:**
- Create: `agents/scout/config.json`

- [ ] **Step 1: Write config.json using parallel-gathering pattern**

Pattern: parallel-gathering (3 researcher agents search simultaneously, synthesizer merges).

```json
{
  "pattern": "parallel-gathering",
  "description": "Deep scout research: parallel agents search skills, MCP, and GitHub simultaneously. Synthesizer merges, deduplicates, and ranks. Activated via scout:find --deep.",
  "execution": "parallel",
  "agents": [
    {
      "name": "researcher-skills",
      "role": "Search Claude Code skills directories and repositories",
      "file": "researcher-skills.md",
      "parallel_group": "gatherers",
      "tools": ["WebSearch", "WebFetch", "Read"],
      "skills": ["scout-research"]
    },
    {
      "name": "researcher-mcp",
      "role": "Search MCP server registries and npm packages",
      "file": "researcher-mcp.md",
      "parallel_group": "gatherers",
      "tools": ["WebSearch", "WebFetch", "Read"],
      "skills": ["scout-research"]
    },
    {
      "name": "researcher-github",
      "role": "Search GitHub repos with AI integration and CLI tools",
      "file": "researcher-github.md",
      "parallel_group": "gatherers",
      "tools": ["WebSearch", "WebFetch", "Read"],
      "skills": ["scout-research"]
    },
    {
      "name": "synthesizer",
      "role": "Merge, deduplicate, and rank results from all researchers",
      "file": "synthesizer.md",
      "parallel_group": "lead",
      "tools": ["Read", "Write"],
      "skills": ["scout-research"]
    }
  ],
  "coordination": {
    "parallel_group_execution": "all_gatherers_then_lead",
    "merge_strategy": "lead_agent_synthesizes",
    "timeout_per_agent": "60s",
    "failure_handling": "continue_with_partial_results",
    "minimum_gatherers_required": 1
  },
  "observability": {
    "log_agent_output": true,
    "report_timing": true,
    "report_partial_failures": true
  }
}
```

- [ ] **Step 2: Verify config.json is valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('agents/scout/config.json','utf8')); console.log('OK')"`

### Task 4.2: Researcher Agents

**Files:**
- Create: `agents/scout/researcher-skills.md`
- Create: `agents/scout/researcher-mcp.md`
- Create: `agents/scout/researcher-github.md`

- [ ] **Step 3: Write researcher-skills.md using @plugin-dev:agent-development**

Follow pattern from `agents/social/publisher-agent.md` (YAML frontmatter + markdown body).

```yaml
---
name: researcher-skills
description: Searches Claude Code skills directories and skill repositories
model: inherit
color: blue
tools: ["WebSearch", "WebFetch", "Read"]
---
```

Core responsibilities:
1. Read `scout-research` skill for query formulation rules
2. Receive problem description from coordinator
3. Search Priority 1 sources: `site:skillsmp.com`, `site:github.com "SKILL.md"`
4. For each result: extract name, URL, description, assess integration ease (skill = native, low effort)
5. Return structured results array

Input schema: `{ "query": "...", "budget": "low|medium|high" }`
Output schema: `{ "status": "complete", "source_tier": 1, "results": [{ "name": "...", "url": "...", "type": "skill", "description": "...", "confidence": 0.0-1.0, "integration_effort": "low|medium|high" }] }`

- [ ] **Step 4: Write researcher-mcp.md**

Same pattern as researcher-skills but for Priority 2 sources:
- `site:npmjs.com "mcp-server"`
- `site:github.com "mcp server"`
- Source tier: 2, type: "mcp"

- [ ] **Step 5: Write researcher-github.md**

Same pattern for Priority 3-4 sources:
- GitHub repos with AI integration (Priority 3)
- npm/PyPI CLI tools (Priority 4)
- Source tiers: 3-4, types: "repo" or "package"

### Task 4.3: Synthesizer Agent

**Files:**
- Create: `agents/scout/synthesizer.md`

- [ ] **Step 6: Write synthesizer.md using @plugin-dev:agent-development**

```yaml
---
name: synthesizer
description: Merges, deduplicates, and ranks results from all research agents
model: inherit
color: purple
tools: ["Read", "Write"]
---
```

Core responsibilities:
1. Read `scout-research` skill for scoring rubric
2. Receive results arrays from all researcher agents
3. Deduplicate by URL (same tool found by multiple researchers)
4. Apply 5-factor scoring rubric (integration 0.30, relevance 0.25, maintenance 0.20, docs 0.15, token efficiency 0.10)
5. Rank by weighted score
6. Return top 3 results

Input schema: `{ "query": "...", "researcher_results": [{ ... }] }`
Output schema: `{ "status": "complete", "ranked_results": [top 3 with scores], "total_found": N, "search_stats": { "queries_used": N, "tiers_searched": [...] } }`

- [ ] **Step 7: Commit agent team**

```bash
git add agents/scout/
git commit -m "feat(scout): add agent team — 3 researchers + synthesizer (--deep mode)"
```

---

## Chunk 5: Integration & Registration

**Wave:** 3 (parallel with Chunk 4)
**Subagent count:** 1
**Estimated steps:** 10

### Task 5.1: Notion HQ Research Template Update

**Files:**
- Modify: `_infrastructure/notion-db-templates/hq-research.json`

- [ ] **Step 1: Read the current hq-research.json**

Run: Read tool on `_infrastructure/notion-db-templates/hq-research.json`

- [ ] **Step 2: Add "Scout Discovery" to the Type select options**

In the `properties.Type.options` array, add `"Scout Discovery"` if not already present.

- [ ] **Step 3: Verify JSON is valid after edit**

Run: `node -e "JSON.parse(require('fs').readFileSync('_infrastructure/notion-db-templates/hq-research.json','utf8')); console.log('OK')"`

### Task 5.2: CLAUDE.md Registration

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 4: Read current CLAUDE.md**

Find the Namespace Quick Reference table.

- [ ] **Step 5: Add scout entry to the namespace table**

Add after the `social` row (or in the Meta & Growth section):

```
| -- | Scout | `scout` | find, install, catalog, review, promote, remove, sources | WebSearch, WebFetch | Research (Scout Discovery) |
```

Follow the existing table format exactly. Scout is a superpowers extension (like memory, intel, social), not a numbered plugin.

- [ ] **Step 6: Verify CLAUDE.md is syntactically correct**

Visually check the table alignment.

### Task 5.3: Notion DB Template for Scout Discoveries

- [ ] **Step 7: Add notes to hq-research.json for scout integration**

Add to the `notes` field: "Scout namespace writes discoveries with Type='Scout Discovery'. Fields used: Title (problem description), Source (source URL), Status (Reviewed/Installed/Promoted/Removed)."

- [ ] **Step 8: Commit integration changes**

```bash
git add _infrastructure/notion-db-templates/hq-research.json CLAUDE.md
git commit -m "feat(scout): register namespace in CLAUDE.md and Notion HQ template"
```

---

## Chunk 6: Validation & Quality Gate

**Wave:** 4 (after all implementation chunks complete)
**Subagent count:** 1
**Estimated steps:** 12

### Task 6.1: Structural Validation

- [ ] **Step 1: Verify all expected files exist**

```bash
# Commands (7)
ls commands/scout/find.md commands/scout/install.md commands/scout/catalog.md commands/scout/review.md commands/scout/promote.md commands/scout/remove.md commands/scout/sources.md

# Skills (3 domain + 1 infra)
ls skills/scout/research/SKILL.md skills/scout/security/SKILL.md skills/scout/integration/SKILL.md _infrastructure/scout/SKILL.md

# Agents (config + 4 agents)
ls agents/scout/config.json agents/scout/researcher-skills.md agents/scout/researcher-mcp.md agents/scout/researcher-github.md agents/scout/synthesizer.md

# Infrastructure
ls _infrastructure/scout/catalog.json _infrastructure/scout/sources.json _infrastructure/scout/sandbox/.gitkeep
```

Expected: all files listed without error.

### Task 6.2: Frontmatter Validation

- [ ] **Step 2: Verify all commands have valid frontmatter with required fields**

For each command file, verify it contains:
- `description`
- `argument-hint`
- `allowed-tools`
- `execution-mode` (background or foreground)
- `result-format` (summary or full)

```bash
for f in commands/scout/*.md; do
  echo "=== $f ==="
  head -8 "$f"
  echo
done
```

- [ ] **Step 3: Verify execution modes match spec**

| Command | Expected execution-mode | Expected result-format |
|---------|------------------------|----------------------|
| find | background | summary |
| install | background | summary |
| catalog | background | summary |
| review | background | summary |
| promote | foreground | full |
| remove | foreground | full |
| sources | foreground | full |

### Task 6.3: JSON Validation

- [ ] **Step 4: Validate all JSON files**

```bash
for f in _infrastructure/scout/catalog.json _infrastructure/scout/sources.json agents/scout/config.json _infrastructure/preflight/dependency-registry.json _infrastructure/notion-db-templates/hq-research.json; do
  echo -n "$f: "
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('OK')" 2>&1
done
```

Expected: all OK.

### Task 6.4: Cross-Reference Checks

- [ ] **Step 5: Verify skill references in commands point to existing files**

For each command, extract skill file paths from the "Skills" section and verify they exist.

- [ ] **Step 6: Verify agent config references existing agent files**

```bash
node -e "
const c = JSON.parse(require('fs').readFileSync('agents/scout/config.json','utf8'));
c.agents.forEach(a => {
  const fs = require('fs');
  const p = 'agents/scout/' + a.file;
  console.log(p + ': ' + (fs.existsSync(p) ? 'OK' : 'MISSING'));
});
"
```

### Task 6.5: Convention Compliance

- [ ] **Step 7: Check commands follow founderOS universal patterns**

Verify each command includes:
- [ ] Skills section (read skill files before execution)
- [ ] Business Context section (check `_infrastructure/context/active/`)
- [ ] Preflight Check section (reference `_infrastructure/preflight/SKILL.md`)
- [ ] Step 0: Memory Context (query memory engine)
- [ ] Intelligence: Apply Learned Patterns section
- [ ] Self-Healing: Error Recovery section
- [ ] Final Step: Observation Logging
- [ ] Intelligence: Post-Command section

- [ ] **Step 8: Check no disallowed patterns**

- No custom frontmatter fields beyond the standard 5
- No `Glob` in allowed-tools arrays
- No hardcoded API keys or secrets
- Uses `${CLAUDE_PLUGIN_ROOT}` for all paths

### Task 6.6: Spec Compliance Summary

- [ ] **Step 9: Compare deliverables against spec checklist**

| Spec Section | Implemented | File(s) |
|-------------|-------------|---------|
| 7 commands | ✅/❌ | commands/scout/*.md |
| Search pipeline (4-tier cascade) | ✅/❌ | skills/scout/research/SKILL.md |
| Security sandbox & review | ✅/❌ | skills/scout/security/SKILL.md |
| Wrapper command generation | ✅/❌ | skills/scout/integration/SKILL.md |
| Catalog caching | ✅/❌ | _infrastructure/scout/catalog.json |
| Memory Engine integration | ✅/❌ | commands reference memory skill |
| Agent team (--deep) | ✅/❌ | agents/scout/ |
| Notion HQ integration | ✅/❌ | hq-research.json updated |
| Preflight registration | ✅/❌ | dependency-registry.json updated |
| CLAUDE.md registration | ✅/❌ | CLAUDE.md updated |

- [ ] **Step 10: Report validation results**

Produce a pass/fail summary. Any failures block the final commit.

---

## Execution Summary

### Wave Structure (optimized for claude-flow swarm)

```
Wave 1: [Chunk 1] Infrastructure Foundation
         └── 1 subagent, ~10 steps

Wave 2a: [Chunk 2] Skills
          └── 3 subagents (A,B,C), ~15 steps

Wave 2b: [Chunk 3] Commands (after Chunk 2 skills exist)
          └── 3 subagents (D,E,F), ~35 steps

Wave 3: [Chunk 4] Agent Team ────── parallel ──── [Chunk 5] Integration
         └── 1 subagent                              └── 1 subagent
             ~12 steps                                    ~10 steps

Wave 4: [Chunk 6] Validation
         └── 1 subagent, ~12 steps
```

### Total Stats
- **Chunks:** 6
- **Tasks:** 17
- **Steps:** ~94
- **Max parallel subagents:** 6 (Wave 2)
- **Review gates:** 6 (one per chunk, before commit)
- **Commits:** 6 incremental + 1 final merge if on feature branch
