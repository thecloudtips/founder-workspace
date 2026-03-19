# Slack Digest Engine

> Scan Slack channels for decisions, action items, and @mentions -- then surface what matters.

## Overview

The Slack Digest Engine solves the "200 unread messages" problem. Instead of scrolling through every channel after a meeting, a flight, or a focused work block, you run a single command and get a structured digest that separates signal from noise. Decisions are highlighted, action items are extracted with assignees, your @mentions are listed, and everything else is scored and ranked by importance.

This namespace provides two complementary commands. Catch-up is the lightweight, personal scanner -- it finds only messages that directly need your attention (your @mentions, tasks assigned to you, critical broadcasts) and is designed for speed. Digest is the comprehensive team-level scan -- it classifies every message, detects decisions, extracts action items for all team members, and optionally saves the full digest to Notion.

Both commands use a 4-factor scoring algorithm (message type, engagement, recency, channel importance) to assign priority tiers from P1 (critical) to P5 (noise), and a noise filter that typically removes 40-60% of messages before they reach you. The result: you spend 2 minutes reading instead of 20 minutes scrolling.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Slack MCP | Yes | Channel scanning, message history, thread resolution |
| Notion CLI | No | Optional storage of digests to the Briefings database |
| Business Context | No | Personalizes output with your company context |

## Commands

### `/founder-os:slack:catch-up`

**What it does** -- Run a fast personal scan across all accessible Slack channels. Shows only messages directly relevant to you: your @mentions, action items assigned to you, and critical @channel/@here broadcasts. Uses approximately 80% fewer API calls than a full digest.

**Usage:**
```
/founder-os:slack:catch-up [--since=8h]
```

**Example scenario:**
> You step out of a 2-hour client meeting and want to know if anything needs your immediate attention. You run `/founder-os:slack:catch-up --since=2h` and in about 30 seconds get a clean list: 1 action item assigned to you in #engineering ("review the PR by EOD"), 2 direct @mentions in #product, and zero critical broadcasts. You know exactly what to respond to.

**What you get back:**
- **Your Action Items** -- tasks assigned to you with assignee, channel, due date, and thread context, sorted by urgency
- **Your @Mentions** -- direct mentions with message excerpt, author, timestamp, and thread context, sorted by recency
- **Important Broadcasts** -- only @channel/@here messages that score P1 (critical), if any exist
- Channel scan summary showing how many channels were checked and how many were skipped

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `--since=TIMEFRAME` | `8h` | Time window to scan. Accepts `Nh` (hours), `Nd` (days), or `YYYY-MM-DD` |

---

### `/founder-os:slack:digest`

**What it does** -- Produce a comprehensive, structured digest from one or more Slack channels. Classifies every message, detects decisions, extracts action items with assignees, surfaces your @mentions, and ranks key threads by importance. Optionally saves the full digest to Notion.

**Usage:**
```
/founder-os:slack:digest [#channel1 #channel2] [--all] [--since=24h] [--include-dms] [--output=notion|chat|both]
```

**Example scenario:**
> It is Monday morning and you want to know everything important that happened over the weekend across your key channels. You run `/founder-os:slack:digest --all --since=2d --output=both` and get a structured digest covering: 3 decisions made in #product, 5 action items (2 assigned to you), 4 direct @mentions, and the top 10 most important threads across all channels. The digest is also saved to your Notion Briefings database for reference.

**What you get back:**
- **Decisions** -- detected decision statements with author, channel, confidence level, and thread link
- **Action Items** -- extracted tasks split into "Assigned to you" (first) and "Assigned to others," each with assignee, due date, and source channel
- **Your @Mentions** -- direct mentions with context
- **Key Threads** -- top 10 high-priority threads not already surfaced in other sections, ranked by signal score
- **Channel Summaries** -- one-line overview per channel when 3 or more channels are scanned
- **Direct Messages** -- included only when `--include-dms` is active
- Header statistics: messages analyzed, noise filter rate, channels scanned, time window

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `#channel1 #channel2` | -- | Specific channels to scan (strip the `#` prefix) |
| `--all` | Off | Scan all bot-accessible channels |
| `--since=TIMEFRAME` | `24h` | Time window: `Nh` (hours), `Nd` (days), or `YYYY-MM-DD` |
| `--include-dms` | Off | Include direct messages in the scan |
| `--output=DEST` | `both` | Output destination: `notion`, `chat`, or `both` |
| `--schedule=EXPR` | -- | Schedule recurring digests (e.g., weekdays at 6 PM) |

---

## Tips & Patterns

- **Use catch-up for quick checks, digest for deep reviews.** Catch-up answers "do I need to respond to anything?" in 30 seconds. Digest answers "what happened across the team?" in 2-3 minutes.
- **Schedule your digest.** Set up a recurring end-of-day digest with `--schedule="0 18 * * 1-5"` to get a weekday summary delivered automatically.
- **Start with specific channels.** If you only care about #product and #engineering, name them explicitly instead of using `--all`. Smaller scope means faster results and less noise.
- **Adjust the time window.** After a long weekend, use `--since=3d`. After a quick lunch break, `--since=2h` is plenty.
- **Save to Notion for your records.** Using `--output=both` gives you the digest in chat immediately and stores a copy in your Notion Briefings database for future reference.
- **Combine with action tracking.** When the digest surfaces action items, create follow-up tasks in Notion with `/founder-os:notion:create` or track them in your existing project database.

## Related Namespaces

- **[Notion](/commands/notion)** -- Store digests to Notion; create tasks from discovered action items
- **[Drive](/commands/drive)** -- Slack threads often reference Drive documents; use Drive Brain to find and summarize them
- **[Client](/commands/client)** -- Client-related Slack mentions can inform your client dossier
- **[CRM](/commands/crm)** -- Decisions and commitments from Slack may need to be logged as CRM activities
