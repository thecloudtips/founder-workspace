---
description: Generate a report from a predefined template with structured sections
argument-hint: --template=NAME --data=PATH --team --output=PATH
allowed-tools: Read, Glob, Grep, Write, Task
execution-mode: background
result-format: summary
---

# /founder-os:report:from-template

Generate a report using a predefined template structure. Templates provide section layout and formatting guidance; data fills the content.

## Parse Arguments

- `--template=NAME` (string, optional) — template name: `executive-summary`, `full-business-report`, `project-status-report`. If not provided, list available templates and ask user to choose.
- `--data=PATH` (string, optional) — path to data source. If not provided, ask user.
- `--team` (boolean, default: false) — use full 5-agent pipeline
- `--output=PATH` (string, default: `./report-output/`) — output directory

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `report` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `report-generator`
- Command: `report-from-template`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'report-generator' OR plugin IS NULL) AND (command = 'report-from-template' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Available Templates

When no `--template` is specified, or when listing templates:

Read all template files from `../../../.founderOS/templates/report-templates/` and present:

| Template | Description | Best For |
|----------|-------------|----------|
| `executive-summary` | 1-2 page key metrics + recommendations | Quick stakeholder updates |
| `full-business-report` | Multi-section comprehensive analysis | Quarterly reviews, deep dives |
| `project-status-report` | RAG status, milestones, action items | Weekly/monthly project updates |

Ask the user to select a template.

## Mode 1: Default (Single-Agent)

When `--team` is NOT present:

1. Read all 5 skills from `skills/report/*/SKILL.md`.
2. Read the selected template from `../../../.founderOS/templates/report-templates/[template-name].md`.
3. Read the data source (auto-detect format per data-extraction skill).
4. Analyze data per data-analysis skill.
5. Generate report following the template structure:
   - Fill each `{{placeholder}}` with data-derived content
   - Insert Mermaid charts at `<!-- CHART: description -->` markers
   - Follow template section order exactly
6. Write output to `--output` path.

## Mode 2: Team Pipeline (`--team`)

When `--team` IS present:

1. Read template and pass it as part of the pipeline input.
2. Read `agents/report/config.json` and execute the 5-agent pipeline.
3. The Writing Agent receives both analysis results AND template structure — it must follow the template.
4. Present final output with pipeline report.

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

## Error Handling

- Unknown template name: list available templates and ask user to choose
- Missing data source: ask user to provide
- Template file missing: report error, suggest running with no template flag

## Usage Examples

```
/founder-os:report:from-template                                           # Interactive: list templates, ask for choice
/founder-os:report:from-template --template=executive-summary --data=q4.csv
/founder-os:report:from-template --template=full-business-report --data=./data/ --team
/founder-os:report:from-template --template=project-status-report --data=sprint-metrics.json --output=./status/
```
