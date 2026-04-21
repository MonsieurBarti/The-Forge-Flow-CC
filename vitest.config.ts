import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    globals: true,
    setupFiles: ['tests/setup.ts'],
    // ts-morph tests and integration specs that spawn the CLI are slow under
    // parallel suite execution (especially when lefthook runs typecheck+test
    // sequentially on a warm system). Give them enough headroom to finish.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'tests/**/*.spec.ts'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});
