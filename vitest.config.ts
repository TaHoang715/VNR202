import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/convex/**/*.test.ts'],
    exclude: ['server/**', 'client/**', 'node_modules/**'],
    environment: 'node',
  },
});
