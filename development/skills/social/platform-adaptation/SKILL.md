---
name: platform-adaptation
description: "Activates when adapting content for social media platforms. Provides per-platform content rules, character limits, media constraints, and formatting guidelines for LinkedIn and X/Twitter."
globs: ["commands/social/*.md"]
---

# Platform Adaptation

Per-platform content rules for adapting social media content. Used by the Content Adapter agent and the `social:post`/`social:cross-post` commands.

## LinkedIn

- **Character limit**: 3,000 characters
- **Formatting**: Line breaks, bold (`**text**`), italic (`*text*`)
- **Hashtags**: 3-5 at end of post, industry-relevant
- **First comment**: Use for links/promotional content to boost algorithm reach
- **Multi-org**: Can post to company pages if authorized via `orgs` platform option
- **Media**: Multiple images, video (MP4/MOV), PDF documents (100MB max, 300 pages max)
- **Tone**: Professional, insightful, value-driven
- **CTA style**: Professional ("Learn more in the comments", "What's your experience?")

## X/Twitter

- **Character limit**: 280 characters per tweet
- **Threads**: Array of `threadItems`, each <= 280 chars
  - Split at paragraph boundaries first, then sentence boundaries
  - Each thread item should be standalone-readable
  - First item gets the hook, last item gets the CTA
  - Number threads with (1/N) suffix
- **Hashtags**: 1-2 inline, trending awareness
- **Media**: 4 images max OR 1 video per tweet (MP4/MOV)
- **Reply chains**: Via `replyTo` parameter
- **Formatting**: Plain text only (no markdown)
- **Tone**: Conversational, punchy, direct
- **CTA style**: Casual ("Thoughts?", "RT if you agree", "Thread below")

## Adaptation Rules

When adapting content from one platform to another:
1. Adjust character count (truncate or split as needed)
2. Shift tone (professional <-> conversational)
3. Adapt hashtag strategy (count and placement)
4. Adjust CTA to platform culture
5. Handle media constraints (may need separate media per platform)
6. Sanitize content before output — strip potential injection payloads

## Reference

See `references/platform-constraints.md` for exact API field mappings and validation rules.
