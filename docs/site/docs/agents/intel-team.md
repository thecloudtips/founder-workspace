# Intelligence Agent Team

> Background evaluator: A lightweight agent runs quality assessments on command outputs asynchronously, scoring results against rubrics and feeding data into the Intelligence Engine.

## Overview

The Intelligence team is different from other Founder OS agent teams. It does not have a multi-agent pipeline or a `--team` flag. Instead, it consists of a single background agent -- the Eval Judge -- that is spawned automatically by the Intelligence Engine's post-task hooks whenever a command output is sampled for quality evaluation. You never invoke this agent directly; it runs silently after your commands complete.

The purpose is continuous quality measurement. When you run `/founder-os:inbox:triage` or `/founder-os:sow:from-brief`, the Intelligence Engine may sample that execution for a Tier 2 evaluation. If sampled, the Eval Judge is spawned in the background, scores the output against a Boolean rubric (completeness, accuracy, tone, actionability, format, hallucination checks), and writes the results to the Intelligence database. Your session is never blocked -- the evaluation happens asynchronously.

Over time, these evaluations build a quality profile for each command namespace. The Intelligence Engine uses this data to detect degradation patterns, surface healing suggestions, and provide the foundation for the `/founder-os:intel:status` and `/founder-os:intel:patterns` commands. Think of the Eval Judge as the quality sensor that feeds the Intelligence Engine's learning loop.

## The Team

| Agent | Role | What It Does |
|-------|------|-------------|
| Eval Judge | Background Worker | Loads a per-namespace rubric, evaluates command output on 6 Boolean dimensions (YES/NO per dimension), computes a weighted overall score, assigns a PASS/WARN/FAIL label, and writes results to the Intelligence database. Runs on the Haiku model for speed and cost efficiency. Completes within 30 seconds. |

## Data Flow

```
Command Output → [Post-Task Hook: sampling decision]
  → [Eval Judge: rubric evaluation] → Intelligence Database
```

The post-task hook determines whether a given execution should be evaluated (based on sampling rate and namespace configuration). If sampled, the Eval Judge receives the output text, the execution ID, and the path to the relevant rubric file. It scores each dimension independently, computes the weighted total, and writes all results in a single database call.

## When This Runs

The Eval Judge is not user-triggered. It activates automatically when:

- A command execution is sampled by the Intelligence Engine's post-task hooks
- The sampling rate for that namespace is above zero (configurable via `/founder-os:intel:config`)
- The Intelligence Engine is active (not in reset state)

You can see the results of evaluations through `/founder-os:intel:status` (aggregate scores by namespace) and `/founder-os:intel:patterns` (detected quality trends and anomalies).

## Scoring Model

Each evaluation produces a score across 6 dimensions, each judged as a simple YES (1.0) or NO (0.0):

- **Completeness** -- does the output address all parts of the request?
- **Accuracy** -- are facts, numbers, and references correct?
- **Tone** -- does the output match the expected voice and register?
- **Actionability** -- can the user act on the output without further clarification?
- **Format** -- does the output follow the expected structure and formatting?
- **Hallucination** -- is the output free of fabricated information?

The weighted overall score determines the label: PASS (0.70 or above), WARN (0.50 to 0.69), or FAIL (below 0.50).

## Related

- [Intelligence Commands](../commands/intel.md) -- command reference for status, patterns, config, healing, approve, and reset
