#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');

function checkCommand(cmd, args) {
  try {
    execFileSync(cmd, args, { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const issues = [];

  // Check beads CLI
  if (!checkCommand('bd', ['--version'])) {
    issues.push(
      '⚠️  beads CLI (bd) not found. Install with: npm install -g @beads/bd'
    );
  }

  // Check plannotator — look for it in installed plugins
  try {
    const fs = require('fs');
    const path = require('path');
    const home = require('os').homedir();
    const pluginsFile = path.join(home, '.claude', 'plugins', 'installed_plugins.json');

    if (fs.existsSync(pluginsFile)) {
      const plugins = JSON.parse(fs.readFileSync(pluginsFile, 'utf8'));
      const hasPlannotator = plugins.some(p =>
        p.name === 'plannotator' || (p.installPath && p.installPath.includes('plannotator'))
      );
      if (!hasPlannotator) {
        issues.push(
          '⚠️  plannotator plugin not found. Install with:\n' +
          '   claude /plugin marketplace add backnotprop/plannotator\n' +
          '   claude /plugin install plannotator@plannotator'
        );
      }
    }
  } catch {
    // Can't check — skip silently
  }

  if (issues.length > 0) {
    console.error('[tff] Dependency check:');
    for (const issue of issues) {
      console.error(issue);
    }
  }
}

main();
