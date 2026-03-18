---
description: Analyze a contract to extract key terms, detect risks, and produce a structured report
argument-hint: "[file-path]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:contract:analyze

Read and analyze a legal contract document to extract key terms across 7 categories, detect legal risks using RAG classification, and produce a comprehensive analysis report. Optionally save results to Notion.

## Load Skills

Read the contract-analysis skill at `${CLAUDE_PLUGIN_ROOT}/skills/contract/contract-analysis/SKILL.md` for contract structure recognition, file format handling, contract type detection, key term extraction patterns, output structure, and Notion integration.

Read the legal-risk-detection skill at `${CLAUDE_PLUGIN_ROOT}/skills/contract/legal-risk-detection/SKILL.md` for RAG classification system, risk categories, risk flag taxonomy, overall risk level calculation, and output structure.

## Parse Arguments

Extract the file path from `$ARGUMENTS`:
- `[file-path]` (required) — path to the contract file to analyze. Supported formats: PDF, DOCX, MD, TXT. If no argument provided, prompt the user: "Provide the path to the contract file to analyze. Supported formats: PDF, DOCX, MD, TXT."

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `contract` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.

## Observation: Start
Before executing, record a pre_command event to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `pre_command`
- Plugin: `contract-analyzer`
- Command: `contract-analyze`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'contract-analyzer' OR plugin IS NULL) AND (command = 'contract-analyze' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context for this execution
3. Notify: `[Intel] Applying learned preference: "{description}"` for each pattern applied
4. If the Intelligence database does not exist, skip silently and continue execution

## Self-Healing: Error Recovery
If any error occurs during this command:
1. Classify the error using rules from `_infrastructure/intelligence/self-healing/SKILL.md`
2. Check if healing is enabled: query `SELECT value FROM config WHERE key = 'healing.enabled'` from Intelligence DB
3. For transient errors: retry with exponential backoff (2s, 5s, 15s)
4. For recoverable errors: look up fix in healing_patterns table, apply if found
5. For degradable errors: consult fallback registry in `_infrastructure/intelligence/self-healing/fallback-registry/SKILL.md`, execute fallback path
6. For fatal errors: stop and present error with suggested fix
7. Always notify: `[Heal] {description of what happened and what was done}`
8. Record error event to Intelligence DB with recovery_attempted field
9. If Intelligence DB is unavailable, fall back to existing error handling (no self-healing)

## Analysis Workflow

1. **Validate file**: Confirm the file exists and is a supported format (PDF, DOCX, MD, TXT). If the file does not exist or format is unsupported, report the error and stop.

2. **Read contract**: Read the file content using the Filesystem MCP or Read tool. For all formats, treat the full content as the contract text.

3. **Detect contract type**: Analyze content to classify as one of: Service Agreement, NDA, Freelance, Agency, Employment, Other. Follow the contract type detection rules from the contract-analysis skill.

4. **Identify structure**: Recognize contract sections (Parties, Scope, Payment, IP, Confidentiality, Liability, Termination, Dispute Resolution, Miscellaneous). Handle numbered clauses, lettered sub-clauses, and un-numbered paragraph formats.

5. **Extract key terms**: For each of the 7 categories (Payment, Duration/Renewal, IP, Confidentiality, Liability, Termination, Warranty), extract specific terms. Consult `${CLAUDE_PLUGIN_ROOT}/skills/contract/contract-analysis/references/clause-patterns.md` for detailed extraction patterns and examples.

6. **Run checklist**: Verify the contract against the review checklist at `${CLAUDE_PLUGIN_ROOT}/templates/contract-checklist.md`. Note any missing sections or unchecked items.

7. **Detect risks**: Apply the legal-risk-detection skill to evaluate each extracted term and clause. Assign RAG severity (Red/Yellow/Green) to each finding. Consult `${CLAUDE_PLUGIN_ROOT}/skills/contract/legal-risk-detection/references/risk-patterns.md` for the comprehensive risk pattern library.

8. **Calculate overall risk level**: Red if ANY Red flag exists, Yellow if ANY Yellow flag and no Red flags, Green if all flags are Green or no flags found.

9. **Compile report**: Assemble the structured analysis report following the output format below.

## Notion Integration

1. **Discover database**: Search Notion for "Founder OS HQ - Deliverables" first. If not found, fall back to legacy "Contract Analyzer - Analyses". If neither exists, skip Notion (do NOT lazy-create).
2. **Save analysis**: Create a new record with Type = "Contract" and the extracted data. Map Contract Type values: "Service Agreement" → "SaaS", "Other" → "Vendor". Set Status = "Draft" on creation.
3. **Company relation** (HQ DB only): Look up contract parties in CRM Pro "Companies" (or "Founder OS HQ - Companies"). If a match is found, set the Company relation. Leave empty if no match.
4. **Idempotent updates**: If a record with the same Title already exists (filtered by Type = "Contract" in HQ DB), update it rather than creating a duplicate.

## Graceful Degradation

If Notion CLI is unavailable or neither database is found:
- Output the full analysis report as structured text in chat
- Include all fields and risk flags
- Warn: "Notion unavailable — displaying results in chat. Analysis was not saved to the database. Configure Notion CLI per `/founder-os:setup:notion-cli`."

If the contract file cannot be read (permissions, corruption):
- Report the specific error
- Suggest checking file path and permissions

## Output Format

Display the analysis report:

```
> **Disclaimer**: This analysis is for informational purposes only and does not constitute legal advice. Consult a qualified attorney for legal guidance.

## Contract Analysis Report

**File**: [file path]
**Contract Type**: [detected type]
**Parties**: [party 1] ↔ [party 2]
**Overall Risk Level**: [🔴 Red / 🟡 Yellow / 🟢 Green] — [risk summary sentence]
**Saved to Notion**: [Yes/No]

---

### Summary

[2-3 sentence summary of the contract's key terms and overall assessment]

---

### Key Terms

| Category | Extracted Terms | Status |
|----------|----------------|--------|
| Payment | [details] | [🟢/🟡/🔴] |
| Duration/Renewal | [details] | [🟢/🟡/🔴] |
| IP | [details] | [🟢/🟡/🔴] |
| Confidentiality | [details] | [🟢/🟡/🔴] |
| Liability | [details] | [🟢/🟡/🔴] |
| Termination | [details] | [🟢/🟡/🔴] |
| Warranty | [details] | [🟢/🟡/🔴] |

---

### Risk Flags

| # | Flag | Severity | Category | Clause | Mitigation |
|---|------|----------|----------|--------|------------|
| 1 | [flag name] | [🔴/🟡/🟢] | [category] | [clause excerpt] | [suggestion] |

---

### Checklist Gaps

[List any sections from the contract-checklist.md that were missing or incomplete in the contract]

---

### Recommendations

[Prioritized list of negotiation points — Red items first, then Yellow]
```

If no risks found:
- Display: "No risk flags detected. Contract terms appear standard and balanced."

## Observation: End
After execution completes, record a post_command event to the Intelligence event store:
- Event type: `post_command`
- Use the same session_id from the start observation
- Outcome: `success` | `failure` | `degraded`
- Payload: { outcome summary, items processed, outputs created }
- Duration: milliseconds elapsed since pre_command event
- If any errors occurred during execution, also record an error event with the error type, message, and whether recovery was attempted

## Final: Memory Update
Read the pattern-detection skill at `_infrastructure/memory/pattern-detection/SKILL.md`.
Log this execution as an observation with: plugin name, primary action performed, key entities (companies, contacts), and output summary.
Check for emerging patterns per the detection rules. If a memory reaches the adaptation threshold, append the notification to the output.

## Usage Examples

```
/founder-os:contract:analyze path/to/contract.pdf
/founder-os:contract:analyze ~/Documents/service-agreement.docx
/founder-os:contract:analyze contracts/nda-draft.md
/founder-os:contract:analyze agreement.txt
```
