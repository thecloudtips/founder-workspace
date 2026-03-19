# Goal

> Track business goals with milestones, RAG status, velocity projections, and Gantt timelines -- all from the command line.

## Overview

The Goal namespace gives you a lightweight but rigorous goal-tracking system built on Notion. Create goals with target dates and milestones, update progress through milestone completions or manual percentage bumps, and get real-time RAG (Red/Amber/Green) status calculations that tell you whether you're on track, at risk, or behind.

Progress is computed automatically from milestone completion ratios. Velocity projections estimate when you'll finish based on your actual pace. Blocker detection flags overdue milestones and deadline overruns. And the report command generates a full dashboard with a Mermaid Gantt timeline, so you can see your entire goal portfolio at a glance.

The system is designed for the founder who has 3-10 active goals and wants honest, data-driven status updates without the overhead of a full project management tool.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | Stores goals and milestones in Notion databases |

## Commands

### `/founder-os:goal:create`

**What it does** -- Creates a new goal with an optional target date, category, and milestones. Categories are auto-detected from the goal description (Revenue, Product, Operations, Team, Personal, Technical, Marketing, Other). Milestones are created as linked Notion pages with sequential ordering.

**Usage:**

```
/founder-os:goal:create "[goal name]" [--target=YYYY-MM-DD] [--category=CAT] [--milestones=M1,M2,M3]
```

**Example scenario:**

> You want to launch your MVP by end of Q2. You create the goal with four milestones: Design mockups, Build prototype, User testing, Ship v1. The system creates the goal at 0% progress with a "Not Started" status, assigns it to the Product category, and links all four milestones in order.

**What you get back:**

- Goal page created in Notion with all properties
- Milestone pages linked to the goal with sequential ordering
- Visual progress bar (starts at 0%)
- Pointers to update and check commands

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--target=YYYY-MM-DD` | No deadline | Target completion date |
| `--category=CAT` | Auto-detected | One of 8 categories |
| `--milestones=M1,M2,M3` | None | Comma-separated milestone names |

---

### `/founder-os:goal:update`

**What it does** -- Updates an existing goal's progress, milestones, status, or notes. Complete milestones with `--done`, add new ones with `--add`, set manual progress with `--progress`, change status with `--status`, or append notes. After changes, the system recalculates RAG status, velocity projection, and blocker detection automatically.

**Usage:**

```
/founder-os:goal:update "[goal name]" [--progress=N] [--done=MILESTONE] [--add=MILESTONE] [--status=STATUS] [--note=TEXT]
```

**Example scenario:**

> You just finished the design mockups milestone for your MVP goal. You run update with `--done="Design mockups"` and `--note="Finalized with client approval"`. The system marks the milestone as Done, recalculates progress from 0% to 25% (1 of 4 milestones), auto-transitions status to "In Progress", and sets the start date.

**What you get back:**

- Updated progress bar with before/after comparison
- RAG status recalculation
- Velocity projection with estimated completion date
- Milestone progress (X/Y completed)
- Blocker alerts if any are detected

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--progress=N` | -- | Manual progress 0-100 (only for goals without milestones) |
| `--done=MILESTONE` | -- | Mark a milestone as Done |
| `--add=MILESTONE` | -- | Add a new milestone |
| `--status=STATUS` | -- | Change goal status |
| `--note=TEXT` | -- | Append a timestamped note |

---

### `/founder-os:goal:check`

**What it does** -- Quick, read-only status check. Two modes: provide a goal name for a detailed single-goal view with milestones, RAG status, velocity, and blockers; or run with no arguments for a compact all-goals dashboard table. Never writes to Notion.

**Usage:**

```
/founder-os:goal:check ["goal name"]
```

**Example scenario:**

> Before your Monday standup, you run `goal:check` with no arguments and get a dashboard showing all 5 active goals: 2 on track (green), 2 at risk (yellow), and 1 behind schedule (red). You then drill into the red goal to see that its "User testing" milestone is 8 days overdue.

**What you get back:**

- **Single-goal mode:** Full detail view with progress bar, RAG status, velocity, milestone checklist, blockers, and recent notes
- **All-goals mode:** Compact dashboard table with progress bars, RAG indicators, and target dates, plus a summary count by RAG status

**Flags:**

None -- this command is intentionally simple. Provide a goal name for detail, or omit for the dashboard.

---

### `/founder-os:goal:close`

**What it does** -- Closes a goal as completed or archives it. Validates milestone completion status and warns about incomplete work (unless `--force` is used). Generates a final summary with duration and milestone tally.

**Usage:**

```
/founder-os:goal:close "[goal name]" [--archive] [--force] [--note=TEXT]
```

**Example scenario:**

> Your MVP launched successfully. You close the goal with a note about shipping to 50 beta users. The system sets progress to 100%, transitions status to Completed, calculates total duration (47 days), and displays a final summary showing 4/4 milestones completed.

**What you get back:**

- Final progress and status confirmation
- Duration calculation (start date to today)
- Milestone completion tally
- Closing note (if provided)

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--archive` | -- | Archive instead of completing (sets status to Archived) |
| `--force` | -- | Skip incomplete milestone warning |
| `--note=TEXT` | -- | Closing note appended to the goal |

---

### `/founder-os:goal:report`

**What it does** -- Generates a comprehensive goal progress dashboard with a dashboard table, RAG breakdown by tier, blockers analysis with suggested actions, and a Mermaid Gantt timeline showing all goals on a calendar. Updates RAG status and projections for all goals as a side effect.

**Usage:**

```
/founder-os:goal:report [--category=CAT] [--status=red|yellow|green|active|all] [--output=chat|notion|file] [--path=PATH]
```

**Example scenario:**

> At the end of the quarter, you generate a full report. The dashboard shows 8 goals across 4 categories, with a Gantt timeline spanning Q2. Two goals are flagged red with specific blockers and suggested remediation actions. You export the report to a file for your quarterly review deck.

**What you get back:**

- Dashboard table sorted by RAG severity
- RAG breakdown with per-tier analysis
- Needs Attention section with blockers and suggested actions
- Mermaid Gantt timeline grouped by category
- Summary stats (on track / at risk / behind / not started)

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--category=CAT` | All | Filter by goal category |
| `--status` | `all` | Filter: `red`, `yellow`, `green`, `active`, `all` |
| `--output` | `chat` | `chat`, `notion`, or `file` |
| `--path=PATH` | Auto-generated | File path for file output |

---

## Tips & Patterns

- **Use milestones for anything with more than one step.** Manual percentage tracking is fine for simple goals like "Reach $50K MRR", but milestones give you automatic progress calculation and better visibility.
- **Check daily, report weekly.** Run `goal:check` (no arguments) as part of your morning routine for a quick pulse. Run `goal:report` weekly to get the full picture with Gantt chart.
- **Trust the RAG status.** Red means you're behind schedule based on your actual velocity. Don't ignore it -- either adjust the timeline or accelerate the work.
- **Close completed goals promptly.** Leaving completed goals open clutters your dashboard. Close them with a note documenting the outcome for future reference.

## Related Namespaces

- **[Learn](/commands/learn)** -- Log insights about what's working and what's not as you pursue your goals
- **[Savings](/commands/savings)** -- Quantify how Founder OS time savings contribute to goal progress
- **[Workflow](/commands/workflow)** -- Automate recurring tasks that feed into your goals
