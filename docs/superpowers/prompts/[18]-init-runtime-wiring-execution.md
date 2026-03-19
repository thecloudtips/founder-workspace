# Execution Prompt: [18] Init Runtime Wiring

## Objective

Execute the implementation plan at `docs/superpowers/plans/[18]-2026-03-17-init-runtime-wiring.md` — wiring 5 Claude Code hooks, dispatcher activation, and lazy memory/intelligence DB initialization into the founderOS init command.

## Critical Path Mapping

**IMPORTANT:** The plan references `founder-os-dist/` paths. The repo was restructured to a monorepo. Apply this mapping:

| Plan path | Actual path |
|-----------|-------------|
| `founder-os-dist/template/` | `dist/template/` |
| `founder-os-dist/lib/` | `dist/lib/` |
| `founder-os-dist/tests/` | `dist/tests/` |

## Execution Strategy

Use **3 coordination layers**:

1. **`/plugin-dev:create-plugin`** — General oversight, component validation, plugin structure compliance
2. **`/skill-creator:skill-creator`** — Any skill-related work (if tasks touch skills or SKILL.md files)
3. **Claude-flow swarm mode** — Parallel execution of independent chunks/tasks

## Chunk Dependency Graph

```
Chunk 1 (Foundation)          Chunk 4 (Evals + Dispatcher)
  ├── Task 1.1 ──┐              ├── Task 4.1 (independent)
  ├── Task 1.2 ──┼── all ──→ Chunk 2 (Hook Scripts)  ──→ Chunk 3 (Installer) ──→ Chunk 5 (Integration)
  └── Task 1.3 ──┘              └── Task 4.2 (prerequisite for Chunk 5)
```

**Parallelizable groups:**

| Group | Tasks | Why parallel |
|-------|-------|-------------|
| A | 1.1, 1.2, 1.3, 4.1 | No interdependencies — foundation libs, schema inits, hook registry, evals copy |
| B | 2.1, 2.2, 2.3, 2.4, 2.5 | All depend on Group A, but are independent of each other |
| C | 3.1, 3.2, 3.3, 3.4, 4.2 | Installer integration — 3.2 depends on 3.1; 3.3 and 3.4 are independent; 4.2 is independent |
| D | 5.1, 5.2 | Sequential — integration test then package |

## Swarm Execution Plan

### Phase 1: Foundation (Group A — 4 parallel agents)

```
Spawn 4 agents simultaneously:

Agent 1 (coder): Task 1.1 — Create db-helper.mjs
  - TDD: write test-db-helper.sh first, verify fail, implement db-helper.mjs, verify pass
  - File: dist/template/.founderOS/scripts/hooks/lib/db-helper.mjs
  - Test: dist/tests/test-db-helper.sh

Agent 2 (coder): Task 1.2 — Create memory-init.mjs + intelligence-init.mjs
  - TDD: write test-db-init.sh first, verify fail, implement both inits, verify pass
  - Files: dist/template/.founderOS/scripts/hooks/lib/memory-init.mjs
           dist/template/.founderOS/scripts/hooks/lib/intelligence-init.mjs
  - Test: dist/tests/test-db-init.sh

Agent 3 (coder): Task 1.3 — Create hook-registry.json
  - Create the registry JSON defining all 5 hooks
  - File: dist/template/.founderOS/scripts/hooks/hook-registry.json
  - Test: dist/tests/test-hook-registry.sh

Agent 4 (coder): Task 4.1 — Copy evals to dist template
  - Copy eval YAML files from development source to dist template
  - Files: dist/template/.founderOS/evals/*.yaml
  - Test: dist/tests/test-evals-exist.sh
```

**Gate:** All 4 agents must complete before Phase 2.

### Phase 2: Hook Scripts (Group B — 5 parallel agents)

```
Spawn 5 agents simultaneously:

Agent 5 (coder): Task 2.1 — pre-tool.mjs (PreToolUse hook)
  - Lazy DB init, tool validation
  - File: dist/template/.founderOS/scripts/hooks/pre-tool.mjs
  - Test: dist/tests/test-pre-tool.sh

Agent 6 (coder): Task 2.2 — session-start.mjs (SessionStart hook)
  - Dispatcher rules injection, context loading
  - File: dist/template/.founderOS/scripts/hooks/session-start.mjs
  - Test: dist/tests/test-session-start.sh

Agent 7 (coder): Task 2.3 — prompt-submit.mjs (UserPromptSubmit hook)
  - Preflight checks
  - File: dist/template/.founderOS/scripts/hooks/prompt-submit.mjs
  - Test: dist/tests/test-prompt-submit.sh

Agent 8 (coder): Task 2.4 — post-tool.mjs (PostToolUse hook)
  - Observation logging, evals
  - File: dist/template/.founderOS/scripts/hooks/post-tool.mjs
  - Test: dist/tests/test-post-tool.sh

Agent 9 (coder): Task 2.5 — stop.mjs (Stop hook)
  - State flush, cleanup
  - File: dist/template/.founderOS/scripts/hooks/stop.mjs
  - Test: dist/tests/test-stop.sh
```

**Gate:** All 5 agents must complete before Phase 3.

### Phase 3: Installer Integration (Group C — 3 parallel agents + 1 sequential)

```
Agent 10 (coder): Task 3.1 — Add mergeHooksIntoSettingsJson + removeHooksFromSettingsJson
  - File: dist/lib/settings-json.js
  - Test: dist/tests/test-settings-merge.sh (extend existing)
  → MUST complete before Agent 11 starts Task 3.2

Agent 11 (coder): Task 3.2 — Add Phase 2a/2b to installer.js (AFTER Agent 10)
  - File: dist/lib/installer.js
  - Test: dist/tests/test-init-fresh.sh (extend existing)

Agent 12 (coder): Task 3.3 + 3.4 — Hook merge in updater.js + hook removal in uninstaller.js
  - Files: dist/lib/updater.js, dist/lib/uninstaller.js
  - Tests: dist/tests/test-init-update.sh, dist/tests/test-uninstall.sh (extend existing)

Agent 13 (skill-creator): Task 4.2 — Update dispatcher SKILL.md
  - Use /skill-creator:skill-creator for this
  - Hard prerequisite for Chunk 5
  - File: development/skills/dispatch.md (or wherever dispatcher skill lives)
```

**Gate:** All Phase 3 agents must complete before Phase 4.

### Phase 4: Integration Testing (Group D — sequential)

```
Agent 14 (tester): Task 5.1 — End-to-end init test with hooks
  - Run full init in temp workspace, verify all 5 hooks register
  - File: dist/tests/test-init-hooks-e2e.sh

Then: Task 5.2 — Package and push
  - Build tarball, verify contents, push
```

## Agent Instructions Template

Each agent receives:

```
You are implementing [TASK_ID] from the plan at:
docs/superpowers/plans/[18]-2026-03-17-init-runtime-wiring.md

PATH MAPPING — the repo was restructured:
  founder-os-dist/ → dist/

Read the plan section for your task. Follow TDD:
1. Write the test FIRST
2. Run test — confirm it fails
3. Write the implementation
4. Run test — confirm it passes
5. Read existing files before editing (NEVER blind-edit)

Use /plugin-dev:hook-development for hook implementation guidance.
Read the design spec for architectural context:
  docs/superpowers/specs/[18]-2026-03-17-init-runtime-wiring-design.md

KILL SWITCH: All hooks must check FOUNDER_OS_HOOKS=0 env var and exit early if set.
STDIN: All hooks read event data from stdin (JSON), not shell args.

When done, report: files created/modified, test results, any blockers.
```

## Skill Routing

| Situation | Skill to invoke |
|-----------|----------------|
| Creating/modifying hook scripts | `/plugin-dev:hook-development` |
| Modifying plugin structure or settings.json | `/plugin-dev:plugin-settings` |
| Updating dispatcher SKILL.md (Task 4.2) | `/skill-creator:skill-creator` |
| Plugin validation at end | `/plugin-dev:plugin-validator` (via agent) |
| Code review at gates | `/superpowers:requesting-code-review` |

## Swarm Init Command

```bash
npx @claude-flow/cli@latest swarm init \
  --topology hierarchical \
  --max-agents 8 \
  --strategy specialized
```

## Gate Checklist

At each phase gate, the lead agent must verify:

- [ ] All tests from completed phase pass
- [ ] No files were created outside `dist/` or `development/`
- [ ] No hardcoded paths — all use relative paths from `.founderOS/`
- [ ] Kill switch (`FOUNDER_OS_HOOKS=0`) is respected in every hook
- [ ] Stdin JSON parsing has try/catch in every hook
- [ ] No npm dependencies added — all hooks use Node.js built-ins + sqlite3 CLI

## Completion Criteria

- [ ] 5 hook scripts created and tested individually
- [ ] hook-registry.json defines all 5 hooks correctly
- [ ] `installer.js` registers hooks in `.claude/settings.json` during init
- [ ] `updater.js` merges new hooks on update
- [ ] `uninstaller.js` removes hooks on uninstall
- [ ] End-to-end test passes: fresh init → hooks registered → session-start works
- [ ] `git status` clean, all changes committed and pushed
