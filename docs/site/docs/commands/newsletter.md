# Newsletter Engine

> Research any topic across the web, GitHub, Reddit, and Quora, then produce a publication-ready newsletter draft in your founder voice -- complete with source attribution and Substack-compatible formatting.

## Overview

The Newsletter Engine namespace handles the entire newsletter creation workflow, from topic research through final draft. It searches across multiple web sources to gather scored and deduplicated findings, clusters those findings into a structured outline with a compelling hook, and writes a complete newsletter in an opinionated founder voice with inline source links, actionable takeaways, and a clear call to action.

You can run the full pipeline end-to-end with a single command, or use the individual step commands for more control: research a topic first, review and adjust the outline, then generate the draft. The step-by-step approach is useful when you want to steer the direction between phases. The all-in-one command is for when you know the topic and want a finished draft with minimal interaction.

The namespace connects to **Web Search** (for multi-source research), **Filesystem** (for saving drafts), and **Notion** (optional, for logging research sessions to **[FOS] Research** and newsletter drafts to **[FOS] Content**). Web Search is the only hard requirement -- the engine degrades gracefully without Notion.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Web Search | Yes | Execute research queries across web, GitHub, Reddit, Quora, and blogs |
| Filesystem MCP | Yes | Save newsletter drafts to local files |
| Notion CLI | No | Log research to [FOS] Research, log drafts to [FOS] Content |

## Commands

### `/founder-os:newsletter:research`

**What it does** -- Performs deep multi-source web research on a topic. Generates 5-8 targeted search queries distributed across general web, GitHub, Reddit, Quora, and official blogs. Parses results into structured findings with relevance and recency scores, deduplicates across sources, identifies key themes, and presents a ranked research summary.

**Usage:**

```
/founder-os:newsletter:research [topic] [--sources=web,github,reddit,quora] [--days=N]
```

**Example scenario:**

> You want to write about AI code review tools for your next newsletter. You run `/founder-os:newsletter:research "AI code review tools" --days=7` and get back 18 findings (12 after deduplication) organized by source type: 2 official releases, 4 blog posts, 3 GitHub repos, and 3 community discussions. Three key themes emerge: pricing model shifts, accuracy benchmarks, and IDE integration depth. Each finding includes a relevance-recency score so you can see what matters most right now.

**What you get back:**

A structured research summary with: date range scanned, sources searched, total findings, a findings-by-source-type breakdown, a ranked top findings table (score, title, source, type, date), and 3-5 identified key themes. If Notion is connected, results are logged to [FOS] Research with `Type = "Newsletter Research"`.

**Flags:**

- `--sources=web,github,reddit,quora` -- Comma-separated list of sources to search (default: all four)
- `--days=N` -- Lookback window for recency scoring (default: 14)

---

### `/founder-os:newsletter:outline`

**What it does** -- Takes research findings from a prior `/founder-os:newsletter:research` run in the current conversation and clusters them into a structured newsletter outline. Selects a hook angle (stat-led, contrarian, story-led, or question), assigns findings to thematic sections, defines key takeaways, and sets the CTA direction. The outline serves as the blueprint for the draft step.

**Usage:**

```
/founder-os:newsletter:outline [--sections=N]
```

**Example scenario:**

> After researching AI code review tools, you run `/founder-os:newsletter:outline --sections=3` to build a concise outline. The engine picks a contrarian hook ("Most teams are evaluating AI code review on the wrong metric"), clusters findings into three sections (accuracy vs. speed tradeoffs, pricing model shifts, IDE-native vs. standalone), and proposes four actionable takeaways. You review the outline and ask to swap the hook to stat-led before proceeding to the draft.

**What you get back:**

A structured outline showing: topic, hook type, section count, and target length. Then the hook description (2-3 sentences), each section with title, 2-3 key points with source references, and an angle note. Closes with key takeaways (actionable bullets) and CTA direction. After displaying, the engine waits for your feedback before you proceed to drafting.

**Flags:**

- `--sections=N` -- Number of main content sections (default: 4, valid range: 3-5)

---

### `/founder-os:newsletter:draft`

**What it does** -- Writes the complete newsletter from an outline produced by a prior `/founder-os:newsletter:outline` run in the current conversation. Applies founder voice (professional, conversational, opinionated), follows the four-part structure (hook, main content, key takeaways, CTA), formats for Substack compatibility, runs a quality checklist, and saves the draft to a file.

**Usage:**

```
/founder-os:newsletter:draft [--output=PATH] [--tone=professional|friendly|casual|authoritative|conversational]
```

**Example scenario:**

> With your outline finalized, you run `/founder-os:newsletter:draft --tone=conversational` and get a complete 1,100-word newsletter. The hook opens with a surprising statistic, three sections flow with bridge transitions between them, every claim links to its source inline, and the key takeaways start with action verbs. The draft is saved to `newsletters/ai-code-review-tools-2026-03-19.md` and displayed in chat for review.

**What you get back:**

The full newsletter displayed in chat, followed by a draft summary with topic, section count, approximate word count, and the file path where the draft was saved. The draft is Substack-compatible Markdown: H2 section headers, no tables, no raw HTML, horizontal rule dividers, inline source links, and a Sources section at the bottom.

**Flags:**

- `--output=PATH` -- File path for the saved draft (default: `newsletters/[topic-slug]-[YYYY-MM-DD].md`)
- `--tone=professional|friendly|casual|authoritative|conversational` -- Humanization tone preset (default: `professional`)

---

### `/founder-os:newsletter:newsletter`

**What it does** -- Runs the entire research-to-draft pipeline in one command without stopping for user input between phases. Researches the topic, builds the outline, writes the draft, saves the file, and optionally logs everything to Notion. This is the all-in-one command for when you know your topic and want a finished newsletter with minimal interaction.

**Usage:**

```
/founder-os:newsletter:newsletter [topic] [--sources=web,github,reddit,quora] [--days=N] [--sections=N] [--output=PATH] [--tone=professional|friendly|casual|authoritative|conversational]
```

**Example scenario:**

> It is Thursday and you need this week's newsletter out by tomorrow. You run `/founder-os:newsletter:newsletter "remote team management" --sections=4 --days=7` and the engine moves through all three phases automatically: researching across web and community sources, building a 4-section outline, and writing the full draft in founder voice. Twenty minutes later, you have a 1,200-word newsletter saved to file with a pipeline summary showing 7 queries run, 15 findings after dedup, and 6 sources cited inline.

**What you get back:**

Progressive output through all three phases. Phase 1 shows a research summary with top findings and themes. Phase 2 shows the newsletter outline with hook type and section plan. Phase 3 shows the complete newsletter draft. A final pipeline summary provides research stats (queries, findings, themes), newsletter stats (word count, sections, sources cited, hook type), and the output file path.

**Flags:**

- `--sources=web,github,reddit,quora` -- Comma-separated list of sources to search (default: all four)
- `--days=N` -- Lookback window for recency scoring (default: 14)
- `--sections=N` -- Number of main content sections (default: 4, valid range: 3-5)
- `--output=PATH` -- File path for the saved draft (default: `newsletters/[topic-slug]-[YYYY-MM-DD].md`)
- `--tone=professional|friendly|casual|authoritative|conversational` -- Humanization tone preset (default: `professional`)

---

## Tips & Patterns

**Use the step-by-step commands for your first few newsletters.** Running `research`, then `outline`, then `draft` as separate steps lets you review and adjust between phases. Once you are comfortable with the output style, switch to the all-in-one `newsletter` command for speed.

**Narrow your topic for better results.** The research engine works best with specific topics. "AI tools" is too broad and returns noise. "AI code review tools for Python teams" returns signal. If a topic is ambiguous, the engine will ask you to narrow it before proceeding.

**Adjust sections to match your content density.** Use `--sections=3` for a quick-hit newsletter (800-1000 words) when research is thin or the topic is narrow. Use `--sections=5` for a deep-dive issue (1300-1500 words) when you have rich source material. The default of 4 sections works for most weekly issues.

**Recency scoring keeps your content fresh.** Findings from the last 7 days score highest. Content older than 30 days is only included if it is highly relevant. Use `--days=7` for time-sensitive topics or `--days=30` for evergreen subjects where older foundational content adds value.

**Founder voice is opinionated by design.** The draft will take positions, use short-long sentence rhythm, inject opinions with the "here is why this matters" framework, and avoid corporate jargon. If the output feels too strong, use `--tone=friendly` or `--tone=conversational` for a softer register. The engine will never produce hedge-filled filler like "it might be worth considering" -- that is by design.

**The draft is Substack-ready but not Substack-locked.** Output is clean Markdown with H2 headers, inline links, bulleted lists, and horizontal rule dividers. This renders correctly on Substack, Ghost, Beehiiv, ConvertKit, or any Markdown-compatible email platform.

**Source diversity is a quality signal.** When the same finding appears across 3+ sources after deduplication, it receives a score bonus. Multi-source coverage indicates a high-signal topic that your readers likely care about.

## Related Namespaces

- **[Content Ideation](/commands/ideate)** -- Generate content ideas, outlines, and variations for blog posts, LinkedIn, and other formats beyond newsletters
- **[Knowledge Base](/commands/kb)** -- Index and search your accumulated knowledge for reference material
- **[Competitive Intel](/commands/compete)** -- Deep competitive research that can feed into newsletter analysis sections
