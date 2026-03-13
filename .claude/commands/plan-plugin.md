---
description: Plan a Founder OS plugin — fetches Notion spec, uses feature-dev for exploration and plugin-dev for component design, creates beads backlog
argument-hint: Notion page URL for the plugin spec
---

# Plan Founder OS Plugin

You are planning the development of a Founder OS plugin. This command composes three workflows:
- **feature-dev** — for discovery, codebase exploration, clarifying questions, and architecture design
- **plugin-dev** — for component planning, plugin structure design, and validation standards
- **beads** — for backlog creation with dependency-linked tasks

**Use AskUserQuestion extensively** — every design decision should be confirmed with the user.

## Core Principles

- **Ask clarifying questions**: Use AskUserQuestion in batches of 3-4. Wait for answers before proceeding.
- **Load plugin-dev skills**: Use the Skill tool to load `plugin-dev` skills when designing components (plugin-structure, command-development, agent-development, skill-development, mcp-integration).
- **Use beads for tracking**: All tasks go into beads (`bd create`). Never use TodoWrite or markdown files for task tracking.
- **Clean Architecture**: Skills as single source of truth, explicit skill references in agents.

---

## Phase 1: Discovery (from feature-dev)

**Goal**: Understand the plugin spec from Notion

Notion spec URL: $ARGUMENTS

**Actions**:
1. Fetch the plugin spec from Notion using the Notion MCP (`notion-fetch` tool)
2. Extract: plugin name, number, platform, pillar, type, difficulty, release week, agent pattern, MCP requirements, input/output, deliverables, dependencies, acceptance criteria, blog angle
3. Read the corresponding local spec from `specs/` for additional context
4. Summarize understanding to the user

---

## Phase 2: Codebase Exploration (from feature-dev)

**Goal**: Understand templates, patterns, and infrastructure available for this plugin

**Actions**:
1. Launch 1-2 code-explorer agents (from feature-dev) targeting:
   - `_templates/plugin-scaffold/` — plugin file structure and templates
   - `_templates/agent-patterns/[pattern]/examples/` — pre-built agent definitions for this specific plugin
   - `_infrastructure/mcp-configs/` — MCP server configs needed by this plugin
   - `specs/` — pillar-specific spec file
   - Any existing `founder-os-[plugin-name]/` folder
   - Any completed plugins (listed in CLAUDE.md under "Completed Plugins") as reference implementations

2. After agents return, read all key files they identify

3. Present summary of what's available (pre-built vs needs creation)

---

## Phase 3: Component Planning (from plugin-dev)

**Goal**: Determine what plugin components are needed

**MUST load the `plugin-dev:plugin-structure` skill** using the Skill tool before this phase.

**Actions**:
1. Load `plugin-dev` plugin-structure skill to understand component types and conventions
2. Based on the Notion spec and codebase exploration, determine needed components:
   - **Skills**: What domain knowledge areas? How many? What triggers each?
   - **Commands**: What slash commands? Arguments and flags?
   - **Agents**: How many agents? What pattern (pipeline, parallel-gathering, etc.)?
   - **MCP**: Which servers required vs optional?
   - **Notion DBs**: What databases need to be created?
3. Present component plan to user as table and get confirmation

---

## Phase 4: Clarifying Questions (from feature-dev)

**Goal**: Resolve all design decisions before architecture

**CRITICAL**: DO NOT SKIP. Use AskUserQuestion for every batch.

**Plugin-specific questions to cover** (adapt based on spec):
- **MCP scope**: Which optional MCPs to include from the start?
- **Default vs team mode**: What should happen without `--team` flag? (If Agent Teams plugin)
- **Data persistence**: How to handle when optional MCPs (like Notion) aren't configured?
- **Automation level**: Which actions should auto-execute vs recommend-only?
- **Output format**: How detailed should command output be?
- **Notion DBs**: Should the plugin create new DBs or use existing ones? What properties?
- **Additional commands**: Beyond the main command, any secondary commands needed?
- **Content handling**: How much data to fetch (snippets vs full)?
- **Error handling**: Fail-fast vs graceful degradation for each MCP?

Ask in batches of 3-4 questions. Continue until all ambiguities are resolved.

---

## Phase 5: Detailed Design (from plugin-dev + feature-dev architects)

**Goal**: Design each component in detail, following plugin-dev conventions

**Load relevant plugin-dev skills** before designing each component type:
- Skills → load `plugin-dev:skill-development` skill
- Commands → load `plugin-dev:command-development` skill
- Agents → load `plugin-dev:agent-development` skill
- MCP → load `plugin-dev:mcp-integration` skill

**Actions**:
1. Launch 2 code-architect agents (from feature-dev) in parallel:
   - **Minimal approach**: Copy templates, minimal new files, maximum reuse
   - **Clean Architecture**: Decomposed skills, modified agents, Notion DB schemas, reference-quality implementation

2. Both architects should follow plugin-dev conventions:
   - Skills: third-person description with trigger phrases, imperative form body, progressive disclosure
   - Commands: written FOR Claude (instructions), not TO user. Include frontmatter.
   - Agents: `<example>` blocks for triggering, proper frontmatter (model, tools, color)
   - Use `${CLAUDE_PLUGIN_ROOT}` for portable paths in any scripts/hooks

3. Present both approaches with:
   - Complete file tree
   - Files to copy vs create
   - Skill decomposition with trigger phrases
   - Notion DB schemas (if applicable)
   - Agent modifications from templates

4. **Ask user which approach they prefer** (recommend Clean Architecture for reference quality)

---

## Phase 6: Build Beads Backlog

**Goal**: Create structured, dependency-linked backlog in beads

**Actions**:
1. Create epic: `[P{number}] {Plugin Name} - Full Plugin Build` (type=feature, priority=1)

2. Create subtasks organized by phase:

   **Phase 1 — Foundation** (no deps, parallel-safe):
   - Create plugin directory structure and plugin.json manifest
   - Create mcp.json configuration
   - Copy and configure teams/config.json (if Agent Teams)

   **Phase 2 — Skills** (blocked by directory structure):
   - One task per skill file
   - Description must include: trigger phrases, which agents reference it, key content areas
   - Note: implementation will use `plugin-dev:skill-development` skill and `skill-reviewer` agent

   **Phase 3 — Commands & Agents** (blocked by relevant skills + config):
   - One task per command file
   - One task per agent file (with specific modifications from templates)
   - Note: implementation will use `plugin-dev:command-development` / `agent-development` skills and `agent-creator` agent

   **Phase 4 — Validation** (blocked by commands + agents):
   - Run `plugin-validator` agent on complete plugin
   - Run `skill-reviewer` agent on each skill
   - Cross-reference check (skill refs, MCP requirements, agent contracts)

   **Phase 5 — Documentation** (blocked by validation):
   - README.md, INSTALL.md, QUICKSTART.md
   - Integration test plan
   - Notion DB templates (if applicable)

3. Set up all dependencies using `bd dep add`
4. Verify with `bd ready` and `bd list --status=open`
5. Present final backlog summary to user

Use parallel subagents to create multiple beads issues efficiently.

---

## Phase 7: Summary

Present:
- Total tasks created (epic + subtasks)
- Dependency graph overview
- Ready tasks (no blockers) for immediate start
- Skills to be loaded during implementation: `plugin-dev:skill-development`, `plugin-dev:command-development`, `plugin-dev:agent-development`, `plugin-dev:mcp-integration`
- Agents to be used: `agent-creator`, `skill-reviewer`, `plugin-validator`
- Superpowers to be used: `dispatching-parallel-agents`, `verification-before-completion`, `requesting-code-review`
- Reminder: run `/build-plugin P{number}` to start implementation

---

## Reference: Plugin #01 (Inbox Zero Commander)

The first plugin established these patterns — follow them for consistency:
- **5 decomposed skills**: email-triage, priority-scoring, action-extraction, response-drafting, tone-matching
- **Explicit skill references**: Each agent markdown says which skills to read
- **Two-mode command**: Default (single-agent summary) + `--team` (full pipeline)
- **Recommend-only**: Destructive actions (archiving) are recommendations, not auto-executed
- **Lazy Notion DB creation**: DBs created on first run, not on install
- **Notion drafts workflow**: Save with "To Review" status, separate approval command
- **Graceful degradation**: Works without optional MCPs, outputs text instead
