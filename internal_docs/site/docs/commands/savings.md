# Savings

> Track exactly how much time and money Founder OS saves you -- with real data from your Notion workspace.

## Overview

Every time you use a Founder OS plugin, it creates a record in Notion. The Savings namespace scans those records, applies calibrated time estimates for each task category, and calculates how many hours (and dollars) you would have spent doing the work manually. No manual time-tracking required -- the data is already there.

The system covers 24 task categories across the full plugin ecosystem, from email triage to contract analysis. Each category has a pre-calibrated estimate for manual effort versus AI-assisted effort, and you can customize any estimate to match your actual workflow. Reports range from a 10-second quick glance to a multi-month ROI analysis with trend charts.

Whether you need a fast sanity check before a meeting or a polished report for your board, the Savings namespace turns your plugin usage into concrete productivity metrics.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | Scans all plugin databases for task counts |
| Filesystem MCP | Optional | Saves reports to local files |

## Commands

### `/founder-os:savings:quick`

**What it does** -- Displays a compact, chat-only summary of time saved by all active Founder OS plugins over a recent period. No files are created and nothing is logged to Notion. This is your fastest path to seeing the impact of your automation.

**Usage:**

```
/founder-os:savings:quick [--since=Nd|YYYY-MM-DD]
```

**Example scenario:**

> You're about to jump on a call with your co-founder and want a quick pulse on productivity gains this week. You run the command with no arguments and get an instant summary showing 12.5 hours saved across 47 tasks, with email triage as the top category.

**What you get back:**

- Total hours saved and equivalent work days
- Dollar value at your configured hourly rate
- Top 5 task categories ranked by time saved
- Active plugin count and not-installed count

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--since=Nd` | `7d` | Lookback period in days (e.g., `7d`, `30d`) |
| `--since=YYYY-MM-DD` | -- | Absolute start date to today |

---

### `/founder-os:savings:weekly`

**What it does** -- Produces a complete weekly savings report with a category breakdown table, Mermaid pie chart, plugin coverage summary, and ROI projections. Saves to a local file and/or Notion depending on your preference.

**Usage:**

```
/founder-os:savings:weekly [--week=YYYY-WNN] [--output=PATH] [--format=notion|file|both]
```

**Example scenario:**

> It's Friday afternoon and you want to document this week's productivity gains for your weekly standup notes. You run the command and it generates a 5-section report showing 18.7 hours saved worth $2,805, with a pie chart breaking down savings by category.

**What you get back:**

- Executive summary with headline metrics
- Category breakdown table with per-task ROI multipliers
- Top 5 savers ranked list with context
- Mermaid pie chart of time distribution
- Annualized projections based on the week's data

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--week=YYYY-WNN` | Current week | ISO week to report on (e.g., `2026-W10`) |
| `--output=PATH` | Auto-generated | File path for the report |
| `--format` | `both` | `notion`, `file`, or `both` |

---

### `/founder-os:savings:monthly-roi`

**What it does** -- Analyzes time savings trends across multiple months, computes period-over-period changes, generates bar charts, and projects annualized savings. This is the report you show investors, board members, or yourself when evaluating whether your AI tooling investment is paying off.

**Usage:**

```
/founder-os:savings:monthly-roi [YYYY-MM] [--months=N] [--output=PATH] [--format=notion|file|both]
```

**Example scenario:**

> At the end of Q1, you want to show your advisory board the cumulative impact of Founder OS. You run a 3-month analysis and get a report showing hours saved growing from 35 in January to 62 in March, with an annualized projection of $112K in saved labor costs.

**What you get back:**

- Monthly breakdown table with change flagging (e.g., "Significant increase", "Stable")
- Period-over-period trend direction (growing, stable, declining)
- Mermaid bar chart comparing months
- Annualized projections with confidence notes
- Best and worst months highlighted

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `YYYY-MM` | Current month | End month for the report |
| `--months=N` | `3` | Number of months to include (1-6) |
| `--output=PATH` | Auto-generated | File path for the report |
| `--format` | `both` | `notion`, `file`, or `both` |

---

### `/founder-os:savings:configure`

**What it does** -- Sets your hourly rate and customizes time estimates for any of the 24 task categories. Your configuration is stored locally and applied to all future savings calculations. This is the first command to run if you want dollar-value calculations or if the default estimates don't match your workflow.

**Usage:**

```
/founder-os:savings:configure [--rate=N] [--reset]
```

**Example scenario:**

> You realize the default 120-minute estimate for email triage is too high because you've already streamlined your inbox workflow. You run configure, set your rate to $200/hr, and override the email_triage category to 60 minutes manual / 10 minutes AI-assisted.

**What you get back:**

- Current configuration summary (rate, currency, overrides)
- Interactive walkthrough for customizing time estimates per category
- Confirmation of saved settings with a pointer to the quick command

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--rate=N` | -- | Set hourly rate directly (skip interactive prompt) |
| `--reset` | -- | Reset all custom overrides to defaults (keeps hourly rate) |

---

## Tips & Patterns

- **Start with quick, graduate to weekly.** Run `/founder-os:savings:quick` daily to build a habit, then use `/founder-os:savings:weekly` for your Friday review.
- **Set your rate early.** Dollar values make the reports much more compelling for stakeholders. Run `/founder-os:savings:configure --rate=175` once and forget about it.
- **Custom estimates matter.** If you're an expert in a domain (say, contract review), your manual time might be lower than the default. Customizing gives you honest numbers.
- **Monthly ROI for board decks.** The monthly report with bar charts is designed to drop into investor updates or internal reviews with minimal editing.

## Related Namespaces

- **[Workflow](/commands/workflow)** -- Automate multi-step processes to increase your savings over time
- **[Goal](/commands/goal)** -- Track business objectives that your time savings help you achieve
- **[Intel](/commands/intel)** -- The intelligence engine that helps all commands learn your preferences
