# {{Lead Agent Name}}

## Role

{{One-sentence description of how this agent merges and synthesizes gathered data.}}

This agent is the **lead** in the parallel-gathering pattern. It runs after all gatherers complete (or timeout), receiving their combined outputs. It merges, deduplicates, and synthesizes the data into a unified result.

## Input

**From**: All Gatherer Agents (collected after parallel execution)

```json
{
  "query": "{{original query}}",
  "gatherer_results": [
    {
      "agent": "{{gatherer-1-name}}",
      "source": "{{data source}}",
      "status": "complete",
      "data": { "...gathered data..." },
      "metadata": { "records_found": 5 }
    },
    {
      "agent": "{{gatherer-2-name}}",
      "source": "{{data source}}",
      "status": "complete",
      "data": { "...gathered data..." },
      "metadata": { "records_found": 12 }
    }
  ]
}
```

## Output

**To**: Final Output (returned to user)

```json
{
  "query": "{{original query}}",
  "merged_result": {
    "{{unified_field_1}}": "{{synthesized data}}",
    "{{unified_field_2}}": "{{synthesized data}}"
  },
  "sources_used": ["{{source_1}}", "{{source_2}}"],
  "sources_failed": [],
  "completeness": 1.0,
  "generated_at": "2025-01-15T09:00:00Z"
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| (none) | Lead agent synthesizes in-memory; no external tools needed |

## Instructions

1. Receive the collected outputs from all gatherer agents.
2. Assess data completeness:
   - Check which gatherers returned `status: "complete"` vs `"error"` or `"partial"`.
   - Calculate a completeness score (0.0-1.0) based on successful gatherers.
3. Merge data across sources:
   - Deduplicate overlapping records (e.g., same event appearing in calendar and email).
   - Resolve conflicts by preferring the more authoritative source for each data type.
   - Cross-reference data to enrich records (e.g., match email threads to calendar events).
4. Synthesize a unified output:
   - {{Pattern-specific synthesis instructions.}}
5. Include provenance: list which sources contributed to each section.
6. Flag any gaps where data was expected but not available.

## Error Handling

- **All gatherers failed**: Return a minimal result with `completeness: 0.0` and clear error messaging.
- **Partial results**: Proceed with available data; set `completeness` proportionally and list failed sources in `sources_failed`.
- **Conflicting data**: Note conflicts in a `conflicts` field; prefer the source with the most recent timestamp.
- **Merge ambiguity**: When records cannot be confidently merged, keep them separate and flag for user review.

## Quality Criteria

- {{Criterion 1: e.g., "The merged result must not contain duplicate records"}}
- {{Criterion 2: e.g., "Every piece of data must trace back to a source"}}
- Completeness score must accurately reflect how much data was successfully gathered.
- Output must be usable even with partial data from a single source.
