import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-bundle.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/app-bundle.[ext]'
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8096',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://127.0.0.1:8096',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
