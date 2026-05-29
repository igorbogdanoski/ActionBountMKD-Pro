import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-maps':     ['leaflet', 'react-leaflet'],
            'vendor-charts':   ['recharts'],
            'vendor-motion':   ['motion'],
            'vendor-dnd':      ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            'vendor-qr':       ['qrcode.react', 'html5-qrcode'],
          },
        },
      },
    },
  };
});
