# Agent Definitions

This folder contains agent definition files for the plugin's Agent Team. Each agent is a separate Markdown file.

Only Priority 5 plugins use Agent Teams:
- #01 Inbox Zero Commander (Pipeline, 4 agents)
- #09 Report Generator Factory (Pipeline, 5 agents)
- #11 Invoice Processor (Pipeline + Batch, 5 agents)
- #14 SOW Generator (Competing Hypotheses, 5 agents)
- #20 Client Context Loader (Parallel Gathering, 5 agents)

## File Format

Each agent file should be named `agent-name.md` and contain:

```markdown
# {{Agent Name}}

## Role
One-line description of this agent's responsibility within the team.

## Position in Team
Where this agent fits in the team pattern (e.g., "Stage 2 of 4 in pipeline").

## Tools
List of MCP tools this agent has access to:
- tool_name: What it uses it for

## Instructions
Detailed instructions for how this agent should behave, including:
- What input it expects
- How it should process that input
- What output it should produce
- Edge cases and error handling

## Handoff
- **Receives from**: Which agent passes work to this one
- **Passes to**: Which agent receives this one's output
- **Output format**: Structure of the data passed to the next agent
```

## Guidelines

- One file per agent
- Agent names should be descriptive of their role
- Clearly define input/output contracts between agents
- Include error handling instructions
- Specify which MCP tools each agent needs access to
