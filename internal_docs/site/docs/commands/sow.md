# SOW Generator

> Generate client-ready Statements of Work with three scope options — conservative, balanced, and ambitious — from a project brief or interactive interview.

## Overview

The SOW Generator turns a project brief into a professional Statement of Work document with three named packages a client can compare side by side. Each option comes with its own scope, timeline, pricing, risk summary, and acceptance criteria. The recommended option is highlighted with a rationale grounded in the client's stated priorities.

You can run it in two modes. The default single-agent mode reads your brief, applies three built-in skills (scope definition, SOW writing, and risk assessment), and produces the complete document in under a minute. When you need deeper analysis, the `--team` flag activates a 6-agent competing-hypotheses pipeline: three scope agents propose independently, a risk agent and pricing agent evaluate each proposal, and a synthesis lead assembles the final deliverable with a scored comparison matrix.

The output is a Markdown file ready for client delivery. Founder OS also tracks every generated SOW in your Notion Deliverables database with Company and Deal relations, so your CRM stays current without extra effort.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Filesystem | Yes | Read briefs, write SOW output files |
| Notion CLI | No | Track SOW records in Deliverables database, look up historical SOW context, resolve Company and Deal relations |

## Commands

### `/founder-os:sow:generate`

**What it does** — Generates a Statement of Work from an inline brief or through an interactive interview. If you provide a brief as an argument, it proceeds immediately. If you run it without arguments, it walks you through a structured interview covering client name, project description, deliverables, budget, timeline, and priorities.

**Usage:**

```
/founder-os:sow:generate [brief] --team --client=NAME --budget=AMOUNT --weeks=N --output=PATH
```

**Example scenario:**

> You just finished a discovery call with a SaaS company that needs a customer portal. You type `/founder-os:sow:generate "Build a customer portal for Acme Corp with dashboard, auth, and reporting" --client="Acme Corp" --budget=50000 --weeks=12` and receive a complete three-option SOW within a minute — Foundation Package at $42,857, Growth Package at $56,667, and Transformation Package at $71,875. The Growth Package is marked as recommended with a rationale tied to the client's stated priority of on-time delivery.

**What you get back:**

A summary table comparing all three options by scope, timeline, price, and risk level, plus the full SOW saved to your output directory. The document includes a cover page, executive summary, three self-contained option sections (each with deliverables, timeline, investment, assumptions, change management, and terms), a comparison table, and a provider recommendation paragraph.

If Notion is connected, the SOW is also logged to your Deliverables database with Type set to "SOW" and linked to the matching Company and Deal records in your CRM.

**Flags:**

- `--team` — Activate the full 6-agent pipeline (3 scope agents, 1 risk agent, 1 pricing agent, 1 synthesis lead)
- `--client=NAME` — Set the client name for the SOW header
- `--budget=AMOUNT` — Set a maximum budget constraint (e.g., `$50,000` or `50000`)
- `--weeks=N` — Set a maximum timeline in weeks
- `--output=PATH` — Output directory for the generated file (default: `./sow-output/`)

---

### `/founder-os:sow:from-brief`

**What it does** — Loads a pre-written project brief from a local file or Notion page URL, extracts client name, project description, budget, timeline, and priorities, then generates a three-option SOW. This is the "bring your own brief" mode — it skips the interactive interview and proceeds directly from the document content.

**Usage:**

```
/founder-os:sow:from-brief [file-or-url] --team --client=NAME --budget=AMOUNT --weeks=N --output=PATH
```

**Example scenario:**

> A prospect sent you a detailed RFP as a Markdown file. You run `/founder-os:sow:from-brief ./briefs/greenleaf-crm-rfp.md --team --output=./proposals/` and the 6-agent pipeline reads the brief, generates three independent scope proposals, evaluates risk and pricing across all three, and synthesizes a final SOW document. The pipeline summary shows each agent's status and duration, plus a scoring matrix ranking the options.

**What you get back:**

A brief confirmation showing the extracted fields (client, project, budget, timeline, priorities), followed by the generated SOW file. In team mode, you also get a pipeline results table showing each agent's status and timing, along with the full scoring matrix.

The command supports `.md`, `.txt`, `.pdf`, and `.json` file formats. For Notion URLs, it fetches the page content through the Notion CLI.

If the source brief matches a Proposal already tracked in your Deliverables database, the SOW record is automatically linked to it via the Source Deliverable relation.

**Flags:**

- `--team` — Activate the full 6-agent pipeline
- `--client=NAME` — Override the client name extracted from the brief
- `--budget=AMOUNT` — Override the budget extracted from the brief
- `--weeks=N` — Override the timeline extracted from the brief
- `--output=PATH` — Output directory (default: `./sow-output/`)

---

## The Team Pipeline

When you pass the `--team` flag to either command, Founder OS runs a 6-agent competing-hypotheses pipeline across three phases:

**Phase 1 — Parallel Hypothesis Generation.** Three scope agents interpret the brief independently and simultaneously:

- **Scope Agent A** (Conservative) — Core deliverables only, 20% timeline buffer, strict change control. P90 confidence level.
- **Scope Agent B** (Balanced) — Core plus 1-2 high-value additions, 10% buffer, flexible change management. P75 confidence.
- **Scope Agent C** (Ambitious) — Full vision with proactive additions, zero buffer with a 10% change budget, agile scope management. P60 confidence.

**Phase 2 — Parallel Analysis.** Two analysis agents evaluate all three Phase 1 proposals:

- **Risk Agent** — Scores each proposal across 7 risk dimensions (scope clarity, timeline realism, budget risk, technical complexity, client risk, delivery confidence, scope creep exposure). Produces red flags, yellow flags, and green notes with specific mitigation suggestions.
- **Pricing Agent** — Calculates base cost, margin, quoted price, budget utilization, and price-per-deliverable for each option. Scores pricing health on a 0-10 scale.

**Phase 3 — Synthesis.** The SOW Lead builds a weighted scoring matrix, names each option with a client-friendly package name, and writes the final document with all three options, a comparison table, and a recommendation paragraph grounded in the client's stated priorities.

The pipeline requires at least 2 of 3 scope agents to succeed. If one agent fails, the remaining two options are still synthesized into the final document.

---

## Tips & Patterns

- **Start with `generate`, graduate to `from-brief`**: Use the interactive interview while you are learning the system. Once you have a standard brief format, switch to `from-brief` for faster throughput.
- **Use `--team` for high-stakes proposals**: The competing-hypotheses pipeline surfaces risk and pricing insights that a single-agent pass may miss. For a $5,000 project, the default mode is fast and sufficient. For a $75,000 engagement, the 60-second pipeline investment pays for itself.
- **Budget and timeline overrides are powerful**: If a client says "we only have $40,000," pass `--budget=40000` and the generator adjusts scope downward for options that exceed the constraint, noting exactly what was cut and why.
- **The output is Markdown by design**: Convert to PDF, DOCX, or your branded template downstream. The structured Markdown format makes it easy to copy sections into your existing proposal templates.
- **Historical context improves over time**: When Notion is connected, the generator searches for past SOWs matching the client or project type. The more SOWs you generate, the better calibrated the scope and pricing estimates become.

## Related Namespaces

- **[Invoice](/docs/commands/invoice)** — Process invoices that result from signed SOWs
- **[Contract](/docs/commands/contract)** — Analyze and compare the contracts that follow SOW approval
- **[Proposal](/docs/commands/proposal)** — Create proposals that often precede SOW generation; SOW records link back to their source Proposal via the Source Deliverable relation
- **[Client](/docs/commands/client)** — Load client context before generating a SOW for richer personalization
