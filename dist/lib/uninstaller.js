// lib/uninstaller.js
// Remove founderOS files, restore backups, clean markers from CLAUDE.md
'use strict';

const fs = require('fs');
const path = require('path');
const mf = require('./manifest.js');
const claudeMd = require('./claude-md.js');
const settingsJson = require('./settings-json.js');
const output = require('./output.js');

function uninstall(targetDir, force) {
  const manifest = mf.readManifest(targetDir);
  if (!manifest) {
    output.error('No Founder OS installation found in this directory.');
    return false;
  }

  let removedCount = 0;
  let skippedCount = 0;
  let restoredCount = 0;
  const skipped = [];

  for (const [relKey, entry] of Object.entries(manifest.files)) {
    const destPath = path.join(targetDir, relKey);
    if (!fs.existsSync(destPath)) continue;

    // Recompute checksum to detect modifications made after install/update
    const isModified =
      entry.checksum && mf.computeChecksum(destPath) !== entry.checksum;
    const effectiveStatus = isModified ? 'user-modified' : entry.status;

    if (effectiveStatus === 'user-modified' && !force) {
      skipped.push(relKey);
      skippedCount++;
      continue;
    }

    // Check if we need to restore a backup
    if (entry.status === 'replaced-existing' && entry.backup) {
      const backupPath = path.join(targetDir, entry.backup);
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, destPath);
        fs.unlinkSync(backupPath);
        restoredCount++;
        continue;
      }
    }

    // If --force and modified, backup before removing
    if (force && isModified) {
      fs.copyFileSync(destPath, destPath + '.bak');
    }

    fs.unlinkSync(destPath);
    removedCount++;
  }

  // Remove founderOS section from CLAUDE.md (project root)
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  claudeMd.removeFromClaudeMd(claudeMdPath);

  // Remove founderOS entries from settings.json
  const settingsPath = path.join(targetDir, '.claude', 'settings.json');
  settingsJson.removeFromSettingsJson(settingsPath);

  // Note: plugins installed via --with-plugins are NOT removed here.
  // They are managed by the `claude` CLI. The plugins manifest state is
  // deleted with .founderOS/ below.

  // Remove .founderOS/ directory
  const founderOsDir = path.join(targetDir, '.founderOS');
  if (fs.existsSync(founderOsDir)) {
    fs.rmSync(founderOsDir, { recursive: true });
  }

  // Clean up empty directories in .claude/
  cleanEmptyDirs(path.join(targetDir, '.claude'));

  output.success(`Removed ${removedCount} files`);
  if (restoredCount > 0) output.success(`Restored ${restoredCount} original files from backup`);
  if (skippedCount > 0) {
    output.warn(`Skipped ${skippedCount} modified files (use --force to remove):`);
    for (const s of skipped) output.info(`  ${s}`);
  }

  return true;
}

function cleanEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      cleanEmptyDirs(path.join(dir, entry.name));
    }
  }
  // Re-check after cleaning children
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}

module.exports = { uninstall };
