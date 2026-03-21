---
description: Full pipeline — research, outline, and draft a newsletter on any topic
argument-hint: "[topic] [--sources=web,github,reddit,quora] [--days=N] [--sections=N] [--output=PATH] [--tone=professional|friendly|casual|authoritative|conversational]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:newsletter:newsletter

Research a topic, build a structured outline, and write a complete newsletter draft in one go. This command executes the full research-to-draft pipeline without stopping for user input between phases.

## Load All Skills

Read all three skills and the template before starting any phase:

1. `skills/newsletter/topic-research/SKILL.md`
2. `skills/newsletter/newsletter-writing/SKILL.md`
3. `skills/newsletter/founder-voice/SKILL.md`
4. `../../../.founderOS/templates/newsletter-template.md`
5. `../../../.founderOS/infrastructure/humanize-content/SKILL.md`
6. `../../../.founderOS/infrastructure/humanize-content/references/newsletter-humanization.md`

Apply the topic-research skill during Phase 1, the newsletter-writing skill during Phases 2 and 3, and the founder-voice skill during Phase 3. The template is the formatting scaffold for the final draft. Apply humanize-content for natural-sounding prose during Phase 3.

## Parse Arguments

Extract the topic and flags from `$ARGUMENTS`:

- **topic** (required) — all text before any `--` flags. This is the newsletter subject. If no topic is provided, prompt the user: "What topic should the newsletter cover?" Then stop and wait for input.
- `--sources=web,github,reddit,quora` (optional) — comma-separated list of sources to search. Valid values: `web`, `github`, `reddit`, `quora`. Default: `web,github,reddit,quora`.
- `--days=N` (optional) — lookback window in days for research recency scoring. Default: 14.
- `--sections=N` (optional) — number of main content sections in the newsletter. Default: 4. Valid range: 3-5. Clamp values outside this range and inform the user.
- `--output=PATH` (optional) — file path for the final newsletter draft. Default: `newsletters/[topic-slug]-[YYYY-MM-DD].md` where `topic-slug` is the topic in lowercase kebab-case with special characters removed.
- `--tone=professional|friendly|casual|authoritative|conversational` (optional) — humanization tone preset. Default: `professional`.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `newsletter` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `newsletter-engine`
- Command: `newsletter-newsletter`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'newsletter-engine' OR plugin IS NULL) AND (command = 'newsletter-newsletter' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Phase 1 — Research

Display: **"Phase 1/3: Researching [topic]..."**

Execute the full research process per the topic-research skill:

1. **Formulate queries**: Generate 5-8 targeted web search queries based on the topic. Include:
   - 1-2 general web queries for broad coverage, news, and announcements
   - 1-2 `site:github.com` queries for trending repos, releases, and open-source activity (only if `github` is in `--sources`)
   - 1-2 `site:reddit.com` queries for community discussions, opinions, and sentiment (only if `reddit` is in `--sources`)
   - 1 `site:quora.com` query for Q&A discussions and expert perspectives (only if `quora` is in `--sources`)
   - 1 query targeting official blogs, changelogs, or release notes

2. **Execute searches**: Run each query using the WebSearch tool. Extract top results from each. If a search fails or returns no results, skip it and continue — never halt the pipeline for a single failed search.

3. **Extract findings**: Parse each result into a structured finding:
   - **title**: The result title
   - **source**: Publication or site name
   - **url**: Full URL
   - **summary**: 1-2 sentence summary of the finding's relevance
   - **date**: Publication date if available, otherwise "Unknown"
   - **source_type**: One of `official-release`, `blog-post`, `github-repo`, `community-discussion`, `tutorial`

4. **Score and sort**: Score each finding:
   - **relevance_score** (0.0-1.0): 1.0 for exact topic matches, 0.7+ for closely related, 0.4-0.6 for tangential, below 0.4 for loosely related
   - **recency_score** (0.0-1.0): Within 7 days = 1.0, within 14 days = 0.7, within 30 days = 0.4, older or unknown = 0.2
   - **combined_score** = relevance_score x 0.6 + recency_score x 0.4
   - Sort by combined_score descending

5. **Deduplicate**: Merge findings covering the same event or announcement. Keep the highest-scored version as primary and note alternate sources.

6. **Identify themes**: Extract 3-5 key themes that emerge across multiple findings.

### Research Output

Display a research summary:

```
## Phase 1 Complete: Research Summary

**Topic**: [topic]
**Date range**: Last [N] days (since [start date])
**Sources searched**: [list]
**Queries run**: [count]
**Findings**: [total] ([count] after deduplication)

### Top Findings

| # | Score | Title | Source | Type | Date |
|---|-------|-------|--------|------|------|
| 1 | [score] | [title] | [source] | [type] | [date] |
| 2 | ... | ... | ... | ... | ... |
[top 10 findings]

### Key Themes
1. **[Theme]** — [description]
2. **[Theme]** — [description]
3. **[Theme]** — [description]
```

Display: **"Research complete. Proceeding to outline..."**

If no findings are returned from any source, display: "No findings for '[topic]' in the last [N] days. Try broadening the topic or extending the date range with `--days=30`." Then stop.

## Phase 2 — Outline

Display: **"Phase 2/3: Building outline..."**

Execute the full outline process per the newsletter-writing skill:

1. **Cluster findings**: Group research findings into exactly N thematic clusters (per `--sections` flag). Each cluster becomes one main content section.
   - Identify recurring themes, related data points, and complementary insights
   - Merge closely related findings into a single cluster; split overly broad clusters
   - Assign a working title to each cluster
   - Select the 2-3 strongest points per cluster supported by sources

2. **Choose hook angle**: Select the most impactful or surprising finding as the hook.
   - Scan all findings for unexpected stats, contrarian takes, compelling stories, or provocative questions
   - Pick one hook type from the newsletter-writing skill: **stat-led**, **contrarian**, **story-led**, or **question**
   - Prioritize surprise and relevance to the target audience

3. **Build outline structure**:
   - **Hook**: Which finding to use, why it matters, selected hook type, 2-3 sentence description of the angle
   - **Sections 1-N**: Clear engaging title, 2-3 key points with source references, angle note for presentation approach
   - **Key Takeaways**: 3-5 actionable bullets the reader can apply immediately, each concrete and specific
   - **CTA Direction**: What reader engagement to drive (reply, share, try something, visit a link)

### Outline Output

Display the outline:

```
## Phase 2 Complete: Newsletter Outline

**Hook type**: [stat-led|contrarian|story-led|question]
**Sections**: [N]
**Target length**: [type per newsletter-writing skill]

---

### Hook
[2-3 sentences describing the hook angle]

### Section 1: [Title]
- Key point 1 (source: [name])
- Key point 2 (source: [name])
- Angle: [how to present this]

### Section 2: [Title]
...

[repeat for all sections]

### Key Takeaways
1. [Actionable insight]
2. [Actionable insight]
3. [Actionable insight]

### CTA Direction
[What to prompt readers to do]
```

Display: **"Outline ready. Writing draft..."**

## Phase 3 — Draft

Display: **"Phase 3/3: Writing newsletter in founder voice..."**

Execute the full draft process per the newsletter-writing and founder-voice skills:

1. **Write the full newsletter** using the template scaffold from `../../../.founderOS/templates/newsletter-template.md`:
   - Replace all `{{PLACEHOLDERS}}` with actual content
   - Apply the four-part structure: Hook, Main Content (N sections), Key Takeaways, CTA
   - Write in founder voice per the founder-voice skill: professional, conversational, opinionated
   - Use short-long sentence alternation, opinion injection with the "Here is why this matters" framework, and practical framing
   - Follow Substack-compatible formatting rules (no H1, no HTML, no Markdown tables, `---` dividers between sections)
   - Attribute all sources with inline links using descriptive text
   - Connect sections with bridge sentences per the transition patterns
   - Vary section opening patterns to avoid rhythmic monotony

2. **Format as Substack-compatible Markdown**:
   - Use `##` for section headers
   - Use `**bold**` for emphasis
   - Use `>` for blockquotes
   - Use `---` between major sections
   - Use `-` for unordered lists
   - Include Sources section at the bottom with all referenced URLs

3. **Run quality checklist** from the newsletter-writing skill before outputting:
   - Hook is under 60 words and does not start with "I" or a greeting
   - Main content has the correct number of sections in descending order of reader impact
   - Every section has a benefit-oriented H2 heading
   - Every non-obvious claim has an inline source link
   - Total word count is between 800 and 1500 (excluding Sources section)
   - Key Takeaways are 3-5 bullets each starting with an action verb
   - CTA is a single clear ask in 2-3 sentences
   - No Markdown tables in the body
   - `---` dividers separate all major sections
   - No H1 headings
   - Transition bridges connect consecutive sections
   - Sources section lists all referenced URLs in order of appearance
   - Draft uses the template scaffold

4. **Save the draft**: Write the completed newsletter to the output path. Create the parent directory if it does not exist.

### Draft Output

Display the complete newsletter in chat, then display:

```
## Phase 3 Complete: Newsletter Draft

Saved to: [output path]
```

## Pipeline Summary

After all three phases complete, display a summary:

```
---

## Pipeline Complete

### Research Stats
- **Queries run**: [count]
- **Findings found**: [total raw count]
- **Findings after dedup**: [deduplicated count]
- **Sources used**: [list of source types searched]
- **Themes identified**: [count]

### Newsletter Stats
- **Word count**: [count] (target: 800-1500)
- **Sections**: [count]
- **Sources cited**: [count of unique inline links]
- **Hook type**: [type]

### Output
- **File**: [full output path]

Edit the file at [output path] or copy from above.
```

## Notion Integration

After the pipeline completes, log results to two consolidated databases:

### Research Logging

1. **Discover database**: Search Notion for **"[FOS] Research"**. If not found, try **"Founder OS HQ - Research"**. If not found, fall back to **"Newsletter Engine - Research"** (legacy name). If none is found, skip research logging silently.
2. **Log research session**: Create a page in the discovered database with the research results. Set `Type = "Newsletter Research"`.

### Newsletter Draft Logging

1. **Discover database**: Search Notion for **"[FOS] Content"**. If not found, try **"Founder OS HQ - Content"**. If not found, skip content logging silently.
2. **Log newsletter**: Create a page with:
   - **Title**: Newsletter topic
   - **Type**: `"Newsletter"`
   - **Content**: The newsletter draft text
   - **Status**: `"Draft"`
   - **Output File**: The saved file path
   - **Generated At**: Current timestamp
3. **Idempotent**: Upsert by Title + Type="Newsletter" + same calendar day.

## Graceful Degradation

If Notion CLI is unavailable or any Notion operation fails:
- Complete the full pipeline and display all output in chat
- Save the draft file to the output path
- Do not warn or error about Notion — chat output and file output are fully sufficient
- Omit the "Tracked in Notion" line from research output

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
/newsletter "what's new in claude code"
/newsletter "AI tools for small business" --days=7
/newsletter "react server components" --sources=web,github --sections=3
/newsletter "SaaS pricing trends" --output=drafts/saas-pricing.md
/newsletter "remote team management" --sections=5 --days=30
/newsletter "open source AI models" --sources=web,github,reddit
```
