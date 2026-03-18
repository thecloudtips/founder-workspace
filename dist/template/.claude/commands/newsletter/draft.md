---
description: Write full newsletter draft from outline in founder voice
argument-hint: "[--output=PATH] [--tone=professional|friendly|casual|authoritative|conversational]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:newsletter:draft

Write a complete newsletter draft from an outline, applying founder-voice tone and newsletter-writing best practices, then save to file and display in chat.

## Load Skills

Read the newsletter-writing skill at `${CLAUDE_PLUGIN_ROOT}/skills/newsletter/newsletter-writing/SKILL.md` for structure rules, section writing patterns, hook types, transition techniques, takeaway formatting, CTA patterns, and Substack-compatible markdown constraints.

Read the founder-voice skill at `${CLAUDE_PLUGIN_ROOT}/skills/newsletter/founder-voice/SKILL.md` for tone calibration, sentence rhythm, opinion injection patterns, practical framing techniques, and voice anti-patterns.

Read the newsletter template at `${CLAUDE_PLUGIN_ROOT}/templates/newsletter-template.md` for the structural scaffold to follow when assembling the final draft.

Read the humanize-content skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md` for natural-sounding prose generation and post-processing validation.

Read the newsletter humanization reference at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/newsletter-humanization.md` for newsletter-specific humanization rules.

Apply humanize-content for natural-sounding prose. The `--tone` flag selects the humanization tone preset (default: Professional).

## Parse Arguments

Extract flags from `$ARGUMENTS`:
- `--output=PATH` (optional) — file path for the saved newsletter draft. Default: `newsletters/[topic-slug]-[YYYY-MM-DD].md` where `topic-slug` is derived from the outline's topic by lowercasing, replacing spaces with hyphens, and removing special characters.
- `--tone=professional|friendly|casual|authoritative|conversational` (optional) — humanization tone preset. Default: `professional`.

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
- Command: `newsletter-draft`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'newsletter-engine' OR plugin IS NULL) AND (command = 'newsletter-draft' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Check for Outline

1. Look for an outline from a prior `/founder-os:newsletter:outline` run in the current conversation context. The outline will contain a topic, hook type, section plan, key points, and source references.
2. If no outline is found in the conversation, prompt the user: "No outline in this conversation. Run `/founder-os:newsletter:outline` first, or paste your outline here." Then stop and wait for user input.
3. Once an outline is available, confirm it before proceeding: display the topic and section count, then continue to drafting.

## Write Hook

Write 2-3 attention-grabbing opening sentences following the hook type specified in the outline (e.g., contrarian, story, statistic, question, bold claim).

Apply founder-voice tone:
- Professional but conversational — write like talking to a smart peer, not lecturing.
- Strong opening statement that takes a clear position or creates immediate curiosity.
- Short-long sentence rhythm: punch with a short sentence, then expand with a longer one.
- No throat-clearing — skip "In today's rapidly changing landscape..." or similar filler.

## Write Main Sections

For each section defined in the outline, in order:

1. **Write the section heading**: Use the section title from the outline as an H2 heading.

2. **Write section body**: Follow the newsletter-writing skill's structure rules for the section type. Consult `${CLAUDE_PLUGIN_ROOT}/skills/newsletter/newsletter-writing/references/section-templates.md` for section type guidance (analysis, how-to, case study, opinion, trend, etc.).

3. **Apply founder-voice patterns throughout**:
   - Opinion injection: Weave in perspective with phrases like "Here is why this matters...", "This is the part most people get wrong...", "I have seen this play out dozens of times..."
   - Practical framing: Ground abstract ideas with "What this means for you...", "The takeaway here is simple...", "Here is what I would actually do..."
   - Short-long sentence rhythm: Alternate punchy statements with detailed follow-ups.
   - Consult `${CLAUDE_PLUGIN_ROOT}/skills/newsletter/founder-voice/references/voice-examples.md` for tone calibration and phrasing examples.

4. **Include source references inline**: Where the outline references external sources, integrate them naturally as hyperlinks within the text. Do not use footnotes or endnote-style numbering — Substack does not support them.

5. **Write transitions**: Between each section, use a transition pattern that connects the previous idea to the next. Avoid generic transitions like "Moving on..." or "Next, let's talk about..." — instead, bridge with a thought that links the two topics.

## Write Key Takeaways

After all main sections, write a "Key Takeaways" section with 3-5 actionable bullet points:
- Each bullet starts with a verb (e.g., "Audit your...", "Replace...", "Start tracking...", "Ask yourself...").
- Each bullet is one sentence, concrete and specific — no vague advice.
- Bullets should summarize the most actionable insights from the newsletter, not repeat section headings.

## Write CTA

Write a closing call-to-action in founder voice:
- Ask the reader to do one specific thing (reply, share, try something this week, bookmark a resource).
- Keep it conversational and direct — one short paragraph, 2-3 sentences max.
- End with a question or invitation that encourages replies, not a formal sign-off.

## Add Sources Section

After the CTA, add a "Sources" section:
- List all URLs referenced in the newsletter with descriptive link text.
- Format as a bulleted list of markdown links: `- [Descriptive Title](https://url)`.
- Only include sources that were actually cited inline in the body.

## Format Check

Before saving, verify the draft is Substack-compatible markdown:
- No raw HTML tags.
- No tables (rewrite any tabular content as prose or bullet lists).
- No footnotes or endnote syntax.
- No nested blockquotes (single-level blockquotes are fine).
- Headings use `##` for sections (H2), `###` for subsections (H3). Do not use H1 — Substack uses the post title as H1.
- Images use standard markdown syntax: `![alt text](url)`.
- Links use inline syntax: `[text](url)`.
- Bold and italic use `**` and `*` respectively.

## Save File

1. Determine the output path: use the `--output` value if provided, otherwise construct the default path as `newsletters/[topic-slug]-[YYYY-MM-DD].md`.
2. Create the `newsletters/` directory if it does not exist.
3. Write the complete newsletter draft to the output path using Filesystem MCP or the Write tool.
4. If the filesystem write fails for any reason, display the full draft in chat and warn: "Could not save to `[path]`. Copy the draft above manually."

## Display Draft

After saving, display the complete newsletter draft in chat so the user can review it immediately.

Show a summary footer:

```
---

## Draft Summary

**Topic**: [topic from outline]
**Sections**: [count]
**Word count**: ~[approximate word count]
**Saved to**: [file path]

Ready to edit or publish. Review the draft above and refine as needed.
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
/founder-os:newsletter:draft
/founder-os:newsletter:draft --output=newsletters/ai-automation-trends.md
/founder-os:newsletter:draft --output=~/Desktop/this-weeks-newsletter.md
```
