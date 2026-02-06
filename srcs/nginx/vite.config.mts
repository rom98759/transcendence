import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NGINX_HTTPS_URL = 'https://localhost:4430';

/** @type {import('vite').UserConfig} */
export default {
  plugins: [react()],
  root: '.',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: NGINX_HTTPS_URL,
        secure: false,
        changeOrigin: true,
      },
      '/uploads': {
        target: NGINX_HTTPS_URL,
        secure: false,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        dashboard: path.resolve(__dirname, 'src/html/dashboard.html'),
      },
      output: {
        // Force un nom prédictible pour le script du dashboard
        entryFileNames: (chunkInfo: { name: string }) => {
          return chunkInfo.name === 'dashboard' ? 'assets/app.js' : 'assets/[name]-[hash].js';
        },
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
