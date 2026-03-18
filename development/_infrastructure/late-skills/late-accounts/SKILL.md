---
name: late-accounts
description: "Late.dev account management covering OAuth flows, account health checks, and profile management"
---

# Late.dev Account Management

## OAuth Connect Flow (PKCE)

1. CLI generates PKCE code verifier + challenge
2. Opens browser to Late.dev OAuth URL with state + challenge
3. Late.dev handles the full OAuth exchange
4. CLI receives confirmation via headless mode callback
5. Account appears in `accounts list`

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs accounts connect \
  --platform=linkedin --profile=default
```

Security requirements:
- **PKCE**: Required for CLI/public clients per OAuth 2.1
- **State parameter**: Cryptographic random, validated on callback (CSRF prevention)
- **Redirect URI**: localhost callback with random port or Late.dev headless mode
- **Audit logging**: Log connect/disconnect events to `.late/audit.log` (no credentials)

## Health Checks

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs accounts health --account-id=acc_123
```

Validates token validity and permissions. Distinguish:
- **Expired tokens**: Prompt user to reconnect
- **Revoked tokens**: Prompt user to re-authorize from scratch

## Profile Management

```bash
# List profiles (brand groupings)
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs profiles list

# Create profile
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs profiles create --name="My Brand"
```

## Disconnect

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs accounts disconnect --account-id=acc_123
```

Logs disconnect event to `.late/audit.log`.
