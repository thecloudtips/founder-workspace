---
description: "Discover external tools and skills to solve a problem"
argument-hint: "<problem-description> [--deep] [--type=skill|mcp|repo|package] [--budget=low|medium|high]"
allowed-tools: ["Read", "Write", "Bash", "WebSearch", "WebFetch", "Task"]
execution-mode: background
result-format: summary
---

# /founder-os:scout:find

Discover external tools, skills, MCP servers, packages, and repositories that solve a given problem. Searches the local catalog first, then the web. Returns ranked results with integration guidance.

## Skills

Read these skill files before proceeding:
1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/SKILL.md` — catalog schema, sandbox management, verdict system
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/scout/research/SKILL.md` — search strategy, query formulation, scoring rubric

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `text` | Yes | Problem description or capability you need (e.g., "parse PDFs into markdown") |
| `--deep` | No | Spawn agent team for exhaustive multi-source research (reads `agents/scout/config.json`) |
| `--type=skill\|mcp\|repo\|package` | No | Restrict search to a specific source tier |
| `--budget=low\|medium\|high` | No | Controls search depth: low=5 queries, medium=10 queries (default), high=20 queries |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files. If present, read `business-info.md`, `strategy.md`, and `current-data.md`. Use context to personalize results — e.g., prioritize tools that match the tech stack, budget tier, or compliance requirements of the business.

## Preflight Check

Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `scout` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust behavior:
- Required: (none)
- Optional: `websearch` (for web search cascade; without it, catalog-only mode)

**Catalog-only mode**: If `websearch` is unavailable, skip Phase 2 entirely. Warn the user:
```
[Scout] Web search unavailable — returning catalog and memory matches only.
Install or enable the WebSearch tool to enable full discovery.
```

## Step 0: Memory Context

Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `scout discovery`, `tool research`, `external skills`, plus terms extracted from the problem description.
Inject top 5 relevant memories into working context. If a previously evaluated tool matches the problem, surface it immediately.

## Intelligence: Apply Learned Patterns

Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'scout' OR plugin IS NULL) AND (command = 'scout-find' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context for this execution
3. Notify: `[Intel] Applying learned preference: "{description}"` for each pattern applied
4. If the Intelligence database does not exist, skip silently and continue execution

## Phase 1/3: Catalog & Memory Check

1. Read the catalog file at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/catalog.json`. If the file does not exist, treat as empty catalog.
2. Keyword-match the problem description against catalog entries (fields: `name`, `description`, `tags`, `problem_keywords`). If one or more catalog entries match with confidence ≥ 0.7:
   - Return the matching entries immediately as results (skip Phase 2).
   - Mark each result with `source: "catalog"`.
3. Query the Memory Engine (namespace: `scout`) for semantic matches against the problem description. If a cached result exists with confidence ≥ 0.7:
   - Return the memory-matched entries immediately (skip Phase 2).
   - Mark each result with `source: "memory"`.
4. If no high-confidence matches found, proceed to Phase 2.

## Phase 2/3: Web Search Cascade

**Skip this phase entirely if operating in catalog-only mode.**

Apply the research skill's search cascade strategy:

1. **Determine search count** from `--budget`:
   - `low`: 5 searches
   - `medium` (default): 10 searches
   - `high`: 20 searches

2. **Restrict source tier** if `--type` is specified:
   - `skill` — search `site:github.com "claude-plugin" OR "claude-skill"` and `site:npmjs.com "claude"` skill packages
   - `mcp` — search `site:github.com "model-context-protocol" OR "mcp-server"`
   - `repo` — search GitHub repositories
   - `package` — search npm, PyPI, and package registries

3. **Run search queries** using the query templates from the research skill. Stop early if a result reaches a confidence score ≥ 0.9 (high-confidence match found).

4. **Deep mode** (`--deep` flag): Read `${CLAUDE_PLUGIN_ROOT}/agents/scout/config.json` and spawn the scout agent team via the Task tool with `run_in_background: true`. Pass the problem description, budget, and type filter. Wait for agent results before proceeding to Phase 3.

5. **Fetch detail pages**: For top candidate results, use WebFetch to retrieve the tool's README or homepage for richer description extraction.

## Phase 3/3: Score & Present

Apply the scoring rubric from the research skill (5 factors: relevance, integration effort, community health, security posture, recency). Score each candidate on a 0–100 scale.

Select the top 3 results. For each result, prepare:
- **Name** — tool or package name
- **Source URL** — canonical URL (GitHub, npm, etc.)
- **Source Type** — `skill` | `mcp` | `repo` | `package`
- **Relevance Score** — 0–100
- **Integration Effort** — `low` | `medium` | `high`
- **Description** — 1–2 sentence summary of what it does and why it fits the problem
- **Next Step** — suggested install command: `scout:install <url>`

## Output

Display a ranked table of up to 3 solutions:

```
── Scout Discovery: [problem summary] ─────────────────────
Source: [catalog | memory | web]    Budget: [low/medium/high]

#1  [Name]
    Type:        [skill|mcp|repo|package]
    URL:         [source URL]
    Relevance:   [score]/100
    Effort:      [low|medium|high]
    Description: [1-2 sentence summary]
    Next step:   /founder-os:scout:install [url]

#2  [Name]
    ...

#3  [Name]
    ...

──────────────────────────────────────────────────────────
Tip: Run /founder-os:scout:catalog to see all discovered tools.
```

If no results found:
```
── Scout Discovery: No results found ─────────────────────
No catalog entries, memory matches, or web results matched "[problem]".

Suggestions:
- Try broader search terms
- Use --type to restrict to a specific source tier
- Use --budget=high for exhaustive search
```

## Notion DB Logging (Optional)

If Notion CLI is available, write a record to the `[FOS] Research` database:
- Title: problem description (truncated to 100 chars)
- Type (select): "Scout Discovery"
- Status: "Complete"
- Notes: top result name + URL
- Date: today

If Notion is unavailable, skip silently — this is optional logging.

## Self-Healing: Error Recovery

If any error occurs during this command:
1. Classify the error using rules from `_infrastructure/intelligence/self-healing/SKILL.md`
2. Check if healing is enabled: query `SELECT value FROM config WHERE key = 'healing.enabled'` from Intelligence DB
3. **Transient** (network timeout, search API error): retry with exponential backoff (2s, 5s, 15s)
4. **Recoverable** (partial results — some searches failed): continue with partial results, note missing coverage in output
5. **Degradable** (WebSearch unavailable): fall back to catalog-only mode, warn user
6. **Fatal** (required skill file missing): halt and display: `[Scout] Required skill not found: [path]. Run /founder-os:setup:verify to diagnose.`
7. Always notify: `[Heal] {description of what happened and what was done}`
8. Record error event to Intelligence DB with recovery_attempted field
9. If Intelligence DB is unavailable, fall back to existing error handling (no self-healing)

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Plugin: `scout`
- Command: `scout-find`
- Key entities: problem description, top result names and URLs
- Outcome: number of results found, source (catalog/memory/web)
- Check for emerging patterns: if the same tool type is repeatedly discovered for similar problem categories, promote to a pattern

## Intelligence: Post-Command

After execution completes, record a post_command event to the Intelligence event store:
- Event type: `post_command`
- Use the same session_id from start
- Outcome: `success` | `failure` | `degraded`
- Payload: { problem_description, results_count, source_used, top_result_url }
- Duration: milliseconds elapsed since pre_command event

Log execution metrics: search queries used, cache hit rate, time to first result, final result count. These metrics feed future routing optimizations.

## Usage Examples

```
/founder-os:scout:find "parse PDFs into markdown"
/founder-os:scout:find "send Slack notifications" --type=mcp
/founder-os:scout:find "transcribe audio to text" --deep --budget=high
/founder-os:scout:find "validate JSON schemas" --type=package --budget=low
```
