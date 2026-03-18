# Platform Constraints Reference

Exact API field mappings and validation rules for Late.dev platform support.

## LinkedIn API Fields

| Field | Type | Constraint |
|-------|------|-----------|
| `text` | string | Max 3,000 chars |
| `mediaItems` | array | Images: JPEG/PNG/GIF; Video: MP4/MOV; Docs: PDF (100MB, 300pp) |
| `platformOptions.orgs` | string[] | Organization IDs for company page posting |
| `platformOptions.firstComment` | string | Auto-posted first comment text |
| `platformOptions.linkPreview` | boolean | Control link preview card generation |
| `platformOptions.document` | string | Path to PDF for document posts |

## X/Twitter API Fields

| Field | Type | Constraint |
|-------|------|-----------|
| `text` | string | Max 280 chars per tweet |
| `mediaItems` | array | Max 4 images OR 1 video per tweet |
| `platformOptions.threadItems` | object[] | `[{ text: string, mediaItems?: array }]` |
| `platformOptions.replyTo` | string | Tweet ID for reply chains |

## Validation Rules

1. **LinkedIn**: Reject if `text` > 3,000 chars. Warn at > 2,500 chars.
2. **X/Twitter**: If `text` > 280 chars and no `threadItems`, auto-split into thread.
3. **Media count**: X/Twitter max 4 images OR 1 video (not both). LinkedIn allows mixed.
4. **File size**: Max 5GB per file across all platforms.
5. **Content-type**: Must match file magic bytes (enforced by CLI).
