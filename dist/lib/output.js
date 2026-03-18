// lib/output.js
// Console output helpers — no dependencies, no color libraries
'use strict';

const PREFIX = '  ';

function success(msg) {
  process.stdout.write(`${PREFIX}\u2713 ${msg}\n`);
}

function warn(msg) {
  process.stdout.write(`${PREFIX}\u26a0 ${msg}\n`);
}

function error(msg) {
  process.stderr.write(`\nError: ${msg}\n`);
}

function info(msg) {
  process.stdout.write(`${PREFIX}${msg}\n`);
}

function header(msg) {
  process.stdout.write(`\n${PREFIX}${msg}\n\n`);
}

function blank() {
  process.stdout.write('\n');
}

module.exports = { success, warn, error, info, header, blank };
