# Competitive Intel

> Research competitors via live web search and produce structured intelligence reports and comparison matrices.

## Overview

The Competitive Intel namespace gives you two commands that turn a company name into actionable competitive intelligence. The `research` command produces a deep-dive report on a single competitor covering pricing, features, customer reviews, positioning, and recent news. The `matrix` command compares two or more competitors side by side across seven standardized dimensions.

Both commands execute fresh web searches every time they run — no stale caches, no recycled data. Searches target high-quality sources directly: official product websites, G2, Capterra, ProductHunt, TechCrunch, and Crunchbase. Pricing is normalized to per-user-per-month format, review scores are composited to a /5.0 scale, and features are categorized into core, differentiating, and gap buckets so you can scan the output quickly.

When you provide the `--your-product` flag, both commands add a self-comparison column that highlights where you win, where competitors win, and where market whitespace exists. Strategic recommendations are grounded in specific research findings, not generic advice.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Web Search | Yes | Execute targeted searches across pricing, features, reviews, positioning, and news dimensions |
| Filesystem | No | Save reports and matrices to local files |
| Notion CLI | No | Track research records in the Research database with Company relations |

## Commands

### `/founder-os:compete:research`

**What it does** — Researches a single competitor across five dimensions (pricing, features, customer reviews, positioning and messaging, recent news) and produces a structured competitive intelligence report. Includes a SWOT analysis, positioning archetype classification, and 3-5 actionable strategic recommendations.

**Usage:**

```
/founder-os:compete:research [company] --your-product="description" --output=PATH
```

**Example scenario:**

> You are building a project management tool for agencies and want to understand how Linear positions itself. You run `/founder-os:compete:research Linear --your-product="Project management tool for agencies, $49/month flat"` and receive a full report: Linear's pricing tiers normalized to per-user-per-month, their differentiating features (cycles, triage, roadmaps), a 4.6/5.0 composite review score, their "built by builders" developer-first positioning, recent funding news, and a head-to-head comparison showing your flat pricing as an advantage for small agency teams.

**What you get back:**

A structured report displayed in chat and saved to a local file, covering:

- **Executive Summary** — 2-3 sentence overview of the competitor's market position
- **Pricing** — Normalized plan table with pricing model, free tier status, and billing details
- **Key Features** — Categorized into core, differentiating, and gaps
- **Positioning and Messaging** — Archetype classification (Enterprise Leader, SMB Friendly, Developer-First, Non-Technical Founder, Vertical Specialist, or Challenger), primary message, target audience, and tone
- **Customer Reviews** — Composite score, top praise themes, top complaint themes
- **Recent News** — Last 90 days of funding, launches, partnerships, and leadership changes
- **vs. You** (when `--your-product` is provided) — Feature-by-feature comparison with win/lose/tie assessment and differentiation opportunities
- **Strategic Recommendations** — 3-5 specific, evidence-grounded actions

If Notion is connected, the research is also saved to your Research database with Type set to "Competitive Analysis" and linked to a Company record in your CRM.

**Flags:**

- `--your-product="description"` — Add a self-comparison section showing where you win, where they win, and positioning whitespace
- `--output=PATH` — Output file path (default: `competitive-intel/[company-slug]-[YYYY-MM-DD].md`)

---

### `/founder-os:compete:matrix`

**What it does** — Researches two or more competitors and builds a structured comparison matrix across seven key dimensions: pricing, target market, key features, positioning, review score, strengths, and weaknesses. Every run executes fresh searches — nothing is cached or reused from previous research.

**Usage:**

```
/founder-os:compete:matrix [company1] [company2] ... --your-product="description" --output=PATH
```

**Example scenario:**

> You are evaluating the competitive landscape for a new note-taking app. You run `/founder-os:compete:matrix Notion Coda Obsidian --your-product="Note-taking app with AI, free tier"` and get a normalized comparison table. The matrix reveals that no competitor targets non-technical founders with AI-first positioning and a free tier — a whitespace opportunity for your product. The strategic recommendations section suggests leading with "AI-powered notes for founders" messaging since no competitor owns that positioning.

**What you get back:**

A comparison matrix displayed in chat and saved to a local file, containing:

- **Comparison Table** — Companies as columns, seven dimensions as rows, with normalized values for direct comparison
- **"You" Column** (when `--your-product` is provided) — Your product assessed alongside competitors, with advantage markers and whitespace indicators
- **Market Overview** — 1-2 sentences on the competitive landscape
- **Key Differentiators** — What makes each competitor distinct
- **Whitespace Opportunities** — Underserved positions and unmet needs not covered by any competitor
- **Strategic Recommendations** (when `--your-product` is provided) — 3-5 prioritized actions based on matrix findings

Each company researched is also saved as an individual record in your Notion Research database if Notion is connected, with Company relations resolved automatically.

**Flags:**

- `--your-product="description"` — Add a "You" column to the matrix with advantage markers and a positioning opportunity row
- `--output=PATH` — Output file path (default: `competitive-intel/matrix-[YYYY-MM-DD].md`)

---

## Tips & Patterns

- **Start with `research` for depth, use `matrix` for breadth**: When you need a deep understanding of one competitor's pricing, reviews, and recent moves, use `research`. When you need a bird's-eye view of the landscape to inform your positioning, use `matrix`.
- **Always include `--your-product`**: The self-comparison analysis is where the most actionable insights come from. Even a short description like "CRM for freelancers, $15/month" gives the system enough to identify your advantages and gaps.
- **Run `matrix` quarterly**: Competitive landscapes shift. A quarterly matrix run catches pricing changes, new features, and positioning pivots before they become surprises. The output file is date-stamped, so you build a natural history of how your market evolves.
- **Use company URLs for disambiguation**: If a company name is common (like "Mercury"), pass the URL instead (e.g., `https://mercury.com`) to ensure the research targets the right company.
- **Data is never fabricated**: If a web search returns no results for a particular dimension, the report notes it as "unable to gather data" rather than guessing. Pricing, features, and review scores are always sourced from actual search results.

## Related Namespaces

- **[Intel](/docs/commands/intel)** — The Intelligence Engine that powers learned patterns across all Founder OS commands; competitive research observations contribute to pattern detection
- **[Client](/docs/commands/client)** — Load client context before running competitive research to align recommendations with your current business strategy
