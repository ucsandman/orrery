import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
    // Deterministic core: no parallelism-induced ordering effects in shared fixtures.
    // Tests are pure and independent, so the defaults are fine; kept explicit for clarity.
    reporters: ['default'],
  },
})
