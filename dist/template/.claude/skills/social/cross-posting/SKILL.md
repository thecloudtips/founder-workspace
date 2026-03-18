---
name: cross-posting
description: "Activates when publishing content to multiple platforms. Provides adaptation strategies, tone shifting, and engagement patterns for multi-platform content."
globs: ["commands/social/cross-post.md", "commands/social/reply.md"]
---

# Cross-Posting Strategies

## Content Adaptation Pipeline

When publishing to multiple platforms from a single source:

1. **Detect content type**: Long-form article, short post, listicle, thread
2. **Per-platform adaptation**:
   - Adjust length to platform limits
   - Shift tone (LinkedIn: professional, X: conversational)
   - Adapt hashtag strategy
   - Adjust CTA to platform culture
   - Handle media constraints
3. **Preview all adaptations** side-by-side for user approval
4. **User can edit** individual variants inline before confirming
5. **Publish simultaneously** via Late.dev API
6. **Track with Cross-Post Group ID** (shared UUID in Content DB)

## Adaptation Patterns

### Long-Form to Thread
Content > 280 chars for X/Twitter:
- Split at paragraph boundaries first, then sentence boundaries
- Each thread item must be standalone-readable
- First item: hook (grab attention)
- Last item: CTA (drive action)
- Number with (1/N) suffix

### Tone Shifting
- **LinkedIn -> X**: Remove formal transitions, shorten sentences, add personality
- **X -> LinkedIn**: Expand points, add context, professional framing

### Hashtag Strategy
- **LinkedIn**: 3-5 targeted hashtags appended at end
- **X**: 1-2 inline hashtags, trending-aware

### CTA Adaptation
- **LinkedIn**: "Learn more in the comments", "What's your experience with this?"
- **X**: "Thoughts?", "RT if you agree", "Thread below"

## Engagement Patterns

### Reply Tone
Match the platform's culture when replying:
- **LinkedIn**: Professional, add value, ask follow-up questions
- **X**: Conversational, brief, can use humor

### Engagement Benchmarks
- **LinkedIn**: 2-5% engagement rate = good
- **X**: 1-3% engagement rate = good

### Quote Retweets (X)
Always add commentary — never just reshare without value-add.
