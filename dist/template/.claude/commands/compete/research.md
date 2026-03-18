---
description: Research a competitor via web search and produce a structured competitive intelligence report
argument-hint: "[company] [--your-product='description'] [--output=PATH]"
allowed-tools: ["Read", "WebSearch"]
execution-mode: background
result-format: summary
---

# /founder-os:compete:research

Gather competitive intelligence on a company using targeted web searches across 5 dimensions (pricing, features, reviews, positioning, news). Produce a structured report. Optionally compare against your own product. Save to local file and Notion.

## Load Skills

Read the competitive-research skill at `${CLAUDE_PLUGIN_ROOT}/skills/compete/competitive-research/SKILL.md` for surface scan strategy, query formulation, data extraction normalization, and the competitor_data output schema.

Read the market-analysis skill at `${CLAUDE_PLUGIN_ROOT}/skills/compete/market-analysis/SKILL.md` for SWOT synthesis, positioning characterization, and strategic recommendation generation.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `[company]` (required) — competitor company name (e.g., "Notion") or URL (e.g., "https://notion.so"). If not provided, prompt: "Which company would you like to research? Provide the company name or URL."
- `--your-product="description"` (optional) — description of your own product. When provided, include a 'vs You' comparison section in the report.
- `--output=PATH` (optional) — output file path. Default: `competitive-intel/[company-slug]-[YYYY-MM-DD].md` where `[company-slug]` is the company name lowercased with spaces replaced by hyphens, and `[YYYY-MM-DD]` is today's date.

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
- Command: `compete-research`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'competitive-intel' OR plugin IS NULL) AND (command = 'compete-research' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Research Phase

Apply the competitive-research skill:

1. **Identify the company**: Extract company name and domain from input. For URL input, parse the domain. For name input, determine the likely domain from search results.

2. **Formulate queries**: Construct 4-6 targeted queries covering all 5 research dimensions:
   - Pricing: `[company] pricing [year]`, `site:[domain] pricing`
   - Features: `[company] features`, `[company] site:g2.com`
   - Reviews: `site:g2.com [company]`, `site:capterra.com [company]`
   - Positioning: `site:[domain]` (homepage), `[company] about`
   - News: `[company] funding OR launch OR "product update" [year]`

   Consult `${CLAUDE_PLUGIN_ROOT}/skills/compete/competitive-research/references/query-patterns.md` for full templated query variants.

3. **Execute searches**: Run the web searches using the WebSearch tool. Extract and organize findings into the competitor_data schema defined in the competitive-research skill.

4. **Normalize data**: Apply pricing normalization (per user/month), feature categorization (core/differentiating/gaps), review score normalization (to /5.0 scale), and recency filtering per the skill's rules.

## Analysis Phase

Apply the market-analysis skill:

5. **Build SWOT**: Infer strengths, weaknesses, opportunities, and threats from the structured research data. Apply inference rules from `${CLAUDE_PLUGIN_ROOT}/skills/compete/market-analysis/references/analysis-frameworks.md`.

6. **Classify positioning**: Assign a positioning archetype and messaging characterization.

7. **Generate recommendations**: Produce 3-5 actionable strategic recommendations, each grounded in specific research findings.

8. **Run 'vs You' analysis** (only if `--your-product` was provided): Compare the competitor against your product across pricing, features, and positioning. Identify where you win, where they win, and key differentiation opportunities.

## Save to File

9. **Create output directory**: Create `competitive-intel/` directory at the working directory if it does not exist.

10. **Write report**: Save the formatted report to the output path. Use the report template at `${CLAUDE_PLUGIN_ROOT}/templates/competitive-report.md` as the structural scaffold. Fill all sections with researched data.

## Notion Integration

11. **Find the Research database**: Search Notion for a database named "Founder OS HQ - Research". If not found, fall back to searching for the legacy name "Competitive Intel Compiler - Research". If neither exists, skip Notion integration and warn the user (do NOT create the database — it should be provisioned from the HQ template).

12. **Resolve Company relation**: Search the "Founder OS HQ - Companies" database for a company matching the researched competitor name (case-insensitive). If found, use the existing page ID. If not found, create a new page in Companies with the company name as Title. Store this relation in the Company property.

13. **Save record**: Create a new record with the following properties:
    - Title (title) — Company Name
    - Type (select) — set to "Competitive Analysis"
    - Company (relation) — link to the resolved Companies page
    - Domain (url)
    - Research Date (date)
    - Pricing Model (select: Per Seat/Flat/Usage/Freemium/Enterprise/Unknown)
    - Starting Price (rich_text)
    - Free Tier (checkbox)
    - Positioning Archetype (select: Enterprise Leader/SMB Friendly/Developer-First/Non-Technical Founder/Vertical Specialist/Challenger/Unknown)
    - Review Score (number)
    - Strengths (rich_text)
    - Weaknesses (rich_text)
    - Strategic Recommendations (rich_text)
    - Report File Path (rich_text)
    - Researched At (date)

    **Idempotent upsert**: Query the database for an existing record matching Company Name AND Type="Competitive Analysis". If found, update it. If not, create a new record.

## Graceful Degradation

If Notion CLI is unavailable or any Notion operation fails:
- Output the full report to chat
- Warn: "Notion unavailable — report displayed in chat and saved to [file path]. Configure Notion CLI per `/founder-os:setup:notion-cli`."
- Continue without Notion — the local file save and chat output still succeed

If a web search fails or returns no results:
- Try the alternate query variants from the query-patterns reference
- If still no results, note the specific dimension as "Unable to gather data" in the report
- Never fabricate pricing, features, or review scores

## Output Format

Display the report in chat using the competitive-report.md template structure:

```
## Competitive Intelligence Report: [Company Name]

**Domain**: [domain]
**Research Date**: [YYYY-MM-DD]
**Saved to Notion**: [Yes / No — unavailable]

---

### Executive Summary

[2-3 sentence overview of the competitor's market position, business model, and most important findings]

---

### Pricing

| Plan | Price | Billing | Notes |
|------|-------|---------|-------|
| [plan name] | [$/user/month or flat] | [monthly/annual] | [key inclusions/limits] |

**Pricing Model**: [Per Seat / Flat / Usage / Freemium / Enterprise / Unknown]
**Free Tier**: [Yes / No]

---

### Key Features

**Core Features** (table stakes — expected in this category):
- [feature]

**Differentiating Features** (notable advantages over typical competitors):
- [feature]

**Gaps** (features notably absent or weak):
- [gap]

---

### Positioning & Messaging

**Positioning Archetype**: [Enterprise Leader / SMB Friendly / Developer-First / Non-Technical Founder / Vertical Specialist / Challenger / Unknown]
**Primary Message**: [one-line summary of homepage headline or tagline]
**Target Audience**: [inferred ICP from messaging and feature emphasis]
**Tone**: [e.g., professional/approachable/technical/conversational]

---

### Customer Reviews

**Review Score**: [X.X / 5.0] (source: G2 / Capterra / other)
**Review Count**: [N reviews]

**Top Praise Themes**:
- [theme from positive reviews]

**Top Complaint Themes**:
- [theme from negative reviews]

---

### Recent News & Developments

- [Date] — [event: funding round, product launch, partnership, leadership change, etc.]

---

### vs. You

[Only included when --your-product was provided]

**Your Product**: [description provided via --your-product]

| Dimension | [Company Name] | You | Winner |
|-----------|---------------|-----|--------|
| Pricing | [their pricing] | [your pricing] | [them / you / tie] |
| [Feature area] | [their capability] | [your capability] | [them / you / tie] |
| Positioning | [their ICP] | [your ICP] | [them / you / tie] |

**Where you win**: [bullet list of your advantages]
**Where they win**: [bullet list of their advantages]
**Key differentiation opportunities**: [bullet list of angles to emphasize]

---

### Strategic Recommendations

1. [Recommendation grounded in a specific finding]
2. [Recommendation grounded in a specific finding]
3. [Recommendation grounded in a specific finding]
```

End with:

```
**Report saved to**: [file path]
**Notion**: [Saved to "Founder OS HQ - Research" (Type: Competitive Analysis) / Unavailable — not saved]
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
/founder-os:compete:research Notion
/founder-os:compete:research Linear --your-product="Project management tool for agencies, $49/month flat"
/founder-os:compete:research https://figma.com --output=reports/figma-analysis.md
/founder-os:compete:research "Asana" --your-product="Task manager for solo founders, free tier available"
```
