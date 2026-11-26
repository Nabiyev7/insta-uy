import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'server/test/**/*.test.ts', 'supabase/test/**/*.test.ts', 'apps/*/test/**/*.test.ts', 'video/test/**/*.test.ts'],
    testTimeout: 60_000,
    // Har baza testi o'z PGlite'ini ochadi: ko'p parallel ishchi xotirani to'ldirib, ishchini yiqitardi (exit 2147483651).
    maxWorkers: 3,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      // UI/3D qatlam e2e bilan qoplanadi; bu yerda mantiq qatlami o'lchanadi.
      include: ['packages/shared/src/**/*.ts', 'server/src/**/*.ts', 'apps/web/src/logic/**/*.ts', 'video/src/logic/**/*.ts'],
      exclude: ['**/index.ts', '**/types.ts'],
      thresholds: { lines: 80, functions: 80, statements: 80 },
    },
  },
});
