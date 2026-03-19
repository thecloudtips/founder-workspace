# Review

> Generate a structured weekly review from tasks, meetings, and email activity.

## Overview

The Review namespace compiles a comprehensive weekly retrospective by auto-discovering your Notion task databases, pulling Google Calendar events, and scanning Gmail threads. The result is a 6-section review covering wins, meetings, communication patterns, blockers, carryover items, and next-week priorities -- all assembled into a Notion page (or displayed in chat) with actionable insights.

What makes this namespace distinctive is its auto-discovery approach: rather than requiring you to specify which Notion databases hold your tasks, it searches your workspace for any database with a Status property (containing completion-like values) and a Date property. It then pulls completed tasks, in-progress carryover, and overdue items from every qualifying database. This means it works out of the box whether your tasks live in [FOS] Tasks, project-specific boards, or multiple databases across your workspace.

The review is saved to the **[FOS] Briefings** database with `Type = "Weekly Review"`. If a review already exists for the target week, it updates the existing page and row rather than creating a duplicate.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | Auto-discover task databases, create/update review in [FOS] Briefings |
| gws CLI (Calendar) | Optional | Fetch meeting counts, hours, and attendance data |
| gws CLI (Gmail) | Optional | Scan sent/received threads for communication metrics |

## Commands

### `/founder-os:review:review`

**What it does** -- Generates a structured weekly review for a Monday-through-Sunday window. Auto-discovers all qualifying Notion task databases, pulls completed and in-progress tasks, fetches calendar events and meeting metrics, scans Gmail for communication volume and unanswered threads, and synthesizes everything into a 6-section review document. Detects blockers using multiple signals (overdue tasks, stagnant items, high-volume unresolved email threads, meeting-heavy days with zero completions) and ranks next-week priorities using a weighted scoring algorithm.

**Usage:**
```
/founder-os:review:review
/founder-os:review:review --date=2026-03-10
/founder-os:review:review --output=chat
/founder-os:review:review --output=both
/founder-os:review:review --date=2026-03-10 --output=notion
/founder-os:review:review --schedule="0 17 * * 5"
```

**Example scenario:**
> It's Friday afternoon. You run `/founder-os:review:review` and it auto-discovers 3 task databases in your Notion workspace (your main [FOS] Tasks board, a product roadmap database, and a hiring tracker). It finds 24 completed tasks across those databases, groups them by project, and highlights your biggest win: closing 3 deals this week. Calendar data shows 18 meetings totaling 14 hours, with Tuesday being your busiest day. Gmail reveals 47 sent emails and 2 unanswered inbound threads that are now 5 days old. The blocker detection flags those unanswered threads as "Warning" severity and identifies a stagnant API integration task that hasn't moved in 12 days. Next-week priorities are ranked with the overdue API task at the top. The full review is published as a Notion page with a direct link.

**What you get back:**

A 6-section review document:

1. **Executive Summary** -- 2-3 sentence overview with key metrics and a week assessment (Productive/Moderate/Light)
2. **Wins by Project** -- Completed tasks grouped by source database and project, sorted by completion count
3. **Meetings & Outcomes** -- Meeting count, total hours, busiest/lightest days, meetings grouped by day with external meetings highlighted
4. **Blockers & Risks** -- Multi-signal detection with severity levels (Critical/Warning/Watch), grouped by theme when related
5. **Carryover Items** -- Incomplete tasks grouped by priority tier, with days-in-status and stagnation flags for items stuck 14+ days
6. **Next Week Priorities** -- Top 5 items ranked by a weighted algorithm (due date urgency 50%, carryover penalty 30%, priority property 20%), plus a calendar preview showing meeting-heavy days and the best day for deep work

**Flags:**
- `--date=YYYY-MM-DD` -- Any date within the target review week; resolves to that week's Monday-Sunday window (default: most recent completed week)
- `--output=VALUE` -- Where to deliver the review: `notion`, `chat`, or `both` (default: `notion`)
- `--schedule="CRON"` -- Set up recurring execution (default suggestion: Fridays at 5:00pm)
- `--persistent` -- Keep the schedule active across sessions (used with `--schedule`)

---

## Tips & Patterns

- **End-of-week ritual**: Run `/founder-os:review:review` every Friday afternoon. Use `--schedule="0 17 * * 5"` to automate it.
- **Monday planning boost**: Review last week's output on Monday morning alongside your daily briefing. The "Next Week Priorities" section from Friday becomes your starting plan, and the daily briefing shows what's changed since then.
- **Spot patterns over time**: Run reviews consistently and compare the Blockers section week over week. Recurring themes (always behind on the same project, consistently overdue on follow-ups) point to systemic issues worth addressing.
- **Multiple databases are fine**: You don't need to consolidate all your tasks into one database. The auto-discovery scans every qualifying Notion database in your workspace, so project-specific boards are included automatically.
- **Chat mode for quick reflection**: Use `--output=chat` when you want to review the data without publishing a permanent Notion page -- useful for ad-hoc check-ins mid-week.
- **Feed into goal tracking**: Pair your weekly review with `/founder-os:goal:check` to see how your weekly output connects to your longer-term goals and milestones.

## Related Namespaces

- [Briefing](./briefing.md) -- Daily briefings feed into the weekly review's metrics; the review aggregates what your briefings tracked day by day
- [Inbox](./inbox.md) -- Email volume from inbox triage contributes to the review's communication section
- [Prep](./prep.md) -- Meeting prep documents stored in [FOS] Meetings provide context for the review's Meetings & Outcomes section
- [Actions](./actions.md) -- Action items created during the week appear as wins (completed) or carryover/blockers (incomplete) in the review
