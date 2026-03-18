# Inbox

> AI-powered email triage, categorization, and draft management for Gmail.

## Overview

The Inbox namespace is your frontline defense against email overload. It connects to Gmail via the `gws` CLI tool, scans your unread messages, and categorizes each one using an Eisenhower matrix-based priority system. The result is a structured summary that tells you exactly which emails need your attention and which can be archived.

In its default mode, Inbox delivers a fast single-agent triage summary -- category counts, top urgent emails, and archive candidates. When you activate team mode with `--team`, a full 4-agent pipeline takes over: a Triage Agent categorizes, an Action Agent creates Notion tasks, a Response Agent drafts replies, and an Archive Agent flags low-priority messages for cleanup. The pipeline writes action items to the **[FOS] Tasks** database (with `Type = "Email Task"`) and drafts to the **[FOS] Content** database (with `Type = "Email Draft"`).

Inbox also includes a companion command for pushing approved drafts back to Gmail. Once you review AI-generated drafts in Notion and mark them "Approved," the `drafts-approved` command creates real Gmail drafts ready for you to review and send.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| gws CLI (Gmail) | Yes | Fetch unread emails, create Gmail drafts |
| Notion CLI | Optional | Write tasks to [FOS] Tasks, drafts to [FOS] Content (team mode) |

## Commands

### `/founder-os:inbox:triage`

**What it does** -- Scans your Gmail inbox for unread emails within a configurable time window, categorizes each message (action required, waiting on, FYI, newsletter, promotions), and assigns a 1-5 priority score using the Eisenhower matrix. In team mode, it also extracts action items, drafts replies, and recommends archiving.

**Usage:**
```
/founder-os:inbox:triage
/founder-os:inbox:triage --hours=8
/founder-os:inbox:triage --max=50
/founder-os:inbox:triage --team
/founder-os:inbox:triage --team --hours=48
```

**Example scenario:**
> It's Monday morning and you have 87 unread emails from the weekend. You run `/founder-os:inbox:triage --team --hours=72` to process the full weekend backlog. The triage agent categorizes everything, the action agent creates 6 Notion tasks for items that need follow-up, the response agent drafts 4 replies for urgent threads, and the archive agent flags 44 newsletters and promotions for cleanup. You get a full pipeline report in under a minute.

**What you get back:**

In default mode, a structured summary with category counts, the top 5 most urgent emails (priority 4-5) with subject, sender, and recommended action, archive candidate count, and quick stats (total processed, needs response count).

In team mode, a full pipeline report with triage summary, action items created in Notion, drafts generated with confidence scores, archive recommendations, and a list of emails needing manual attention.

**Flags:**
- `--team` -- Activate the full 4-agent pipeline (Triage, Action, Response, Archive agents)
- `--hours=N` -- Hours to look back for unread emails (default: 24)
- `--max=N` -- Maximum number of emails to process (default: 100)

---

### `/founder-os:inbox:drafts-approved`

**What it does** -- Scans your Notion **[FOS] Content** database for email drafts with `Status = "Approved"` and `Type = "Email Draft"`, then creates corresponding Gmail drafts using the `gws` CLI. Each approved entry needs a recipient, subject, and body. On success, the Notion status updates to "Sent to Gmail"; on failure, it updates to "Error" with details.

**Usage:**
```
/founder-os:inbox:drafts-approved
```

**Example scenario:**
> After running `/founder-os:inbox:triage --team`, the Response Agent created 5 draft replies in Notion. You open the [FOS] Content database, tweak the wording on two of them, and mark all 5 as "Approved." Then you run `/founder-os:inbox:drafts-approved`. It creates 5 Gmail drafts, updates their Notion status, and reminds you to review and send from your Gmail Drafts folder.

**What you get back:**

A results table showing each draft with recipient, subject, and creation status (success or error with details). Includes a count of successfully created drafts and a reminder to review them in Gmail before sending.

**Flags:**

This command takes no flags. It processes all currently approved drafts.

---

## Tips & Patterns

- **Morning triage workflow**: Start your day with `/founder-os:inbox:triage --team` to process overnight emails, then run `/founder-os:briefing:briefing` to fold those results into your daily briefing.
- **Review-then-send loop**: After team triage creates drafts, review them in Notion, mark the good ones "Approved," then run `/founder-os:inbox:drafts-approved` to push them to Gmail.
- **Quick check vs. deep process**: Use default mode (no `--team`) for a fast scan when you just want to know what's waiting. Reserve `--team` for when you have time to process the full pipeline.
- **Combine with Follow-Up Tracker**: Action items created by the inbox pipeline can be tracked with `/founder-os:followup:check` to ensure nothing falls through the cracks.

## Related Namespaces

- [Briefing](./briefing.md) -- Folds email highlights into your daily briefing; the briefing's email section uses the same priority scoring
- [Actions](./actions.md) -- Extracts action items from pasted text; the inbox team pipeline uses a similar extraction process internally
- [Review](./review.md) -- Your weekly review includes email volume metrics and unanswered thread detection
- [Prep](./prep.md) -- Meeting prep searches email history with attendees, complementing inbox triage
