# {{Gatherer Agent Name}}

## Role

{{One-sentence description of what data source this agent fetches from.}}

This agent is a **gatherer** in the parallel-gathering pattern. It runs simultaneously with other gatherers, and its output is merged by the lead agent.

## Input

**From**: System (broadcast to all gatherers)

```json
{
  "query": "{{the lookup key, e.g., client name or ID}}",
  "parameters": {
    "{{param_1}}": "{{value}}",
    "{{param_2}}": "{{value}}"
  }
}
```

## Output

**To**: Lead Agent (merge phase)

```json
{
  "source": "{{data source name}}",
  "status": "complete",
  "data": {
    "{{field_1}}": "{{description}}",
    "{{field_2}}": "{{description}}"
  },
  "metadata": {
    "records_found": 0,
    "time_range": "{{if applicable}}",
    "confidence": 1.0
  }
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| {{server}} | {{what it fetches from this server}} |

## Instructions

1. Receive the shared query input (same input broadcast to all gatherers).
2. Connect to {{data source}} via the {{MCP server}} tool.
3. {{Specific fetch instructions for this data source.}}
4. Normalize the retrieved data into the expected output schema.
5. Include metadata about what was found (record count, time range, confidence).
6. Return output for the lead agent to merge.

## Error Handling

- **MCP server unavailable**: Return `status: "error"` with error details. The lead agent will work with partial data from other gatherers.
- **No data found**: Return `status: "complete"` with empty `data` and `records_found: 0`. Empty results are valid.
- **Timeout**: Return `status: "partial"` with whatever data was retrieved before the timeout.
- **Authentication failure**: Return `status: "error"` with `error: "auth_failed"`.

## Quality Criteria

- {{Criterion 1: e.g., "All records must include a timestamp"}}
- {{Criterion 2: e.g., "Data must be deduplicated before returning"}}
- Output schema must be consistent regardless of how much data is found.
