import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import sitemap from 'vite-plugin-sitemap';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sitemap({ hostname: 'https://www.puurga.com' }),
  ],
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
  build: {
    emptyOutDir: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          'framer-motion': ['framer-motion'],
          three: ['three'],
          supabase: ['@supabase/supabase-js'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          emoji: ['emoji-picker-react', '@emoji-mart/react', '@emoji-mart/data'],
          zego: ['@zegocloud/zego-uikit-prebuilt'],
          'browser-image-compression': ['browser-image-compression'],
        },
      },
    },
  },
});
