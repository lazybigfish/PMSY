import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, '..'),
  base: './',
  build: {
    outDir: 'desktop/dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(__dirname, 'electron/renderer/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, '../src'),
      '@desktop': path.join(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['electron'],
  },
});
