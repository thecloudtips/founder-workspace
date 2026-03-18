# Founder OS Workspace

Monorepo for Founder OS — a Claude Code plugin for founder workflows.

## Structure

```
founder-workspace/
  ├── development/         # Source code (commands, skills, agents, scripts)
  ├── dist/                # Distribution package (npm, release artifacts)
  ├── docs/                # Specs, plans, reference, reports
  ├── .beads/              # Issue tracking
  ├── .claude/             # Claude Code project settings
  ├── .claude-flow/        # Swarm orchestration state
  ├── .entire/             # Entire checkpoint data
  └── .swarm/              # Swarm memory and indexes
```

## Development

Source code lives in `development/`. This includes:
- `commands/` — Slash commands
- `skills/` — Claude Code skills
- `agents/` — Agent definitions
- `scripts/` — Build and utility scripts
- `install.sh` — Installer
- `_infrastructure/` — Infrastructure helpers
- `_templates/` — Template files

## Distribution

The `dist/` folder contains the packaged plugin ready for release:
- `package.json` — npm manifest
- `bin/` — CLI entry points
- `lib/` — Compiled/bundled library code
- `template/` — Template files included in the package
- `tests/` — Distribution tests
- `founder-os-*.tgz` — Built release artifacts

Release scripts should output artifacts to `dist/`.

## Beads Issue Tracking

Beads lives at the workspace root (`.beads/`) and tracks issues across the project. Use `bd` commands from the workspace root.

## Project Instructions

For detailed project conventions, architecture, and development workflow, see `development/CLAUDE.md`.
