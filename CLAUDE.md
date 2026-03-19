# Founder OS

AI-powered business automation plugin for Claude Code. Turns Claude Code into a command center for email triage, meeting prep, report generation, CRM sync, and 30+ other founder workflows.

## Repository Structure

```
founder-workspace/
  ├── development/         # Source code
  │   ├── commands/        # Slash commands (/founder-os:<namespace>:<action>)
  │   ├── skills/          # Domain knowledge per namespace
  │   ├── agents/          # Agent team definitions
  │   ├── scripts/         # Build and utility scripts
  │   ├── _infrastructure/ # Infrastructure helpers (preflight, hooks, etc.)
  │   └── install.sh       # Plugin installer
  ├── dist/                # Distribution package (npm)
  └── docs/                # Public documentation
      ├── commands/        # Command reference (35 namespaces)
      ├── agents/          # Agent team documentation
      ├── deep-dives/      # Architecture internals
      ├── extending/       # Customization guides
      └── landing/         # Product landing page content
```

## Adding a New Command

Commands live in `development/commands/<namespace>/<action>.md`. Each command is a markdown file that Claude Code loads as a slash command.

1. Create the command file: `development/commands/<namespace>/<action>.md`
2. Add the corresponding skill (if needed): `development/skills/<namespace>/<skill-name>/SKILL.md`
3. Register any new dependencies in `development/_infrastructure/preflight/dependency-registry.json`

## Adding a New Skill

Skills live in `development/skills/<namespace>/<skill-name>/SKILL.md`. Skills provide domain knowledge that commands reference.

## Adding a New Agent Team

Agent teams live in `development/agents/<namespace>/`. Each team has a `config.json` and one or more agent markdown files.

## Build & Test

```bash
# Run distribution tests
cd dist && npm test

# Package for release
cd dist && npm pack
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, PR process, and coding standards.
