import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false,
        ws: false,
      },
      '/ws': {
        target: 'ws://localhost:3005',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
