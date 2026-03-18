---
description: Research multiple competitors and build a structured comparison matrix
argument-hint: "[company1] [company2] ... [--your-product='description'] [--output=PATH]"
allowed-tools: ["Read", "WebSearch"]
execution-mode: background
result-format: summary
---

# /founder-os:compete:matrix

Research 2 or more competitors and build a structured comparison matrix across 7 key dimensions. Always executes fresh searches for each competitor — never uses cached data. Optionally adds a "You" column for self-positioning analysis.

## Load Skills

Read the competitive-research skill at `${CLAUDE_PLUGIN_ROOT}/skills/compete/competitive-research/SKILL.md` for surface scan strategy, query formulation, and data extraction rules.

Read the market-analysis skill at `${CLAUDE_PLUGIN_ROOT}/skills/compete/market-analysis/SKILL.md` for matrix building conventions, dimension normalization, and self-comparison analysis.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `[company1] [company2] ...` (required) — space-separated list of 2 or more company names or URLs. If fewer than 2 companies are provided, prompt: "Please provide at least 2 company names to build a comparison matrix. Example: /founder-os:compete:matrix Notion Linear Asana"
- `--your-product="description"` (optional) — description of your own product. When provided, adds a "You" column to the matrix.
- `--output=PATH` (optional) — output file path. Default: `competitive-intel/matrix-[YYYY-MM-DD].md` where `[YYYY-MM-DD]` is today's date.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `compete` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `competitive-intel`
- Command: `compete-matrix`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'competitive-intel' OR plugin IS NULL) AND (command = 'compete-matrix' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context for this execution
3. Notify: `[Intel] Applying learned preference: "{description}"` for each pattern applied
4. If the Intelligence database does not exist, skip silently and continue execution

## Self-Healing: Error Recovery
If any error occurs during this command:
1. Classify the error using rules from `_infrastructure/intelligence/self-healing/SKILL.md`
2. Check if healing is enabled: query `SELECT value FROM config WHERE key = 'healing.enabled'` from Intelligence DB
3. For transient errors: retry with exponential backoff (2s, 5s, 15s)
4. For recoverable errors: look up fix in healing_patterns table, apply if found
5. For degradable errors: consult fallback registry in `_infrastructure/intelligence/self-healing/fallback-registry/SKILL.md`, execute fallback path
6. For fatal errors: stop and present error with suggested fix
7. Always notify: `[Heal] {description of what happened and what was done}`
8. Record error event to Intelligence DB with recovery_attempted field
9. If Intelligence DB is unavailable, fall back to existing error handling (no self-healing)

## Research Phase (Per Company)

For each company in the input list, apply the competitive-research skill independently:

**Always execute fresh searches.** Do not reuse any previously gathered data — each run of `/founder-os:compete:matrix` is a fresh research session.

1. **Identify the company**: Extract name and domain from each input (name or URL).

2. **Formulate queries**: Construct 4-6 targeted queries per company covering all 5 research dimensions (pricing, features, reviews, positioning, news).

   Consult `${CLAUDE_PLUGIN_ROOT}/skills/compete/competitive-research/references/query-patterns.md` for query templates. Use the Matrix Queries section for any cross-company comparison queries.

3. **Execute searches**: Run searches for each company. Apply data extraction and normalization rules from the competitive-research skill.

4. **Extract matrix data points**: For each company, extract the normalized values for all 7 matrix dimensions:
   - **Pricing**: Starting price with billing model (e.g., "$15/user/month billed annually")
   - **Target Market**: Primary audience and company size (e.g., "SMB teams, 5-50 people")
   - **Key Features**: Top 3-5 standout capabilities
   - **Positioning**: Archetype + primary messaging angle (e.g., "SMB Friendly — 'Get started in minutes'")
   - **Review Score**: Composite score with platform source (e.g., "4.4/5.0 (G2, 1,200 reviews)")
   - **Strengths**: Top 2-3 competitive advantages
   - **Weaknesses**: Top 2-3 notable gaps or complaints

**Sequencing**: Research all companies before building the matrix. Complete all 5 research dimensions for one company before moving to the next to avoid data cross-contamination.

## Matrix Building Phase

Apply the market-analysis skill's Matrix Building guidance:

5. **Normalize all entries**: Apply matrix normalization rules from `${CLAUDE_PLUGIN_ROOT}/skills/compete/market-analysis/references/analysis-frameworks.md` to make all values comparable:
   - Pricing: Always "$/user/month" or "$/month flat" format
   - Review scores: Always "X.X/5.0 (N reviews on Platform)"
   - Features: Use consistent terminology across columns
   - Strengths/Weaknesses: 3-5 word phrases, not sentences

6. **Build markdown table**: Create a markdown comparison matrix with companies as columns and dimensions as rows.

7. **Add 'You' column** (only if `--your-product` was provided):
   - Add a rightmost "You" column to the matrix
   - For each dimension, assess your product based on the provided description
   - Mark cells where you have a clear advantage with ✅
   - Mark dimensions where no competitor excels (whitespace opportunity) with 💡
   - Include a "Positioning Opportunity" row at the bottom with a 1-2 sentence recommendation

8. **Add analysis summary**: Below the matrix, include:
   - Market overview (1-2 sentences on the competitive landscape)
   - Key differentiators (what distinguishes each competitor)
   - Whitespace opportunities (underserved positions in the market)
   - Strategic recommendations (3-5 recommendations for your product, if `--your-product` provided)

## Save to File

9. **Create output directory**: Create `competitive-intel/` directory at the working directory if it does not exist.

10. **Write matrix file**: Save to the output path. File should include: date, companies researched, the full comparison matrix, and analysis summary.

## Notion Integration

For each company researched:

11. **Find the Research database**: Search Notion for a database named "Founder OS HQ - Research". If not found, fall back to the legacy name "Competitive Intel Compiler - Research". If neither exists, skip Notion integration and warn the user once (do NOT create the database — it should be provisioned from the HQ template).

12. **Resolve Company relation**: For each researched company, search the "Founder OS HQ - Companies" database for a matching company name (case-insensitive). If found, use the existing page ID. If not found, create a new page in Companies with the company name as Title.

13. **Save one record per company**: Set Type="Competitive Analysis" and link the Company relation. Upsert by Company Name AND Type="Competitive Analysis" (update if exists, create if not).

## Graceful Degradation

If Notion CLI is unavailable:
- Output matrix to chat and save to local file
- Warn once: "Notion unavailable — matrix saved to [file path]. Configure Notion CLI per `/founder-os:setup:notion-cli`."
- Do not repeat the warning for each company

If a web search fails for one company:
- Note "Data unavailable — search returned no results" for affected dimensions
- Continue with remaining companies and dimensions
- Never fabricate data to fill matrix cells

## Output Format

Display in chat:

```
## Competitive Matrix — [Company A] vs [Company B] vs [Company C]
*Researched: [date]*

| Dimension | [Company A] | [Company B] | [Company C] | You |
|-----------|-------------|-------------|-------------|-----|
| Pricing | ... | ... | ... | ... |
| Target Market | ... | ... | ... | ... |
| Key Features | ... | ... | ... | ... |
| Positioning | ... | ... | ... | ... |
| Review Score | ... | ... | ... | ... |
| Strengths | ... | ... | ... | ... |
| Weaknesses | ... | ... | ... | ... |
| Positioning Opp. | — | — | — | 💡 [recommendation] |

*✅ = Your advantage | 💡 = Market whitespace*

---

### Market Overview

[1-2 sentences]

### Key Differentiators

- **[Company A]**: [what makes them distinct]
- **[Company B]**: [what makes them distinct]

### Whitespace Opportunities

[Underserved positions or unmet needs not covered by any competitor]

### Strategic Recommendations

1. **[Recommendation]**: [detail grounded in matrix data]
2. ...
```

End with:
```
**Matrix saved to**: [file path]
**Notion**: [Saved X company records to "Founder OS HQ - Research" (Type: Competitive Analysis) / Unavailable — not saved]
```

## Observation: End
After execution completes, record a post_command event to the Intelligence event store:
- Event type: `post_command`
- Use the same session_id from the start observation
- Outcome: `success` | `failure` | `degraded`
- Payload: { outcome summary, items processed, outputs created }
- Duration: milliseconds elapsed since pre_command event
- If any errors occurred during execution, also record an error event with the error type, message, and whether recovery was attempted

## Final: Memory Update
Read the pattern-detection skill at `_infrastructure/memory/pattern-detection/SKILL.md`.
Log this execution as an observation with: plugin name, primary action performed, key entities (companies, contacts), and output summary.
Check for emerging patterns per the detection rules. If a memory reaches the adaptation threshold, append the notification to the output.

## Usage Examples

```
/founder-os:compete:matrix Notion Linear
/founder-os:compete:matrix Asana ClickUp Monday Trello --your-product="Simple task manager for freelancers, $12/month"
/founder-os:compete:matrix Figma Sketch --output=reports/design-tools-matrix.md
/founder-os:compete:matrix "Notion" "Coda" "Obsidian" --your-product="Note-taking app with AI, free tier"
```
