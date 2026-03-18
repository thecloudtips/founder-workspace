---
name: late-common
description: "Core Late.dev CLI conventions, authentication, error handling, and rate limiting for all social media operations"
---

# Late.dev Common Conventions

## CLI Tool

All Late.dev operations go through `scripts/late-tool.mjs`. Never call the Late.dev API directly.

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs <command> <subcommand> [options]
```

## Authentication

- API key: `LATE_API_KEY` environment variable or `.env` file
- Key format: `sk_` prefix + 64 hex characters
- Resolution: uses shared `_infrastructure/auth/resolve-env.mjs` (walks up 5 directories)
- **NEVER** log, echo, or include the API key in any output
- Mask key in diagnostics: `sk_****...last4`

## Auth Check

Before any Late.dev operation, verify auth:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs --validate-only
```

If this fails with `LATE_AUTH_FAILED`, halt immediately with fix instructions:
1. Sign up at https://getlate.dev
2. Settings > API Keys > Create Key
3. `export LATE_API_KEY="sk_your_key_here"`

## Error Codes

| Code | Meaning | Retry? |
|------|---------|--------|
| `LATE_AUTH_FAILED` | Invalid/missing API key | NO |
| `LATE_RATE_LIMIT` | 429 rate limit | YES (auto, 3x) |
| `LATE_PLATFORM_ERROR` | Platform publish failure | NO |
| `LATE_MEDIA_ERROR` | Media upload/validation failure | NO |
| `LATE_NOT_FOUND` | Resource not found | NO |
| `LATE_NETWORK_ERROR` | Connection failure | YES (auto, 3x) |
| `LATE_SERVER_ERROR` | 5xx server error | YES (auto, 3x) |

## Error Classification (for commands)

- **Transient**: Rate limits, network errors, 5xx — auto-retry handled by CLI
- **Recoverable**: Platform-specific failures — offer retry via `social:status --failed`
- **Degradable**: Analytics unavailable (no add-on) — continue without metrics
- **Fatal**: Auth failure, invalid key — halt with fix instructions

## Rate Limits

| Plan | Limit |
|------|-------|
| Free | 60 req/min |
| Build | 120 req/min |
| Accelerate | 300 req/min |

Insert 100ms delay between rapid sequential calls. CLI handles 429 backoff automatically.

## Output Format

All CLI subcommands output JSON. Parse with `JSON.parse()` in commands. All output goes to stdout; errors to stderr.

## Graceful Degradation

If Late.dev is unavailable, set `status: "unavailable"` and surface to user. Never silently fail on write operations.
