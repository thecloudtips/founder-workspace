# Notion HQ Consolidation — Session Kickoff Prompt

Copy-paste this into a new Claude Code session to begin implementation:

---

```
I need to execute the Notion HQ consolidation implementation plan. Here's the context:

## What we're doing
Consolidating 32+ Founder OS plugin Notion databases into ~18 interconnected databases shipped as a single "Founder OS HQ" workspace template, with CRM Companies as the central hub.

## Key documents
- **Design doc:** `docs/plans/2026-03-07-notion-hq-consolidation-design.md` — full architecture, DB schemas, relation map, dashboard spec
- **Implementation plan:** `docs/plans/2026-03-07-notion-hq-consolidation-implementation.md` — 28 tasks across 6 phases

## Execution approach
Use the `superpowers:subagent-driven-development` skill. Dispatch parallel subagents for independent tasks within each phase. Review outputs between phases.

## Phase order and parallelization
- **Phase 1 (Tasks 1-6):** Create HQ template JSONs — Tasks 1-5 can run in parallel, Task 6 (manifest) depends on 1-5
- **Phase 2 (Tasks 7-16):** High-impact plugin updates — all 10 tasks can run in parallel (different plugins)
- **Phase 3 (Tasks 17-21):** Medium-impact plugin updates — all 5 tasks can run in parallel
- **Phase 4 (Tasks 22-23):** Low-impact plugin updates — both tasks can run in parallel
- **Phase 5 (Tasks 24-26):** Dashboard spec + docs — Tasks 24-25 parallel, Task 26 after
- **Phase 6 (Tasks 27-28):** Template assembly + validation — sequential

Each phase depends on the previous one completing.

## Key conventions to enforce in every file change
1. **DB discovery:** Search "Founder OS HQ - [Name]" first, fall back to old plugin-specific name
2. **Type column:** Every write to a merged DB MUST include the correct Type value
3. **Company relation:** Populate when client context is available (email domain match, user input, CRM lookup)
4. **No lazy creation:** Remove lazy DB creation logic; DBs are pre-created in the HQ template. Keep fallback to old lazy creation for non-HQ users.
5. **Idempotent upserts:** Maintain existing idempotent key logic, but add Type to compound keys where DBs are merged

## Start
Read both documents, then begin with Phase 1. Use `bd create` to track the work if beads is available. Dispatch subagents for parallelizable tasks. Commit after each phase.
```
