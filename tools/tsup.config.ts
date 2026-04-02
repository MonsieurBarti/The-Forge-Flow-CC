import { copyFileSync } from 'node:fs';
import path from 'node:path';
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
  onSuccess: async () => {
    const platform = process.platform;
    const arch = process.arch;
    const src = path.resolve('node_modules/better-sqlite3/build/Release/better_sqlite3.node');
    const dest = path.resolve(`tools/dist/better_sqlite3.${platform}-${arch}.node`);
    try {
      copyFileSync(src, dest);
      console.log(`Copied native binding: better_sqlite3.${platform}-${arch}.node`);
    } catch (e) {
      console.warn(`Warning: Could not copy native binding: ${e}`);
    }
  },
});
