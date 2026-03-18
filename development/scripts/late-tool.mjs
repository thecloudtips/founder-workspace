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
