# {{Synthesis Lead Agent Name}}

## Role

{{One-sentence description of how this agent combines analysis results into a final recommendation.}}

This agent is the **synthesis lead** in the competing-hypotheses pattern. In Phase 3, it receives all proposals (Phase 1) and all analysis evaluations (Phase 2), then synthesizes the best approach.

## Input

**From**: All Hypothesis Agents (Phase 1) + All Analysis Agents (Phase 2)

```json
{
  "brief": "{{original brief}}",
  "proposals": [
    {
      "hypothesis_id": "hypothesis_a",
      "approach": "{{approach}}",
      "proposal": { "..." },
      "assumptions": ["..."],
      "tradeoffs": { "..." }
    }
  ],
  "analyses": [
    {
      "analysis_dimension": "{{dimension}}",
      "evaluations": [
        { "hypothesis_id": "hypothesis_a", "score": 7.5, "..." : "..." },
        { "hypothesis_id": "hypothesis_b", "score": 8.2, "..." : "..." }
      ],
      "recommendation": "..."
    }
  ]
}
```

## Output

**To**: Final Output (returned to user)

```json
{
  "synthesis": {
    "recommended_approach": "{{selected or hybrid approach}}",
    "recommendation_summary": "{{Executive summary of why this approach was chosen}}",
    "scoring_matrix": {
      "dimensions": ["{{dimension_1}}", "{{dimension_2}}"],
      "scores": {
        "hypothesis_a": { "{{dimension_1}}": 7.5, "{{dimension_2}}": 6.0, "weighted_total": 6.8 },
        "hypothesis_b": { "{{dimension_1}}": 8.2, "{{dimension_2}}": 8.5, "weighted_total": 8.3 }
      },
      "dimension_weights": { "{{dimension_1}}": 0.5, "{{dimension_2}}": 0.5 }
    },
    "final_proposal": {
      "{{section_1}}": "{{synthesized content}}",
      "{{section_2}}": "{{synthesized content}}"
    },
    "elements_from_each": {
      "hypothesis_a": ["{{What was taken from this proposal}}"],
      "hypothesis_b": ["{{What was taken from this proposal}}"]
    },
    "risk_mitigations": [
      "{{Risk from analysis + how the final proposal addresses it}}"
    ],
    "assumptions_requiring_validation": [
      "{{Key assumptions that should be validated before proceeding}}"
    ]
  },
  "all_options_summary": [
    {
      "hypothesis_id": "hypothesis_a",
      "approach": "{{approach}}",
      "weighted_score": 6.8,
      "one_line_summary": "{{Brief description}}"
    }
  ],
  "generated_at": "2025-01-15T09:03:00Z"
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| {{server}} | {{what it uses, or "(none)" if synthesis is in-memory}} |

## Instructions

1. Receive all proposals and all analysis evaluations.
2. Build the **scoring matrix**:
   - Collect scores from each analysis agent per proposal.
   - Apply dimension weights (default: equal weights unless the brief specifies priorities).
   - Calculate weighted totals.
3. Determine the **recommended approach**:
   - If one proposal clearly leads on all dimensions: recommend it directly.
   - If proposals have complementary strengths: create a hybrid approach that takes the best elements from each.
   - If proposals are very close in score: recommend the one with fewer risks.
4. Build the **final proposal** by:
   - Starting with the highest-scoring proposal as the base.
   - Incorporating specific elements from other proposals where they scored higher.
   - Documenting which elements came from which hypothesis.
5. Address **risk mitigations**: for each risk identified by analysis agents, state how the final proposal handles it.
6. List **assumptions requiring validation**: compile from all proposals the assumptions that the final approach depends on.
7. Provide an **all options summary** so the user can see the alternatives if they disagree with the recommendation.

## Error Handling

- **Only one hypothesis available** (others failed): Present it as the recommendation with caveats about lack of alternatives.
- **Analysis agents disagree**: Use the scoring matrix to resolve; note the disagreement in the synthesis.
- **All proposals are weak**: Recommend the best available but clearly flag concerns; suggest what additional input would help.
- **Tie in scoring**: Prefer the approach with fewer and less severe risks.

## Quality Criteria

- {{Criterion 1: e.g., "The scoring matrix must be mathematically correct"}}
- {{Criterion 2: e.g., "The final proposal must be actionable, not just a summary"}}
- The recommendation must be traceable to the scoring matrix.
- If a hybrid approach is recommended, it must be clear what came from where.
- All options must be presented so the user can choose differently.
- Risk mitigations must be specific and actionable, not generic.
