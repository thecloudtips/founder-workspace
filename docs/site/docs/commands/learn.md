# Learn

> Build a searchable knowledge base of your daily insights -- with auto-tagging, related connections, and weekly synthesis.

## Overview

The Learning Log captures the insights, observations, and lessons you pick up as a founder. Each entry is auto-tagged with topics from a 10-category taxonomy (Technical, Process, Business, People, Tool, Strategy, Mistake, Win, Idea, Industry), classified by source type (experience, reading, conversation, experiment, observation), and linked to related past insights through semantic matching.

Over time, the log becomes a personal knowledge base. The weekly synthesis command detects emerging themes, identifies unexpected connections between learnings, tracks your logging streak, and compares activity to the previous week. It turns scattered daily observations into patterns you can act on.

The real power shows up after a few weeks: you start seeing that your Technical learnings cluster around API patterns, your Business insights keep circling back to pricing, and there's a connection between that conversation with your advisor and that experiment you ran last Tuesday.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | Stores learnings and weekly synthesis in Notion databases |

## Commands

### `/founder-os:learn:log`

**What it does** -- Captures a daily learning with an auto-generated title, topic detection across 10 categories, source type classification, and related insight linking. Finds up to 3 past learnings that connect to what you just shared.

**Usage:**

```
/founder-os:learn:log "[insight text]" [--source=TYPE] [--context=TEXT] [--company=NAME]
```

**Example scenario:**

> After a morning standup, you realize that batch-processing API calls with 10-item chunks dramatically reduces rate limit errors. You log the insight and the system auto-detects it as a Technical topic with an Experience source, generates a 6-word title, and surfaces two related past learnings about API patterns.

**What you get back:**

- Auto-generated title (5-8 words, Title Case)
- Detected topics (1-3 from the 10-category taxonomy)
- Source type (auto-detected or specified)
- ISO week assignment
- Up to 3 related past insights with cross-references

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--source=TYPE` | Auto-detected | `experience`, `reading`, `conversation`, `experiment`, `observation` |
| `--context=TEXT` | -- | Additional context (project name, meeting reference) |
| `--company=NAME` | -- | Associate with a company in your CRM |

---

### `/founder-os:learn:search`

**What it does** -- Searches your learning log by topic, keyword, date range, and source type. Results are ranked by a composite relevance score that weights title matches, content matches, topic overlap, and recency.

**Usage:**

```
/founder-os:learn:search [topic-or-keyword] [--since=Nd|YYYY-MM-DD] [--source=TYPE] [--limit=N]
```

**Example scenario:**

> You're debugging an API integration and vaguely remember logging something about rate limiting a few weeks ago. You search for "rate limit" with `--since=30d` and find two relevant entries with their full context, related insights, and source references.

**What you get back:**

- Ranked results with topic emojis and relevance scoring
- Truncated insight preview with date and source type
- Related insight cross-references per result
- Smart suggestions when no results match

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `topic-or-keyword` | None (recent) | Topic name or keyword search term |
| `--since=Nd` | All time | Lookback period in days |
| `--since=YYYY-MM-DD` | All time | Absolute start date |
| `--source=TYPE` | All | Filter by source type |
| `--limit=N` | `10` | Maximum results (max 50) |

---

### `/founder-os:learn:weekly`

**What it does** -- Synthesizes a week's learnings into themes, connections, streak metrics, and a narrative summary. Detects the 2-4 most active topics, identifies non-obvious connections between learnings, calculates your consecutive-week logging streak, and compares volume to the previous week.

**Usage:**

```
/founder-os:learn:weekly [--week=YYYY-WNN] [--output=notion|chat|both|PATH]
```

**Example scenario:**

> It's Friday afternoon and you run the weekly synthesis. You logged 7 insights this week. The system identifies "Technical" and "Process" as your top themes, finds a connection between your API batch-processing discovery and your deployment automation insight, notes your 4-week logging streak, and summarizes that your learning focus is shifting from infrastructure to workflow optimization.

**What you get back:**

- Top themes with most active topic highlighted
- Key connections between learnings (2-3 non-obvious links)
- Consecutive-week streak with emoji tier
- Week-over-week trend comparison
- Source mix breakdown
- 3-5 sentence narrative synthesis
- Chronological list of all learnings

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--week=YYYY-WNN` | Current week | Target ISO week |
| `--output` | `both` | `notion`, `chat`, `both`, or a file path |

---

## Tips & Patterns

- **Log daily, synthesize weekly.** The learning log works best as a daily habit. Even one insight per day builds a rich knowledge base within a month. The weekly synthesis is your reward for consistency.
- **Don't overthink the source type.** If you're not sure whether it's "experience" or "observation", just skip the flag and let auto-detection handle it. The classification helps with filtering but isn't critical.
- **Use company tags for client learnings.** When you learn something specific to a client (their preferred communication style, budget cycle, decision process), tag it with `--company`. These insights surface automatically during future work with that client.
- **Search before you start.** Before diving into a project or client engagement, run a quick `learn:search` with relevant keywords. Past-you may have already figured out the answer.

## Related Namespaces

- **[Goal](/commands/goal)** -- Connect your learnings to the goals they inform
- **[Memory](/commands/memory)** -- Persistent facts and preferences that apply across all plugins
- **[Intel](/commands/intel)** -- The intelligence engine detects patterns from your learning log over time
