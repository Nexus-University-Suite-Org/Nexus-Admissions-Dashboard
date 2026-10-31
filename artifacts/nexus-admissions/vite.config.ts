import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const basePath = process.env.BASE_PATH ?? "/";

// Vite does not populate process.env from .env files, so proxy targets must
// be resolved through loadEnv. Reading process.env here silently fell back to
// the dead localhost:8080 default and produced HTTP 500 for stored files.
const env = loadEnv(
  process.env.NODE_ENV === 'production' ? 'production' : 'development',
  process.cwd(),
  '',
);

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
    fs: {
      strict: true,
    },
    proxy: {
      '/api/v1/storage':
        env.VITE_NAP_API_BASE_URL || 'http://localhost:8090',
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
  },
});
