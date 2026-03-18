---
name: scout-research
description: "Search strategy, query formulation, cascade logic, result scoring rubric, and token budget controls for scout:find and scout:install"
globs: ["commands/scout/find.md", "commands/scout/install.md"]
---

# Scout Research

Search strategy, query formulation, cascade logic, result scoring, and token budget controls for discovering external tools — skills, MCP servers, GitHub repos, and CLI packages — that extend Founder OS capabilities.

## Source Priority Tiers

Search across four tiers in priority order. Higher tiers are preferred because they require less integration scaffolding. Stop early when a high-confidence match is found at a higher tier.

| Priority | Source | Search Method | Rationale |
|----------|--------|--------------|-----------|
| 1 | Claude Code Skills | WebSearch `site:skillsmp.com`, `site:github.com "SKILL.md"` | Zero-install, native format — loads directly into Claude Code |
| 2 | MCP Servers | WebSearch `site:npmjs.com "mcp-server"`, `site:github.com "mcp server"` | Low-friction install via `claude mcp add` |
| 3 | GitHub Repos with AI integration | WebSearch for repos with `/docs/ai/skills` or agent configs | Semi-native — may need thin wrapper skill |
| 4 | npm/PyPI CLI tools | WebSearch for CLI tools solving the problem | Requires Bash wrapper, most scaffolding overhead |

Skills-first ordering follows Anthropic guidance: prefer zero-install native integrations over heavier tooling. Only cascade to lower priorities when higher ones yield no relevant matches.

## Cascade Logic

Execute tier searches in order. Apply early-stop rules to minimize token spend:

1. **Search Tier 1** (Claude Code Skills). If a result scores ≥ 0.80 relevance, stop and return it. Do not proceed to Tier 2.
2. **Search Tier 2** (MCP Servers). If a result scores ≥ 0.75 relevance, stop and return it. Do not proceed to Tier 3.
3. **Search Tier 3** (GitHub Repos). If a result scores ≥ 0.70 relevance, stop and return it. Do not proceed to Tier 4.
4. **Search Tier 4** (npm/PyPI CLI). Return the best available match regardless of score, but flag integration effort as high.

When budget is `low` (default), apply strict early-stop: halt as soon as any tier returns a match above threshold. When budget is `medium` or `high`, continue cascading to collect candidates across tiers before final ranking.

When no tier returns a relevant match, report no results found and suggest the user rephrase the problem statement.

## Token Budget Controls

| Budget | WebSearch calls | Behavior |
|--------|----------------|----------|
| `low` (default) | 3–5 | Stop at first high-confidence match. Search Tier 1 first; only cascade if no match. |
| `medium` | 8–12 | Explore Tier 1 and Tier 2 fully before stopping. Cascade to Tier 3 on partial results. |
| `high` / `--deep` | Unlimited | Parallel agents across all 4 tiers. Aggregate and rank full candidate set. |

The `--deep` flag triggers `high` budget mode and activates the agent team defined in `agents/scout/`. Under `low` budget, prefer catalog and memory lookups before issuing any WebSearch calls — see Token Cost Estimates below.

## Token Cost Estimates

| Action | Token cost | When |
|--------|-----------|------|
| Catalog lookup | ~0 | Every `scout:find` (checked first before any search) |
| Memory query | ~200–500 | On catalog miss, before issuing WebSearch calls |
| WebSearch (per call) | ~1,000–2,000 | Only on cache miss; budget-controlled |
| Page fetch (targeted) | ~2,000–5,000 | Only for the option the user selects to install |

Always check the local catalog (`_infrastructure/scout/catalog.json`) first. If a match exists, return it immediately at ~0 token cost. On catalog miss, query memory for previously seen tools before issuing WebSearch calls.

## Query Formulation Rules

Construct queries using the patterns below per source type. Substitute `{{topic}}` with the user's stated problem or tool name.

### Tier 1: Claude Code Skills

```
site:skillsmp.com {{topic}}
site:github.com "SKILL.md" {{topic}}
site:github.com "claude-code" "skill" {{topic}}
```

Prefer `site:skillsmp.com` as the authoritative skills marketplace. Fall back to GitHub search when skillsmp returns sparse results. Include the word "skill" in GitHub queries to reduce false positives from unrelated repos.

### Tier 2: MCP Servers

```
site:npmjs.com "mcp-server" {{topic}}
site:github.com "mcp server" {{topic}}
site:github.com "model-context-protocol" {{topic}}
```

Use `site:npmjs.com` to surface installable packages directly. Supplement with GitHub search to catch servers not yet published to npm. Include `"model-context-protocol"` as an alternate phrase — many repos use the full name rather than the abbreviation.

### Tier 3: GitHub Repos with AI integration

```
site:github.com {{topic}} "docs/ai/skills"
site:github.com {{topic}} "agent" "skills"
site:github.com {{topic}} ".claude-plugin"
```

Target repos that already include AI skill definitions or agent configs — they are easier to wrap than raw code repos. The `.claude-plugin` fragment surfaces repos structured as Claude Code plugins.

### Tier 4: npm/PyPI CLI tools

```
site:npmjs.com {{topic}} cli
site:pypi.org {{topic}} cli
{{topic}} "command line" OR "CLI tool" site:github.com
```

When searching for CLI tools, include "cli" or "command line" to filter out library packages that cannot be invoked from a Bash wrapper skill.

### General Query Construction Rules

1. Keep queries to 3–6 words. Shorter queries improve recall on external search engines.
2. Use `site:` operators to target authoritative sources per tier before falling back to open search.
3. Wrap multi-word tool names in double quotes: `"github actions"`, `"linear api"`.
4. Append the current year to queries about actively maintained tools: `{{topic}} 2026`.
5. Use OR for alternate phrasings in a single query: `{{topic}} "mcp server" OR "mcp-server"`.
6. When the topic is ambiguous, append the domain context: `"Mercury" accounting startup` not just `Mercury`.

## Result Scoring Rubric

Score each candidate on five weighted factors. Total score range: 0.00–1.00.

| Factor | Weight | Measures |
|--------|--------|----------|
| Integration ease | 0.30 | Scaffolding needed: skill (none) → MCP server (minimal) → GitHub repo with AI config (moderate) → npm/PyPI CLI (significant) |
| Relevance | 0.25 | How directly the tool solves the stated problem. Full match = 1.0; partial = 0.5; tangential = 0.1 |
| Maintenance signal | 0.20 | GitHub stars, recency of last commit, active maintainer signals (open PRs, changelog) |
| Documentation quality | 0.15 | Presence of docs, usage examples, AI-specific guides or SKILL.md |
| Token efficiency | 0.10 | Context consumed when loaded: native skills score high; large CLI tools with verbose output score low |

### Scoring Mechanics

**Integration ease (0.30)**

| Source type | Raw score |
|-------------|-----------|
| Native Claude Code skill | 1.00 |
| MCP server | 0.75 |
| GitHub repo with AI config | 0.50 |
| npm/PyPI CLI tool | 0.25 |

**Relevance (0.25)**

Score based on keyword overlap and functional match between the tool's stated purpose and the user's problem statement:

| Match level | Raw score |
|-------------|-----------|
| Direct match — solves the stated problem exactly | 0.90–1.00 |
| Strong match — solves most of the problem | 0.65–0.89 |
| Partial match — solves a related sub-problem | 0.35–0.64 |
| Tangential — loosely related domain | 0.10–0.34 |
| No match | 0.00–0.09 |

**Maintenance signal (0.20)**

Derive a 0–1 score from:
- Stars: ≥ 500 → 1.0; 100–499 → 0.7; 10–99 → 0.4; < 10 → 0.1
- Last commit: ≤ 30 days → 1.0; ≤ 90 days → 0.7; ≤ 365 days → 0.4; > 365 days → 0.1
- Average the stars score and last-commit score for the final maintenance signal.

**Documentation quality (0.15)**

| Documentation level | Raw score |
|--------------------|-----------|
| Dedicated docs site or comprehensive README with examples | 0.90–1.00 |
| README with usage examples but no dedicated site | 0.60–0.89 |
| Basic README, minimal examples | 0.30–0.59 |
| Sparse or no documentation | 0.00–0.29 |

AI-specific guides (SKILL.md, `docs/ai/`, agent configs) add a 0.15 bonus, capped at 1.00.

**Token efficiency (0.10)**

| Profile | Raw score |
|---------|-----------|
| Native skill — loads inline, no subprocess | 1.00 |
| MCP server — structured protocol, predictable output | 0.75 |
| CLI tool with JSON output flag | 0.50 |
| CLI tool with verbose/unstructured output | 0.25 |

**Composite score**

```
score = (integration_ease × 0.30)
      + (relevance × 0.25)
      + (maintenance_signal × 0.20)
      + (documentation_quality × 0.15)
      + (token_efficiency × 0.10)
```

Rank candidates by composite score descending. Surface the top 5 results to the user. Flag any result where relevance raw score < 0.35 as "low-confidence match" regardless of composite score.

## Output Format

Return a ranked list of candidates. Each entry includes:

```
results:
  - rank: 1
    name: [tool or skill name]
    source_url: [link to repository, npm page, or skill marketplace listing]
    source_type: skill | mcp-server | github-repo | cli-tool
    effort_estimate: none | minimal | moderate | significant
    relevance_score: [0.00–1.00]
    composite_score: [0.00–1.00]
    description: [one-sentence explanation of what it does and why it matches]
    install_hint: [brief install or load instruction, e.g., "claude mcp add ..." or "npm install -g ..."]
    low_confidence: true | false
```

When the user runs `scout:find` without `--deep`, surface the single top-ranked result with a short summary and the option to install or see more alternatives. When the user explicitly requests alternatives or runs with `--all`, surface the full ranked list.

## Failure Handling

- **No results in any tier**: Report no results found. Suggest rephrasing the problem in more specific terms (e.g., "GitHub star count tracker" rather than "analytics tool"). Do not fabricate results.
- **WebSearch unavailable**: Fall back to catalog and memory lookups only. Report `web_search: "unavailable"` and note results may be incomplete.
- **Ambiguous topic**: If the user's query maps to multiple unrelated problem domains, ask a clarifying question before issuing searches. Do not guess.
- **Score ties**: When two candidates share the same composite score, prefer the higher-tier source type (skill > MCP server > GitHub repo > CLI tool).
