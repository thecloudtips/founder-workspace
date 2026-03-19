---
description: List available video templates with descriptions and example output
argument-hint: '[--category=social|marketing] [--detail]'
allowed-tools: ["Read"]
execution-mode: background
result-format: full
---

# video:templates

List available video templates with descriptions and example output.

## Skills

Read these skill files before proceeding:
1. Read `${CLAUDE_PLUGIN_ROOT}/skills/video/video-templates/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--category` | No | Filter by category: social, marketing |
| `--detail` | No | Show detailed prop interfaces for each template |

## Execution

1. Read template catalog from video-templates skill
2. If `--category` provided, filter to that category
3. Display template table:

| Template | Category | Aspect | Duration | Description |
|----------|----------|--------|----------|-------------|
| social-reel | social | 9:16 | 3s/slide | Animated text slides with transitions |
| social-quote | social | 1:1 | 8s | Quote card with word-by-word reveal |
| social-listicle | social | 9:16 | 3s/item | Numbered tips/points |
| social-before-after | social | 9:16 | 10s | Split-screen comparison |
| product-demo | marketing | 16:9 | 30s | Screen recording + callouts |
| testimonial | marketing | 16:9 | 15s | Customer quote video |
| explainer | marketing | 16:9 | 6s/section | Section-based explainer |
| pitch-highlight | marketing | 16:9 | 20s | Key metrics with counters |

4. If `--detail` flag: for each template, read the TypeScript source file at `~/.founder-os/video-studio/src/templates/<Name>.tsx` and display the props interface.
