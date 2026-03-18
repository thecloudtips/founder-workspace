// lib/plugins.js
// Plugin installation via claude CLI — project scope
'use strict';

const { execSync } = require('child_process');
const output = require('./output.js');

const RECOMMENDED_PLUGINS = [
  // Tier 1: Official Anthropic
  { name: 'context7', source: 'claude-plugins-official', tier: 1 },
  { name: 'superpowers', source: 'claude-plugins-official', tier: 1 },
  { name: 'skill-creator', source: 'claude-plugins-official', tier: 1 },
  { name: 'frontend-design', source: 'claude-plugins-official', tier: 1 },
  { name: 'typescript-lsp', source: 'claude-plugins-official', tier: 1 },
  // Tier 2: Recommended Dev Plugins
  { name: 'claude-md-management', source: null, tier: 2 },
  { name: 'agent-sdk-dev', source: 'claude-code-plugins', tier: 2 },
  { name: 'plugin-dev', source: 'claude-code-plugins', tier: 2 },
  { name: 'pyright-lsp', source: null, tier: 2 },
];

function checkClaudeCli() {
  try {
    execSync('claude --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function pluginKey(plugin) {
  return plugin.source ? `${plugin.name}@${plugin.source}` : plugin.name;
}

function installPlugin(plugin) {
  const identifier = plugin.source
    ? `${plugin.name}@${plugin.source}`
    : plugin.name;
  try {
    execSync(`claude plugin install ${identifier} --scope project`, {
      stdio: 'pipe',
      timeout: 60000,
    });
    return { success: true };
  } catch (err) {
    const msg = err.stderr
      ? err.stderr.toString().trim().split('\n')[0]
      : 'unknown error';
    return { success: false, error: msg };
  }
}

function installRecommended(manifestData, force) {
  const existingPlugins = manifestData?.plugins || {};
  const results = { installed: [], skipped: [], failed: [] };

  // Check claude CLI first
  if (!checkClaudeCli()) {
    output.blank();
    output.warn('Claude CLI not found \u2014 skipping plugin installation');
    output.info('  Install Claude Code first, then run:');
    output.info('  npx founder-os@latest --init --with-plugins');
    return results;
  }

  output.blank();
  output.info('Installing recommended plugins...');
  output.blank();

  for (const plugin of RECOMMENDED_PLUGINS) {
    const key = pluginKey(plugin);
    const existing = existingPlugins[key];

    // Always skip user-removed plugins — respect user's choice even with --force
    if (existing?.status === 'user-removed') {
      results.skipped.push({ plugin, reason: 'user-removed' });
      continue;
    }

    // Skip already installed (unless --force to retry)
    if (existing?.status === 'installed' && !force) {
      results.skipped.push({ plugin, reason: 'already-installed' });
      output.success(`${plugin.name}${plugin.source ? ` (${plugin.source})` : ''} \u2014 already installed`);
      continue;
    }

    // Attempt install
    const result = installPlugin(plugin);

    if (result.success) {
      results.installed.push(plugin);
      output.success(`${plugin.name}${plugin.source ? ` (${plugin.source})` : ''}`);
    } else {
      results.failed.push({ plugin, error: result.error });
      output.warn(`${plugin.name} \u2014 install failed (${result.error})`);
    }
  }

  // Summary
  output.blank();
  const total = results.installed.length + results.skipped.filter(s => s.reason === 'already-installed').length;
  const failCount = results.failed.length;
  if (failCount === 0) {
    output.info(`${total}/${RECOMMENDED_PLUGINS.length} plugins installed (project scope)`);
  } else {
    output.info(`${total}/${RECOMMENDED_PLUGINS.length} plugins installed, ${failCount} skipped`);
    for (const f of results.failed) {
      const id = f.plugin.source
        ? `${f.plugin.name}@${f.plugin.source}`
        : f.plugin.name;
      output.info(`  Run manually: claude plugin install ${id} --scope project`);
    }
  }

  return results;
}

module.exports = {
  RECOMMENDED_PLUGINS,
  checkClaudeCli,
  installPlugin,
  installRecommended,
  pluginKey,
};
