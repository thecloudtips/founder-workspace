---
name: intel-health
description: Quality dashboard showing eval scores, namespace trends, regression alerts, and dimension analysis
usage: /founder-os:intel:health
arguments: none
execution-mode: background
result-format: summary
---

# /founder-os:intel:health

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `intel` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Observation: Start
Before executing this command, record the following to the Intelligence event store:
- Event type: pre_command
- Plugin: intel
- Command: health
- Payload: { arguments: none }
- Generate a session_id (UUID) for this execution and use it for all subsequent events

## Quality Dashboard

Display a comprehensive quality report based on eval data from the Intelligence database.

### Step 1: Read Intelligence Database

Read the Intelligence SQLite database at `_infrastructure/intelligence/.data/intelligence.db`.

If the database does not exist, display:
```
📊 Founder OS Quality Report
═══════════════════════════════
Quality tracking is active. Data will appear here after your
first few command runs. Check back in a day or two.
```
And stop here.

### Step 2: Check Data Volume

Query: `SELECT COUNT(DISTINCT execution_id) as eval_count FROM eval_results`

If this query fails with "no such table: eval_results", treat it the same as 0 evals — the eval tables are auto-created on first eval run, so they may not exist yet on a fresh install.

- **0 evals (or missing table):** Display "Quality tracking is active. Data will appear here after your first few command runs. Check back in a day or two." and stop.
- **1-10 evals:** Proceed but add note: "Early data — scores will stabilize after ~20 evaluations."
- **10+ evals:** Full dashboard output.

### Step 3: Compute Overall Score

Query the last 30 days:

```sql
SELECT AVG(score) as overall_avg,
       COUNT(DISTINCT execution_id) as eval_count
FROM eval_results
WHERE evaluated_at > unixepoch() - (30 * 86400)
```

Map overall score to label:
- >= 0.85: EXCELLENT
- >= 0.70: GOOD
- >= 0.50: NEEDS ATTENTION
- < 0.50: POOR

### Step 4: Compute Per-Namespace Scores

```sql
SELECT namespace,
       COUNT(DISTINCT execution_id) as eval_count,
       AVG(score) as avg_score,
       (SELECT ewma_score FROM eval_results er2
        WHERE er2.namespace = er.namespace AND er2.ewma_score IS NOT NULL
        ORDER BY er2.evaluated_at DESC LIMIT 1) as latest_ewma
FROM eval_results er
WHERE evaluated_at > unixepoch() - (30 * 86400)
GROUP BY namespace
ORDER BY eval_count DESC
```

### Step 5: Detect Regressions

```sql
SELECT namespace, ewma_score
FROM (
  SELECT namespace, ewma_score,
         ROW_NUMBER() OVER (PARTITION BY namespace ORDER BY evaluated_at DESC) as rn
  FROM eval_results
  WHERE ewma_score IS NOT NULL
)
WHERE rn = 1 AND ewma_score < 0.65
```

### Step 6: Find Lowest Dimensions

```sql
SELECT dimension_id, namespace, AVG(score) as avg_score
FROM eval_results
WHERE evaluated_at > unixepoch() - (30 * 86400)
GROUP BY dimension_id, namespace
HAVING avg_score < 0.75
ORDER BY avg_score ASC
LIMIT 5
```

### Step 7: Display Dashboard

Format output:

```
📊 Founder OS Quality Report
═══════════════════════════════

Overall: {overall_avg} ({label}) — {eval_count} executions evaluated

By Namespace (last 30 days):
  {namespace}  {bar}  {latest_ewma}  ({eval_count} evals)
  ...

Regressions: {count} detected {✅ or ⚠️}
  {namespace}: EWMA {ewma_score} (below 0.65 threshold)
  ...

Lowest Scoring Dimensions:
  {dimension}  {avg_score} {⚠️ if < 0.70}  ({namespace})
  ...

{tip based on lowest dimension}
```

Bar chart: use Unicode block characters. Map score 0.0-1.0 to 0-20 blocks:
- █ for filled, ░ for empty

### Notes
- All queries are read-only
- If any query fails, show "unavailable" for that section
- Round scores to 2 decimal places
- Show namespace names in lowercase

## Observation: End
After execution completes, record the following to the Intelligence event store:
- Event type: post_command
- Use the same session_id from the pre_command event
- Payload: { outcome summary, sections displayed }
- Outcome: "success" | "failure" | "degraded"
- Duration: time elapsed since pre_command event
