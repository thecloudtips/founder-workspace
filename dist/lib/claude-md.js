// lib/claude-md.js
// CLAUDE.md generation with marker-based merge
'use strict';

const fs = require('fs');
const path = require('path');

const START_MARKER = '<!-- founder-os:start -->';
const END_MARKER = '<!-- founder-os:end -->';

function getTemplateContent(templateDir) {
  const templatePath = path.join(templateDir, '.claude', 'CLAUDE.md');
  return fs.readFileSync(templatePath, 'utf8');
}

function generateMarkedContent(templateDir) {
  const content = getTemplateContent(templateDir);
  // Template CLAUDE.md already contains the markers
  if (content.includes(START_MARKER)) return content;
  // Wrap if markers are missing (shouldn't happen but defensive)
  return `${START_MARKER}\n${content}\n${END_MARKER}\n`;
}

function mergeClaudeMd(targetPath, templateDir) {
  const newSection = generateMarkedContent(templateDir);

  if (!fs.existsSync(targetPath)) {
    // No existing file — create with founderOS section only
    fs.writeFileSync(targetPath, newSection);
    return 'created';
  }

  const existing = fs.readFileSync(targetPath, 'utf8');

  if (existing.includes(START_MARKER) && existing.includes(END_MARKER)) {
    // Replace between markers
    const startIdx = existing.indexOf(START_MARKER);
    const endIdx = existing.indexOf(END_MARKER) + END_MARKER.length;
    const before = existing.slice(0, startIdx);
    let after = existing.slice(endIdx);
    // Ensure newline separator between section and user content
    if (after && !after.startsWith('\n')) after = '\n' + after;
    fs.writeFileSync(targetPath, before + newSection.trim() + after);
    return 'updated';
  }

  // No markers — prepend founderOS section
  fs.writeFileSync(targetPath, newSection + '\n' + existing);
  return 'prepended';
}

function removeFromClaudeMd(targetPath) {
  if (!fs.existsSync(targetPath)) return 'not-found';

  const existing = fs.readFileSync(targetPath, 'utf8');
  if (!existing.includes(START_MARKER) || !existing.includes(END_MARKER)) {
    return 'no-markers';
  }

  const startIdx = existing.indexOf(START_MARKER);
  const endIdx = existing.indexOf(END_MARKER) + END_MARKER.length;
  const before = existing.slice(0, startIdx);
  const after = existing.slice(endIdx);
  const remaining = (before + after).trim();

  if (!remaining) {
    fs.unlinkSync(targetPath);
    return 'deleted';
  }

  fs.writeFileSync(targetPath, remaining + '\n');
  return 'removed-section';
}

module.exports = { mergeClaudeMd, removeFromClaudeMd, START_MARKER, END_MARKER };
