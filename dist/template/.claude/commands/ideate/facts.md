---
description: Extract facts, statistics, and quotable data from documents or URLs for content backing
argument-hint: "[file-path-or-url] [--format=bullets|table] [--max=10]"
allowed-tools: ["Read", "WebFetch"]
execution-mode: background
result-format: full
---

# /founder-os:ideate:facts

Extract facts, statistics, and quotable data from documents or URLs to back your content with credible evidence.

## Load Skills

Read `skills/ideate/content-writing/SKILL.md` for framework context on how facts integrate into content structure, hook creation, and credibility building.

## Parse Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `source` | Yes | File path or URL to extract facts from (positional) |
| `--format` | No | Output format: `bullets` (default) or `table` |
| `--max` | No | Maximum number of facts to return (default: 10) |

Parse `$ARGUMENTS` for these values. The first positional argument is the source. If `$ARGUMENTS` is empty or missing, halt with: "No source provided. Pass a file path (.md, .txt, .pdf) or URL to extract facts from."

## Business Context

Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to prioritize facts relevant to the user's industry, audience, and current strategy. If files don't exist, skip silently.

## Preflight Check

Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `ideate` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

WebFetch is optional — if not available, only file sources work. Note this in the check: "URL sources require WebFetch MCP. File sources (.md, .txt, .pdf) work without it."

## Step 0: Memory Context

Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to: `fact extraction`, `content research`, `statistics`, and any topics detected in the source argument.
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start

Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `ideate`
- Command: `ideate-facts`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters (source, format, max), context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns

Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'ideate' OR plugin IS NULL) AND (command = 'ideate-facts' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Phase 1 — Source Loading

Detect whether the source is a file path or a URL.

**If file path:**
- Read via the Read tool
- Supported extensions: `.md`, `.txt`, `.pdf`
- If the file is not found, display: "File not found: [path]. Check the path and try again." — then stop execution
- If the file extension is unsupported, display: "Unsupported file type: [ext]. Supported formats: .md, .txt, .pdf" — then stop execution

**If URL:**
- Fetch via WebFetch tool
- If WebFetch is unavailable (not in allowed tools or MCP not connected), display: "URL sources require WebFetch MCP. Use a local file path instead." — then stop execution
- If the fetch fails (404, timeout, etc.), display: "Could not fetch URL: [url]. Check the URL and try again." — then stop execution

Store the loaded content for use in subsequent phases.

## Phase 2 — Fact Extraction

Scan the loaded content and pull out:

- **Statistics with sources** — percentages, dollar amounts, growth rates, timeframes (e.g., "Revenue grew 42% YoY", "$3.2B market size by 2027")
- **Quotable statements** — memorable phrases, expert opinions, named attributions (e.g., "As [Expert] noted, '...'")
- **Data points** — comparisons, benchmarks, before/after metrics (e.g., "Companies using X see 3x faster onboarding")
- **Trend indicators** — direction, velocity, predictions (e.g., "AI adoption accelerating from 20% to 65% by 2028")
- **Counterintuitive findings** — anything that challenges common assumptions (e.g., "Despite popular belief, remote teams shipped 15% faster")

Aim to extract more than the `--max` limit so classification can select the strongest facts. If fewer facts exist in the source than `--max`, return all that were found.

## Phase 3 — Classification

Tag each extracted fact by its content role:

- **Hook-worthy** (🎯): Surprising stats or counterintuitive findings that could open a post. These grab attention and make the reader stop scrolling.
- **Body-supporting** (📊): Evidence and examples that back up a claim in the middle of content. These build the argument.
- **Credibility-building** (🏛️): Authoritative sources, named studies, expert quotes that lend weight. These make the reader trust the author.

A single fact may qualify for multiple classifications — assign the strongest fit. Rank facts within each category by impact (most surprising / most authoritative first).

Trim to the `--max` limit, keeping a balanced mix across categories when possible.

## Phase 4 — Output

### If `--format=bullets` (default):

```
## Facts Extracted: [source name]

**Source**: [file path or URL]
**Facts found**: [total count] (showing top [max])

### Hook-Worthy 🎯
- [fact] — Source: [attribution]
- [fact] — Source: [attribution]

### Body-Supporting 📊
- [fact] — Source: [attribution]
- [fact] — Source: [attribution]

### Credibility-Building 🏛️
- [fact] — Source: [attribution]
- [fact] — Source: [attribution]

---
Next step: Use these facts in /ideate:draft or /social:compose to back your content.
```

### If `--format=table`:

```
## Facts Extracted: [source name]

**Source**: [file path or URL]
**Facts found**: [total count] (showing top [max])

| # | Fact | Classification | Source |
|---|------|---------------|--------|
| 1 | [fact] | Hook-worthy 🎯 | [source] |
| 2 | [fact] | Body-supporting 📊 | [source] |
| 3 | [fact] | Credibility-building 🏛️ | [source] |
| ... | ... | ... | ... |

---
Next step: Use these facts in /ideate:draft or /social:compose to back your content.
```

If no facts were found in the source:
- Display: "No extractable facts found in [source name]. The source may not contain statistics, quotes, or data points. Try a different document or URL."

## Observation: End

After execution completes, record a post_command event to the Intelligence event store:
- Event type: `post_command`
- Use the same session_id from the start observation
- Outcome: `success` | `failure` | `degraded`
- Payload: { outcome summary, facts extracted count, categories breakdown, source type }
- Duration: milliseconds elapsed since pre_command event
- If any errors occurred during execution, also record an error event with the error type, message, and whether recovery was attempted

## Final: Memory Update

Read the pattern-detection skill at `_infrastructure/memory/pattern-detection/SKILL.md`.
Log this execution as an observation with: plugin name (`ideate`), primary action performed (`fact-extraction`), key entities (source name, topics detected), and output summary (fact count, category distribution).
Check for emerging patterns per the detection rules. If a memory reaches the adaptation threshold, append the notification to the output.

## Usage Examples

```
/founder-os:ideate:facts quarterly-report.pdf
/founder-os:ideate:facts research-paper.md --format=table --max=15
/founder-os:ideate:facts https://example.com/industry-report
/founder-os:ideate:facts meeting-notes.txt --max=5
```
