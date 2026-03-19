---
name: video-templates
description: "Activates when selecting video templates. Provides template selection algorithm, template catalog with prop contracts, and content-to-template matching rules."
globs: ["commands/video/generate.md", "commands/video/templates.md"]
---

# Video Templates Skill

## Template Catalog

| ID | Category | Default Aspect | Default Duration | Description |
|----|----------|---------------|-----------------|-------------|
| `social-reel` | social | 9:16 | 3s/slide | Animated text slides with transitions and music |
| `social-quote` | social | 1:1 | 8s | Quote card with word-by-word text reveal |
| `social-listicle` | social | 9:16 | 3s/item | Numbered tips/points with slide transitions |
| `social-before-after` | social | 9:16 | 10s | Split-screen comparison with wipe transition |
| `product-demo` | marketing | 16:9 | 30s | Screen recording with callouts and branding |
| `testimonial` | marketing | 16:9 | 15s | Customer quote with photo and attribution |
| `explainer` | marketing | 16:9 | 6s/section | Section-based explainer with progress bar |
| `pitch-highlight` | marketing | 16:9 | 20s | Key metrics with animated number counters |

## Selection Algorithm

Template selection follows a 4-step process. Execute each step in order.

### Step 1: Parse Content Type

Analyze the user's `--script` text to detect the content type. Apply the detection rules from the `video-generation` skill's Script Parsing section. The result is one of: short-text, numbered-list, comparison, stats, multi-section, default-short, or default-long.

### Step 2: Filter by Aspect Ratio

If the user specified `--aspect`, filter the candidate templates to prefer those whose default aspect ratio matches. This is a soft preference, not a hard filter -- if no template matches both content type and aspect ratio, content type takes priority.

- `9:16` prefers: `social-reel`, `social-listicle`, `social-before-after`
- `1:1` prefers: `social-quote`
- `16:9` prefers: `product-demo`, `testimonial`, `explainer`, `pitch-highlight`
- `4:5` has no default match -- use content type matching and override the template's default aspect

### Step 3: Match Content to Template

Apply the Content Mapping Rules below to select the best template for the detected content type. If the user's `--aspect` filter narrows the candidates, pick the best match within that subset.

### Step 4: Fallback

If no content mapping rule produced a clear match:
- Content under 100 words defaults to `social-reel`
- Content of 100+ words defaults to `explainer`

## Content Mapping Rules

Apply the first matching rule based on the detected content type:

| Content Signal | Detection Criteria | Template | Confidence |
|---|---|---|---|
| Short text | < 50 words, no numbered items, no structure | `social-quote` | High |
| Numbered list | 3+ lines starting with digits, dashes, or bullets | `social-listicle` | High |
| Comparison | Contains "before"/"after", "vs", "old way"/"new way", or similar contrast language | `social-before-after` | High |
| Stats/numbers | 2+ numeric values with `$`, `%`, `k`, `M`, `B`, or large bare numbers | `pitch-highlight` | High |
| Customer quote | Attribution present (name, title, company pattern) | `testimonial` | Medium |
| Multi-section | 2+ sections separated by `---`, `##`, or double newlines with headings | `explainer` | High |
| Screen recording | User explicitly mentions "demo", "walkthrough", "screen recording", or provides a video file | `product-demo` | Medium |
| Default short | < 100 words, no rule above matched | `social-reel` | Low |
| Default long | 100+ words, no rule above matched | `explainer` | Low |

When confidence is "Medium" or "Low", confirm the template choice with the user before proceeding to render.

## Prop Contracts

Each template defines a TypeScript props interface that the generated props JSON must conform to exactly. The interface files live in the managed Remotion project at:

```
_infrastructure/video-studio-template/src/templates/
```

### social-reel
**File**: `SocialReel.tsx`
Required props: `slides` (array of `{ text, duration? }`), `brandKit`, `music?`

### social-quote
**File**: `SocialQuote.tsx`
Required props: `quote` (string), `author?` (string), `brandKit`, `music?`

### social-listicle
**File**: `SocialListicle.tsx`
Required props: `title` (string), `items` (array of `{ number, text }`), `brandKit`, `music?`

### social-before-after
**File**: `SocialBeforeAfter.tsx`
Required props: `before` (`{ label, description, image? }`), `after` (`{ label, description, image? }`), `brandKit`, `music?`

### product-demo
**File**: `ProductDemo.tsx`
Required props: `videoSrc` (string), `callouts` (array of `{ timestamp, text, position }`), `brandKit`, `music?`

### testimonial
**File**: `Testimonial.tsx`
Required props: `quote` (string), `name` (string), `title?` (string), `company?` (string), `photoUrl?` (string), `brandKit`, `music?`

### explainer
**File**: `Explainer.tsx`
Required props: `title` (string), `sections` (array of `{ heading, body, image? }`), `brandKit`, `music?`

### pitch-highlight
**File**: `PitchHighlight.tsx`
Required props: `headline` (string), `metrics` (array of `{ value, label, prefix?, suffix? }`), `brandKit`, `music?`

### Common Props (all templates)

Every template accepts these shared props:

- `brandKit` (required) -- `{ primaryColor, secondaryColor, fontFamily, logoUrl? }`
- `music` (optional) -- `{ src, volume?, startFrom?, endAt? }`
- `outputPreset` (optional) -- `{ width, height, fps? }` overrides the template default

## Template Override

When the user provides `--template <id>` explicitly, skip the selection algorithm entirely and use the specified template. Validate that:

1. The template ID exists in the catalog above.
2. The parsed content can be reasonably mapped to the template's prop contract.
3. If the content does not fit the template's expected structure, warn the user and suggest the auto-selected alternative, but respect their override if they confirm.
