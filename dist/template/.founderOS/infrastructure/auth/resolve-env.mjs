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
