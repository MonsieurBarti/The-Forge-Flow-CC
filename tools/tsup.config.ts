import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tools/src/cli/index.ts'],
  outDir: 'tools/dist',
  format: ['cjs'],
  target: 'node20',
  clean: true,
  noExternal: [/(.*)/],
  banner: { js: '#!/usr/bin/env node' },
});
