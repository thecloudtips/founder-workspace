# Actions

> Extract structured action items from text or files and create Notion tasks automatically.

## Overview

The Actions namespace turns unstructured text into structured, trackable tasks. Paste meeting notes, email threads, or project documents, and it identifies every action item -- who owns it, when it's due, and how urgent it is. Each extracted item is created as a task in your **[FOS] Tasks** database with `Type = "Action Item"` and `Source Plugin = "Action Extractor"`.

The extraction engine uses a three-pass scan: first for direct requests ("please send," "can you prepare"), then for implicit actions ("we need to," "the next step is"), and finally for commitment language ("I'll handle," "let me take care of"). It infers owners from names mentioned in context, parses natural-language deadlines ("by Friday," "end of Q1," "ASAP"), and scores priority on a 1-5 scale. Duplicate detection compares against tasks created in the last 14 days using verb-and-noun matching so you don't end up with duplicate entries from re-processing the same notes.

The namespace provides two commands: `extract` for pasted text directly in the chat, and `extract-file` for reading a file from disk. Both use the same extraction logic and Notion integration.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Optional | Create tasks in [FOS] Tasks, duplicate detection |

When Notion is unavailable, extracted action items are displayed as structured text in chat instead. No data is lost -- you just need to create the tasks manually.

## Commands

### `/founder-os:actions:extract`

**What it does** -- Analyzes pasted text (meeting transcripts, email threads, project documents, or any unstructured content), identifies action items using verb pattern scanning, infers owners and deadlines, assigns priority scores, checks for duplicates in your Notion task database, and creates new tasks for each unique item.

**Usage:**
```
/founder-os:actions:extract Meeting notes from standup: John will review the API spec by Friday. Sarah to update the deployment docs. AI: Schedule follow-up meeting for next week.

/founder-os:actions:extract From: alice@example.com Subject: Q4 Planning Hi team, please review the attached budget by EOD Thursday. Bob, can you prepare the slide deck for Monday's presentation?

/founder-os:actions:extract Next steps from project kickoff: 1. Draft project charter - Mike, by Jan 15 2. Set up development environment - Dev team, this week 3. Schedule stakeholder interviews - PM, ASAP
```

**Example scenario:**
> You just finished a client strategy call and have a page of rough notes. You paste them into `/founder-os:actions:extract` and it identifies 5 action items: two for you (send revised proposal by Friday, schedule a follow-up call), two for your designer (prepare mockups, update brand guidelines), and one shared item (finalize pricing tier). Each becomes a Notion task with the correct owner, deadline, and priority. Two items match existing tasks from last week's notes and are flagged as duplicates.

**What you get back:**

A summary table showing each extracted action item with: title (verb-first), owner, deadline, priority score (1-5), and status (Created or Duplicate). Includes the source title and type detection (meeting transcript, email, document), total items found, and counts for new vs. duplicate tasks. Each created task includes a link to its Notion page.

**Flags:**

This command takes no flags. The text to process is provided directly as the argument.

---

### `/founder-os:actions:extract-file`

**What it does** -- Reads a file from disk (meeting transcript, email export, or any plain text document), applies the same action item extraction logic as `extract`, and creates Notion tasks for each identified item. Supports `.txt`, `.md`, `.csv`, `.log`, and other plain text formats. If no file path is provided, it offers to search the current directory for common transcript and notes files.

**Usage:**
```
/founder-os:actions:extract-file meeting-notes-2026-03-18.md
/founder-os:actions:extract-file ~/Documents/transcripts/standup-recap.txt
/founder-os:actions:extract-file ./project-kickoff-notes.md
/founder-os:actions:extract-file
```

**Example scenario:**
> Your meeting intelligence tool saved a transcript to `~/transcripts/board-meeting-2026-03-18.md`. You run `/founder-os:actions:extract-file ~/transcripts/board-meeting-2026-03-18.md` and it reads the 4-page transcript, identifies 8 action items spread across the discussion, infers owners from speaker labels, and creates all 8 as Notion tasks. The source title is pulled from the transcript's header and each task is tagged with `Source Type = "meeting transcript"`.

**What you get back:**

The same structured summary as `extract`, plus the file path in the output header. If no file path is provided, an interactive file picker showing matching files in the current directory.

**Flags:**

This command takes no flags. The file path is provided as a positional argument.

---

## Tips & Patterns

- **Post-meeting capture**: Immediately after a meeting, paste your notes into `/founder-os:actions:extract` while the context is fresh. The extraction engine handles rough, informal notes.
- **Batch from transcripts**: If you use meeting recording tools, run `/founder-os:actions:extract-file` on the transcript file to capture everything discussed.
- **Pair with inbox triage**: The inbox team pipeline extracts email-based actions internally, but for forwarded email threads you want to process manually, paste them into `extract`.
- **Connect to meeting prep**: Action items extracted here are stored in [FOS] Tasks. When you next prepare for a meeting with the same attendees, `/founder-os:prep:prep` will surface those open items under "You owe" or "Owed to you."
- **Re-run safely**: Duplicate detection prevents double-creation. If you're unsure whether you already processed a set of notes, run it again -- duplicates will be flagged, not recreated.

## Related Namespaces

- [Inbox](./inbox.md) -- The inbox team pipeline has its own action extraction for email-sourced tasks; this namespace handles all other text sources
- [Prep](./prep.md) -- Meeting prep surfaces open action items from [FOS] Tasks, including items created by this namespace
- [Briefing](./briefing.md) -- Your daily briefing's task section shows items due today, including action items created here
- [Review](./review.md) -- Weekly review tracks completed action items as "wins" and flags stagnant ones as blockers
