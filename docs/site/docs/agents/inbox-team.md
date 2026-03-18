# Inbox Zero Agent Team

> Pipeline: Sequential email processing from triage through archive recommendations

## Overview

The Inbox Zero agent team transforms your email inbox from a wall of unread messages into a structured, prioritized action plan. Four specialized agents process your email in sequence -- each one building on the previous agent's output -- so that by the end of the pipeline, every email is categorized, action items are extracted into Notion, draft responses are written, and archive-safe messages are flagged for cleanup.

By default, `/founder-os:inbox:triage` runs in single-agent mode: a fast, lightweight pass that categorizes and prioritizes your inbox. When you add the `--team` flag, the full four-agent pipeline activates, giving you action extraction, response drafting, labeling, and archive recommendations on top of triage. Use single-agent mode for a quick morning scan; use `--team` when you want to process your inbox end-to-end and walk away with a clean slate.

The pipeline is strictly sequential. Each agent's output feeds directly into the next agent's input as structured JSON. If any step fails, the pipeline halts -- partial results from upstream agents are preserved, but downstream agents do not run.

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| triage-agent | Step 1 | Fetches unread emails via `gws` CLI, classifies each into one of 5 categories (action_required, waiting_on, fyi, newsletter, promotions), assigns Eisenhower-matrix priority scores (1-5), and sets `needs_response` and `archivable` flags |
| action-agent | Step 2 | Filters for actionable emails, extracts structured action items with verb-first titles, creates Notion tasks in the "[FOS] Tasks" database with Type="Email Task", and links to CRM contacts/companies when matched |
| response-agent | Step 3 | Drafts contextual email replies for all `needs_response` emails, matches sender tone, assigns confidence scores, and saves drafts to Notion "[FOS] Content" database (not directly to Gmail) for human review |
| archive-agent | Step 4 | Applies Gmail labels based on triage categories, determines archive eligibility, produces archive recommendations (never auto-archives), compiles the final pipeline report with a `needs_attention` list of high-priority items |

## Data Flow

```
Unread Emails → [Triage: categorize + prioritize] → [Action: extract tasks → Notion]
             → [Response: draft replies → Notion] → [Archive: label + recommend + report]
```

Each agent passes through the complete email dataset plus its own enrichments. The triage-agent's categorized list flows into the action-agent, which adds an `action_items` array. The response-agent receives both and adds a `drafts` array. The archive-agent receives everything and produces the final pipeline report with archive recommendations and the `needs_attention` summary.

## When to Use --team

Use the full pipeline when you want a comprehensive inbox processing session -- typically once or twice a day. Specific scenarios where `--team` shines:

- **Morning inbox zero ritual.** You have 50-200 unread emails and want every one categorized, tasks created, replies drafted, and low-priority messages flagged for archiving.
- **Post-travel catch-up.** You've been offline for a few days. Run `--team --hours=72 --max=200` to process everything that accumulated.
- **End-of-day wrap-up.** Before signing off, process the afternoon's emails so you start the next day clean.

Skip `--team` when you just need a quick priority check -- the default single-agent triage gives you a categorized view in seconds without creating tasks or drafting replies.

## Example

```
/founder-os:inbox:triage --team --hours=24
```

Here is what happens step by step:

1. **Triage agent** fetches the last 24 hours of unread email via `gws gmail`, categorizes 87 emails into 5 buckets (12 action_required, 8 waiting_on, 23 fyi, 15 newsletter, 29 promotions), assigns priority scores, and flags 10 as needing a response.
2. **Action agent** filters to the 12 action_required emails plus any others marked `needs_response`. It extracts 15 action items, checks Notion for duplicates (skips 2), and creates 13 new tasks in "[FOS] Tasks" with source email links. Where sender domains match CRM companies, it populates the Company relation.
3. **Response agent** drafts replies for the 10 emails flagged `needs_response`. Each draft is tone-matched to the sender, given a confidence score, and saved to Notion "[FOS] Content" with status "To Review." Two low-confidence drafts are flagged for manual attention.
4. **Archive agent** applies Gmail labels to all 87 emails (Action Required, Waiting On, FYI, Newsletter, Promotions). It recommends 44 emails for archiving (all promotions and newsletters) while keeping action_required, waiting_on, and VIP sender emails in the inbox. The final report surfaces 5 high-priority items in the `needs_attention` list.

You review the drafts in Notion, approve or edit them, then run `/founder-os:inbox:drafts-approved` to push approved drafts to Gmail.

## Related

- [Inbox Commands](../commands/inbox.md) -- command reference for triage and drafts-approved
