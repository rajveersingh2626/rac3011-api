import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const swcPlugin = swc.vite({ module: { type: 'es6' } });

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [swcPlugin],
        test: { name: 'unit', include: ['src/**/*.spec.ts'], environment: 'node' },
      },
      {
        plugins: [swcPlugin],
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e.ts'],
          environment: 'node',
          globalSetup: ['test/global-setup.ts'],
          fileParallelism: false,
          testTimeout: 30000,
          hookTimeout: 120000,
        },
      },
    ],
  },
});
