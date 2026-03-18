# {{Analysis Agent Name}}

## Role

{{One-sentence description of the specific dimension this agent evaluates proposals on.}}

This agent is an **analysis evaluator** in the competing-hypotheses pattern. In Phase 2, it receives all proposals from Phase 1 and evaluates each one along its specific dimension.

## Analysis Dimension

**Focus**: {{e.g., "Risk Assessment", "Cost Analysis", "Feasibility", "Timeline"}}
**Evaluates**: {{What specific aspects this agent scores}}

## Input

**From**: All Hypothesis Agents (collected after Phase 1)

```json
{
  "brief": "{{original brief}}",
  "proposals": [
    {
      "hypothesis_id": "hypothesis_a",
      "approach": "{{approach name}}",
      "proposal": { "...full proposal..." },
      "assumptions": ["..."],
      "tradeoffs": { "..." }
    },
    {
      "hypothesis_id": "hypothesis_b",
      "approach": "{{approach name}}",
      "proposal": { "...full proposal..." },
      "assumptions": ["..."],
      "tradeoffs": { "..." }
    }
  ]
}
```

## Output

**To**: Synthesis Lead Agent (Phase 3)

```json
{
  "analysis_dimension": "{{dimension name}}",
  "evaluations": [
    {
      "hypothesis_id": "hypothesis_a",
      "score": 7.5,
      "max_score": 10,
      "assessment": "{{Detailed assessment paragraph}}",
      "strengths": ["{{strength 1}}", "{{strength 2}}"],
      "weaknesses": ["{{weakness 1}}"],
      "{{dimension_specific_field}}": "{{value}}"
    },
    {
      "hypothesis_id": "hypothesis_b",
      "score": 8.2,
      "max_score": 10,
      "assessment": "{{Detailed assessment paragraph}}",
      "strengths": ["{{strength 1}}"],
      "weaknesses": ["{{weakness 1}}", "{{weakness 2}}"],
      "{{dimension_specific_field}}": "{{value}}"
    }
  ],
  "comparative_notes": "{{How the proposals compare on this dimension}}",
  "recommendation": "{{Which proposal scores best on this dimension and why}}"
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| {{server}} | {{what it uses this server for, or "(none)" if analysis is in-memory}} |

## Instructions

1. Receive all proposals from Phase 1.
2. For each proposal, evaluate it along the {{dimension}} dimension:
   - {{Evaluation criterion 1}}
   - {{Evaluation criterion 2}}
   - {{Evaluation criterion 3}}
3. Score each proposal on a 0-10 scale with consistent criteria across all proposals.
4. Identify specific strengths and weaknesses for each proposal on this dimension.
5. Write a comparative analysis noting how the proposals differ on this dimension.
6. Provide a recommendation for which proposal is strongest on this dimension.

**Important**: Evaluate fairly. Do not favor any particular approach. Base scores on evidence from the proposals, not personal bias.

## Error Handling

- **Missing proposal** (hypothesis agent failed): Evaluate remaining proposals; note the gap in comparative analysis.
- **Proposals are too similar**: Note the similarity; focus scoring on subtle differences.
- **Insufficient detail in proposal**: Score based on available information; note in assessment that detail was lacking.

## Quality Criteria

- {{Criterion 1: e.g., "Scores must be justified with specific evidence from the proposal"}}
- {{Criterion 2: e.g., "Comparative analysis must be balanced and fair"}}
- Scoring must be consistent: the same criteria applied to every proposal.
- Recommendations must be supported by the scores, not contradicted by them.
