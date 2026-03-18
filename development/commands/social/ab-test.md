---
description: Generate and test two content variants using different templates, track engagement, log results
argument-hint: '"topic" --platforms=linkedin [--measure-after=72] [--stagger=48] [--templates=a,b] [--check]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---

# social:ab-test

Generate two content variants using different templates, publish them staggered, measure engagement, and record which template technique performed better.

> **Why foreground:** This command has an interactive user approval step (Phase 1: approve variants before publishing) that cannot be delegated to a background subagent. Only 3 other commands use foreground mode.

## Skills

Read these skill files before proceeding:

1. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/template-engine/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/platform-adaptation/SKILL.md`
3. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/posting-cadence/SKILL.md` — for stagger timing
4. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
5. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-publish/SKILL.md`
6. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-status/SKILL.md` — for analytics
7. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
8. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/social-humanization.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `topic` | Yes | Topic or content brief (positional) |
| `--platforms` | Yes | Target platform(s) for testing |
| `--measure-after` | No | Hours to wait before measuring (default: 72) |
| `--stagger` | No | Hours between posting variant A and B (default: 48) |
| `--templates` | No | Force specific template IDs for A and B (comma-separated) |
| `--check` | No | Check results of a pending A/B test instead of creating new one |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files. If present, read them to personalize tone, voice, and brand.

## Preflight Check

Run `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md` for namespace `social`.
- Required: `late` (validate `$LATE_API_KEY` + probe `late-tool.mjs --validate-only`)
- Optional: `notion` (for Content DB logging), `filesystem` (for file-based sources)

**Interim check** (until preflight ships):
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs --validate-only
```
If failed: show fix instructions from `_infrastructure/preflight/references/fix-messages.md` > `late`.

## Step 0: Memory Context

Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `social ab-test`, `template performance`, `content variants`, user's brand voice.
Inject top 5 relevant memories.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:ab-test` runs. Apply any promoted template preferences or engagement patterns from `_performance.yaml` `technique_scores`.

---

## Two-Invocation Model

This command operates in two distinct invocations:

- **Without `--check`**: Generate, approve, and publish two variants (Invocation 1)
- **With `--check`**: Fetch results for pending tests and record winners (Invocation 2)

---

## Invocation 1: Without `--check`

### Phase 1/2: Generate & Approve Variants

Display: `Phase 1/2: Generating test variants...`

1. **Select templates**: Read available templates from `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/`. Choose two templates that use different structural techniques.
   - If `--templates=a,b` provided: use those specific template IDs (e.g., `--templates=jan25-1,feb25-3`)
   - Otherwise: select two templates with the highest divergence in technique (e.g., story vs. listicle, hook-first vs. stat-first). Avoid templates with the same `technique` field.
2. **Generate variant A**: Apply template A to the topic using the template-engine skill. Apply humanize-content skill.
3. **Generate variant B**: Apply template B to the topic using the template-engine skill. Apply humanize-content skill.
4. **Display side-by-side comparison**:

```
=== Variant A ===
Template: <template_id>
Technique: <technique name>

<full post text>

Character count: <N>

=== Variant B ===
Template: <template_id>
Technique: <technique name>

<full post text>

Character count: <N>
```

5. **Ask user to approve before publishing**:
   ```
   Publish these variants? (yes / edit-a / edit-b / cancel)
   ```
   - `yes`: proceed to Phase 2/2
   - `edit-a` or `edit-b`: prompt for revised text, then re-display for confirmation
   - `cancel`: abort without publishing

### Phase 2/2: Publish & Schedule

Display: `Phase 2/2: Publishing test...`

1. **Post variant A immediately**:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
     --accounts='["<account_id>"]' \
     --text="<variant_a_text>"
   ```
   Capture returned `post_id` as `post_id_a`.

2. **Schedule variant B** for `now + stagger hours` (default: 48):
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
     --accounts='["<account_id>"]' \
     --text="<variant_b_text>" \
     --schedule="<iso_timestamp_now_plus_stagger>"
   ```
   Capture returned `post_id` as `post_id_b`.

3. **Write pending test entry** to `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/_performance.yaml` under `pending_tests`:
   ```yaml
   - created: "<iso_timestamp_now>"
     topic: "<topic>"
     platform: "<platform>"
     variant_a:
       template_id: "<template_id_a>"
       post_id: "<post_id_a>"
     variant_b:
       template_id: "<template_id_b>"
       post_id: "<post_id_b>"
     measure_after: "<iso_timestamp_now_plus_measure_after_hours>"
   ```

---

## Invocation 2: With `--check`

### Phase 1/2: Fetch Results

Display: `Phase 1/2: Checking test results...`

1. **Read `pending_tests`** from `${CLAUDE_PLUGIN_ROOT}/skills/social/templates/_performance.yaml`.
2. **Filter** for tests where `measure_after` date is in the past (i.e., `measure_after <= now`).
3. For each eligible pending test:
   - **Attempt to fetch analytics via Late.dev**:
     ```bash
     node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs analytics get --post-id=<post_id_a>
     node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs analytics get --post-id=<post_id_b>
     ```
   - **If Late.dev Analytics unavailable** (graceful degradation): display message:
     ```
     Late.dev analytics add-on not available. Please provide engagement numbers manually.
     Open your LinkedIn/X analytics dashboard and enter the following for each variant:
     ```
     Then prompt the user for: likes, comments, shares for variant A and variant B separately.

### Phase 2/2: Score & Record

Display: `Phase 2/2: Recording results...`

1. **Calculate engagement scores** using formula: `likes + (comments × 2) + (shares × 3)`
   - Score A = `likes_a + (comments_a × 2) + (shares_a × 3)`
   - Score B = `likes_b + (comments_b × 2) + (shares_b × 3)`

2. **Determine winner**: template with higher engagement score. If tied, record as `tie`.

3. **Move test** from `pending_tests` to `tests` in `_performance.yaml`, adding result fields:
   ```yaml
   - created: "<original_created>"
     topic: "<topic>"
     platform: "<platform>"
     variant_a:
       template_id: "<template_id_a>"
       post_id: "<post_id_a>"
       likes: <N>
       comments: <N>
       shares: <N>
       score: <N>
     variant_b:
       template_id: "<template_id_b>"
       post_id: "<post_id_b>"
       likes: <N>
       comments: <N>
       shares: <N>
       score: <N>
     winner: "<template_id_a | template_id_b | tie>"
     measured_at: "<iso_timestamp_now>"
   ```

4. **Update `technique_scores`** in `_performance.yaml`: increment the winning template's technique score by 1 (or initialize at 1 if not present):
   ```yaml
   technique_scores:
     story-first: 3
     listicle: 1
   ```

5. **Display summary table** with winner highlighted:

```
=== A/B Test Results ===
Topic: <topic>
Platform: <platform>

| Variant | Template      | Technique   | Likes | Comments | Shares | Score |
|---------|---------------|-------------|-------|----------|--------|-------|
| A       | <template_id> | <technique> | <N>   | <N>      | <N>    | <N>   |
| B       | <template_id> | <technique> | <N>   | <N>      | <N>    | <N>   |

Winner: Variant <A|B> — <template_id> (<technique>) *** WINNER ***
```

---

## Output

After each invocation, display:

**Invocation 1 (publish)**:
- Variant A post ID and live URL
- Variant B scheduled time
- Confirmation that test was written to `_performance.yaml`
- Reminder: `Run /social:ab-test --check after <measure_after> hours to record results`

**Invocation 2 (check)**:
- Summary table with scores and winner highlighted
- Updated `technique_scores` state
- Number of tests processed and any skipped (not yet past `measure_after`)

## Self-Healing: Error Recovery

- **Transient** (rate limits, network): Auto-retried by CLI (up to 3x)
- **Recoverable** (one variant fails to post): Report partial publish, offer to retry failed variant
- **Degradable** (Late.dev analytics unavailable): Fall back to manual engagement input from user
- **Degradable** (Notion unavailable): Skip DB logging, warn user
- **Fatal** (auth failure): Halt with fix instructions from `_infrastructure/preflight/references/fix-messages.md`
- **No pending tests past measure date**: Inform user and list pending tests with their `measure_after` dates

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Templates used in A and B
- Platform tested
- Whether user edited a variant before approving
- Winner template ID and technique (on `--check` runs)
- Score delta between variants

## Intelligence: Post-Command

Log execution metrics for future optimization. On `--check` runs, the winning technique score update in `_performance.yaml` will influence future template selection in `social:compose` and `social:ab-test`.
