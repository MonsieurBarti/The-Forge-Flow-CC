import { copyFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { 
    'cli/index': 'src/cli/index.ts',
    'tff-tools': 'src/cli/index.ts'
  },
  outDir: 'dist',
  format: ['cjs'],
  target: 'node20',
  clean: false, // Don't clean - native bindings are committed
  noExternal: [/(.*)/],
  external: ['better-sqlite3'],
  banner: { js: '#!/usr/bin/env node' },
});
