---
name: LinkedIn Humanization Rules
description: "LinkedIn-specific humanization rules for the humanize-content skill. Covers hook preservation, 3K character limit enforcement, whitespace patterns, and LinkedIn algorithm optimization."
---

## Hook Preservation

The first two lines of a LinkedIn post are the hook, typically written by the hook-creation skill. During Phase B validation and rewriting, the hook is off-limits. Never modify hook content — not for burstiness, not for vocabulary diversity, not for sentence length normalization. Rewrites begin from line 3 onward.

## Character Limit

LinkedIn enforces a 3,000 character hard limit on posts. After any Phase B rewrites, re-check the total character count. If the rewritten post exceeds 3,000 characters, trim from the least-critical paragraph — never the hook (lines 1-2) and never the CTA. Least-critical is typically the paragraph with the most redundancy or the loosest connection to the core idea.

## Whitespace Patterns

LinkedIn rewards visual spacing. Single-line paragraphs mixed with 2-3 sentence blocks perform better than dense walls of text. Apply generous line breaks between sections. Each distinct idea should have breathing room above and below it. Paragraphs longer than 3 sentences should be split unless they are tightly sequential steps.

## Burstiness Target

Very high burstiness. LinkedIn is a feed-scroll environment — rhythm variation is essential for retaining attention. Mix short punchy lines (3-7 words) with explanation sentences (15-25 words). Avoid runs of similarly-lengthed sentences. After Phase B rewrites, verify that sentence length standard deviation is > 5 words across the post body (excluding hook and hashtags).

## Emoji Handling

Emoji behavior is controlled by the `--emojis` flag on the humanize-content command invocation:

- If `--emojis` is enabled, the humanizer does not remove existing emojis during validation or rewriting.
- If `--emojis` is not enabled, the humanizer does not add emojis during rewriting.

The humanizer never makes emoji decisions on its own. It respects whatever the source content and command flags dictate.

## Hashtag Rules

Do not humanize hashtag lines. Hashtag blocks at the end of a LinkedIn post are functional, not prose. Leave them completely untouched during all phases of humanization — Phase A detection and Phase B rewriting both skip hashtag blocks. A hashtag block is any line or group of consecutive lines where the majority of tokens are hashtags.
