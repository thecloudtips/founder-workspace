---
description: Generate multiple content angle variations with different hooks, frameworks, and tones
argument-hint: "[draft-or-topic] [--platform=linkedin|x|meta|tiktok] [--audience=founder|technical|marketer|cxo] [--count=3]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:ideate:variations

Generate multiple content angle variations for a topic or draft, each varying the hook style, framework, and tone. This command is ephemeral — no file output. Results display in chat only.

## Load Skills

Read all skills before starting:
1. `${CLAUDE_PLUGIN_ROOT}/skills/ideate/content-writing/SKILL.md`
2. `${CLAUDE_PLUGIN_ROOT}/skills/ideate/hook-creation/SKILL.md`
3. `${CLAUDE_PLUGIN_ROOT}/skills/ideate/founder-voice/SKILL.md`
4. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/SKILL.md`
5. `${CLAUDE_PLUGIN_ROOT}/_infrastructure/humanize-content/references/linkedin-humanization.md`

Apply humanize-content for natural-sounding prose. The `--tone` flag selects the humanization tone preset (default: Professional).

## Parse Input

Determine the source material from `$ARGUMENTS`:
- **Option A — Existing draft in conversation**: If content was generated earlier in this conversation (via `/founder-os:ideate:draft` or `/founder-os:ideate:from-doc`), use that as the source. The text and its metadata (topic, framework, audience) should be available from the prior output.
- **Option B — Pasted text**: If `$ARGUMENTS` contains multi-line text or quoted text, treat it as the source draft.
- **Option C — Topic only**: If `$ARGUMENTS` is a short phrase (single line, no post-like formatting), treat it as a new topic.
- **No input**: If no arguments AND no prior content in conversation, prompt: "Paste a content draft, or provide a topic. You can also run `/founder-os:ideate:draft [topic]` first, then run `/founder-os:ideate:variations` to get variations."  Then stop and wait.

Parse flags:
- `--platform=linkedin|x|meta|tiktok` (optional) — Target platform. Default: `linkedin`. Influences tone, length constraints, and platform fit notes.
- `--audience=founder|technical|marketer|cxo` (optional) — Default: `founder` or inherit from prior content
- `--count=N` (optional) — Number of variations. Default: 3. Max: 5.
- `--tone=professional|friendly|casual|authoritative|conversational` (optional) — humanization tone preset. Controls formality, warmth, and sentence rhythm. Default: `professional`.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `ideate` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `ideate`
- Command: `ideate-variations`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'ideate' OR plugin IS NULL) AND (command = 'ideate-variations' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Generate Variations

For each variation (up to count), change at least TWO of these three elements:

1. **Hook style**: Use a different formula from the hook-creation skill (stat-led, question, story, contrarian, bold claim, pattern interrupt)
2. **Framework**: Use a different framework from the content-writing skill (story, listicle, contrarian take, how-to, personal lesson, industry insight, question-led)
3. **Tone shift**: Adjust within founder voice — bold/assertive, thoughtful/reflective, practical/tactical, provocative/challenging

Rules:
- Each variation must use a DIFFERENT framework than the others
- Each variation must use a DIFFERENT hook formula than the others
- All variations stay within the same audience segment
- Output content briefs, not fully formatted posts — each variation is an ideation-level angle showing a different approach (hook, framework, key points, suggested structure)
- Include a 2-3 sentence opening paragraph to demonstrate the hook and tone
- List 3-5 key talking points or structural beats for the full piece
- Apply founder-voice skill to all variations
- Note platform-specific considerations for the selected `--platform` (e.g., character limits, format norms, hashtag conventions)

## Output Format

Display all variations with clear labels:

```
## Variation 1: [Framework] + [Hook Formula] — [Tone]

**Angle**: [One-sentence description of this variation's unique angle]

**Opening hook** (demonstrating tone and hook formula):
[2-3 sentence opening paragraph]

**Key talking points**:
- [Point 1]
- [Point 2]
- [Point 3]

**Suggested structure**: [Framework name] — [brief structural outline]

**Platform fit** ([platform]): [1-sentence note on how this angle suits the target platform]

---

## Variation 2: [Framework] + [Hook Formula] — [Tone]
...

---

## Variation 3: [Framework] + [Hook Formula] — [Tone]
...
```

After all variations:

```
---

## Comparison

| # | Framework | Hook | Tone | Angle Summary | Platform Fit ([platform]) |
|---|-----------|------|------|---------------|---------------------------|
| 1 | [name] | [formula] | [tone] | [1-liner] | [fit rating: Strong/Good/Fair] |
| 2 | ... | ... | ... | ... | ... |
| 3 | ... | ... | ... | ... | ... |

Pick the angle that resonates most, or mix elements from different variations.

**Next step**: Run `/founder-os:ideate:draft [topic] --framework=[chosen]` to develop your chosen angle into a full content piece, or use `/founder-os:social:compose` to create a platform-ready post.
```

## No Persistence

This command is ephemeral by design:
- No file output
- No external logging
- Results display in chat only
- Users can copy-paste their preferred variation or proceed to drafting

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
/founder-os:ideate:variations
/founder-os:ideate:variations "why I stopped using OKRs"
/founder-os:ideate:variations --count=5
/founder-os:ideate:variations --audience=technical
/founder-os:ideate:variations --platform=x --count=4
/founder-os:ideate:variations "Paste your draft here\nLine 2\nLine 3" --count=4 --platform=tiktok
```
