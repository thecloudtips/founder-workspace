---
name: Social Platform Humanization Rules
description: "Social media platform-specific humanization rules for the humanize-content skill. Covers short-form content relaxation, per-platform character limits, and cross-platform adaptation handling."
---

## Short-Form Relaxation

For posts under 100 words — such as X posts or short social updates — relax burstiness and vocabulary diversity checks. Short content naturally has less room for variation, and applying the same thresholds used for long-form content will produce false positives or force awkward rewrites. On posts under 100 words, only apply banned vocabulary detection. Skip sentence length standard deviation checks entirely.

## Platform Character Limits

Each platform enforces different character constraints. After any Phase B rewrites, re-check the post against the target platform limit:

- **X (Twitter)**: 280 characters for a single post. 25,000 characters per post within a thread.
- **LinkedIn**: 3,000 characters. See `linkedin-humanization.md` for additional LinkedIn-specific rules.
- **Other platforms**: apply constraints per Late.dev platform configuration if available.

If a rewrite causes the post to exceed the platform limit, trim from the least-critical sentence. Never trim @mentions, #hashtags, or URLs to fit within a limit.

## Thread Handling

For threaded content created with the `--thread` flag, apply humanization per-post within the thread — not across the entire thread as a single block. Each post in a thread is an independent unit with its own character limit and rhythm. Burstiness checks run on each post individually. Do not merge sentences across post boundaries during rewriting.

## Cross-Platform Adaptation

When `social:cross-post` adapts content for multiple platforms, humanization runs once on the source content before platform adaptation occurs. The sequence is:

1. Humanize the source post.
2. Pass the humanized source to `social:cross-post` for platform-specific adaptation.

Humanization does not run again after platform adaptation. If the adapted version introduces new AI-sounding patterns, that is a separate pass the user must trigger explicitly.

## Hashtag and Mention Preservation

Never modify @mentions or #hashtags during Phase A detection or Phase B rewriting. They are functional elements, not prose. A hashtag that appears to use banned vocabulary (e.g., `#GameChanger`) is still left untouched. An @mention is never paraphrased or reorganized. Both are excluded from all humanization checks.
