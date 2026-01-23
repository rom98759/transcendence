import react from '@vitejs/plugin-react';
import path from 'path';

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
