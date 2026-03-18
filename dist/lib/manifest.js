// lib/manifest.js
// Manifest read/write and SHA-256 checksum computation
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANIFEST_PATH = '.founderOS/manifest.json';
const VERSION_PATH = '.founderOS/version.json';

function computeChecksum(filePath) {
  const content = fs.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

function readManifest(baseDir) {
  const manifestFile = path.join(baseDir, MANIFEST_PATH);
  if (!fs.existsSync(manifestFile)) return null;
  return JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
}

function writeManifest(baseDir, manifest) {
  const manifestFile = path.join(baseDir, MANIFEST_PATH);
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
}

function readVersion(baseDir) {
  const versionFile = path.join(baseDir, VERSION_PATH);
  if (!fs.existsSync(versionFile)) return null;
  return JSON.parse(fs.readFileSync(versionFile, 'utf8'));
}

function writeVersion(baseDir, version) {
  const versionFile = path.join(baseDir, VERSION_PATH);
  const data = {
    version,
    installedAt: readVersion(baseDir)?.installedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(versionFile, JSON.stringify(data, null, 2) + '\n');
}

function createEmptyManifest(version) {
  return {
    version,
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    files: {},
    plugins: {},
  };
}

function addFileToManifest(manifest, relativePath, checksum, status, extra) {
  manifest.files[relativePath] = { checksum, status, ...extra };
}

function addPluginToManifest(manifest, name, source, tier, status, error) {
  const key = source ? `${name}@${source}` : name;
  manifest.plugins = manifest.plugins || {};
  manifest.plugins[key] = {
    installedAt: status === 'installed' ? new Date().toISOString() : undefined,
    lastAttempt: new Date().toISOString(),
    tier,
    status,
  };
  if (error) manifest.plugins[key].error = error;
}

module.exports = {
  computeChecksum,
  readManifest,
  writeManifest,
  readVersion,
  writeVersion,
  createEmptyManifest,
  addFileToManifest,
  addPluginToManifest,
  MANIFEST_PATH,
  VERSION_PATH,
};
