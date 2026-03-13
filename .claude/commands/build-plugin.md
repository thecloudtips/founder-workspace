---
description: Build a Founder OS plugin from its beads backlog — uses plugin-dev agents for creation/validation, superpowers for parallel execution
argument-hint: Plugin prefix (e.g., P01) or "next" to auto-detect
---

# Build Founder OS Plugin

You are executing the implementation of a Founder OS plugin. The planning phase is already complete — a beads backlog with dependency-linked tasks exists. Your job is to execute it efficiently by composing:

- **plugin-dev** — load its skills for each component type, use its agents (agent-creator, skill-reviewer, plugin-validator) for creation and validation
- **superpowers** — for parallel agent dispatch, verification, and code review
- **beads** — drive work from `bd ready`, track progress with `bd update`/`bd close`

## Input

Plugin identifier: $ARGUMENTS

If "$ARGUMENTS" is "next" or empty, run `bd ready` to find the next available plugin epic (issues titled `[P##]`).

---

## Step 0: Load Context

1. Run `bd list --status=open` to see the full backlog for this plugin
2. Run `bd ready` to see what's unblocked right now
3. Read `CLAUDE.md` for project conventions
4. Read the epic issue (`bd show <epic-id>`) to understand the plugin scope
5. Identify the plugin's spec in `specs/` and read the relevant section
6. Check `_templates/agent-patterns/` and `_templates/plugin-scaffold/` for templates to use
7. Check if any completed plugins exist (listed in CLAUDE.md) — if so, read one as reference

Present a brief status summary to the user before proceeding.

---

## Step 1: Foundation Phase (Parallel)

**Goal**: Create the plugin skeleton — all foundation tasks can run in parallel.

**Load** the `plugin-dev:plugin-structure` skill using the Skill tool before starting.

1. Run `bd ready` — filter for foundation tasks (directory structure, plugin.json, mcp.json, config.json)
2. Mark all as in_progress: `bd update <id> --status=in_progress`
3. Execute ALL foundation tasks in parallel using separate agents:
   - **Directory structure**: Create `founder-os-[name]/` with all subdirectories per plugin-structure conventions
   - **plugin.json**: Create manifest following plugin-dev's manifest-reference pattern. Include: name, version, description, author, display_name, type, difficulty, release_week, agent_pattern, capabilities, dependencies
   - **mcp.json**: Configure required and optional MCP servers from `_infrastructure/mcp-configs/`. Follow plugin-dev's mcp-integration patterns.
   - **teams/config.json**: Copy from `_templates/agent-patterns/[pattern]/examples/` if Agent Teams plugin
4. Close completed tasks: `bd close <id1> <id2> ...`
5. Run `bd ready` to confirm next phase is unblocked

---

## Step 2: Skills Phase (Parallel)

**Goal**: Create all skill files following plugin-dev conventions.

**Load** the `plugin-dev:skill-development` skill using the Skill tool before starting.

1. Run `bd ready` — should show all skill tasks unblocked
2. Mark all as in_progress
3. Launch parallel agents — one per skill file. Each agent MUST:
   - Follow plugin-dev's skill-development patterns:
     - YAML frontmatter with `description` (third-person, with trigger phrases) and `globs` if relevant
     - Lean SKILL.md body (1,500-2,000 words) in imperative form
     - Progressive disclosure: core in SKILL.md, detailed content in `references/`, examples in `examples/`
   - Read the task description (`bd show <id>`) for the specific skill requirements
   - Create `skills/[skill-name]/SKILL.md`
   - Include: Context, Key Concepts, Rules & Heuristics, Examples, Edge Cases
   - Note which agents reference this skill at the top
4. After creation, run the **skill-reviewer** agent on each skill to validate quality
5. Fix any critical/major issues from skill-reviewer
6. Close completed tasks: `bd close <id1> <id2> ...`
7. Run `bd ready` to confirm next phase is unblocked

---

## Step 3: Commands & Agents Phase (Partially Parallel)

**Goal**: Create command definitions and configure agents.

Commands and agents may have different dependency chains — check `bd ready` to see what's available.

### Commands:
**Load** the `plugin-dev:command-development` skill using the Skill tool.

For each command task:
- Follow plugin-dev's command-development patterns:
  - YAML frontmatter: `description`, `argument-hint`, `allowed-tools` (minimal necessary)
  - Write instructions **FOR Claude** (not TO user) — this is critical
  - Include clear behavior sections for each mode/flag
  - Provide usage examples
  - Reference relevant skills explicitly
- Create `commands/[command-name].md`

### Agents:
**Load** the `plugin-dev:agent-development` skill using the Skill tool.

For each agent task:
- Read the pre-built agent from `_templates/agent-patterns/[pattern]/examples/[plugin]-agents/`
- Read the task description for required modifications
- Use the **agent-creator** agent from plugin-dev to generate or refine agent definitions:
  - Provide the pre-built template + required modifications as context
  - Agent-creator will generate proper frontmatter, `<example>` blocks, and system prompt
- Key modifications from templates:
  - Add explicit skill references: "Read `skills/[name]/SKILL.md` for [purpose]"
  - Update Notion DB schemas if applicable
  - Adjust behavior per design decisions (e.g., recommend-only archiving)
- Place in `teams/agents/[agent-name].md`

### Mid-build Review:
After all commands and agents are created, invoke the `superpowers:requesting-code-review` skill to validate:
- Skill references are correct and consistent
- Input/output contracts between pipeline agents align
- Command flags match agent capabilities
- Notion DB schemas are consistent between agents that use them
- Commands follow plugin-dev's "written FOR Claude" convention

Close completed tasks: `bd close <id1> <id2> ...`

---

## Step 4: Validation Phase

**Goal**: Validate the complete plugin using plugin-dev's validation tools.

1. Run the **plugin-validator** agent from plugin-dev on the complete plugin:
   - Check: manifest correctness, directory structure, naming conventions, component validity, security (no hardcoded credentials)
   - Review validation report

2. Run the **skill-reviewer** agent on each skill (if not done in Step 2):
   - Check description quality, progressive disclosure, writing style, trigger effectiveness

3. Cross-reference check:
   - Every skill referenced by an agent exists as a file
   - Every command's MCP requirements are in mcp.json
   - Every agent in teams/config.json has a corresponding .md file
   - Notion DB schemas are consistent across agents

4. Fix all critical issues. Present remaining warnings to user.

5. Close validation tasks: `bd close <id1> <id2> ...`

---

## Step 5: Documentation Phase (Parallel)

**Goal**: Create all documentation files.

1. Run `bd ready` — should show doc tasks unblocked
2. Launch parallel agents for each doc task:
   - **README.md**: Use `_templates/plugin-scaffold/README.md` template. Fill with plugin details, commands table, skills list, agent teams description.
   - **INSTALL.md**: Use `_templates/plugin-scaffold/INSTALL.md` template. MCP setup steps for each required/optional server. Reference plugin-dev's mcp-integration patterns.
   - **QUICKSTART.md**: Use `_templates/plugin-scaffold/QUICKSTART.md` template. Real examples for each command and mode.
   - **Integration test plan**: Scenario-based test plan mapping to acceptance criteria from the spec.
   - **Notion DB templates** (if applicable): JSON schema files in `_infrastructure/notion-db-templates/`.
3. Close completed tasks: `bd close <id1> <id2> ...`

---

## Step 6: Final Verification

**Goal**: Ensure the plugin is complete and correct before closing.

Invoke the `superpowers:verification-before-completion` skill:

1. **Completeness check**: Compare deliverables checklist from Notion spec against created files
2. **Acceptance criteria**: Walk through each criterion from the spec — can it be met?
3. **Plugin-dev compliance**: Does the plugin follow all plugin-dev conventions?
   - Skills have proper frontmatter with trigger phrases
   - Commands are written FOR Claude
   - Agents have `<example>` blocks
   - Portable paths use `${CLAUDE_PLUGIN_ROOT}` where needed
4. **Convention check**: Plugin follows CLAUDE.md conventions (folder naming, command format, skill structure)

Present findings. Fix any gaps before closing the epic.

---

## Step 7: Close Out

1. Close any remaining open tasks: `bd close <id1> <id2> ...`
2. Close the epic: `bd close <epic-id> --reason="Plugin fully built and verified"`
3. Run `bd sync --flush-only`
4. Update `CLAUDE.md` — add this plugin to the "Completed Plugins" section with its key patterns
5. Present final summary:
   - Files created (count and list)
   - Skills, commands, agents built
   - plugin-dev validation results
   - Acceptance criteria coverage
   - Suggested next steps (manual testing with real MCP servers, blog post, next plugin)

---

## Execution Rules

- **Always use beads**: `bd update` before starting, `bd close` after completing. Never skip.
- **Always load plugin-dev skills**: Load the relevant plugin-dev skill BEFORE creating each component type. This is non-negotiable.
- **Use plugin-dev agents**: Use `agent-creator` for agents, `skill-reviewer` for skills, `plugin-validator` for the full plugin.
- **Parallel by default**: If `bd ready` shows multiple unblocked tasks, dispatch them in parallel using `superpowers:dispatching-parallel-agents`.
- **Read before write**: Always read templates and reference implementations before creating files.
- **Skill-first**: Skills define correctness. Write skills before agents that reference them.
- **Ask when stuck**: If a task description is ambiguous, use AskUserQuestion instead of guessing.
- **Review after each phase**: Use code-reviewer agents between major phases.
- **No blog/gift yet**: Blog posts and welcome gifts live in `social/[plugin-short-name]/` (not inside the plugin directory). Defer until the plugin works with real MCP servers.

## Skills Loading Cheatsheet

| Phase | Load These plugin-dev Skills |
|-------|------------------------------|
| Step 1: Foundation | `plugin-structure`, `mcp-integration` |
| Step 2: Skills | `skill-development` |
| Step 3: Commands | `command-development` |
| Step 3: Agents | `agent-development` |
| Step 4: Validation | (agents auto-load their skills) |
| Step 5: Docs | `plugin-structure` (for README conventions) |
