# LinkedIn Content Ideation Refactor — Design Specification

**Date**: 2026-03-15
**Status**: Stub (decisions captured, full spec pending)
**Namespace**: `linkedin`
**Spec Number**: [16]
**Depends On**: [10] Social Media Posting, [15] Social Content Template Engine
**Related**: This spec refactors the `linkedin` namespace to focus on content ideation, removing publishing responsibility to the `social` namespace.

## Context & Decision

The `linkedin` namespace (P24) currently handles both content **creation** and **publishing**. With the addition of the `social` namespace ([10]) and the template engine ([15]), there is now overlap:

- `linkedin:post` creates AND publishes → overlaps with `social:post`
- `linkedin:variations` generates content variants → overlaps with `social:compose --variations`

**Decision (2026-03-15)**: Refactor `linkedin` into a pure **content ideation** namespace. Publishing moves entirely to `social`.

## Proposed Separation

| Layer | Namespace | Responsibility |
|-------|-----------|---------------|
| **Ideation & Research** | `linkedin` | Raw content generation, topic research, facts gathering, document-to-content extraction, content variations for ideation purposes |
| **Composition** | `social` | Template-driven creation, formatting, combining, A/B testing |
| **Publishing** | `social` | Posting, scheduling, monitoring, analytics across all platforms |

## Data Flow (Target State)

```
linkedin:from-doc "quarterly-report.pdf"
    → extracts key points, stats, narrative angles
    → outputs raw content brief (not a ready-to-post text)

linkedin:variations "raw content brief"
    → generates 3-5 angle variations (not platform-formatted)
    → outputs ideation options for user to pick

social:compose "selected angle" --technique=reversal --platform=linkedin
    → applies template, formats for platform
    → outputs ready-to-post content

social:post "content" --platforms=linkedin,x
    → publishes to platforms
```

## Scope of Refactoring

### Commands to Modify

| Command | Current | Target |
|---------|---------|--------|
| `linkedin:post` | Creates + publishes LinkedIn content | Rename to `linkedin:draft` — creates raw content only, no Late.dev interaction. Output is a content brief, not a published post. |
| `linkedin:from-doc` | Extracts content from documents for LinkedIn | Keep, but output becomes raw ideation material (key points, angles, stats) rather than ready-to-post text |
| `linkedin:variations` | Generates post variations | Keep, but reframe as ideation variations (different angles/hooks) rather than platform-formatted posts |

### New Commands (potential)

| Command | Description |
|---------|-------------|
| `linkedin:research` | Research a topic for content angles — web search, trend analysis, competitor content |
| `linkedin:outline` | Generate a content outline from a topic or brief |
| `linkedin:facts` | Extract facts and statistics from documents/URLs for content backing |

### Removed Responsibilities

- No Late.dev API calls from `linkedin` namespace
- No platform formatting (character limits, hashtags, etc.)
- No publishing, scheduling, or status tracking
- No media upload handling

## Migration Considerations

- Users currently using `linkedin:post` to publish need to be redirected to `social:post`
- The `linkedin:post` → `social:post` pipeline should be documented clearly
- Consider a deprecation notice on `linkedin:post` that suggests `social:compose + social:post`

## Open Questions

1. Should `linkedin` be renamed to something more generic (e.g., `content`, `ideate`) since the ideation output can target any platform, not just LinkedIn?
2. Should `linkedin:from-doc` support non-LinkedIn output formats (e.g., thread structure for X)?
3. Timeline: implement before or after [15] template engine?

## Next Steps

- Full spec to be written when this work is prioritized
- Implementation depends on [15] being complete first (compose command must exist before linkedin can hand off to it)
