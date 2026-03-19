# SOW Generator Agent Team

> Competing hypotheses: Three scope agents propose independent SOW options, then risk and pricing agents evaluate each, and a synthesis lead assembles the final client-ready document.

## Overview

The SOW Generator team produces a professional, three-option Statement of Work from a project brief. Rather than generating a single "best guess" scope, it uses a competing-hypotheses pattern: three scope agents independently interpret the brief at different ambition levels, then risk and pricing agents evaluate all three proposals, and the SOW Lead synthesizes everything into a polished client-ready document with a scoring matrix and clear recommendation.

This approach solves a real problem in services businesses. When a founder or project lead writes a SOW alone, they tend to anchor on one interpretation of the brief. The competing-hypotheses pattern ensures you present the client with genuine choices -- a focused core engagement, a balanced option with high-value additions, and an ambitious full-vision option -- each honestly evaluated for risk and cost.

In single-agent mode (the default), one agent reads the brief and produces a single SOW draft. The `--team` flag activates the full six-agent pipeline, which is the recommended approach for any SOW worth sending to a client. The output is a complete Markdown document with executive summary, option comparison table, three self-contained SOW sections, and a data-driven recommendation.

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| Scope Agent A | Worker (Phase 1) | Proposes a conservative scope: core deliverables only, 20% timeline buffer, strict change control, P90 effort estimates. Maximizes delivery certainty. |
| Scope Agent B | Worker (Phase 1) | Proposes a balanced scope: core requirements plus 1-2 high-value additions, 10% buffer, flexible change management, P75 effort estimates. Optimizes the value-to-effort ratio. |
| Scope Agent C | Worker (Phase 1) | Proposes an ambitious scope: full solution with proactive additions (analytics, training, integrations), zero buffer with a 10% change budget, P60 effort estimates. Shows the client what is possible. |
| Risk Agent | Worker (Phase 2) | Evaluates all three proposals across 7 risk dimensions: scope clarity, timeline realism, budget risk, technical complexity, client risk, delivery confidence, and scope creep exposure. Produces scored assessments with red/yellow/green flags. |
| Pricing Agent | Worker (Phase 2) | Calculates full pricing for each proposal: base cost, margin (20-30% by option), quoted price, budget utilization, and price-per-deliverable. Scores each option on pricing health. |
| SOW Lead | Lead (Phase 3) | Builds a weighted scoring matrix (adjusting weights by client priorities), names each package with client-friendly labels, and writes the final three-option SOW document. Includes comparison table, full SOW sections per option, and a grounded recommendation. Writes output to file and optionally logs to Notion. |

## Data Flow

```
Project Brief → [Scope A, Scope B, Scope C: independent proposals (parallel)]
  → [Risk Agent + Pricing Agent: evaluate all proposals (parallel)]
  → [SOW Lead: scoring matrix + final document] → SOW Markdown File
```

Phase 1 runs all three scope agents in parallel -- each works independently without seeing the others' proposals. Phase 2 runs the risk and pricing agents in parallel, each evaluating all three proposals. Phase 3 brings everything together: the SOW Lead builds the scoring matrix, determines the recommendation, names the packages, and writes the complete document.

## When to Use --team

The full team pipeline is designed for any SOW that will be sent to a client or used in a sales process. Specific scenarios where `--team` is the right choice:

- **Client proposals** -- when you need to present options, not just a single take-it-or-leave-it scope
- **Budget-sensitive engagements** -- the pricing agent honestly evaluates each option against the stated budget, flagging overruns rather than hiding them
- **High-stakes projects** -- the risk agent identifies structural weaknesses (missing change control, zero buffer, undefined acceptance criteria) before the client sees the document
- **Repeat business** -- presenting three packages lets the client expand or contract scope based on their current priorities without starting from scratch

For internal planning documents or rough estimates, the single-agent mode produces a faster draft that you can refine manually.

## Example

```
/founder-os:sow:from-brief --team --brief ./briefs/acme-portal.md
```

Here is what happens step by step:

1. The SOW Lead reads the project brief and distributes it to all three scope agents simultaneously.
2. Scope Agent A produces a conservative proposal: 248 hours, 10 weeks (2-week buffer), 3 core deliverables, $42,857 estimated price. Excludes analytics and integrations, recommending them for Phase 2.
3. Scope Agent B produces a balanced proposal: 398 hours, 12 weeks (1-week buffer), 5 deliverables including a CRM integration and training session, $56,667 estimated price.
4. Scope Agent C produces an ambitious proposal: 620 hours, 14 weeks (zero buffer), 7 deliverables including advanced analytics, notification integrations, and a training program, $71,875 estimated price.
5. The Risk Agent scores all three proposals. Conservative scores 8.2/10 (low risk). Balanced scores 7.4/10 (moderate risk, flagging the informal change control process). Ambitious scores 5.8/10 (elevated risk, three red flags: zero buffer, missing acceptance criteria, no change control).
6. The Pricing Agent evaluates all three. Conservative: healthy 30% margin, 86% budget utilization. Balanced: strong 25% margin, best value-per-deliverable. Ambitious: 20% margin at the floor, 44% over the stated budget.
7. The SOW Lead detects the client priorities (on-time delivery, budget predictability) and applies 70/30 risk/pricing weighting. Builds the scoring matrix: Conservative 8.29, Balanced 7.88, Ambitious 5.71.
8. The SOW Lead names the packages -- Foundation Package, Growth Package, and Transformation Package -- and writes the complete Markdown document with all sections.
9. The output file is written to `./sow-output/sow-acme-corp-2026-03-19.md` and a record is logged to the Notion Deliverables database.

## Related

- [SOW Commands](../commands/sow.md) -- command reference for generate and from-brief
