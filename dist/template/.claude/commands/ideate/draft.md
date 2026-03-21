---
description: Generate raw content from a topic with framework selection, audience targeting, and founder voice
argument-hint: "[topic] [--platform=linkedin|x|meta|tiktok] [--audience=founder|technical|marketer|cxo] [--framework=story|listicle|contrarian|howto|lesson|insight|question] [--length=short|medium|long] [--to-file=PATH]"
allowed-tools: ["Read", "Write"]
execution-mode: background
result-format: summary
---

# /founder-os:ideate:draft

Generate a raw content draft from a topic in one pass. This command executes the full ideation-to-output pipeline without stopping for user input between phases. Output is a platform-agnostic content brief ready for formatting via `/social:compose`.

## Load All Skills

Read all skills before starting any phase:

1. `skills/ideate/content-writing/SKILL.md`
2. `skills/ideate/hook-creation/SKILL.md`
3. `skills/ideate/founder-voice/SKILL.md`
4. `../../../.founderOS/infrastructure/humanize-content/SKILL.md`
5. `../../../.founderOS/infrastructure/humanize-content/references/linkedin-humanization.md`

Apply content-writing for structure and formatting rules, hook-creation for the opening lines, and founder-voice for tone throughout the draft. Apply humanize-content for natural-sounding prose. The `--tone` flag selects the humanization tone preset (default: Professional).

## Parse Arguments

Extract the topic and flags from `$ARGUMENTS`:

- **topic** (required) — all text before any `--` flags. This is the content subject. If no topic is provided, prompt the user: "What topic should the content cover?" Then stop and wait for input.
- `--platform=linkedin|x|meta|tiktok` (optional) — target platform hint. Default: `linkedin`. Used for framework selection guidance and length awareness but does not apply platform-specific formatting.
- `--audience=founder|technical|marketer|cxo` (optional) — target reader segment. Default: `founder`.
- `--framework=story|listicle|contrarian|howto|lesson|insight|question` (optional) — content structure framework. Default: `auto` (auto-select based on topic analysis).
- `--length=short|medium|long` (optional) — content length mode. Default: `medium`.
- `--to-file=PATH` (optional) — file path for saving the draft. If not specified, output is displayed in chat only (no file is saved).
- `--tone=professional|friendly|casual|authoritative|conversational` (optional) — humanization tone preset. Controls formality, warmth, and sentence rhythm. Default: `professional`.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
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
- Command: `ideate-draft`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'ideate' OR plugin IS NULL) AND (command = 'ideate-draft' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Phase 1 — Ideation

Display: **"Phase 1/3: Planning content..."**

1. **Framework selection**: If `--framework=auto` or not specified, analyze the topic and select the best framework using the content-writing skill's framework selection logic. Consider topic type, audience, and content shape:
   - Personal experience or journey → `story`
   - Tips, steps, or enumerable items → `listicle`
   - Challenging conventional wisdom → `contrarian`
   - Teaching a process → `howto`
   - Reflection on a mistake or win → `lesson`
   - Industry observation or trend → `insight`
   - Provoking discussion → `question`

   Consider platform when selecting framework — TikTok favors pattern-interrupt, X favors contrarian, Meta favors story.

   Display the selected framework and the reasoning in one sentence.

2. **Hook generation**: Using the hook-creation skill, generate 3 candidate hooks for the topic and selected framework. Each hook must be distinct in approach (e.g., stat-led, bold claim, question, micro-story). Select the strongest one based on scroll-stopping power and relevance. Show all 3 candidates and mark the selected one.

3. **Key points**: Identify 3-5 key points or beats for the content body based on the topic and framework. Each point should be a single clear idea that supports the hook's promise. List them in the order they will appear.

4. **Audience calibration**: Note specific adjustments for the target audience:
   - **founder**: Practical, ROI-focused, time-saving angle, "fellow builder" tone
   - **technical**: Specific, evidence-based, implementation details, avoid fluff
   - **marketer**: Growth metrics, campaign angles, channel strategy, trend awareness
   - **cxo**: Strategic, high-level impact, decision frameworks, industry positioning

   Display the audience and 2-3 calibration notes that will shape the draft.

### Ideation Output

Display the plan:

```
## Phase 1 Complete: Content Plan

- **Topic**: [topic]
- **Framework**: [selected] — [one-sentence reasoning]
- **Audience**: [segment]
- **Platform hint**: [platform]
- **Length**: [mode]

### Hook Candidates
1. [hook text] ← selected
2. [hook text]
3. [hook text]

### Key Points
1. [point]
2. [point]
3. [point]
[...]

### Audience Calibration
- [adjustment 1]
- [adjustment 2]
- [adjustment 3]
```

Display: **"Plan ready. Writing draft..."**

## Phase 2 — Draft

Display: **"Phase 2/3: Writing draft in founder voice..."**

1. **Write the full content draft**:

   - **Hook**: Open with the selected hook from Phase 1. The hook must be the first 1-3 lines and must work as a standalone scroll-stopper.
   - **Body**: Apply the selected framework's structure:
     - `story`: Setup → Tension → Turning point → Resolution → Takeaway
     - `listicle`: Brief intro → Numbered items (each 1-2 sentences) → Wrap-up
     - `contrarian`: Bold claim → Evidence against conventional wisdom → Reframe → New perspective
     - `howto`: Problem statement → Step-by-step → Result/proof
     - `lesson`: Context → What happened → What I learned → Why it matters
     - `insight`: Observation → Supporting evidence → Implication → What to do about it
     - `question`: Provocative question → Context → Multiple angles → Invite responses
   - **Formatting**: Write clean, structured prose:
     - Line break after every 1-2 sentences
     - One idea per visual block
     - Short paragraphs (1-3 lines max)
     - Use white space aggressively for scannability
     - No markdown rendering (no bold, no headers, no bullet symbols) — write as plain text
   - **Voice**: Apply founder-voice skill throughout:
     - Professional but conversational
     - Opinionated — take a clear stance
     - Short-long sentence alternation for rhythm
     - First person where natural
     - Concrete examples over abstract advice
   - **Closer**: End with one of these matched to audience:
     - **CTA** (marketer/cxo): Direct ask — "DM me if...", "Try this today..."
     - **Engagement prompt** (founder): Question that invites comments — "What's your take?", "Has anyone else experienced this?"
     - **Summary line** (technical): Crisp takeaway that stands alone
   - **Platform-aware length guidance**: Consider the target platform's typical content length expectations but do not enforce hard character limits. The raw draft prioritizes completeness — platform-specific trimming happens at the compose stage.

## Phase 3 — Validate and Output

Display: **"Phase 3/3: Validating and packaging..."**

1. **Run quality checklist** from the content-writing skill. Check every item against the draft. If any item fails, fix it before outputting. Do not show the checklist to the user — just fix silently and move on.

2. **Character count**: Count total characters including line breaks. Confirm the draft is within a reasonable range for the selected length mode.

3. **Display the content brief**: Show the complete output in chat:

```
## Content Brief

- **Topic**: [topic]
- **Framework**: [selected framework]
- **Audience**: [target segment]
- **Platform hint**: [platform]
- **Length**: [mode] ([character count] characters)

### Hook Candidates
1. [hook] ← selected
2. [hook]
3. [hook]

### Content

[Raw content body in founder voice — structured by framework but not platform-formatted]

---
Next step: Run /social:compose "..." --platform=<platform> to format and publish.
```

4. **Save to file** (only if `--to-file` is specified): Write the draft to the specified path. Create the parent directory if it does not exist. The saved file must include a YAML frontmatter header:

```yaml
---
topic: "[topic]"
framework: "[selected framework]"
audience: "[target audience]"
platform: "[platform]"
length: "[mode]"
character_count: [count]
generated_at: "[YYYY-MM-DDTHH:MM:SS]"
---
```

The content body follows the frontmatter, formatted identically to the chat output.

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
/founder-os:ideate:draft "why I stopped using OKRs"
/founder-os:ideate:draft "hiring your first engineer" --audience=founder --framework=story
/founder-os:ideate:draft "AI tools for small teams" --platform=x --length=long
/founder-os:ideate:draft "cold email tips" --framework=listicle --audience=marketer --to-file=drafts/cold-email.md
/founder-os:ideate:draft "the future of remote work" --audience=cxo --framework=insight --platform=tiktok --length=long
```
