# P07 Meeting Intelligence Hub — Design Document

**Date**: 2026-03-05
**Status**: Approved
**Plugin**: #07 | Pillar: Daily Work | Platform: Cowork | Type: Standalone

## Overview

Redesigned from "Voice Note Processor" (local Whisper transcription) to **Meeting Intelligence Hub** — a multi-source transcript/notes aggregator with intelligence extraction. Gathers transcripts from Fireflies, Notion, Otter.ai, Gemini (Google Drive), and local files, then extracts meeting summaries, key decisions, follow-up commitments, and topic tags.

**Key change**: No transcription — the plugin processes existing transcripts from services that already handle transcription.

## Chain Dependencies

- **Suggests**: #04 Action Item Extractor (formats transcript for `/actions:extract-file`)
- **Follow-ups feed**: #06 Follow-Up Tracker (compatible commitment format)
- **No hard dependencies**: Works standalone

## MCP Requirements

| Server | Purpose | Required |
|--------|---------|----------|
| Notion | Meeting notes source + intelligence output DB | Required |
| Filesystem | Read local transcript files | Required |
| Google Drive | Read Gemini meeting notes | Optional |
| Gmail | Email context enrichment for meetings | Optional |

**Dropped**: Whisper, Google Calendar, `scripts/whisper-setup.sh`

## Skills

### Skill 1: `source-gathering`

**Trigger**: "gather meeting notes", "pull transcripts", "import from Fireflies/Otter/Gemini"

**5 source adapters**:

1. **Fireflies.ai** — Read `.txt`/`.json` exports from local disk. Detect by "Fireflies.ai" header, speaker labels, timestamp format. Extract: transcript text, speaker list, meeting title, date, duration.

2. **Notion meeting notes** — Search Notion for pages matching meeting-note patterns (title contains "meeting", "notes", "sync", "standup"; or pages in a "Meeting Notes" database). Extract: page content, title, date, participants.

3. **Otter.ai** — Read `.txt`/`.srt` exports. Detect by "Otter.ai" footer or SRT subtitle format. Extract: transcript, speakers, timestamps.

4. **Gemini (Google Drive)** — Search Drive for docs with "Meeting notes" in title or auto-generated Gemini transcripts. Extract: content, attendees, date, meeting title.

5. **Generic local files** — Accept `.txt`, `.md`, `.srt`, `.vtt`. Auto-detect format (SRT/VTT → convert to plain text).

**Normalization**: All sources produce a unified structure:
- title, date, duration, attendees[], source_type, source_path, transcript_text (speaker-labeled, timestamped where available)

**Auto-detection**: When user provides a file without specifying source, detect from content patterns.

**Reference file**: `references/source-formats.md` — detailed format detection patterns per source.

### Skill 2: `meeting-analysis`

**Trigger**: "analyze meeting", "extract decisions", "summarize transcript", "meeting intelligence"

**4 extraction pipelines**:

1. **Meeting Summary** (3-5 sentences) — Main topics discussed, key participants and roles, outcome/conclusion/open questions.

2. **Key Decisions Log** — Detection patterns: "We decided...", "Agreement:", "Let's go with...", "The decision is...", "We'll...", "Going forward...". Output: decision text, proposer, context, confidence (Explicit/Inferred). Flag disagreements.

3. **Follow-Up Commitments** (feeds #06) — Detection: "I'll send...", "[Name] will...", "Can you...?", "By [date]...". Output: who, what, deadline (parsed), mentioned_by. Format compatible with #06's promise patterns.

4. **Topic Extraction** — Identify 3-7 topic tags via noun phrase extraction + frequency analysis. Map to existing Notion tags when possible.

**#04 note**: After analysis, suggest `/actions:extract-file` on the transcript, noting it's pre-formatted with speaker labels.

**Reference file**: `references/extraction-patterns.md` — decision/follow-up detection patterns.

## Commands

### `/meeting:intel [source-or-file]`

Full pipeline: gather + analyze + save.

**Arguments**:
- `[source-or-file]` — path to local file, or `--notion` to search Notion for recent meeting notes
- `--source=fireflies|otter|gemini|notion|auto` — hint source type (default: `auto`)
- `--date=YYYY-MM-DD` — filter for meetings on this date
- `--output=notion|chat|both` — where to send results (default: `both`)
- `--with-email` — search Gmail for related email threads to enrich context

**Workflow**:
1. Detect/gather source → produce NormalizedTranscript
2. Run 4 analysis pipelines
3. Save to Notion DB
4. Output formatted report to chat
5. Save normalized transcript to `transcripts/[meeting-slug]-[date].md`
6. Suggest: "Run `/actions:extract-file transcripts/[file]` for action items"

### `/meeting:analyze [text-or-file]`

Analysis only — user provides transcript, no source gathering.

**Arguments**:
- `[text-or-file]` — pasted text or file path
- `--output=notion|chat|both` — where to send results (default: `chat`)

**Workflow**:
1. Read/parse input (skip source detection)
2. Run 4 analysis pipelines
3. Output formatted report
4. Optionally save to Notion

## Notion Database

**"Meeting Intelligence Hub - Analyses"** (12 properties):

| Property | Type | Purpose |
|----------|------|---------|
| Meeting Title | title | Meeting name |
| Date | date | Meeting date |
| Source Type | select | Fireflies / Notion / Otter / Gemini / Local File |
| Source Path | rich_text | File path or Notion URL |
| Attendees | rich_text | Comma-separated participants |
| Summary | rich_text | 3-5 sentence summary |
| Decisions | rich_text | Formatted decisions list |
| Follow-Ups | rich_text | Who owes what by when |
| Topics | multi_select | Extracted topic tags |
| Duration | rich_text | Meeting length |
| Transcript File | rich_text | Path to saved transcript |
| Generated At | date | Timestamp |

**Idempotent**: Update by Meeting Title + Date match.
**Lazy creation**: DB created on first use.

## Directory Structure

```
founder-os-meeting-intelligence-hub/
├── .claude-plugin/
│   └── plugin.json
├── .mcp.json
├── commands/
│   ├── meeting-intel.md
│   └── meeting-analyze.md
├── skills/
│   ├── source-gathering/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── source-formats.md
│   └── meeting-analysis/
│       ├── SKILL.md
│       └── references/
│           └── extraction-patterns.md
├── tests/
│   └── integration-test-plan.md
├── README.md
├── INSTALL.md
└── QUICKSTART.md
```

## Universal Patterns Applied

- Lazy Notion DB creation
- `${CLAUDE_PLUGIN_ROOT}` for portable paths
- Graceful degradation (Drive/Gmail optional)
- Idempotent re-runs (update existing, don't duplicate)
- `allowed-tools: ["Read"]` in command frontmatter
- DB template JSON in `_infrastructure/notion-db-templates/`
