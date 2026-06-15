import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

// swc transform so nest decorators + emitted metadata behave exactly like the
// real build; vitest's esbuild alone drops decorator metadata.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
