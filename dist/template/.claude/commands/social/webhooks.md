---
description: Configure post status webhooks with signature verification
argument-hint: "[get|set] [--url=https://...] [--secret=hmac_secret] [--format=table|json|markdown]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:webhooks

Configure webhooks for receiving post status callbacks with HMAC signature verification.

## Skills

1. Read `../../../.founderOS/infrastructure/late-skills/late-common/SKILL.md`
2. Read `../../../.founderOS/infrastructure/late-skills/late-accounts/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `action` | No | `get` (default) or `set` (positional) |
| `--url` | For `set` | Webhook URL (HTTPS only) |
| `--secret` | For `set` | HMAC signing secret (or auto-generate) |
| `--format` | No | Output format |

## Business Context (Optional)

Check `../../../.founderOS/infrastructure/context/active/` for `.md` files.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `webhook configuration`, `status callbacks`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:webhooks` runs.

## Execution

### Get Webhook Config

```bash
node ../../../.founderOS/scripts/late-tool.mjs webhooks get
```

Display current webhook URL (masked after domain) and whether signing is configured.

### Set Webhook

1. **Validate URL**: HTTPS only, valid URL format, warn on non-standard ports
2. **Signing secret**: If `--secret` not provided, generate a random HMAC secret
3. Configure:
   ```bash
   node ../../../.founderOS/scripts/late-tool.mjs webhooks set \
     --url="<url>" --secret="<secret>"
   ```
4. **Store secret**: Save `LATE_WEBHOOK_SECRET` to `.env` file (not Notion DB)
5. Display instructions for webhook receiver to validate `X-Late-Signature` header

## Audit Logging

Log to `.late/audit.log`:
```json
{"event":"webhook.set","timestamp":"<iso>","url":"<domain_only>","status":"success|failure"}
```

## Security Notes

- Webhook URL must be HTTPS
- Signing secret stored in `.env` only — never in Notion DB or logs
- Receivers must validate `X-Late-Signature` header on every callback
- Warn user if URL uses non-standard ports

## Final Step: Observation Logging

Record: webhook configuration action.

## Intelligence: Post-Command

Log execution metrics for future optimization.
