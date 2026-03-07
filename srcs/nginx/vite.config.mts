import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('vite').UserConfig} */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  process.env = { ...process.env, ...env };
  return {
    plugins: [react(), tailwindcss()],
    root: '.',
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        protocol: 'wss',
        host: 'localhost',
        port: 5173,
      },
      proxy: {
        '/api/game': {
          target: 'https://127.0.0.1:443',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/api': {
          target: 'https://127.0.0.1:443',
          secure: false,
          changeOrigin: true,
        },
        '/uploads': {
          target: 'https://127.0.0.1:443',
          secure: false,
          changeOrigin: true,
        },
      },
      host: true,
      watch: {
        usePolling: true, // Necessary for Windows or macOS ?
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'src/html/admin.html'),
        },
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@transcendence/core': path.resolve(__dirname, '../shared/core/src/index.ts'),
      },
    },
  };
});
