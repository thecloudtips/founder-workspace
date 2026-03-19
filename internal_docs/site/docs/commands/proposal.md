# Proposal Automator

> Generate professional 7-section client proposals with three pricing packages, CRM personalization, and a SOW-ready brief file -- from a conversation or an existing brief.

## Overview

The Proposal Automator produces complete client proposals in Markdown format with a proven 7-section structure: Cover Letter, Executive Summary, Understanding & Approach, Scope of Work, Timeline & Milestones, Pricing (three packages), and Terms & Conditions. Every proposal also generates a companion SOW-compatible brief file, ready for handoff to the SOW Generator.

Two commands serve different starting points. Use `create` when you are starting from scratch -- it walks you through an interactive brief collection or accepts a brief file. Use `from-brief` when you already have a brief document (local file or Notion page) and want to generate the proposal directly from it.

When your Notion CRM is connected, the system enriches proposals with client context: past project history, relationship details, industry information, and known preferences. This context shapes the Cover Letter, informs the Understanding & Approach section, and helps calibrate pricing to what the client has invested before. Completed proposals are tracked in the **Founder OS HQ - Deliverables** database with `Type = "Proposal"`, and Company/Deal relations are set automatically when a CRM match exists.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Filesystem | Yes | Write proposal and brief files to the output directory |
| Notion CLI | No | CRM context enrichment and proposal tracking in HQ Deliverables |

## Commands

### `/founder-os:proposal:create`

**What it does** -- Generates a complete professional proposal through an interactive workflow. Resolves client context from your CRM, collects the project brief (interactively or from a file), generates all seven sections with three pricing packages, saves the proposal and a SOW-compatible brief file, and records the result in Notion.

**Usage:**

```
/founder-os:proposal:create [client] [--output=PATH] [--brief=FILE]
```

**Example scenario:**

> A prospect asks for a proposal for a new customer portal. Run `/founder-os:proposal:create "Acme Corp"` and you are walked through five questions: project description, key deliverables, target timeline, budget range, and special requirements. The system pulls Acme's history from your CRM, generates a personalized cover letter referencing your past work together, scopes three packages (Foundation at $18K, Growth at $30K, Transformation at $45K), and saves both the proposal and a brief file. The whole process takes about two minutes.

**What you get back:**

Two Markdown files saved to your output directory: the complete 7-section proposal (`proposal-acme-corp-2026-03-19.md`) and a SOW-compatible brief (`brief-acme-corp-2026-03-19.md`). The output summary shows the client name, file paths, Notion status, and a package comparison table with scope, timeline, and pricing for all three tiers. The recommended package is highlighted.

**Flags:**

- `--output=PATH` -- Output directory (default: `./proposals/`)
- `--brief=FILE` -- Use an existing brief file instead of interactive collection

---

### `/founder-os:proposal:from-brief`

**What it does** -- Generates a complete proposal from an existing brief document. Accepts a local Markdown or text file, or a Notion page URL. Extracts the client name, project description, deliverables, constraints, and special requirements from the brief, then generates the full 7-section proposal with three pricing packages. Gaps in the brief are marked for review rather than blocking generation.

**Usage:**

```
/founder-os:proposal:from-brief [file-or-url] [--client=NAME] [--output=PATH]
```

**Example scenario:**

> After a discovery call, you typed up meeting notes in a Markdown file with the client's requirements. Run `/founder-os:proposal:from-brief meeting-notes.md --client="TechStart"` and the system extracts the project details from your notes, resolves TechStart's CRM context, and generates a polished proposal. Any information that could not be extracted from the notes is flagged with review comments so you know exactly what to fill in.

**What you get back:**

The same two-file output as `create`: a complete proposal and a SOW-compatible brief. If the brief was missing key information (no budget range, unclear deliverables), those sections include `<!-- NEEDS REVIEW -->` markers and the output summary notes what was missing.

**Flags:**

- `--client=NAME` -- Override the client name extracted from the brief
- `--output=PATH` -- Output directory (default: `./proposals/`)

---

## The 7-Section Proposal Structure

| Section | Purpose | Key Rules |
|---------|---------|-----------|
| **Cover Letter** | Establish rapport with a personalized introduction | References the client's specific situation. Never opens with "Dear Sir/Madam." |
| **Executive Summary** | Problem-solution-value at a glance | Under 300 words. A decision-maker should understand the full engagement from this section alone. |
| **Understanding & Approach** | Demonstrate comprehension of the client's challenges | Identifies 2-3 underlying problems the client may not have articulated. |
| **Scope of Work** | Define deliverables with acceptance criteria | Includes explicit Exclusions and Assumptions subsections. |
| **Timeline & Milestones** | Phase breakdown with week numbers | Every deliverable maps to a phase. Client-side dependencies noted explicitly. |
| **Pricing** | Three packages with comparison table | Leads with scope, not price. Recommended package is marked. |
| **Terms & Conditions** | Payment, IP, change control, confidentiality | Milestone-based payment tied to deliverable acceptance, not dates. |

## Three-Tier Pricing

Every proposal includes exactly three packages following the good-better-best framework:

| Tier | Role | Typical Scope |
|------|------|---------------|
| **Starter** | Entry point -- solves the core problem | Core deliverables only, shortest timeline, 1 revision round |
| **Professional** (Recommended) | Best value-to-scope ratio | Core + key enhancements, standard timeline, 2 revision rounds, 2-week hypercare |
| **Enterprise** | Full vision for flexible budgets | Everything + stretch deliverables, extended timeline, unlimited revisions, 4-week hypercare |

Packages are named to signal value and fit (e.g., Foundation / Growth / Transformation), not size or price. The comparison table always leads with scope, with investment as the last row.

## Tips & Patterns

- **Start with `create` for new prospects** where you need to gather requirements interactively. Use `from-brief` when you already have notes or a scope document.
- **Set up business context files** (`_infrastructure/context/active/business-info.md`) to automatically include your company name, service descriptions, and standard terms in every proposal.
- **The SOW brief file is a direct input** to `/founder-os:sow:from-brief`. After the client selects a package, generate the SOW in one command.
- **CRM context makes a visible difference** in proposal quality. When your Notion CRM has the client's industry, past projects, and relationship history, the Cover Letter and Understanding & Approach sections reference real details instead of generic language.
- **Proposals are tracked in Notion** with status "Draft" and the selected package defaults to "None". Update the record when the client makes a decision.

## Related Namespaces

- **[Contract](/docs/commands/contract)** -- After a proposal is accepted and a contract is signed, use Contract Analyzer to review the final agreement against your proposed terms.
- **[Invoice](/docs/commands/invoice)** -- The pricing and payment terms in your proposal define what invoices should look like. Process invoices against the same client in the Finance database to maintain end-to-end visibility.
- **[Health](/docs/commands/health)** -- Active proposals contribute to the relationship context that health scoring uses. A client with a pending proposal is a client worth monitoring.
