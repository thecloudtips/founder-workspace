// lib/installer.js
// Fresh install logic — copies template into .founderOS/ and .claude/
'use strict';

const fs = require('fs');
const path = require('path');
const manifest = require('./manifest.js');
const claudeMd = require('./claude-md.js');
const settingsJson = require('./settings-json.js');
const output = require('./output.js');

function collectFiles(dir, base) {
  // Recursively collect all files relative to base
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, base));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

function createEnvFiles(targetDir) {
  // .env — empty placeholder (user fills in)
  const envPath = path.join(targetDir, '.env');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, '# Founder OS environment variables\n# Copy values from .env.example and fill in your keys\n');
    output.success('Created .env');
  } else {
    output.info('.env already exists — skipped');
  }

  // .env.example — documented key list
  const examplePath = path.join(targetDir, '.env.example');
  if (!fs.existsSync(examplePath)) {
    fs.writeFileSync(examplePath, [
      '# Founder OS — Environment Variables',
      '# Copy this file to .env and fill in your values',
      '',
      '# Notion (required for 21+ namespaces)',
      '# Create at https://www.notion.so/my-integrations',
      'NOTION_API_KEY=',
      '',
      '# Google Workspace (optional — for Gmail, Calendar, Drive)',
      '# Run: gws auth login',
      '',
      '# Late.dev (optional — for social media publishing)',
      '# Run: /founder-os:social:connect',
      '',
    ].join('\n'));
    output.success('Created .env.example');
  } else {
    output.info('.env.example already exists — skipped');
  }

  // .gitignore — best practices
  const gitignorePath = path.join(targetDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, [
      '# Environment & secrets',
      '.env',
      '.env.local',
      '.env.*.local',
      '',
      '# Founder OS runtime state',
      '.founderOS/db/',
      '.founderOS/auth/',
      '.founderOS/context/',
      '.memory/',
      '',
      '# Claude Code',
      '.claude-flow/',
      '.entire/',
      '',
      '# OS files',
      '.DS_Store',
      'Thumbs.db',
      '',
      '# Node',
      'node_modules/',
      'npm-debug.log*',
      '',
      '# IDE',
      '.vscode/',
      '.idea/',
      '*.swp',
      '*.swo',
      '',
    ].join('\n'));
    output.success('Created .gitignore');
  } else {
    // Ensure .env is in existing .gitignore
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('.env')) {
      fs.appendFileSync(gitignorePath, '\n# Added by Founder OS\n.env\n.env.local\n.env.*.local\n');
      output.success('Added .env to existing .gitignore');
    } else {
      output.info('.gitignore already exists — skipped');
    }
  }
}

function setExecutableRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      setExecutableRecursive(fullPath);
    } else if (entry.name.endsWith('.mjs')) {
      fs.chmodSync(fullPath, 0o755);
    }
  }
}

function install(targetDir, templateDir, packageVersion) {
  const founderOsDir = path.join(targetDir, '.founderOS');
  const claudeDir = path.join(targetDir, '.claude');
  const mf = manifest.createEmptyManifest(packageVersion);

  // 1. Copy .founderOS/ template (clean slate — remove if corrupted/partial)
  if (fs.existsSync(founderOsDir)) {
    fs.rmSync(founderOsDir, { recursive: true });
  }
  const founderOsTemplate = path.join(templateDir, '.founderOS');
  if (fs.existsSync(founderOsTemplate)) {
    fs.cpSync(founderOsTemplate, founderOsDir, { recursive: true });
  } else {
    fs.mkdirSync(founderOsDir, { recursive: true });
  }
  output.success('Created .founderOS/');

  // Ensure empty dirs exist
  for (const sub of ['config', 'context', 'auth', 'db']) {
    fs.mkdirSync(path.join(founderOsDir, sub), { recursive: true });
  }

  // 2. Create .claude/ if needed
  fs.mkdirSync(claudeDir, { recursive: true });

  // 3. Copy .claude/ template files (except CLAUDE.md and settings.json — handled separately)
  const claudeTemplate = path.join(templateDir, '.claude');
  const templateFiles = collectFiles(claudeTemplate, claudeTemplate);
  const specialFiles = ['CLAUDE.md', 'settings.json'];

  let commandDirs = new Set();
  let skillDirs = new Set();
  let agentDirs = new Set();

  for (const relFile of templateFiles) {
    if (specialFiles.includes(relFile)) continue;

    const srcPath = path.join(claudeTemplate, relFile);
    const destPath = path.join(claudeDir, relFile);
    const manifestKey = path.join('.claude', relFile);

    // Track namespace counts
    const parts = relFile.split(path.sep);
    if (parts[0] === 'commands' && parts.length > 1) commandDirs.add(parts[1]);
    if (parts[0] === 'skills' && parts.length > 1) skillDirs.add(parts[1]);
    if (parts[0] === 'agents' && parts.length > 1) agentDirs.add(parts[1]);

    // Ensure parent dir
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    if (fs.existsSync(destPath)) {
      // Pre-existing file — back it up
      const backupPath = destPath + '.pre-founderos.bak';
      fs.copyFileSync(destPath, backupPath);
      fs.copyFileSync(srcPath, destPath);
      const checksum = manifest.computeChecksum(destPath);
      manifest.addFileToManifest(mf, manifestKey, checksum, 'replaced-existing', {
        backup: manifestKey + '.pre-founderos.bak',
      });
    } else {
      fs.copyFileSync(srcPath, destPath);
      const checksum = manifest.computeChecksum(destPath);
      manifest.addFileToManifest(mf, manifestKey, checksum, 'managed');
    }
  }

  output.success(`Created .claude/commands/ (${commandDirs.size} namespaces)`);
  output.success(`Created .claude/skills/ (${skillDirs.size} domains)`);
  output.success(`Created .claude/agents/ (${agentDirs.size} teams)`);

  // 4. Handle CLAUDE.md (project root, not .claude/)
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  claudeMd.mergeClaudeMd(claudeMdPath, templateDir);
  output.success('Generated CLAUDE.md');

  // 5. Handle settings.json
  const settingsPath = path.join(claudeDir, 'settings.json');
  settingsJson.mergeSettingsJson(settingsPath);
  output.success('Generated .claude/settings.json');

  // 6. Hook Registration (Phase 2a)
  const registryPath = path.join(founderOsDir, 'infrastructure', 'hooks', 'hook-registry.json');
  if (fs.existsSync(registryPath)) {
    const { existingHooksDetected } = settingsJson.mergeHooksIntoSettingsJson(settingsPath, registryPath);
    if (existingHooksDetected) {
      output.warn('Existing hooks detected in settings.json. founderOS hooks appended after them.');
    }
    // Set executable permissions on hook scripts
    const hooksDir = path.join(founderOsDir, 'scripts', 'hooks');
    if (fs.existsSync(hooksDir)) {
      setExecutableRecursive(hooksDir);
    }
    output.success('Registered runtime hooks (5 events)');
  }

  // 7. DB Verification (Phase 2b)
  const memoryDbPath = path.join(targetDir, '.memory', 'memory.db');
  const memorySchemaPath = path.join(founderOsDir, 'infrastructure', 'memory', 'schema', 'memory-store.sql');
  if (fs.existsSync(memorySchemaPath)) {
    fs.mkdirSync(path.dirname(memoryDbPath), { recursive: true });
    try {
      require('child_process').execSync(`sqlite3 "${memoryDbPath}" < "${memorySchemaPath}"`, { stdio: 'pipe' });
      output.success('Memory engine: ready');
    } catch (err) {
      output.warn('Memory DB init failed: ' + err.message);
    }
  }

  const intelDbPath = path.join(founderOsDir, 'infrastructure', 'intelligence', '.data', 'intelligence.db');
  const intelSchemaPath = path.join(founderOsDir, 'infrastructure', 'intelligence', 'hooks', 'schema', 'intelligence.sql');
  if (fs.existsSync(intelSchemaPath)) {
    fs.mkdirSync(path.dirname(intelDbPath), { recursive: true });
    try {
      require('child_process').execSync(`sqlite3 "${intelDbPath}" < "${intelSchemaPath}"`, { stdio: 'pipe' });
      output.success('Intelligence engine: ready');
    } catch (err) {
      output.warn('Intelligence DB init failed: ' + err.message);
    }
  }

  // 8. Create .env, .env.example, .gitignore (skip if they already exist)
  createEnvFiles(targetDir);

  // 9. Write version and manifest
  manifest.writeVersion(targetDir, packageVersion);
  manifest.writeManifest(targetDir, mf);

  return { commandDirs: commandDirs.size, skillDirs: skillDirs.size, agentDirs: agentDirs.size };
}

module.exports = { install, collectFiles };
