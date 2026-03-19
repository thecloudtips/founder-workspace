# Scout Agent Team

> Parallel gathering: Three researcher agents search different source tiers simultaneously, then a synthesizer merges, deduplicates, and ranks the results.

## Overview

The Scout team helps you find tools, skills, MCP servers, and packages that can extend your Founder OS setup. When you need a capability that is not built in -- say, a Jira integration, a PDF generation tool, or a sentiment analysis skill -- the Scout team searches across multiple source tiers in parallel and returns ranked recommendations with integration effort estimates.

In single-agent mode (the default for `/founder-os:scout:find`), a single agent performs a sequential search across sources. The `--deep` flag activates the full four-agent team, which is where the parallel-gathering pattern shines: three researcher agents search their assigned source tiers simultaneously, and the synthesizer merges their findings into a deduplicated, scored, and ranked result set. The parallel approach is faster for broad searches and produces better results because each researcher is specialized for its source tier.

The team uses a 5-factor scoring rubric (integration effort, relevance, maintenance signal, documentation quality, and token efficiency) to rank candidates. The output is the top 3 results with full score breakdowns, giving you enough information to make an informed decision about what to install.

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| Skills Researcher | Worker (Gatherer) | Searches Priority 1 sources: Claude Code skill repositories (skillsmp.com) and GitHub repos containing SKILL.md files. Skills are native to Claude Code with low integration effort, so they rank highest when available. |
| MCP Researcher | Worker (Gatherer) | Searches Priority 2 sources: MCP server registries on npm and GitHub repos tagged as MCP servers. Extracts package details, download counts, and last-publish dates to assess maintenance health. |
| GitHub Researcher | Worker (Gatherer) | Searches Priority 3-4 sources: GitHub repos with AI integration (Anthropic, OpenAI, LLM tools) and CLI tools on npm/PyPI. Assesses star counts, last update dates, and whether the tool is callable via Bash. |
| Synthesizer | Lead | Receives results from all three researchers, deduplicates by URL (keeping the highest-confidence entry for duplicates), applies the 5-factor scoring rubric with weighted scoring, ranks all candidates, and returns the top 3 with full score breakdowns. |

## Data Flow

```
Search Query → [Skills Researcher + MCP Researcher + GitHub Researcher (parallel)]
  → [Synthesizer: deduplicate, score, rank] → Top 3 Ranked Results
```

All three researchers run simultaneously, each formulating queries appropriate to their source tier. The synthesizer waits for all available results (the pipeline continues with partial results if one researcher fails) and applies consistent scoring across all candidates regardless of source.

## When to Use --deep

The full team search is activated by the `--deep` flag on `scout:find`. Use it when:

- **Broad capability searches** -- "I need something for PDF generation" benefits from searching skills, MCP servers, and CLI tools simultaneously
- **Comparing integration options** -- the scoring rubric helps you decide between a native skill (easy to integrate, token-efficient) versus an MCP server (more capable, but requires configuration) versus a CLI tool (most flexible, but highest integration effort)
- **Evaluating maintenance health** -- the team checks npm publish dates, GitHub activity, and documentation quality, which a single quick search might skip
- **Finding alternatives** -- when the first result from a quick search is not a good fit, the deep search casts a wider net across all source tiers

For quick lookups where you already know approximately what you are looking for (e.g., "is there a Notion MCP server?"), the default single-agent mode is faster.

## Example

```
/founder-os:scout:find "PDF generation and manipulation" --deep
```

Here is what happens step by step:

1. The query is distributed to all three researcher agents simultaneously.
2. The Skills Researcher searches skillsmp.com and GitHub for SKILL.md files related to PDF generation. It finds a Claude Code skill for PDF creation with low integration effort.
3. The MCP Researcher searches npm for MCP servers matching "pdf" and "document generation." It finds two MCP server packages with medium integration effort, checking their weekly download counts and last-publish dates.
4. The GitHub Researcher searches for GitHub repos with PDF manipulation capabilities and npm CLI tools. It finds a popular CLI tool with high star count but high integration effort (requires code-level integration).
5. The Synthesizer receives all results, deduplicates by URL, and applies the 5-factor rubric:
   - The native skill scores highest on integration effort (0.30 weight) and token efficiency (0.10 weight)
   - The MCP server scores well on maintenance signal (active, 0.20 weight) and relevance (0.25 weight)
   - The CLI tool scores highest on documentation quality (0.15 weight) but lowest on integration effort
6. Final ranked output: top 3 results with weighted scores, integration effort labels, and score breakdowns. The user can then run `/founder-os:scout:install` on their preferred choice.

## Related

- [Scout Commands](../commands/scout.md) -- command reference for find, install, catalog, review, promote, remove, and sources
