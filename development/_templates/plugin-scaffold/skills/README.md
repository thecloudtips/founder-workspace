# Skills

This folder contains domain knowledge files for the plugin. Skills provide context and expertise that Claude uses when executing commands.

## File Format

Each skill is a Markdown file describing a specific area of domain knowledge:

```markdown
# {{Skill Name}}

## Context
When and why this knowledge is relevant.

## Key Concepts
Domain-specific terms, definitions, and relationships.

## Rules & Heuristics
Decision-making guidelines Claude should follow.

## Examples
Concrete examples illustrating correct application of this knowledge.
```

## Guidelines

- One file per knowledge domain
- Use clear, declarative statements
- Include edge cases and exceptions
- Provide examples that demonstrate nuanced judgment
- Skills are read by Claude to inform its behavior -- write them as instructions
