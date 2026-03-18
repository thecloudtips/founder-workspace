---
description: Create newsletter structure from research findings
argument-hint: "[--sections=N]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:newsletter:outline

Create a structured newsletter outline by clustering research findings into thematic sections with a compelling hook.

## Load Skills

Read the newsletter-writing skill at `${CLAUDE_PLUGIN_ROOT}/skills/newsletter/newsletter-writing/SKILL.md` for structure guidelines, hook types, section formatting, and target length definitions. Use this skill throughout the outline process.

## Parse Arguments

Extract optional flags from the user's command:

- `--sections=N` — Number of main sections (default: 4, valid range: 3-5). Clamp values outside this range and inform the user.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
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
- Command: `newsletter-outline`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'newsletter-engine' OR plugin IS NULL) AND (command = 'newsletter-outline' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Check for Research

Look for research findings from a prior `/founder-os:newsletter:research` run in the current conversation. Research output typically contains source names, key findings, trends, stats, and quotes.

If no research findings are found in the conversation context, prompt the user:

> No research findings in this conversation. Run `/founder-os:newsletter:research [topic]` first, or paste your research notes here.

Then stop and wait for user input. Do not fabricate research or proceed without source material.

## Cluster Findings

Group the research findings into thematic clusters:

1. Identify recurring themes, related data points, and complementary insights across all findings.
2. Merge closely related findings into a single cluster. Split overly broad clusters.
3. Target exactly N clusters (per the `--sections` flag) — each cluster becomes one main section.
4. Assign a working title to each cluster that captures the theme.
5. Within each cluster, select the 2-3 strongest points supported by sources.

## Choose Hook Angle

Select the most impactful or surprising finding as the newsletter hook:

1. Scan all findings for: unexpected stats, contrarian takes, compelling stories, or provocative questions.
2. Apply hook type selection from the newsletter-writing skill. Choose one of:
   - **stat-led** — Lead with a striking number or data point
   - **contrarian** — Challenge a common assumption
   - **story-led** — Open with a brief narrative or anecdote
   - **question** — Pose a thought-provoking question the reader can't ignore
3. Pick the hook type that best fits the strongest finding. Prioritize surprise and relevance to the target audience.

## Build Outline

Structure the full newsletter outline:

1. **Hook**: Identify which finding to use, why it matters to the reader, and the selected hook type. Write 2-3 sentences describing the hook angle.
2. **Sections 1-N**: For each section, provide:
   - A clear, engaging title
   - 2-3 key points with source references
   - An angle note describing how to present the material
3. **Key Takeaways**: Distill 3-5 actionable bullets the reader can apply immediately. Each takeaway should be concrete and specific, not generic advice.
4. **CTA Direction**: Define what reader engagement to drive (reply, share, try something, visit a link, etc.).

## Display Outline

Present the outline in the following format:

```
## Newsletter Outline

**Topic**: [topic from research]
**Hook type**: [stat-led|contrarian|story-led|question]
**Sections**: [N]
**Target length**: [type from skill]

---

### Hook
[2-3 sentences describing the hook angle]

### Section 1: [Title]
- Key point 1 (source: [name])
- Key point 2 (source: [name])
- Angle: [how to present this]

### Section 2: [Title]
- Key point 1 (source: [name])
- Key point 2 (source: [name])
- Angle: [how to present this]

[...repeat for all sections...]

### Key Takeaways
1. [Actionable insight]
2. [Actionable insight]
3. [Actionable insight]

### CTA Direction
[What to prompt readers to do]

---

Run `/founder-os:newsletter:draft` to write the full newsletter from this outline.
```

After displaying, wait for user feedback. The user may ask to adjust sections, change the hook type, reorder content, or add/remove points before proceeding to the draft step.

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

- `/founder-os:newsletter:outline` — Build a 4-section outline from research already in the conversation
- `/founder-os:newsletter:outline --sections=3` — Build a concise 3-section outline
- `/founder-os:newsletter:outline --sections=5` — Build a detailed 5-section outline
