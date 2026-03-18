// lib/settings-json.js
// settings.json merge logic — append founderOS permissions without overwriting user settings
'use strict';

const fs = require('fs');

const FOUNDER_OS_PERMISSIONS = [
  'Bash(npx founder-os*)',
  'Bash(node .founderOS/scripts/*)',
];

function mergeSettingsJson(targetPath) {
  let existing = {};
  if (fs.existsSync(targetPath)) {
    existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  }

  // Ensure permissions.allow array exists
  if (!existing.permissions) existing.permissions = {};
  if (!Array.isArray(existing.permissions.allow)) existing.permissions.allow = [];

  // Append founderOS permissions if not present
  for (const perm of FOUNDER_OS_PERMISSIONS) {
    if (!existing.permissions.allow.includes(perm)) {
      existing.permissions.allow.push(perm);
    }
  }

  fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2) + '\n');
  return existing;
}

function removeFromSettingsJson(targetPath) {
  if (!fs.existsSync(targetPath)) return;

  const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  if (existing.permissions?.allow) {
    existing.permissions.allow = existing.permissions.allow.filter(
      (p) => !FOUNDER_OS_PERMISSIONS.includes(p)
    );
    if (existing.permissions.allow.length === 0) delete existing.permissions.allow;
    if (Object.keys(existing.permissions).length === 0) delete existing.permissions;
  }

  // If settings is now empty, delete the file
  if (Object.keys(existing).length === 0) {
    fs.unlinkSync(targetPath);
    return;
  }

  fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2) + '\n');
}

module.exports = { mergeSettingsJson, removeFromSettingsJson, FOUNDER_OS_PERMISSIONS };
