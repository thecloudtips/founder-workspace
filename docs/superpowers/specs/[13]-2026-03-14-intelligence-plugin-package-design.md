# [13] Intelligence Engine — Plugin Package & HQ Registration

**Status:** Stub — needs full design
**Parent:** Spec [3] Intelligence Engine
**Priority:** P3 (low urgency, no blockers on other work)
**Date:** 2026-03-14

## Context

Spec [3] covers the Intelligence Engine's core infrastructure, learning tiers, self-healing, and routing. All of that is implemented or being finished. This spec covers the **remaining packaging and distribution work** that was deferred from [3].

## Scope

### 1. Plugin Package Structure

Create `founder-os-adaptive-intel/` as a standalone distributable plugin:

- `.claude-plugin/plugin.json` — manifest with commands, skills, hooks
- `INSTALL.md` — installation instructions
- `QUICKSTART.md` — getting started guide
- `README.md` — overview and architecture summary

### 2. HQ Registration

- Add `[FOS] Intelligence` Notion database to HQ manifest
- Update `_infrastructure/notion-db-templates/` with intelligence DB template
- Update HQ consolidation docs to include Intelligence database
- Ensure `intel:config` references the HQ database for sync

### 3. Installer Integration

- Update spec [4] Installer to include `founder-os-adaptive-intel` in the install flow
- Add preflight check for intelligence SQLite DB initialization
- Add HQ database creation to the install wizard

## Out of Scope

- Core infrastructure (done in [3])
- Learning tiers 1-3 integration (done in [3])
- Self-healing module (done in [3])
- Routing module (done in [3])
- Plugin observation rollout (done in [3])

## Dependencies

- **Blocked by:** [3] Intelligence Engine completion (learning/healing wiring + plugin rollout)
- **Blocked by:** [6] Notion CLI Migration (for HQ database operations)

## Design Status

This is a stub. Full design sections (schema, commands, skills, implementation plan) to be written when this work is prioritized.
