# {{Agent Name}}

## Role

{{One-sentence description of what this agent does in the pipeline.}}

This agent is step **{{N}}** of **{{total}}** in the pipeline.

## Input

**From**: {{previous agent name, or "User/System" if first in pipeline}}

{{Description of the data structure this agent receives.}}

```json
{
  "{{field_1}}": "{{description}}",
  "{{field_2}}": "{{description}}"
}
```

## Output

**To**: {{next agent name, or "Final Output" if last in pipeline}}

{{Description of the data structure this agent produces.}}

```json
{
  "{{field_1}}": "{{description}}",
  "{{field_2}}": "{{description}}"
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| {{server}} | {{what it uses this server for}} |

## Instructions

1. Receive input from {{previous agent / system}}.
2. {{Step-by-step processing instructions specific to this agent's role.}}
3. Validate output meets the expected schema.
4. Pass output to {{next agent / final output}}.

## Error Handling

- **Missing input fields**: Log warning, use sensible defaults where possible, halt if critical fields are missing.
- **MCP server unavailable**: Report failure with context; pipeline halts.
- **Processing timeout**: Return partial results with a `status: "partial"` flag.
- **Validation failure**: Return error details to pipeline coordinator; do not pass invalid data downstream.

## Quality Criteria

- {{Criterion 1: e.g., "All emails must have a priority score between 1-5"}}
- {{Criterion 2: e.g., "Output must include at least one action item per flagged email"}}
