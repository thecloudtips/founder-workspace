# Built-in evals and quality framework for an LLM-as-runtime system

**Founder OS can achieve production-grade quality assurance without ever leaving its markdown-command paradigm.** The consensus architecture emerging from this research is a four-tier evaluation pipeline — telemetry, deterministic format checks, sampled LLM self-critique, and on-demand deep eval — wired directly into the existing Observe → Retrieve → Judge → Distill → Consolidate → Apply learning cycle. All 10 analytical lenses agree on the tiered approach and graduated autonomy model. The estimated token overhead is **~$2.60/month** at 50 daily executions, with 90-day raw eval retention fitting comfortably in SQLite. The key insight driving this design: Boolean rubrics outperform Likert scales for LLM-as-judge reliability (Google Research 2025), EWMA control charts detect pattern regression with O(1) memory, and Constitutional AI self-critique works well for format and tone but is unreliable for factual verification — requiring a hybrid deterministic + LLM scoring approach.

---

## Consensus architecture and data flow

The stochastic consensus across all 10 lenses converges on a **four-tier evaluation pipeline** that embeds directly into markdown command files. This architecture earned unanimous agreement because it satisfies every constraint: no external processes, SQLite-only storage, token efficiency, and integration with existing pattern lifecycle.

```
COMMAND EXECUTION FLOW WITH EVAL PIPELINE
==========================================

  User invokes /founder-os:namespace:command
                    │
                    ▼
  ┌─────────────────────────────────┐
  │  EXECUTE: Claude interprets     │
  │  markdown command definition    │
  │  + injects active patterns      │◄──── APPLY stage
  │  as few-shot examples           │      (from learning cycle)
  └──────────────┬──────────────────┘
                 │ output generated
                 ▼
  ┌─────────────────────────────────┐
  │  TIER 0: TELEMETRY (100%, $0)   │
  │  • Token count, duration        │
  │  • Input/output hash            │
  │  • Timestamp, namespace         │──── OBSERVE stage
  │  → INSERT INTO exec_log         │
  └──────────────┬──────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │  TIER 1: FORMAT CHECKS          │
  │  (100%, $0, deterministic)      │
  │  • Required sections present    │
  │  • Length within bounds          │
  │  • Forbidden patterns absent    │
  │  • JSON/schema valid            │
  │  → UPDATE exec_log.t1_pass      │
  └──────────────┬──────────────────┘
                 │
          ┌──────┴──────┐
     T1 PASS        T1 FAIL
          │              │ (always triggers T2)
          ▼              ▼
  ┌─────────────────────────────────┐
  │  TIER 2: LLM SELF-CRITIQUE     │
  │  (20% sample + T1 failures,    │
  │   ~$0.005/eval)                 │
  │  • Constitution-based critique  │──── JUDGE stage
  │  • 5 boolean rubric items       │
  │  • JSON score output            │
  │  • Prompt caching: 55% savings  │
  │  → INSERT INTO eval_results     │
  └──────────────┬──────────────────┘
                 │
          ┌──────┴──────┐
     T2 PASS        T2 FAIL / FLAGGED
          │              │
          ▼              ▼
  ┌─────────────────────────────────┐
  │  TIER 3: DEEP EVAL              │
  │  (on-demand, ~$0.015/eval)      │
  │  • Full LLM-as-judge rubric     │
  │  • Pairwise comparison mode     │
  │  • Triggered by: /eval command, │
  │    T2 failure, batch eval,      │
  │    anomaly detection             │
  │  → INSERT INTO eval_results     │
  └──────────────┬──────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │  SCORE STORAGE + EWMA UPDATE    │
  │  • Update pattern EWMA score    │──── OBSERVE + RETRIEVE
  │  • Update namespace quality     │
  │  • Check regression thresholds  │
  └──────────────┬──────────────────┘
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
  REGRESSION   PATTERN     PATTERN
  DETECTED     DISTILL     CONSOLIDATE
  (EWMA<0.5)  (score>0.8   (merge similar,
  → demote     → extract    update lifecycle,
    pattern)    candidate)   A/B test)
```

**Component boundaries** align with the existing intelligence engine hooks. The OBSERVE stage logs to `exec_log` (new table). The JUDGE stage reads rubrics from `eval_rubrics` and writes to `eval_results`. The DISTILL stage promotes high-scoring outputs to candidate patterns. The CONSOLIDATE stage uses EWMA scores to advance patterns through the existing candidate → active → approved/rejected lifecycle. No new processes, daemons, or external services are introduced.

The **integration seam** between eval and learning is the `eval_results` table: every eval score is tagged with both a `pattern_id` (linking to the pattern that influenced the output) and an `execution_id` (linking to the specific run). This dual-key design enables both "how is this pattern performing?" and "how is this command performing?" queries from a single table.

---

## Quality rubric design

### Universal rubric template

Research from Google (2025), Databricks, Monte Carlo Data, and Evidently AI converges on one finding: **precise Boolean rubrics outperform Likert scales** for automated evaluation. LLMs struggle with fine-grained continuous scoring but achieve **80%+ human agreement** on binary yes/no judgments. The recommended universal template uses 5-7 Boolean checklist items per dimension, with dimension scores computed as the ratio of passed items.

```
UNIVERSAL EVAL RUBRIC (v1.0)
==============================
Applies to all 32 command namespaces. Override per-namespace as needed.

DIMENSION: Completeness (weight: 0.20)
  □ All requested sections/fields present
  □ No placeholder text remaining
  □ Addresses the full scope of the request

DIMENSION: Accuracy (weight: 0.25)
  □ All stated facts verifiable against source data
  □ Numbers and calculations correct
  □ Names, dates, and references accurate

DIMENSION: Tone (weight: 0.10)
  □ Register matches context (formal/casual)
  □ No inappropriately aggressive or passive language

DIMENSION: Actionability (weight: 0.20)
  □ Contains clear next step or call-to-action
  □ User can act immediately without additional research
  □ Decision points or choices are explicit

DIMENSION: Format Compliance (weight: 0.10)
  □ Follows expected output structure
  □ Appropriate length for context

DIMENSION: Hallucination Risk (weight: 0.15)
  □ No fabricated entities, events, or data points
  □ Claims supported by provided context
  □ Uncertainties flagged explicitly

SCORING:
  Dimension score = passed_items / total_items (0.0 to 1.0)
  Overall score = Σ(weight_i × dimension_score_i)
  PASS: overall ≥ 0.70  |  WARN: 0.50-0.70  |  FAIL: < 0.50
```

The **one-criterion-per-judge-call** principle (Monte Carlo best practice) means the LLM evaluates each dimension in a separate prompt turn — never combining multiple dimensions in a single evaluation. This costs slightly more tokens but dramatically improves scoring reliability.

### Namespace-specific rubric: email drafts

```
RUBRIC: /founder-os:outreach:email
=====================================
Inherits: Universal Rubric
Overrides:
  DIMENSION: Tone (weight: 0.15, elevated)
    □ Subject line accurately describes content
    □ Recipient name and salutation correct
    □ Tone matches relationship context
    □ No spelling or grammar errors
  
  DIMENSION: Actionability (weight: 0.20)
    □ Clear call-to-action within closing paragraph
    □ Specific next step (meeting time, deliverable, response)
  
  ADDED DIMENSION: Personalization (weight: 0.10)
    □ References something specific to the recipient
    □ Avoids generic "Dear Sir/Madam" patterns
  
  FORMAT:
    □ Under 200 words for routine, under 400 for detailed
    □ Greeting + body + CTA + sign-off structure present
```

### Namespace-specific rubric: invoices

```
RUBRIC: /founder-os:finance:invoice
=====================================
Eval type: DETERMINISTIC (no LLM judge needed)
Overrides:
  DIMENSION: Accuracy (weight: 0.35, elevated)
    □ Line items × quantities = subtotal (arithmetic check)
    □ Tax calculation matches rate × subtotal
    □ Grand total = subtotal + tax
    □ Payment terms match agreed contract
  
  DIMENSION: Completeness (weight: 0.30, elevated)
    □ All line items from source data present
    □ Business ID / tax ID included
    □ Client billing entity name correct
    □ Due date specified
  
  DIMENSION: Compliance (weight: 0.20)
    □ Required legal fields present for jurisdiction
    □ Sequential invoice number assigned
    □ Currency specified

  NOTE: Invoice evals use pure deterministic checks
  against source data — LLM-as-judge is inappropriate
  for financial accuracy validation.
```

### Namespace-specific rubric: humanized content

```
RUBRIC: humanize-content (cross-namespace)
=============================================
Applies to: linkedin/*, newsletter/draft, newsletter/newsletter, social/post, social/draft, social/cross-post
Eval type: HYBRID (deterministic + llm_judge)
Inherits: Universal Rubric
Overrides:
  DIMENSION: Tone (weight: 0.20, elevated)
    □ Output matches requested tone preset (professional/friendly/casual/authoritative/conversational)
    □ Formality level consistent throughout — no register drift
    □ Voice markers present (contractions, active voice, natural transitions)
    □ No meta-commentary ("I should note...", "It's important to mention...")

  ADDED DIMENSION: AI-Tell Absence (weight: 0.25, deterministic)
    □ Zero em dashes (—) in output
    □ Zero Tier 1 banned words (delve, leverage, tapestry, etc.)
    □ Zero AI transition phrases (Furthermore, Moreover, Additionally)
    □ No hedging patterns after assertions
    □ No scope inflation (output length proportional to request)

  ADDED DIMENSION: Burstiness (weight: 0.20, deterministic)
    □ Sentence-length standard deviation > 5.0 words
    □ At least one sentence under 8 words per 200 words of content
    □ At least one sentence over 25 words per 200 words of content
    □ No more than 3 consecutive sentences in the 14-22 word range

  ADDED DIMENSION: Vocabulary Diversity (weight: 0.15, deterministic)
    □ No unusual word repeated 3+ times
    □ Anglo-Saxon preference: no Latinate word where a simpler alternative exists
    □ Tier 2 banned words absent (filtered per active tone)

  DIMENSION: Format Compliance (weight: 0.10)
    □ Platform constraints respected (3K chars LinkedIn, 280 chars X, etc.)
    □ Platform-specific structure preserved (hooks, headings, paragraphs)

  DIMENSION: Content Fidelity (weight: 0.10)
    □ Core message preserved after humanization — no meaning drift
    □ Key facts and claims unchanged from pre-humanization content

  NOTE: AI-Tell Absence and Burstiness dimensions use deterministic checks
  (regex, string search, arithmetic) — no LLM-as-judge needed. Tone and
  Content Fidelity use LLM self-critique. This matches the hybrid
  deterministic + LLM scoring approach recommended by the consensus.

  SHORT-FORM ADJUSTMENT: For content under 100 words (X posts, short social),
  relax burstiness and vocabulary diversity thresholds — short content
  naturally has less room for variation.
```

### Namespace-specific rubric: meeting prep briefs

```
RUBRIC: /founder-os:meetings:prep
=====================================
Inherits: Universal Rubric
Overrides:
  DIMENSION: Completeness (weight: 0.25, elevated)
    □ Agenda items listed with time allocations
    □ All attendees listed with roles
    □ Previous meeting action items referenced
    □ Key decisions needed are identified
  
  DIMENSION: Context Quality (weight: 0.20, new)
    □ Participant background/context included
    □ Relevant prior communications summarized
    □ External context (market, project status) noted
  
  DIMENSION: Actionability (weight: 0.20)
    □ Pre-meeting preparation items listed
    □ Discussion questions framed for decision-making
```

---

## Intelligence DB schema for eval storage

These tables extend the existing `intelligence.db` without modifying existing tables. All foreign keys reference the assumed `patterns` table. The schema is inspired by MLflow's separation of raw metrics from aggregated snapshots and Langfuse's typed, versioned score configurations.

```sql
-- ============================================================
-- PRAGMA SETTINGS (run once at database initialization)
-- ============================================================
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456;  -- 256MB memory-mapped I/O

-- ============================================================
-- TABLE 1: eval_dimensions
-- Defines WHAT is being measured (the axes of quality)
-- ============================================================
CREATE TABLE IF NOT EXISTS eval_dimensions (
    id          TEXT PRIMARY KEY,            -- 'dim_completeness'
    name        TEXT NOT NULL UNIQUE,        -- 'completeness'
    description TEXT,                        -- Human-readable explanation
    data_type   TEXT NOT NULL DEFAULT 'BOOLEAN', -- BOOLEAN | NUMERIC
    weight      REAL DEFAULT 1.0,           -- Relative weight in composite
    is_active   INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO eval_dimensions (id, name, description, weight) VALUES
('dim_completeness',  'completeness',  'All required elements present',       0.20),
('dim_accuracy',      'accuracy',      'Facts, numbers, references correct',  0.25),
('dim_tone',          'tone',          'Appropriate voice and register',      0.10),
('dim_actionability', 'actionability', 'User can act immediately',            0.20),
('dim_format',        'format',        'Follows expected output structure',   0.10),
('dim_hallucination', 'hallucination', 'No fabricated information',           0.15),
('dim_ai_tell',      'ai_tell_absence','No AI fingerprint patterns present',  0.25),
('dim_burstiness',   'burstiness',    'Sentence-length variance adequate',    0.20),
('dim_vocab_div',    'vocab_diversity','Vocabulary variety and naturalness',   0.15),
('dim_fidelity',     'content_fidelity','Core message preserved after transform',0.10);

-- ============================================================
-- TABLE 2: eval_rubrics
-- Defines HOW to measure — scoring methodology per dimension
-- Versioned and immutable (archive, never edit)
-- ============================================================
CREATE TABLE IF NOT EXISTS eval_rubrics (
    id               TEXT PRIMARY KEY,       -- 'rub_email_tone_v1'
    dimension_id     TEXT NOT NULL,
    namespace        TEXT,                   -- NULL = universal
    command          TEXT,                   -- NULL = namespace-wide
    version          INTEGER NOT NULL DEFAULT 1,
    checklist_items  TEXT NOT NULL,          -- JSON array of boolean checks
    eval_type        TEXT DEFAULT 'llm_judge', -- llm_judge | deterministic
    is_active        INTEGER DEFAULT 1,
    created_at       TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (dimension_id) REFERENCES eval_dimensions(id)
);

-- ============================================================
-- TABLE 3: exec_log
-- Core execution log — every command run gets a row
-- ============================================================
CREATE TABLE IF NOT EXISTS exec_log (
    id              TEXT PRIMARY KEY,        -- UUID per execution
    namespace       TEXT NOT NULL,
    command         TEXT NOT NULL,
    input_hash      TEXT,                    -- SHA-256 of input for dedup
    output_hash     TEXT,
    output_preview  TEXT,                    -- First 500 chars of output
    pattern_ids     TEXT,                    -- JSON array of patterns applied
    token_input     INTEGER,
    token_output    INTEGER,
    duration_ms     INTEGER,
    t1_pass         INTEGER,                -- Tier 1 format check: 1/0
    t1_details      TEXT,                    -- JSON of individual check results
    executed_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exec_log_cmd
    ON exec_log(namespace, command, executed_at);
CREATE INDEX IF NOT EXISTS idx_exec_log_time
    ON exec_log(executed_at);

-- ============================================================
-- TABLE 4: eval_results
-- Core fact table — individual eval scores per execution
-- ============================================================
CREATE TABLE IF NOT EXISTS eval_results (
    id              TEXT PRIMARY KEY,        -- UUID per eval result
    execution_id    TEXT NOT NULL,           -- FK to exec_log
    pattern_id      TEXT,                    -- FK to patterns (nullable)
    namespace       TEXT NOT NULL,
    command         TEXT NOT NULL,
    dimension_id    TEXT NOT NULL,           -- FK to eval_dimensions
    rubric_id       TEXT,                    -- FK to eval_rubrics

    score           REAL NOT NULL,           -- Normalized 0.0-1.0
    items_passed    INTEGER,                 -- Boolean items passed
    items_total     INTEGER,                 -- Boolean items total
    score_label     TEXT,                    -- 'PASS' | 'WARN' | 'FAIL'

    eval_tier       INTEGER NOT NULL DEFAULT 2, -- 1=format, 2=critique, 3=deep
    eval_source     TEXT DEFAULT 'auto',     -- auto | manual | batch
    reasoning       TEXT,                    -- Judge reasoning (≤500 chars)

    evaluated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    created_at      TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (execution_id) REFERENCES exec_log(id),
    FOREIGN KEY (dimension_id) REFERENCES eval_dimensions(id),
    FOREIGN KEY (rubric_id)    REFERENCES eval_rubrics(id)
);

CREATE INDEX IF NOT EXISTS idx_eval_results_exec
    ON eval_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_pattern
    ON eval_results(pattern_id, dimension_id, evaluated_at);
CREATE INDEX IF NOT EXISTS idx_eval_results_cmd_time
    ON eval_results(namespace, command, evaluated_at);
-- Covering index for dashboard aggregations
CREATE INDEX IF NOT EXISTS idx_eval_results_agg
    ON eval_results(namespace, command, dimension_id, evaluated_at, score);

-- ============================================================
-- TABLE 5: quality_snapshots
-- Pre-aggregated periodic snapshots for fast dashboards
-- Inspired by MLflow's latest_metrics denormalization
-- ============================================================
CREATE TABLE IF NOT EXISTS quality_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    scope_type      TEXT NOT NULL,           -- 'system'|'namespace'|'command'|'pattern'
    namespace       TEXT,
    command         TEXT,
    pattern_id      TEXT,

    overall_score   REAL NOT NULL,
    eval_count      INTEGER NOT NULL DEFAULT 0,
    pass_rate       REAL,                    -- % of evals ≥ 0.70
    std_deviation   REAL,
    ewma_score      REAL,                    -- Current EWMA value

    score_delta     REAL,                    -- Change from previous snapshot
    trend           TEXT,                    -- 'improving'|'stable'|'degrading'
    is_regression   INTEGER DEFAULT 0,

    period_type     TEXT NOT NULL,           -- 'daily'|'weekly'
    period_start    INTEGER NOT NULL,
    period_end      INTEGER NOT NULL,
    snapshot_at     INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_snapshots_scope
    ON quality_snapshots(scope_type, namespace, command, period_start);
CREATE INDEX IF NOT EXISTS idx_snapshots_regression
    ON quality_snapshots(is_regression) WHERE is_regression = 1;

-- ============================================================
-- TABLE 6: implicit_signals
-- Captures user behavior signals without explicit feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS implicit_signals (
    id              TEXT PRIMARY KEY,
    execution_id    TEXT NOT NULL,
    signal_type     TEXT NOT NULL,           -- 'accepted'|'rerun'|'edited'|'abandoned'|'escalated'
    signal_value    REAL,                    -- edit_distance, time_to_action_sec, etc.
    detected_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (execution_id) REFERENCES exec_log(id)
);

CREATE INDEX IF NOT EXISTS idx_signals_exec
    ON implicit_signals(execution_id);
CREATE INDEX IF NOT EXISTS idx_signals_type_time
    ON implicit_signals(signal_type, detected_at);

-- ============================================================
-- TABLE 7: pattern_effectiveness
-- Links eval performance directly to specific patterns
-- ============================================================
CREATE TABLE IF NOT EXISTS pattern_effectiveness (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_id      TEXT NOT NULL,
    namespace       TEXT NOT NULL,
    command         TEXT NOT NULL,
    total_uses      INTEGER DEFAULT 0,
    total_evals     INTEGER DEFAULT 0,
    avg_score       REAL,
    ewma_score      REAL,                   -- α=0.15
    success_rate    REAL,                   -- % above 0.70 threshold
    vs_baseline     REAL,                   -- Delta vs. no-pattern baseline
    period_start    INTEGER NOT NULL,
    period_end      INTEGER NOT NULL,
    updated_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(pattern_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_effectiveness_cmd
    ON pattern_effectiveness(namespace, command, avg_score DESC);
```

**Storage estimates**: Each `eval_results` row consumes ~300 bytes including the reasoning field (truncated to 500 chars). At 50 daily executions with 20% sampling yielding ~10 eval results/day across dimensions, a full year produces **~22K rows (~6.6 MB)**. With indexes adding ~25% overhead, total eval storage stays under **10 MB/year**. The `quality_snapshots` table adds ~2 MB/year. SQLite handles this volume trivially — indexed queries return in under 5ms.

**Retention policy**: Raw `eval_results` kept 90 days, then aggregated into `quality_snapshots`. Daily snapshots kept 1 year, then consolidated to weekly. Weekly snapshots retained indefinitely. Run `PRAGMA optimize` before connection close and periodic `VACUUM` after bulk deletes.

---

## Closed-loop learning integration

The eval framework wires into the existing Observe → Retrieve → Judge → Distill → Consolidate → Apply cycle through six concrete integration points. This mapping earned CONSENSUS status (8/10 lenses agreed on the architecture, with minor pushback from the Product Manager on complexity and the Red Team on over-engineering risk).

**Observe** gains structured logging. Every command execution writes to `exec_log` with telemetry (tokens, duration, hashes) and Tier 1 format check results. This is the raw signal intake — zero LLM cost, 100% coverage. The `implicit_signals` table captures behavioral signals (acceptance, re-runs, edits) as they occur.

**Retrieve** becomes quality-aware. When the system retrieves candidate patterns for a command execution, it now filters by `pattern_effectiveness.ewma_score >= 0.6` and sorts by effectiveness. Patterns with low eval scores are deprioritized before they're ever injected into a prompt. This is the first point where eval data influences output quality — the **BootstrapFewShot pattern** from DSPy, adapted to Founder OS: only high-scoring historical outputs serve as few-shot examples.

**Judge** gains multi-dimensional rubric scoring. The existing confidence scoring mechanism is supplemented (not replaced) by namespace-specific Boolean rubrics. The **dual-score architecture** maintains both:

- **Pattern confidence** (existing): `f(historical_eval_scores, recency, volume)` — drives lifecycle transitions
- **Output quality score** (new): weighted composite of rubric dimension scores — drives learning signals

Research from Tian et al. (EMNLP 2023) confirms these measure different constructs: confidence reflects the model's certainty during generation, while eval scores measure post-hoc output quality. Both are needed.

**Distill** extracts patterns from high-scoring outputs. When an execution scores **≥ 0.85 overall** and has no dimension below 0.70, the system flags the output as a candidate pattern for that namespace-command pair. The distillation trigger is: `IF overall_score >= 0.85 AND min_dimension_score >= 0.70 AND similar_pattern_count < 5 THEN create_candidate_pattern()`.

**Consolidate** uses EWMA control charts for regression detection and lifecycle management. The **EWMA formula** `z_t = α × score_t + (1 - α) × z_{t-1}` with **α = 0.15** provides a half-life of ~4.3 observations — sensitive enough to catch sustained quality drops within 5-7 executions. Control limits at μ ± 2.7σ trigger regression alerts. The lifecycle transitions become data-driven:

- **Candidate → Active**: ≥ 5 eval samples, EWMA ≥ 0.60
- **Active → Approved**: ≥ 20 samples, EWMA ≥ 0.80, no regression in last 10
- **Any → Rejected**: EWMA < 0.40 after ≥ 10 samples, or regression detected
- **Approved → Active (demotion)**: EWMA drops below 0.65 for 3+ consecutive observations

**Apply** injects the top-performing approved patterns as few-shot examples and instruction modifications. Pattern selection uses **Thompson Sampling** (a multi-armed bandit algorithm) when multiple approved patterns compete for the same context. This balances exploiting the best-known pattern with exploring alternatives that might perform better — directly inspired by TensorZero's production implementation, which found **37% faster** identification of best variants compared to simple A/B testing.

The **A/B testing mechanism** for new candidate patterns uses interleaving: alternate between with-pattern and without-pattern executions, comparing eval scores via Mann-Whitney U test (non-parametric, works for small samples). After **20-30 paired observations**, compute lift with p < 0.10 significance threshold. Positive lift promotes; zero or negative lift rejects.

---

## The eval section lives inside each markdown command

Every markdown command file gains a `## Eval` section — **10-15 lines** that define the eval behavior for that command. This is the implementation pattern that earned unanimous agreement across all lenses. The eval section is interpreted by Claude at runtime, just like the command's prompt section.

```markdown
## Eval

### Config
tier1_always: true
tier2_sample_rate: 0.20
tier2_on_t1_fail: true
constitution: founder-os-default

### Tier 1: Format Checks
required_sections: ["Subject:", "Body:"]
min_words: 50
max_words: 500
forbidden: ["[PLACEHOLDER]", "INSERT_NAME", "{name}"]

### Tier 2: Self-Critique Criteria
accuracy: "No fabricated data or claims"
completeness: "All requested sections present"
tone: "Professional, matches founder voice"
actionability: "Includes concrete next step"
threshold: 0.70
on_fail: flag_for_review
```

When Claude finishes executing the main command, it reads the eval section, runs Tier 1 checks deterministically, and conditionally runs Tier 2 self-critique. The **eval result appears as an inline badge** appended to the output: `✅ Quality: PASS (0.84) | Format ✅ | Tone ✅ | Actionability ⚠️ 0.68`. This gives founders immediate quality visibility without breaking flow.

Three meta-commands provide manual and batch eval capabilities. **/founder-os:intel:eval** retrieves a past execution from SQLite and runs the full rubric against it, displaying a detailed report with per-dimension scores, trend data, and actionable suggestions. **/founder-os:intel:eval-batch** re-evaluates historical outputs through updated rubrics with configurable sampling (100% for < 50 records, 20% random sample for 50-500, 10% stratified for > 500). **/founder-os:intel:health** shows system-wide quality dashboards: overall score, per-namespace trends, regression alerts, and worst-performing commands.

**Prompt caching** is the single most impactful cost optimization for eval workloads. The eval rubric and constitution text — identical across every eval call for a given namespace — is structured as a **cacheable prefix** (minimum 1,024 tokens for Claude). With cache reads costing **0.1× base input price** (90% discount), repeated evals against the same rubric achieve ~55% cost reduction after the first call. Claude Code already reports 92% cache hit rates in production. The implementation rule: all stable content (rubric, constitution, scoring instructions) goes FIRST in the eval prompt; all dynamic content (the actual output being evaluated) goes LAST.

---

## Implementation roadmap

### Phase 1: Foundation (weeks 1-2)

The first phase establishes the data infrastructure and cheapest eval tier. Deploy the full SQLite schema (6 new tables, indexes, PRAGMAs). Add the `exec_log` INSERT to the existing command execution hook — this is pure logging with zero LLM cost. Implement **Tier 0 telemetry** (token counts, duration, input/output hashes) and **Tier 1 format checks** (required sections, length bounds, forbidden patterns) for the 5 highest-volume commands. Write the universal rubric template and seed `eval_dimensions` with the 6 standard dimensions. Wire `implicit_signals` collection: detect re-runs (same `input_hash` within 5 minutes), track command abandonment, log acceptance signals.

**Exit criteria**: Every command execution writes to `exec_log`. Top 5 commands have Tier 1 format checks. Implicit signals detected and stored. Schema verified with test data.

### Phase 2: LLM-as-judge and learning loop (weeks 3-4)

Add **Tier 2 self-critique** to the top 10 commands. Write namespace-specific Boolean rubrics for email, meeting prep, invoices, proposals, and reports. Implement the constitutional self-critique prompt with prompt caching. Wire eval scores into pattern EWMA tracking: on each new eval result, update `pattern_effectiveness.ewma_score = 0.15 × new_score + 0.85 × ewma_score`. Implement regression detection: when EWMA drops below 0.50 for a pattern, automatically demote from approved/active to candidate. Build the **/founder-os:intel:eval** manual review command. Implement the graduated autonomy state machine (review → spot-check → full auto).

**Exit criteria**: 10 commands have Tier 2 eval. EWMA tracking operational. Regression detection fires correctly on synthetic test data. Manual eval command functional.

### Phase 3: Optimization and self-improvement (month 2+)

Deploy **Tier 3 deep eval** for on-demand and anomaly-triggered assessments. Build **/founder-os:intel:eval-batch** for batch re-evaluation. Implement A/B testing with interleaving for candidate patterns. Add Thompson Sampling for multi-pattern selection. Build **/founder-os:intel:health** dashboard command. Write `quality_snapshots` daily aggregation logic. Implement the DSPy-inspired self-improvement loop: after accumulating 20+ eval results per command, Claude reviews failure patterns and proposes revised command instructions (run monthly, gated by human approval). Extend rubrics to all 32 namespaces. Add embedding-based input drift detection via the existing HNSW store.

**Exit criteria**: All 32 namespaces have eval coverage. A/B testing operational. Health dashboard shows quality trends. Monthly self-improvement cycle producing measurable lift.

---

## Cost analysis: token overhead stays negligible

The tiered architecture keeps eval costs to a fraction of execution costs. All estimates use Claude Sonnet pricing at **$3/MTok input, $15/MTok output** as of early 2026.

| Component | Per-eval tokens | Per-eval cost | Monthly (50 exec/day) |
|---|---|---|---|
| Tier 0: Telemetry | 0 | $0.00 | $0.00 |
| Tier 1: Format checks | 0 | $0.00 | $0.00 |
| Tier 2: Self-critique (20% sample) | ~1,300 (800 cached + 500 new) | ~$0.003 | ~$1.50 |
| Tier 3: Deep eval (5% flagged) | ~3,100 | ~$0.013 | ~$1.13 |
| **Total eval overhead** | | | **~$2.63/month** |

**Prompt caching** cuts Tier 2 costs by 55%: the rubric/constitution prefix (~800 tokens) caches at $0.30/MTok instead of $3/MTok, and the 5-minute TTL resets on each hit, making sequential evals effectively free for the prefix portion.

**Optimization strategies** beyond caching: Sample strategically — over-sample new/changed commands and under-sample stable ones with time-decay weighting. Batch eval calls where possible (evaluate 5 rubric items in one structured prompt rather than 5 separate calls, accepting slightly lower per-dimension reliability for 5× cost reduction). Keep reasoning fields under 100 tokens by instructing the judge to be terse. For Tier 3, use **Best-of-2** (generate two candidate evaluations, pick the more conservative one) only for high-stakes financial or client-facing commands.

The **1:1 rule** (Monte Carlo Data recommendation) sets the ceiling: eval overhead should never exceed execution cost. At ~$0.01-0.03 per command execution and ~$0.003 per eval, Founder OS stays well within this bound.

---

## Risk matrix

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Self-enhancement bias**: Claude rates its own outputs too favorably | High | Medium | Use explain-first prompting; calibrate with 30 human-annotated golden examples per namespace; track score distributions for central tendency |
| **Goodhart's Law**: Optimizing for eval metrics instead of actual quality | Medium | High | Include implicit signals (user edits, re-runs) as ground-truth anchors; rotate rubric items quarterly; human spot-checks on "perfect score" outputs |
| **Eval prompt injection**: Adversarial inputs that manipulate eval scoring | Low | High | Sanitize inputs before eval; separate eval context from execution context; never include user input verbatim in judge system prompt |
| **Calibration drift**: Eval scores become less meaningful over time as patterns shift | Medium | Medium | Monthly recalibration against golden set; EWMA control limits auto-detect distribution shifts; version rubrics and track score distributions per version |
| **Token cost spiral**: Self-improvement loop or batch evals consume excessive tokens | Low | Medium | Hard ceiling per eval call (max 2,000 output tokens); monthly token budget cap; sampling rate automatically reduces when approaching budget |
| **Pattern overfitting**: Approved patterns are too narrow, fail on novel inputs | Medium | Medium | Track pattern applicability breadth; require minimum context diversity (3+ distinct input types) before approval; decay patterns not used in 30 days |
| **Schema migration complexity**: Future rubric changes require data migration | Low | Low | Rubrics are versioned and immutable (archive, never edit); eval_results FK to specific rubric version; snapshots decouple from raw data |

---

## Divergence register

These findings had **4-6 of 10 lenses in agreement**, with strong opposing arguments on both sides.

**DIVERGENCE 1: Eval scores should supplement vs. replace confidence scoring**

Six lenses (Systems Architect, ML/AI Engineer, Data Engineer, DevOps/SRE, Behavioral Scientist, Security) agreed that eval scores should *supplement* existing confidence mechanics as orthogonal signals. Four lenses pushed back: the Product Manager argued two separate scores confuse founders, the Cost Optimizer noted complexity overhead, the DX Designer flagged UX challenges in presenting dual scores, and the Red Team suggested replacing confidence entirely with eval-derived quality scores for simplicity.

**Resolution**: Supplement, but present as a single "quality grade" to users. Under the hood, maintain both signals with `pattern_confidence = f(eval_ewma, recency, volume)` — the confidence score *incorporates* eval data but also weights recency and sample size. Users see one number; the system uses two.

**DIVERGENCE 2: Constitutional AI self-critique as default eval method**

Four lenses endorsed self-critique (Systems Architect, Product Manager, Cost Optimizer, DX Designer) as a clean, intuitive pattern. Six lenses raised concerns: the ML/AI Engineer cited Huang et al. (2023) showing self-correction *decreases* accuracy on factual tasks; the Red Team flagged that models can fool themselves; the Behavioral Scientist warned of self-enhancement bias (~25% inflated win rates); the Security analyst noted self-grading could mask prompt injection; the DevOps/SRE lens cited added latency; and the Data Engineer noted the noisy signal.

**Resolution**: Self-critique is **approved for format, tone, and structure evaluation only** — dimensions where it's measuring adherence to principles rather than factual correctness. Factual accuracy eval (invoice amounts, CRM data, dates) must use **deterministic checks** against source data. This hybrid approach earned 8/10 agreement.

**DIVERGENCE 3: DSPy-style auto-optimization of command prompts**

Four lenses strongly supported automated prompt improvement (Systems Architect, ML/AI Engineer, Cost Optimizer, Data Engineer). Six lenses raised concerns: the Product Manager worried about inexplicable prompt changes; DevOps/SRE flagged unpredictable production behavior; Security warned auto-modified prompts could introduce vulnerabilities; the Behavioral Scientist cited Goodhart's Law risk; the DX Designer asked how founders would understand changes; and the Red Team called it premature over-engineering.

**Resolution**: Implement in Phase 3 only, gated by mandatory human approval. Claude proposes command revisions; the founder reviews a diff and accepts or rejects. Auto-optimization runs monthly at most, only for commands with ≥ 20 eval data points. This "human-in-the-loop optimization" earned 8/10 agreement.

---

## Outlier ideas vault

These proposals came from **1-3 lenses** but contain genuinely novel ideas worth tracking for future consideration.

**OUTLIER 1: SelfCheckGPT for hallucination detection** (ML/AI Engineer, Security). Generate the same output 3 times and flag claims that appear in fewer than 2 of 3 versions as likely hallucinations. Theoretically powerful for detecting fabricated invoice amounts or CRM data. **Why it's an outlier**: 3× token cost per execution makes it impractical as a default. The Cost Optimizer and Red Team strongly opposed. **Verdict**: Reserve for high-stakes financial commands only, triggered when Tier 2 flags hallucination risk.

**OUTLIER 2: Embedding drift detection via HNSW store** (ML/AI Engineer, Data Engineer). The existing Memory Engine HNSW store could track whether user inputs are drifting over time — if command usage patterns shift, rubrics may need updating. Compare centroid of recent input embeddings against historical centroid using cosine distance. **Why it's an outlier**: Technically elegant but adds complexity for marginal value in early phases. **Verdict**: Phase 3+ consideration when pattern library exceeds 100 active patterns.

**OUTLIER 3: Adversarial red-team eval commands** (Security, Red Team). A `/founder-os:intel:redteam` command that automatically generates adversarial inputs for each command (prompt injections, edge cases, malformed data) and tests output resilience. Inspired by Promptfoo's red-teaming module. **Why it's an outlier**: Most lenses viewed it as premature for an SMB tool. **Verdict**: High value for commands handling external data (email replies, CRM imports). Implement as an optional Phase 3 extension.

**OUTLIER 4: Best-of-N generation replacing self-critique** (Behavioral Scientist). Instead of generate-then-critique, generate N=2 outputs and use a quick LLM comparison to pick the better one. Research shows this avoids the self-correction accuracy trap documented by Huang et al. (2023). **Why it's an outlier**: 2× generation cost; most lenses preferred the cheaper single-generation + post-hoc eval approach. **Verdict**: Viable for the 3-5 highest-stakes commands (client proposals, investor updates) where quality justifies cost.

---

## References and prior art

The research base for this framework draws on peer-reviewed papers, production system documentation, and industry practitioner reports spanning 2023-2026. The foundational eval methodology comes from **G-Eval** (Liu et al., EMNLP 2023), which established chain-of-thought-based LLM evaluation achieving 0.514 Spearman correlation with human judgments. **Google Research (2025)** provided the critical finding that Boolean rubrics outperform Likert scales for automated evaluation sensitivity. The dual-score confidence architecture draws on **Tian et al. (EMNLP 2023)**, "Just Ask for Calibration," demonstrating that verbalized confidence in RLHF-tuned models is better-calibrated than token probabilities.

Production system patterns came from **Braintrust AI's** three-component eval structure and dual feedback loops; **LangSmith's** trace-to-dataset flywheel; **Langfuse's** typed score data model with versioned configurations; and **TensorZero's** multi-armed bandit implementation achieving 37% faster variant identification. The self-improvement loop draws on **DSPy** (Stanford NLP) optimizers — particularly MIPROv2's three-stage bootstrap → propose → search pipeline and BootstrapFewShot's high-scoring-trace reuse pattern. **Constitutional AI** (Bai et al., 2022, Anthropic) provided the self-critique framework, tempered by **Huang et al. (2023)** showing self-correction limitations for factual tasks.

Schema design was informed by **MLflow's** SQLAlchemy models (separation of raw metrics from denormalized latest_metrics) and **Langfuse's** Prisma schema (immutable score configurations, typed scores). Statistical process control via **EWMA control charts** (Roberts, 1959) provided the regression detection methodology. The tiered evaluation architecture reflects emerging industry consensus documented by **Evidently AI**, **Opik**, **Monte Carlo Data**, and **Databricks** practitioner reports.

---

## Raw agent agreement matrix

Each row represents a key architectural decision. Columns represent the 10 analytical lenses. ✅ = agrees, ⚠️ = qualified agreement, ❌ = opposes.

| Decision | Sys Arch | ML/AI | PM | DevOps | Data Eng | Security | Behav Sci | Cost Opt | DX | Red Team | Score | Tier |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Four-tier eval pipeline | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 10/10 | CONSENSUS |
| Boolean rubrics over Likert | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | 8/10 | CONSENSUS |
| EWMA regression detection | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | 8/10 | CONSENSUS |
| Graduated autonomy model | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 10/10 | CONSENSUS |
| Implicit feedback collection | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | 7/10 | CONSENSUS |
| Prompt caching for eval cost | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 10/10 | CONSENSUS |
| Eval supplements confidence | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | 6/10 | DIVERGENCE |
| Constitutional self-critique | ✅ | ❌ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ❌ | 5/10 | DIVERGENCE |
| DSPy-style auto-optimization | ✅ | ✅ | ⚠️ | ❌ | ✅ | ❌ | ⚠️ | ✅ | ⚠️ | ❌ | 4/10 | DIVERGENCE |
| SelfCheckGPT multi-sample | ⚠️ | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | 3/10 | OUTLIER |
| HNSW embedding drift detect | ⚠️ | ✅ | ❌ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 2/10 | OUTLIER |
| Adversarial red-team command | ❌ | ⚠️ | ❌ | ⚠️ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | 2/10 | OUTLIER |
| Best-of-N replacing critique | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ❌ | ❌ | ⚠️ | 1/10 | OUTLIER |

The consensus core — tiered eval, Boolean rubrics, EWMA tracking, graduated autonomy, implicit signals, and prompt caching — forms a **production-ready framework that is implementable in 4 weeks** for core functionality. Divergent items (self-critique scoping, dual scores, auto-optimization) are resolved through the hybrid approaches documented in the Divergence Register. Outlier ideas are preserved for Phase 3+ experimentation without blocking the critical path.