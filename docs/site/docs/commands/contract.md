# Contract Analyzer

> Analyze contracts to extract key terms across seven categories, detect legal risks with Red/Yellow/Green classification, and compare clauses against standard freelancer and agency benchmarks.

## Overview

The Contract Analyzer reads legal documents in PDF, DOCX, Markdown, or plain text format and produces a structured analysis report. It auto-detects the contract type (Service Agreement, NDA, Freelance, Agency, Employment), identifies standard sections, extracts key terms across seven categories, and flags legal risks using a RAG classification system. The output is plain English designed for founders, not lawyers -- every risk flag includes a concrete explanation and a suggested counter-proposal.

Two commands serve different analysis depths. Use `analyze` for a standalone risk assessment of any contract. Use `compare` when you want to evaluate the contract against standard freelancer and agency benchmarks, producing a term-by-term deviation report with specific counter-proposal language for every clause that falls outside acceptable ranges.

Both commands include a disclaimer that the analysis is informational only and does not constitute legal advice. When Red flags are detected, the recommendation is always to consult a qualified attorney before signing.

Analyses are recorded in the **Founder OS HQ - Deliverables** database with `Type = "Contract"` when Notion is connected. If Notion is unavailable, the full analysis is displayed in your terminal.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Filesystem | Yes | Read contract files from local storage |
| Notion CLI | No | Save analysis results to HQ Deliverables database |

## Commands

### `/founder-os:contract:analyze`

**What it does** -- Reads a contract file, detects the contract type, identifies its structure, extracts key terms across seven categories (Payment, Duration/Renewal, IP, Confidentiality, Liability, Termination, Warranty), runs a completeness checklist, and detects legal risks with RAG severity classification. Produces a comprehensive analysis report with risk flags, checklist gaps, and prioritized recommendations.

**Usage:**

```
/founder-os:contract:analyze [file-path]
```

**Example scenario:**

> A new client sends you a service agreement PDF. Before signing, run `/founder-os:contract:analyze ~/Documents/acme-service-agreement.pdf`. The analysis detects it is a Service Agreement, extracts Net-60 payment terms and a one-sided indemnification clause, and flags two Red risks: unlimited liability and no pre-existing IP carve-out. The recommendations section gives you specific counter-proposal language to bring to the negotiation.

**What you get back:**

A structured report showing the contract type, parties, overall risk level (Red/Yellow/Green), a key terms table with extracted details and status indicators for all seven categories, a risk flags table with severity, category, clause excerpts, and mitigation suggestions, a checklist of any missing standard sections, and prioritized recommendations with Red items first.

**Flags:**

- If no file path is provided, you are prompted for one.

**Supported formats:** PDF, DOCX, MD, TXT

---

### `/founder-os:contract:compare`

**What it does** -- Performs the full analysis from `analyze`, then compares every extracted term against a standard-terms reference to identify deviations. For each deviation, the report shows what the contract says, what the standard says, how they differ, the severity of the deviation, and a specific counter-proposal to negotiate toward the standard. You can supply your own custom standards file to tailor the benchmarks to your business.

**Usage:**

```
/founder-os:contract:compare [file-path] [--standards=PATH]
```

**Example scenario:**

> You are reviewing an agency retainer agreement and want to see how its terms compare to industry norms. Run `/founder-os:contract:compare contracts/agency-retainer.pdf`. The comparison reveals the contract's liability cap is set at $1,000 on a $50,000 engagement (Yellow deviation), the non-compete is 36 months worldwide (Red deviation), and the payment terms are Net-90 with no late penalty (Yellow). Each deviation comes with counter-proposal language you can send directly to the other party.

**What you get back:**

Everything from `analyze`, plus a term-by-term comparison table showing Contract Terms vs. Standard Range with deviation descriptions and severity for all seven categories. A separate Deviations from Standard table provides detailed counter-proposal language for every non-Green deviation. Risk flags from the standalone analysis are merged with comparison-based flags, with the higher severity preserved when both analyses flag the same clause.

**Flags:**

- `--standards=PATH` -- Path to a custom standard-terms file. Default: built-in freelancer/agency benchmarks. This lets you define your own acceptable ranges for payment terms, liability caps, non-compete durations, and other contract elements.

---

## The Seven Key Term Categories

| Category | What Gets Extracted |
|----------|-------------------|
| **Payment** | Total amount or rate, payment schedule, currency, late penalties, expense terms |
| **Duration / Renewal** | Start date, end date, auto-renewal provisions, notice periods |
| **IP** | Ownership assignment, work-for-hire status, pre-existing IP carve-outs, license grants |
| **Confidentiality** | Definition scope, survival period, exclusions, mutual vs. one-way obligations |
| **Liability** | Liability caps, indemnification (mutual vs. one-way), consequential damages exclusions |
| **Termination** | For-cause and for-convenience provisions, notice periods, cure periods, post-termination obligations |
| **Warranty** | Representations, disclaimers, warranty periods, remedies for breach |

## Risk Classification

Every flagged clause is classified into one of three severity tiers:

| Tier | Meaning | Examples |
|------|---------|---------|
| **Red** | Could cause significant financial or legal harm. Consult a lawyer. | Unlimited liability, one-sided indemnification, perpetual IP assignment, pay-when-paid clauses |
| **Yellow** | Deviates from standard practice. Review carefully before signing. | Vague payment terms, broad non-solicitation, auto-renewal without clear opt-out |
| **Green** | Standard, balanced clause. No modification needed. | Mutual indemnification, Net-30 payment terms, 30-day termination notice |

The overall risk level is Red if any Red flag exists, Yellow if any Yellow flag exists with no Red flags, and Green when all clauses are standard.

## Contract Types Detected

| Type | Primary Signals |
|------|----------------|
| Service Agreement | "scope of work", "deliverables", "service provider" |
| NDA | "non-disclosure", "confidential information", "receiving party" |
| Freelance Contract | "independent contractor", "1099", "own tools and equipment" |
| Agency Agreement | "agency of record", "retainer", "creative services" |
| Employment Contract | "salary", "benefits", "at-will", "employee" |
| Other | Default when signals are ambiguous |

## Tips & Patterns

- **Run `analyze` first** on any contract you receive. It takes seconds and might catch something that saves you thousands.
- **Use `compare` before signing** to see exactly how the contract's terms differ from industry standards. The counter-proposal language is ready to copy into your response.
- **Create custom standards** with `--standards=my-terms.md` if your business has specific requirements (e.g., you always need Net-30, your liability cap must match contract value, your IP must include a portfolio-use carve-out).
- **Every analysis includes a disclaimer** -- this is not legal advice. When Red flags appear, the recommendation is always to consult a qualified attorney.
- Analyses are saved to Notion with the Company relation set automatically when a contract party matches a company in your CRM.

## Related Namespaces

- **[Proposal](/docs/commands/proposal)** -- Proposals define the scope, pricing, and terms that contracts formalize. Analyze the final contract against your original proposal to ensure nothing was changed unfavorably.
- **[Invoice](/docs/commands/invoice)** -- Contract payment terms define what invoices should look like. When you process invoices, the extracted payment terms from contract analysis provide the benchmark.
- **[Health](/docs/commands/health)** -- Contract disputes or unfavorable terms can explain declining client health scores. Review the contract when a client relationship shows signs of strain.
