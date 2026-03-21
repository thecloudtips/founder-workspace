---
description: Browse the knowledge base to find documents matching a topic with ranked previews
argument-hint: "[topic] [--sources=notion|drive|all] [--type=TYPE] [--limit=N]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:kb:find

Lightweight browse command that searches Notion and Google Drive for documents matching a topic, scores them for relevance, and returns a ranked list of preview cards. Optimized for discovery -- shows what documents exist without extracting full answers. Ephemeral output only; nothing is saved to Notion.

## Load Skills

Read the knowledge-retrieval skill at `skills/kb/knowledge-retrieval/SKILL.md` for multi-source search pipeline, query formulation, relevance scoring, and preview generation.

Do NOT load the answer-synthesis skill. This command lists documents, it does not synthesize answers.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `[topic]` (required) -- the search topic or question. This is the positional argument before any flags. If missing or empty, prompt the user: "What topic would you like to search for? Usage: `/founder-os:kb:find [topic]`" and stop.
- `--sources=SOURCE` (optional) -- which sources to search. Accepts `notion`, `drive`, or `all`. Default: `all`.
- `--type=TYPE` (optional) -- filter results to a specific document classification. Accepts: `wiki`, `meeting-notes`, `project-docs`, `process`, `reference`, `template`, `database`, `archive`, `other`, `all`. Default: `all`.
- `--limit=N` (optional) -- maximum number of results to display. Accepts integer 1-20. Default: `10`. If the user provides a value above 20, cap at 20 silently. If below 1, set to 1.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `kb` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `knowledge-base`
- Command: `kb-find`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'knowledge-base' OR plugin IS NULL) AND (command = 'kb-find' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Step 1: Formulate Queries

Apply the query formulation rules from the knowledge-retrieval skill:
1. Generate 2-3 query variants from the user's topic (literal, synonym, broadened).
2. Keep each variant to 2-5 words.
3. Do not generate more than 3 variants.

## Step 2: Search Sources

Execute the multi-source search pipeline from the knowledge-retrieval skill.

**Source selection based on `--sources` flag:**
- `all` (default): Search Notion first, then Google Drive.
- `notion`: Search Notion only. Skip Drive entirely.
- `drive`: Search Google Drive only. Skip Notion. If gws CLI is unavailable, stop with the degradation message below.

For each available source, run all query variants. Collect results in the format defined by the knowledge-retrieval skill (source, title, url, content_snippet, last_edited, content_type).

Deduplicate results that appear in both sources (match by title similarity or URL).

## Step 3: Filter by Type

If `--type` is set to anything other than `all`, filter the result set to include only documents whose classification matches the specified type.

Classify each result using the 9-type taxonomy from the content-classification reference at `skills/kb/source-indexing/references/content-classification.md`. Apply the classification decision flow: database (priority 1) > archive (priority 2) > title match (priority 3) > content match (priority 4) > parent location (priority 5) > other (priority 6).

Remove results that do not match the requested type. If all results are filtered out, report no results with a suggestion to try `--type=all`.

## Step 4: Score and Rank

Apply the 3-factor relevance scoring from the knowledge-retrieval skill:
1. **Keyword Density** (0-40) -- key term presence in title and content.
2. **Title Match** (0-30) -- how closely the title matches query intent.
3. **Recency** (0-30) -- freshness based on last edited date.

Sum the three factors for a composite score (0-100). Sort results by composite score descending.

## Step 5: Generate Previews

For each result up to `--limit`:
1. Generate a 150-character preview following the preview rules from the knowledge-retrieval skill:
   - Use the first meaningful sentence of the document body.
   - Skip titles, metadata, and blank lines.
   - Truncate at the last word boundary before 150 characters and append "..." if needed.
   - Strip markdown formatting from the preview text.
2. Determine the freshness tier for display:
   - 0-29 days since edit: "Fresh"
   - 30-89 days: "Current"
   - 90-179 days: "Aging"
   - 180+ days: "Stale"
3. Determine the classification label for display using the same taxonomy from Step 3.

## Step 6: Output

Display the results in this exact format:

### Results Found

```
## Knowledge Base: [topic]

**Sources searched**: [Notion, Google Drive] | **Results**: [count] documents

---

1. **[Document Title]** ([classification] · [freshness])
   [150-char excerpt from content...]
   _Source: [Notion Page|Notion Database|Google Drive] · Score: [XX]/100 · [URL]_

2. **[Document Title]** ([classification] · [freshness])
   [150-char excerpt from content...]
   _Source: [Notion Page|Notion Database|Google Drive] · Score: [XX]/100 · [URL]_

...

---

*Run `/founder-os:kb:ask [topic]` for a sourced answer · Knowledge Base Q&A*
```

**Sources searched** reflects which sources were actually queried:
- If both Notion and Drive were searched: "Notion, Google Drive"
- If only Notion was searched (Drive unavailable or `--sources=notion`): "Notion"
- If only Drive was searched (`--sources=drive`): "Google Drive"

**Results count** is the total number of scored results before applying `--limit`. The displayed list is capped at `--limit`.

If `--type` was specified (not `all`), add a filter note after the sources line:
```
**Sources searched**: [sources] | **Type filter**: [type] | **Results**: [count] documents
```

### No Results Found

```
## Knowledge Base: [topic]

**Sources searched**: [sources] | **Results**: 0 documents

No documents found matching "[topic]". Try broader search terms or check that sources are indexed with `/founder-os:kb:index`.
```

If `--type` was specified, append: "You can also try `--type=all` to search across all document types."

## No Notion Storage

This command does NOT save results to Notion. It answers "what documents do we have about X" -- ephemeral by design. For tracked Q&A with sourced answers, use `/founder-os:kb:ask`.

## Source Index Lookup

When filtering by `--type`, the command may consult the indexed Sources database for classification data. Discover the database using the consolidated name first:
1. Search for "[FOS] Knowledge Base". If found, filter records where Type="Source".
2. If not found, try "Founder OS HQ - Knowledge Base". If found, filter records where Type="Source".
3. If not found, search for "Knowledge Base Q&A - Sources".
3. If neither is found, classify documents at query time using the content-classification reference (no pre-indexed data available).

## Graceful Degradation

**gws CLI unavailable or not authenticated** (and `--sources` is `all`): Continue with Notion only. Include a note in the output footer: "Google Drive was not searched (gws CLI unavailable). Install gws CLI and run `gws auth login` for broader coverage."

**All sources return empty**: Display the no-results message with alternative query suggestions based on the synonym variants that were generated.

**Partial failures**: If one query variant fails but others succeed, continue with successful results. Do not surface individual query errors to the user.

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
/founder-os:kb:find onboarding
/founder-os:kb:find "deployment process" --type=process
/founder-os:kb:find pricing --sources=notion --limit=5
/founder-os:kb:find API documentation --type=reference --sources=all --limit=20
/founder-os:kb:find quarterly review --type=meeting-notes --limit=3
```
