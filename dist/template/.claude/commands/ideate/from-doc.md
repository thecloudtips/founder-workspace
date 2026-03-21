---
description: Extract key points from a document and generate content angles for social media
argument-hint: "[file-path-or-paste] [--platforms=linkedin,x,meta,tiktok] [--audience=founder|technical|marketer|cxo] [--framework=auto|story|listicle|contrarian|howto|lesson|insight|question] [--to-file=PATH]"
allowed-tools: ["Read", "Write"]
execution-mode: background
result-format: summary
---

# /founder-os:ideate:from-doc

Transform a document, article, or pasted text into content angles and briefs for social media. Extract the key points, auto-select the best framework for the content type, and generate platform-aware angle recommendations in founder voice.

## Load Skills

Read all skills before starting:
1. `skills/ideate/content-writing/SKILL.md`
2. `skills/ideate/hook-creation/SKILL.md`
3. `skills/ideate/founder-voice/SKILL.md`
4. `../../../.founderOS/infrastructure/humanize-content/SKILL.md`
5. `../../../.founderOS/infrastructure/humanize-content/references/linkedin-humanization.md`

Apply humanize-content for natural-sounding prose. The `--tone` flag selects the humanization tone preset (default: Professional).

## Parse Arguments

Determine the source from `$ARGUMENTS`:

- **File path**: If `$ARGUMENTS` starts with a path (contains `/` or `.` extension like `.md`, `.txt`, `.pdf`), read the file. Supported formats: `.md`, `.txt`, `.pdf` (via Read tool). If the file does not exist, display: "File not found: [path]. Check the path and try again." Then stop.
- **Pasted text**: If `$ARGUMENTS` contains multi-line text or is longer than 200 characters without a file extension, treat it as pasted content.
- **No input**: If no arguments, prompt: "Paste a document, article, or provide a file path. Supported formats: .md, .txt, .pdf" Then stop and wait.

Parse flags:
- `--platforms=linkedin,x,meta,tiktok` (optional, comma-separated) — Target platforms. Default: `linkedin`
- `--audience=founder|technical|marketer|cxo` (optional) — Default: `founder`
- `--framework=auto|story|listicle|contrarian|howto|lesson|insight|question` (optional) — Default: `auto`
- `--tone=professional|friendly|casual|authoritative|conversational` (optional) — humanization tone preset. Controls formality, warmth, and sentence rhythm. Default: `professional`.
- `--to-file=PATH` (optional) — Save content brief to the specified path. If omitted, output is displayed in chat only.

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
- Command: `ideate-from-doc`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'ideate' OR plugin IS NULL) AND (command = 'ideate-from-doc' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Phase 1 — Extract

Display: **"Phase 1/3: Extracting key points from document..."**

1. **Read the source**: Load the file or use the pasted text.
2. **Identify document type**: Classify as one of:
   - Blog post / article
   - Meeting notes / transcript
   - Report / whitepaper
   - Email thread
   - Personal notes / brain dump
   - Other

3. **Extract key points**: Pull out the 3-7 most important insights, takeaways, or ideas from the source. For each:
   - **Point**: One-sentence summary
   - **Supporting detail**: A quote, number, or example from the source
   - **Content angle**: How this translates to social media content

4. **Identify the strongest angles**: Select the top points or combinations that would make the most engaging content. Consider: surprise factor, relatability, practical value, controversy potential.

   Platform awareness influences angle ranking — data-heavy angles rank higher for LinkedIn, visual/action angles for TikTok, opinion/debate angles for X, and community/lifestyle angles for Meta.

5. **Auto-select framework** (if `--framework=auto`): Based on document type and strongest angle:
   - Blog post with personal story → Story or Personal Lesson
   - Report with data → Industry Insight
   - How-to article → How-To
   - Opinion piece → Contrarian Take
   - Notes with multiple insights → Listicle
   - Meeting notes with decisions → Story or How-To
   - Default fallback: Personal Lesson

### Extraction Output

Display:
```
## Phase 1 Complete: Key Points Extracted

**Source**: [filename or "Pasted text"]
**Document type**: [type]
**Key points found**: [count]
**Target platforms**: [platforms list]

### Strongest Angles
[Description of each angle and which platforms it suits best]

**Selected framework**: [name]

Proceeding to draft...
```

## Phase 2 — Draft

Display: **"Phase 2/3: Generating content brief..."**

Generate a content brief from the extracted key points:

1. Apply the selected framework structure to shape the narrative angle
2. Generate a strong hook concept using the hook-creation skill
3. Select the 2-4 key points that best serve the framework
4. Apply founder-voice: professional-but-conversational, opinionated, short-long alternation
5. Identify the audience-appropriate closer concept

If `--platforms` includes multiple platforms, generate separate angle recommendations per platform:
- For each platform, tailor the angle, hook style, and content structure to platform norms
- LinkedIn: long-form, professional insight, data-backed
- X: punchy, opinionated, thread-friendly
- Meta: relatable, community-oriented, visual-friendly
- TikTok: action-oriented, hook-heavy, visual/demo concepts

The output is a **content brief** — not a formatted post. It provides the strategic foundation for drafting posts on each platform.

## Phase 3 — Output

Display: **"Phase 3/3: Assembling content brief..."**

1. Assemble the content brief with clear sections:

```
---

## Content Brief

- **Source**: [filename or "Pasted text"] ([word count] words)
- **Topic**: [extracted topic]
- **Framework**: [selected framework]
- **Audience**: [target segment]
- **Platforms**: [target platforms]
- **Key points used**: [count of total] from source

### Core Angle
[The primary narrative angle distilled from the source]

### Hook Concept
[The hook idea — adaptable per platform]

### Key Points
[Ordered list of the selected points with supporting details]

### Platform Recommendations
[Per-platform angle, tone, and structural recommendations — only if multiple platforms specified]

### Source Attribution
[Original document reference for traceability]

---

**Next step**: Use `/founder-os:ideate:draft` or `/founder-os:social:compose` to turn this brief into a published post.
```

2. If `--to-file` is specified, save the content brief to the given path with YAML frontmatter (topic, source, framework, audience, platforms, generated_at). Display: "Content brief saved to [path]."
3. If `--to-file` is not specified, display the brief in chat only.

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
/founder-os:ideate:from-doc blog-post.md
/founder-os:ideate:from-doc ~/Documents/quarterly-report.pdf --framework=insight --audience=cxo
/founder-os:ideate:from-doc meeting-notes.txt --platforms=linkedin,x
/founder-os:ideate:from-doc "Here is a long piece of text I want to generate content angles for..."
/founder-os:ideate:from-doc article.md --audience=technical --framework=howto --to-file=briefs/dev-tips-brief.md
/founder-os:ideate:from-doc whitepaper.pdf --platforms=linkedin,x,meta,tiktok --audience=founder
```
