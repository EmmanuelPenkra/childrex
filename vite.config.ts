import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/sequence/',
  plugins: [react()],
  root: 'apps/web',
  build: { outDir: '../../dist/web', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      '/sequence/api': 'http://localhost:3000',
      '/sequence/socket.io': { target: 'ws://localhost:3000', ws: true },
    },
  },
});
