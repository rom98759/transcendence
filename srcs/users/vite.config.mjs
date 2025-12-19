/// <reference types="vitest" />
import { builtinModules } from 'module';
import path from 'path'
import { fileURLToPath } from 'url';
// import { defineConfig } from 'vitest/config'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// /**
//  * @type {import('vitest/config').UserConfig}
//  */
export default { 
  build: {
    outDir: 'dist',
    target: 'node20',
    lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'UserManagementService',
        format: ['esm'],
        fileName: 'index'
    },
    rollupOptions: {
        external: [
            ...builtinModules,
            ...builtinModules.map((m) => `node:${m}`),
            /node_modules/,
        ]
    }
  },

  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'generated/',
        'dist/',
        '**/*.config.ts',
        '**/src/data/generated/**',
        ]
    },
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
};