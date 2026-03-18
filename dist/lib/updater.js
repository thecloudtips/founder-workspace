// lib/updater.js
// Update logic — diff checksums, skip modified, add new, remove dropped
'use strict';

const fs = require('fs');
const path = require('path');
const mf = require('./manifest.js');
const claudeMd = require('./claude-md.js');
const settingsJson = require('./settings-json.js');
const output = require('./output.js');
const { collectFiles } = require('./installer.js');

function update(targetDir, templateDir, packageVersion, force) {
  const oldManifest = mf.readManifest(targetDir);
  const newManifest = mf.createEmptyManifest(packageVersion);
  newManifest.installedAt = oldManifest.installedAt;

  const claudeDir = path.join(targetDir, '.claude');
  const claudeTemplate = path.join(templateDir, '.claude');
  const founderOsDir = path.join(targetDir, '.founderOS');
  const founderOsTemplate = path.join(templateDir, '.founderOS');

  const warnings = [];
  let updatedCount = 0;
  let addedCount = 0;
  let removedCount = 0;

  // 1. Update .founderOS/infrastructure/ wholesale
  if (fs.existsSync(founderOsTemplate)) {
    // Remove old infrastructure, copy new
    const infraDest = path.join(founderOsDir, 'infrastructure');
    if (fs.existsSync(infraDest)) {
      fs.rmSync(infraDest, { recursive: true });
    }
    const infraSrc = path.join(founderOsTemplate, 'infrastructure');
    if (fs.existsSync(infraSrc)) {
      fs.cpSync(infraSrc, infraDest, { recursive: true });
    }
    // Copy scripts
    const scriptsSrc = path.join(founderOsTemplate, 'scripts');
    const scriptsDest = path.join(founderOsDir, 'scripts');
    if (fs.existsSync(scriptsSrc)) {
      if (fs.existsSync(scriptsDest)) fs.rmSync(scriptsDest, { recursive: true });
      fs.cpSync(scriptsSrc, scriptsDest, { recursive: true });
    }
  }
  output.success('Refreshed .founderOS/ infrastructure');

  // 2. Process .claude/ files
  const templateFiles = collectFiles(claudeTemplate, claudeTemplate);
  const specialFiles = ['CLAUDE.md', 'settings.json'];
  const templateSet = new Set(templateFiles.filter((f) => !specialFiles.includes(f)));

  // 2a. Files in old manifest — check for changes
  for (const [relKey, entry] of Object.entries(oldManifest.files)) {
    // relKey is like ".claude/commands/inbox/triage.md"
    const fileRelToTemplate = relKey.replace(/^\.claude\//, '');
    const destPath = path.join(targetDir, relKey);

    if (!fs.existsSync(destPath)) {
      // User deleted this file
      mf.addFileToManifest(newManifest, relKey, null, 'user-removed');
      continue;
    }

    if (templateSet.has(fileRelToTemplate)) {
      // File exists in both old and new versions
      const currentChecksum = mf.computeChecksum(destPath);
      const isModified = currentChecksum !== entry.checksum;

      if (isModified && !force) {
        // User modified — skip
        mf.addFileToManifest(newManifest, relKey, currentChecksum, 'user-modified');
        warnings.push(relKey);
      } else {
        // Unmodified (or --force) — overwrite
        if (isModified && force) {
          // Backup before overwriting
          fs.copyFileSync(destPath, destPath + '.bak');
        }
        const srcPath = path.join(claudeTemplate, fileRelToTemplate);
        fs.copyFileSync(srcPath, destPath);
        const newChecksum = mf.computeChecksum(destPath);
        // Carry forward replaced-existing status and backup path
        if (entry.status === 'replaced-existing' && entry.backup) {
          mf.addFileToManifest(newManifest, relKey, newChecksum, 'replaced-existing', {
            backup: entry.backup,
          });
        } else {
          mf.addFileToManifest(newManifest, relKey, newChecksum, 'managed');
        }
        updatedCount++;
      }
      templateSet.delete(fileRelToTemplate);
    } else {
      // File in old manifest but not in new version — removed upstream
      const currentChecksum = mf.computeChecksum(destPath);
      if (currentChecksum === entry.checksum) {
        // Unmodified — safe to delete
        fs.unlinkSync(destPath);
        removedCount++;
      } else {
        // User modified — keep it, remove from manifest
        // (becomes the user's file)
      }
    }
  }

  // 2b. New files (in template but not in old manifest)
  for (const relFile of templateSet) {
    const destPath = path.join(claudeDir, relFile);
    const srcPath = path.join(claudeTemplate, relFile);
    const manifestKey = path.join('.claude', relFile);

    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    if (fs.existsSync(destPath)) {
      // Pre-existing user file at this new path
      const backupPath = destPath + '.pre-founderos.bak';
      fs.copyFileSync(destPath, backupPath);
      fs.copyFileSync(srcPath, destPath);
      const checksum = mf.computeChecksum(destPath);
      mf.addFileToManifest(newManifest, manifestKey, checksum, 'replaced-existing', {
        backup: manifestKey + '.pre-founderos.bak',
      });
    } else {
      fs.copyFileSync(srcPath, destPath);
      const checksum = mf.computeChecksum(destPath);
      mf.addFileToManifest(newManifest, manifestKey, checksum, 'managed');
    }
    addedCount++;
  }

  // 3. CLAUDE.md (project root) and settings.json
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  claudeMd.mergeClaudeMd(claudeMdPath, templateDir);

  const settingsPath = path.join(claudeDir, 'settings.json');
  settingsJson.mergeSettingsJson(settingsPath);

  // Merge hooks from registry
  const registryPath = path.join(founderOsDir, 'infrastructure', 'hooks', 'hook-registry.json');
  if (fs.existsSync(registryPath)) {
    settingsJson.mergeHooksIntoSettingsJson(settingsPath, registryPath);
    output.success('Updated runtime hooks');
  }

  // 4. Write updated version and manifest
  mf.writeVersion(targetDir, packageVersion);
  mf.writeManifest(targetDir, newManifest);

  // 5. Output summary
  if (updatedCount > 0) output.success(`Updated ${updatedCount} files`);
  if (addedCount > 0) output.success(`Added ${addedCount} new files`);
  if (removedCount > 0) output.success(`Removed ${removedCount} obsolete files`);
  if (warnings.length > 0) {
    output.warn(`Skipped ${warnings.length} files (modified by you):`);
    for (const w of warnings) output.info(`  ${w}`);
  }

  return { updatedCount, addedCount, removedCount, warnings };
}

module.exports = { update };
