# Extraction Agent

## Role

Read invoice files (PDF, image, or scanned document) and extract structured data including vendor, amounts, dates, line items, and payment terms.

This agent is step **1** of **5** in the per-invoice pipeline. In batch mode, multiple instances of this pipeline run concurrently across invoice files.

## Input

**From**: Batch Orchestrator

Per-item input with the invoice file reference.

```json
{
  "batch_item_id": "invoice_001",
  "batch_index": 1,
  "batch_total": 50,
  "item_data": {
    "file_path": "/invoices/2024/invoice-acme-jan.pdf",
    "file_type": "pdf",
    "file_size_bytes": 245000,
    "source": "email_attachment"
  }
}
```

## Output

**To**: Validation Agent

Extracted invoice data.

```json
{
  "batch_item_id": "invoice_001",
  "status": "success",
  "result": {
    "vendor": {
      "name": "Acme Supplies Inc.",
      "address": "123 Main St, Springfield, IL 62701",
      "tax_id": "12-3456789"
    },
    "invoice_number": "INV-2024-0042",
    "invoice_date": "2024-01-15",
    "due_date": "2024-02-14",
    "currency": "USD",
    "line_items": [
      {
        "description": "Office Supplies - Q1 Bundle",
        "quantity": 1,
        "unit_price": 450.00,
        "total": 450.00
      },
      {
        "description": "Shipping and Handling",
        "quantity": 1,
        "unit_price": 25.00,
        "total": 25.00
      }
    ],
    "subtotal": 475.00,
    "tax": 38.00,
    "total": 513.00,
    "payment_terms": "Net 30",
    "extraction_confidence": 0.92,
    "source_file": "/invoices/2024/invoice-acme-jan.pdf"
  }
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| filesystem | Read invoice files from local filesystem |

## Instructions

1. Receive the invoice file reference from the batch orchestrator.
2. Read the file using the filesystem MCP.
3. If the file is an image or scanned PDF, apply OCR processing.
4. Extract structured fields:
   - **Vendor**: Name, address, tax ID.
   - **Invoice metadata**: Invoice number, date, due date.
   - **Line items**: Description, quantity, unit price, total per item.
   - **Totals**: Subtotal, tax, grand total.
   - **Payment terms**: Net 30, due on receipt, etc.
5. Calculate an extraction confidence score (0.0-1.0) based on OCR quality and field completeness.
6. Return structured data for validation.

## Error Handling

- **File not found**: Return `status: "error"` with `error: "file_not_found"`.
- **Unsupported file format**: Return `status: "error"` with `error: "unsupported_format"`.
- **OCR failure**: Return `status: "error"` with `error: "ocr_failed"` and any partial data extracted.
- **Low confidence extraction** (< 0.5): Return `status: "success"` but flag `extraction_confidence` low; downstream agents handle review.

## Quality Criteria

- All monetary amounts must be extracted as numbers, not strings.
- Line item totals must be mathematically consistent (quantity x unit_price = total).
- Dates must be in ISO 8601 format.
- Invoice number must be extracted if present; set to null if not found.
- Confidence score must honestly reflect extraction quality.
