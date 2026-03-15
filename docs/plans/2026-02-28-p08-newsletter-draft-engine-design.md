# P08 Newsletter Draft Engine — Design

## Overview

A 4-command research-to-newsletter pipeline that discovers new developments across web, GitHub, Reddit, Quora, and RSS feeds, then synthesizes findings into a structured newsletter draft saved as local markdown.

## Commands

| Command | Purpose | Flags |
|---------|---------|-------|
| `/newsletter:research [topic]` | Deep research across all sources, outputs structured findings | `--sources=web,github,reddit,quora` `--days=N` |
| `/newsletter:outline` | Creates newsletter structure from research results | `--sections=N` |
| `/newsletter:draft` | Writes full newsletter from outline | `--output=PATH` |
| `/newsletter [topic]` | Full pipeline: research → outline → draft | All flags from above |

## Research Sources

All accessed via Web Search MCP with targeted queries:

1. **Web Search** — recent articles, blog posts, official announcements
2. **GitHub** — trending repos, new releases (`site:github.com`)
3. **RSS/Changelog feeds** — official release notes, company blogs (via web search)
4. **Reddit** — trending posts in relevant subreddits (`site:reddit.com`)
5. **Quora** — relevant discussions (`site:quora.com`)

## Skills

| Skill | Purpose |
|-------|---------|
| **topic-research** | Multi-source research strategy, query formulation per source type, finding extraction and scoring, deduplication, recency weighting |
| **newsletter-writing** | Newsletter structure (Hook → Main → CTA), section templates, Substack-compatible markdown, link attribution |
| **founder-voice** | Professional-but-conversational tone, opinionated takes, practical framing, storytelling patterns |

## MCP Requirements

| Server | Required | Purpose |
|--------|----------|---------|
| Web Search | Required | All research queries |
| Filesystem | Required | Save markdown output |
| Notion | Optional | Pull personal notes/bookmarks as input |
| Google Drive | Optional | Access research docs |

## Output

File: `newsletters/[topic-slug]-[YYYY-MM-DD].md`

Sections:
- Research findings (sources, links, key developments)
- Newsletter outline
- Full draft: Hook, Main Content (3-5 sections), CTA
- Source links for attribution

## Data Flow

```
/newsletter "what's new in claude code"
    ↓
[research] Web search × 5-8 queries (general + site:github + site:reddit + site:quora)
    → Extract findings, score by recency, deduplicate
    → Display research summary
    ↓
[outline] Structure findings into newsletter sections
    → Hook angle, 3-5 main sections, CTA direction
    → Display outline
    ↓
[draft] Write full newsletter in founder voice
    → Substack-compatible markdown
    → Save to newsletters/[slug]-[date].md
```

## Voice

General founder voice: professional but conversational, opinionated, practical focus. No specific framework (BUILD Method removed from spec).
