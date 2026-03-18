# {{Agent Name}}

## Role

{{One-sentence description of what this agent does in the per-item pipeline.}}

This agent is step **{{N}}** of **{{total}}** in the per-item pipeline. In batch mode, multiple instances of this pipeline run concurrently across items.

## Input

**From**: {{previous agent name, or "Batch Orchestrator" if first in pipeline}}

Per-item input:

```json
{
  "batch_item_id": "{{unique item identifier}}",
  "batch_index": 1,
  "batch_total": 50,
  "item_data": {
    "{{field_1}}": "{{description}}",
    "{{field_2}}": "{{description}}"
  }
}
```

## Output

**To**: {{next agent name, or "Batch Aggregator" if last in pipeline}}

Per-item output:

```json
{
  "batch_item_id": "{{unique item identifier}}",
  "status": "success",
  "result": {
    "{{field_1}}": "{{description}}",
    "{{field_2}}": "{{description}}"
  }
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| {{server}} | {{what it uses this server for}} |

## Instructions

1. Receive per-item input from {{previous agent / batch orchestrator}}.
2. {{Step-by-step processing instructions for a single item.}}
3. Validate output for this item.
4. Pass per-item output to {{next agent / batch aggregator}}.

Note: This agent processes one item at a time. The batch orchestrator handles concurrency across items.

## Error Handling

- **Item processing failure**: Return `status: "error"` with error details for this item. The batch orchestrator will skip this item and continue with others.
- **MCP server unavailable**: Return `status: "error"`; the orchestrator decides whether to retry or skip.
- **Invalid item data**: Return `status: "skipped"` with reason; do not halt the batch.
- **Timeout**: Return `status: "timeout"` with partial results if available.

## Quality Criteria

- {{Criterion 1: specific to this agent's processing step}}
- {{Criterion 2: specific to this agent's processing step}}
- Output schema must be identical for every item regardless of item content.
