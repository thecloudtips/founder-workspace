# Video Studio — Deferred Issues Spec

**Date**: 2026-03-20
**Status**: Backlog
**Source**: Issues #5-6 from `docs/troubleshooting/video-studio-remediation-plan.md`

---

## Issue #5: Plugin Root Resolution (`${CLAUDE_PLUGIN_ROOT}`)

**Problem**: When Founder OS is installed as a Claude Code plugin (not run directly from the workspace repo), `${CLAUDE_PLUGIN_ROOT}` may not resolve correctly. During the 2026-03-19 test, skill files like `skills/video/brand-kit/SKILL.md` were not found because the test ran from a different working directory (`fos-ws`) than the plugin root (`founder-workspace`).

**Impact**: Skill files referenced by commands return "File does not exist" errors. Commands still execute (skills are advisory, not blocking), but lose domain knowledge that improves output quality.

**Scope**: This is a deployment/installation concern, not a video-specific bug. Affects all namespaces, not just video.

**Acceptance criteria**:
- `${CLAUDE_PLUGIN_ROOT}` resolves correctly when installed via `development/install.sh`
- `${CLAUDE_PLUGIN_ROOT}` resolves correctly when cloned and linked manually
- Skill file paths in all commands resolve to existing files
- Verified on macOS and Linux

**Investigation needed**:
- How does `plugin.json` set the plugin root?
- Does `install.sh` register the correct path?
- Are there symlink edge cases?

---

## Issue #6: Video Studio Template Verification

**Status**: CLOSED (verified 2026-03-20)

**Problem (original)**: `init.md` copies from `${CLAUDE_PLUGIN_ROOT}/_infrastructure/video-studio-template/` but during the first test, the template directory wasn't found, forcing manual scaffolding.

**Resolution**: Exploration on 2026-03-20 confirmed the template directory is complete:
- 8 template compositions (SocialReel, SocialQuote, SocialListicle, SocialBeforeAfter, ProductDemo, Testimonial, Explainer, PitchHighlight)
- 5 shared components (Logo, LowerThird, NumberCounter, ProgressBar, SlideTransition, TextOverlay)
- Supporting files: package.json, remotion.config.ts, tsconfig.json, types.ts, brand-kit.example.json

The original failure was caused by issue #5 (`${CLAUDE_PLUGIN_ROOT}` not resolving). Once #5 is fixed, template copying will work as designed. No changes needed to the template itself.
