# Social Media Agent Team

> Pipeline: Five agents handle the full publishing workflow from content adaptation through platform-specific posting, with a preview approval gate before anything goes live.

## Overview

The Social Media team manages multi-platform publishing with a sequential pipeline that adapts your content for each target platform, shows you a preview for approval, handles media uploads, publishes to each platform, and monitors delivery status. It is built on top of the Late.dev API, which supports 13 social media platforms including LinkedIn, X/Twitter, and more.

The key design choice is the preview approval gate. Unlike a fully automated pipeline that might post something you did not intend, the Social team always pauses at Step 2 to show you exactly what will be posted to each platform, with character counts and formatting applied. You approve, edit, or cancel before anything goes live. This is especially important for cross-posting, where content that reads well on LinkedIn might need significant reworking for X's 280-character limit.

In single-agent mode (the default for `/founder-os:social:post`), one agent handles adaptation and publishing for a single platform. The `--team` flag activates the full five-agent pipeline, which is built for multi-platform cross-posting with media handling, partial failure recovery, and Notion tracking.

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| Content Adapter | Worker (Step 1) | Reads source content and adapts it for each target platform. Adjusts character limits (LinkedIn: 3,000 chars, X: 280 chars), tone (LinkedIn: professional, X: conversational), hashtag strategy (LinkedIn: 3-5 at end, X: 1-2 inline), and thread splitting (auto-splits long content into numbered X threads at paragraph boundaries). |
| Preview Agent | Worker (Step 2) | Formats adapted content in a side-by-side display showing each platform variant with character count vs. limit, media attachments, and platform-specific settings. Presents the user with approve, edit, or cancel options. If cancelled, the pipeline halts. |
| Media Handler | Worker (Step 3) | Validates media files against per-platform constraints (file type, size, count limits), verifies content-type matches file magic bytes for security, obtains presigned upload URLs, and uploads files. Returns public URLs mapped to each platform's post. |
| Publisher Agent | Worker (Step 4) | Calls the Late.dev API to create posts on each platform using the adapted content and uploaded media. Handles scheduling (if `--schedule` is set), draft mode, and partial failures -- if one platform fails, it continues publishing to the remaining platforms. |
| Monitor Agent | Worker (Step 5) | Tracks delivery status for each platform post, retries transient failures with exponential backoff (up to 2 retries, skipping auth errors), updates the Notion Content database with post URLs and status, and collects initial engagement metrics when available. |

## Data Flow

```
Source Content → [Content Adapter: per-platform variants]
  → [Preview: user approval gate] → [Media Handler: upload + validate]
  → [Publisher: post to each platform] → [Monitor: status + retries + Notion]
```

Each agent passes structured JSON to the next. The pipeline is sequential because each step depends on the previous -- you cannot publish before the user approves the preview, and you cannot monitor posts that have not been published yet. Partial failures are handled gracefully: if X fails but LinkedIn succeeds, the monitor retries X while recording the LinkedIn success.

## When to Use --team

The full team pipeline adds value whenever you are publishing to more than one platform or need the safety of the preview gate. Specific scenarios:

- **Cross-posting** -- publishing the same content to LinkedIn and X with platform-appropriate adaptations, hashtags, and formatting
- **Media-heavy posts** -- the media handler validates file types and sizes per platform (LinkedIn supports PDFs up to 100MB; X limits you to 4 images or 1 video) and handles uploads through presigned URLs
- **Scheduled publishing** -- queue posts for future publishing with delivery monitoring that retries transient failures
- **Content with approval needs** -- the preview gate lets you review exactly what will be posted, including thread splits and character counts, before committing

For a quick single-platform text post with no media, the default single-agent mode is simpler and faster.

## Example

```
/founder-os:social:cross-post --team --platforms linkedin,x --source ./posts/ai-healthcare.md
```

Here is what happens step by step:

1. The Content Adapter reads the source Markdown file (a 1,200-word article about AI in healthcare) and produces two variants:
   - **LinkedIn**: Full text trimmed to 2,847 characters with 4 relevant hashtags appended, professional tone preserved, paragraph breaks for readability.
   - **X/Twitter**: Content split into a 5-tweet thread. Each tweet is standalone-readable, the first tweet has an attention-grabbing hook, the last includes a call to action, and each is numbered (1/5 through 5/5) within the 280-character limit.

2. The Preview Agent displays both variants side by side with character counts (LinkedIn: 2,847/3,000, X thread items: 245/280 to 267/280). The user reviews and approves.

3. The Media Handler validates the attached chart image (chart.png, 450KB PNG). It passes LinkedIn's constraints (JPEG/PNG/GIF supported) and X's constraints (4 images max). Presigned URLs are obtained and the file is uploaded.

4. The Publisher Agent posts to both platforms. LinkedIn publishes successfully. X returns a rate-limit error on the thread.

5. The Monitor Agent confirms LinkedIn delivery, then retries the X thread after a 5-second backoff. The retry succeeds. Both platform statuses are updated to "published" in the Notion Content database, with post URLs recorded for future analytics.

## Related

- [Social Commands](../commands/social.md) -- command reference for post, cross-post, schedule, draft, status, reply, analytics, and more
