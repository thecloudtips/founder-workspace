---
description: Analyze a contract and compare its terms against standard freelancer/agency benchmarks
argument-hint: "[file-path] [--standards=PATH]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:contract:compare

Perform a full contract analysis (same as `/founder-os:contract:analyze`) and then compare each extracted term against the standard terms reference to identify deviations. Flag terms that fall outside acceptable ranges with RAG severity levels and provide specific counter-proposals.

## Load Skills and References

Read the contract-analysis skill at `skills/contract/contract-analysis/SKILL.md` for contract structure recognition, file format handling, contract type detection, key term extraction patterns, and output structure.

Read the legal-risk-detection skill at `skills/contract/legal-risk-detection/SKILL.md` for RAG classification system, risk categories, comparison logic vs standard terms, and risk flag taxonomy.

Read the standard terms reference at `../../../.founderOS/templates/standard-terms.md` for baseline acceptable terms across all categories. If the user provides `--standards=PATH`, read their custom standards file instead.

Read the contract review checklist at `../../../.founderOS/templates/contract-checklist.md` for coverage verification.

## Parse Arguments

Extract from `$ARGUMENTS`:
- `[file-path]` (required) — path to the contract file to analyze. Supported formats: PDF, DOCX, MD, TXT. If no argument provided, prompt the user: "Provide the path to the contract file to analyze and compare. Supported formats: PDF, DOCX, MD, TXT."
- `--standards=PATH` (optional) — path to a custom standard-terms file. Default: use the built-in `../../../.founderOS/templates/standard-terms.md`. This allows users to customize their baseline expectations.

## Business Context (Optional)
Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md`, `strategy.md`, and `current-data.md`. Use this context to personalize output (e.g., prioritize known clients, use correct terminology, align with current strategy). If files don't exist, skip silently.

## Preflight Check
Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
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
- Command: `contract-compare`
- Generate a session_id (UUID) and reuse it for all subsequent events in this execution
- Payload: record input parameters, context files loaded, and any memories injected
- If the Intelligence database does not exist, skip observation silently and continue execution

## Intelligence: Apply Learned Patterns
Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'contract-analyzer' OR plugin IS NULL) AND (command = 'contract-compare' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
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

## Comparison Workflow

1. **Run full analysis**: Execute the same analysis workflow as `/founder-os:contract:analyze` — validate file, read contract, detect type, identify structure, extract key terms, run checklist, detect risks, calculate overall risk level. Follow all steps from the contract-analysis and legal-risk-detection skills.

2. **Load standard terms**: Read the standard terms reference (built-in or custom). Parse each category's Standard Range, Acceptable range, and Red Flag thresholds.

3. **Compare term by term**: For each of the 7 key term categories, compare the contract's extracted value against the standard terms reference:
   - If the contract term matches the "Red Flag" column → flag as Red deviation
   - If the contract term falls outside "Acceptable" but is not a "Red Flag" → flag as Yellow deviation
   - If the contract term falls within "Standard" or "Acceptable" → mark as Green (no deviation)
   - If a standard term category is not found in the contract → flag as Yellow ("Missing standard term")

4. **Generate deviation details**: For each deviation, produce:
   - **Category**: Which term category
   - **Contract says**: The actual clause or term from the contract
   - **Standard says**: The expected range from the standard terms reference
   - **Deviation**: How the contract differs
   - **Severity**: Red/Yellow/Green
   - **Counter-proposal**: Suggested language to negotiate toward the standard

5. **Merge with risk analysis**: Combine the comparison-based flags with the standalone risk detection flags. Deduplicate — if both analyses flag the same clause, keep the higher severity and merge the explanations.

6. **Calculate final risk level**: Use the merged flag set. Red if ANY Red flag, Yellow if ANY Yellow flag, Green if all Green.

## Notion Integration

1. **Discover database**: Search Notion for "Founder OS HQ - Deliverables" first. If not found, fall back to legacy "Contract Analyzer - Analyses". If neither exists, skip Notion (do NOT lazy-create).
2. **Save analysis**: Create a new record with Type = "Contract" and all standard fields from the analysis. Map Contract Type values: "Service Agreement" → "SaaS", "Other" → "Vendor". Set Status = "Draft" on creation. Include the deviation summary in Key Terms (appended after the 7 extracted categories).
3. **Company relation** (HQ DB only): Look up contract parties in CRM Pro "Companies" (or "Founder OS HQ - Companies"). If a match is found, set the Company relation. Leave empty if no match.
4. **Idempotent updates**: If a record with the same Title already exists (filtered by Type = "Contract" in HQ DB), update it.

## Graceful Degradation

If Notion CLI is unavailable or neither database is found:
- Output the full comparison report as structured text in chat
- Warn: "Notion unavailable — displaying results in chat. Analysis was not saved to the database."

If the custom standards file (`--standards=PATH`) cannot be read:
- Fall back to the built-in standard terms
- Warn: "Custom standards file not found at [PATH]. Using built-in standard terms."

If the contract file cannot be read:
- Report the specific error and stop

## Output Format

Display the comparison report:

```
> **Disclaimer**: This analysis is for informational purposes only and does not constitute legal advice. Consult a qualified attorney for legal guidance.

## Contract Comparison Report

**File**: [file path]
**Contract Type**: [detected type]
**Parties**: [party 1] ↔ [party 2]
**Compared Against**: [Built-in standard terms / Custom: [path]]
**Overall Risk Level**: [🔴 Red / 🟡 Yellow / 🟢 Green] — [risk summary sentence]
**Saved to Notion**: [Yes/No]

---

### Summary

[2-3 sentence summary including how the contract compares to standards overall]

---

### Term-by-Term Comparison

| Category | Contract Terms | Standard Range | Deviation | Severity |
|----------|---------------|----------------|-----------|----------|
| Payment | [contract value] | [standard range] | [how it differs] | [🟢/🟡/🔴] |
| Duration/Renewal | [contract value] | [standard range] | [how it differs] | [🟢/🟡/🔴] |
| IP | [contract value] | [standard range] | [how it differs] | [🟢/🟡/🔴] |
| Confidentiality | [contract value] | [standard range] | [how it differs] | [🟢/🟡/🔴] |
| Liability | [contract value] | [standard range] | [how it differs] | [🟢/🟡/🔴] |
| Termination | [contract value] | [standard range] | [how it differs] | [🟢/🟡/🔴] |
| Warranty | [contract value] | [standard range] | [how it differs] | [🟢/🟡/🔴] |

---

### Deviations from Standard

| # | Category | Contract Says | Standard Says | Severity | Counter-Proposal |
|---|----------|---------------|---------------|----------|-----------------|
| 1 | [category] | [actual clause] | [expected range] | [🔴/🟡/🟢] | [suggested negotiation language] |

---

### Risk Flags (from standalone analysis)

| # | Flag | Severity | Category | Clause | Mitigation |
|---|------|----------|----------|--------|------------|
| 1 | [flag name] | [🔴/🟡/🟢] | [category] | [clause excerpt] | [suggestion] |

---

### Checklist Gaps

[List any sections from contract-checklist.md missing or incomplete in the contract]

---

### Recommendations

[Prioritized negotiation points — Red deviations first, then Yellow, then standalone risk flags]

1. **[CRITICAL]** [Red item with counter-proposal]
2. **[ATTENTION]** [Yellow item with suggestion]
3. ...
```

If no deviations found:
- Display: "Contract terms align with standard freelancer/agency benchmarks. No significant deviations detected."

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
/founder-os:contract:compare path/to/contract.pdf
/founder-os:contract:compare ~/Documents/service-agreement.docx
/founder-os:contract:compare contracts/nda.md --standards=my-standards.md
/founder-os:contract:compare agreement.txt --standards=~/custom-terms.md
```
