#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const BRIDGE_FILE = path.join(os.tmpdir(), 'tff-context-bridge.json');
const WARNING_THRESHOLD = 0.35;
const CRITICAL_THRESHOLD = 0.25;
const DEBOUNCE_CALLS = 5;

let callCount = 0;

async function main() {
  try {
    const input = await readStdin();
    if (!input) return;

    callCount++;
    if (callCount % DEBOUNCE_CALLS !== 0) return;

    let bridge = {};
    try {
      bridge = JSON.parse(fs.readFileSync(BRIDGE_FILE, 'utf8'));
    } catch {
      return;
    }

    const remaining = bridge.context_remaining;
    if (typeof remaining !== 'number') return;

    if (remaining < CRITICAL_THRESHOLD) {
      console.log(JSON.stringify({
        result: 'block',
        reason: `Context window critically low (${Math.round(remaining * 100)}% remaining). ` +
          'Use /tff:pause to save state, then /clear and /tff:resume in a fresh session.'
      }));
    } else if (remaining < WARNING_THRESHOLD) {
      console.error(
        `[tff] Context at ${Math.round(remaining * 100)}%. Consider /tff:pause soon.`
      );
    }
  } catch {
    // Hooks must never block
  }
}

function readStdin() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(''), 3000);
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timeout); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timeout); resolve(''); });
  });
}

main();
