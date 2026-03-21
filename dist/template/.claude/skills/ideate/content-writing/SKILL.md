---
name: Content Writing
description: "Generates social media content optimized for multi-platform engagement and formatting best practices. Activates when the user wants to write, draft, or create social content across LinkedIn, X/Twitter, Meta (FB+IG), or TikTok, or asks 'help me draft content about [topic].' Covers post structure, formatting rules, and engagement-driven writing patterns for all supported platforms."
globs:
  - "commands/ideate/*.md"
---

# Content Writing

Generate structured, engaging social media content that follows platform best practices and maximizes engagement across LinkedIn, X/Twitter, Meta (Facebook and Instagram), and TikTok. Used by: `/founder-os:ideate:draft` (single post generation), `/founder-os:ideate:variations` (multiple variations from one topic), and `/founder-os:ideate:from-doc` (post extraction from long-form content).

## Purpose and Context

Transform raw ideas, topics, documents, or briefs into social media content that a founder can review, lightly edit, and publish directly. Every post must follow one of seven proven frameworks, respect the target platform's formatting constraints, target a specific audience segment, and land within the selected length mode. Use the framework templates at `skills/ideate/content-writing/references/post-frameworks.md` as the structural scaffold for every post.

The ideate commands focus on **content quality and structure**. Platform-specific formatting (hashtag placement, character counting, link handling) is finalized downstream by `social:compose`. The ideate layer produces the creative substance; the social layer applies the platform polish.

---

## Post Frameworks

Select the framework that best matches the topic, audience, and intent. Each framework has a distinct structure, rhythm, and engagement profile.

| Framework | Best When | Default Length |
|-----------|-----------|---------------|
| Story | Sharing a personal narrative with a business lesson | Medium |
| Listicle | Delivering multiple tips, insights, or observations | Medium-Long |
| Contrarian Take | Challenging conventional wisdom or popular opinion | Short-Medium |
| How-To | Teaching a step-by-step practical process | Medium-Long |
| Personal Lesson | Showing vulnerability paired with insight | Medium |
| Industry Insight | Analyzing a trend with data or evidence | Medium-Long |
| Question-Led | Opening discussion with a provocative question | Short-Medium |

### Framework Selection Logic

When no framework is specified, select based on these signals:

1. **Topic contains a personal experience or anecdote** -- use Story or Personal Lesson.
2. **Topic involves numbered items, tips, or a collection of insights** -- use Listicle.
3. **Topic challenges a widely held belief** -- use Contrarian Take.
4. **Topic teaches a specific process or method** -- use How-To.
5. **Topic references data, research, or industry trends** -- use Industry Insight.
6. **Topic is best explored through discussion** -- use Question-Led.

When two frameworks fit equally, prefer the one that matches the target audience segment. See `skills/ideate/content-writing/references/post-frameworks.md` for detailed templates, examples, and engagement tips for each framework.

---

## Post Structure Rules

Every post, regardless of framework or target platform, follows a three-part architecture:

### 1. Hook (Lines 1-2)

The opening lines determine whether a reader engages with the rest. Treat them as a headline.

Hook rules:
- Deliver the hook in 1-2 lines (under 150 characters visible before the fold on most platforms).
- Open with a bold statement, surprising number, provocative question, or counterintuitive claim.
- Never open with "I'm excited to share..." or "Happy to announce..." or "Big news!" -- these are low-signal openers that audiences scroll past.
- Never open with a hashtag or emoji.
- The hook must create a knowledge gap -- the reader needs to continue reading to resolve it.

Effective hook patterns:
- **Number-led**: "I lost $47,000 in revenue last quarter. Here is exactly why."
- **Contrarian**: "Networking events are a waste of time. Fight me."
- **Question**: "What would you do with 10 extra hours every week?"
- **Story-entry**: "Two years ago, I almost shut down my company."
- **Pattern-interrupt**: "Stop writing LinkedIn posts. Seriously."

### 2. Body (Lines 3-N)

The body delivers on the hook's promise. Structure varies by framework, but universal rules apply:

- Add a line break after every 1-2 sentences. Dense paragraphs kill engagement on mobile-first platforms.
- Use whitespace aggressively for visual scanning.
- One idea per visual block (the text between two blank lines).
- Numbered or bulleted lists are acceptable but keep items to one sentence each.
- Embed one personal opinion or experience per post. Pure information without perspective underperforms.

### 3. Closer (Final 2-3 Lines)

End with a CTA, summary, or invitation to engage:

- **Engagement CTA**: Ask a specific question that invites comments. "What is the one tool you could not live without?" outperforms "Thoughts?"
- **Summary line**: Restate the core takeaway in one sentence.
- **Tag-forward**: "Tag someone who needs to hear this." -- use sparingly, not on every post.
- **Soft CTA**: "If this was helpful, save it for later." -- leverages save/bookmark features for algorithmic boost.

---

## LinkedIn Platform Rules

### LinkedIn Length Modes

Select the length mode based on topic complexity, framework, and audience attention expectations.

#### Short (Under 500 Characters)

Best for: Contrarian Take, Question-Led, quick observations.

- 3-6 lines total.
- Hook is the post. No body section -- the hook IS the content.
- One idea, one angle, zero filler.
- End with a question or a single-sentence opinion.
- Maximum impact per character. Every word must earn its place.

#### Medium (500-1500 Characters)

Best for: Story, Personal Lesson, most general posts.

- 8-15 lines total.
- Hook (2 lines) + Body (6-10 lines) + Closer (2-3 lines).
- Enough room for one story or one structured argument.
- Default length mode when no preference is specified.

#### Long (1500-3000 Characters)

Best for: Listicle, How-To, Industry Insight, detailed frameworks.

- 15-25 lines total.
- Hook (2 lines) + Body (12-20 lines) + Closer (2-3 lines).
- Requires a strong hook to justify the length. Long posts with weak hooks get abandoned.
- Use visual structure (line breaks, numbered items, bold labels) to maintain scannability.
- Approach the 3000 character hard limit carefully -- leave room for hashtags.

#### Hard Limit

LinkedIn enforces a 3000 character limit on standard posts. This includes all text, line breaks, and hashtags. Never exceed 3000 characters. When approaching the limit, cut from the body (never the hook or closer) and reduce hashtag count.

### LinkedIn Formatting Rules

#### Line Breaks and Whitespace

LinkedIn collapses single line breaks in some clients. Follow these rules for consistent rendering:

- Insert a blank line between every 1-2 sentences.
- Use blank lines to create visual "paragraphs" of 1-2 sentences each.
- A line break after every sentence is acceptable and often preferred for readability.
- Do not use more than one consecutive blank line -- LinkedIn collapses them.
- Short lines (under 60 characters) create a faster reading rhythm. Mix short and medium-length lines.

#### Supported Formatting

| Element | How to Use | Notes |
|---------|-----------|-------|
| Line breaks | Blank line between blocks | Primary readability tool |
| Bold | Not supported in standard posts | Available only in LinkedIn articles, not posts |
| Italic | Not supported in standard posts | Available only in LinkedIn articles |
| Emojis | Sparingly for visual markers | 0-3 per post max; never as first character |
| Bullet points | Unicode bullets or hyphens | Keep items to one line each |
| Numbered lists | "1." at start of line | Natural for listicles and how-tos |
| ALL CAPS | Single word for emphasis | Use max once per post; never for full sentences |
| Mentions | @Name for real people/companies | Only mention relevant parties; never mass-tag |

#### Elements to Avoid

- Markdown formatting (not rendered on LinkedIn -- appears as raw characters).
- Links in the post body (LinkedIn suppresses reach on posts with external links; place links in the first comment instead and reference them: "Link in comments").
- More than 3 emojis total.
- Emoji bullets for every list item (reads as spam to the algorithm and to humans).
- Unicode special characters or decorative symbols.
- All-caps sentences.

### LinkedIn Hashtag Generation Rules

Append 3-5 hashtags at the end of every post, separated from the closer by one blank line.

#### Selection Strategy

Generate a mix of broad and niche hashtags:

- **1-2 broad hashtags** (100K+ followers): Provide discoverability. Examples: #Leadership, #Startups, #Entrepreneurship, #Marketing, #Technology.
- **2-3 niche hashtags** (1K-100K followers): Reach targeted audiences. Examples: #SaaSFounder, #BootstrappedStartup, #RemoteTeam, #SoloFounder, #B2BMarketing.

#### Hashtag Rules

- Place all hashtags on the final line(s) of the post.
- Use CamelCase for multi-word hashtags (#ContentMarketing not #contentmarketing) for readability and accessibility.
- Never embed hashtags within the body text. They disrupt reading flow.
- Never use more than 5 hashtags. LinkedIn's algorithm does not reward hashtag volume and over-tagging signals low-quality content.
- Avoid overly generic hashtags (#Business, #Success, #Motivation) -- they attract bots and low-engagement impressions.
- Match hashtags to the post's actual content. A post about hiring should not include #AI just for reach.
- Include the character count of hashtags in the 3000 character budget.

---

## X/Twitter Platform Rules

### X/Twitter Length Modes

#### Short (Under 280 Characters -- Single Tweet)

Best for: Contrarian Take, Question-Led, quick observations, punchy one-liners.

- One tweet. Must be self-contained and complete.
- The hook IS the entire post. No room for body or closer -- the tweet must do all three jobs.
- Prioritize wit, specificity, or a surprising angle. Generic statements get ignored.

#### Medium (2-3 Tweet Thread)

Best for: Story (short arc), Personal Lesson, Listicle (3-4 items).

- First tweet = hook. Must stand alone -- many readers will not click "Show this thread."
- Each subsequent tweet must also be independently readable. A reader who sees tweet 2 in isolation should still get value.
- End the final tweet with a CTA or summary.

#### Long (4-7 Tweet Thread)

Best for: How-To, Industry Insight, Listicle (5+ items), detailed Story.

- First tweet = hook with a promise ("A thread on how we did X").
- One idea per tweet. Never split a sentence across two tweets.
- Final tweet = CTA + optional "If this was useful, RT the first tweet."

### X/Twitter Thread Rules

- Split at paragraph or idea boundaries, never mid-sentence.
- Each tweet must be standalone-readable -- a reader encountering any single tweet in the thread should get a complete thought.
- Add a (1/N) suffix to each tweet when the thread exceeds 3 tweets.
- First tweet = hook. It will be seen by the widest audience. It must create enough curiosity to expand the thread.
- Last tweet = CTA. Invite replies, retweets, or follows.
- Keep individual tweets under 270 characters to leave room for the thread counter suffix.

### X/Twitter Formatting Rules

- Plain text only. No markdown, no bold, no italic. X does not render rich text.
- Line breaks within a single tweet work but use them sparingly (1-2 max per tweet).
- No emoji bullets or decorative formatting. X culture favors conversational tone over structured formatting.
- Mentions (@handle) are acceptable but never mass-tag. Tag only people directly relevant to the content.
- Links: one link per thread is sufficient. Place it in the last tweet or a dedicated "link tweet" near the end. Links in the first tweet reduce impressions.

### X/Twitter Hashtag Rules

- 1-2 hashtags maximum per tweet. More than 2 looks spammy on X.
- Inline hashtags are preferred over appended hashtags (weave them naturally into the sentence).
- Trending hashtags can boost visibility but only use them when genuinely relevant to the content.
- Never post a tweet that is only hashtags.
- CamelCase for multi-word hashtags (#ContentMarketing not #contentmarketing).

---

## Meta (Facebook) Platform Rules

### Facebook Length Modes

#### Short (Under 200 Characters)

Best for: Question-Led, quick observations, engagement bait questions.

- Appears fully without "See more" truncation.
- Works best for simple prompts that invite comments.
- One strong statement or question. No filler.

#### Medium (300-500 Characters)

Best for: Story (compressed), Contrarian Take, Personal Lesson.

- Sweet spot for Facebook engagement. Long enough for substance, short enough for mobile attention.
- Visual-first: if sharing with an image or link preview, the text complements the visual rather than standing alone.
- Storytelling format works well here -- Facebook audiences respond to narrative more than listicles.

#### Long (500-1000 Characters)

Best for: Industry Insight, How-To, detailed Story, Listicle.

- Use sparingly. Facebook truncates at roughly 480 characters with a "See more" link.
- The first 200 characters must work as a standalone hook since many readers will not expand.
- Structure with line breaks for scannability. Dense text blocks underperform.

### Facebook Formatting Rules

- Visual-first platform: posts with images or video outperform text-only by a significant margin. When drafting content, note where a visual would enhance the post.
- Links in the post body generate a link preview card. This is acceptable on Facebook (unlike LinkedIn). However, posts with no link and a native image tend to get higher organic reach.
- For maximum reach, place the link in the first comment and write a text + image post. Reference with "Link in comments."
- Storytelling and emotional resonance outperform tactical/professional content on Facebook.
- Emojis are more accepted on Facebook than LinkedIn. 2-5 emojis per post is standard. Use as visual anchors, not decoration.
- Tagging relevant pages/people is acceptable and can boost distribution.

### Facebook Hashtag Rules

- 1-3 hashtags maximum. Hashtags are less critical on Facebook than other platforms.
- Place at the end of the post or inline. Both formats are acceptable.
- Hashtag discoverability on Facebook is limited compared to Instagram or X. Use hashtags for thematic consistency rather than reach.
- Avoid hashtag-heavy posts. They read as cross-posted content (which Facebook's algorithm deprioritizes).

---

## Meta (Instagram) Platform Rules

### Instagram Length Modes

#### Short (Under 125 Characters)

Best for: Punchy statements that let the visual speak, Question-Led.

- Appears fully without truncation in the feed. Everything beyond ~125 characters requires "...more" tap.
- The caption supplements the visual. The visual carries the engagement; the caption adds context.
- Works well for carousels where the content is in the images.

#### Medium (300-800 Characters)

Best for: Story (compressed), Personal Lesson, Contrarian Take.

- First line (before the truncation fold) must be a scroll-stopping hook. Treat the first ~125 characters as the headline.
- Use line breaks to create visual breathing room.
- Include a CTA that drives comments ("Double tap if you agree" or "What is your take?").

#### Long (1000-2200 Characters)

Best for: How-To, Industry Insight, detailed Story, Listicle.

- Instagram allows up to 2200 characters per caption.
- Long captions work on Instagram when the content is genuinely valuable. Instagram audiences will read long captions if the first line hooks them.
- Structure with line breaks and emoji bullets (more accepted on Instagram than LinkedIn).
- End with a CTA that specifically drives comments or saves.

### Instagram Formatting Rules

- Visual context is required. Instagram captions do not stand alone -- they supplement an image, carousel, or reel. When drafting ideate-level content for Instagram, note the visual concept the caption supports.
- First line = scroll-stop. It is truncated at approximately 125 characters in the feed. Everything after requires a "...more" tap. Treat the first line as the hook.
- Line breaks work in Instagram captions. Use them for readability.
- Emoji usage is more liberal than LinkedIn. 3-8 emojis per caption is standard. Use as visual anchors and section markers.
- Mentions (@handle) are encouraged when relevant -- they drive notifications and cross-audience exposure.
- Links are not clickable in Instagram captions. Direct readers to "link in bio" or use Stories for link sharing.

### Instagram Hashtag Rules

- 20-30 hashtags are optimal for Instagram reach. Place them in the **first comment**, not the caption. This keeps the caption clean while maintaining discoverability.
- Mix three tiers of hashtags:
  - **Broad** (1M+ posts): 5-8 hashtags for maximum exposure. Examples: #Entrepreneur, #StartupLife, #BusinessTips.
  - **Mid-range** (100K-1M posts): 8-12 hashtags for targeted reach. Examples: #FounderMindset, #SaaSGrowth, #SmallBizOwner.
  - **Niche** (10K-100K posts): 7-10 hashtags for community targeting. Examples: #SoloFounderLife, #BootstrappedSaaS, #B2BContentStrategy.
- Use CamelCase for readability (#ContentMarketing not #contentmarketing).
- Rotate hashtag sets regularly to avoid being flagged as repetitive by the algorithm.
- Never place hashtags in the caption body. They clutter the reading experience.

---

## TikTok Platform Rules

### TikTok Length Mode

#### Short (150 Characters Maximum)

TikTok captions are limited to 150 characters. Every character counts.

- The caption supplements the video. It is not the primary content vehicle.
- Use the caption for: a hook line, a CTA, or context that the video does not provide.
- Trend hooks work well: "POV: you just [relatable scenario]" or "Wait for it..." or "This changed everything."
- Keep it punchy. TikTok audiences do not read long captions -- they watch.

### TikTok Formatting Rules

- Plain text only. No markdown, no bold, no rich formatting.
- Emojis are acceptable (1-3 max given the character limit).
- Mentions (@handle) are acceptable but consume precious character budget.
- Links are not clickable in TikTok captions. Direct to "link in bio" if needed.
- Trend alignment is critical. TikTok rewards content that references current trends, sounds, or formats. When drafting ideate-level content for TikTok, note any trending hooks or formats to leverage.

### TikTok Hashtag Rules

- 3-5 hashtags per post. Include at least one trending/challenge hashtag when relevant.
- Hashtags are included in the 150-character caption limit. Budget accordingly.
- Mix branded/niche hashtags with trending ones for optimal reach.
- CamelCase for multi-word hashtags (#FounderLife not #founderlife).
- Popular evergreen hashtags: #BusinessTok, #FounderLife, #Entrepreneur, #LearnOnTikTok, #SmallBusiness.

### TikTok Script Notes

When the ideate command is used for video script ideation (not just captions), structure the script as:

- **Hook (0-3 seconds)**: The first thing the viewer sees/hears. Must stop the scroll. Open with a bold claim, a visual surprise, or a direct address ("You are doing X wrong").
- **Body (15-45 seconds)**: Deliver the core content. One idea only. Use visual transitions to maintain attention. Speak conversationally -- TikTok penalizes overly polished/corporate delivery.
- **CTA (3-5 seconds)**: Close with a clear action. "Follow for more" / "Comment your experience" / "Save this for later."
- Total target duration: 30-60 seconds for educational/business content. Under 30 seconds for trend-based content.

---

## Audience Segments

Adjust tone, vocabulary, examples, and CTA style based on the target audience segment. Default to Founder-CEO when no segment is specified. These segments apply across all platforms, with tone naturally adapting to each platform's culture.

### Founder-CEO

- **Tone**: Peer-to-peer. Write as one founder to another. Direct, practical, experienced.
- **Vocabulary**: Business outcomes, revenue, team size, product decisions, time savings, cash flow, runway, margins.
- **Examples**: Reference sub-50-person companies, bootstrapping, first hires, pivots, customer conversations.
- **CTA style**: Challenge-based ("Try this tomorrow and report back") or experience-sharing ("What was your version of this?").
- **Avoid**: Enterprise jargon, theoretical frameworks without practical application, VC-centric metrics unless relevant.

### Technical

- **Tone**: Knowledgeable peer. Demonstrate technical credibility without talking down.
- **Vocabulary**: Stack-specific terms, tool names, architectural decisions, performance metrics, developer experience.
- **Examples**: Reference specific technologies, code decisions, debugging stories, build-vs-buy trade-offs.
- **CTA style**: Technical challenge ("What is your go-to solution for this?") or tool recommendation ("Drop your favorite tool for this in the comments").
- **Avoid**: Buzzword-heavy descriptions of technology ("leveraging AI to synergize"), oversimplification that loses technical readers.

### Marketer

- **Tone**: Results-oriented practitioner. Focus on what works and what does not, with numbers.
- **Vocabulary**: Conversion rates, CAC, LTV, content performance, channels, campaigns, attribution, engagement metrics.
- **Examples**: Reference campaign results, A/B tests, channel strategies, content experiments, growth tactics.
- **CTA style**: Results-sharing ("What conversion rate are you seeing?") or tactic exchange ("Share your best-performing channel this quarter").
- **Avoid**: Platitudes about "creating value" or "building community" without specifics.

### Corporate-CXO

- **Tone**: Strategic and credibility-forward. Demonstrate business impact and cross-functional thinking.
- **Vocabulary**: Board-level metrics, organizational change, competitive positioning, market dynamics, risk management, talent strategy.
- **Examples**: Reference industry shifts, competitive moves, organizational design decisions, leadership challenges.
- **CTA style**: Perspective-seeking ("How is your organization handling this?") or insight-sharing ("What signals are you watching?").
- **Avoid**: Tactical details that belong at the IC level, overly casual tone, startup-centric assumptions about team size or budget.

---

## Quality Checklist

Before outputting content, confirm every item. This checklist focuses on **content quality** -- the substance that the ideate commands are responsible for. Platform-specific formatting (hashtag count and placement, exact character limits, link handling) is validated and applied by `social:compose` downstream.

### Content Quality (Ideate Responsibility)

- [ ] Hook occupies the opening lines and creates a knowledge gap or curiosity pull
- [ ] Hook does not start with "I'm excited", "Happy to announce", "Big news", or a hashtag
- [ ] Post follows one of the 7 frameworks and maintains its structure throughout
- [ ] Line breaks appear after every 1-2 sentences for readability
- [ ] Content length is appropriate for the selected length mode and target platform
- [ ] Closer includes an engagement CTA, summary, or save prompt
- [ ] Tone matches the target audience segment
- [ ] Post contains at least one personal opinion, experience, or perspective
- [ ] No corporate jargon or hedging language ("I think maybe", "It might be worth considering")
- [ ] Every sentence earns its place -- no filler, no throat-clearing, no preamble
- [ ] Framework-specific structural requirements are met (see post-frameworks.md)

### Platform Awareness (Validated by social:compose)

- [ ] Hashtag count and placement follow platform rules
- [ ] Total character count is within platform hard limits
- [ ] No external links in body (LinkedIn) or non-clickable link references (Instagram, TikTok)
- [ ] Formatting syntax matches platform capabilities (no markdown on X/TikTok, etc.)
- [ ] Emoji usage is within platform norms
