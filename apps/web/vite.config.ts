import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/web',
  publicDir: 'public',

  server: {
    port: 4200,
    host: 'localhost',
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [react(), nxViteTsPaths()],

  // Expose environment variables to the client
  // Variables prefixed with VITE_ are automatically exposed
  envPrefix: 'VITE_',

  resolve: {
    alias: {
      '@api-sdk': path.resolve(__dirname, '../../libs/api-sdk/src/index.ts'),
      '@/*': path.resolve(__dirname, './*'),
      '@app': path.resolve(__dirname, './src/app'),
      '@components': path.resolve(__dirname, './src/app/components'),
      '@pages': path.resolve(__dirname, './src/app/pages'),
      '@contexts': path.resolve(__dirname, './src/app/contexts'),
      '@routes': path.resolve(__dirname, './src/app/routes'),
      '@services': path.resolve(__dirname, './src/app/services'),
      '@hooks': path.resolve(__dirname, './src/app/hooks'),
      '@utils': path.resolve(__dirname, './src/app/utils'),
      '@types': path.resolve(__dirname, './src/app/types'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },

  build: {
    outDir: '../../dist/apps/web',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Production optimizations
    minify: 'esbuild',
    sourcemap: false,
    // Increase chunk size warning limit slightly but still optimize
    chunkSizeWarningLimit: 500,
    // Code splitting for better caching and smaller initial bundle
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Core React libraries - loaded on every page
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-core';
          }

          // React Router - loaded on every page
          if (
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@remix-run/router')
          ) {
            return 'react-router';
          }

          // Axios - HTTP client
          if (id.includes('node_modules/axios')) {
            return 'axios';
          }

          // Socket.io - Real-time communication
          if (id.includes('node_modules/socket.io')) {
            return 'socket-io';
          }

          // Zod - Validation library
          if (id.includes('node_modules/zod')) {
            return 'zod';
          }

          // Class transformer/validator - DTO validation
          if (
            id.includes('node_modules/class-transformer') ||
            id.includes('node_modules/class-validator')
          ) {
            return 'validation';
          }

          // Other node_modules go to vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          // Split pages by role for better code splitting
          if (id.includes('/pages/admin/')) {
            return 'pages-admin';
          }
          if (id.includes('/pages/coach/')) {
            return 'pages-coach';
          }
          if (id.includes('/pages/user/')) {
            return 'pages-user';
          }
          if (id.includes('/pages/shared/')) {
            return 'pages-shared';
          }

          // Split components by feature
          if (id.includes('/components/Dashboard/')) {
            return 'components-dashboard';
          }
          if (id.includes('/components/Chat/')) {
            return 'components-chat';
          }
          if (id.includes('/components/CustomServices/')) {
            return 'components-custom-services';
          }
          if (id.includes('/components/Booking/')) {
            return 'components-booking';
          }

          // Services layer
          if (id.includes('/services/')) {
            return 'services';
          }

          // Return undefined to let Vite handle the rest
          return undefined;
        },
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],

    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/web',
      provider: 'v8',
    },

    // Fix hanging tests and memory issues
    testTimeout: 10000, // 10 second timeout per test
    hookTimeout: 10000, // 10 second timeout for hooks
    teardownTimeout: 5000, // 5 second timeout for teardown

    // Vitest 4 pool configuration (no more poolOptions)
    pool: 'forks', // Use forks instead of threads to prevent memory issues

    // Memory and performance settings
    isolate: false, // Don't isolate tests to reduce memory overhead
    maxConcurrency: 1, // Run tests sequentially to reduce memory usage

    // Force exit settings
    watch: false, // Disable watch mode by default

    // Additional memory management
    logHeapUsage: false, // Disable heap logging to reduce overhead
    allowOnly: false, // Prevent .only tests in CI

    // Environment cleanup
    restoreMocks: true, // Restore mocks after each test
    clearMocks: true, // Clear mock calls after each test

    // Reduce DOM memory usage
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously',
        pretendToBeVisual: false, // Reduce memory usage
      },
    },
  },
});
