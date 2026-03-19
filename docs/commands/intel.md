# Intel

> Monitor and control the Adaptive Intelligence Engine -- the system that learns your preferences and heals errors automatically.

## Overview

The Intel namespace is the control panel for the Adaptive Intelligence Engine that runs beneath every Founder OS command. The engine captures events from all plugin executions, distills behavioral patterns (like your preference for concise email drafts), and applies those patterns to future runs. It also monitors errors and automatically retries, recovers, or degrades gracefully when things go wrong.

You don't need to interact with Intel for the system to work -- it operates silently by default. But when you want visibility into what the engine has learned, want to promote a useful pattern to permanent status, need to investigate self-healing events, or want to tune the system's autonomy level, this is where you go.

The seven commands cover the full lifecycle: view the dashboard, explore learned patterns, approve good ones, review healing events, check quality scores, configure thresholds, and reset when needed.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| SQLite (via Intelligence DB) | Yes | Reads the intelligence database |

## Commands

### `/founder-os:intel:status`

**What it does** -- Displays a comprehensive dashboard showing hooks activity (events captured), learning status (patterns detected), self-healing metrics (recovery success rate), and the top active patterns. This is your single-pane-of-glass view into the intelligence engine.

**Usage:**

```
/founder-os:intel:status
```

**Example scenario:**

> You've been using Founder OS for a month and want to see how the intelligence engine is performing. The dashboard shows 847 events captured, 12 learned patterns (8 active, 3 candidate, 1 approved), and a 94% self-healing success rate across 17 recovery events this month.

**What you get back:**

- Hooks status with 30-day event count
- Learning status with pattern counts by status
- Self-healing metrics with success rate
- Top 3 active patterns (highest confidence)
- Recent 5 healing events
- Configuration summary

**Flags:**

None.

---

### `/founder-os:intel:patterns`

**What it does** -- Explore learned patterns in detail. Filter by plugin, pattern type (taste, workflow, autonomy), or status (candidate, active, approved, rejected). Use `--detail` to see the full history of a specific pattern including the instruction that gets injected into plugin context.

**Usage:**

```
/founder-os:intel:patterns [plugin|all] [--type=taste|workflow|autonomy] [--status=STATUS] [--detail=ID]
```

**Example scenario:**

> You notice your daily briefings have been consistently formatted with bullet points and want to understand why. You filter patterns by "daily-briefing" and find an active taste pattern with 82% confidence that says "concise email drafts under 150 words." You approve it to make it permanent.

**What you get back:**

- **List view:** Table of patterns with ID, plugin, type, confidence, status, and description
- **Detail view:** Full pattern record with instruction text, observation count, confirmation/rejection ratio, and related events

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `scope` | `all` | Plugin name or `all` |
| `--type` | All | `taste`, `workflow`, or `autonomy` |
| `--status` | All | `candidate`, `active`, `approved`, `rejected` |
| `--detail=ID` | -- | Show full detail for one pattern |

---

### `/founder-os:intel:approve`

**What it does** -- Promotes a learned pattern to permanently approved status. The pattern's confidence is locked at 1.0 and it will be applied to all matching future command runs without being subject to automatic rejection. Use this for patterns you've verified and want to keep.

**Usage:**

```
/founder-os:intel:approve <pattern-id>
```

**Example scenario:**

> The "concise email drafts" pattern has been working well for two weeks with no rejections. You approve it so it becomes a permanent part of your inbox triage behavior.

**What you get back:**

- Pattern details with confirmation prompt
- Approval confirmation with future application scope

**Flags:**

None -- just provide the pattern ID.

---

### `/founder-os:intel:healing`

**What it does** -- Displays the self-healing event log with error frequency analysis, fix effectiveness rates, and systemic issue detection. Identifies errors that recur across multiple sessions (which typically need manual intervention rather than automated recovery).

**Usage:**

```
/founder-os:intel:healing [--plugin=NAME]
```

**Example scenario:**

> You've been getting intermittent errors on the report generator and want to see if the self-healing system is handling them. The report shows 5 healing events in the last 7 days, with a "Notion API timeout" occurring across 3 sessions -- flagged as a systemic issue that needs attention.

**What you get back:**

- Recent healing events (last 7 days)
- Error frequency heatmap (last 30 days)
- Fix effectiveness table with success rates
- Systemic issues (recurring across 3+ sessions)

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--plugin=NAME` | All | Filter to a specific plugin |

---

### `/founder-os:intel:health`

**What it does** -- Quality dashboard showing eval scores across namespaces, regression detection, and lowest-scoring dimensions. This tells you which parts of Founder OS are performing well and which might need attention. Scores are based on automated evaluations that run after command executions.

**Usage:**

```
/founder-os:intel:health
```

**Example scenario:**

> After a week of heavy usage, you check the quality dashboard. Overall score is 0.82 (Good), but the "inbox" namespace has dropped to 0.61 with a regression alert. You drill into the lowest-scoring dimension and find that output format consistency dropped -- time to check your inbox triage configuration.

**What you get back:**

- Overall quality score with tier label
- Per-namespace scores with EWMA trends
- Regression alerts (namespaces below 0.65)
- Lowest-scoring dimensions with improvement tips

**Flags:**

None.

---

### `/founder-os:intel:config`

**What it does** -- View and modify the intelligence engine's configuration. Control learning thresholds, self-healing behavior, autonomy caps, and event retention. Changes take effect immediately with no restart needed.

**Usage:**

```
/founder-os:intel:config [key] [value] [--reset]
```

**Example scenario:**

> You want the intelligence engine to be more conservative about auto-applying patterns. You check the current autonomy level (`notify`) and lower the taste threshold from 0.5 to 0.7, meaning patterns need higher confidence before they're applied.

**What you get back:**

- **No arguments:** Full configuration table with all keys and values
- **Key only:** Current value for that setting
- **Key + value:** Update confirmation with before/after values
- **--reset:** Restore all settings to defaults

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `key` | -- | Configuration key to view or set |
| `value` | -- | New value for the key |
| `--reset` | -- | Reset all configuration to defaults |

---

### `/founder-os:intel:reset`

**What it does** -- Clears learned patterns for a specific plugin or all plugins. Raw events are preserved (only distilled patterns are deleted), so the engine can re-learn from future observations. Requires explicit confirmation.

**Usage:**

```
/founder-os:intel:reset [plugin|all] [--type=taste|workflow|autonomy]
```

**Example scenario:**

> You changed your workflow significantly and the old patterns for your inbox triage are causing unwanted behavior. You reset patterns for `inbox-zero` only, clearing 4 patterns. The engine will re-learn your new preferences from scratch.

**What you get back:**

- Count of patterns to be removed
- Confirmation prompt with scope and type details
- Deletion confirmation with re-learning note

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `scope` | -- | Plugin name or `all` (prompts if omitted) |
| `--type` | All | Only reset patterns of a specific type |

---

## Tips & Patterns

- **Check status monthly.** A monthly glance at `intel:status` tells you whether the engine is healthy, how many patterns have formed, and whether self-healing is catching issues.
- **Approve patterns you trust.** Promoted patterns become permanent and don't decay. If a pattern has been active for 2+ weeks with no rejections, approve it.
- **Watch for systemic issues.** The healing report flags errors recurring across 3+ sessions. These typically indicate a configuration problem (expired API token, changed database schema) rather than transient failures.
- **Tune autonomy to your comfort level.** The `learning.autonomy.max_level` setting controls how independently the engine acts: `ask` (most conservative), `suggest`, `notify` (default), or `silent` (most autonomous).

## Related Namespaces

- **[Memory](/commands/memory)** -- Explicitly teach facts and preferences (Intel learns them automatically)
- **[Setup](/commands/setup)** -- Verify that external tool connections are healthy
- **[Savings](/commands/savings)** -- The intelligence engine applies learned patterns to optimize all savings calculations
