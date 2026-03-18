# Meeting Intelligence

> Turn meeting transcripts from any source into structured intelligence -- summaries, decisions, follow-up commitments, and topic tags -- in minutes instead of hours.

## Overview

The Meeting Intelligence namespace processes meeting transcripts through four independent extraction pipelines: summary generation, key decisions logging, follow-up commitment detection, and topic tagging. Whether your transcript comes from Fireflies.ai, Otter.ai, Google Gemini, a Notion page, or a plain text file you typed yourself, the system normalizes it into a common format and runs the full analysis.

The namespace offers two commands at different levels of automation. The `analyze` command is a lightweight path for when you already have transcript text -- paste it or point to a file, and get the analysis in chat. The `intel` command runs the full pipeline: source detection, transcript normalization, optional email enrichment from Gmail, analysis across all four pipelines, local transcript archiving, and Notion storage. Both commands produce the same four-section intelligence report.

Meeting Intelligence connects to **Notion** (for saving analysis to the **[FOS] Meetings** database), **Filesystem** (for reading local transcript files), **Google Drive** (optional, for Gemini transcript discovery), and **Gmail** (optional, for email context enrichment). The only hard requirement is having a transcript to analyze -- everything else degrades gracefully.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Filesystem MCP | Yes | Read local transcript files (.txt, .md, .json, .srt, .vtt) |
| Notion CLI | No | Save analysis results to [FOS] Meetings database |
| gws CLI (Drive) | No | Search for Gemini-generated meeting transcripts |
| gws CLI (Gmail) | No | Enrich analysis with related email threads (pre-meeting agendas, follow-ups) |

## Commands

### `/founder-os:meeting:analyze`

**What it does** -- Runs the four extraction pipelines (summary, decisions, follow-ups, topics) on a transcript you provide directly. This is the fast path -- no source detection, no Notion search, no email enrichment. Provide a file path or paste the text, and get the analysis in chat.

**Usage:**

```
/founder-os:meeting:analyze [path/to/transcript.txt] [--output=notion|chat|both]
```

**Example scenario:**

> You just finished a client call and jotted down notes in a markdown file. You run `/founder-os:meeting:analyze call-notes.md` and within seconds see a summary, two key decisions (one explicit, one inferred with a disagreement flag), three follow-up commitments with parsed deadlines, and five topic tags. The commitments are formatted for direct compatibility with the Follow-Up Tracker.

**What you get back:**

A structured Meeting Analysis Report in chat showing: meeting title, date, source type, and attendees at the top, followed by a 3-5 sentence summary, a decisions table with proposer and confidence level, a follow-up commitments table with owner, action, and deadline, and extracted topic tags. If Notion output is enabled, a link to the saved record.

**Flags:**

- `--output=notion|chat|both` -- Where to send results (default: `chat`)

---

### `/founder-os:meeting:intel`

**What it does** -- Runs the full meeting intelligence pipeline: detects and gathers the transcript from any supported source (local file, Notion page, or Google Drive), normalizes it, optionally enriches with related Gmail threads, runs all four analysis pipelines, saves the normalized transcript locally, and writes results to Notion. This is the comprehensive path for complete meeting processing.

**Usage:**

```
/founder-os:meeting:intel [source-or-file] [--source=fireflies|otter|gemini|notion|auto] [--date=YYYY-MM-DD] [--output=notion|chat|both] [--with-email]
```

**Example scenario:**

> After a weekly team sync recorded on Fireflies, you export the transcript as a JSON file and run `/founder-os:meeting:intel weekly-sync.json --with-email`. The system auto-detects the Fireflies format, normalizes speaker labels and timestamps, pulls in a pre-meeting agenda email from Gmail, and produces a full intelligence report. It saves the normalized transcript to `transcripts/weekly-sync-2026-03-19.md`, updates the [FOS] Meetings database in Notion (preserving any prep notes from Meeting Prep Autopilot), and displays the report in chat.

**What you get back:**

A comprehensive Meeting Intelligence Report with meeting metadata (title, date, duration, source, attendees), summary, decisions log, follow-up commitments, topic tags, and file locations. The normalized transcript is saved locally for archival. Notion records are created or updated idempotently using the Event ID or Meeting Title + Date as the lookup key.

**Flags:**

- `--source=fireflies|otter|gemini|notion|auto` -- Hint the source format for parsing (default: `auto`)
- `--date=YYYY-MM-DD` -- Filter to meetings on a specific date (useful with `--notion` or Gemini sources)
- `--output=notion|chat|both` -- Where to send results (default: `both`)
- `--with-email` -- Search Gmail for related email threads to enrich the analysis context

---

## Tips & Patterns

**Let auto-detection work for you.** The `intel` command recognizes Fireflies, Otter, SRT, VTT, and generic text formats automatically by scanning content signatures. You rarely need to specify `--source` unless the transcript is ambiguous.

**Use `analyze` for quick reads, `intel` for the full pipeline.** If you just need a summary and action items from a transcript you already have, `analyze` is faster and outputs to chat by default. Use `intel` when you want persistent Notion storage, local transcript archival, and optional email enrichment.

**Supported transcript formats are broad.** Local files can be `.txt`, `.md`, `.json` (Fireflies export), `.srt` (subtitles), or `.vtt` (WebVTT with voice tags). The system handles speaker label normalization, timestamp conversion, and date parsing across all formats.

**Email enrichment adds context you would otherwise miss.** The `--with-email` flag searches Gmail for threads related to the meeting (by title, attendee names, and date range). Pre-meeting agendas, follow-up emails, and shared materials are factored into all four analysis pipelines, surfacing decisions and commitments made asynchronously outside the meeting itself.

**Decisions are tracked at two confidence levels.** Explicit decisions (someone said "we decided to...") are logged with high confidence. Inferred decisions (a proposal received no objection and the group moved on) are flagged as inferred so you can verify them. Disagreements within three speaker turns of a decision are captured with the dissenting position preserved.

**Follow-up commitments are cross-plugin compatible.** Every commitment extracted from a meeting transcript is formatted to match the Follow-Up Tracker's promise pattern structure. This means deadlines like "by end of week" are parsed to ISO dates, and self-assignments vs. delegations are distinguished as "Promise Made" vs. "Promise Received."

**Notion records respect shared ownership.** The [FOS] Meetings database is shared between Meeting Intel (analysis) and Meeting Prep Autopilot (pre-meeting prep). When both have touched the same meeting, intel updates only its own fields and never overwrites prep notes, talking points, or importance scores.

## Related Namespaces

- **[Follow-Up Tracker](/commands/followup)** -- Commitments extracted from meetings feed directly into follow-up tracking and nudge workflows
- **[Action Items](/commands/actions)** -- Run `/founder-os:actions:extract-file` on a saved transcript for deeper action item extraction with priority scoring
- **[Daily Briefing](/commands/briefing)** -- Morning briefings pull from today's calendar; meeting intel fills in what actually happened
