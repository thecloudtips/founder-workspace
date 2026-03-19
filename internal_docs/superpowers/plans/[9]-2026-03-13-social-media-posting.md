# Social Media Posting Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Each wave uses parallel git worktrees. Steps use checkbox (`- [ ]`) syntax for tracking. Skills use @skill-creator:skill-creator. Plugin artifacts use @plugin-dev namespace skills.

**Goal:** Build the `social` namespace — a unified publishing pipeline that posts, schedules, and manages content across LinkedIn and X/Twitter via the Late.dev API.

**Architecture:** Six worktree agents across three waves. Wave 1 builds infrastructure (CLI wrapper, shared auth, Late.dev skills) and domain knowledge (3 domain skills, Notion DB template, preflight/scheduling integration) in parallel. Wave 2 builds all 11 commands across three parallel worktrees (publishing, interaction, management). Wave 3 builds the 5-agent pipeline team that depends on commands and skills. Each worktree concludes with a code review stage before merge.

**Tech Stack:** Node.js (CLI wrapper), Markdown (commands/skills/agents), JSON (agent config, DB templates, preflight registry)

**Spec:** `docs/superpowers/specs/2026-03-13-social-media-posting-design.md`

**Dependency:** Requires Late.dev API key (`LATE_API_KEY`) for runtime testing. Development of all markdown artifacts is API-independent.

---

## File Structure

### New Files (48 files)

**Infrastructure — CLI & Auth (3 files)**
```
scripts/late-tool.mjs                                    # Late.dev CLI wrapper
_infrastructure/auth/resolve-env.mjs                     # Shared .env resolution utility
.gitignore                                               # Add .late/ entry (modify)
```

**Infrastructure — Late.dev Skills (10 files: 5 primary + 5 mirrors)**
```
_infrastructure/late-skills/late-common/SKILL.md         # Auth, errors, rate limits
_infrastructure/late-skills/late-publish/SKILL.md        # Write operations
_infrastructure/late-skills/late-status/SKILL.md         # Read operations
_infrastructure/late-skills/late-media/SKILL.md          # Media upload workflows
_infrastructure/late-skills/late-accounts/SKILL.md       # OAuth, health, profiles
skills/infrastructure/late-common/SKILL.md               # Mirror
skills/infrastructure/late-publish/SKILL.md              # Mirror
skills/infrastructure/late-status/SKILL.md               # Mirror
skills/infrastructure/late-media/SKILL.md                # Mirror
skills/infrastructure/late-accounts/SKILL.md             # Mirror
```

**Commands — Social Namespace (11 files)**
```
commands/social/post.md                                  # Create + publish
commands/social/cross-post.md                            # Multi-platform from P24
commands/social/schedule.md                              # Future scheduling
commands/social/draft.md                                 # Save drafts
commands/social/status.md                                # Check post status
commands/social/reply.md                                 # Comment/reply
commands/social/analytics.md                             # View metrics
commands/social/queue.md                                 # Manage time slots
commands/social/connect.md                               # OAuth account connect
commands/social/profiles.md                              # Manage Late.dev profiles
commands/social/webhooks.md                              # Configure callbacks
```

**Domain Skills (4 files)**
```
skills/social/platform-adaptation/SKILL.md               # Per-platform rules
skills/social/platform-adaptation/references/platform-constraints.md  # API field mappings
skills/social/cross-posting/SKILL.md                     # Multi-platform strategies
skills/social/posting-cadence/SKILL.md                   # Optimal timing
```

**Agent Team (6 files)**
```
agents/social/config.json                                # Pipeline configuration
agents/social/content-adapter-agent.md                   # Adapts content per platform
agents/social/preview-agent.md                           # Shows adaptations for approval
agents/social/media-handler-agent.md                     # Uploads, resizes media
agents/social/publisher-agent.md                         # Posts via late-tool.mjs
agents/social/monitor-agent.md                           # Tracks status, retries
```

**Integration Updates (4 files modified)**
```
_infrastructure/preflight/dependency-registry.json       # Add social namespace entry
_infrastructure/preflight/references/fix-messages.md     # Add late fix message
_infrastructure/notion-db-templates/hq-content.json      # Add social post properties
CLAUDE.md                                                # Add namespace #33 row
```

### Worktree → File Mapping

| Worktree | Wave | Files | Skill Used |
|----------|------|-------|------------|
| `wt-infra` | 1 | `scripts/late-tool.mjs`, `_infrastructure/auth/resolve-env.mjs`, 5 late-skills + 5 mirrors, `.gitignore`, preflight entries | @skill-creator:skill-creator (infra skills), @plugin-dev:plugin-structure (CLI) |
| `wt-skills` | 1 | 3 domain skills + 1 reference file, `hq-content.json` update, `CLAUDE.md` update | @skill-creator:skill-creator (skills), @plugin-dev:plugin-settings (DB template) |
| `wt-pub-cmds` | 2 | `post.md`, `cross-post.md`, `schedule.md`, `draft.md`, `status.md` | @plugin-dev:command-development |
| `wt-int-cmds` | 2 | `reply.md`, `analytics.md`, `queue.md` | @plugin-dev:command-development |
| `wt-mgmt-cmds` | 2 | `connect.md`, `profiles.md`, `webhooks.md` | @plugin-dev:command-development |
| `wt-agents` | 3 | `config.json`, 5 agent `.md` files | @plugin-dev:agent-development |

---

## Chunk 1: Wave 1 — Infrastructure & Domain Knowledge (Parallel)

> Two worktrees run in parallel. `wt-infra` builds the CLI wrapper, shared auth, and infrastructure skills. `wt-skills` builds domain skills, DB template updates, and CLAUDE.md updates. Both must complete before Wave 2.

### Task 1: Shared Auth Utility (`wt-infra`)

**Files:**
- Create: `_infrastructure/auth/resolve-env.mjs`

Use @plugin-dev:plugin-structure for CLI/infrastructure scaffolding.

- [ ] **Step 1: Create resolve-env.mjs**

Write to `_infrastructure/auth/resolve-env.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Shared .env resolution utility.
 * Used by notion-tool.mjs and late-tool.mjs.
 *
 * Usage:
 *   import { resolveKey, maskKey } from './resolve-env.mjs';
 *   const key = resolveKey('LATE_API_KEY', { prefix: 'sk_', prefixLabel: 'Late.dev' });
 */

import { readFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';

/**
 * Walk up directories looking for .env file (max 5 levels).
 * Strips surrounding single/double quotes from values.
 */
function findEnvFile(startDir, maxDepth = 5) {
  let dir = startDir;
  for (let i = 0; i < maxDepth; i++) {
    const envPath = resolve(dir, '.env');
    try {
      const stat = statSync(envPath);
      if (stat.isFile()) {
        // Warn on overly permissive permissions (not 600 or 400)
        const mode = stat.mode & 0o777;
        if (mode !== 0o600 && mode !== 0o400) {
          console.error(`Warning: ${envPath} has permissive permissions (${mode.toString(8)}). Recommend chmod 600.`);
        }
        return envPath;
      }
    } catch {
      // File not found, continue walking up
    }
    const parent = dirname(dir);
    if (parent === dir) break; // Hit filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Parse .env file, stripping quotes from values.
 */
function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

/**
 * Resolve an API key from environment variable or .env file.
 * @param {string} envVar - Environment variable name (e.g., 'LATE_API_KEY')
 * @param {object} opts - Options
 * @param {string} opts.prefix - Expected key prefix (e.g., 'sk_')
 * @param {string} opts.prefixLabel - Human-readable label (e.g., 'Late.dev')
 * @returns {string} The resolved API key
 * @throws {Error} If key not found or format invalid
 */
export function resolveKey(envVar, { prefix, prefixLabel } = {}) {
  // 1. Check environment variable
  let key = process.env[envVar];

  // 2. Fall back to .env file
  if (!key) {
    const envPath = findEnvFile(process.cwd());
    if (envPath) {
      const vars = parseEnvFile(envPath);
      key = vars[envVar];
    }
  }

  if (!key) {
    throw new Error(
      `${envVar} not found. Set it in your environment or .env file.\n` +
      `  export ${envVar}="your_key_here"`
    );
  }

  // 3. Validate prefix if specified
  if (prefix && !key.startsWith(prefix)) {
    throw new Error(
      `${envVar} must start with "${prefix}" (${prefixLabel || 'API'} key format).`
    );
  }

  // 4. Validate key format (prefix + 64 hex characters)
  if (prefix) {
    const hexPart = key.slice(prefix.length);
    if (hexPart.length !== 64 || !/^[a-f0-9]+$/i.test(hexPart)) {
      throw new Error(
        `${envVar} format invalid. Expected ${prefix}<64 hex characters>.`
      );
    }
  }

  return key;
}

/**
 * Mask an API key for safe display.
 * @param {string} key - The API key
 * @param {number} showLast - Number of trailing characters to show (default: 4)
 * @returns {string} Masked key (e.g., "sk_****...ab12")
 */
export function maskKey(key, showLast = 4) {
  if (!key || key.length <= showLast + 4) return '****';
  const prefix = key.slice(0, key.indexOf('_') + 1) || '';
  const suffix = key.slice(-showLast);
  return `${prefix}****...${suffix}`;
}
```

- [ ] **Step 2: Verify the file was written correctly**

Run: `node --input-type=module -e "import './_infrastructure/auth/resolve-env.mjs'"` (ESM import check)
Expected: No output (valid syntax)

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/auth/resolve-env.mjs
git commit -m "feat(social): add shared .env resolution utility for CLI wrappers"
```

---

### Task 2: Late.dev CLI Wrapper (`wt-infra`)

**Files:**
- Create: `scripts/late-tool.mjs`
- Modify: `.gitignore` (add `.late/`)

Use @plugin-dev:plugin-structure for CLI scaffolding.

- [ ] **Step 1: Create late-tool.mjs**

Write to `scripts/late-tool.mjs`. This mirrors the structure of `scripts/notion-tool.mjs`. The CLI wraps the Late.dev REST API (`https://getlate.dev/api/v1`).

```javascript
#!/usr/bin/env node
/**
 * Late.dev CLI wrapper for social media publishing.
 * Mirrors notion-tool.mjs patterns.
 *
 * Usage: node scripts/late-tool.mjs <command> <subcommand> [options]
 *
 * Commands:
 *   profiles list|create
 *   accounts list|health|connect|disconnect
 *   media presign
 *   posts create|list|status|retry
 *   analytics get
 *   queue list|add|remove
 *   webhooks get|set
 *   --diagnostic    Test auth + list profiles/accounts
 *   --validate-only Lightweight auth check (CI/CD)
 */

import { resolveKey, maskKey } from '../_infrastructure/auth/resolve-env.mjs';

const BASE_URL = 'https://getlate.dev/api/v1';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

// --- Auth ---

function getApiKey() {
  return resolveKey('LATE_API_KEY', { prefix: 'sk_', prefixLabel: 'Late.dev' });
}

// --- HTTP Client ---

async function apiCall(method, path, body = null, retryCount = 0) {
  const apiKey = getApiKey();
  const maskedKey = maskKey(apiKey);
  const url = `${BASE_URL}${path}`;

  // Validate HTTPS
  if (!url.startsWith('https://')) {
    throw new Error('API calls must use HTTPS');
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const options = { method, headers };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      await sleep(RETRY_DELAYS[retryCount]);
      return apiCall(method, path, body, retryCount + 1);
    }
    throw Object.assign(new Error('Network error'), { code: 'LATE_NETWORK_ERROR' });
  }

  // Handle errors
  if (!response.ok) {
    if (response.status === 401) {
      throw Object.assign(
        new Error(`Authentication failed. Verify your LATE_API_KEY (${maskedKey})`),
        { code: 'LATE_AUTH_FAILED' }
      );
    }
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = response.headers.get('retry-after');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAYS[retryCount];
      await sleep(delay);
      return apiCall(method, path, body, retryCount + 1);
    }
    if (response.status >= 500 && retryCount < MAX_RETRIES) {
      await sleep(RETRY_DELAYS[retryCount]);
      return apiCall(method, path, body, retryCount + 1);
    }

    // Sanitize error body — strip reflected input
    let errorBody = '';
    try {
      const raw = await response.text();
      errorBody = raw.replace(/sk_[a-f0-9]+/gi, '[REDACTED]').slice(0, 500);
    } catch { /* ignore */ }

    const code = response.status === 404 ? 'LATE_NOT_FOUND'
      : response.status === 429 ? 'LATE_RATE_LIMIT'
      : response.status >= 500 ? 'LATE_SERVER_ERROR'
      : 'LATE_PLATFORM_ERROR';

    throw Object.assign(new Error(`API error ${response.status}: ${errorBody}`), { code });
  }

  return response.json();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// --- Subcommands ---

const commands = {
  profiles: {
    list: () => apiCall('GET', '/profiles'),
    create: (args) => apiCall('POST', '/profiles', { name: args['--name'] }),
  },
  accounts: {
    list: (args) => apiCall('GET', `/accounts${args['--profile'] ? `?profileId=${args['--profile']}` : ''}`),
    health: (args) => apiCall('GET', `/accounts/${args['--account-id']}/health`),
    connect: (args) => apiCall('POST', '/accounts/connect', {
      platform: args['--platform'],
      profileId: args['--profile'],
    }),
    disconnect: (args) => apiCall('DELETE', `/accounts/${args['--account-id']}`),
  },
  media: {
    presign: (args) => apiCall('POST', '/media/presign', {
      fileName: args['--filename'],
      contentType: args['--content-type'],
    }),
  },
  posts: {
    create: (args) => {
      const body = {
        accountIds: JSON.parse(args['--accounts'] || '[]'),
        text: args['--text'] || '',
      };
      if (args['--media']) body.mediaItems = JSON.parse(args['--media']);
      if (args['--schedule']) body.scheduledAt = args['--schedule'];
      if (args['--draft']) body.draft = true;
      if (!args['--draft'] && !args['--schedule']) body.publishNow = true;
      if (args['--platform-options']) {
        body.platformOptions = JSON.parse(args['--platform-options']);
      }
      return apiCall('POST', '/posts', body);
    },
    list: (args) => {
      const params = new URLSearchParams();
      if (args['--status']) params.set('status', args['--status']);
      if (args['--profile']) params.set('profileId', args['--profile']);
      if (args['--limit']) params.set('limit', args['--limit']);
      const qs = params.toString();
      return apiCall('GET', `/posts${qs ? `?${qs}` : ''}`);
    },
    status: (args) => apiCall('GET', `/posts/${args['--post-id']}`),
    retry: (args) => apiCall('POST', `/posts/${args['--post-id']}/retry`),
  },
  analytics: {
    get: (args) => {
      const params = new URLSearchParams();
      if (args['--post-id']) params.set('postId', args['--post-id']);
      if (args['--account-id']) params.set('accountId', args['--account-id']);
      if (args['--date-range']) params.set('dateRange', args['--date-range']);
      return apiCall('GET', `/analytics?${params.toString()}`);
    },
  },
  queue: {
    list: (args) => apiCall('GET', `/queue${args['--profile'] ? `?profileId=${args['--profile']}` : ''}`),
    add: (args) => apiCall('POST', '/queue', {
      profileId: args['--profile'],
      day: args['--day'],
      time: args['--time'],
    }),
    remove: (args) => apiCall('DELETE', `/queue/${args['--slot-id']}`),
  },
  webhooks: {
    get: () => apiCall('GET', '/webhooks'),
    set: (args) => apiCall('POST', '/webhooks', {
      url: args['--url'],
      signingSecret: args['--secret'],
    }),
  },
};

// --- Diagnostic Mode ---

async function runDiagnostic() {
  const key = getApiKey();
  console.log(JSON.stringify({ key: maskKey(key), status: 'checking...' }));
  try {
    const profiles = await commands.profiles.list();
    const accounts = await commands.accounts.list({});
    console.log(JSON.stringify({
      status: 'ok',
      key: maskKey(key),
      profiles: profiles,
      accounts: accounts,
    }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ status: 'error', code: err.code, message: err.message }));
    process.exit(1);
  }
}

// --- Validate-Only Mode ---

async function runValidateOnly() {
  const key = getApiKey();
  try {
    await commands.profiles.list();
    console.log(JSON.stringify({ status: 'ok', key: maskKey(key) }));
  } catch (err) {
    console.error(JSON.stringify({ status: 'error', code: err.code }));
    process.exit(1);
  }
}

// --- Argument Parsing ---

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        args[arg.slice(0, eqIndex)] = arg.slice(eqIndex + 1);
      } else {
        args[arg] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { args, positional };
}

// --- Main ---

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('--diagnostic')) {
    return runDiagnostic();
  }
  if (argv.includes('--validate-only')) {
    return runValidateOnly();
  }

  const { args, positional } = parseArgs(argv);
  const [command, subcommand] = positional;

  if (!command || !subcommand) {
    console.error(JSON.stringify({
      error: 'Usage: late-tool.mjs <command> <subcommand> [options]',
      commands: Object.keys(commands).map(c => `${c} ${Object.keys(commands[c]).join('|')}`),
    }));
    process.exit(1);
  }

  if (!commands[command] || !commands[command][subcommand]) {
    console.error(JSON.stringify({
      error: `Unknown command: ${command} ${subcommand}`,
      available: commands[command]
        ? Object.keys(commands[command])
        : Object.keys(commands),
    }));
    process.exit(1);
  }

  try {
    const result = await commands[command][subcommand](args);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(JSON.stringify({
      error: err.message,
      code: err.code || 'UNKNOWN',
    }));
    process.exit(1);
  }
}

main();
```

- [ ] **Step 2: Make executable and verify syntax**

```bash
chmod +x scripts/late-tool.mjs
node --input-type=module -e "import './scripts/late-tool.mjs'" 2>&1 | head -1
```

Expected: No output (valid syntax)

- [ ] **Step 3: Add `.late/` to .gitignore**

Append to `.gitignore`:
```
# Late.dev local state and audit logs
.late/
```

- [ ] **Step 4: Commit**

```bash
git add scripts/late-tool.mjs .gitignore
git commit -m "feat(social): add Late.dev CLI wrapper with auth, retry, and error handling"
```

---

### Task 3: Infrastructure Skills — Late.dev (`wt-infra`)

**Files:**
- Create: `_infrastructure/late-skills/late-common/SKILL.md`
- Create: `_infrastructure/late-skills/late-publish/SKILL.md`
- Create: `_infrastructure/late-skills/late-status/SKILL.md`
- Create: `_infrastructure/late-skills/late-media/SKILL.md`
- Create: `_infrastructure/late-skills/late-accounts/SKILL.md`
- Create: 5 mirror copies under `skills/infrastructure/`

Use @skill-creator:skill-creator for each skill file. Each skill follows the infrastructure skill pattern (no `globs`, no "Activates when..." prefix).

- [ ] **Step 1: Create late-common/SKILL.md**

Write to `_infrastructure/late-skills/late-common/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Create late-publish/SKILL.md**

Write to `_infrastructure/late-skills/late-publish/SKILL.md`:

```markdown
---
name: late-publish
description: "Late.dev publishing patterns for creating, scheduling, and cross-posting social media content"
---

# Late.dev Publishing Patterns

## Immediate Publish

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
  --accounts='["acc_123"]' \
  --text="Post content here"
```

The CLI sets `publishNow: true` when neither `--schedule` nor `--draft` is provided.

## Scheduled Publish

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
  --accounts='["acc_123"]' \
  --text="Scheduled post" \
  --schedule="2026-03-15T09:00:00-05:00"
```

Always use ISO 8601 with timezone offset. Convert natural language times to ISO 8601 before calling the CLI.

## Draft

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
  --accounts='["acc_123"]' \
  --text="Draft content" \
  --draft
```

## Cross-Post (Multiple Accounts)

Single API call with multiple account IDs:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
  --accounts='["acc_linkedin_123","acc_twitter_456"]' \
  --text="Cross-platform post"
```

Late.dev handles per-platform delivery. For higher-quality adaptation, the Content Adapter agent adapts content per platform *before* the API call, using separate `posts create` calls per platform.

## Platform-Specific Options

Pass as JSON via `--platform-options`:

```bash
# LinkedIn: first comment + org posting
--platform-options='{"orgs":["org_123"],"firstComment":"Link: https://..."}'

# X/Twitter: thread
--platform-options='{"threadItems":[{"text":"Tweet 1"},{"text":"Tweet 2"}]}'
```

## Retry Failed Platforms

When a cross-post partially fails (some platforms succeed, others fail):

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts retry --post-id=post_abc123
```

This retries only the failed platform deliveries within the post.

## Post Response Format

```json
{
  "id": "post_abc123",
  "status": "published|partial|failed|scheduled|draft",
  "platforms": [
    { "accountId": "acc_123", "platform": "linkedin", "status": "published", "url": "https://..." },
    { "accountId": "acc_456", "platform": "twitter", "status": "failed", "error": "..." }
  ]
}
```
```

- [ ] **Step 3: Create late-status/SKILL.md**

Write to `_infrastructure/late-skills/late-status/SKILL.md`:

```markdown
---
name: late-status
description: "Late.dev read operations for checking post status, listing posts, and fetching analytics"
---

# Late.dev Status & Read Operations

## Check Post Status

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts status --post-id=post_abc123
```

Returns per-platform delivery status. Terminal states: `published`, `failed`. Non-terminal: `pending`, `processing`.

## List Posts

```bash
# All recent posts
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts list --limit=10

# Filter by status
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts list --status=failed

# Filter by profile
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts list --profile=prof_123
```

## Analytics

Requires Late.dev Analytics add-on. If unavailable, returns error — degrade gracefully by showing message with upgrade URL.

```bash
# Post-level analytics
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs analytics get --post-id=post_abc123

# Account-level analytics
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs analytics get --account-id=acc_123 --date-range=7d
```

Analytics response includes: likes, comments, shares, impressions, reach, clicks.

## Partial Status Handling

A post with `status: "partial"` means some platforms succeeded and others failed. Show per-platform breakdown and offer retry for failed platforms.
```

- [ ] **Step 4: Create late-media/SKILL.md**

Write to `_infrastructure/late-skills/late-media/SKILL.md`:

```markdown
---
name: late-media
description: "Late.dev media upload workflow with presigned URLs, validation, and platform-specific constraints"
---

# Late.dev Media Upload Workflow

## Upload Flow

1. **Validate** file exists, check type/size against platform limits
2. **Validate content-type** matches actual file magic bytes (security)
3. **Get presigned URL**: `late-tool.mjs media presign --filename=photo.jpg --content-type=image/jpeg`
4. **Upload** file to presigned URL via PUT (handled internally)
5. **Reference** `publicUrl` in post's `mediaItems` array

```bash
# Step 1: Get presigned URL
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs media presign \
  --filename=photo.jpg --content-type=image/jpeg
# Returns: { "publicUrl": "https://...", "uploadUrl": "https://..." }
# Note: uploadUrl is internal only — never log it

# Step 2: Reference in post
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
  --accounts='["acc_123"]' \
  --text="Check this out!" \
  --media='[{"publicUrl":"https://...","type":"image"}]'
```

## Platform Constraints

| Platform | Images | Video | Other |
|----------|--------|-------|-------|
| LinkedIn | JPEG/PNG/GIF (multiple) | MP4/MOV | PDF docs (100MB, 300pp max) |
| X/Twitter | 4 images max OR 1 video | MP4/MOV | — |

## Security

- Presigned URLs are bearer tokens — **never persist to logs or DB**
- Use immediately after creation (TTL ~15 minutes, Late.dev-controlled). If the API allows configuring TTL, request 5 minutes maximum to minimize exposure window
- Validate content-type matches file magic bytes before upload
- Max 5GB per file
```

- [ ] **Step 5: Create late-accounts/SKILL.md**

Write to `_infrastructure/late-skills/late-accounts/SKILL.md`:

```markdown
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
```

- [ ] **Step 6: Create 5 mirror copies under skills/infrastructure/**

For each of the 5 skills, copy the file to `skills/infrastructure/<skill-name>/SKILL.md`:

```bash
mkdir -p skills/infrastructure/late-common skills/infrastructure/late-publish \
  skills/infrastructure/late-status skills/infrastructure/late-media \
  skills/infrastructure/late-accounts

cp _infrastructure/late-skills/late-common/SKILL.md skills/infrastructure/late-common/SKILL.md
cp _infrastructure/late-skills/late-publish/SKILL.md skills/infrastructure/late-publish/SKILL.md
cp _infrastructure/late-skills/late-status/SKILL.md skills/infrastructure/late-status/SKILL.md
cp _infrastructure/late-skills/late-media/SKILL.md skills/infrastructure/late-media/SKILL.md
cp _infrastructure/late-skills/late-accounts/SKILL.md skills/infrastructure/late-accounts/SKILL.md
```

- [ ] **Step 7: Commit**

```bash
git add _infrastructure/late-skills/ skills/infrastructure/late-*
git commit -m "feat(social): add 5 Late.dev infrastructure skills with plugin mirrors"
```

---

### Task 4: Preflight Registry & Fix Messages (`wt-infra`)

**Files:**
- Modify: `_infrastructure/preflight/dependency-registry.json`
- Modify: `_infrastructure/preflight/references/fix-messages.md`

- [ ] **Step 1: Add social namespace to dependency registry**

Add to the `namespaces` object in `_infrastructure/preflight/dependency-registry.json`:

```json
"social": {
  "required": ["late"],
  "optional": ["notion", "filesystem"]
}
```

Also add the `late` dependency definition to the `dependencies` section:

```json
"late": {
  "check": "node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs --validate-only",
  "description": "Late.dev social media publishing API"
}
```

- [ ] **Step 2: Add Late.dev fix message**

Append to `_infrastructure/preflight/references/fix-messages.md`:

```markdown
## late

**Required by**: social

**How to fix**:
1. Sign up at https://getlate.dev
2. Go to Settings > API Keys > Create Key
3. Add to your environment:
   ```
   export LATE_API_KEY="sk_your_key_here"
   ```
   Or add to your `.env` file (ensure `chmod 600`).
4. Verify: `node scripts/late-tool.mjs --diagnostic`
```

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/preflight/dependency-registry.json _infrastructure/preflight/references/fix-messages.md
git commit -m "feat(social): register Late.dev dependency in preflight system"
```

---

### Task 5: Review — Infrastructure Worktree (`wt-infra`)

- [ ] **Step 1: Request code review**

Use @superpowers:requesting-code-review to review all files created in `wt-infra`:
- `_infrastructure/auth/resolve-env.mjs` — shared utility, check for security issues
- `scripts/late-tool.mjs` — CLI wrapper, check error handling, retry logic, key masking
- `_infrastructure/late-skills/` — 5 skill files, check completeness against spec
- Preflight entries — check format matches existing entries

Review against spec: `docs/superpowers/specs/2026-03-13-social-media-posting-design.md`

- [ ] **Step 2: Address review feedback**

Fix any issues raised. Re-request review if substantial changes made.

- [ ] **Step 3: Final commit after review**

```bash
git add -A
git commit -m "fix(social): address code review feedback on infrastructure"
```

---

### Task 6: Domain Skills (`wt-skills`)

**Files:**
- Create: `skills/social/platform-adaptation/SKILL.md`
- Create: `skills/social/platform-adaptation/references/platform-constraints.md`
- Create: `skills/social/cross-posting/SKILL.md`
- Create: `skills/social/posting-cadence/SKILL.md`

Use @skill-creator:skill-creator for each domain skill. Domain skills use `globs` and "Activates when..." description pattern.

- [ ] **Step 1: Create platform-adaptation/SKILL.md**

Write to `skills/social/platform-adaptation/SKILL.md`:

```markdown
---
name: platform-adaptation
description: "Activates when adapting content for social media platforms. Provides per-platform content rules, character limits, media constraints, and formatting guidelines for LinkedIn and X/Twitter."
globs: ["commands/social/*.md"]
---

# Platform Adaptation

Per-platform content rules for adapting social media content. Used by the Content Adapter agent and the `social:post`/`social:cross-post` commands.

## LinkedIn

- **Character limit**: 3,000 characters
- **Formatting**: Line breaks, bold (`**text**`), italic (`*text*`)
- **Hashtags**: 3-5 at end of post, industry-relevant
- **First comment**: Use for links/promotional content to boost algorithm reach
- **Multi-org**: Can post to company pages if authorized via `orgs` platform option
- **Media**: Multiple images, video (MP4/MOV), PDF documents (100MB max, 300 pages max)
- **Tone**: Professional, insightful, value-driven
- **CTA style**: Professional ("Learn more in the comments", "What's your experience?")

## X/Twitter

- **Character limit**: 280 characters per tweet
- **Threads**: Array of `threadItems`, each <= 280 chars
  - Split at paragraph boundaries first, then sentence boundaries
  - Each thread item should be standalone-readable
  - First item gets the hook, last item gets the CTA
  - Number threads with (1/N) suffix
- **Hashtags**: 1-2 inline, trending awareness
- **Media**: 4 images max OR 1 video per tweet (MP4/MOV)
- **Reply chains**: Via `replyTo` parameter
- **Formatting**: Plain text only (no markdown)
- **Tone**: Conversational, punchy, direct
- **CTA style**: Casual ("Thoughts?", "RT if you agree", "Thread below")

## Adaptation Rules

When adapting content from one platform to another:
1. Adjust character count (truncate or split as needed)
2. Shift tone (professional <-> conversational)
3. Adapt hashtag strategy (count and placement)
4. Adjust CTA to platform culture
5. Handle media constraints (may need separate media per platform)
6. Sanitize content before output — strip potential injection payloads

## Reference

See `references/platform-constraints.md` for exact API field mappings and validation rules.
```

- [ ] **Step 2: Create platform-constraints.md reference**

Write to `skills/social/platform-adaptation/references/platform-constraints.md`:

```markdown
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
```

- [ ] **Step 3: Create cross-posting/SKILL.md**

Write to `skills/social/cross-posting/SKILL.md`:

```markdown
---
name: cross-posting
description: "Activates when publishing content to multiple platforms. Provides adaptation strategies, tone shifting, and engagement patterns for multi-platform content."
globs: ["commands/social/cross-post.md", "commands/social/reply.md"]
---

# Cross-Posting Strategies

## Content Adaptation Pipeline

When publishing to multiple platforms from a single source:

1. **Detect content type**: Long-form article, short post, listicle, thread
2. **Per-platform adaptation**:
   - Adjust length to platform limits
   - Shift tone (LinkedIn: professional, X: conversational)
   - Adapt hashtag strategy
   - Adjust CTA to platform culture
   - Handle media constraints
3. **Preview all adaptations** side-by-side for user approval
4. **User can edit** individual variants inline before confirming
5. **Publish simultaneously** via Late.dev API
6. **Track with Cross-Post Group ID** (shared UUID in Content DB)

## Adaptation Patterns

### Long-Form to Thread
Content > 280 chars for X/Twitter:
- Split at paragraph boundaries first, then sentence boundaries
- Each thread item must be standalone-readable
- First item: hook (grab attention)
- Last item: CTA (drive action)
- Number with (1/N) suffix

### Tone Shifting
- **LinkedIn -> X**: Remove formal transitions, shorten sentences, add personality
- **X -> LinkedIn**: Expand points, add context, professional framing

### Hashtag Strategy
- **LinkedIn**: 3-5 targeted hashtags appended at end
- **X**: 1-2 inline hashtags, trending-aware

### CTA Adaptation
- **LinkedIn**: "Learn more in the comments", "What's your experience with this?"
- **X**: "Thoughts?", "RT if you agree", "Thread below"

## Engagement Patterns

### Reply Tone
Match the platform's culture when replying:
- **LinkedIn**: Professional, add value, ask follow-up questions
- **X**: Conversational, brief, can use humor

### Engagement Benchmarks
- **LinkedIn**: 2-5% engagement rate = good
- **X**: 1-3% engagement rate = good

### Quote Retweets (X)
Always add commentary — never just reshare without value-add.
```

- [ ] **Step 4: Create posting-cadence/SKILL.md**

Write to `skills/social/posting-cadence/SKILL.md`:

```markdown
---
name: posting-cadence
description: "Activates when scheduling posts or managing queue. Provides optimal posting times, frequency recommendations, and content calendar management per platform."
globs: ["commands/social/schedule.md", "commands/social/queue.md"]
---

# Posting Cadence & Queue Management

## Optimal Posting Times

### LinkedIn
- **Best days**: Tuesday-Thursday
- **Best times**: 8-10am and 12-1pm (user's local timezone)
- **Frequency**: 3-5 posts per week
- **Default schedule suggestion**: "weekdays 10:00am"

### X/Twitter
- **Best days**: Weekdays for B2B, all week for B2C
- **Best times**: 12-1pm and 5-6pm weekdays; 9-10am weekends
- **Frequency**: 3-5 posts per day (higher volume expected)
- **Default schedule suggestion**: "weekdays 12:00pm, 5:00pm" (dual slots)

## Queue Management

Queue slots are pre-configured recurring time windows. When a user schedules with `--queue`, the post goes into the next available slot.

### Queue Workflow
1. User sets up time slots via `social:queue add`
2. Posts scheduled with `--queue` fill the next available slot
3. `social:queue list` shows upcoming slots and which are filled

## Content Calendar Awareness

Before scheduling a new post:
1. Check for existing scheduled posts at the same time
2. Warn if posting frequency exceeds platform recommendations
3. Suggest alternative times if conflicts detected

## Scheduling Infrastructure

The `social` namespace supports `--schedule` for recurring posts:
- Natural language: `"weekdays 9:00am"`, `"every friday 3pm"`
- 5-field cron: `"0 9 * * 1-5"`
- `--persistent`: OS-level cron instead of session-scoped
- `--schedule status`: Show current schedule
- `--schedule disable`: Remove schedule

Generates P27 Workflow YAML per `_infrastructure/scheduling/SKILL.md`.
```

- [ ] **Step 5: Commit domain skills**

```bash
git add skills/social/
git commit -m "feat(social): add 3 domain skills — platform-adaptation, cross-posting, posting-cadence"
```

---

### Task 7: Notion DB Template & CLAUDE.md Updates (`wt-skills`)

**Files:**
- Modify: `_infrastructure/notion-db-templates/hq-content.json`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update hq-content.json**

Add the following properties to the `properties` object in `_infrastructure/notion-db-templates/hq-content.json`:

```json
"Platform": {
  "type": "multi_select",
  "multi_select": {
    "options": [
      { "name": "LinkedIn", "color": "blue" },
      { "name": "X", "color": "default" },
      { "name": "Instagram", "color": "pink" },
      { "name": "Facebook", "color": "blue" },
      { "name": "TikTok", "color": "default" },
      { "name": "YouTube", "color": "red" },
      { "name": "Pinterest", "color": "red" },
      { "name": "Reddit", "color": "orange" },
      { "name": "Bluesky", "color": "blue" },
      { "name": "Threads", "color": "default" },
      { "name": "Google Business", "color": "green" },
      { "name": "Telegram", "color": "blue" },
      { "name": "Snapchat", "color": "yellow" }
    ]
  }
},
"Post ID": {
  "type": "rich_text",
  "rich_text": {}
},
"Published URL": {
  "type": "url",
  "url": {}
},
"Schedule Time": {
  "type": "date",
  "date": {}
},
"Engagement": {
  "type": "number",
  "number": { "format": "number" }
},
"Cross-Post Group": {
  "type": "rich_text",
  "rich_text": {}
},
"Publish Status": {
  "type": "select",
  "select": {
    "options": [
      { "name": "Pending", "color": "yellow" },
      { "name": "Published", "color": "green" },
      { "name": "Partial", "color": "orange" },
      { "name": "Failed", "color": "red" },
      { "name": "Draft", "color": "gray" }
    ]
  }
},
"Late Profile": {
  "type": "rich_text",
  "rich_text": {}
}
```

Also add new Type values to the existing `Type` select property options:
- `Social Post`
- `X Post`
- `X Thread`
- `LinkedIn Thread`
- `Cross-Post`

- [ ] **Step 2: Update CLAUDE.md namespace table**

Add row to the namespace quick reference table in `CLAUDE.md`:

```markdown
| 33 | Social Media | `social` | post, cross-post, schedule, draft, status, reply, analytics, queue, connect, profiles, webhooks | Late.dev | Content (Social Post, X Post, X Thread, LinkedIn Thread, Cross-Post) |
```

Update the project overview paragraph to reference 33 namespaces (it should already say 33).

Add to the MCP Servers & External Tools section (after the existing item 5 for Web Search MCP, before the `> **Note**` block):

```markdown
6. **Late.dev** CLI (`scripts/late-tool.mjs`, 1 namespace) - Social media publishing across 13 platforms. Run `/founder-os:social:connect` to add accounts.
```

Add `social` to the scheduling support list. In the `### Universal Patterns` section under `**Scheduling support**`, update the namespace list from:
```
briefing, review, followup, health, drive, slack, crm, morning, learn
```
to:
```
briefing, review, followup, health, drive, slack, crm, morning, learn, social
```
Also update the count from "9 namespaces" to "10 namespaces".

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/notion-db-templates/hq-content.json CLAUDE.md
git commit -m "feat(social): update Notion Content DB template and CLAUDE.md namespace reference"
```

---

### Task 8: Review — Skills & DB Worktree (`wt-skills`)

- [ ] **Step 1: Request code review**

Use @superpowers:requesting-code-review to review all files in `wt-skills`:
- `skills/social/` — 3 domain skills + reference file. Check frontmatter format, globs patterns, content completeness against spec
- `hq-content.json` changes — check property types, select options match spec
- `CLAUDE.md` changes — check table format, accurate command list

Review against spec: `docs/superpowers/specs/2026-03-13-social-media-posting-design.md`

- [ ] **Step 2: Address review feedback**

Fix any issues raised. Re-request review if substantial changes made.

- [ ] **Step 3: Final commit after review**

```bash
git add -A
git commit -m "fix(social): address code review feedback on domain skills and DB template"
```

---

## Chunk 2: Wave 2 — Commands (Parallel, 3 Worktrees)

> Three worktrees run in parallel. `wt-pub-cmds` builds 5 publishing commands, `wt-int-cmds` builds 3 interaction commands, `wt-mgmt-cmds` builds 3 management commands. Depends on Wave 1 completion (skills and infrastructure must exist).

### Task 9: Publishing Commands (`wt-pub-cmds`)

**Files:**
- Create: `commands/social/post.md`
- Create: `commands/social/cross-post.md`
- Create: `commands/social/schedule.md`
- Create: `commands/social/draft.md`
- Create: `commands/social/status.md`

Use @plugin-dev:command-development for each command file. All commands follow the universal execution flow from the spec and existing patterns (e.g., `commands/linkedin/post.md`).

- [ ] **Step 1: Create post.md**

Write to `commands/social/post.md`:

```markdown
---
description: Create and publish content to one or more social media platforms
argument-hint: '"Post text" --platforms=linkedin,x [--from=file|url] [--media=path] [--schedule=time] [--draft] [--thread] [--team] [--audience=hint] [--format=table|json|markdown]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# social:post

Create and publish content to one or more platforms via Late.dev.

## Skills

Read these skill files before proceeding:

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md` — auth, errors, conventions
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-publish/SKILL.md` — publishing patterns
3. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/platform-adaptation/SKILL.md` — per-platform rules
4. If `--schedule` provided: Read `${CLAUDE_PLUGIN_ROOT}/skills/social/posting-cadence/SKILL.md`
5. If `--media` provided: Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-media/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `text` | Yes (unless `--from`) | Post text (positional) |
| `--platforms` | Yes | Comma-separated target platforms (e.g., `linkedin,x`) |
| `--from` | No | Source file path or Notion page URL |
| `--media` | No | Comma-separated file paths for images/videos/documents |
| `--schedule` | No | Schedule for future time (natural language or ISO 8601) |
| `--draft` | No | Save as draft without publishing |
| `--thread` | No | Enable thread mode (X threads, LinkedIn carousel) |
| `--team` | No | Activate full agent pipeline |
| `--audience` | No | Target audience hint for content adaptation |
| `--format` | No | Output format: table (default), json, markdown |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files. If present, read them to personalize tone, voice, and brand.

## Preflight Check

Run `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md` for namespace `social`.
- Required: `late` (validate `$LATE_API_KEY` + probe `late-tool.mjs --validate-only`)
- Optional: `notion` (for Content DB logging), `filesystem` (for `--from` file source)

**Interim check** (until preflight ships):
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs --validate-only
```
If failed: show fix instructions from `_infrastructure/preflight/references/fix-messages.md` > `late`.

## Step 0: Memory Context

Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `social posting`, `linkedin`, `content publishing`, user's brand voice.
Inject top 5 relevant memories.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:post` runs.

## Phase 1/3: Content Preparation

Display: `Phase 1/3: Preparing content...`

1. **Parse source content**:
   - If `--from` is a file path: read the file
   - If `--from` is a Notion URL: fetch page content via `notion-tool.mjs`
   - If positional `text`: use directly
2. **Detect content type**: short post, long-form, listicle, thread-candidate
3. **Apply audience hint** if `--audience` provided

## Phase 2/3: Platform Adaptation

Display: `Phase 2/3: Adapting for platforms...`

For each platform in `--platforms`:
1. Apply platform-adaptation skill rules (character limits, tone, hashtags)
2. If `--thread` and content > 280 chars for X: split into thread items
3. Validate content against platform constraints
4. If `--media`: validate files per platform media rules

Show preview of adapted content per platform with character counts.

If multi-platform: show side-by-side comparison.

## Phase 3/3: Publishing

Display: `Phase 3/3: Publishing...`

1. If `--media`: upload each file via `late-tool.mjs media presign`, collect public URLs
2. For each platform:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
     --accounts='["<account_id>"]' \
     --text="<adapted_text>" \
     --media='[<media_items>]' \
     [--schedule="<iso_timestamp>"] \
     [--draft] \
     [--platform-options='<json>']
   ```
3. Collect post IDs and per-platform status

## Output

Display results in `--format` (default: table):

| Platform | Status | URL | Post ID |
|----------|--------|-----|---------|
| LinkedIn | Published | https://... | post_abc |
| X | Published | https://... | post_def |

## Notion DB Logging (Optional)

If Notion available, create/update entry in `[FOS] Content`:
- **Title**: First 50 chars of post text
- **Type**: "Social Post" (single platform) or "Cross-Post" (multi-platform)
- **Platform**: Selected platforms
- **Post ID**: Late.dev post ID
- **Published URL**: Direct link to live post
- **Schedule Time**: If scheduled
- **Publish Status**: Pending/Published/Failed/Draft
- **Status**: Published (content lifecycle)
- **Late Profile**: Profile name used

## Self-Healing: Error Recovery

- **Transient** (rate limits, network): Auto-retried by CLI (up to 3x)
- **Recoverable** (platform failure): Show error, suggest `social:status --failed` for retry
- **Degradable** (Notion unavailable): Skip DB logging, warn user
- **Fatal** (auth failure): Halt with fix instructions

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Platforms used, success/failure per platform
- Content length and type
- Whether media was included
- Scheduling vs immediate

## Intelligence: Post-Command

Log execution metrics for future optimization.
```

- [ ] **Step 2: Create cross-post.md**

Write to `commands/social/cross-post.md`:

```markdown
---
description: Multi-platform publish from P24 output with automatic adaptation
argument-hint: "--from=<file|url|clipboard> --platforms=linkedin,x [--adapt] [--team] [--format=table|json|markdown]"
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# social:cross-post

The P24 bridge command. Takes content generated by `linkedin:post`, `linkedin:from-doc`, or `linkedin:variations` and publishes to multiple platforms with automatic per-platform adaptation.

## Skills

Read these skill files before proceeding:

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-publish/SKILL.md`
3. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/platform-adaptation/SKILL.md`
4. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/cross-posting/SKILL.md`
5. If media present: Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-media/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--from` | Yes | Source file path, Notion page URL, or `clipboard` |
| `--platforms` | Yes | Comma-separated target platforms |
| `--adapt` | No | Force per-platform adaptation (default: true for multi-platform) |
| `--team` | No | Activate full agent pipeline (Content Adapter > Preview > Media > Publisher > Monitor) |
| `--format` | No | Output format: table (default), json, markdown |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files.

## Preflight Check

Run preflight for namespace `social`. Same as `social:post`.

## Step 0: Memory Context

Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`.
Query for: `cross-posting`, `content adaptation`, platform-specific memories.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:cross-post` runs.

## Phase 1/4: Load Source Content

Display: `Phase 1/4: Loading source content...`

1. Detect source type:
   - File path: read file, detect format (markdown, plain text, rich text)
   - Notion URL: fetch page content via `notion-tool.mjs`
   - `clipboard`: read from system clipboard
2. Detect content type: long-form article, short post, listicle, thread-candidate

## Phase 2/4: Adapt Per Platform

Display: `Phase 2/4: Adapting content for ${platforms.length} platforms...`

For each target platform, apply cross-posting skill:
1. Adjust length to platform limits
2. Shift tone (professional <-> conversational)
3. Adapt hashtags (count and placement)
4. Adjust CTA to platform culture
5. Handle media constraints
6. Sanitize content

## Phase 3/4: Preview & Approval

Display: `Phase 3/4: Review adaptations...`

Show all platform variants side-by-side:
- Character count vs limit per variant
- Highlight differences from source
- Show media attachments per platform
- List warnings (e.g., "LinkedIn post is 2847/3000 chars")

Ask user: **Approve all / Edit individual / Cancel**

If user edits, validate against platform constraints.

## Phase 4/4: Publish

Display: `Phase 4/4: Publishing to ${platforms.length} platforms...`

Generate a Cross-Post Group UUID. For each platform:
1. Upload media if present
2. Call `late-tool.mjs posts create` with adapted content
3. Collect post IDs and status

## Output

Display results table with per-platform status and URLs.

## Notion DB Logging (Optional)

Create entries in `[FOS] Content`:
- One "Cross-Post" parent record with Cross-Post Group UUID
- One record per platform variant with same Cross-Post Group UUID
- Type: platform-specific (e.g., "Social Post", "X Thread")

## Self-Healing: Error Recovery

Same error classification as `social:post`. On partial failure (some platforms succeed, others fail): display successful posts and offer retry for failed ones.

## Final Step: Observation Logging

Record: platforms used, adaptation quality, user edits made, success rate.

## Intelligence: Post-Command

Log execution metrics.
```

- [ ] **Step 3: Create schedule.md**

Write to `commands/social/schedule.md`:

```markdown
---
description: Schedule posts for optimal times or queue slots
argument-hint: '"Post text" --platforms=linkedin [--at="tomorrow 9am"] [--queue] [--timezone=America/New_York] [--format=table|json|markdown]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# social:schedule

Schedule posts for future publication at specific times or into queue slots.

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-publish/SKILL.md`
3. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/posting-cadence/SKILL.md`
4. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/platform-adaptation/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `text` | Yes | Post text (positional) |
| `--platforms` | Yes | Target platforms |
| `--at` | No | Specific time (natural language or ISO 8601) |
| `--queue` | No | Add to next available queue slot |
| `--timezone` | No | Override default timezone |
| `--format` | No | Output format |

If neither `--at` nor `--queue`, suggest optimal times from posting-cadence skill.

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/`.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `scheduling`, `posting times`, `queue management`.

## Phase 1/3: Content Preparation

Same as `social:post` Phase 1.

## Phase 2/3: Schedule Resolution

1. If `--at`: convert natural language to ISO 8601 with timezone
2. If `--queue`: fetch queue slots via `late-tool.mjs queue list`, find next available
3. If neither: suggest optimal times per posting-cadence skill
4. Check for conflicts with existing scheduled posts

## Phase 3/3: Create Scheduled Post

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
  --accounts='["<account_id>"]' \
  --text="<text>" \
  --schedule="<iso_timestamp>"
```

## Output

| Platform | Scheduled For | Post ID | Queue Slot |
|----------|--------------|---------|------------|

## Notion DB Logging (Optional)

Create entry with Publish Status: "Pending", Schedule Time set.

## Scheduling Support (`--schedule` flag)

For recurring scheduled posts:
```
--schedule "weekdays 10:00am"    # Natural language
--schedule "0 10 * * 1-5"       # Cron
--schedule status                # Show current
--schedule disable               # Remove
```

Generates P27 Workflow YAML per `_infrastructure/scheduling/SKILL.md`.

## Final Step: Observation Logging

Record: scheduled time, platform, queue slot used.
```

- [ ] **Step 4: Create draft.md**

Write to `commands/social/draft.md`:

```markdown
---
description: Save draft posts without publishing
argument-hint: '"Draft text" --platforms=linkedin,x [--media=path] [--format=table|json|markdown]'
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: background
result-format: summary
---

# social:draft

Save drafts to Late.dev without publishing. Useful for preparing content for later review and publishing.

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-publish/SKILL.md`
3. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/platform-adaptation/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `text` | Yes | Draft text (positional) |
| `--platforms` | Yes | Target platforms |
| `--media` | No | File paths for media attachments |
| `--format` | No | Output format |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/`.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `drafts`, `content planning`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:draft` runs.

## Phase 1/2: Content Preparation

1. Parse text input
2. If multi-platform: adapt content per platform rules
3. If `--media`: validate files per platform constraints

## Phase 2/2: Save Draft

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
  --accounts='["<account_id>"]' \
  --text="<text>" \
  --draft
```

## Output

| Platform | Draft ID | Status |
|----------|----------|--------|
| LinkedIn | post_abc | Draft saved |

## Notion DB Logging (Optional)

Create entry with Type: "Social Post", Publish Status: "Draft", Status: "Draft".

## Final Step: Observation Logging

Record: platforms, draft saved status.

## Intelligence: Post-Command

Log execution metrics for future optimization.
```

- [ ] **Step 5: Create status.md**

Write to `commands/social/status.md`:

```markdown
---
description: Check post status and per-platform results
argument-hint: "[post-id] [--all] [--failed] [--recent=10] [--format=table|json|markdown]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:status

Check post status and per-platform delivery results.

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-status/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `post-id` | No | Specific post ID to check (positional) |
| `--all` | No | Show all posts |
| `--failed` | No | Filter to failed posts with retry option |
| `--recent` | No | Show N most recent posts (default: 10) |
| `--format` | No | Output format |

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `post status`, `publishing issues`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:status` runs.

## Phase 1/2: Fetch Status

1. If `post-id` provided:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts status --post-id=<post-id>
   ```
2. If `--failed`:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts list --status=failed --limit=20
   ```
3. If `--recent` or `--all`:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts list --limit=<N>
   ```

## Phase 2/2: Display & Actions

Show per-platform breakdown:

| Platform | Status | URL | Error |
|----------|--------|-----|-------|
| LinkedIn | Published | https://... | — |
| X | Failed | — | Rate limit exceeded |

If any failed: offer `Retry failed platforms? (y/n)`

If yes:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts retry --post-id=<post-id>
```

## Final Step: Observation Logging

Record: status check results, retry actions taken.

## Intelligence: Post-Command

Log execution metrics for future optimization.
```

- [ ] **Step 6: Commit all publishing commands**

```bash
git add commands/social/post.md commands/social/cross-post.md commands/social/schedule.md commands/social/draft.md commands/social/status.md
git commit -m "feat(social): add 5 publishing commands — post, cross-post, schedule, draft, status"
```

---

### Task 10: Review — Publishing Commands (`wt-pub-cmds`)

- [ ] **Step 1: Request code review**

Use @superpowers:requesting-code-review to review:
- All 5 command files against the spec's command descriptions
- Check frontmatter format (description, argument-hint, allowed-tools, execution-mode, result-format)
- Verify universal execution flow (skills, business context, preflight, memory, phases, error recovery, observation logging)
- Verify Late.dev CLI calls match `late-tool.mjs` subcommand signatures

- [ ] **Step 2: Address review feedback and commit**

```bash
git add -A
git commit -m "fix(social): address review feedback on publishing commands"
```

---

### Task 11: Interaction Commands (`wt-int-cmds`)

**Files:**
- Create: `commands/social/reply.md`
- Create: `commands/social/analytics.md`
- Create: `commands/social/queue.md`

Use @plugin-dev:command-development for each command.

- [ ] **Step 1: Create reply.md**

Write to `commands/social/reply.md`:

```markdown
---
description: Reply or comment on social media posts
argument-hint: '--post-id=xxx "Reply text" [--platform=linkedin] [--format=table|json|markdown]'
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:reply

Reply or comment on existing social media posts.

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-publish/SKILL.md`
3. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/cross-posting/SKILL.md` — engagement patterns section

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--post-id` | Yes | Post ID to reply to |
| `text` | Yes | Reply text (positional) |
| `--platform` | No | Target platform (if post is cross-posted) |
| `--format` | No | Output format |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/`.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `replies`, `engagement`, `comment style`.

## Phase 1/2: Prepare Reply

1. Fetch post details to understand context:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts status --post-id=<post-id>
   ```
2. Apply engagement patterns from cross-posting skill:
   - LinkedIn: professional, add value, ask follow-up questions
   - X: conversational, brief, can use humor
3. Validate reply length against platform limits

## Phase 2/2: Post Reply

For LinkedIn (first comment pattern):
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
  --accounts='["<account_id>"]' \
  --text="<reply_text>" \
  --platform-options='{"replyTo":"<post-id>"}'
```

## Output

| Platform | Status | Reply URL |
|----------|--------|-----------|

## Final Step: Observation Logging

Record: reply posted, platform, engagement context.
```

- [ ] **Step 2: Create analytics.md**

Write to `commands/social/analytics.md`:

```markdown
---
description: View engagement metrics for social media posts
argument-hint: "[post-id] [--range=7d|30d|90d] [--platform=linkedin] [--format=table|json|markdown]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:analytics

View engagement metrics for posts. Requires Late.dev Analytics add-on.

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-status/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `post-id` | No | Specific post ID (positional) |
| `--range` | No | Date range: 7d, 30d, 90d (default: 7d) |
| `--platform` | No | Filter to specific platform |
| `--format` | No | Output format |

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `analytics`, `engagement metrics`, `post performance`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:analytics` runs.

## Phase 1/1: Fetch & Display Analytics

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs analytics get \
  [--post-id=<post-id>] \
  [--account-id=<account-id>] \
  [--date-range=<range>]
```

### Graceful Degradation

If Analytics add-on not available (API returns 403/feature-not-available):
- Display: "Analytics requires the Late.dev Analytics add-on. Upgrade at https://getlate.dev/pricing"
- Do NOT fail the command — return gracefully with status message

### Display Metrics

| Metric | LinkedIn | X |
|--------|----------|---|
| Likes | 45 | 123 |
| Comments | 12 | 34 |
| Shares/Retweets | 8 | 56 |
| Impressions | 2,340 | 8,901 |
| Reach | 1,890 | 6,543 |
| Clicks | 67 | 234 |

Show engagement rate comparison against benchmarks (from cross-posting skill).

## Notion DB Update (Optional)

Update Engagement property on matching Content DB entries.

## Final Step: Observation Logging

Record: analytics fetched, engagement metrics, platform performance.

## Intelligence: Post-Command

Log execution metrics for future optimization.
```

- [ ] **Step 3: Create queue.md**

Write to `commands/social/queue.md`:

```markdown
---
description: Manage posting queue time slots
argument-hint: "[list|add|remove] [--day=weekdays] [--time=9:00am] [--profile=default] [--format=table|json|markdown]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:queue

Manage posting queue time slots for automated scheduling.

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/social/posting-cadence/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `action` | No | `list` (default), `add`, or `remove` (positional) |
| `--day` | For `add` | Day pattern: `weekdays`, `monday`, `everyday`, etc. |
| `--time` | For `add` | Time slot (e.g., `9:00am`, `14:00`) |
| `--profile` | No | Late.dev profile (default: first profile) |
| `--slot-id` | For `remove` | Slot ID to remove |
| `--format` | No | Output format |

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `queue management`, `posting schedule`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:queue` runs.

## Execution

### List Queue Slots

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs queue list [--profile=<profile>]
```

Display:

| Day | Time | Slot ID | Next Post |
|-----|------|---------|-----------|
| Mon-Fri | 10:00am | slot_123 | (empty) |
| Mon-Fri | 5:00pm | slot_456 | "Post about..." |

### Add Queue Slot

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs queue add \
  --profile=<profile> --day=<day> --time=<time>
```

If no slots exist, suggest defaults from posting-cadence skill:
- LinkedIn: weekdays 10:00am
- X: weekdays 12:00pm, 5:00pm

### Remove Queue Slot

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs queue remove --slot-id=<slot-id>
```

## Final Step: Observation Logging

Record: queue action taken, slots configured.

## Intelligence: Post-Command

Log execution metrics for future optimization.
```

- [ ] **Step 4: Commit interaction commands**

```bash
git add commands/social/reply.md commands/social/analytics.md commands/social/queue.md
git commit -m "feat(social): add 3 interaction commands — reply, analytics, queue"
```

---

### Task 12: Review — Interaction Commands (`wt-int-cmds`)

- [ ] **Step 1: Request code review**

Use @superpowers:requesting-code-review. Check same criteria as Task 10.

- [ ] **Step 2: Address review feedback and commit**

```bash
git add -A
git commit -m "fix(social): address review feedback on interaction commands"
```

---

### Task 13: Management Commands (`wt-mgmt-cmds`)

**Files:**
- Create: `commands/social/connect.md`
- Create: `commands/social/profiles.md`
- Create: `commands/social/webhooks.md`

Use @plugin-dev:command-development for each command.

- [ ] **Step 1: Create connect.md**

Write to `commands/social/connect.md`:

```markdown
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
```

- [ ] **Step 2: Create profiles.md**

Write to `commands/social/profiles.md`:

```markdown
---
description: Manage Late.dev profiles (brand groupings)
argument-hint: "[list|create|delete] [--name='My Brand'] [--format=table|json|markdown]"
allowed-tools: ["Read", "Bash"]
execution-mode: background
result-format: summary
---

# social:profiles

Manage Late.dev profiles — brand groupings that organize social accounts.

## Skills

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-accounts/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `action` | No | `list` (default), `create`, or `delete` (positional) |
| `--name` | For `create` | Profile name |
| `--profile-id` | For `delete` | Profile ID to delete |
| `--format` | No | Output format |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `profile management`, `brand groupings`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:profiles` runs.

## Execution

### List Profiles

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs profiles list
```

| Profile | ID | Accounts |
|---------|-----|----------|
| Default | prof_123 | LinkedIn (acc_abc), X (acc_def) |

### Create Profile

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs profiles create --name="<name>"
```

### Delete Profile

Confirm with user before deleting. Warn if profile has connected accounts.

## Final Step: Observation Logging

Record: profile action taken.

## Intelligence: Post-Command

Log execution metrics for future optimization.
```

- [ ] **Step 3: Create webhooks.md**

Write to `commands/social/webhooks.md`:

```markdown
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

1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-common/SKILL.md`
2. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/late-skills/late-accounts/SKILL.md`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `action` | No | `get` (default) or `set` (positional) |
| `--url` | For `set` | Webhook URL (HTTPS only) |
| `--secret` | For `set` | HMAC signing secret (or auto-generate) |
| `--format` | No | Output format |

## Business Context (Optional)

Check `${CLAUDE_PLUGIN_ROOT}/_infrastructure/context/active/` for `.md` files.

## Preflight Check

Run preflight for namespace `social`.

## Step 0: Memory Context

Query for: `webhook configuration`, `status callbacks`.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past `social:webhooks` runs.

## Execution

### Get Webhook Config

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs webhooks get
```

Display current webhook URL (masked after domain) and whether signing is configured.

### Set Webhook

1. **Validate URL**: HTTPS only, valid URL format, warn on non-standard ports
2. **Signing secret**: If `--secret` not provided, generate a random HMAC secret
3. Configure:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs webhooks set \
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
```

- [ ] **Step 4: Commit management commands**

```bash
git add commands/social/connect.md commands/social/profiles.md commands/social/webhooks.md
git commit -m "feat(social): add 3 management commands — connect, profiles, webhooks"
```

---

### Task 14: Review — Management Commands (`wt-mgmt-cmds`)

- [ ] **Step 1: Request code review**

Use @superpowers:requesting-code-review. Specific attention to:
- `connect.md`: OAuth/PKCE security, foreground execution mode, audit logging
- `webhooks.md`: HMAC signing, HTTPS-only validation, secret storage

- [ ] **Step 2: Address review feedback and commit**

```bash
git add -A
git commit -m "fix(social): address review feedback on management commands"
```

---

## Chunk 3: Wave 3 — Agent Pipeline Team

> Single worktree `wt-agents`. Depends on Wave 1 (infrastructure skills) and Wave 2 (commands, for understanding the pipeline flow). Builds the 5-agent pipeline team activated by `--team` flag.

### Task 15: Agent Team Configuration (`wt-agents`)

**Files:**
- Create: `agents/social/config.json`

Use @plugin-dev:agent-development.

**Note:** Agent frontmatter includes `model: inherit` (not in spec's minimal frontmatter example). This is an intentional addition following the existing `agents/inbox/triage-agent.md` convention, ensuring agents inherit the parent session's model rather than defaulting unpredictably.

- [ ] **Step 1: Create config.json**

Write to `agents/social/config.json`:

```json
{
  "pattern": "pipeline",
  "description": "Multi-platform social media publishing pipeline with preview approval. Activated via --team flag on post or cross-post commands.",
  "execution": "sequential",
  "agents": [
    {
      "name": "content-adapter-agent",
      "role": "Adapt source content for each target platform's constraints and culture",
      "file": "content-adapter-agent.md",
      "order": 1,
      "tools": ["Read"],
      "skills": ["platform-adaptation", "cross-posting"]
    },
    {
      "name": "preview-agent",
      "role": "Show adapted content side-by-side for user approval before publishing",
      "file": "preview-agent.md",
      "order": 2,
      "tools": ["Read"],
      "skills": []
    },
    {
      "name": "media-handler-agent",
      "role": "Upload, resize, and validate media per platform limits",
      "file": "media-handler-agent.md",
      "order": 3,
      "tools": ["Read", "Bash"],
      "skills": ["late-media"]
    },
    {
      "name": "publisher-agent",
      "role": "Execute late-tool.mjs posts create for each platform",
      "file": "publisher-agent.md",
      "order": 4,
      "tools": ["Bash"],
      "skills": ["late-publish"]
    },
    {
      "name": "monitor-agent",
      "role": "Track publish status, retry failures, update Notion DB",
      "file": "monitor-agent.md",
      "order": 5,
      "tools": ["Read", "Bash"],
      "skills": ["late-status"]
    }
  ],
  "coordination": {
    "timeout_per_agent": "45s",
    "error_handling": "continue_on_partial_failure",
    "handoff": "output_of_previous_is_input_of_next",
    "data_format": "structured_json"
  },
  "observability": {
    "log_level": "info",
    "report_on_complete": true,
    "track_per_platform_status": true
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add agents/social/config.json
git commit -m "feat(social): add pipeline agent team configuration"
```

---

### Task 16: Content Adapter Agent (`wt-agents`)

**Files:**
- Create: `agents/social/content-adapter-agent.md`

- [ ] **Step 1: Create content-adapter-agent.md**

Write to `agents/social/content-adapter-agent.md`:

```markdown
---
name: content-adapter-agent
description: Adapts source content for each target platform's constraints and culture
model: inherit
color: blue
tools: ["Read"]
---

# Content Adapter Agent

## Example Usage

```yaml
agent_context:
  source_content: "Long-form LinkedIn post about AI in healthcare..."
  target_platforms: ["linkedin", "x"]
  audience_hint: "startup founders"
  media_paths: ["./chart.png"]
```

## Core Responsibilities

1. Read source content (text, file, or Notion page output)
2. Read `platform-adaptation` skill for per-platform rules
3. Read `cross-posting` skill for adaptation strategies
4. Adapt content for each target platform:
   - LinkedIn: preserve full text (up to 3000 chars), add hashtags, format with line breaks
   - X/Twitter: if > 280 chars, split into thread items
5. Adjust tone per platform (LinkedIn: professional, X: conversational)
6. Handle hashtag adaptation (LinkedIn: 3-5 at end, X: 1-2 inline)
7. Sanitize content before output

## Thread Splitting Rules (X/Twitter)

When content exceeds 280 characters:
1. Split at paragraph boundaries first, then sentence boundaries
2. Each thread item must be standalone-readable
3. First item gets the hook (attention-grabbing opening)
4. Last item gets the CTA (call to action)
5. Number threads with (1/N) suffix
6. Each item <= 280 characters including the suffix

## Input Schema

```json
{
  "sourceContent": "string — raw content text",
  "targetPlatforms": ["linkedin", "x"],
  "audienceHint": "string — optional audience description",
  "mediaPaths": ["string — file paths"],
  "businessContext": "string — optional brand/voice context"
}
```

## Output Schema

```json
{
  "status": "complete",
  "variants": [
    {
      "platform": "linkedin",
      "text": "Adapted LinkedIn text...",
      "charCount": 1234,
      "charLimit": 3000,
      "hashtags": ["#AI", "#Healthcare"],
      "platformOptions": {},
      "mediaItems": []
    },
    {
      "platform": "x",
      "text": "First tweet text (1/3)",
      "threadItems": [
        { "text": "First tweet (1/3)", "mediaItems": [] },
        { "text": "Second tweet (2/3)" },
        { "text": "Final tweet with CTA (3/3)" }
      ],
      "charCount": 250,
      "charLimit": 280,
      "hashtags": ["#AI"],
      "platformOptions": {}
    }
  ]
}
```

## Error Handling

- If content cannot be adapted to platform limits: report as warning, include truncated version
- If source content is empty: return error status
- Always sanitize content before output (strip injection payloads)

## Quality Standards

- Every variant must respect platform character limits
- Hashtags must be relevant to content topic
- Thread items must be coherent independently
- Tone must match platform culture
```

- [ ] **Step 2: Commit**

```bash
git add agents/social/content-adapter-agent.md
git commit -m "feat(social): add content adapter agent with thread splitting"
```

---

### Task 17: Preview Agent (`wt-agents`)

**Files:**
- Create: `agents/social/preview-agent.md`

- [ ] **Step 1: Create preview-agent.md**

Write to `agents/social/preview-agent.md`:

```markdown
---
name: preview-agent
description: Shows adapted content for user approval before publishing
model: inherit
color: cyan
tools: ["Read"]
---

# Preview Agent

## Core Responsibilities

1. Receive adapted content variants from content-adapter-agent
2. Format each platform variant in a clear side-by-side display
3. Show character count vs limit for each variant
4. Highlight media attachments and platform-specific settings
5. List warnings (e.g., "LinkedIn post is 2847/3000 chars")
6. Ask user to approve, edit, or cancel
7. If user edits, validate against platform constraints

## Input Schema

```json
{
  "variants": [
    {
      "platform": "linkedin",
      "text": "...",
      "charCount": 1234,
      "charLimit": 3000,
      "hashtags": [],
      "platformOptions": {},
      "mediaItems": []
    }
  ]
}
```

## Display Format

For each variant, display:

```
┌─ LinkedIn (1234/3000 chars) ─────────────────┐
│                                               │
│ [Full adapted text here]                      │
│                                               │
│ Media: chart.png (image/png)                  │
│ Options: firstComment enabled                 │
│ Warnings: none                                │
└───────────────────────────────────────────────┘

┌─ X/Twitter (Thread: 3 items) ────────────────┐
│ 1/3 (245/280 chars): First tweet text...      │
│ 2/3 (267/280 chars): Second tweet text...     │
│ 3/3 (198/280 chars): Final tweet with CTA...  │
│                                               │
│ Media: chart.png (attached to tweet 1)        │
│ Warnings: none                                │
└───────────────────────────────────────────────┘
```

## User Actions

- **Approve all**: Continue to next agent
- **Edit [platform]**: User edits specific variant inline, re-validate constraints
- **Cancel**: Abort pipeline

## Output Schema

```json
{
  "status": "complete",
  "approved": true,
  "variants": [ "...possibly edited variants..." ]
}
```

If cancelled: `{ "status": "cancelled" }` — pipeline halts.
```

- [ ] **Step 2: Commit**

```bash
git add agents/social/preview-agent.md
git commit -m "feat(social): add preview agent for user approval flow"
```

---

### Task 18: Media Handler Agent (`wt-agents`)

**Files:**
- Create: `agents/social/media-handler-agent.md`

- [ ] **Step 1: Create media-handler-agent.md**

Write to `agents/social/media-handler-agent.md`:

```markdown
---
name: media-handler-agent
description: Uploads, resizes, and validates media per platform limits
model: inherit
color: yellow
tools: ["Read", "Bash"]
---

# Media Handler Agent

## Core Responsibilities

1. Read `late-media` skill for upload workflow
2. Validate file types and sizes per platform constraints
3. Validate content-type matches actual file magic bytes (security)
4. Get presigned URLs via `late-tool.mjs media presign`
5. Upload files to presigned URLs
6. Return public URLs mapped to each platform's post

## Input Schema

```json
{
  "mediaPaths": ["/path/to/photo.jpg", "/path/to/video.mp4"],
  "targetPlatforms": ["linkedin", "x"],
  "variants": [ "...from preview agent..." ]
}
```

## Processing Steps

For each media file:

1. **Validate file exists**: Check file is accessible
2. **Check file type**: Verify against platform constraints
   - LinkedIn: JPEG/PNG/GIF, MP4/MOV, PDF (100MB, 300pp)
   - X: 4 images max OR 1 video, MP4/MOV
3. **Validate content-type**: Match MIME type to file magic bytes
4. **Get presigned URL**:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs media presign \
     --filename=<filename> --content-type=<mime-type>
   ```
5. **Upload**: PUT to presigned URL (internal)
6. **Collect**: Map public URLs to platform variants

## Security

- Presigned URLs are bearer tokens — never log them
- Use immediately after creation (15-minute TTL)
- Validate content-type matches file magic bytes before upload
- Max 5GB per file

## Output Schema

```json
{
  "status": "complete",
  "mediaMap": {
    "linkedin": [
      { "publicUrl": "https://...", "type": "image", "filename": "photo.jpg" }
    ],
    "x": [
      { "publicUrl": "https://...", "type": "image", "filename": "photo.jpg" }
    ]
  }
}
```

## Error Handling

- File not found: report error, skip file, continue with remaining
- Invalid file type for platform: report warning, skip for that platform
- Upload failure: report error with `LATE_MEDIA_ERROR` code
- If no media files: pass through with empty mediaMap (not an error)
```

- [ ] **Step 2: Commit**

```bash
git add agents/social/media-handler-agent.md
git commit -m "feat(social): add media handler agent with upload validation"
```

---

### Task 19: Publisher Agent (`wt-agents`)

**Files:**
- Create: `agents/social/publisher-agent.md`

- [ ] **Step 1: Create publisher-agent.md**

Write to `agents/social/publisher-agent.md`:

```markdown
---
name: publisher-agent
description: Executes late-tool.mjs posts create for each platform
model: inherit
color: green
tools: ["Bash"]
---

# Publisher Agent

## Core Responsibilities

1. Read `late-publish` skill for publishing patterns
2. Receive adapted content + media URLs from upstream agents
3. Call `late-tool.mjs posts create` with per-platform parameters
4. Handle cross-posting (multiple accounts in single call when appropriate)
5. Manage partial failures (some platforms succeed, others fail)
6. Store post IDs for monitoring

## Input Schema

```json
{
  "variants": [
    {
      "platform": "linkedin",
      "text": "...",
      "platformOptions": {},
      "mediaItems": [{ "publicUrl": "https://...", "type": "image" }]
    }
  ],
  "scheduleAt": null,
  "draft": false
}
```

## Processing Steps

For each platform variant:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts create \
  --accounts='["<account_id_for_platform>"]' \
  --text="<adapted_text>" \
  --media='<media_items_json>' \
  --platform-options='<platform_options_json>'
```

If `scheduleAt` is set, add `--schedule="<iso_timestamp>"`.
If `draft` is true, add `--draft`.

## Partial Failure Handling

If some platforms succeed and others fail:
- Continue publishing to remaining platforms
- Collect all results (success and failure)
- Report partial status to monitor agent

## Output Schema

```json
{
  "status": "complete",
  "postId": "post_abc123",
  "perPlatformStatus": [
    { "platform": "linkedin", "status": "published", "url": "https://...", "accountId": "acc_123" },
    { "platform": "x", "status": "failed", "error": "Rate limit exceeded", "accountId": "acc_456" }
  ]
}
```
```

- [ ] **Step 2: Commit**

```bash
git add agents/social/publisher-agent.md
git commit -m "feat(social): add publisher agent with partial failure handling"
```

---

### Task 20: Monitor Agent (`wt-agents`)

**Files:**
- Create: `agents/social/monitor-agent.md`

- [ ] **Step 1: Create monitor-agent.md**

Write to `agents/social/monitor-agent.md`:

```markdown
---
name: monitor-agent
description: Tracks publish status, retries failures, updates Notion DB
model: inherit
color: magenta
tools: ["Read", "Bash"]
---

# Monitor Agent

## Core Responsibilities

1. Read `late-status` skill for status tracking patterns
2. Check `late-tool.mjs posts status` for each post
3. Retry failed platforms up to 2x with `late-tool.mjs posts retry`
4. Update Content DB with final status and published URLs
5. Generate summary report for user
6. Log audit events for each publish/retry action

## Input Schema

```json
{
  "postId": "post_abc123",
  "perPlatformStatus": [
    { "platform": "linkedin", "status": "published", "url": "https://...", "accountId": "acc_123" },
    { "platform": "x", "status": "failed", "error": "...", "accountId": "acc_456" }
  ]
}
```

## Processing Steps

1. **Check status** for any pending/processing platforms:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts status --post-id=<post-id>
   ```

2. **Retry failed** platforms (up to 2 attempts):
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/late-tool.mjs posts retry --post-id=<post-id>
   ```
   Wait 5s between retries. Log each attempt to `.late/audit.log`.

3. **Update Notion DB** (if available):
   - Search for `[FOS] Content` database
   - Create/update entries with final status, Published URLs, Engagement baseline

4. **Generate summary report**:
   - Per-platform status (published/failed)
   - Published URLs
   - Retry attempts and outcomes
   - Engagement data (if available from initial status)

## Audit Logging

Log to `.late/audit.log`:
```json
{"event":"post.publish","timestamp":"<iso>","postId":"<id>","platforms":["linkedin","x"],"status":"published|partial|failed"}
{"event":"post.retry","timestamp":"<iso>","postId":"<id>","platform":"x","attempt":1}
```

## Output Schema

```json
{
  "status": "complete",
  "summary": {
    "total_platforms": 2,
    "published": 1,
    "failed": 1,
    "retried": 1,
    "retry_succeeded": 0
  },
  "results": [
    { "platform": "linkedin", "status": "published", "url": "https://..." },
    { "platform": "x", "status": "failed", "error": "...", "retryAttempts": 2 }
  ],
  "notionUpdated": true
}
```
```

- [ ] **Step 2: Commit**

```bash
git add agents/social/monitor-agent.md
git commit -m "feat(social): add monitor agent with retry and Notion DB updates"
```

---

### Task 21: Review — Agent Team (`wt-agents`)

- [ ] **Step 1: Request code review**

Use @superpowers:requesting-code-review to review all agent files:
- `config.json`: pipeline configuration, coordination settings, agent ordering
- 5 agent `.md` files: frontmatter, input/output schemas, processing steps, error handling
- Check pipeline data flow: content-adapter -> preview -> media-handler -> publisher -> monitor
- Verify agent tools match their responsibilities
- Verify skills referenced exist in infrastructure or domain skills

Review against spec: `docs/superpowers/specs/2026-03-13-social-media-posting-design.md`

- [ ] **Step 2: Address review feedback and commit**

```bash
git add -A
git commit -m "fix(social): address review feedback on agent pipeline team"
```

---

## Chunk 4: Integration & Final Merge

> After all worktrees complete, merge branches to main and verify integration.

### Task 22: Merge Worktrees to Main

- [ ] **Step 1: Merge Wave 1 worktrees**

```bash
# From founderOS main branch
git merge wt-infra --no-ff -m "feat(social): merge infrastructure — CLI wrapper, auth, Late.dev skills, preflight"
git merge wt-skills --no-ff -m "feat(social): merge domain skills, Notion DB template, CLAUDE.md updates"
```

- [ ] **Step 2: Merge Wave 2 worktrees**

```bash
git merge wt-pub-cmds --no-ff -m "feat(social): merge 5 publishing commands"
git merge wt-int-cmds --no-ff -m "feat(social): merge 3 interaction commands"
git merge wt-mgmt-cmds --no-ff -m "feat(social): merge 3 management commands"
```

- [ ] **Step 3: Merge Wave 3 worktree**

```bash
git merge wt-agents --no-ff -m "feat(social): merge 5-agent pipeline team"
```

- [ ] **Step 4: Final integration review**

Use @superpowers:requesting-code-review for a final cross-cutting review:
- Verify all 48 files are present
- Check cross-references between commands and skills
- Verify preflight registry has `social` entry
- Verify CLAUDE.md has updated namespace table
- Verify Notion DB template has all new properties

- [ ] **Step 5: Address any integration issues**

```bash
git add -A
git commit -m "fix(social): address integration review feedback"
```

- [ ] **Step 6: Update submodule reference in root workspace**

```bash
cd /Users/lhalicki/coding_projects/founder-workspace
git add founderOS
git commit -m "chore: update founderOS submodule (social media posting namespace)"
git push
```

---

## Execution Summary

| Wave | Worktrees | Tasks | Files | Parallel? |
|------|-----------|-------|-------|-----------|
| 1 | `wt-infra`, `wt-skills` | 1-8 | 17 new, 3 modified | Yes (2 parallel) |
| 2 | `wt-pub-cmds`, `wt-int-cmds`, `wt-mgmt-cmds` | 9-14 | 11 new | Yes (3 parallel) |
| 3 | `wt-agents` | 15-21 | 6 new | Sequential |
| Final | main | 22 | 0 new (merges) | Sequential |

**Total**: 48 new files, 4 modified files, 6 worktrees, 3 waves, 22 tasks.

**Review stages**: 6 reviews (one per worktree + one final integration review).

**Skills used**:
- @skill-creator:skill-creator — domain skills (Tasks 6)
- @plugin-dev:command-development — all 11 commands (Tasks 9, 11, 13)
- @plugin-dev:agent-development — agent team (Tasks 15-20)
- @plugin-dev:plugin-structure — CLI wrapper and infrastructure (Tasks 1-2)
- @plugin-dev:skill-development — infrastructure skills (Task 3)
- @plugin-dev:plugin-settings — DB template (Task 7)
- @superpowers:requesting-code-review — all review stages (Tasks 5, 8, 10, 12, 14, 21, 22)
