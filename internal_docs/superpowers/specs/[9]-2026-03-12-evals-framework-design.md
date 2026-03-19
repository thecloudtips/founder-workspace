# Evals & Quality Framework — Design Spec

**Date**: 2026-03-12
**Status**: Draft
**Priority**: P2 — Quality infrastructure
**Research**: `docs/specs/evals-research.md`

## Problem

Founder OS has 32 command namespaces producing LLM-generated outputs (email drafts, meeting briefs, invoices, reports). There is no systematic way to measure output quality, detect regressions, or feed quality signals back into the learning cycle. The existing intelligence engine tracks pattern confidence but doesn't evaluate whether outputs actually satisfy the founder's needs.

Without quality measurement, the system can't answer: "Is my AI assistant getting better or worse?"

## Solution

A three-layer eval framework embedded as a sub-module of the existing intelligence engine. Deterministic checks run synchronously via a Node.js runner. LLM-based scoring runs asynchronously via a background Haiku agent. Results feed into the existing pattern lifecycle. Founders see nothing unless quality regresses — then they get a warning.

**Key design principles:**
- Zero founder configuration — evals work automatically after plugin install
- Zero session overhead — LLM scoring runs in background, never blocks the founder
- Programmatic where possible — Tier 0 and Tier 1 are pure Node.js, not LLM-interpreted
- Silent by default — regression alerts only, no inline badges or scores
- Minimal schema — 4 tables, add more only when proven necessary

## Design

### Architecture Overview

```
EVAL PIPELINE
=============

Founder runs /founder-os:namespace:command
                    │
                    ▼
         ┌──────────────────┐
         │  COMMAND EXECUTES │
         │  (normal flow)    │
         └────────┬─────────┘
                  │ output generated
                  ▼
         ┌──────────────────┐
         │  post-task HOOK   │
         │  fires            │
         └────────┬─────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │  NODE.JS EVAL RUNNER        │
    │  (synchronous, <50ms)       │
    │                             │
    │  Tier 0: Telemetry          │
    │  • Token count, duration    │
    │  • SHA-256 input/output     │
    │  • INSERT into exec_log     │
    │                             │
    │  Tier 1: Format Checks      │
    │  • Required sections        │
    │  • Word count bounds        │
    │  • Forbidden patterns       │
    │  • UPDATE exec_log.t1_pass  │
    │                             │
    │  Sampling Decision          │
    │  • T1 fail → always Tier 2  │
    │  • Otherwise → 20% random   │
    └──────────┬──────────────────┘
               │
        ┌──────┴──────┐
   NOT SAMPLED     SAMPLED
        │              │
        ▼              ▼
   exit 0          SPAWN eval-judge
   (done)          AGENT (background)
                   model: haiku
                        │
                        ▼
                   ┌─────────────────┐
                   │  EVAL JUDGE      │
                   │  (async, ~500ms) │
                   │                  │
                   │  Per dimension:  │
                   │  • Read criterion│
                   │  • YES/NO judge  │
                   │  • 1-line reason │
                   │                  │
                   │  Write results   │
                   │  to eval_results │
                   │  Update EWMA     │
                   └─────────────────┘

REGRESSION ALERTING (separate flow)
====================================

Founder runs any command
        │
        ▼
   pre-task HOOK fires
        │
        ▼
   node eval-runner.mjs --check-regression
        │
        ▼
   Query EWMA for namespace (~1ms)
        │
   ├── EWMA ≥ 0.65 → silent (exit 0)
   └── EWMA < 0.65 → print warning:
       "⚠️ Quality for {ns} commands has dropped
        recently. Run /founder-os:intel:health"
       (once per session per namespace)
```

### Component 1: Deterministic Runner

**Location:** `_infrastructure/intelligence/evals/`

```
_infrastructure/intelligence/evals/
├── eval-runner.mjs          — Main entry, called by post-task hook
├── checks/
│   ├── telemetry.mjs        — Tier 0: token count, duration, hashes
│   ├── format.mjs           — Tier 1: sections, word count, forbidden patterns
│   └── schema.mjs           — Tier 1: JSON/structure validation
├── rubrics/
│   ├── universal.json       — Default 6-dimension rubric
│   └── overrides/           — Per-namespace rubric overrides
│       ├── inbox.json
│       ├── invoice.json
│       ├── prep.json
│       └── (added per namespace as needed)
├── db.mjs                   — SQLite read/write, migration checks
└── sampler.mjs              — Sampling decision logic
```

**Entry point:** `eval-runner.mjs` accepts CLI arguments:

```bash
# Post-task eval mode
node eval-runner.mjs \
  --namespace inbox \
  --command triage \
  --output-file /tmp/fos-exec-{id}.txt \
  --tokens-in 1200 \
  --tokens-out 800 \
  --duration-ms 3400

# Regression check mode
node eval-runner.mjs --check-regression --namespace inbox
```

**Rubric format (JSON, not markdown):**

```json
{
  "namespace": "inbox",
  "tier1": {
    "required_sections": ["Subject:", "Body:"],
    "min_words": 50,
    "max_words": 500,
    "forbidden_patterns": ["[PLACEHOLDER]", "INSERT_NAME", "{name}"],
    "required_json_fields": null
  },
  "tier2": {
    "sample_rate": 0.20,
    "dimensions": ["accuracy", "tone", "actionability"],
    "weights": {
      "accuracy": 0.25,
      "tone": 0.15,
      "actionability": 0.20
    },
    "criteria": {
      "accuracy": "No fabricated data or claims not present in source",
      "tone": "Professional, matches founder voice profile",
      "actionability": "Includes concrete next step the founder can take"
    },
    "threshold": 0.70
  }
}
```

**Rubric merging rules:**
- Namespace overrides merge on top of `universal.json`
- If no override exists for a namespace, universal rubric applies (both Tier 1 and Tier 2)
- `universal.json` defines baseline Tier 1 checks (non-empty output, min 10 words, max 5000 words) and all 6 Tier 2 dimensions with default weights
- Namespace overrides can: add Tier 1 checks (e.g., required sections), adjust Tier 2 dimension weights, override criteria text, change sample rate
- Override weights replace universal weights for specified dimensions; unspecified dimensions keep universal weights; all weights are re-normalized to sum to 1.0

**Dependencies:** `better-sqlite3` (added to plugin `package.json`), `crypto` (built-in Node.js). No other runtime dependencies.

### Component 2: Eval Judge Agent

**Location:** `agents/intel/eval-judge.md`

**Configuration:**
- Model: `haiku` (Boolean rubric scoring is low-complexity)
- Execution: `run_in_background: true` (non-blocking)
- Timeout: 30 seconds

**Agent behavior:**
1. Receives: command output text, rubric criteria, execution context, and the `intelligence.db` file path
2. For each dimension in the rubric: evaluates YES/NO with one-sentence reasoning
3. Computes weighted overall score across all evaluated dimensions
4. Writes results directly to `eval_results` table via `db.mjs` (the agent calls `node db.mjs --write-eval` as its final step)

**Write path:** The agent is responsible for persisting its own results. It receives the database path as part of its spawn context and calls the eval runner's `db.mjs` module to INSERT rows into `eval_results` and update the EWMA. This avoids the anti-pattern of the hook trying to collect results from an async process it no longer controls.

**Output format (all 6 universal dimensions evaluated, namespace overrides adjust weights):**

```json
{
  "execution_id": "exec-abc123",
  "scores": {
    "completeness": { "pass": true, "weight": 0.20, "reasoning": "All requested sections present" },
    "accuracy": { "pass": true, "weight": 0.25, "reasoning": "All claims supported by source email data" },
    "tone": { "pass": true, "weight": 0.15, "reasoning": "Professional register, appropriate for client context" },
    "actionability": { "pass": false, "weight": 0.20, "reasoning": "No specific next step mentioned in closing" },
    "format": { "pass": true, "weight": 0.10, "reasoning": "Follows expected email structure" },
    "hallucination": { "pass": true, "weight": 0.10, "reasoning": "No fabricated entities or claims" }
  },
  "overall_score": 0.80,
  "label": "PASS"
}
```

**Dimension selection and weight merging:**
- The agent always evaluates all 6 universal dimensions
- Namespace overrides adjust weights for specific dimensions (e.g., inbox elevates `tone` from 0.10 to 0.15)
- Overridden weights replace universal weights; non-overridden dimensions keep universal weights
- Weights are re-normalized to sum to 1.0 after merging

**Scoring math:**
- Dimension score: 1.0 if pass, 0.0 if fail (Boolean)
- Overall score: weighted sum using merged rubric weights (always sums to 1.0)
- Label: PASS (≥ 0.70), WARN (0.50-0.70), FAIL (< 0.50)

**Error handling:**
- Agent timeout (30s): the `exec_log` row exists without corresponding `eval_results` rows. The health dashboard treats missing eval data as "not evaluated" — it does not inflate scores. EWMA remains unchanged (no update on missing data).
- SQLite busy/locked: `db.mjs` uses `PRAGMA busy_timeout = 5000` (5s retry). If still locked, the write is silently dropped — the exec_log row remains, eval results are lost for this execution only. This is acceptable at 10 evals/day.

**Cost:** ~$0.0002 per Tier 2 eval on Haiku. At 50 daily executions with 20% sampling = 10 evals/day = **~$0.06/month**. Dramatically cheaper than the research's Sonnet estimate of $2.63/month.

### Component 3: Hook Integration

**post-task hook configuration:**

The existing intelligence engine hooks infrastructure gains an eval step. The hook:
1. Captures command output (writes to temp file)
2. Calls `node eval-runner.mjs` with execution metadata
3. Runner returns sampling decision
4. If Tier 2 needed: hook spawns eval-judge agent in background

The hook is **non-blocking** — Tier 0+1 complete in <50ms, agent spawns asynchronously, the founder's session continues immediately.

**pre-task hook configuration:**

Before each command execution, the hook:
1. Calls `node eval-runner.mjs --check-regression --namespace {ns}`
2. Runner queries latest EWMA scores from `eval_results` (~1ms SQLite query)
3. If EWMA < 0.65: prints warning to stdout
4. Warning shown only once per session per namespace — tracked via `exec_log`: the runner queries `SELECT MAX(executed_at) FROM exec_log WHERE namespace = ? AND t1_details LIKE '%regression_warned%'`. If a warning was already issued within the current Claude Code process lifetime (approximated as last 30 minutes), skip. This avoids temp file management and session boundary ambiguity.

**EWMA computation:**

Updated incrementally on each new eval result:
```
ewma_new = 0.15 × score_new + 0.85 × ewma_previous
```

- α = 0.15 gives a half-life of ~4.3 observations
- Sensitive enough to detect sustained drops within 5-7 executions
- Regression threshold: 0.65 (early warning, before quality becomes noticeable)
- **Initialization:** First eval for a namespace seeds EWMA at the raw score value (no prior to blend with)
- **Ordering:** EWMA is computed by the eval-judge agent at write time using the latest stored EWMA for that namespace+dimension. WAL mode + `PRAGMA busy_timeout = 5000` serializes concurrent writes. At 10 evals/day, race conditions are negligible.

### Component 4: Database Schema

All tables extend `intelligence.db`. Auto-created on first eval run via migration check in `db.mjs`.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;  -- 5s retry on busy (background agent writes)

-- Reference data: what quality axes exist
CREATE TABLE IF NOT EXISTS eval_dimensions (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    data_type   TEXT NOT NULL DEFAULT 'BOOLEAN',  -- BOOLEAN | NUMERIC (future)
    weight      REAL DEFAULT 1.0,
    created_at  TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO eval_dimensions (id, name, description, weight) VALUES
('dim_completeness',  'completeness',  'All required elements present',      0.20),
('dim_accuracy',      'accuracy',      'Facts, numbers, references correct', 0.25),
('dim_tone',          'tone',          'Appropriate voice and register',     0.10),
('dim_actionability', 'actionability', 'User can act immediately',           0.20),
('dim_format',        'format',        'Follows expected output structure',  0.10),
('dim_hallucination', 'hallucination', 'No fabricated information',          0.15);

-- Versioned rubric definitions (immutable — archive, never edit)
CREATE TABLE IF NOT EXISTS eval_rubrics (
    id              TEXT PRIMARY KEY,
    dimension_id    TEXT NOT NULL,
    namespace       TEXT,
    command         TEXT,
    version         INTEGER NOT NULL DEFAULT 1,
    checklist_items TEXT NOT NULL,
    eval_type       TEXT DEFAULT 'llm_judge',
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (dimension_id) REFERENCES eval_dimensions(id)
);

-- One row per command execution (Tier 0 + Tier 1)
CREATE TABLE IF NOT EXISTS exec_log (
    id              TEXT PRIMARY KEY,
    namespace       TEXT NOT NULL,
    command         TEXT NOT NULL,
    input_hash      TEXT,
    output_hash     TEXT,
    output_preview  TEXT,
    token_input     INTEGER,
    token_output    INTEGER,
    duration_ms     INTEGER,
    t1_pass         INTEGER,
    t1_details      TEXT,
    executed_at     INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_exec_log_cmd
    ON exec_log(namespace, command, executed_at);

-- One row per dimension per Tier 2+ evaluation
CREATE TABLE IF NOT EXISTS eval_results (
    id              TEXT PRIMARY KEY,
    execution_id    TEXT NOT NULL,
    namespace       TEXT NOT NULL,
    command         TEXT NOT NULL,
    dimension_id    TEXT NOT NULL,
    rubric_id       TEXT,
    score           REAL NOT NULL,
    pass            INTEGER NOT NULL,
    score_label     TEXT,
    eval_tier       INTEGER NOT NULL DEFAULT 2,
    reasoning       TEXT,
    ewma_score      REAL,
    evaluated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (execution_id) REFERENCES exec_log(id),
    FOREIGN KEY (dimension_id) REFERENCES eval_dimensions(id)
);
CREATE INDEX IF NOT EXISTS idx_eval_results_exec
    ON eval_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_ns_time
    ON eval_results(namespace, command, evaluated_at);
-- Covering index for regression check hot path (pre-task hook, every command)
CREATE INDEX IF NOT EXISTS idx_eval_results_ewma
    ON eval_results(namespace, evaluated_at DESC, ewma_score);
```

**Column naming convention:** The existing intelligence engine tables (`events`, `patterns`, `healing_patterns`) use the column name `plugin` where these eval tables use `namespace`. Both refer to the same concept (the 32 Founder OS command namespaces). The eval tables use `namespace` for clarity since "plugin" is ambiguous in a single-plugin architecture. When joining across boundaries (e.g., `eval_results` with `patterns`), use `eval_results.namespace = patterns.plugin`.

**Storage estimate:** ~300 bytes per `eval_results` row. At 10 evals/day × 365 days = 3,650 rows/year (~1.1 MB). With `exec_log` at 50 rows/day = 18,250 rows/year (~3.6 MB). Total eval storage: **< 5 MB/year**. SQLite handles this trivially.

**Retention:** Raw data kept 90 days. Cleanup triggered by the eval runner itself: on every 100th `exec_log` INSERT (checked via `exec_log` row count modulo 100), the runner runs `DELETE FROM eval_results WHERE evaluated_at < unixepoch() - 7776000` and same for `exec_log`. This piggybacks on existing execution flow — no cron, no daemon, no separate trigger needed. At 50 executions/day, cleanup runs roughly twice daily.

### Component 5: User-Facing Command

**Phase 1 — Single command:** `/founder-os:intel:health`

**Location:** `commands/intel/health.md` (extends existing intel namespace)

**Output:**

```
📊 Founder OS Quality Report
═══════════════════════════════

Overall: 0.82 (GOOD) — 147 executions evaluated

By Namespace (last 30 days):
  inbox      ████████████████░░░░  0.84  (32 evals)
  briefing   ███████████████░░░░░  0.78  (28 evals)
  prep       █████████████████░░░  0.88  (19 evals)
  report     ████████████████░░░░  0.81  (14 evals)
  invoice    █████████████████████  0.95  (11 evals, deterministic)

Regressions: None detected ✅

Lowest Scoring Dimensions:
  actionability  0.68 ⚠️  (across all namespaces)
  tone           0.71     (inbox namespace)

Tip: Actionability scores suggest commands could include
     clearer next steps. The system is learning from
     high-scoring outputs to improve this automatically.
```

The command queries `eval_results` and `exec_log` directly — no pre-aggregated snapshot table needed. SQLite computes aggregates over < 5K rows in < 5ms.

**Cold start behavior:** When the health dashboard is run before enough eval data exists, it adapts its output:
- 0 evals: "Quality tracking is active. Data will appear here after your first few command runs. Check back in a day or two."
- 1-10 evals: Shows available data with a note: "Early data — scores will stabilize after ~20 evaluations."
- 10+ evals: Full dashboard output as shown above.

### Component 6: Learning Cycle Integration

The eval framework connects to the existing intelligence engine's Observe → Retrieve → Judge → Distill → Consolidate → Apply cycle:

**Observe:** `exec_log` captures structured telemetry on every execution. This replaces ad-hoc observation with consistent, queryable data.

**Retrieve:** When the intelligence engine retrieves candidate patterns for injection, it can now filter by eval performance. Patterns whose associated executions scored poorly are deprioritized. Query: `WHERE ewma_score >= 0.60 ORDER BY ewma_score DESC`.

**Judge:** The eval judge agent provides multi-dimensional quality scores that supplement (not replace) existing pattern confidence. Confidence = model certainty during generation. Eval score = post-hoc output quality. Both needed, presented as one "quality grade" to founders.

**Distill:** High-scoring outputs (overall ≥ 0.85, no dimension below 0.70) are flagged as candidate patterns. This is the existing distillation trigger, now informed by structured eval data instead of heuristics.

**Consolidate:** EWMA control charts drive pattern lifecycle transitions:
- Candidate → Active: ≥ 5 eval samples, EWMA ≥ 0.60
- Active → Approved: ≥ 20 samples, EWMA ≥ 0.80, no regression in last 10
- Any → Rejected: EWMA < 0.40 after ≥ 10 samples
- Approved → Active (demotion): EWMA drops below 0.65 for 3+ consecutive observations

**Apply:** Top-performing approved patterns injected as few-shot examples. When multiple patterns compete, selection uses the pattern with highest EWMA (Thompson Sampling deferred to Phase 3).

## Departures from Research

| Research Proposal | This Spec | Rationale |
|---|---|---|
| Eval config embedded in command markdown (`## Eval` sections) | Eval config in JSON rubric files, commands untouched | Zero changes to 32 command files; rubric config is data, not prompt |
| Claude interprets Tier 0+1 checks at runtime | Node.js runner executes checks programmatically | Truly $0 and deterministic; no token cost, no LLM interpretation errors |
| Tier 2 runs inline in founder's session (Sonnet) | Background Haiku agent, non-blocking | Zero session overhead; 10x cheaper (~$0.06/mo vs $2.63/mo) |
| 7 tables, 15 indexes | 4 tables, 3 indexes | Start minimal; dropped tables are derivable or premature optimization |
| 3 new commands (eval, eval-batch, health) | 1 command (health) in Phase 1 | Non-technical founders need a dashboard, not debugging tools |
| Inline quality badges on every output | Regression alerts only via pre-task hook | Silent when things work; warn when they don't |
| `implicit_signals` table for user behavior tracking | Deferred to Phase 3 | No reliable detection mechanism in Claude Code's architecture |
| Thompson Sampling for pattern selection | Deferred to Phase 3 | Simple highest-EWMA selection until proven insufficient |
| DSPy-style auto-optimization | Deferred to Phase 3, human-gated | Over-engineering risk for early stage |

## What Stays from Research

- Four-tier pipeline concept (Tier 0 → Tier 3)
- Boolean rubrics over Likert scales (80%+ human agreement)
- EWMA regression detection (α = 0.15, half-life ~4.3 observations)
- 20% sampling rate for Tier 2 (configurable per namespace)
- Universal + namespace-specific rubric hierarchy
- Integration with existing pattern lifecycle (candidate → active → approved)
- SQLite storage extending `intelligence.db`
- 90-day raw data retention with weekly cleanup
- Deterministic-only eval for financial commands (invoices, expenses)
- Prompt caching strategy for LLM judge calls

## Phasing

### Phase 1: Foundation
- Node.js eval runner with Tier 0 + Tier 1
- Eval judge agent (Haiku, background)
- 4-table SQLite schema
- Hook integration (post-task + pre-task)
- Universal rubric + 3 namespace overrides (inbox, invoice, prep)
- `/founder-os:intel:health` command
- Regression alerting via pre-task hook
- `better-sqlite3` added to `package.json`

### Phase 2: Expansion
- Rubric overrides for remaining high-volume namespaces
- `/founder-os:intel:eval` command for manual deep eval
- `/founder-os:intel:eval-batch` command for batch re-evaluation
- Tier 3 deep eval agent (model: sonnet, on-demand)
- Optional `## Eval` override sections in command markdown
- Pattern lifecycle integration (eval-informed candidate promotion)

### Phase 3: Optimization
- `implicit_signals` table + detection hooks
- `quality_snapshots` denormalization (if query perf demands it)
- `pattern_effectiveness` table for A/B testing
- Thompson Sampling for multi-pattern selection
- DSPy-style auto-optimization (human-gated, monthly)
- Embedding-based input drift detection via HNSW store
- Adversarial red-team eval command (optional)

## Risk Matrix

| Risk | Prob | Impact | Mitigation |
|---|---|---|---|
| Haiku judge scores too generously on Boolean rubrics | Medium | Medium | Calibrate with 10 human-annotated golden examples per namespace; track score distributions |
| `better-sqlite3` native module causes install issues on some platforms | Low | High | Provide fallback to `sql.js` (pure WASM SQLite); test on macOS, Linux, Windows |
| Post-task hook adds perceptible latency | Low | Medium | Tier 0+1 budget: <50ms; if exceeded, make async |
| Rubric criteria too vague for reliable Boolean scoring | Medium | Medium | Iterative rubric refinement based on score variance; tighten criteria that produce inconsistent results |
| EWMA threshold too sensitive, false regression alerts | Low | Medium | Start at 0.65, tune based on real data; add minimum sample count (≥ 5) before alerting |
| Health dashboard empty on first run, disappointing founder | Medium | Low | Cold start messaging: explain data is accumulating, show partial data when available |
| SQLite lock contention between sync runner and async agent | Low | Low | WAL mode + `busy_timeout = 5000`; at 10 evals/day, contention is negligible |
| Eval-judge agent timeout (30s) leaves orphaned exec_log rows | Low | Low | Acceptable: missing eval data treated as "not evaluated", not as positive score |

## Installation & Setup

**For founders (zero-config):**
- `npm install` adds `better-sqlite3` dependency
- First command execution auto-creates eval tables in `intelligence.db`
- Rubric JSON files ship with the plugin
- Eval agent definition ships in `agents/intel/`
- Hooks auto-configured by intelligence engine
- No API keys, no configuration, no setup commands

**Future distribution:**
- All eval dependencies declared in plugin `package.json`
- Compatible with planned `npx` distribution model
- No external services, no daemon processes, no network calls (except Haiku agent via Claude Code)
