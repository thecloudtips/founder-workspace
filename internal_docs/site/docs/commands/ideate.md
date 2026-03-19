# Ideate

> Content ideation engine that generates drafts, outlines, variations, and research briefs in authentic founder voice.

## Overview

The Ideate namespace is your content creation starting point. It takes a topic, document, or research question and produces structured content briefs, full drafts, and multiple angle variations -- all written in an opinionated founder voice calibrated for LinkedIn, X, Meta, and TikTok. The output is platform-aware but not platform-formatted; it focuses on the creative substance that makes content worth reading.

Six commands cover the full ideation pipeline. Start with `research` to discover data-backed angles and supporting statistics. Use `outline` to generate a structural scaffold with hook options and framework selection. Run `draft` to produce a complete content piece in one pass. Feed an existing document into `from-doc` to extract key points and generate social-ready angles. Use `variations` to explore multiple approaches to the same topic with different hooks, frameworks, and tones. And use `facts` to pull quotable statistics and data points from any document or URL.

Every command applies a consistent founder voice: professional but conversational, opinionated with evidence, short-long sentence rhythm, and concrete examples over abstract advice. Seven content frameworks (story, listicle, contrarian, how-to, lesson, insight, question) provide structural variety, and four audience segments (founder, technical, marketer, CXO) calibrate tone and examples.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| None | -- | Most ideate commands run without external tools |
| Web Search MCP | Optional | Powers the `research` command for live data and trend analysis |
| WebFetch | Optional | Powers the `facts` command for URL-based fact extraction |
| Filesystem | Optional | Save drafts to file via `--to-file` flag |

## Commands

### `/founder-os:ideate:outline`

**What it does** -- Generates a structured content outline from a topic, selecting the best framework and adapting structure to the target platform. Produces hook options, body section scaffolding, and closer variants. Available in skeleton mode (quick scaffold) or detailed mode (beat-by-beat with transition notes and word counts).

**Usage:**
```
/founder-os:ideate:outline "why founders should learn to code"
/founder-os:ideate:outline "hiring your first engineer" --framework=howto --platform=linkedin --depth=detailed
/founder-os:ideate:outline "AI replacing jobs myth" --framework=contrarian --platform=x
```

**Example scenario:**
> You have a rough idea about why you stopped using OKRs but are not sure how to structure it. You run `/founder-os:ideate:outline "why I stopped using OKRs"`. The system auto-selects the "personal lesson" framework, generates 2 hook options (a story-entry hook and a contrarian hook), maps out 4 body sections, and offers 2 closer variants. You pick the contrarian hook and proceed to drafting.

**What you get back:**

A structured outline with topic, selected framework (with reasoning if auto-selected), platform, and depth. Includes 2-3 hook options labeled by formula type, body sections adapted to platform norms (3-5 for LinkedIn, 3-7 thread beats for X), and 2-3 closer options (CTA, reflection, callback). In detailed mode, each section includes bullet points, transition notes, and estimated word counts.

**Flags:**
- `--framework=FRAMEWORK` -- Content framework: `story`, `listicle`, `contrarian`, `howto`, `lesson`, `insight`, `question`, or `auto` (default: `auto`)
- `--platform=PLATFORM` -- Target platform: `linkedin`, `x`, `meta`, `tiktok` (default: `linkedin`)
- `--depth=DEPTH` -- Outline depth: `skeleton` (default) or `detailed`

---

### `/founder-os:ideate:draft`

**What it does** -- Generates a complete content draft in one pass through a three-phase pipeline: ideation (framework selection, hook generation, audience calibration), drafting (full content in founder voice), and validation (quality checklist, character count). Output is a platform-agnostic content brief ready for formatting via `/social:compose`.

**Usage:**
```
/founder-os:ideate:draft "why I stopped using OKRs"
/founder-os:ideate:draft "hiring your first engineer" --audience=founder --framework=story
/founder-os:ideate:draft "AI tools for small teams" --platform=x --length=long
/founder-os:ideate:draft "cold email tips" --framework=listicle --to-file=drafts/cold-email.md
```

**Example scenario:**
> You need a LinkedIn post about a lesson you learned when your best engineer quit. You run `/founder-os:ideate:draft "what I learned when my best engineer quit" --framework=lesson --audience=founder`. Phase 1 selects a story-entry hook, identifies 4 key points, and calibrates for founder audience. Phase 2 writes the full draft in founder voice with short-long rhythm. Phase 3 validates quality and counts characters. You get a complete content brief with 3 hook candidates and the full draft ready to post.

**What you get back:**

A content brief with metadata (topic, framework, audience, platform, character count), 3 hook candidates with the selected one marked, and the full content body written in founder voice. If `--to-file` is specified, the brief is saved with YAML frontmatter.

**Flags:**
- `--platform=PLATFORM` -- Target platform hint (default: `linkedin`)
- `--audience=SEGMENT` -- Target reader: `founder`, `technical`, `marketer`, `cxo` (default: `founder`)
- `--framework=FRAMEWORK` -- Content framework (default: `auto`)
- `--length=MODE` -- Content length: `short`, `medium`, `long` (default: `medium`)
- `--tone=TONE` -- Humanization tone: `professional`, `friendly`, `casual`, `authoritative`, `conversational` (default: `professional`)
- `--to-file=PATH` -- Save the draft to a file

---

### `/founder-os:ideate:variations`

**What it does** -- Generates multiple content angle variations for a topic or existing draft, each varying the hook style, framework, and tone. Useful for exploring different approaches before committing to a direction. Ephemeral output only -- no files saved.

**Usage:**
```
/founder-os:ideate:variations "why I stopped using OKRs"
/founder-os:ideate:variations --count=5 --platform=x
/founder-os:ideate:variations --audience=technical
```

**Example scenario:**
> You drafted a post about remote work but it feels flat. You run `/founder-os:ideate:variations` (it picks up the draft from the conversation). The system generates 3 variations: a contrarian take with a bold-claim hook, a story framework with a micro-story hook, and a listicle with a stat-led hook. Each variation includes a 2-3 sentence opening paragraph, 3-5 talking points, and a platform fit rating. You pick elements from variations 1 and 3 to combine.

**What you get back:**

Each variation includes: framework and hook formula labels, a one-sentence angle description, a 2-3 sentence opening paragraph demonstrating the hook and tone, 3-5 key talking points, a suggested structure, and a platform fit note. A comparison table at the end summarizes all variations side by side with fit ratings (Strong/Good/Fair).

**Flags:**
- `--platform=PLATFORM` -- Target platform (default: `linkedin`)
- `--audience=SEGMENT` -- Target audience (default: `founder`)
- `--count=N` -- Number of variations, 1-5 (default: `3`)
- `--tone=TONE` -- Humanization tone preset (default: `professional`)

---

### `/founder-os:ideate:from-doc`

**What it does** -- Transforms a document, article, or pasted text into content angles and briefs for social media. Extracts key points, auto-classifies the document type, selects the best framework, and generates platform-aware angle recommendations in founder voice.

**Usage:**
```
/founder-os:ideate:from-doc blog-post.md
/founder-os:ideate:from-doc ~/Documents/quarterly-report.pdf --framework=insight --audience=cxo
/founder-os:ideate:from-doc meeting-notes.txt --platforms=linkedin,x
```

**Example scenario:**
> You published a detailed blog post about your hiring process and want to repurpose it for social media. You run `/founder-os:ideate:from-doc blog-post.md --platforms=linkedin,x`. The system extracts 6 key points, identifies the 3 strongest angles (a contrarian take on job descriptions, a how-to on the interview loop, a story about the worst hire), and generates per-platform recommendations. LinkedIn gets the detailed how-to; X gets the contrarian thread.

**What you get back:**

A content brief with source metadata, extracted key points (each with a supporting detail and content angle), the core narrative angle, a hook concept, and per-platform recommendations when multiple platforms are specified. If `--to-file` is specified, the brief is saved with frontmatter.

**Flags:**
- `--platforms=PLATFORMS` -- Comma-separated target platforms (default: `linkedin`)
- `--audience=SEGMENT` -- Target audience (default: `founder`)
- `--framework=FRAMEWORK` -- Content framework (default: `auto`)
- `--tone=TONE` -- Humanization tone preset (default: `professional`)
- `--to-file=PATH` -- Save the content brief to a file

---

### `/founder-os:ideate:research`

**What it does** -- Researches a topic to discover content angles, supporting data, and platform-specific hooks. Breaks the topic into searchable dimensions (industry, contrarian, data, trend, personal experience), runs web searches, and synthesizes 3-5 ranked content angles with hook ideas, supporting statistics, and framework recommendations.

**Usage:**
```
/founder-os:ideate:research "freelancing vs employment"
/founder-os:ideate:research "AI tools for small teams" --platforms=linkedin,x --depth=deep
/founder-os:ideate:research "remote work trends 2026" --depth=quick
```

**Example scenario:**
> You want to write about AI adoption in small businesses but need data to back your claims. You run `/founder-os:ideate:research "AI adoption small business" --depth=deep`. The system runs 10 targeted searches, finds recent statistics on adoption rates, discovers 3 competitor posts on the topic, and synthesizes 5 content angles. Angle #1: a stat-led post using a counterintuitive finding about small teams outperforming enterprises on AI implementation.

**What you get back:**

A research brief with 3-5 ranked content angles. Each angle includes a hook idea, 2-3 supporting data points with sources, a platform fit rating per requested platform, a recommended content framework, and a one-sentence explanation of why the angle works. If WebSearch is unavailable, angles are based on general knowledge with a degraded-mode notice.

**Flags:**
- `--platforms=PLATFORMS` -- Comma-separated target platforms (default: `linkedin`)
- `--depth=DEPTH` -- Research depth: `quick` (3-5 searches) or `deep` (8-12 searches with competitor analysis) (default: `quick`)

---

### `/founder-os:ideate:facts`

**What it does** -- Extracts facts, statistics, and quotable data from a document or URL, classifies each by its content role (hook-worthy, body-supporting, credibility-building), and presents them ranked by impact. Useful for backing your content with credible evidence.

**Usage:**
```
/founder-os:ideate:facts quarterly-report.pdf
/founder-os:ideate:facts research-paper.md --format=table --max=15
/founder-os:ideate:facts https://example.com/industry-report
```

**Example scenario:**
> You found an industry report with useful data for your next LinkedIn post. You run `/founder-os:ideate:facts industry-report.pdf --max=10`. The system extracts 14 facts, classifies them, and returns the top 10: 3 hook-worthy statistics (surprising enough to open a post), 4 body-supporting data points (evidence for claims), and 3 credibility-building citations (named studies and expert quotes).

**What you get back:**

Facts organized by classification: hook-worthy facts (surprising stats for opening a post), body-supporting facts (evidence for building an argument), and credibility-building facts (authoritative sources and expert quotes). Each fact includes the data point and its source attribution. Available in bullet or table format.

**Flags:**
- `--format=FORMAT` -- Output format: `bullets` (default) or `table`
- `--max=N` -- Maximum number of facts to return (default: `10`)

---

## Tips & Patterns

- **Research-to-publish pipeline**: Run `ideate:research` to find angles, then `ideate:draft` to write, then `/social:compose` to format for platform, then `/social:post` to publish. Each step builds on the previous.
- **Repurpose everything**: Wrote a blog post? Run `ideate:from-doc`. Had a great meeting? Extract angles from the notes. Found a report? Run `ideate:facts` to pull quotable data.
- **Explore before committing**: Use `ideate:variations` after a draft to see if there is a stronger angle you missed. The comparison table makes it easy to pick the best elements.
- **Match framework to platform**: Contrarian takes and question-led posts perform well on X. Story and how-to frameworks shine on LinkedIn. Let auto-selection guide you, or override when you know your audience.
- **Build a content bank**: Use `--to-file` on draft and from-doc commands to save content briefs locally. Review and schedule them over the coming week.

## Related Namespaces

- [Social](./social.md) -- The publishing layer; `social:compose` formats ideate output for specific platforms, `social:post` publishes it
- [Knowledge Base](./kb.md) -- KB documents can be fed into `ideate:from-doc` to generate social content from internal knowledge
- [Newsletter](./newsletter.md) -- Newsletter research and drafting complements ideation; newsletter content can be repurposed via `ideate:from-doc`
