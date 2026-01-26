/// <reference types="vitest" />
import { builtinModules } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
// import { defineConfig } from 'vitest/config'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// /**
//  * @type {import('vitest/config').UserConfig}
//  */
export default {
  root: '.',
  build: {
    outDir: 'dist',
    target: 'node20',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'UserManagementService',
      format: ['esm'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        '@prisma/client',
        '@prisma/adapter-better-sqlite3',
      ],
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      exclude: [
        'node_modules/',
        'test/',
        'src/subscribers',
        'src/data/um.redis.client.ts',
        'src/utils/messages',
        'generated/',
        'dist/',
        '**/*.config.ts',
        '**/*.config.js',
        '**/*.config.mjs',
        '**/src/data/generated/**',
        '**/*.d.ts',
        '**/types/**',
      ],
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 20,
        statements: 20,
      },
      include: ['src/**/*.ts'],
    },
  },
  esbuild: {
    target: 'node18',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@transcendence/core': path.resolve(__dirname, '../shared/core/src/index.ts'),
    },
  },
};
