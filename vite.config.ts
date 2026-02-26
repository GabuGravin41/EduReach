import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const buildId = new Date().toISOString();
    return {
      optimizeDeps: { force: true },
      server: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: true,
        hmr: {
          host: 'localhost',
          protocol: 'ws',
          port: 3000,
          clientPort: 3000,
        },
        watch: {
          ignored: [
            '**/.venv/**',
            '**/backend/**',
            '**/.git/**',
          ],
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        __APP_BUILD_ID__: JSON.stringify(buildId),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        rollupOptions: {
          output: {
            manualChunks: undefined,
          },
        },
      },
      publicDir: 'public',
    };
});
