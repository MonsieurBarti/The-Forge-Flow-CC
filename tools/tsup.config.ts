import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { 'tff-tools': 'tools/src/cli/index.ts' },
  outDir: 'tools/dist',
  format: ['cjs'],
  target: 'node20',
  clean: true,
  noExternal: [/(.*)/],
  external: ['better-sqlite3'],
  banner: { js: '#!/usr/bin/env node' },
});
