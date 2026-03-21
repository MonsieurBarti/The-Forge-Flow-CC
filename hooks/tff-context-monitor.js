#!/usr/bin/env node
'use strict';

// Context monitor hook — monitors context window usage.
// Currently a no-op since no bridge file writer exists yet.
// Will be activated when context tracking is implemented.

const fs = require('fs');
const path = require('path');
const os = require('os');

const BRIDGE_FILE = path.join(os.tmpdir(), 'tff-context-bridge.json');

try {
  // Only do work if bridge file exists (nothing writes it yet)
  if (!fs.existsSync(BRIDGE_FILE)) process.exit(0);

  const bridge = JSON.parse(fs.readFileSync(BRIDGE_FILE, 'utf8'));
  const remaining = bridge.context_remaining;
  if (typeof remaining !== 'number') process.exit(0);

  if (remaining < 0.25) {
    console.log(JSON.stringify({
      result: 'block',
      reason: `Context window critically low (${Math.round(remaining * 100)}% remaining). Use /tff:pause to save state, then /clear and /tff:resume.`
    }));
  } else if (remaining < 0.35) {
    console.error(`[tff] Context at ${Math.round(remaining * 100)}%. Consider /tff:pause soon.`);
  }
} catch {
  // Hooks must never block
}
