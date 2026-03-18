# Commands

This folder contains slash command definitions for the plugin. Each command is a separate Markdown file.

## Naming Convention

Commands follow the `/namespace:action` format:
- Namespace = plugin's short name (e.g., `inbox`, `client`, `report`)
- Action = what the command does (e.g., `triage`, `load`, `generate`)

## File Format

Each command file should be named `namespace-action.md` and contain:

```markdown
# /{{namespace}}:{{action}}

## Description
Brief description of what this command does.

## Usage
/{{namespace}}:{{action}} [arguments]

## Arguments
- `arg1` (required): Description
- `arg2` (optional): Description

## Behavior
Step-by-step description of what the command does when invoked.

## Output
What the user should expect to see after running the command.

## Examples
Example invocations with expected results.
```

## Guidelines

- One file per command
- Keep descriptions concise but complete
- Include realistic examples
- Document all arguments with types and defaults
- Specify which MCP servers the command uses
