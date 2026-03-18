# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Sub-Agent Workflow for Plugin Development

### Before Starting Any Task
1. **Read the task**: `bd show <id>` for description, dependencies, labels
2. **Read the specs**: Each task references its spec file in `specs/`. Read the full plugin section for context (MCP requirements, acceptance criteria, deliverables checklist)
3. **Check dependencies**: Ensure all `blockedBy` tasks are completed before starting
4. **Claim the task**: `bd update <id> --status in_progress`

### Parallelization Patterns
Sub-agents should parallelize independent work within a plugin:
- **Scaffold → Skills + (Agent Teams config)**: Skills and Agent Teams config are independent after scaffold
- **Skills → Commands**: Commands depend on skills being defined
- **Agent definitions (Phase 1 only)**: All agent .md files can be written in parallel after config.json
- **Testing → Docs → Blog + Gift**: Sequential chain, blog and gift are independent after docs
- **Cross-plugin**: Different plugins in the same phase can be developed in parallel by separate sub-agents

### Task Types and What Sub-Agents Should Produce

| Task Type | Output | Key Reference |
|-----------|--------|--------------|
| **Scaffold** | Plugin directory structure with all config files | Deliverables Checklist in specs |
| **Skills** | Markdown files in `skills/` defining domain knowledge | Specs: skill names + acceptance criteria |
| **Commands** | Markdown files in `commands/` defining slash commands | Specs: command names + behavior |
| **Agent Teams config** | `teams/config.json` + `agents/*.md` (Phase 1 only) | Specs: Agent Teams Configuration table |
| **Testing** | Verify all acceptance criteria from specs pass | Specs: Acceptance Criteria section |
| **Documentation** | INSTALL.md (MCP setup) + QUICKSTART.md (usage) | Specs: MCP Requirements table |
| **Blog** | Blog post following BUILD Method voice | Specs: Blog Angle |
| **Welcome gift** | Downloadable resource for plugin bundle | Related to plugin's core value |

### Specs Location for Each Pillar
- **Pillar 1 (Daily Work, #01-#08)**: `specs/# 📧 Pillar 1: Daily Work - Full Plugin .md`
- **Pillar 2 (Code Without Coding, #09-#16)**: `specs/# 🛠️ Pillar 2: Code Without Coding - Fu.md`
- **Pillar 3 (MCP & Integrations, #17-#24)**: `specs/# 🔌 Pillar 3: MCP & Integrations - Full.md`
- **Pillar 4 (Meta & Growth, #25-#30)**: `specs/# 📈 Pillar 4: Meta & Growth - Full Plug.md`

### Agent Teams Architecture (Phase 1 plugins only)
| Pattern | Plugins | How to implement |
|---------|---------|-----------------|
| Pipeline | #01, #09 | Sequential agents, each transforms data for next |
| Parallel Gathering | #20 | All agents fetch simultaneously, lead merges |
| Pipeline + Batch | #11 | Pipeline per item, batch across items |
| Competing Hypotheses | #14 | Multiple agents propose, lead synthesizes |

### After Completing a Task
1. **Verify acceptance criteria** from specs are met
2. **Close the task**: `bd close <id>`
3. **Check for unblocked work**: `bd ready` to find newly available tasks
4. **Update Notion status** if completing a plugin epic

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds


<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

<!-- END BEADS INTEGRATION -->
