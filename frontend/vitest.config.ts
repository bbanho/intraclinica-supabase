import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  environment: 'jsdom',
  setupFiles: ['./src/test-setup.ts'],
  coverage: {
    provider: 'v8',
    reportsDirectory: './coverage',
  },
  include: ['src/**/*.spec.ts'],
  exclude: ['e2e/**'],
  globals: true,
});
