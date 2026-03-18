#!/usr/bin/env node
// bin/founder-os.js
// Founder OS CLI — installs founderOS into any Claude Code project
'use strict';

const path = require('path');
const fs = require('fs');
const output = require('../lib/output.js');
const manifest = require('../lib/manifest.js');
const installer = require('../lib/installer.js');
const updater = require('../lib/updater.js');
const uninstaller = require('../lib/uninstaller.js');
const plugins = require('../lib/plugins.js');

// Package version from package.json
const PKG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const VERSION = PKG.version;
const TEMPLATE_DIR = path.join(__dirname, '..', 'template');

// Parse args
const args = process.argv.slice(2);
const flags = {
  init: args.includes('--init'),
  version: args.includes('--version'),
  status: args.includes('--status'),
  uninstall: args.includes('--uninstall'),
  force: args.includes('--force'),
  withPlugins: args.includes('--with-plugins'),
  help: args.includes('--help') || args.includes('-h'),
};

function showHelp() {
  console.log(`
  founder-os v${VERSION}

  Usage: npx founder-os@latest --init

  Options:
    --init            Install or update Founder OS
    --with-plugins    Also install recommended Claude Code plugins (requires --init)
    --version         Show version info
    --status          Show installation status
    --uninstall       Remove Founder OS files
    --force           Overwrite modified files (creates .bak backups)
    --help            Show this help
`);
}

function checkNodeVersion() {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major < 18) {
    output.error(
      `Founder OS requires Node.js 18+. Current: ${process.versions.node}`
    );
    process.exit(1);
  }
}

function checkWritePermissions(dir) {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
  } catch {
    output.error(`Cannot write to ${dir}. Check permissions.`);
    process.exit(1);
  }
}

function detectInstallState(targetDir) {
  const versionData = manifest.readVersion(targetDir);
  const manifestData = manifest.readManifest(targetDir);
  const founderOsExists = fs.existsSync(path.join(targetDir, '.founderOS'));

  if (!founderOsExists) return 'none';
  if (!versionData || !manifestData) return 'corrupted';
  return 'installed';
}

function doInit(targetDir) {
  checkNodeVersion();
  checkWritePermissions(targetDir);

  const state = detectInstallState(targetDir);

  if (state === 'none' || state === 'corrupted') {
    // Fresh install (or repair corrupted)
    output.header(`Founder OS v${VERSION}`);
    installer.install(targetDir, TEMPLATE_DIR, VERSION);

    // Plugin install phase (opt-in)
    if (flags.withPlugins) {
      const mf = manifest.readManifest(targetDir) || { plugins: {} };
      const results = plugins.installRecommended(mf, flags.force);
      for (const p of results.installed) {
        manifest.addPluginToManifest(mf, p.name, p.source, p.tier, 'installed');
      }
      for (const f of results.failed) {
        manifest.addPluginToManifest(mf, f.plugin.name, f.plugin.source, f.plugin.tier, 'failed', f.error);
      }
      if (results.installed.length > 0 || results.failed.length > 0) {
        manifest.writeManifest(targetDir, mf);
      }
    }

    output.blank();
    output.info('Done! Next steps:');
    output.blank();
    output.info('  1. Set NOTION_API_KEY in your environment');
    output.info('  2. Run `gws auth login` for Gmail/Calendar/Drive');
    output.info('  3. Open Claude Code and try:');
    output.info('     /inbox triage    \u2014 Process your inbox');
    output.info('     /briefing        \u2014 Get your daily briefing');
    output.info('     /prep            \u2014 Prepare for meetings');
    output.blank();
  } else {
    // Update
    const installed = manifest.readVersion(targetDir);
    if (installed.version === VERSION && !flags.force) {
      output.info(
        `Founder OS v${VERSION} already installed. Use --force to repair.`
      );
      process.exit(0);
    }

    output.header(`Founder OS v${installed.version} \u2192 v${VERSION}`);
    updater.update(targetDir, TEMPLATE_DIR, VERSION, flags.force);

    // Plugin install phase (opt-in)
    if (flags.withPlugins) {
      const mf = manifest.readManifest(targetDir) || { plugins: {} };
      const results = plugins.installRecommended(mf, flags.force);
      for (const p of results.installed) {
        manifest.addPluginToManifest(mf, p.name, p.source, p.tier, 'installed');
      }
      for (const f of results.failed) {
        manifest.addPluginToManifest(mf, f.plugin.name, f.plugin.source, f.plugin.tier, 'failed', f.error);
      }
      if (results.installed.length > 0 || results.failed.length > 0) {
        manifest.writeManifest(targetDir, mf);
      }
    }

    output.blank();
    output.info('Done! See CHANGELOG for what\'s new.');
    output.blank();
  }
}

function doVersion(targetDir) {
  console.log(`  Package: v${VERSION}`);
  const installed = manifest.readVersion(targetDir);
  if (installed) {
    console.log(`  Installed: v${installed.version} (${installed.updatedAt})`);
  } else {
    console.log('  Installed: not installed');
  }
}

function doStatus(targetDir) {
  const installed = manifest.readVersion(targetDir);
  if (!installed) {
    output.info('Founder OS is not installed in this directory.');
    output.info('Run: npx founder-os@latest --init');
    return;
  }

  const manifestData = manifest.readManifest(targetDir);
  if (!manifestData) {
    output.warn('Installation found but manifest is missing. Run --init to repair.');
    return;
  }

  let managed = 0, modified = 0, removed = 0;
  for (const [relKey, entry] of Object.entries(manifestData.files)) {
    const filePath = path.join(targetDir, relKey);
    if (!fs.existsSync(filePath)) {
      removed++;
    } else if (entry.checksum && manifest.computeChecksum(filePath) !== entry.checksum) {
      modified++;
    } else {
      managed++;
    }
  }

  output.info(`Founder OS v${installed.version}`);
  output.info(`Installed: ${installed.installedAt}`);
  output.info(`Updated: ${installed.updatedAt}`);
  output.info(`Files: ${managed} managed, ${modified} modified, ${removed} removed`);

  if (installed.version !== VERSION) {
    output.blank();
    output.info(`Update available: v${VERSION}`);
    output.info('Run: npx founder-os@latest --init');
  }
}

function doUninstall(targetDir) {
  checkWritePermissions(targetDir);
  output.header('Uninstalling Founder OS...');
  const success = uninstaller.uninstall(targetDir, flags.force);
  if (success) {
    output.blank();
    output.info('Founder OS has been removed.');
    output.blank();
  }
}

// Validate flag combinations
if (flags.withPlugins && !flags.init) {
  output.error('--with-plugins requires --init');
  process.exit(1);
}

// Main
const targetDir = process.cwd();

if (flags.help || args.length === 0) {
  showHelp();
} else if (flags.init) {
  doInit(targetDir);
} else if (flags.version) {
  doVersion(targetDir);
} else if (flags.status) {
  doStatus(targetDir);
} else if (flags.uninstall) {
  doUninstall(targetDir);
} else {
  output.error(`Unknown option: ${args[0]}`);
  showHelp();
  process.exit(1);
}
