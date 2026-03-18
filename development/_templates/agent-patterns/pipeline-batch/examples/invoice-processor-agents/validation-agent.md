# Validation Agent

## Role

Verify the accuracy and consistency of extracted invoice data. Check mathematical correctness, date validity, vendor information, and flag any discrepancies.

This agent is step **2** of **5** in the per-invoice pipeline. In batch mode, multiple instances of this pipeline run concurrently across invoice files.

## Input

**From**: Extraction Agent

Extracted invoice data.

```json
{
  "batch_item_id": "invoice_001",
  "status": "success",
  "result": {
    "vendor": { "name": "Acme Supplies Inc.", "..." : "..." },
    "invoice_number": "INV-2024-0042",
    "line_items": [ "..." ],
    "subtotal": 475.00,
    "tax": 38.00,
    "total": 513.00,
    "extraction_confidence": 0.92
  }
}
```

## Output

**To**: Categorization Agent

Validated invoice data with validation results.

```json
{
  "batch_item_id": "invoice_001",
  "status": "success",
  "result": {
    "vendor": { "...": "original vendor data" },
    "invoice_number": "INV-2024-0042",
    "line_items": [ "...original line items..." ],
    "subtotal": 475.00,
    "tax": 38.00,
    "total": 513.00,
    "extraction_confidence": 0.92,
    "validation": {
      "is_valid": true,
      "checks_passed": [
        "line_items_sum_to_subtotal",
        "subtotal_plus_tax_equals_total",
        "dates_are_valid",
        "invoice_number_present",
        "vendor_name_present"
      ],
      "checks_failed": [],
      "warnings": [],
      "corrected_fields": {}
    }
  }
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| (none) | Validation is performed in-memory with no external tools |

## Instructions

1. Receive extracted invoice data from Extraction Agent.
2. Run mathematical validation checks:
   - Sum of line item totals must equal subtotal.
   - Subtotal + tax must equal total.
   - Each line item: quantity x unit_price must equal line total.
3. Run date validation:
   - Invoice date must be a valid date and not in the future.
   - Due date must be on or after invoice date.
   - Due date must be consistent with payment terms (e.g., Net 30 = invoice_date + 30 days).
4. Run completeness checks:
   - Vendor name must be present.
   - Invoice number must be present.
   - At least one line item must exist.
   - Total must be > 0.
5. If a check fails but is auto-correctable (e.g., subtotal is wrong but line items are correct), apply correction and record in `corrected_fields`.
6. Compile validation results.

## Error Handling

- **All critical checks fail**: Return `status: "error"` with validation details; item will be skipped in batch.
- **Minor discrepancies**: Auto-correct where possible (rounding errors within 0.01), log corrections.
- **Missing required fields**: Flag as `is_valid: false` with specific failed checks.

## Quality Criteria

- Mathematical checks must have zero tolerance for amounts (exact match after rounding to 2 decimals).
- Auto-corrections must be transparent: every changed value must be recorded in `corrected_fields`.
- Validation must not modify the original extracted data; only add the `validation` section.
