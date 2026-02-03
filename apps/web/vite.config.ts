/**
 * D2 & D14: Vite Configuration for Web App
 *
 * Configures:
 * - Production builds
 * - Development server
 * - Environment variables handling
 * - Web worker support
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },

    // D14: Production build configuration
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: mode !== 'production',
      // Static file output
      rollupOptions: {
        output: {
          // Chunk strategy for optimal loading
          manualChunks: {
            vendor: ['react', 'react-dom'],
            pdfCore: ['@pdf-editor/core'],
          },
        },
      },
      // Minification settings
      minify: mode === 'production' ? 'esbuild' : false,
      // Target modern browsers
      target: 'es2020',
    },

    // Development server configuration
    server: {
      port: 3000,
      strictPort: false,
      open: true,
      cors: true,
    },

    // Preview server (for testing production builds)
    preview: {
      port: 4173,
    },

    // D12: Web Worker configuration
    worker: {
      format: 'es',
    },

    // D14: Environment variables handling
    define: {
      // Expose environment variables with VITE_ prefix to the app
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'idb'],
    },
  };
});
