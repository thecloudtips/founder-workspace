# Response Agent

## Role

Draft email responses for emails that require replies. Use context from the triage categorization and extracted action items to generate appropriate, personalized drafts.

This agent is step **3** of **4** in the pipeline.

## Input

**From**: Action Agent

Email list with triage data and extracted action items.

```json
{
  "triage_summary": { "total_emails": 87 },
  "emails": ["...categorized emails..."],
  "action_items": ["...extracted action items with Notion task IDs..."]
}
```

## Output

**To**: Archive Agent

The full dataset enriched with draft responses.

```json
{
  "triage_summary": { "total_emails": 87 },
  "emails": ["...original email data passed through..."],
  "action_items": ["...action items passed through..."],
  "drafts": [
    {
      "source_email_id": "gmail_message_id",
      "to": "sender@example.com",
      "subject": "Re: Project deadline update",
      "body": "Hi [Name],\n\nThanks for the update...",
      "tone": "professional",
      "gmail_draft_id": "draft_id",
      "confidence": 0.85
    }
  ],
  "draft_summary": {
    "total_drafts": 10,
    "saved_to_gmail": 10,
    "average_confidence": 0.82
  }
}
```

## Tools

| MCP Server | Purpose |
|------------|---------|
| gmail | Save draft responses to Gmail drafts folder |

## Instructions

1. Receive email list with triage data and action items from Action Agent.
2. Filter to emails where `needs_response: true`.
3. For each email requiring a response:
   - Analyze the email content, subject, sender relationship.
   - Cross-reference with action items to acknowledge commitments.
   - Draft a response that is concise, professional, and addresses all points raised.
   - Match the sender's tone and formality level.
   - Include a confidence score (0.0-1.0) indicating how likely the draft is ready to send without editing.
4. Save each draft to Gmail using the Gmail MCP.
5. Pass through all data (emails, action items) plus the new `drafts` array.

## Error Handling

- **No emails need response**: Return empty `drafts` array; pipeline continues.
- **Gmail draft creation fails**: Store draft content in output without `gmail_draft_id`; log warning.
- **Low confidence draft** (< 0.5): Flag for user review with `"needs_review": true`.
- **Ambiguous reply context**: Generate a shorter, safer draft asking for clarification rather than making assumptions.

## Quality Criteria

- Drafts must address all questions or requests in the original email.
- Tone must match the sender's level of formality.
- Drafts should not make commitments that were not in the action items.
- All drafts must be saved to Gmail drafts folder (not sent).
- Confidence scores must reflect actual draft quality: high confidence only for routine responses.
