---
description: Connect a new social media account via OAuth with PKCE
argument-hint: "--platform=linkedin [--profile=default]"
allowed-tools: ["Read", "Bash"]
execution-mode: foreground
result-format: full
---

# social:connect

Connect a new social media account via OAuth with PKCE. This is a foreground command because it requires interactive user action (browser OAuth flow).

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-accounts/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--platform` | Yes | Platform to connect (linkedin, x, instagram, etc.) |
| `--profile` | No | Late.dev profile to associate account with (default: first profile) |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `social accounts`, `oauth setup`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:connect` runs.

## Phase 1/3: Pre-flight

1. Verify Late.dev auth is working
2. List existing accounts to check if platform already connected:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs accounts list
   ```
3. If platform already connected, warn user and ask to continue or cancel

## Phase 2/3: OAuth Flow

1. Initiate OAuth connection:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs accounts connect \
     --platform=<platform> --profile=<profile>
   ```
2. Display authorization URL for user to open in browser
3. Wait for user confirmation that OAuth flow completed
4. Verify account appears in account list

## Phase 3/3: Verification

1. Run health check on new account:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs accounts health --account-id=<new_id>
   ```
2. Display account status and permissions

## Audit Logging

Log to `.late/audit.log`:
```json
{"event":"account.connect","timestamp":"<iso>","platform":"<platform>","profile":"<profile>","status":"success|failure"}
```

## Output

```
Connected: LinkedIn account "John Doe" (acc_abc123)
Profile: default
Status: Active
Permissions: Post, Comment, Analytics
```

## Final Step: Observation Logging

Record: platform connected, profile used.

## Intelligence: Post-Command

Log execution metrics for future optimization.
